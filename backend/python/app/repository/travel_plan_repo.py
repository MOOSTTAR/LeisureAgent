"""travel_plan CRUD"""

from __future__ import annotations

from typing import Any, Optional

from app.db.database import get_connection

TABLE = "travel_plan"


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM travel_plan WHERE id=?", (id,)).fetchone()
    return dict(row) if row else None


def get_all(limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM travel_plan ORDER BY id LIMIT ? OFFSET ?", (limit, offset)
    ).fetchall()
    return [dict(r) for r in rows]


def search_by_title(keyword: str, limit: int = 10) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM travel_plan WHERE plan_title LIKE ? LIMIT ?",
        (f"%{keyword}%", limit),
    ).fetchall()
    return [dict(r) for r in rows]


def filter_by_type(travel_type: str, limit: int = 20) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM travel_plan WHERE travel_type=? LIMIT ?", (travel_type, limit)
    ).fetchall()
    return [dict(r) for r in rows]


def filter_by_date(travel_date: str, limit: int = 20) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM travel_plan WHERE travel_date=? LIMIT ?", (travel_date, limit)
    ).fetchall()
    return [dict(r) for r in rows]


def search(
    title: Optional[str] = None,
    travel_type: Optional[str] = None,
    travel_date: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, Any]]:
    conn = get_connection()
    clauses: list[str] = []
    params: list[Any] = []

    if title:
        clauses.append("plan_title LIKE ?")
        params.append(f"%{title}%")
    if travel_type:
        clauses.append("travel_type = ?")
        params.append(travel_type)
    if travel_date:
        clauses.append("travel_date = ?")
        params.append(travel_date)

    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    rows = conn.execute(
        f"SELECT * FROM travel_plan{where} ORDER BY id LIMIT ? OFFSET ?",
        [*params, limit, offset],
    ).fetchall()
    return [dict(r) for r in rows]


def count(
    title: Optional[str] = None,
    travel_type: Optional[str] = None,
    travel_date: Optional[str] = None,
) -> int:
    conn = get_connection()
    clauses: list[str] = []
    params: list[Any] = []

    if title:
        clauses.append("plan_title LIKE ?")
        params.append(f"%{title}%")
    if travel_type:
        clauses.append("travel_type = ?")
        params.append(travel_type)
    if travel_date:
        clauses.append("travel_date = ?")
        params.append(travel_date)

    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    row = conn.execute(f"SELECT COUNT(*) FROM travel_plan{where}", params).fetchone()
    return row[0]


def create(data: dict[str, Any]) -> int:
    conn = get_connection()
    keys = list(data.keys())
    vals = list(data.values())
    placeholders = ",".join("?" for _ in keys)
    cur = conn.execute(
        f"INSERT INTO travel_plan ({','.join(keys)}) VALUES ({placeholders})", vals
    )
    conn.commit()
    return cur.lastrowid  # type: ignore[return-value]


def update(id: int, data: dict[str, Any]) -> bool:
    conn = get_connection()
    sets = ",".join(f"{k}=?" for k in data)
    cur = conn.execute(
        f"UPDATE travel_plan SET {sets} WHERE id=?", [*data.values(), id]
    )
    conn.commit()
    return cur.rowcount > 0


def delete(id: int) -> bool:
    conn = get_connection()
    cur = conn.execute("DELETE FROM travel_plan WHERE id=?", (id,))
    conn.commit()
    return cur.rowcount > 0