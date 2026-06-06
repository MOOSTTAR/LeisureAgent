"""搜索节点：候选地点搜索、咨询搜索、咨询展示。"""

from __future__ import annotations

from typing import Any

from app.agent import memory
from app.agent.nodes.classify import _is_casual
from app.agent.nodes.helpers import _emit_step
from app.agent.constants import CUISINE_KEYWORDS
from app.agent.state import AgentState
from app.agent.tools import (
    _check_availability,
    _extract_named_locations,
    search_inquiry,
    search_local_candidates,
)


def search_candidates_node(state: AgentState) -> dict[str, Any]:
    constraints = state.get("constraints", {})

    # 应用反馈约束
    feedback_constraints = state.get("feedback_constraints", {})
    if feedback_constraints:
        constraints = {**constraints, **feedback_constraints}

    # 从用户输入中提取菜系/类型偏好
    user_input = state.get("user_input", "")
    existing_cuisine = constraints.get("cuisine_type")
    if not existing_cuisine:
        for ck in CUISINE_KEYWORDS:
            if ck in user_input:
                constraints["cuisine_type"] = ck
                break

    _emit_step("正在搜索附近候选地点...")
    candidates = search_local_candidates(state.get("scenario", "family"), constraints)

    # 标记可用性
    _emit_step("正在逐项检查可用性与排队时间...")
    for cat in candidates:
        for item in candidates[cat]:
            item["available"] = _check_availability(item)

    # 用户输入中提到的具体地点名：按名称搜索并加入候选
    _named = _extract_named_locations(state.get("user_input", ""))
    for loc in _named:
        cat = loc["category"]
        existing_ids = {item.get("id") for item in candidates.get(cat, [])}
        if loc["id"] not in existing_ids:
            loc["available"] = _check_availability(loc)
            candidates.setdefault(cat, []).append(loc)

    tool_result = {
        "tool": "search_local_candidates",
        "counts": {key: len(value) for key, value in candidates.items()},
    }
    return {
        "candidates": candidates,
        "constraints": constraints,
        "current_step": "detect_exceptions",
        "messages": [{"role": "assistant", "content": f"已找到候选地点：{tool_result['counts']}"}],
    }


def search_inquiry_node(state: AgentState) -> dict[str, Any]:
    user_input = state["user_input"]
    # 寒暄/闲聊直接跳过搜索，由 present_inquiry 给出友好回复
    if _is_casual(user_input):
        return {
            "inquiry_results": [],
            "inquiry_query": user_input,
            "current_step": "present_inquiry",
        }
    results = search_inquiry(user_input, state.get("constraints"))
    return {
        "inquiry_results": results,
        "inquiry_query": user_input,
        "current_step": "present_inquiry",
    }


def present_inquiry_node(state: AgentState) -> dict[str, Any]:
    results = state.get("inquiry_results", [])
    query = state.get("inquiry_query", "")

    if not results:
        if _is_casual(query):
            msg = "你好！我是周末活动规划助手，可以帮你安排下午的游玩、用餐和休闲活动。想出去玩的话直接告诉我就好～"
        else:
            msg = f'抱歉，没有找到与"{query}"匹配的结果。可以试试其他关键词，或者让我帮您规划一个完整的周末行程。'
        memory.append_message(state["session_id"], "assistant", msg)
        return {
            "inquiry_results": [],
            "current_step": "done",
            "stage": "chatting",
            "messages": [{"role": "assistant", "content": msg}],
        }

    count = len(results)
    names = ", ".join(str(item.get("name", "")) for item in results[:5])
    if count > 5:
        names += f" 等{count}个"

    msg = f"为您找到 {count} 个匹配结果：{names}。是否要将其中某个添加到计划中？"

    memory.append_message(state["session_id"], "assistant", msg, metadata={"inquiry": True, "count": count})
    return {
        "inquiry_results": results,
        "current_step": "done",
        "stage": "chatting",
        "messages": [{"role": "assistant", "content": msg}],
    }
