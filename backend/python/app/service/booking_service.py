"""预约确认模块业务逻辑。"""

from __future__ import annotations

from typing import Optional, Union

from app.constant.error_code import Err
from app.repository import booking_service_repo as repo


def confirm_booking(item_id: int) -> tuple[bool, Optional[Union[str, tuple[str, int]]]]:
    """确认预约：检测、更新预约状态及场所预约计数。"""
    item = repo.get_travel_plan_item(item_id)
    if not item:
        return False, Err.ITEM_NOT_FOUND

    if item["is_need_booking"] == 0:
        return False, Err.BOOKING_NOT_NEEDED

    if item["is_had_booking"] == 1:
        return False, Err.BOOKING_ALREADY_CONFIRMED

    venue = repo.get_venue(item["location_table_name"], item["location_id"])
    if not venue:
        return False, Err.BOOKING_VENUE_NOT_FOUND

    # 检查预约名额（有 current_booking_count 字段的表才检查）
    has_count = "current_booking_count" in venue
    if has_count:
        max_count = venue.get("max_booking_count", -1)
        current = venue["current_booking_count"]
        if current >= 0 and max_count >= 0 and current >= max_count:
            return False, Err.ITEM_BOOKING_FULL

    # 事务性更新：is_had_booking + current_booking_count
    table_name = item["location_table_name"] if has_count else None
    location_id = item["location_id"] if has_count else None
    if not repo.confirm_booking(item_id, table_name, location_id):
        return False, Err.ITEM_NOT_FOUND

    return True, None


def cancel_booking(item_id: int) -> tuple[bool, Optional[Union[str, tuple[str, int]]]]:
    """取消预约：检测并回退预约状态及场所预约计数。"""
    item = repo.get_travel_plan_item(item_id)
    if not item:
        return False, Err.ITEM_NOT_FOUND

    if item["is_need_booking"] == 0:
        return False, Err.BOOKING_CANCEL_NOT_NEEDED

    if item["is_had_booking"] == 0:
        return False, Err.BOOKING_NOT_BOOKED

    venue = repo.get_venue(item["location_table_name"], item["location_id"])
    if not venue:
        return False, Err.BOOKING_VENUE_NOT_FOUND

    # 事务性回退：is_had_booking + current_booking_count
    has_count = "current_booking_count" in venue
    table_name = item["location_table_name"] if has_count else None
    location_id = item["location_id"] if has_count else None
    if not repo.cancel_booking(item_id, table_name, location_id):
        return False, Err.ITEM_NOT_FOUND

    return True, None