"""SQLite-backed short-term memory and session management for Agent."""

from __future__ import annotations

import json
from typing import Any

from app.db.database import get_connection


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
                SET last_message=?, updated_at=CURRENT_TIMESTAMP
                WHERE id=?
                """,
                (first_message, sid),
            )
            conn.commit()
            return sid

    # 创建新会话（自增 ID）
    cur = conn.execute(
        """
        INSERT INTO agent_session (title, last_message, status)
        VALUES (?, ?, 0)
        """,
        (title, first_message),
    )
    conn.commit()
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
        SET last_message=?, updated_at=CURRENT_TIMESTAMP
        WHERE id=?
        """,
        (content, agent_session_id),
    )
    conn.commit()


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
        SELECT id, title, last_message, travel_plan_id, status, created_at, updated_at
        FROM agent_session
        ORDER BY updated_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [dict(row) for row in rows]


def get_session(session_id: int) -> dict[str, Any] | None:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT id, title, last_message, travel_plan_id, status, created_at, updated_at
        FROM agent_session
        WHERE id=?
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
    conn.commit()


def delete_session(session_id: int) -> bool:
    conn = get_connection()
    cur = conn.execute("DELETE FROM agent_session WHERE id=?", (session_id,))
    conn.commit()
    return cur.rowcount > 0


def _make_title(text: str) -> str:
    cleaned = text.strip().replace("\n", " ")
    return cleaned[:24] or "新对话"
