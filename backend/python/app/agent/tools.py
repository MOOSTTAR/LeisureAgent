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

    for key, items in pools.items():
        pools[key] = [item for item in items if item["distance"] <= max_distance]
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
                "day_num": 1,
                "is_need_booking": is_need,
                "is_had_booking": 0,
                "arrive_time": item.arrive_time,
                "leave_time": item.leave_time,
                "stay_minute": item.stay_minute,
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

    for item in plan_items:
        if not item.get("is_need_booking"):
            continue
        if item.get("is_had_booking"):
            continue

        table_name = item["location_table_name"]
        location_id = item["location_id"]
        location = get_location(table_name, location_id)

        if not location:
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
    row["distance"] = calc_distance(row["x"], row["y"])
    return row


def _can_book(item: dict[str, Any]) -> bool:
    return bool(
        item.get("booking_hours")
        and item.get("booking_hours") != "不能预约"
        and item.get("max_booking_count", -1) != -1
        and item.get("current_booking_count", 0) < item.get("max_booking_count", 0)
    )


def _family_restaurant_score(item: dict[str, Any]) -> float:
    tags = item.get("tags") or []
    score = 0
    if "亲子餐厅" in tags or "适合带娃" in tags:
        score += 8
    if item.get("cuisine_type") in {"日料", "粤菜", "中餐"}:
        score += 3
    if "环境好" in tags or "有包间" in tags:
        score += 2
    if _can_book(item):
        score += 3
    return score - item["distance"] / 100


def _friends_restaurant_score(item: dict[str, Any]) -> float:
    tags = item.get("tags") or []
    score = 0
    if item.get("cuisine_type") in {"火锅", "中餐", "烧烤", "西餐"}:
        score += 5
    if "网红店" in tags or "环境好" in tags:
        score += 3
    if _can_book(item):
        score += 2
    return score - item["distance"] / 100


def _family_activity_score(item: dict[str, Any]) -> float:
    score = 0
    if item.get("park_theme") in {"亲子", "童话", "卡通", "海洋"}:
        score += 8
    if item.get("queue_time", -1) in {-1, 5, 10}:
        score += 2
    return score - item["distance"] / 100


def _friends_exhibition_score(item: dict[str, Any]) -> float:
    score = 0
    if item.get("hall_type") in {"艺术", "综合", "科技"}:
        score += 5
    if item.get("interactive_project") == 1:
        score += 2
    if item.get("crowd_level", 2) <= 2:
        score += 2
    return score - item["distance"] / 100


def _check_need_booking(table_name: str, location_id: int) -> int:
    """判断地点是否需要预约：1=需要，0=不需要。"""
    location = get_location(table_name, location_id)
    if not location:
        return 0
    if table_name == "restaurant":
        if _can_book(location) or location.get("queue_time", -1) > 0:
            return 1
        return 0
    if table_name in {"amusement_park", "exhibition_hall", "scenic_spot"}:
        return 1 if _can_book(location) else 0
    return 0
