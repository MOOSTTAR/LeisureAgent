"""LangGraph orchestration for LeisureAgent."""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agent.planner import (
    analyze_goal_node,
    compose_plan_node,
    finalize_node,
    load_session_node,
    persist_plan_node,
    search_candidates_node,
)
from app.agent.state import AgentState


def build_graph() -> CompiledStateGraph[Any, Any, Any, Any]:
    workflow = StateGraph(AgentState)

    workflow.add_node("load_session", load_session_node)
    workflow.add_node("analyze_goal", analyze_goal_node)
    workflow.add_node("search_candidates", search_candidates_node)
    workflow.add_node("compose_plan", compose_plan_node)
    workflow.add_node("persist_plan", persist_plan_node)
    workflow.add_node("finalize", finalize_node)

    workflow.set_entry_point("load_session")

    workflow.add_edge("load_session", "analyze_goal")
    workflow.add_edge("analyze_goal", "search_candidates")
    workflow.add_edge("search_candidates", "compose_plan")
    workflow.add_edge("compose_plan", "persist_plan")
    workflow.add_edge("persist_plan", "finalize")
    workflow.add_edge("finalize", END)

    return workflow.compile()


graph = build_graph()
