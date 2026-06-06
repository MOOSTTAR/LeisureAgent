"""travel_plan_item 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import add_minutes
from app.constant.error_code import Err
from app.repository import travel_plan_item_repo
from app.service import (
    amusement_park_service,
    exhibition_hall_service,
    mall_service,
    restaurant_service,
    scenic_spot_service,
)


def _to_int(value: Any) -> int:
    """安全转 int。"""
    if isinstance(value, int):
        return value
    try:
        return int(value)
    except (ValueError, TypeError):
        return -1


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    return travel_plan_item_repo.get_by_id(id)


def list_all(
    plan_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[dict[str, Any]], int]:
    offset = (page - 1) * page_size
    items = travel_plan_item_repo.search(
        plan_id=plan_id, limit=page_size, offset=offset
    )
    total = travel_plan_item_repo.count(plan_id=plan_id)
    return items, total


def _get_location(table_name: str, location_id: int) -> Optional[dict[str, Any]]:
    service_map = {
        "restaurant": restaurant_service,
        "mall": mall_service,
        "amusement_park": amusement_park_service,
        "scenic_spot": scenic_spot_service,
        "exhibition_hall": exhibition_hall_service,
    }
    svc = service_map.get(table_name)
    return svc.get_by_id(location_id) if svc else None


def _has_time_conflict(plan_id: int, new_start: str, new_end: str, day_num: int = 1) -> bool:
    """时间冲突判断 — 仅检测同一天内的时段重叠。

    不同天的活动即使时间重叠也不视为冲突（如周六14:00和周日14:00）。
    """
    existing = travel_plan_item_repo.get_by_plan_id(plan_id)
    for item in existing:
        # 不同天的活动不冲突
        if item.get("day_num", 1) != day_num:
            continue
        exist_start = item["arrive_time"]
        exist_end = item["leave_time"]
        if not (new_end <= exist_start or new_start >= exist_end):
            return True
    return False


def _resolve_need_booking(venue: dict[str, Any]) -> int:
    """根据场地 booking_hours 判断是否需要预约。"""
    booking_hours = venue.get("booking_hours")
    if booking_hours and booking_hours != "不能预约":
        return 1
    return 0


def create(data: dict[str, Any]) -> tuple[Optional[int], Optional[str]]:
    arrive = data.get("arrive_time", "")
    leave = data.get("leave_time", "")

    # Rule 4: 时间合法性
    if arrive and leave and arrive >= leave:
        return None, Err.ITEM_TIME_INVALID[0]

    plan_id = data["plan_id"]
    table_name = data["location_table_name"]
    location_id = data["location_id"]

    # Rule 1 + 2: 场馆信息查询
    venue = _get_location(table_name, location_id)
    if venue is None:
        return None, Err.BOOKING_VENUE_NOT_FOUND[0]

    current = _to_int(venue.get("current_booking_count", -1))
    maximum = _to_int(venue.get("max_booking_count", -1))
    # Rule 1: 预约名额检查
    if current >= 0 and maximum >= 0 and current >= maximum:
        return None, Err.ITEM_BOOKING_FULL[0]

    # Rule 2: 排队时间调整（仅用于冲突检测），将到达时间提前
    queue = _to_int(venue.get("queue_time", -1))
    adjusted_arrive = add_minutes(arrive, -queue) if queue > 0 and arrive else arrive

    # 自动推断 is_need_booking
    data["is_need_booking"] = _resolve_need_booking(venue)

    # Rule 3: 时间段冲突检测（仅同一天内）
    day_num = data.get("day_num", 1)
    if adjusted_arrive and leave and _has_time_conflict(plan_id, adjusted_arrive, leave, day_num):
        return None, Err.ITEM_TIME_CONFLICT[0]

    new_id = travel_plan_item_repo.create(data)
    return new_id, None


def update(id: int, data: dict[str, Any]) -> bool:
    return travel_plan_item_repo.update(id, data)


def delete(id: int) -> bool:
    item = travel_plan_item_repo.get_by_id(id)
    if not item:
        return False

    if item["is_had_booking"] == 1:
        venue = _get_location(item["location_table_name"], item["location_id"])
        table_name = item["location_table_name"] if venue and "current_booking_count" in venue else None
        location_id = item["location_id"] if table_name else None
        return travel_plan_item_repo.delete_with_booking_release(id, table_name, location_id)

    return travel_plan_item_repo.delete(id)