"""Agent tools built on top of existing backend services and SQLite data."""

from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from app.api import add_minutes, calc_distance
from app.db.database import get_connection
from app.models.schemas import AgentPlan, AgentPlanItem
from app.service import (
    amusement_park_service,
    exhibition_hall_service,
    mall_service,
    restaurant_service,
    scenic_spot_service,
    travel_plan_item_service,
    travel_plan_service,
)


def search_local_candidates(scenario: str, constraints: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Search mock local-life data for candidate places."""
    page_size = 9999
    restaurants, _ = restaurant_service.list_all(page=1, page_size=page_size)
    malls, _ = mall_service.list_all(page=1, page_size=page_size)
    amusement_parks, _ = amusement_park_service.list_all(page=1, page_size=page_size)
    scenic_spots, _ = scenic_spot_service.list_all(page=1, page_size=page_size)
    exhibitions, _ = exhibition_hall_service.list_all(page=1, page_size=page_size)

    max_distance = constraints.get("max_distance", 2000)
    pools = {
        "restaurant": [_with_distance(item) for item in restaurants],
        "mall": [_with_distance(item) for item in malls],
        "amusement_park": [_with_distance(item) for item in amusement_parks],
        "scenic_spot": [_with_distance(item) for item in scenic_spots],
        "exhibition_hall": [_with_distance(item) for item in exhibitions],
    }

    cuisine_type = constraints.get("cuisine_type")

    for key, items in pools.items():
        pools[key] = [item for item in items if item["distance"] <= max_distance]
        # 菜系/类型偏好过滤
        if cuisine_type and key == "restaurant":
            pools[key] = [
                item for item in pools[key]
                if cuisine_type in str(item.get("cuisine_type", ""))
            ]
        pools[key].sort(key=lambda item: item["distance"])

    if scenario == "family":
        pools["restaurant"].sort(key=lambda item: _family_restaurant_score(item), reverse=True)
        pools["amusement_park"].sort(key=lambda item: _family_activity_score(item), reverse=True)
        pools["mall"].sort(key=lambda item: (item.get("supermarket_has", 0), -item["distance"]), reverse=True)
    elif scenario == "friends":
        pools["restaurant"].sort(key=lambda item: _friends_restaurant_score(item), reverse=True)
        pools["exhibition_hall"].sort(key=lambda item: _friends_exhibition_score(item), reverse=True)
        pools["mall"].sort(key=lambda item: (item.get("cinema_has", 0), -item["distance"]), reverse=True)

    return pools


def persist_agent_plan(session_id: int, plan: AgentPlan) -> AgentPlan:
    plan_id = travel_plan_service.create(
        {
            "plan_title": plan.title,
            "plan_desc": plan.description,
            "travel_days": 1,
            "travel_type": plan.travel_type,
            "travel_date": datetime.now().strftime("%Y-%m-%d"),
            "total_cost": plan.total_cost,
        }
    )

    persisted_items = []
    for item in plan.items:
        is_need = _check_need_booking(item.location_table_name, item.location_id)
        item_id, _ = travel_plan_item_service.create(
            {
                "plan_id": plan_id,
                "location_table_name": item.location_table_name,
                "location_id": item.location_id,
                "day_num": item.day_num,
                "is_need_booking": is_need,
                "is_had_booking": 0,
                "arrive_time": item.arrive_time,
                "leave_time": item.leave_time,
                "stay_minute": item.stay_minute,
                "travel_mode": item.travel_mode,
                "remark": item.remark,
            }
        )
        if item_id is not None:
            persisted_items.append(item.model_copy(update={"step_order": item.step_order}))

    return plan.model_copy(update={"id": plan_id, "items": persisted_items})


def execute_plan_actions(plan_id: int) -> list[dict[str, Any]]:
    """执行预约：检查容量并更新 current_booking_count 和 travel_plan_item.is_had_booking。"""
    plan_items, _ = travel_plan_item_service.list_all(plan_id=plan_id, page=1, page_size=100)
    results: list[dict[str, Any]] = []
    conn = get_connection()

    if not plan_items:
        results.append({
            "location_table_name": "",
            "location_id": 0,
            "location_name": "方案",
            "status": "success",
            "message": "方案已确认（无明细项）",
        })
        return results

    for item in plan_items:
        if item.get("is_had_booking"):
            continue

        table_name = item["location_table_name"]
        location_id = item["location_id"]
        location = get_location(table_name, location_id)

        if not location:
            continue

        if not item.get("is_need_booking"):
            results.append({
                "location_table_name": table_name,
                "location_id": location_id,
                "location_name": location.get("name", ""),
                "status": "success",
                "message": "无需预约",
            })
            continue

        current = location.get("current_booking_count", -1)
        max_count = location.get("max_booking_count", -1)

        if current >= 0 and max_count > 0 and current < max_count:
            # 更新业务表预约数
            conn.execute(
                f"UPDATE {table_name} SET current_booking_count=? WHERE id=?",
                (current + 1, location_id),
            )
            # 更新方案明细预约状态
            conn.execute(
                """
                UPDATE travel_plan_item
                SET is_had_booking=1, updated_at=CURRENT_TIMESTAMP
                WHERE id=?
                """,
                (item["id"],),
            )
            conn.commit()
            results.append({
                "location_table_name": table_name,
                "location_id": location_id,
                "location_name": location["name"],
                "status": "success",
                "message": "预约成功",
            })
        else:
            results.append({
                "location_table_name": table_name,
                "location_id": location_id,
                "location_name": location.get("name", ""),
                "status": "failed",
                "message": "已约满或不可预约",
            })

    return results


def get_location_by_name(name: str) -> dict[str, Any] | None:
    """按名称在所有场所表中查找地点，返回包含坐标的 dict。"""
    service_map = {
        "restaurant": restaurant_service,
        "mall": mall_service,
        "amusement_park": amusement_park_service,
        "scenic_spot": scenic_spot_service,
        "exhibition_hall": exhibition_hall_service,
    }
    for service in service_map.values():
        items, _ = service.list_all(page=1, page_size=9999)
        for item in items:
            item = dict(item)
            if item.get("name", "") == name or name in str(item.get("name", "")):
                return item
    return None


def get_location(table_name: str, location_id: int) -> dict[str, Any] | None:
    service_map = {
        "restaurant": restaurant_service,
        "mall": mall_service,
        "amusement_park": amusement_park_service,
        "scenic_spot": scenic_spot_service,
        "exhibition_hall": exhibition_hall_service,
    }
    service = service_map.get(table_name)
    if not service:
        return None
    return service.get_by_id(location_id)


def build_share_text(plan: AgentPlan) -> str:
    lines = [f"搞定了，{plan.items[0].arrive_time if plan.items else '下午'} 出发，{plan.title}："]
    for item in plan.items:
        lines.append(
            f"{item.arrive_time}-{item.leave_time} {item.location_name}，"
            f"{item.stay_minute} 分钟。{item.remark}"
        )
    lines.append(f"预计花费约 {int(plan.total_cost)} 元。")
    return "\n".join(lines)


def build_share_payload(plan_id: int) -> dict[str, Any] | None:
    plan = travel_plan_service.get_by_id(plan_id)
    if not plan:
        return None
    items, _ = travel_plan_item_service.list_all(plan_id=plan_id, page=1, page_size=100)
    share_url = f"/api/agent/plans/{plan_id}/share"
    lines = [f"搞定了，方案：{plan['plan_title']}"]
    for item in items:
        location = get_location(item["location_table_name"], item["location_id"])
        name = location["name"] if location else item["location_table_name"]
        lines.append(
            f"{item.get('arrive_time')}-{item.get('leave_time')} {name}，"
            f"{item.get('stay_minute', 0)} 分钟。{item.get('remark') or ''}"
        )
    lines.append(f"预计花费约 {int(plan.get('total_cost') or 0)} 元。")
    return {
        "plan": plan,
        "items": items,
        "share_text": "\n".join(lines),
        "share_url": share_url,
    }


def _with_distance(item: dict[str, Any]) -> dict[str, Any]:
    row = dict(item)
    try:
        row["distance"] = calc_distance(int(row["x"]), int(row["y"]))
    except (ValueError, TypeError):
        row["distance"] = 9999999
    return row


def _to_int(val: Any, default: int = 0) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _safe_str(val: Any) -> str:
    """Safely convert any value to string for 'in' checks."""
    if val is None:
        return ""
    if isinstance(val, str):
        return val
    try:
        return str(val)
    except Exception:
        return ""


def _can_book(item: dict[str, Any]) -> bool:
    max_booking = _to_int(item.get("max_booking_count", -1), -1)
    current = _to_int(item.get("current_booking_count", 0))
    return bool(
        item.get("booking_hours")
        and item.get("booking_hours") != "不能预约"
        and max_booking != -1
        and current < max_booking
    )


def _family_restaurant_score(item: dict[str, Any]) -> float:
    tags = _safe_str(item.get("tags")) or ""
    score = 0
    if "亲子餐厅" in tags or "适合带娃" in tags:
        score += 8
    if _safe_str(item.get("cuisine_type", "")) in {"日料", "粤菜", "中餐"}:
        score += 3
    if "环境好" in tags or "有包间" in tags:
        score += 2
    if _can_book(item):
        score += 3
    return score - _to_int(item["distance"]) / 100


def _friends_restaurant_score(item: dict[str, Any]) -> float:
    tags = _safe_str(item.get("tags")) or ""
    score = 0
    if _safe_str(item.get("cuisine_type", "")) in {"火锅", "中餐", "烧烤", "西餐"}:
        score += 5
    if "网红店" in tags or "环境好" in tags:
        score += 3
    if _can_book(item):
        score += 2
    return score - _to_int(item["distance"]) / 100


def _family_activity_score(item: dict[str, Any]) -> float:
    score = 0
    if item.get("park_theme") in {"亲子", "童话", "卡通", "海洋"}:
        score += 8
    if _to_int(item.get("queue_time", -1)) in {-1, 5, 10}:
        score += 2
    return score - _to_int(item["distance"]) / 100


def _friends_exhibition_score(item: dict[str, Any]) -> float:
    score = 0
    if item.get("hall_type") in {"艺术", "综合", "科技"}:
        score += 5
    if _to_int(item.get("interactive_project")) == 1:
        score += 2
    if _to_int(item.get("crowd_level", 2)) <= 2:
        score += 2
    return score - _to_int(item["distance"]) / 100


def _check_need_booking(table_name: str, location_id: int) -> int:
    """判断地点是否需要预约：1=需要，0=不需要。"""
    location = get_location(table_name, location_id)
    if not location:
        return 0
    if table_name == "restaurant":
        if _can_book(location) or _to_int(location.get("queue_time", -1)) > 0:
            return 1
        return 0
    if table_name in {"amusement_park", "exhibition_hall", "scenic_spot"}:
        return 1 if _can_book(location) else 0
    return 0


# ═══════════════════════════════════════════════════════════════
# 咨询/浏览模式工具（Inquiry）
# ═══════════════════════════════════════════════════════════════

_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "restaurant": ["面", "粉", "饭", "菜", "餐", "火锅", "烧烤", "日料", "西餐", "粤菜", "中餐",
                   "小吃", "点心", "甜品", "奶茶", "咖啡", "素食", "海鲜", "自助", "拉面", "米线"],
    "amusement_park": ["游乐园", "乐园", "主题公园", "游乐场", "过山车", "摩天轮", "欢乐谷"],
    "scenic_spot": ["公园", "爬山", "山", "湖", "河", "古迹", "寺庙", "园林", "长城", "故宫"],
    "exhibition_hall": ["展", "博物馆", "美术馆", "科技馆", "画廊", "艺术", "展览"],
    "mall": ["商场", "购物", "逛街", "买", "大悦城", "万达", "超市", "影院", "电影院"],
}

_CATEGORY_TO_TABLE: dict[str, str] = {
    "restaurant": "restaurant",
    "amusement_park": "amusement_park",
    "scenic_spot": "scenic_spot",
    "exhibition_hall": "exhibition_hall",
    "mall": "mall",
}


def search_inquiry(user_input: str, constraints: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """精确搜索：根据用户查询关键词匹配场所。用于咨询/浏览模式。"""
    import re

    max_distance = (constraints or {}).get("max_distance", 5000)
    # 尝试从输入中提取距离限制
    dist_match = re.search(r"(\d+)\s*(km|公里|千米|m|米)", user_input)
    if dist_match:
        num = int(dist_match.group(1))
        unit = dist_match.group(2)
        max_distance = num * 1000 if unit in ("km", "公里", "千米") else num

    # 确定要搜索哪些表
    tables_to_search: set[str] = set()
    for table, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in user_input for kw in keywords):
            tables_to_search.add(table)

    # 如果没匹配到任何关键词，搜索所有表（兜底）
    if not tables_to_search:
        tables_to_search = {"restaurant", "amusement_park", "scenic_spot", "exhibition_hall", "mall"}

    # 提取参照地点名：检测 "XX附近" "XX旁边" "距离XX" 等模式
    ref_x, ref_y = 0, 0
    ref_patterns = [
        r"(?:距离|离|看看|去)(.+?)(?:近|附近|旁边|周边|周围)",
        r"(.+?)(?:附近|旁边|周边|周围)",
    ]
    for pat in ref_patterns:
        m = re.search(pat, user_input)
        if m:
            ref_name = m.group(1).strip()
            # 尝试全名匹配 → 逐字缩短匹配（处理"全聚德比较近"误提取为"全聚德比较"的情况）
            for end in range(len(ref_name), 1, -1):
                candidate = ref_name[:end]
                ref_loc = get_location_by_name(candidate)
                if ref_loc:
                    ref_x, ref_y = int(ref_loc.get("x", 0)), int(ref_loc.get("y", 0))
                    break
            if ref_x != 0 or ref_y != 0:
                break

    # 提取菜系/类型关键词做进一步筛选
    cuisine_keywords = ["火锅", "烧烤", "日料", "西餐", "粤菜", "中餐", "川菜", "湘菜",
                        "面食", "面", "粉", "素食", "海鲜", "自助", "小吃", "家常菜",
                        "饺子", "烤鸭", "拉面", "米线", "东南亚菜", "韩餐", "寿司"]
    target_cuisine: str | None = None
    for ck in cuisine_keywords:
        if ck in user_input:
            target_cuisine = ck
            if "restaurant" not in tables_to_search:
                tables_to_search = {"restaurant"}
            break

    results: list[dict[str, Any]] = []
    for table_name in tables_to_search:
        service_map = {
            "restaurant": restaurant_service,
            "mall": mall_service,
            "amusement_park": amusement_park_service,
            "scenic_spot": scenic_spot_service,
            "exhibition_hall": exhibition_hall_service,
        }
        service = service_map.get(table_name)
        if not service:
            continue
        items, _ = service.list_all(page=1, page_size=9999)
        for item in items:
            item = dict(item)
            try:
                dist = calc_distance_between(ref_x, ref_y, int(item["x"]), int(item["y"]))
            except (ValueError, TypeError):
                continue
            if dist > max_distance:
                continue
            # 菜系筛选
            if target_cuisine and table_name == "restaurant":
                cuisine = str(item.get("cuisine_type", ""))
                if target_cuisine not in cuisine:
                    continue
            item["distance"] = dist
            item["available"] = _check_availability(item)
            item["can_book"] = _can_book(item)
            item["category"] = table_name
            results.append(item)

    results.sort(key=lambda x: x["distance"])
    return results


def _extract_named_locations(user_input: str) -> list[dict[str, Any]]:
    """从用户输入中提取具体地点名，按名称搜索所有表并返回匹配项。"""
    import re
    results: list[dict[str, Any]] = []
    # 常见模式：把XX加入计划、去XX、XX加入计划
    patterns = [
        r"把(.+?)加入计划",
        r"把(.+?)加到计划",
        r"(.+?)加入计划",
        r"去(.+?)(?:玩|逛|吃|吧|，|。|$)",
    ]
    names_to_search: set[str] = set()
    for pat in patterns:
        for m in re.finditer(pat, user_input):
            name = m.group(1).strip()
            if len(name) >= 2 and len(name) <= 10:
                names_to_search.add(name)

    if not names_to_search:
        return results

    service_map = {
        "restaurant": restaurant_service,
        "mall": mall_service,
        "amusement_park": amusement_park_service,
        "scenic_spot": scenic_spot_service,
        "exhibition_hall": exhibition_hall_service,
    }
    for name in names_to_search:
        for cat, service in service_map.items():
            items, _ = service.list_all(page=1, page_size=9999)
            for item in items:
                item = dict(item)
                if item.get("name", "") == name or name in str(item.get("name", "")):
                    item["category"] = cat
                    results.append(item)
                    break  # 每个名字只取第一个匹配

    return results


def _check_availability(item: dict[str, Any]) -> bool:
    """检查地点是否可用（未满）。"""
    max_booking = _to_int(item.get("max_booking_count", 0))
    if max_booking <= 0:
        return True
    current = _to_int(item.get("current_booking_count", 0))
    return current < max_booking


def _is_fully_booked(item: dict[str, Any]) -> bool:
    """判断是否预约已满。"""
    max_booking = _to_int(item.get("max_booking_count", 0))
    if max_booking <= 0:
        return False
    return _to_int(item.get("current_booking_count", 0)) >= max_booking


def _get_needed_categories(scenario: str) -> list[str]:
    """根据场景返回需要的场所类别。"""
    if scenario == "family":
        return ["amusement_park", "scenic_spot", "mall", "restaurant"]
    if scenario == "friends":
        return ["exhibition_hall", "scenic_spot", "mall", "restaurant"]
    return ["restaurant", "mall", "scenic_spot"]


def _category_label(category: str) -> str:
    """场所类别的中文标签。"""
    labels = {
        "restaurant": "餐厅",
        "mall": "商场",
        "amusement_park": "游乐园",
        "scenic_spot": "户外景点",
        "exhibition_hall": "展馆",
    }
    return labels.get(category, category)
