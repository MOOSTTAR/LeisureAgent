"""mall CRUD"""

from __future__ import annotations

from typing import Any, Optional

from app.db.database import get_connection, safe_commit

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


def search(
    has_cinema: Optional[bool] = None,
    name:  Optional[str] = None,
    has_supermarket: Optional[bool] = None,
    distance_min: Optional[int] = None,
    distance_max: Optional[int] = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, Any]]:
    conn = get_connection()
    clauses: list[str] = []
    params: list[Any] = []

    if name is not None:
        clauses.append("name LIKE ?")
        params.append(f"%{name}%")
    if has_cinema is not None:
        clauses.append("cinema_has = ?")
        params.append(1 if has_cinema else 0)
    if has_supermarket is not None:
        clauses.append("supermarket_has = ?")
        params.append(1 if has_supermarket else 0)
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
        f"SELECT * FROM mall{where} ORDER BY id LIMIT ? OFFSET ?",
        [*params, limit, offset],
    ).fetchall()
    return [dict(r) for r in rows]


def count(
    has_cinema: Optional[bool] = None,
    name: Optional[str] = None,
    has_supermarket: Optional[bool] = None,
    distance_min: Optional[int] = None,
    distance_max: Optional[int] = None,
) -> int:
    conn = get_connection()
    clauses: list[str] = []
    params: list[Any] = []

    if name is not None:
        clauses.append("name LIKE ?")
        params.append(f"%{name}%")
    if has_cinema is not None:
        clauses.append("cinema_has = ?")
        params.append(1 if has_cinema else 0)
    if has_supermarket is not None:
        clauses.append("supermarket_has = ?")
        params.append(1 if has_supermarket else 0)
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
    row = conn.execute(f"SELECT COUNT(*) FROM mall{where}", params).fetchone()
    return row[0]


def create(data: dict[str, Any]) -> int:
    conn = get_connection()
    keys = list(data.keys())
    vals = list(data.values())
    placeholders = ",".join("?" for _ in keys)
    cur = conn.execute(
        f"INSERT INTO mall ({','.join(keys)}) VALUES ({placeholders})", vals
    )
    safe_commit(conn)
    return cur.lastrowid  # type: ignore[return-value]


def update(id: int, data: dict[str, Any]) -> bool:
    conn = get_connection()
    sets = ",".join(f"{k}=?" for k in data)
    cur = conn.execute(f"UPDATE mall SET {sets} WHERE id=?", [*data.values(), id])
    safe_commit(conn)
    return cur.rowcount > 0


def delete(id: int) -> bool:
    conn = get_connection()
    cur = conn.execute("DELETE FROM mall WHERE id=?", (id,))
    safe_commit(conn)
    return cur.rowcount > 0