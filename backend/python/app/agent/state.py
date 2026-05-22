from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict

from app.models.schemas import AgentPlan, UserIntent


class AgentState(TypedDict, total=False):
    """LangGraph Agent 全局状态。"""

    user_input: str
    session_id: str
    auto_execute: bool

    intent: UserIntent | None
    scenario: str
    constraints: dict[str, Any]

    session_messages: list[dict[str, Any]]
    messages: Annotated[list[dict[str, str]], operator.add]

    candidates: dict[str, list[dict[str, Any]]]
    selected_items: list[dict[str, Any]]
    plan: AgentPlan | None
    plan_id: int | None

    tool_results: list[dict[str, Any]]
    share_text: str
    share_url: str

    current_step: str
    error: str | None
