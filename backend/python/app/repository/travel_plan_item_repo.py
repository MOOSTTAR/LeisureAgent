"""travel_plan_item CRUD"""

from __future__ import annotations

from typing import Any, Optional

from app.db.database import get_connection

TABLE = "travel_plan_item"


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM travel_plan_item WHERE id=?", (id,)).fetchone()
    return dict(row) if row else None


def get_all(limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM travel_plan_item ORDER BY id LIMIT ? OFFSET ?", (limit, offset)
    ).fetchall()
    return [dict(r) for r in rows]


def get_by_plan_id(plan_id: int) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM travel_plan_item WHERE plan_id=? ORDER BY day_num, arrive_time",
        (plan_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_by_location(
    table_name: str, location_id: int
) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM travel_plan_item WHERE location_table_name=? AND location_id=?",
        (table_name, location_id),
    ).fetchall()
    return [dict(r) for r in rows]


def search(
    plan_id: Optional[int] = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, Any]]:
    conn = get_connection()
    if plan_id is not None:
        rows = conn.execute(
            "SELECT * FROM travel_plan_item WHERE plan_id=? ORDER BY day_num, arrive_time LIMIT ? OFFSET ?",
            (plan_id, limit, offset),
        ).fetchall()
    else:
        rows = conn.execute(
            "SELECT * FROM travel_plan_item ORDER BY id LIMIT ? OFFSET ?",
            (limit, offset),
        ).fetchall()
    return [dict(r) for r in rows]


def count(plan_id: Optional[int] = None) -> int:
    conn = get_connection()
    if plan_id is not None:
        row = conn.execute(
            "SELECT COUNT(*) FROM travel_plan_item WHERE plan_id=?", (plan_id,)
        ).fetchone()
    else:
        row = conn.execute("SELECT COUNT(*) FROM travel_plan_item").fetchone()
    return row[0]


def create(data: dict[str, Any]) -> int:
    conn = get_connection()
    keys = list(data.keys())
    vals = list(data.values())
    placeholders = ",".join("?" for _ in keys)
    cur = conn.execute(
        f"INSERT INTO travel_plan_item ({','.join(keys)}) VALUES ({placeholders})",
        vals,
    )
    conn.commit()
    return cur.lastrowid  # type: ignore[return-value]


def update(id: int, data: dict[str, Any]) -> bool:
    conn = get_connection()
    sets = ",".join(f"{k}=?" for k in data)
    cur = conn.execute(
        f"UPDATE travel_plan_item SET {sets} WHERE id=?", [*data.values(), id]
    )
    conn.commit()
    return cur.rowcount > 0


def delete(id: int) -> bool:
    conn = get_connection()
    cur = conn.execute("DELETE FROM travel_plan_item WHERE id=?", (id,))
    conn.commit()
    return cur.rowcount > 0


def delete_with_booking_release(
    item_id: int, table_name: str | None, location_id: int | None
) -> bool:
    """事务性删除明细并释放场所预约数。"""
    conn = get_connection()
    try:
        conn.execute("BEGIN")
        # 释放预约数（仅对有该字段且 count > 0 的表）
        if table_name and location_id:
            conn.execute(
                f"UPDATE {table_name} SET current_booking_count = current_booking_count - 1 WHERE id=? AND current_booking_count > 0",
                (location_id,),
            )
        # 删除明细
        cur = conn.execute("DELETE FROM travel_plan_item WHERE id=?", (item_id,))
        if cur.rowcount == 0:
            conn.rollback()
            return False
        conn.commit()
        return True
    except Exception:
        conn.rollback()
        return False