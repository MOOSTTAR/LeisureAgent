"""LangGraph orchestration for LeisureAgent — ReAct + Plan&Execute 模式。

路由路径:
  casual/out_of_domain → direct_reply → END
  inquiry   → search_inquiry → present_inquiry → END
  new_plan  → analyze_goal → search_candidates → detect_exceptions
            ⇢ (critical_gap) adjust_search → search_candidates (loop, max 2)
            → compose_plan → persist_plan
            ⇢ (auto_execute) execute_bookings → finalize_executed → END
            ⇢ (manual) present_plan → END
  feedback  → analyze_feedback → (search_candidates?) → detect_exceptions → compose_plan
            → persist_plan → present_plan → END
  confirm   → execute_bookings
            ⇢ (failure) replan_execute → persist_plan → execute_bookings (loop, max 2)
            ⇢ (ok) finalize_executed → END
"""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agent.planner import (
    adjust_search_node,
    analyze_feedback_node,
    analyze_goal_node,
    classify_intent_node,
    compose_plan_node,
    detect_exceptions_node,
    direct_reply_node,
    execute_bookings_node,
    finalize_executed_node,
    finalize_node,
    gap_report_node,
    load_session_node,
    persist_plan_node,
    present_inquiry_node,
    present_plan_node,
    replan_execute_node,
    search_candidates_node,
    search_inquiry_node,
)
from app.agent.state import AgentState


def build_graph() -> CompiledStateGraph[Any, Any, Any, Any]:
    workflow = StateGraph(AgentState)

    # ── 注册所有节点 ──
    workflow.add_node("load_session", load_session_node)
    workflow.add_node("classify_intent", classify_intent_node)
    workflow.add_node("direct_reply", direct_reply_node)
    workflow.add_node("analyze_goal", analyze_goal_node)
    workflow.add_node("search_candidates", search_candidates_node)
    workflow.add_node("search_inquiry", search_inquiry_node)
    workflow.add_node("present_inquiry", present_inquiry_node)
    workflow.add_node("detect_exceptions", detect_exceptions_node)
    workflow.add_node("adjust_search", adjust_search_node)
    workflow.add_node("compose_plan", compose_plan_node)
    workflow.add_node("persist_plan", persist_plan_node)
    workflow.add_node("present_plan", present_plan_node)
    workflow.add_node("analyze_feedback", analyze_feedback_node)
    workflow.add_node("execute_bookings", execute_bookings_node)
    workflow.add_node("replan_execute", replan_execute_node)
    workflow.add_node("finalize_executed", finalize_executed_node)
    workflow.add_node("finalize", finalize_node)
    workflow.add_node("gap_report", gap_report_node)

    workflow.set_entry_point("load_session")
    workflow.add_conditional_edges(
        "load_session",
        _route_after_load,
        {
            "blocked": "direct_reply",
            "ok": "classify_intent",
        },
    )

    # ── 条件路由: 根据 intent_type 分发 ──
    workflow.add_conditional_edges(
        "classify_intent",
        _route_by_intent,
        {
            "direct_reply": "direct_reply",
            "inquiry": "search_inquiry",
            "new_plan": "analyze_goal",
            "feedback": "analyze_feedback",
            "confirm": "execute_bookings",
        },
    )

    # ── new_plan 路径 ──
    workflow.add_edge("analyze_goal", "search_candidates")
    workflow.add_edge("search_candidates", "detect_exceptions")
    # ReAct 搜索自愈循环: detect → adjust_search → search → detect，或 → compose_plan
    workflow.add_conditional_edges(
        "detect_exceptions",
        _route_after_detect,
        {
            "retry_search": "adjust_search",
            "compose": "compose_plan",
            "gap_report": "gap_report",
        },
    )
    workflow.add_edge("adjust_search", "search_candidates")
    workflow.add_edge("compose_plan", "persist_plan")
    # P&E 一键模式：auto_execute 或执行重试 → 直接进入预约执行
    workflow.add_conditional_edges(
        "persist_plan",
        _route_after_persist,
        {
            "auto_execute": "execute_bookings",
            "present": "present_plan",
        },
    )
    workflow.add_edge("present_plan", END)

    # ── inquiry 路径 ──
    workflow.add_edge("search_inquiry", "present_inquiry")
    workflow.add_edge("present_inquiry", END)

    # ── feedback 路径: analyze_feedback → (search_candidates | compose_plan) ──
    workflow.add_conditional_edges(
        "analyze_feedback",
        _route_feedback,
        {
            "needs_search": "search_candidates",
            "skip_search": "compose_plan",
        },
    )
    # search → detect → (adjust_search?) → compose → persist → present（复用 new_plan 后段）
    # 注意：search_candidates / detect_exceptions / compose_plan / persist_plan 的边已定义

    # ── confirm 路径 + ReAct 执行自愈循环 ──
    workflow.add_conditional_edges(
        "execute_bookings",
        _route_after_exec,
        {
            "replan": "replan_execute",
            "finalize": "finalize_executed",
        },
    )
    workflow.add_edge("replan_execute", "persist_plan")
    workflow.add_edge("finalize_executed", END)

    # ── direct_reply 路径 ──
    workflow.add_edge("direct_reply", END)

    # ── finalize（同步端点兼容） ──
    workflow.add_edge("finalize", END)
    workflow.add_edge("gap_report", END)

    return workflow.compile()


# ── 路由函数 ──

def _route_after_load(state: AgentState) -> str:
    """load_session 后：拦截则直接回复，否则继续分类。"""
    if state.get("blocked"):
        return "blocked"
    return "ok"


def _route_by_intent(state: AgentState) -> str:
    """根据 classify_intent 的结果路由。"""
    intent_type = state.get("intent_type", "new_plan")
    if intent_type in ("casual", "out_of_domain", "clarify"):
        return "direct_reply"
    return intent_type


def _route_feedback(state: AgentState) -> str:
    """根据反馈分析结果决定是否需要重新搜索。"""
    if state.get("needs_research", False):
        return "needs_search"
    return "skip_search"


def _route_after_detect(state: AgentState) -> str:
    """ReAct 搜索自愈：关键类别缺失且未达重试上限 → 放宽重搜。若重试耗尽仍有缺口 → 告知用户。"""
    if state.get("critical_gaps", False):
        if state.get("search_attempt", 0) < 2:
            return "retry_search"
        return "gap_report"
    return "compose"


def _route_after_exec(state: AgentState) -> str:
    """ReAct 执行自愈：有失败项且未达重试上限 → 替代重试。"""
    results = state.get("booking_results", [])
    has_failures = any(r["status"] != "success" for r in results)
    if has_failures and state.get("exec_attempt", 0) < 2:
        return "replan"
    return "finalize"


def _route_after_persist(state: AgentState) -> str:
    """P&E 一键模式：auto_execute 或执行重试中 → 直接预约。"""
    if state.get("auto_execute", False) or state.get("exec_attempt", 0) > 0:
        return "auto_execute"
    return "present"


# 模块级实例，main.py 中 import
graph = build_graph()
