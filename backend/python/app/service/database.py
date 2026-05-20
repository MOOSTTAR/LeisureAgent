"""SQLite 数据库初始化与连接管理。

提供线程安全的连接管理、表结构初始化、种子数据加载和基础 CRUD 工具。
所有工具函数和 Agent 节点通过本模块读写持久化数据。
"""

from __future__ import annotations

import json
import sqlite3
import threading
from pathlib import Path
from typing import Any, Optional

# ── 数据库路径 ──
_DB_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = str(_DB_DIR / "leisure_agent.db")

# ── 线程本地连接 ──
_local = threading.local()


def get_connection() -> sqlite3.Connection:
    """获取当前线程的数据库连接（懒加载，自动创建）。"""
    conn: Optional[sqlite3.Connection] = getattr(_local, "conn", None)
    if conn is None:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        _local.conn = conn
    return conn


def close_db() -> None:
    """关闭当前线程的数据库连接。"""
    conn: Optional[sqlite3.Connection] = getattr(_local, "conn", None)
    if conn:
        conn.close()
        _local.conn = None


# ── 表结构 ──

_SCHEMA = """
CREATE TABLE IF NOT EXISTS items (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    category    TEXT NOT NULL,
    address     TEXT NOT NULL DEFAULT '',
    rating      REAL NOT NULL DEFAULT 0 CHECK(rating >= 0 AND rating <= 5),
    avg_cost    REAL NOT NULL DEFAULT 0 CHECK(avg_cost >= 0),
    available   INTEGER NOT NULL DEFAULT 1,
    tags        TEXT NOT NULL DEFAULT '[]',
    item_type   TEXT NOT NULL DEFAULT 'dining'
        CHECK(item_type IN ('dining', 'activity', 'delivery')),
    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS bookings (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id   TEXT UNIQUE NOT NULL,
    item_id      TEXT NOT NULL,
    item_name    TEXT NOT NULL,
    time         TEXT NOT NULL DEFAULT '',
    party_size   INTEGER NOT NULL DEFAULT 1 CHECK(party_size >= 1 AND party_size <= 20),
    contact_name TEXT NOT NULL DEFAULT '',
    contact_phone TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'confirmed'
        CHECK(status IN ('confirmed', 'cancelled', 'completed')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS delivery_orders (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id     TEXT UNIQUE NOT NULL,
    item_id      TEXT NOT NULL,
    item_name    TEXT NOT NULL,
    address      TEXT NOT NULL DEFAULT '',
    quantity     INTEGER NOT NULL DEFAULT 1 CHECK(quantity >= 1),
    status       TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending', 'delivering', 'completed', 'cancelled')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (item_id) REFERENCES items(id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id           TEXT PRIMARY KEY,
    user_input   TEXT NOT NULL DEFAULT '',
    plan_summary TEXT NOT NULL DEFAULT '',
    status       TEXT NOT NULL DEFAULT 'active'
        CHECK(status IN ('active', 'completed', 'expired')),
    created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now','localtime'))
);
"""

# ── 基础 CRUD ──


def fetch_all(
    table: str, where: Optional[dict[str, Any]] = None, limit: int = 20
) -> list[dict[str, Any]]:
    """通用查询，返回字典列表。"""
    conn = get_connection()
    if where:
        clauses = [f"{k}=?" for k in where]
        sql = f"SELECT * FROM {table} WHERE {' AND '.join(clauses)} LIMIT ?"
        rows = conn.execute(sql, [*where.values(), limit]).fetchall()
    else:
        sql = f"SELECT * FROM {table} LIMIT ?"
        rows = conn.execute(sql, [limit]).fetchall()
    return [dict(r) for r in rows]


def fetch_one(
    table: str, where: dict[str, Any]
) -> Optional[dict[str, Any]]:
    """查询单条记录，无结果返回 None。"""
    conn = get_connection()
    clauses = [f"{k}=?" for k in where]
    row = conn.execute(
        f"SELECT * FROM {table} WHERE {' AND '.join(clauses)} LIMIT 1",
        list(where.values()),
    ).fetchone()
    return dict(row) if row else None


def insert(table: str, data: dict[str, Any]) -> int:
    """插入记录，返回自增主键 ID。"""
    conn = get_connection()
    keys = list(data.keys())
    values = list(data.values())
    placeholders = ",".join("?" for _ in keys)
    cur = conn.execute(
        f"INSERT INTO {table} ({','.join(keys)}) VALUES ({placeholders})",
        values,
    )
    conn.commit()
    return cur.lastrowid  # type: ignore[return-value]


# ── 种子数据 ──


def _seed_items(conn: sqlite3.Connection) -> None:
    """将 Mock 数据写入 items 表（幂等，有数据则跳过）。"""
    from app.mock.data import MOCK_ACTIVITIES, MOCK_DELIVERY_ITEMS, MOCK_RESTAURANTS

    existing = conn.execute("SELECT COUNT(*) FROM items").fetchone()[0]
    if existing > 0:
        return

    for item in MOCK_RESTAURANTS:
        _insert_item(conn, {**item.model_dump(), "item_type": "dining"})
    for item in MOCK_ACTIVITIES:
        _insert_item(conn, {**item.model_dump(), "item_type": "activity"})
    for item in MOCK_DELIVERY_ITEMS:
        _insert_item(conn, {**item.model_dump(), "item_type": "delivery"})
    conn.commit()


def _insert_item(conn: sqlite3.Connection, row: dict) -> None:
    conn.execute(
        """INSERT INTO items (id, name, category, address, rating, avg_cost,
                              available, tags, item_type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            row["id"],
            row["name"],
            row["category"],
            row["address"],
            row["rating"],
            row["avg_cost"],
            1 if row.get("available", True) else 0,
            json.dumps(row["tags"], ensure_ascii=False),
            row["item_type"],
        ),
    )


# ── 初始化入口 ──


def init_db() -> None:
    """创建表并写入种子数据（幂等安全，应用启动时调用一次）。"""
    conn = get_connection()
    conn.executescript(_SCHEMA)
    conn.commit()
    _seed_items(conn)


def reset_db() -> None:
    """清空全部数据并重新初始化（开发/测试用）。"""
    conn = get_connection()
    for table in ("delivery_orders", "bookings", "sessions", "items"):
        conn.execute(f"DROP TABLE IF EXISTS {table}")
    conn.commit()
    init_db()