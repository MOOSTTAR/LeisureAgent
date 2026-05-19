from __future__ import annotations

import operator
from typing import Annotated, TypedDict

from app.models.schemas import ActivityPlan, UserIntent


class AgentState(TypedDict):
    """LangGraph Agent 的全局状态"""

    # 用户输入
    user_input: str
    intent: UserIntent | None

    # 计划状态
    plan: ActivityPlan | None
    plan_confirmed: bool

    # 对话历史（消息列表，每条是 {"role": ..., "content": ...}）
    messages: Annotated[list[dict], operator.add]

    # 当前步骤
    current_step: str  # analyze / search / plan / confirm / execute / done

    # 执行结果
    execution_results: list[dict]

    # 错误信息
    error: str | None