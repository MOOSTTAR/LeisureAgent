"""地点查询与分享工具。"""

from __future__ import annotations

from typing import Any

from app.db.database import get_connection
from app.service import (
    amusement_park_service,
    exhibition_hall_service,
    mall_service,
    restaurant_service,
    scenic_spot_service,
    travel_plan_item_service,
    travel_plan_service,
)


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


def _check_need_booking(table_name: str, location_id: int) -> int:
    """判断地点是否需要预约：1=需要，0=不需要。"""
    from app.agent.tools._booking import _can_book

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


def build_share_text(plan) -> str:
    from app.models.schemas import AgentPlan

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
