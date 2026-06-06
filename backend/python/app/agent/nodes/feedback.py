"""用户反馈解析节点：LLM + 规则降级，解析用户对方案的修改意见。"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from app.agent.nodes.helpers import _ALLOWED_CONSTRAINT_KEYS, _VALID_CATEGORIES
from app.agent.constants import (
    CATEGORY_LABEL_MAP,
    CHEAPER_KEYWORDS,
    CUISINE_KEYWORDS,
    EARLIER_KEYWORDS,
    FARTHER_KEYWORDS,
    LATER_KEYWORDS,
    NEARER_KEYWORDS,
    QUEUE_KEYWORDS,
    REMOVE_KEYWORDS,
)
from app.agent.semantic import get_matcher
from app.agent.state import AgentState
from app.config.llm_config import get_llm_settings
from app.llm.prompts import format_feedback_prompt
from app.llm.schemas import FeedbackAnalysisOutput
from app.llm.structured import invoke_structured


def analyze_feedback_node(state: AgentState) -> dict[str, Any]:
    user_input = state["user_input"]
    existing_plan_id = state.get("existing_plan_id")

    auto_execute = state.get("auto_execute", False)

    plan_summary = "（当前方案）"
    plan = state.get("plan")
    if plan:
        items_desc = "; ".join(
            f"{item.location_name}({item.arrive_time}-{item.leave_time})"
            for item in plan.items
        )
        plan_summary = f"标题：{plan.title}。行程：{items_desc}"

    settings = get_llm_settings()
    if settings.use_llm_for_intent:
        try:
            system, user = format_feedback_prompt(
                user_input=user_input,
                plan_summary=plan_summary,
                history=state.get("session_messages", []),
            )
            result: FeedbackAnalysisOutput = invoke_structured(
                system, user, FeedbackAnalysisOutput,
                validate=_validate_feedback_output,
                node="analyze_feedback",
            )
            plan_scenario = plan.scenario if plan and plan.scenario else None
            return {
                "feedback_text": result.change_summary,
                "needs_research": result.needs_new_search,
                "replaced_items": result.replaced_categories,
                "feedback_constraints": result.additional_constraints,
                "revision_count": state.get("revision_count", 0) + 1,
                "auto_execute": auto_execute,
                "current_step": "search" if result.needs_new_search else "compose",
                "scenario": plan_scenario or state.get("scenario") or "other",
            }
        except Exception as e:
            logger.warning("LLM feedback analysis failed, falling back to rule-based: %s: %s", type(e).__name__, e)

    # 尝试从已有方案获取场景（feedback 跳过 analyze_goal，scenario 不会自动设置）
    plan_scenario = plan.scenario if plan and plan.scenario else None
    needs_research, replaced, new_constraints = _parse_feedback_rule_based(user_input)
    result: dict[str, Any] = {
        "feedback_text": user_input,
        "needs_research": needs_research,
        "replaced_items": replaced,
        "feedback_constraints": new_constraints,
        "revision_count": state.get("revision_count", 0) + 1,
        "auto_execute": auto_execute,
        "current_step": "search" if needs_research else "compose",
    }
    if plan_scenario:
        result["scenario"] = plan_scenario
    return result


def _parse_feedback_rule_based(user_input: str) -> tuple[bool, list[str], dict]:
    """规则降级：解析用户反馈（关键词 + 语义匹配）。"""
    needs_research = False
    replaced: list[str] = []
    constraints: dict[str, Any] = {}

    _in = lambda kws, sem: any(kw in user_input for kw in kws) or get_matcher().is_match(user_input, sem, 0.2)  # noqa: E731

    if _in(QUEUE_KEYWORDS, "feedback"):
        constraints["no_queue"] = True
        replaced.append("restaurant")
        needs_research = True
    if _in(FARTHER_KEYWORDS, "feedback"):
        constraints["max_distance"] = 8000
        needs_research = True
    elif _in(NEARER_KEYWORDS, "feedback"):
        constraints["max_distance"] = 1000
        needs_research = True
    if _in(CHEAPER_KEYWORDS, "feedback"):
        constraints["budget"] = "low"
        needs_research = True
    if _in(EARLIER_KEYWORDS, "feedback"):
        constraints["time_shift"] = -1
    elif _in(LATER_KEYWORDS, "feedback"):
        constraints["time_shift"] = 1
    for cuisine in CUISINE_KEYWORDS:
        if cuisine in user_input:
            constraints["cuisine_type"] = cuisine
            replaced.append("restaurant")
            needs_research = True
            break
    # 菜系语义兜底：关键词没命中但语义上提到了菜系
    if not constraints.get("cuisine_type") and get_matcher().is_match(user_input, "cuisine", 0.25):
        needs_research = True
        replaced.append("restaurant")

    if _in(REMOVE_KEYWORDS, "feedback"):
        needs_research = True
        for label, key in CATEGORY_LABEL_MAP.items():
            if label in user_input:
                replaced.append(key)

    return needs_research, replaced, constraints


def _validate_feedback_output(obj: FeedbackAnalysisOutput) -> list[str]:
    """校验反馈解析输出。"""
    errors: list[str] = []
    for cat in obj.replaced_categories:
        if cat not in _VALID_CATEGORIES:
            errors.append(f"replaced_categories 含无效类别 '{cat}'，有效值: {_VALID_CATEGORIES}")
    for key in obj.additional_constraints:
        if key not in _ALLOWED_CONSTRAINT_KEYS:
            errors.append(f"additional_constraints 含无效键 '{key}'，白名单: {_ALLOWED_CONSTRAINT_KEYS}")
    if "max_distance" in obj.additional_constraints:
        v = obj.additional_constraints["max_distance"]
        if not isinstance(v, (int, float)) or v < 100 or v > 50000:
            errors.append(f"max_distance {v} 不在 100-50000 范围内")
    if "cuisine_type" in obj.additional_constraints:
        if not isinstance(obj.additional_constraints["cuisine_type"], str):
            errors.append("cuisine_type 必须是字符串")
    return errors
