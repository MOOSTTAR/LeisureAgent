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

/* 餐厅详情表（和 location 表关联使用） */
CREATE TABLE restaurant (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- 主键ID
    name TEXT NOT NULL, -- 餐厅名字
    address TEXT NOT NULL, -- 详细地址 示例 xx区xx县xx街道xx号
    x INTEGER NOT NULL, -- 坐标系,横坐标 
    y INTEGER NOT NULL, -- 坐标系，纵坐标
    cuisine_type TEXT DEFAULT NULL, -- 菜系：中餐/西餐/日料/火锅/烧烤等
    dining_style INTEGER DEFAULT 0, -- 用餐方式 0堂食 1外卖 2均可
    tags TEXT DEFAULT NULL, -- 标签，JSON格式：["网红店","亲子餐厅","夜景"]
    business_hours TEXT DEFAULT NULL, -- 营业时间，如“10:00-22:00”
    booking_hours TEXT DEFAULT NULL, -- 可以预约的时间，如“10:00-22:00”，不能预约直接填充“不能预约”
    current_booking_count INTEGER DEFAULT -1, -- 当前预约数
    max_booking_count INTEGER DEFAULT -1, -- 最大预约数
    queue_time INTEGER DEFAULT -1, -- -1则不需要排队，大于0则为排队时长
    indoor_env TEXT DEFAULT NULL -- 室内环境描述
);

/* 商场信息表 */
CREATE TABLE mall (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- 主键ID
    name TEXT NOT NULL, -- 商场名字
    address TEXT NOT NULL, -- 详细地址 示例 xx区xx县xx街道xx号
    x INTEGER NOT NULL, -- 坐标系,横坐标 
    y INTEGER NOT NULL, -- 坐标系，纵坐标
    cinema_has INTEGER DEFAULT 0, -- 是否有影院 0无 1有
    supermarket_has INTEGER DEFAULT 0, -- 是否有大型超市
);

/* 游乐园/主题乐园表 */
CREATE TABLE amusement_park (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- 主键ID
    name TEXT NOT NULL, -- 乐园名字
    address TEXT NOT NULL, -- 详细地址 示例 xx区xx县xx街道xx号
    x INTEGER NOT NULL, -- 坐标系,横坐标 
    y INTEGER NOT NULL, -- 坐标系，纵坐标
    business_hours TEXT DEFAULT NULL, -- 营业时间，如“10:00-22:00”
    booking_hours TEXT DEFAULT NULL, -- 可以预约的时间，如“10:00-22:00”，不能预约直接填充“不能预约”
    current_booking_count INTEGER DEFAULT -1, -- 当前预约数
    max_booking_count INTEGER DEFAULT -1, -- 最大预约数
    park_theme TEXT DEFAULT NULL, -- 乐园主题：童话/海洋/科幻/卡通等
    ticket_price REAL DEFAULT 0.00, -- 门票价格
    queue_time INTEGER DEFAULT -1, -- -1则不需要排队，大于0则为排队时长
    performance_info TEXT DEFAULT NULL, -- 演出/表演信息   
);

/* 户外景点信息表 */
CREATE TABLE scenic_spot (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- 主键ID
    name TEXT NOT NULL, -- 户外名字
    address TEXT NOT NULL, -- 详细地址 示例 xx区xx县xx街道xx号
    x INTEGER NOT NULL, -- 坐标系,横坐标 
    y INTEGER NOT NULL, -- 坐标系，纵坐标
    spot_type TEXT DEFAULT NULL, -- 景点类型 山水/古迹/人文/溶洞等
    business_hours TEXT DEFAULT NULL, -- 开放时间，如“10:00-22:00”
    booking_hours TEXT DEFAULT NULL, -- 可以预约的时间，如“10:00-22:00”，不能预约直接填充“不能预约”
    current_booking_count INTEGER DEFAULT -1, -- 当前预约数
    max_booking_count INTEGER DEFAULT -1, -- 最大预约数
    crowd_density INTEGER DEFAULT 2, -- 人流量 1稀少 2适中 3拥挤
);

/* 展馆展览馆信息表 */
CREATE TABLE exhibition_hall (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- 主键ID
    name TEXT NOT NULL, -- 展馆名称
    address TEXT NOT NULL, -- 详细地址 示例 xx区xx县xx街道xx号
    x INTEGER NOT NULL, -- 坐标系,横坐标 
    y INTEGER NOT NULL, -- 坐标系，纵坐标
    hall_type TEXT DEFAULT NULL, -- 展馆类型 历史/艺术/科技/自然
    business_hours TEXT DEFAULT NULL, -- 开放时间，如“10:00-22:00”
    booking_hours TEXT DEFAULT NULL, -- 可以预约的时间，如“10:00-22:00”，不能预约直接填充“不能预约”
    current_booking_count INTEGER DEFAULT -1, -- 当前预约数
    max_booking_count INTEGER DEFAULT -1, -- 最大预约数
    exhibition_theme TEXT DEFAULT NULL, -- 主打展览主题
    ticket_type INTEGER DEFAULT 0, -- 门票类型 0免费 1收费
    ticket_price REAL DEFAULT NULL, -- 门票价格
    manual_guide INTEGER DEFAULT 0, -- 是否人工讲解服务
    interactive_project INTEGER DEFAULT 0, -- 有无互动体验项目
    crowd_level INTEGER DEFAULT 2, -- 人流量 1偏少2适中3拥挤
);

/* 用户信息表 */
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- 用户ID
    username TEXT NOT NULL, -- 登录账号
    user_psw TEXT NOT NULL, -- 登录密码（加密存储）
    nickname TEXT DEFAULT '', -- 用户昵称
    avatar TEXT DEFAULT '/default/abc.png', -- 头像地址
    phone TEXT DEFAULT NULL, -- 手机号
    email TEXT DEFAULT NULL, -- 邮箱
    gender INTEGER DEFAULT 0, -- 性别 0未知 1男 2女
    age INTEGER DEFAULT NULL, -- 年龄
    status INTEGER DEFAULT 1, -- 账号状态 0禁用 1正常
    last_login_time TEXT DEFAULT NULL, -- 最后登录时间
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP, -- 修改时间

);

CREATE TABLE IF NOT EXISTS items (
    id          Integer PRIMARY KEY,
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