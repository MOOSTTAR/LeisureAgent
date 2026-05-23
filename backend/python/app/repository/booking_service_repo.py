"""预约确认模块数据访问层。"""

from __future__ import annotations

from typing import Any, Optional

from app.constant.constant_data import BOOKING_TABLES, VENUE_TABLES
from app.db.database import get_connection


def get_travel_plan_item(item_id: int) -> Optional[dict[str, Any]]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM travel_plan_item WHERE id=?", (item_id,)).fetchone()
    return dict(row) if row else None


def get_venue(table_name: str, location_id: int) -> Optional[dict[str, Any]]:
    if table_name not in VENUE_TABLES:
        return None
    conn = get_connection()
    row = conn.execute(f"SELECT * FROM {table_name} WHERE id=?", (location_id,)).fetchone()
    return dict(row) if row else None


def confirm_booking(item_id: int, table_name: str | None, location_id: int | None) -> bool:
    """事务性确认预约：更新 is_had_booking 并递增场所预约数。"""
    conn = get_connection()
    try:
        conn.execute("BEGIN")
        cur = conn.execute(
            "UPDATE travel_plan_item SET is_had_booking=1 WHERE id=?", (item_id,)
        )
        if cur.rowcount == 0:
            conn.rollback()
            return False
        if table_name and location_id and table_name in BOOKING_TABLES:
            conn.execute(
                f"UPDATE {table_name} SET current_booking_count = current_booking_count + 1 WHERE id=?",
                (location_id,),
            )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False


def cancel_booking(item_id: int, table_name: str | None, location_id: int | None) -> bool:
    """事务性取消预约：更新 is_had_booking 并递减场所预约数。"""
    conn = get_connection()
    try:
        conn.execute("BEGIN")
        cur = conn.execute(
            "UPDATE travel_plan_item SET is_had_booking=0 WHERE id=?", (item_id,)
        )
        if cur.rowcount == 0:
            conn.rollback()
            return False
        if table_name and location_id and table_name in BOOKING_TABLES:
            conn.execute(
                f"UPDATE {table_name} SET current_booking_count = current_booking_count - 1 WHERE id=? AND current_booking_count > 0",
                (location_id,),
            )
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False