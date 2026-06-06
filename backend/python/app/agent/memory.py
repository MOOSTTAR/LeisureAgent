"""SQLite-backed short-term memory and session management for Agent."""

from __future__ import annotations

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

from app.db.database import get_connection, safe_commit


# role 映射：对外字符串 <-> 数据库存储整数
_ROLE_TO_INT = {"user": 2, "assistant": 1}
_INT_TO_ROLE = {1: "assistant", 2: "user"}


def ensure_session(session_id: int | None, first_message: str) -> int:
    """创建或更新会话，返回会话 ID（INTEGER）。"""
    conn = get_connection()
    sid = session_id
    title = _make_title(first_message)

    if sid:
        row = conn.execute("SELECT id FROM agent_session WHERE id=?", (sid,)).fetchone()
        if row:
            conn.execute(
                """
                UPDATE agent_session
                SET updated_at=CURRENT_TIMESTAMP
                WHERE id=?
                """,
                (sid,),
            )
            safe_commit(conn)
            return sid

    # 创建新会话（自增 ID）
    cur = conn.execute(
        """
        INSERT INTO agent_session (title, status)
        VALUES (?, 0)
        """,
        (title,),
    )
    safe_commit(conn)
    return int(cur.lastrowid)


def append_message(
    agent_session_id: int,
    role: str,
    content: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    """追加消息到 agent_message 表。role 对外为 'user'/'assistant'，入库转 2/1。"""
    conn = get_connection()
    role_int = _ROLE_TO_INT.get(role, 0)
    conn.execute(
        """
        INSERT INTO agent_message (agent_session_id, role, content, metadata)
        VALUES (?, ?, ?, ?)
        """,
        (
            agent_session_id,
            role_int,
            content,
            json.dumps(metadata or {}, ensure_ascii=False),
        ),
    )
    conn.execute(
        """
        UPDATE agent_session
        SET updated_at=CURRENT_TIMESTAMP
        WHERE id=?
        """,
        (agent_session_id,),
    )
    safe_commit(conn)


def load_messages(agent_session_id: int, limit: int = 20) -> list[dict[str, Any]]:
    """加载历史消息。role 从整数转回字符串。"""
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT role, content, metadata, created_at
        FROM agent_message
        WHERE agent_session_id=?
        ORDER BY id DESC
        LIMIT ?
        """,
        (agent_session_id, limit),
    ).fetchall()
    messages = []
    for row in reversed(rows):
        metadata = {}
        if row["metadata"]:
            try:
                metadata = json.loads(row["metadata"])
            except json.JSONDecodeError:
                metadata = {}
        messages.append(
            {
                "role": _INT_TO_ROLE.get(row["role"], "unknown"),
                "content": row["content"],
                "metadata": metadata,
                "created_at": row["created_at"],
            }
        )
    return messages


def list_sessions(limit: int = 50) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT s.id, s.title,
               (SELECT m.content FROM agent_message m
                WHERE m.agent_session_id = s.id ORDER BY m.id DESC LIMIT 1) as last_message,
               s.travel_plan_id, s.status, s.created_at, s.updated_at
        FROM agent_session s
        ORDER BY s.updated_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [dict(row) for row in rows]


def get_session(session_id: int) -> dict[str, Any] | None:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT s.id, s.title,
               (SELECT m.content FROM agent_message m
                WHERE m.agent_session_id = s.id ORDER BY m.id DESC LIMIT 1) as last_message,
               s.travel_plan_id, s.status, s.processing_log, s.created_at, s.updated_at
        FROM agent_session s
        WHERE s.id=?
        """,
        (session_id,),
    ).fetchone()
    if not row:
        return None
    session = dict(row)
    session["messages"] = load_messages(session_id, limit=100)
    return session


def bind_plan(session_id: int, plan_id: int) -> None:
    conn = get_connection()
    conn.execute(
        """
        UPDATE agent_session
        SET travel_plan_id=?, status=1, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
        """,
        (plan_id, session_id),
    )
    safe_commit(conn)


def update_session_title(session_id: int, title: str) -> None:
    """用 AI 生成的方案标题更新会话标题。"""
    conn = get_connection()
    conn.execute(
        "UPDATE agent_session SET title=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (title[:48] or "新对话", session_id),
    )
    safe_commit(conn)


def delete_session(session_id: int) -> bool:
    conn = get_connection()
    cur = conn.execute("DELETE FROM agent_session WHERE id=?", (session_id,))
    safe_commit(conn)
    return cur.rowcount > 0


def mark_completed(session_id: int) -> None:
    """执行预约后标记会话完成 (status=2)。"""
    conn = get_connection()
    conn.execute(
        "UPDATE agent_session SET status=2, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (session_id,),
    )
    safe_commit(conn)


def get_stage(session_id: int) -> str:
    """查询会话当前阶段：planning / reviewing / executed。"""
    conn = get_connection()
    row = conn.execute(
        "SELECT status, travel_plan_id FROM agent_session WHERE id=?",
        (session_id,),
    ).fetchone()
    if not row:
        return "planning"
    # status: 0=active(planning), 1=has_plan(reviewing), 2=executed
    if row["status"] == 2:
        return "executed"
    if row["status"] == 1 and row["travel_plan_id"]:
        return "reviewing"
    return "planning"


def save_processing_log(session_id: int, log_json: str) -> None:
    """保存 Agent 处理步骤日志（单次交互的 JSON 数组）。"""
    conn = get_connection()
    conn.execute(
        "UPDATE agent_session SET processing_log=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (log_json, session_id),
    )
    safe_commit(conn)


def append_processing_log(session_id: int, new_steps_json: str) -> None:
    """追加一次交互的处理步骤到累积日志（JSON 数组的数组）。"""
    import json as _json
    conn = get_connection()
    row = conn.execute(
        "SELECT processing_log FROM agent_session WHERE id=?", (session_id,)
    ).fetchone()
    existing = []
    if row and row["processing_log"]:
        try:
            existing = _json.loads(row["processing_log"])
            if not isinstance(existing, list):
                existing = []
        except Exception as e:
            logger.debug("Failed to parse existing processing_log for session %s: %s", session_id, e)
            existing = []
    try:
        new_steps = _json.loads(new_steps_json)
    except Exception as e:
        logger.debug("Failed to parse new processing steps for session %s: %s", session_id, e)
        new_steps = []
    existing.append(new_steps)
    conn.execute(
        "UPDATE agent_session SET processing_log=?, updated_at=CURRENT_TIMESTAMP WHERE id=?",
        (_json.dumps(existing, ensure_ascii=False), session_id),
    )
    safe_commit(conn)


def _make_title(text: str) -> str:
    cleaned = text.strip().replace("\n", " ")
    return cleaned[:24] or "新对话"
