"""Planning nodes for the LeisureAgent LangGraph workflow."""

from __future__ import annotations

from typing import Any

from app.agent import memory
from app.agent.state import AgentState
from app.agent.tools import (
    add_minutes,
    build_share_text,
    persist_agent_plan,
    search_local_candidates,
)
from app.config.llm_config import get_llm_settings
from app.llm.prompts import format_analyze_prompt, format_compose_prompt
from app.llm.schemas import IntentAnalysisOutput, PlanOutput
from app.llm.structured import invoke_structured
from app.models.schemas import AgentPlan, AgentPlanItem, UserIntent


def load_session_node(state: AgentState) -> dict[str, Any]:
    session_id = memory.ensure_session(state.get("session_id", 0) or None, state["user_input"])
    history = memory.load_messages(session_id)
    memory.append_message(session_id, "user", state["user_input"])
    return {
        "session_id": session_id,
        "session_messages": history,
        "current_step": "analyze",
    }


def analyze_goal_node(state: AgentState) -> dict[str, Any]:
    settings = get_llm_settings()
    if not settings.use_llm_for_intent:
        return _analyze_goal_rule_based(state)
    try:
        return _analyze_goal_with_llm(state)
    except Exception as e:
        print(f"LLM intent analysis failed: {e}, falling back to rule-based")
        return _analyze_goal_rule_based(state)


def _analyze_goal_with_llm(state: AgentState) -> dict[str, Any]:
    system_prompt, user_prompt = format_analyze_prompt(
        user_input=state["user_input"],
        history=state.get("session_messages", []),
    )
    result: IntentAnalysisOutput = invoke_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        output_schema=IntentAnalysisOutput,
    )
    intent = UserIntent(
        raw_input=state["user_input"],
        time_slot=result.time_slot,
        companion=result.companion,
        location_preference=result.location_preference,
        budget_hint=result.budget_hint,
        special_requirements=result.special_requirements,
    )
    constraints = {
        "start_time": result.start_time,
        "nearby": result.location_preference == "nearby",
        "max_distance": result.max_distance,
        "duration_hours": result.duration_hours,
        "party_size": result.party_size,
        "child_age": result.child_age,
        "requirements": result.special_requirements,
    }
    return {
        "intent": intent,
        "scenario": result.scenario,
        "constraints": constraints,
        "current_step": "search",
        "messages": [{"role": "assistant", "content": f"已理解需求：{result.companion}，{result.time_slot}，{result.scenario}场景。"}],
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


def search_candidates_node(state: AgentState) -> dict[str, Any]:
    candidates = search_local_candidates(state["scenario"], state["constraints"])
    tool_result = {
        "tool": "search_local_candidates",
        "counts": {key: len(value) for key, value in candidates.items()},
    }
    return {
        "candidates": candidates,
        "tool_results": [tool_result],
        "current_step": "plan",
        "messages": [{"role": "assistant", "content": f"已找到候选地点：{tool_result['counts']}"}],
    }


def compose_plan_node(state: AgentState) -> dict[str, Any]:
    settings = get_llm_settings()
    if not settings.use_llm_for_plan:
        return _compose_plan_rule_based(state)
    try:
        return _compose_plan_with_llm(state)
    except Exception as e:
        print(f"LLM plan composition failed: {e}, falling back to rule-based")
        return _compose_plan_rule_based(state)


def _compose_plan_with_llm(state: AgentState) -> dict[str, Any]:
    system_prompt, user_prompt = format_compose_prompt(
        scenario=state["scenario"],
        intent=state.get("intent"),
        constraints=state["constraints"],
        candidates=state["candidates"],
    )
    plan_output: PlanOutput = invoke_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        output_schema=PlanOutput,
    )
    plan = AgentPlan(
        title=plan_output.title,
        description=plan_output.description,
        scenario=plan_output.scenario,
        travel_type=plan_output.travel_type,
        total_cost=plan_output.total_cost,
        items=[AgentPlanItem(**item.model_dump()) for item in plan_output.items],
    )
    return {
        "plan": plan,
        "current_step": "persist",
        "messages": [{"role": "assistant", "content": plan.description}],
    }


def _compose_plan_rule_based(state: AgentState) -> dict[str, Any]:
    scenario = state["scenario"]
    constraints = state["constraints"]
    candidates = state["candidates"]
    start = constraints["start_time"]

    if scenario == "friends":
        plan = _compose_friends_plan(candidates, start)
    else:
        plan = _compose_family_plan(candidates, start, constraints)

    return {
        "plan": plan,
        "current_step": "persist",
        "messages": [{"role": "assistant", "content": plan.description}],
    }


def persist_plan_node(state: AgentState) -> dict[str, Any]:
    plan = state.get("plan")
    if not plan:
        return {"error": "没有可保存的方案", "current_step": "error"}
    persisted = persist_agent_plan(state["session_id"], plan)
    memory.bind_plan(state["session_id"], persisted.id or 0)
    return {
        "plan": persisted,
        "plan_id": persisted.id,
        "current_step": "execute",
    }


def finalize_node(state: AgentState) -> dict[str, Any]:
    plan = state.get("plan")
    if not plan:
        return {"error": "没有生成方案", "current_step": "error"}

    share_text = build_share_text(plan)
    share_url = f"/api/agent/plans/{plan.id}/share" if plan.id else ""
    plan = plan.model_copy(update={"share_text": share_text, "share_url": share_url})
    memory.append_message(
        state["session_id"],
        "assistant",
        share_text,
        metadata={
            "plan_id": plan.id,
            "share_url": share_url,
        },
    )
    return {
        "plan": plan,
        "share_text": share_text,
        "share_url": share_url,
        "current_step": "done",
        "messages": [{"role": "assistant", "content": share_text}],
    }


def _detect_scenario(text: str, history: list[dict[str, Any]]) -> str:
    if any(keyword in text for keyword in ("老婆", "孩子", "娃", "亲子", "一家")):
        return "family"
    if any(keyword in text for keyword in ("朋友", "2男2女", "两男两女", "4个人", "四个人")):
        return "friends"
    for message in reversed(history):
        content = message.get("content", "")
        if any(keyword in content for keyword in ("老婆", "孩子", "娃", "亲子", "一家")):
            return "family"
        if any(keyword in content for keyword in ("朋友", "2男2女", "两男两女", "4个人", "四个人")):
            return "friends"
    return "family"


def _extract_constraints(text: str, scenario: str) -> dict[str, Any]:
    start_time = "14:00"
    if "晚上" in text:
        start_time = "17:00"
    elif "上午" in text:
        start_time = "10:00"

    requirements = []
    if "减肥" in text or "减脂" in text or "低卡" in text:
        requirements.append("diet")
    if "蛋糕" in text:
        requirements.append("cake")
    if "鲜花" in text:
        requirements.append("flower")

    return {
        "start_time": start_time,
        "nearby": any(keyword in text for keyword in ("近", "附近", "离家")),
        "max_distance": 2000 if any(keyword in text for keyword in ("近", "附近", "离家")) else 5000,
        "duration_hours": 5,
        "party_size": 4 if scenario == "friends" else 3,
        "child_age": 5 if scenario == "family" else None,
        "requirements": requirements,
    }


def _compose_family_plan(
    candidates: dict[str, list[dict[str, Any]]],
    start: str,
    constraints: dict[str, Any],
) -> AgentPlan:
    amusement = (candidates.get("amusement_park") or candidates.get("scenic_spot") or [])[0]
    mall = (candidates.get("mall") or [None])[0]
    restaurant = _pick_family_restaurant(candidates.get("restaurant") or [], constraints)

    items = []
    cursor = start
    items.append(
        _plan_item(
            1,
            "play",
            "amusement_park" if amusement in candidates.get("amusement_park", []) else "scenic_spot",
            amusement,
            cursor,
            100,
            "亲子友好，适合 5 岁孩子，下午主活动不会太累。",
        )
    )
    cursor = add_minutes(cursor, 120)

    if mall:
        items.append(
            _plan_item(
                2,
                "extra",
                "mall",
                mall,
                cursor,
                50,
                "餐前在商场休息/逛一会儿，给孩子和家长留缓冲时间。",
            )
        )
        cursor = add_minutes(cursor, 60)

    dinner_time = cursor if cursor >= "17:30" else "17:30"
    items.append(
        _plan_item(
            len(items) + 1,
            "dining",
            "restaurant",
            restaurant,
            dinner_time,
            90,
            "优先兼顾儿童友好和减脂/清淡需求，适合家庭用餐。",
        )
    )

    total_cost = sum(item.estimated_cost for item in items)
    return AgentPlan(
        title="家庭亲子半日可执行方案",
        description="按亲子友好、离家不远、减脂餐饮来安排，已包含活动、餐前缓冲和晚餐。",
        scenario="family",
        travel_type="亲子",
        total_cost=total_cost,
        items=items,
    )


def _compose_friends_plan(candidates: dict[str, list[dict[str, Any]]], start: str) -> AgentPlan:
    exhibition = (candidates.get("exhibition_hall") or candidates.get("scenic_spot") or [])[0]
    mall = (candidates.get("mall") or [None])[0]
    restaurant = (candidates.get("restaurant") or [])[0]

    items = []
    cursor = start
    items.append(
        _plan_item(
            1,
            "play",
            "exhibition_hall" if exhibition in candidates.get("exhibition_hall", []) else "scenic_spot",
            exhibition,
            cursor,
            90,
            "适合 4 人朋友局，方便聊天拍照，活动强度适中。",
        )
    )
    cursor = add_minutes(cursor, 110)

    if mall:
        items.append(
            _plan_item(
                2,
                "extra",
                "mall",
                mall,
                cursor,
                50,
                "预留咖啡、拍照或自由逛街时间，方便大家同步偏好。",
            )
        )
        cursor = add_minutes(cursor, 60)

    dinner_time = cursor if cursor >= "17:30" else "17:30"
    items.append(
        _plan_item(
            len(items) + 1,
            "dining",
            "restaurant",
            restaurant,
            dinner_time,
            100,
            "适合 4 人聚餐聊天，优先选择可预约或可排队执行的餐厅。",
        )
    )

    total_cost = sum(item.estimated_cost for item in items)
    return AgentPlan(
        title="朋友半日聚会可执行方案",
        description="按 4 人朋友局、拍照聊天、聚餐可执行来安排，已包含活动、缓冲和晚餐。",
        scenario="friends",
        travel_type="美食",
        total_cost=total_cost,
        items=items,
    )


def _pick_family_restaurant(restaurants: list[dict[str, Any]], constraints: dict[str, Any]) -> dict[str, Any]:
    if not restaurants:
        raise ValueError("没有可用餐厅")
    if "diet" not in constraints.get("requirements", []):
        return restaurants[0]
    preferred_types = {"日料", "粤菜", "中餐", "西餐"}
    for restaurant in restaurants:
        if restaurant.get("cuisine_type") in preferred_types:
            return restaurant
    return restaurants[0]


def _plan_item(
    step_order: int,
    activity_type: str,
    table_name: str,
    location: dict[str, Any],
    arrive_time: str,
    stay_minute: int,
    remark: str,
) -> AgentPlanItem:
    leave_time = add_minutes(arrive_time, stay_minute)
    cost = _estimate_cost(table_name, location)
    return AgentPlanItem(
        step_order=step_order,
        activity_type=activity_type,
        location_table_name=table_name,
        location_id=location["id"],
        location_name=location["name"],
        address=location.get("address", ""),
        arrive_time=arrive_time,
        leave_time=leave_time,
        stay_minute=stay_minute,
        remark=remark,
        estimated_cost=cost,
    )


def _estimate_cost(table_name: str, location: dict[str, Any]) -> float:
    if table_name == "restaurant":
        cuisine = location.get("cuisine_type")
        per_person = {
            "火锅": 130,
            "烧烤": 110,
            "日料": 150,
            "西餐": 120,
            "粤菜": 120,
            "中餐": 100,
        }.get(cuisine, 90)
        return per_person * 4
    if table_name in {"amusement_park", "exhibition_hall"}:
        return float(location.get("ticket_price") or 0) * 4
    return 0
