"""异常检测与搜索自愈节点。"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from app.agent import memory
from app.agent.constants import DEFAULT_MAX_DISTANCE, MAX_SEARCH_RETRIES
from app.agent.nodes.helpers import _emit_step
from app.agent.state import AgentState
from app.agent.tools import (
    _category_label,
    _get_needed_categories,
    _is_fully_booked,
)


def detect_exceptions_node(state: AgentState) -> dict[str, Any]:
    candidates = state.get("candidates", {})
    scenario = state.get("scenario", "family")
    exceptions: list[dict[str, Any]] = []
    warnings: list[str] = []

    needed = _get_needed_categories(scenario)
    for category in needed:
        items = candidates.get(category, [])
        if not items:
            exceptions.append({
                "type": "no_candidates",
                "category": category,
                "detail": f"目前数据库中没有符合条件的{_category_label(category)}",
                "severity": "error",
            })
            continue

        for item in items[:3]:
            if _is_fully_booked(item):
                exceptions.append({
                    "type": "fully_booked",
                    "category": category,
                    "location_name": item["name"],
                    "detail": f"{item['name']}今日预约已满",
                    "severity": "error",
                })

    critical_gaps = False
    if not candidates.get("restaurant"):
        critical_gaps = True
    elif scenario == "family":
        if not candidates.get("amusement_park") and not candidates.get("scenic_spot"):
            critical_gaps = True
    elif scenario == "friends":
        if not candidates.get("exhibition_hall") and not candidates.get("scenic_spot"):
            critical_gaps = True

    return {
        "exceptions": exceptions,
        "warnings": warnings,
        "critical_gaps": critical_gaps,
        "search_attempt": state.get("search_attempt", 0),
        "current_step": "compose",
    }


def adjust_search_node(state: AgentState) -> dict[str, Any]:
    """分析 gap，放宽距离约束 50%，增加 search_attempt。不调 LLM。"""
    constraints = dict(state.get("constraints", {}))
    old_distance = constraints.get("max_distance", DEFAULT_MAX_DISTANCE)
    new_distance = int(old_distance * 1.5)
    constraints["max_distance"] = new_distance
    attempt = state.get("search_attempt", 0) + 1
    logger.info("[ReAct-Search] retry #%d: distance %dm → %dm", attempt, old_distance, new_distance)

    return {
        "constraints": constraints,
        "search_attempt": attempt,
        "exceptions": state.get("exceptions", []) + [{
            "type": "search_retry",
            "category": "",
            "detail": f"第{attempt}次放宽搜索：距离 {old_distance}m → {new_distance}m",
            "severity": "info",
        }],
        "current_step": "search_candidates",
        "messages": [{"role": "assistant", "content": f"候选不足，已扩大搜索范围（{old_distance}m → {new_distance}m）重新查找..."}],
    }


def gap_report_node(state: AgentState) -> dict[str, Any]:
    """候选地点存在关键缺口，告知用户并引导其调整需求。"""
    candidates = state.get("candidates", {})
    exceptions = state.get("exceptions", [])
    constraints = state.get("constraints", {})
    scenario = state.get("scenario", "other")

    missing: list[str] = []
    if not candidates.get("restaurant"):
        cuisine = constraints.get("cuisine_type", "")
        if cuisine:
            missing.append(f"{cuisine}类餐厅")
        else:
            missing.append("餐厅")
    if scenario == "family" and not candidates.get("amusement_park") and not candidates.get("scenic_spot"):
        missing.append("亲子游乐/景点")
    if scenario == "friends" and not candidates.get("exhibition_hall") and not candidates.get("scenic_spot"):
        missing.append("展馆/景点")

    if missing:
        msg = (
            f"抱歉，当前数据库中暂时没有符合条件的{'、'.join(missing)}。\n\n"
            f"建议你调整一下需求，比如：\n"
            f"- 换个菜系（中餐、日料、烧烤等）\n"
            f"- 放宽距离限制\n"
            f"- 换一种活动类型\n\n"
            f"请告诉我你想怎么调整？"
        )
    else:
        msg = "当前候选不足以生成完整方案，请尝试调整你的需求（比如放宽距离、换一种活动类型）。"

    memory.append_message(state["session_id"], "assistant", msg)
    return {
        "current_step": "done",
        "stage": "chatting",
        "messages": [{"role": "assistant", "content": msg}],
    }
