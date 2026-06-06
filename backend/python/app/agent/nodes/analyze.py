"""意图解析节点：LLM + 规则降级，提取场景/约束/同行人。"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from app.agent.nodes.helpers import (
    _VALID_LOCATION_PREFS,
    _VALID_SCENARIOS,
    _detect_scenario,
    _emit_step,
    _extract_constraints,
    _sanitize_companion,
)
from app.agent.state import AgentState
from app.config.llm_config import get_llm_settings
from app.llm.prompts import format_analyze_prompt
from app.llm.schemas import IntentAnalysisOutput
from app.llm.structured import invoke_structured
from app.models.schemas import UserIntent


def analyze_goal_node(state: AgentState) -> dict[str, Any]:
    settings = get_llm_settings()
    if not settings.use_llm_for_intent:
        return _analyze_goal_rule_based(state)
    try:
        return _analyze_goal_with_llm(state)
    except Exception as e:
        logger.warning("LLM intent analysis failed: %s, falling back to rule-based", e)
        return _analyze_goal_rule_based(state)


def _analyze_goal_with_llm(state: AgentState) -> dict[str, Any]:
    system_prompt, user_prompt = format_analyze_prompt(
        user_input=state["user_input"],
        history=state.get("session_messages", []),
    )
    _emit_step("正在调用 Agent 解析出行需求（场景/同行人/天数/偏好）...")
    result: IntentAnalysisOutput = invoke_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        output_schema=IntentAnalysisOutput,
        validate=_validate_intent_output,
        node="analyze_goal",
    )
    companion = _sanitize_companion(result.companion)
    intent = UserIntent(
        raw_input=state["user_input"],
        time_slot=result.time_slot,
        companion=companion,
        location_preference=result.location_preference,
        budget_hint=result.budget_hint,
        special_requirements=result.special_requirements,
    )
    constraints = {
        "start_time": result.start_time,
        "nearby": result.location_preference == "nearby",
        "max_distance": result.max_distance,
        "duration_hours": result.duration_hours,
        "day_count": result.day_count,
        "party_size": result.party_size,
        "child_age": result.child_age,
        "requirements": result.special_requirements,
        "cuisine_type": result.cuisine_type,
    }
    return {
        "intent": intent,
        "scenario": result.scenario,
        "constraints": constraints,
        "current_step": "search",
        "messages": [{"role": "assistant", "content": f"已理解需求：{companion}，{result.time_slot}，{result.scenario}场景。"}],
    }


def _analyze_goal_rule_based(state: AgentState) -> dict[str, Any]:
    text = state["user_input"]
    scenario = _detect_scenario(text, state.get("session_messages", []))
    constraints = _extract_constraints(text, scenario)
    intent = UserIntent(
        raw_input=text,
        time_slot=constraints["start_time"],
        companion="老婆和孩子" if scenario == "family" else "朋友" if scenario == "friends" else "",
        location_preference="nearby" if constraints["nearby"] else "any",
        budget_hint="",
        special_requirements=constraints["requirements"],
    )
    return {
        "intent": intent,
        "scenario": scenario,
        "constraints": constraints,
        "current_step": "search",
        "messages": [{"role": "assistant", "content": "已理解需求，开始查找附近可执行的活动和餐厅。"}],
    }


def _validate_intent_output(obj: IntentAnalysisOutput) -> list[str]:
    """校验意图解析输出。"""
    errors: list[str] = []
    if obj.scenario not in _VALID_SCENARIOS:
        errors.append(f"scenario '{obj.scenario}' 无效，应为 {_VALID_SCENARIOS} 之一")
    from app.agent.nodes.helpers import _TIME_RE
    if not _TIME_RE.match(obj.start_time):
        errors.append(f"start_time '{obj.start_time}' 格式无效，应为 HH:MM")
    if not 1 <= obj.duration_hours <= 12:
        errors.append(f"duration_hours {obj.duration_hours} 不在 1-12 范围内")
    from app.agent.constants import MAX_DISTANCE, MIN_DISTANCE
    if not MIN_DISTANCE <= obj.max_distance <= MAX_DISTANCE:
        errors.append(f"max_distance {obj.max_distance} 不在 {MIN_DISTANCE}-{MAX_DISTANCE} 范围内")
    if obj.location_preference not in _VALID_LOCATION_PREFS:
        errors.append(f"location_preference '{obj.location_preference}' 无效")
    if obj.party_size < 1:
        errors.append(f"party_size {obj.party_size} 必须 >= 1")
    return errors
