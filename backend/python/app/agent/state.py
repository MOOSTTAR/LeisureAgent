from __future__ import annotations

import operator
from typing import Annotated, Any, TypedDict

from app.models.schemas import AgentPlan, UserIntent


class AgentState(TypedDict, total=False):
    """LangGraph Agent 全局状态 — ReAct + Plan&Execute 模式。

    ReAct 循环: classify → search/compose → present → analyze_feedback → 循环
    Plan&Execute: compose → persist → present(plan) → execute_bookings → finalize
    """

    user_input: str
    session_id: int

    # ── 路由判断 (ReAct 推理阶段) ──
    intent_type: str  # "casual" | "out_of_domain" | "inquiry" | "new_plan" | "feedback" | "confirm"
    is_relevant: bool
    stage: str  # "chatting" | "planning" | "reviewing" | "executed"
    direct_reply: str  # LLM 生成的直接回复（casual/out_of_domain 时使用）
    blocked: bool  # 用户输入被安全过滤拦截
    block_reason: str  # 拦截原因

    intent: UserIntent | None
    scenario: str
    constraints: dict[str, Any]

    session_messages: list[dict[str, Any]]
    messages: Annotated[list[dict[str, str]], operator.add]

    # ── 咨询/浏览模式 (ReAct 行动: 搜索工具) ──
    inquiry_results: list[dict[str, Any]]
    inquiry_query: str

    candidates: dict[str, list[dict[str, Any]]]
    selected_items: list[dict[str, Any]]
    plan: AgentPlan | None
    plan_id: int | None
    existing_plan_id: int | None  # 当前会话已有的方案 ID

    # ── 反馈循环 (ReAct 观察→再推理) ──
    feedback_text: str
    revision_count: int
    needs_research: bool
    replaced_items: list[str]
    feedback_constraints: dict[str, Any]

    # ── 异常处理 (ReAct 观察结果) ──
    exceptions: list[dict[str, Any]]
    warnings: list[str]
    critical_gaps: bool  # 关键类别缺失，需放宽约束重搜

    # ── ReAct 内部循环计数 ──
    search_attempt: int  # 搜索重试次数（上限 2）
    exec_attempt: int  # 执行重试次数（上限 2）
    auto_execute: bool  # Plan&Execute 一键模式，跳过用户确认

    # ── 执行 (Plan&Execute 执行阶段) ──
    booking_results: list[dict[str, Any]]

    share_text: str
    share_url: str

    current_step: str
    error: str | None
