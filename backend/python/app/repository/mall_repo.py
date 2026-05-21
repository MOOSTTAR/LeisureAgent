"""mall CRUD"""

from __future__ import annotations

from typing import Any, Optional

from app.db.database import get_connection

TABLE = "mall"


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    conn = get_connection()
    row = conn.execute("SELECT * FROM mall WHERE id=?", (id,)).fetchone()
    return dict(row) if row else None


def get_all(limit: int = 20, offset: int = 0) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM mall ORDER BY id LIMIT ? OFFSET ?", (limit, offset)
    ).fetchall()
    return [dict(r) for r in rows]


def search_by_name(keyword: str, limit: int = 10) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM mall WHERE name LIKE ? LIMIT ?", (f"%{keyword}%", limit)
    ).fetchall()
    return [dict(r) for r in rows]


def filter_has_cinema(limit: int = 20) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM mall WHERE cinema_has=1 LIMIT ?", (limit,)
    ).fetchall()
    return [dict(r) for r in rows]


def filter_has_supermarket(limit: int = 20) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM mall WHERE supermarket_has=1 LIMIT ?", (limit,)
    ).fetchall()
    return [dict(r) for r in rows]


def create(data: dict[str, Any]) -> int:
    conn = get_connection()
    keys = list(data.keys())
    vals = list(data.values())
    placeholders = ",".join("?" for _ in keys)
    cur = conn.execute(
        f"INSERT INTO mall ({','.join(keys)}) VALUES ({placeholders})", vals
    )
    conn.commit()
    return cur.lastrowid  # type: ignore[return-value]


def update(id: int, data: dict[str, Any]) -> bool:
    conn = get_connection()
    sets = ",".join(f"{k}=?" for k in data)
    cur = conn.execute(f"UPDATE mall SET {sets} WHERE id=?", [*data.values(), id])
    conn.commit()
    return cur.rowcount > 0


def delete(id: int) -> bool:
    conn = get_connection()
    cur = conn.execute("DELETE FROM mall WHERE id=?", (id,))
    conn.commit()
    return cur.rowcount > 0