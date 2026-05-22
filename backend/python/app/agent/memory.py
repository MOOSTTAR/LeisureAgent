"""SQLite-backed short-term memory and session management for Agent."""

from __future__ import annotations

import json
import uuid
from typing import Any

from app.db.database import get_connection


def ensure_session(session_id: str | None, first_message: str) -> str:
    sid = session_id or uuid.uuid4().hex
    conn = get_connection()
    row = conn.execute("SELECT id FROM agent_session WHERE id=?", (sid,)).fetchone()
    title = _make_title(first_message)
    if row:
        conn.execute(
            """
            UPDATE agent_session
            SET last_message=?, updated_at=CURRENT_TIMESTAMP
            WHERE id=?
            """,
            (first_message, sid),
        )
    else:
        conn.execute(
            """
            INSERT INTO agent_session (id, title, last_message, status)
            VALUES (?, ?, ?, 'active')
            """,
            (sid, title, first_message),
        )
    conn.commit()
    return sid


def append_message(
    session_id: str,
    role: str,
    content: str,
    metadata: dict[str, Any] | None = None,
) -> None:
    conn = get_connection()
    conn.execute(
        """
        INSERT INTO agent_message (session_id, role, content, metadata)
        VALUES (?, ?, ?, ?)
        """,
        (
            session_id,
            role,
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
        (content, session_id),
    )
    conn.commit()


def load_messages(session_id: str, limit: int = 20) -> list[dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        """
        SELECT role, content, metadata, created_at
        FROM agent_message
        WHERE session_id=?
        ORDER BY id DESC
        LIMIT ?
        """,
        (session_id, limit),
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
                "role": row["role"],
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
        SELECT id, title, last_message, current_plan_id, status, created_at, updated_at
        FROM agent_session
        ORDER BY updated_at DESC
        LIMIT ?
        """,
        (limit,),
    ).fetchall()
    return [dict(row) for row in rows]


def get_session(session_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    row = conn.execute(
        """
        SELECT id, title, last_message, current_plan_id, status, created_at, updated_at
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


def bind_plan(session_id: str, plan_id: int) -> None:
    conn = get_connection()
    conn.execute(
        """
        UPDATE agent_session
        SET current_plan_id=?, status='completed', updated_at=CURRENT_TIMESTAMP
        WHERE id=?
        """,
        (plan_id, session_id),
    )
    conn.commit()


def delete_session(session_id: str) -> bool:
    conn = get_connection()
    cur = conn.execute("DELETE FROM agent_session WHERE id=?", (session_id,))
    conn.commit()
    return cur.rowcount > 0


def _make_title(text: str) -> str:
    cleaned = text.strip().replace("\n", " ")
    return cleaned[:24] or "新的活动规划"
