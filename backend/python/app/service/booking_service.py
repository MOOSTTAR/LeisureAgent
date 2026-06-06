"""预约确认模块业务逻辑。"""

from __future__ import annotations

from typing import Optional, Union

from app.constant.error_code import Err
from app.repository import booking_service_repo as repo


def confirm_booking(item_id: int) -> tuple[bool, Optional[Union[str, tuple[str, int]]]]:
    """确认预约：检测 + 原子更新预约状态及场所预约计数。

    容量检查不再提前做，而是由 repo 层通过原子 UPDATE WHERE 完成，
    杜绝并发竞态。
    """
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

    has_count = "current_booking_count" in venue
    table_name = item["location_table_name"] if has_count else None
    location_id = item["location_id"] if has_count else None

    if not repo.confirm_booking(item_id, table_name, location_id):
        # 原子操作失败 → 要么明细不存在，要么名额已满
        if has_count:
            # 重新查询确认是否名额已满（此时已不存在竞态）
            venue_after = repo.get_venue(item["location_table_name"], item["location_id"])
            if venue_after:
                current = venue_after.get("current_booking_count", -1)
                max_count = venue_after.get("max_booking_count", -1)
                if current >= max_count >= 0:
                    return False, Err.ITEM_BOOKING_FULL
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