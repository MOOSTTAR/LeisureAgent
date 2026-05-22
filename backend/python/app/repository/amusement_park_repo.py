"""amusement_park CRUD"""

from __future__ import annotations

from typing import Any, Optional

from app.db.database import get_connection

TABLE = "amusement_park"


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM amusement_park WHERE id=?", (id,)).fetchone()
    return dict(row) if row else None


def get_all(limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM amusement_park ORDER BY id LIMIT ? OFFSET ?", (limit, offset)
    ).fetchall()
    return [dict(r) for r in rows]


def search_by_name(keyword: str, limit: int = 10) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM amusement_park WHERE name LIKE ? LIMIT ?",
        (f"%{keyword}%", limit),
    ).fetchall()
    return [dict(r) for r in rows]


def filter_by_theme(theme: str, limit: int = 20) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM amusement_park WHERE park_theme=? LIMIT ?", (theme, limit)
    ).fetchall()
    return [dict(r) for r in rows]


def filter_free_entry(limit: int = 20) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM amusement_park WHERE ticket_price=0 LIMIT ?", (limit,)
    ).fetchall()
    return [dict(r) for r in rows]


def search(
    name: Optional[str] = None,
    park_theme: Optional[str] = None,
    free_entry: Optional[bool] = None,
    bookable: Optional[bool] = None,
    distance_min: Optional[int] = None,
    distance_max: Optional[int] = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, Any]]:
    conn = get_connection()
    clauses: list[str] = []
    params: list[Any] = []

    if name:
        clauses.append("name LIKE ?")
        params.append(f"%{name}%")
    if park_theme:
        clauses.append("park_theme = ?")
        params.append(park_theme)
    if free_entry is not None:
        if free_entry:
            clauses.append("ticket_price = 0")
        else:
            clauses.append("ticket_price > 0")
    if bookable is not None:
        if bookable:
            clauses.append("booking_hours IS NOT NULL AND booking_hours != '不能预约'")
        else:
            clauses.append("booking_hours IS NULL OR booking_hours = '不能预约'")
    if distance_min is not None and distance_max is not None:
        clauses.append("(ABS(x) + ABS(y)) BETWEEN ? AND ?")
        params.extend([distance_min, distance_max])
    elif distance_min is not None:
        clauses.append("(ABS(x) + ABS(y)) >= ?")
        params.append(distance_min)
    elif distance_max is not None:
        clauses.append("(ABS(x) + ABS(y)) <= ?")
        params.append(distance_max)

    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    rows = conn.execute(
        f"SELECT * FROM amusement_park{where} ORDER BY id LIMIT ? OFFSET ?",
        [*params, limit, offset],
    ).fetchall()
    return [dict(r) for r in rows]


def count(
    name: Optional[str] = None,
    park_theme: Optional[str] = None,
    free_entry: Optional[bool] = None,
    bookable: Optional[bool] = None,
    distance_min: Optional[int] = None,
    distance_max: Optional[int] = None,
) -> int:
    conn = get_connection()
    clauses: list[str] = []
    params: list[Any] = []

    if name:
        clauses.append("name LIKE ?")
        params.append(f"%{name}%")
    if park_theme:
        clauses.append("park_theme = ?")
        params.append(park_theme)
    if free_entry is not None:
        if free_entry:
            clauses.append("ticket_price = 0")
        else:
            clauses.append("ticket_price > 0")
    if bookable is not None:
        if bookable:
            clauses.append("booking_hours IS NOT NULL AND booking_hours != '不能预约'")
        else:
            clauses.append("booking_hours IS NULL OR booking_hours = '不能预约'")
    if distance_min is not None and distance_max is not None:
        clauses.append("(ABS(x) + ABS(y)) BETWEEN ? AND ?")
        params.extend([distance_min, distance_max])
    elif distance_min is not None:
        clauses.append("(ABS(x) + ABS(y)) >= ?")
        params.append(distance_min)
    elif distance_max is not None:
        clauses.append("(ABS(x) + ABS(y)) <= ?")
        params.append(distance_max)

    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    row = conn.execute(f"SELECT COUNT(*) FROM amusement_park{where}", params).fetchone()
    return row[0]


def create(data: dict[str, Any]) -> int:
    conn = get_connection()
    keys = list(data.keys())
    vals = list(data.values())
    placeholders = ",".join("?" for _ in keys)
    cur = conn.execute(
        f"INSERT INTO amusement_park ({','.join(keys)}) VALUES ({placeholders})", vals
    )
    conn.commit()
    return cur.lastrowid  # type: ignore[return-value]


def update(id: int, data: dict[str, Any]) -> bool:
    conn = get_connection()
    sets = ",".join(f"{k}=?" for k in data)
    cur = conn.execute(
        f"UPDATE amusement_park SET {sets} WHERE id=?", [*data.values(), id]
    )
    conn.commit()
    return cur.rowcount > 0


def delete(id: int) -> bool:
    conn = get_connection()
    cur = conn.execute("DELETE FROM amusement_park WHERE id=?", (id,))
    conn.commit()
    return cur.rowcount > 0

