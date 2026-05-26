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
CREATE TABLE IF NOT EXISTS restaurant (
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
CREATE TABLE IF NOT EXISTS mall (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- 主键ID
    name TEXT NOT NULL, -- 商场名字
    address TEXT NOT NULL, -- 详细地址 示例 xx区xx县xx街道xx号
    x INTEGER NOT NULL, -- 坐标系,横坐标 
    y INTEGER NOT NULL, -- 坐标系，纵坐标
    cinema_has INTEGER DEFAULT 0, -- 是否有影院 0无 1有
    supermarket_has INTEGER DEFAULT 0 -- 是否有大型超市
);

/* 游乐园/主题乐园表 */
CREATE TABLE IF NOT EXISTS amusement_park (
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
    performance_info TEXT DEFAULT NULL -- 演出/表演信息   
);

/* 户外景点信息表 */
CREATE TABLE IF NOT EXISTS scenic_spot (
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
    crowd_density INTEGER DEFAULT 2 -- 人流量 1稀少 2适中 3拥挤
);

/* 展馆展览馆信息表 */
CREATE TABLE IF NOT EXISTS exhibition_hall (
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
    crowd_level INTEGER DEFAULT 2 -- 人流量 1偏少2适中3拥挤
);

/* 游玩规划方案表 - 用户行程规划 */
CREATE TABLE IF NOT EXISTS travel_plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- 方案ID
    plan_title TEXT NOT NULL, -- 方案标题（如：周末亲子一日游）
    plan_desc TEXT DEFAULT NULL,   -- 方案简介/备注
    travel_days INTEGER DEFAULT 1, -- 行程天数
    travel_type TEXT DEFAULT NULL, -- 游玩类型 亲子/美食/逛街/风景/人文
    travel_date TEXT DEFAULT NULL, -- 计划出行日期
    total_cost REAL DEFAULT 0, -- 预估总花费
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP -- 更新时间
);

/* 规划方案详情明细表（每日行程地点） */
CREATE TABLE IF NOT EXISTS travel_plan_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- 明细ID
    plan_id INTEGER NOT NULL, -- 关联规划方案ID
    location_table_name TEXT NOT NULL, -- 关联场所表的名称
    location_id INTEGER NOT NULL, -- 该场所表中的具体id
    day_num INTEGER DEFAULT 1, -- 第几天行程
    is_need_booking INTEGER NOT NULL, -- 是否需要预约,0 不需要， 1 需要
    is_had_booking INTEGER NOT NULL DEFAULT 0, -- 是否已经预约 0 未预约,1 已预约
    arrive_time TEXT DEFAULT NULL, -- 预计到达时间
    leave_time TEXT DEFAULT NULL, -- 预计离开时间
    stay_minute INTEGER DEFAULT 0, -- 停留时长(分钟)
    travel_mode TEXT DEFAULT NULL, -- 到达方式: walking/biking/driving/subway, 首项NULL
    remark TEXT DEFAULT NULL, -- 本段行程备注
    created_at TEXT DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP -- 更新时间
);

/* Agent 会话表 - 多会话管理 */
CREATE TABLE IF NOT EXISTS agent_session (
    id INTEGER PRIMARY KEY  AUTOINCREMENT NOT NULL, -- 会话ID
    title TEXT NOT NULL DEFAULT '新对话', -- 会话标题,默认第一句话
    travel_plan_id INTEGER DEFAULT '0', -- 规划方案ID
    status INTEGER NOT NULL DEFAULT '0', -- 0: active 1: completed 等
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

/* Agent 消息表 - 单会话短期记忆 */
CREATE TABLE IF NOT EXISTS agent_message (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, -- 单个消息的id
    agent_session_id TEXT NOT NULL, -- 逻辑外键，关联多会话管理
    role INTEGER NOT NULL DEFAULT '0', -- 身份字段 1: assistant, 2: user
    content TEXT NOT NULL, -- 内容字段
    metadata TEXT DEFAULT NULL, -- 存结构化附加数据
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_agent_message_session ON agent_message(agent_session_id);


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


def _seed_mock_data(conn: sqlite3.Connection) -> None:
    """将 Mock 数据写入所有业务表（幂等，有数据则跳过）。"""
    from app.mock.data import (
        MOCK_AMUSEMENT_PARKS,
        MOCK_EXHIBITION_HALLS,
        MOCK_MALLS,
        MOCK_RESTAURANTS,
        MOCK_SCENIC_SPOTS,
        MOCK_TRAVEL_PLAN_ITEMS,
        MOCK_TRAVEL_PLANS,
    )

    # 检查任一主表是否有数据（幂等判断）
    existing = conn.execute("SELECT COUNT(*) FROM restaurant").fetchone()[0]
    if existing > 0:
        return

    _bulk_insert(conn, "restaurant", MOCK_RESTAURANTS)
    _bulk_insert(conn, "mall", MOCK_MALLS)
    _bulk_insert(conn, "amusement_park", MOCK_AMUSEMENT_PARKS)
    _bulk_insert(conn, "scenic_spot", MOCK_SCENIC_SPOTS)
    _bulk_insert(conn, "exhibition_hall", MOCK_EXHIBITION_HALLS)
    _bulk_insert(conn, "travel_plan", MOCK_TRAVEL_PLANS)
    _bulk_insert(conn, "travel_plan_item", MOCK_TRAVEL_PLAN_ITEMS)


def _bulk_insert(conn: sqlite3.Connection, table: str, rows: list[dict]) -> None:
    for row in rows:
        keys = list(row.keys())
        placeholders = ",".join("?" for _ in keys)
        values = [row[k] for k in keys]
        conn.execute(
            f"INSERT INTO {table} ({','.join(keys)}) VALUES ({placeholders})",
            values,
        )
    conn.commit()


# ── 初始化入口 ──
def init_db() -> None:
    """创建表并写入种子数据（幂等安全，应用启动时调用一次）。"""
    conn = get_connection()
    conn.executescript(_SCHEMA)
    # Migration: 已有数据库加 travel_mode 列（safe for existing DBs）
    try:
        conn.execute("ALTER TABLE travel_plan_item ADD COLUMN travel_mode TEXT DEFAULT NULL")
    except Exception:
        pass
    # Migration: 已有数据库加 processing_log 列
    try:
        conn.execute("ALTER TABLE agent_session ADD COLUMN processing_log TEXT DEFAULT NULL")
    except Exception:
        pass
    conn.commit()
    _seed_mock_data(conn)


def reset_db() -> None:
    """清空全部数据并重新初始化（开发/测试用）。"""
    conn = get_connection()
    for table in (
        "agent_order", "agent_message", "agent_session",
        "travel_plan_item", "travel_plan", "exhibition_hall",
        "scenic_spot", "amusement_park", "mall", "restaurant",
    ):
        conn.execute(f"DROP TABLE IF EXISTS {table}")
    conn.commit()
    init_db()
