"""方案编排节点：LLM + 规则降级，生成完整行程方案。"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from app.agent.constants import (
    DEFAULT_CHILD_AGE,
    DEFAULT_MAX_DISTANCE,
    DEFAULT_PARTY_SIZE,
    DEFAULT_START_TIME,
    DINNER_TIME_EARLIEST,
    FAMILY_FAVORED_CUISINES,
)
from app.agent.nodes.helpers import (
    _build_coord_lookup,
    _build_day_retry_instruction,
    _emit_step,
    _ensure_day_labels,
    _enrich_items,
    _estimate_cost,
    _force_split_days,
    _get_xy,
    _make_plan_validator,
    _make_rule_title,
    _plan_item,
    _VALID_SCENARIOS,
    _VALID_TABLES,
)
from app.agent.state import AgentState
from app.agent.tools import (
    _check_availability,
    _extract_named_locations,
    add_minutes,
    search_local_candidates,
)
from app.api import calc_distance_between, estimate_travel_time
from app.config.llm_config import get_llm_settings
from app.llm.prompts import format_compose_prompt
from app.llm.provider import create_chat_model
from app.llm.schemas import PlanOutput
from app.llm.structured import invoke_structured
from app.models.schemas import AgentPlan


def compose_plan_node(state: AgentState) -> dict[str, Any]:
    settings = get_llm_settings()
    if not settings.use_llm_for_plan:
        return _compose_plan_rule_based(state)
    try:
        return _compose_plan_with_llm(state)
    except Exception as e:
        logger.warning("LLM plan composition failed: %s, falling back to rule-based", e)
        return _compose_plan_rule_based(state)


def _compose_plan_with_llm(state: AgentState) -> dict[str, Any]:
    candidates = dict(state.get("candidates", {}))
    constraints = state.get("constraints", {})
    day_count = constraints.get("day_count", 1)
    user_input = state.get("user_input", "")
    # 确保用户输入中提及的具体地点在候选列表中
    _named = _extract_named_locations(user_input)
    for loc in _named:
        cat = loc["category"]
        existing_ids = {item.get("id") for item in candidates.get(cat, [])}
        if loc["id"] not in existing_ids:
            loc["available"] = _check_availability(loc)
            candidates.setdefault(cat, []).append(loc)
    coord_lookup = _build_coord_lookup(candidates)

    _compose_model = create_chat_model(max_tokens=4096)

    def _invoke(extra_instruction: str = "") -> AgentPlan:
        sp, up = format_compose_prompt(
            scenario=state.get("scenario") or "other",
            intent=state.get("intent"),
            constraints=constraints,
            candidates=candidates,
            user_input=user_input,
            feedback_text=state.get("feedback_text", ""),
            exceptions=state.get("exceptions"),
            warnings=state.get("warnings"),
            revision_count=state.get("revision_count", 0),
            day_count=day_count,
        )
        if extra_instruction:
            up = up + "\n\n" + extra_instruction
        _emit_step("正在调用 Agent 编排行程方案...")
        plan_output: PlanOutput = invoke_structured(
            system_prompt=sp,
            user_prompt=up,
            output_schema=PlanOutput,
            model=_compose_model,
            validate=_make_plan_validator(candidates, day_count),
            node="compose_plan",
        )
        return AgentPlan(
            title=plan_output.title,
            description=plan_output.description,
            scenario=plan_output.scenario,
            travel_type=plan_output.travel_type,
            total_cost=plan_output.total_cost,
            items=_enrich_items(plan_output.items, coord_lookup),
        )

    _emit_step("正在分析约束条件与候选地点...")
    plan = _invoke()

    # ── ReAct 校验：day_num 分布是否满足 day_count ──
    _emit_step("正在验证方案结构与天数...")
    actual_days = sorted(set(it.day_num for it in plan.items))
    if day_count > 1 and len(actual_days) < day_count:
        logger.info("[ReAct-Compose] multi-day validation failed: expected %d days, got %s, retrying", day_count, actual_days)
        _emit_step("正在修正多日拆分方案...")
        retry_instruction = _build_day_retry_instruction(user_input, day_count)
        try:
            plan = _invoke(retry_instruction)
            actual_days = sorted(set(it.day_num for it in plan.items))
            if len(actual_days) < day_count:
                logger.info("[ReAct-Compose] retry still failed, falling back to rule-based split")
                plan = _force_split_days(plan, day_count, user_input)
        except Exception:
            logger.info("[ReAct-Compose] retry exception, falling back to rule-based split")
            plan = _force_split_days(plan, day_count, user_input)

    _emit_step("正在整理最终方案...")
    plan = _ensure_day_labels(plan, user_input)

    # ── 结构补全：确保有关键类别项（dining/play）──
    plan_scenario = state.get("scenario") or "other"
    plan = _ensure_critical_items(plan, candidates, constraints, plan_scenario)

    return {
        "plan": plan,
        "current_step": "persist",
        "messages": [{"role": "assistant", "content": plan.description}],
    }


def _compose_plan_rule_based(state: AgentState) -> dict[str, Any]:
    scenario = state.get("scenario") or "other"
    constraints = state.get("constraints", {})
    candidates = state.get("candidates", {})
    start = constraints.get("start_time", DEFAULT_START_TIME)
    day_count = constraints.get("day_count", 1)
    user_input = state.get("user_input", "")

    feedback_constraints = state.get("feedback_constraints", {})
    if feedback_constraints:
        constraints = {**constraints, **feedback_constraints}

    if scenario == "friends":
        plan = _compose_scenario_plan(candidates, start, constraints, "friends")
    elif scenario == "family":
        plan = _compose_scenario_plan(candidates, start, constraints, "family")
    else:
        plan = _compose_scenario_plan(candidates, start, constraints, "other")

    if day_count > 1:
        plan = _force_split_days(plan, day_count, user_input)
    plan = _ensure_day_labels(plan, user_input)
    plan = _ensure_critical_items(plan, candidates, constraints, scenario)

    return {
        "plan": plan,
        "current_step": "persist",
        "messages": [{"role": "assistant", "content": plan.description}],
    }


# ═══════════════════════════════════════════════════════════════
# 结构补全：确保方案始终包含关键类别（确定性修复，不依赖 LLM）
# ═══════════════════════════════════════════════════════════════

_SCENARIO_PLAY_CATEGORIES: dict[str, list[str]] = {
    "family": ["amusement_park", "scenic_spot"],
    "friends": ["exhibition_hall", "scenic_spot"],
    "couple": ["scenic_spot", "exhibition_hall"],
    "solo": ["scenic_spot", "exhibition_hall", "amusement_park"],
    "other": ["amusement_park", "scenic_spot", "exhibition_hall"],
}


def _ensure_critical_items(
    plan: AgentPlan,
    candidates: dict[str, list[dict[str, Any]]],
    constraints: dict[str, Any],
    scenario: str = "other",
) -> AgentPlan:
    """确保方案包含至少 1 个 dining 和 1 个 play 项。

    仅当 LLM 产出缺失时才补齐,已有则不做修改。
    每次触发安全网时记录 WARNING 日志 + 缺失详情，用于追踪 LLM 产出质量。
    """
    items = list(plan.items)
    has_dining = any(it.activity_type == "dining" for it in items)
    has_play = any(it.activity_type == "play" for it in items)

    if has_dining and has_play:
        return plan  # 结构完整，无需修改

    logger.warning(
        "[Compose-SafetyNet] triggered: scenario=%s, has_dining=%s, has_play=%s, "
        "item_count=%d, plan_title=%r, candidates_keys=%s",
        scenario, has_dining, has_play, len(items),
        plan.title, list(candidates.keys()),
    )
    from app.agent.metrics import log_safety_net
    missing = []
    if not has_dining:
        missing.append("dining")
    if not has_play:
        missing.append("play")
    log_safety_net("compose_missing_critical", f"missing={','.join(missing)} scenario={scenario}")

    start_time = constraints.get("start_time", DEFAULT_START_TIME)
    # 找到当前最后一项的时间作为插入点
    last_item = items[-1] if items else None
    cursor = last_item.leave_time if last_item else start_time
    next_order = len(items) + 1

    # 补充 dining
    if not has_dining:
        restaurants = [it for it in candidates.get("restaurant", []) if it.get("available", True)]
        if restaurants:
            r = restaurants[0]
            rx, ry = _get_xy(r)
            # 从最后一个地点计算到达时间
            prev_x, prev_y = (last_item.location_x, last_item.location_y) if last_item else (0, 0)
            travel = estimate_travel_time(calc_distance_between(prev_x, prev_y, rx, ry), "walking")
            arrive = add_minutes(cursor, travel)
            dinner_time = arrive if arrive >= DINNER_TIME_EARLIEST else DINNER_TIME_EARLIEST
            items.append(_plan_item(
                next_order, "dining", "restaurant", r, dinner_time, 90,
                "晚餐推荐（自动补齐）", "walking",
            ))
            next_order += 1
            cursor = add_minutes(dinner_time, 90)
            last_item = items[-1]
            logger.info("[Compose-SafetyNet] added missing dining: %s", r.get("name"))

    # 补充 play
    if not has_play:
        play_cats = _SCENARIO_PLAY_CATEGORIES.get(scenario, _SCENARIO_PLAY_CATEGORIES["other"])
        activity = None
        activity_table = None
        for cat in play_cats:
            pool = [it for it in candidates.get(cat, []) if it.get("available", True)]
            if pool:
                activity = pool[0]
                activity_table = cat
                break
        if activity and activity_table:
            ax, ay = _get_xy(activity)
            prev_x, prev_y = (last_item.location_x, last_item.location_y) if last_item else (0, 0)
            travel = estimate_travel_time(calc_distance_between(prev_x, prev_y, ax, ay), "walking")
            arrive = add_minutes(cursor, travel)
            items.append(_plan_item(
                next_order, "play", activity_table, activity, arrive, 90,
                "活动推荐（自动补齐）", "walking",
            ))
            logger.info("[Compose-SafetyNet] added missing play: %s", activity.get("name"))

    # 重算总费用并重新编号
    for i, it in enumerate(items):
        it.step_order = i + 1
    total_cost = sum(it.estimated_cost for it in items)

    return plan.model_copy(update={
        "items": items,
        "total_cost": total_cost,
    })


# ═══════════════════════════════════════════════════════════════
# 规则编排函数（统一入口 + 场景配置驱动）
# ═══════════════════════════════════════════════════════════════

# 场景配置：将三个场景的差异提取为数据驱动
_SCENARIO_CONFIG: dict[str, dict[str, Any]] = {
    "family": {
        "activity_categories": ["amusement_park", "scenic_spot"],
        "restaurant_picker": lambda restaurants, constraints: _pick_family_restaurant(restaurants, constraints),
        "activity_stay": 100,
        "mall_stay": 50,
        "restaurant_stay": 90,
        "activity_remark": "亲子友好，下午主活动。",
        "mall_remark": "餐前缓冲休息。",
        "restaurant_remark": "儿童友好，适合家庭用餐。",
        "description": "按亲子友好、离家不远来安排，已包含活动、缓冲和晚餐。",
        "scenario": "family",
        "travel_type": "亲子",
    },
    "friends": {
        "activity_categories": ["exhibition_hall", "scenic_spot"],
        "restaurant_picker": None,  # 用默认取第一项
        "activity_stay": 90,
        "mall_stay": 50,
        "restaurant_stay": 100,
        "activity_remark": "适合朋友聊天拍照。",
        "mall_remark": "预留自由逛街时间。",
        "restaurant_remark": "适合聚餐聊天。",
        "description": "按朋友聚会、拍照聊天、聚餐可执行来安排。",
        "scenario": "friends",
        "travel_type": "美食",
    },
    "other": {
        "activity_categories": ["amusement_park", "scenic_spot", "exhibition_hall"],
        "restaurant_picker": None,
        "activity_stay": 90,
        "mall_stay": 50,
        "restaurant_stay": 90,
        "activity_remark": "下午主活动。",
        "mall_remark": "自由逛街。",
        "restaurant_remark": "晚餐推荐。",
        "description": "根据需求自动编排，已包含游玩、购物和用餐。",
        "scenario": "other",
        "travel_type": "休闲",
    },
}


def _compose_scenario_plan(
    candidates: dict[str, list[dict[str, Any]]],
    start: str,
    constraints: dict[str, Any],
    scenario: str,
) -> AgentPlan:
    """统一的规则编排引擎 — 场景差异由 _SCENARIO_CONFIG 驱动。"""
    cfg = _SCENARIO_CONFIG.get(scenario, _SCENARIO_CONFIG["other"])

    # 选择活动候选（按优先级顺序）
    activity = None
    activity_table = None
    for cat in cfg["activity_categories"]:
        pool = candidates.get(cat) or []
        if pool:
            activity = pool[0]
            activity_table = cat
            break

    mall = (candidates.get("mall") or [None])[0]

    # 餐厅：支持自定义选择器或默认取第一项
    picker = cfg.get("restaurant_picker")
    if picker:
        restaurant = picker(candidates.get("restaurant") or [], constraints)
    else:
        restaurant = (candidates.get("restaurant") or [None])[0]

    items: list = []
    cursor = start
    prev_x, prev_y = 0, 0

    # 活动
    if activity:
        ax, ay = _get_xy(activity)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, ax, ay), "walking")
        arrive = add_minutes(cursor, travel_min)
        stay = cfg["activity_stay"]
        items.append(_plan_item(1, "play", activity_table, activity, arrive, stay, cfg["activity_remark"]))
        cursor = add_minutes(arrive, stay)
        prev_x, prev_y = ax, ay

    # 商场缓冲
    if mall:
        mx, my = _get_xy(mall)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, mx, my), "walking")
        arrive = add_minutes(cursor, travel_min)
        stay = cfg["mall_stay"]
        items.append(_plan_item(len(items) + 1, "extra", "mall", mall, arrive, stay, cfg["mall_remark"], "walking"))
        cursor = add_minutes(arrive, stay)
        prev_x, prev_y = mx, my

    # 晚餐
    dinner_time = cursor if cursor >= DINNER_TIME_EARLIEST else DINNER_TIME_EARLIEST
    if restaurant:
        rx, ry = _get_xy(restaurant)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, rx, ry), "walking")
        arrive = dinner_time if dinner_time > add_minutes(cursor, travel_min) else add_minutes(cursor, travel_min)
        stay = cfg["restaurant_stay"]
        items.append(_plan_item(len(items) + 1, "dining", "restaurant", restaurant, arrive, stay,
                                cfg["restaurant_remark"], "walking"))

    total_cost = sum(item.estimated_cost for item in items)
    day_count = constraints.get("day_count", 1)
    title = _make_rule_title(items, day_count)
    return AgentPlan(
        title=title,
        description=cfg["description"],
        scenario=cfg["scenario"],
        travel_type=cfg["travel_type"],
        total_cost=total_cost,
        items=items,
    )


# 向后兼容的薄包装
def _compose_family_plan(
    candidates: dict[str, list[dict[str, Any]]],
    start: str,
    constraints: dict[str, Any],
) -> AgentPlan:
    return _compose_scenario_plan(candidates, start, constraints, "family")


def _compose_friends_plan(candidates: dict[str, list[dict[str, Any]]], start: str) -> AgentPlan:
    return _compose_scenario_plan(candidates, start, {}, "friends")


def _compose_generic_plan(
    candidates: dict[str, list[dict[str, Any]]],
    start: str,
    constraints: dict[str, Any],
) -> AgentPlan:
    return _compose_scenario_plan(candidates, start, constraints, "other")


def _pick_family_restaurant(restaurants: list[dict[str, Any]], constraints: dict[str, Any]) -> dict[str, Any] | None:
    if not restaurants:
        return None
    if "diet" not in constraints.get("requirements", []):
        return restaurants[0]
    preferred_types = FAMILY_FAVORED_CUISINES
    for restaurant in restaurants:
        if restaurant.get("cuisine_type") in preferred_types:
            return restaurant
    return restaurants[0]
