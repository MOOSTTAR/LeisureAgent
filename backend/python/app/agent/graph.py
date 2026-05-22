"""LangGraph orchestration for LeisureAgent."""

from __future__ import annotations

from typing import Any

from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph

from app.agent.planner import (
    analyze_goal_node,
    compose_plan_node,
    execute_actions_node,
    finalize_node,
    load_session_node,
    persist_plan_node,
    search_candidates_node,
)
from app.agent.state import AgentState


def route_after_persist(state: AgentState) -> str:
    if state.get("error"):
        return END
    if state.get("auto_execute", True):
        return "execute_actions"
    return "finalize"


def build_graph() -> CompiledStateGraph[Any, Any, Any, Any]:
    workflow = StateGraph(AgentState)

    workflow.add_node("load_session", load_session_node)
    workflow.add_node("analyze_goal", analyze_goal_node)
    workflow.add_node("search_candidates", search_candidates_node)
    workflow.add_node("compose_plan", compose_plan_node)
    workflow.add_node("persist_plan", persist_plan_node)
    workflow.add_node("execute_actions", execute_actions_node)
    workflow.add_node("finalize", finalize_node)

    workflow.set_entry_point("load_session")

    workflow.add_edge("load_session", "analyze_goal")
    workflow.add_edge("analyze_goal", "search_candidates")
    workflow.add_edge("search_candidates", "compose_plan")
    workflow.add_edge("compose_plan", "persist_plan")
    workflow.add_conditional_edges(
        "persist_plan",
        route_after_persist,
        {
            "execute_actions": "execute_actions",
            "finalize": "finalize",
            END: END,
        },
    )
    workflow.add_edge("execute_actions", "finalize")
    workflow.add_edge("finalize", END)

    return workflow.compile()


graph = build_graph()
