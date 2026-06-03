"""Planning nodes for the LeisureAgent LangGraph workflow — ReAct + Plan&Execute 模式。

ReAct 循环: classify → search/compose → present → analyze_feedback → 循环
Plan&Execute: compose → persist → present(plan) → execute_bookings → finalize
"""

from __future__ import annotations

import re
from typing import Any

from app.agent import memory
from app.agent.input_guard import check_user_input
from app.agent.state import AgentState

try:
    from langgraph.config import get_stream_writer
except ImportError:
    get_stream_writer = None  # type: ignore[assignment]
from app.api import calc_distance_between, estimate_travel_time
from app.agent.tools import (
    _category_label,
    _check_availability,
    _get_needed_categories,
    _is_fully_booked,
    add_minutes,
    build_share_text,
    execute_plan_actions,
    persist_agent_plan,
    search_inquiry,
    search_local_candidates,
)
from app.config.llm_config import get_llm_settings
from app.llm.prompts import (
    format_analyze_prompt,
    format_classify_prompt,
    format_compose_prompt,
    format_feedback_prompt,
)
from app.llm.schemas import ClassifyOutput, FeedbackAnalysisOutput, IntentAnalysisOutput, PlanOutput
from app.llm.structured import invoke_structured
from app.models.schemas import AgentPlan, AgentPlanItem, UserIntent


# ═══════════════════════════════════════════════════════════════
# 1. load_session — 加载或创建会话
# ═══════════════════════════════════════════════════════════════

def load_session_node(state: AgentState) -> dict[str, Any]:
    user_input = state["user_input"]

    # ── 输入安全过滤 ──
    check = check_user_input(user_input)
    if check.blocked:
        return {
            "session_id": 0,
            "blocked": True,
            "block_reason": check.reason,
            "current_step": "direct_reply",
            "stage": "chatting",
            "direct_reply": f"抱歉，无法处理该请求。（{check.reason}）",
            "messages": [{"role": "assistant", "content": f"抱歉，无法处理该请求。（{check.reason}）"}],
        }

    # 使用清洗后的文本
    sanitized = check.sanitized
    _emit_step("正在创建/加载会话...")
    sid = state.get("session_id", 0)
    session_id = memory.ensure_session(sid if sid > 0 else None, sanitized)
    _emit_step("正在加载历史消息...")
    history = memory.load_messages(session_id)
    memory.append_message(session_id, "user", sanitized)

    # 检测会话是否已有 pending 方案
    stage = memory.get_stage(session_id)
    session = memory.get_session(session_id)
    existing_plan_id = session.get("travel_plan_id") if session else None

    revision_count = _count_revisions(history)

    return {
        "session_id": session_id,
        "session_messages": history,
        "existing_plan_id": existing_plan_id,
        "stage": stage,
        "revision_count": revision_count,
        "current_step": "classify_intent",
        "user_input": sanitized,
    }


# ═══════════════════════════════════════════════════════════════
# 2. classify_intent — ReAct 推理：判断用户意图类型
# ═══════════════════════════════════════════════════════════════

def classify_intent_node(state: AgentState) -> dict[str, Any]:
    user_input = state["user_input"]
    existing_plan_id = state.get("existing_plan_id")

    # auto_execute 仅来自前端显式开关，不做关键词自动检测
    auto_execute = state.get("auto_execute", False) and not existing_plan_id

    # 快速规则：有 pending 方案 + 明确确认词 → 直接执行
    confirm_keywords = ["确认", "可以", "好的", "执行", "预约", "就这样", "没问题", "行", "ok", "yes", "确定"]
    if any(kw in user_input.lower() for kw in confirm_keywords) and existing_plan_id:
        return {
            "intent_type": "confirm",
            "existing_plan_id": existing_plan_id,
            "direct_reply": "",
            "current_step": "execute_bookings",
        }

    # 快速规则：有 pending 方案 + 修改关键词 → 直接走 feedback
    if existing_plan_id:
        feedback_kw = ["换", "改", "不要", "不去", "去掉", "取消", "调整", "修改",
                       "便宜", "贵", "近", "远", "早", "晚", "排队", "再推荐"]
        if any(kw in user_input for kw in feedback_kw):
            return {
                "intent_type": "feedback",
                "existing_plan_id": existing_plan_id,
                "direct_reply": "",
                "is_relevant": True,
                "stage": "reviewing",
                "current_step": "analyze_feedback",
            }

    # 快速规则：工作日拒绝 —— 仅支持周末规划
    weekday_kw = ["周一", "周二", "周三", "周四", "周五",
                  "星期一", "星期二", "星期三", "星期四", "星期五",
                  "工作日"]
    weekend_kw = ["周六", "周日", "星期六", "星期日", "周末"]
    has_weekday = any(kw in user_input for kw in weekday_kw)
    has_weekend = any(kw in user_input for kw in weekend_kw)
    if has_weekday and not has_weekend:
        return {
            "intent_type": "casual",
            "direct_reply": "抱歉，LeisureAgent 目前仅支持周末（周六、周日）的活动规划。工作日请自行安排，或者把计划改到周末再来找我吧～",
            "stage": "chatting",
            "current_step": "direct_reply",
            "messages": [{"role": "assistant", "content": "抱歉，LeisureAgent 目前仅支持周末（周六、周日）的活动规划。工作日请自行安排，或者把计划改到周末再来找我吧～"}],
        }

    # LLM 一站式分类 + 直接回复
    settings = get_llm_settings()
    if settings.use_llm_for_intent:
        try:
            system, user = format_classify_prompt(
                user_input, bool(existing_plan_id),
                history=state.get("session_messages", []),
            )
            result: ClassifyOutput = invoke_structured(
                system, user, ClassifyOutput,
                validate=_validate_classify_output,
            )
            intent_type = result.intent_type
            direct_reply = result.direct_reply or ""

            # LLM 可能分类为 confirm —— 但需要 pending plan
            if intent_type == "confirm" and not existing_plan_id:
                intent_type = "new_plan"
            # LLM 可能分类为 feedback —— 但需要 pending plan
            if intent_type == "feedback" and not existing_plan_id:
                intent_type = "new_plan"

            return _build_classify_result(intent_type, direct_reply, existing_plan_id, auto_execute)
        except Exception:
            pass  # LLM 不可用时走规则降级

    # 规则降级
    return _classify_rule_based(user_input, existing_plan_id, auto_execute)


def _build_classify_result(
    intent_type: str, direct_reply: str, existing_plan_id: int | None,
    auto_execute: bool = False,
) -> dict[str, Any]:
    """根据分类结果构建返回字典。"""
    base: dict[str, Any] = {
        "intent_type": intent_type,
        "direct_reply": direct_reply,
        "is_relevant": True,
    }
    if intent_type in ("casual", "out_of_domain", "clarify"):
        return {
            **base,
            "stage": "chatting",
            "current_step": "direct_reply",
            "messages": [{"role": "assistant", "content": direct_reply}],
        }
    if intent_type == "inquiry":
        return {**base, "stage": "chatting", "current_step": "search_inquiry"}
    if intent_type == "confirm":
        return {**base, "existing_plan_id": existing_plan_id, "stage": "executed", "current_step": "execute_bookings"}
    if intent_type == "feedback":
        return {**base, "existing_plan_id": existing_plan_id, "stage": "reviewing", "current_step": "analyze_feedback"}
    # new_plan
    return {**base, "stage": "planning", "current_step": "analyze_goal", "auto_execute": auto_execute}


def _classify_rule_based(user_input: str, existing_plan_id: int | None,
                         auto_execute: bool = False) -> dict[str, Any]:
    """LLM 不可用时的规则降级分类。"""
    # 工作日拒绝
    weekday_kw = ["周一", "周二", "周三", "周四", "周五",
                  "星期一", "星期二", "星期三", "星期四", "星期五", "工作日"]
    weekend_kw = ["周六", "周日", "星期六", "星期日", "周末"]
    if any(kw in user_input for kw in weekday_kw) and not any(kw in user_input for kw in weekend_kw):
        return {
            "intent_type": "casual",
            "direct_reply": "抱歉，LeisureAgent 目前仅支持周末（周六、周日）的活动规划。工作日请自行安排，或者把计划改到周末再来找我吧～",
            "stage": "chatting",
            "current_step": "direct_reply",
            "messages": [{"role": "assistant", "content": "抱歉，LeisureAgent 目前仅支持周末（周六、周日）的活动规划。工作日请自行安排，或者把计划改到周末再来找我吧～"}],
        }

    confirm_keywords = ["确认", "可以", "好的", "执行", "预约", "就这样", "没问题", "行", "ok", "yes", "确定"]
    if any(kw in user_input.lower() for kw in confirm_keywords) and existing_plan_id:
        return {"intent_type": "confirm", "existing_plan_id": existing_plan_id, "direct_reply": "", "current_step": "execute_bookings"}

    if _is_casual(user_input):
        return {
            "intent_type": "casual",
            "direct_reply": "你好！我是周末活动规划助手，可以帮你搜索附近的餐厅、商场、景点、游乐园和展馆，也能帮你规划周末半日行程。想出去玩的话直接告诉我就好～",
            "stage": "chatting",
            "current_step": "direct_reply",
            "messages": [{"role": "assistant", "content": "你好！我是周末活动规划助手，可以帮你搜索附近的餐厅、商场、景点、游乐园和展馆，也能帮你规划周末半日行程。想出去玩的话直接告诉我就好～"}],
        }

    # 短领域词（如"家常菜""火锅"）→ 视为 inquiry
    if _is_domain_term(user_input):
        return {"intent_type": "inquiry", "direct_reply": "", "is_relevant": True, "stage": "chatting", "current_step": "search_inquiry"}

    if _is_inquiry(user_input) and not _is_new_plan_request(user_input):
        # 宽泛查询 → 反问缩小范围
        if _is_vague_inquiry(user_input):
            clarify_msg = _build_clarify_reply(user_input)
            return {
                "intent_type": "clarify",
                "direct_reply": clarify_msg,
                "stage": "chatting",
                "current_step": "direct_reply",
                "messages": [{"role": "assistant", "content": clarify_msg}],
            }
        return {"intent_type": "inquiry", "direct_reply": "", "is_relevant": True, "stage": "chatting", "current_step": "search_inquiry"}

    if existing_plan_id and not _is_new_plan_request(user_input):
        return {"intent_type": "feedback", "existing_plan_id": existing_plan_id, "direct_reply": "", "is_relevant": True, "stage": "reviewing", "current_step": "analyze_feedback"}

    return {"intent_type": "new_plan", "direct_reply": "", "is_relevant": True,
            "stage": "planning", "current_step": "analyze_goal", "auto_execute": auto_execute}



# ═══════════════════════════════════════════════════════════════
# 5. direct_reply — AI 直接回复（寒暄/out_of_domain），不走规划流程
# ═══════════════════════════════════════════════════════════════

def direct_reply_node(state: AgentState) -> dict[str, Any]:
    """处理 LLM 生成的直接回复（寒暄问候或 out_of_domain 拒绝）。"""
    msg = state.get("direct_reply", "")
    if msg:
        memory.append_message(state["session_id"], "assistant", msg)
    return {
        "current_step": "done",
        "stage": "chatting",
    }


# ═══════════════════════════════════════════════════════════════
# 6. analyze_goal — 意图解析
# ═══════════════════════════════════════════════════════════════

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
    _emit_step("正在调用 Agent 解析出行需求（场景/同行人/天数/偏好）...")
    result: IntentAnalysisOutput = invoke_structured(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        output_schema=IntentAnalysisOutput,
        validate=_validate_intent_output,
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


# ═══════════════════════════════════════════════════════════════
# 6. search_candidates — 搜索候选地点
# ═══════════════════════════════════════════════════════════════

def search_candidates_node(state: AgentState) -> dict[str, Any]:
    constraints = state.get("constraints", {})

    # 应用反馈约束
    feedback_constraints = state.get("feedback_constraints", {})
    if feedback_constraints:
        constraints = {**constraints, **feedback_constraints}

    # 从用户输入中提取菜系/类型偏好
    cuisine_keywords = ["火锅", "烧烤", "日料", "西餐", "粤菜", "中餐", "川菜", "湘菜",
                        "面食", "面", "粉", "素食", "海鲜", "自助", "小吃", "家常菜",
                        "饺子", "烤鸭", "拉面", "米线", "东南亚菜", "韩餐", "寿司"]
    user_input = state.get("user_input", "")
    existing_cuisine = constraints.get("cuisine_type")
    if not existing_cuisine:
        for ck in cuisine_keywords:
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


# ═══════════════════════════════════════════════════════════════
# 7. search_inquiry — 咨询模式精确搜索
# ═══════════════════════════════════════════════════════════════

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


# ═══════════════════════════════════════════════════════════════
# 8. present_inquiry — 咨询结果展示
# ═══════════════════════════════════════════════════════════════

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

    # 构建自然语言回复
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


# ═══════════════════════════════════════════════════════════════
# 9. detect_exceptions — 异常检测
# ═══════════════════════════════════════════════════════════════

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

        # 检查预约容量（只看 top 3）
        for item in items[:3]:
            if _is_fully_booked(item):
                exceptions.append({
                    "type": "fully_booked",
                    "category": category,
                    "location_name": item["name"],
                    "detail": f"{item['name']}今日预约已满",
                    "severity": "error",
                })

    # 判断 critical_gaps：关键类别缺失则触发搜索重试
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


# ═══════════════════════════════════════════════════════════════
# 9b. adjust_search — ReAct 搜索自愈：放宽约束重搜
# ═══════════════════════════════════════════════════════════════

def adjust_search_node(state: AgentState) -> dict[str, Any]:
    """分析 gap，放宽距离约束 50%，增加 search_attempt。不调 LLM。"""
    constraints = dict(state.get("constraints", {}))
    old_distance = constraints.get("max_distance", 5000)
    new_distance = int(old_distance * 1.5)
    constraints["max_distance"] = new_distance
    attempt = state.get("search_attempt", 0) + 1
    print(f"[ReAct-Search] 第{attempt}次重试：距离 {old_distance}m → {new_distance}m")

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


# ═══════════════════════════════════════════════════════════════
# 10. compose_plan — 方案编排（Plan&Execute 计划阶段）
# ═══════════════════════════════════════════════════════════════

def compose_plan_node(state: AgentState) -> dict[str, Any]:
    settings = get_llm_settings()
    if not settings.use_llm_for_plan:
        return _compose_plan_rule_based(state)
    try:
        return _compose_plan_with_llm(state)
    except Exception as e:
        print(f"LLM plan composition failed: {e}, falling back to rule-based")
        return _compose_plan_rule_based(state)


def _emit_step(label: str) -> None:
    """通过 LangGraph stream writer 发射子步骤事件（安全调用）。"""
    if get_stream_writer is None:
        return
    try:
        writer = get_stream_writer()
        writer(("step", label))
    except Exception:
        pass


def _build_coord_lookup(candidates: dict) -> dict[tuple[str, int], tuple[int, int]]:
    """构建 (table_name, location_id) → (x, y) 坐标查找表。"""
    lookup: dict[tuple[str, int], tuple[int, int]] = {}
    for table_name, items_list in candidates.items():
        for item in items_list:
            key = (table_name, item.get("id", 0))
            lookup[key] = (item.get("x", 0), item.get("y", 0))
    return lookup


def _enrich_items(items, coord_lookup: dict) -> list[AgentPlanItem]:
    """为 LLM 输出的 plan items 填充 location_x/location_y。"""
    result = []
    for item in items:
        data = item.model_dump() if hasattr(item, "model_dump") else item
        key = (data.get("location_table_name", ""), data.get("location_id", 0))
        x, y = coord_lookup.get(key, (0, 0))
        data["location_x"] = x
        data["location_y"] = y
        result.append(AgentPlanItem(**data))
    return result


def _compose_plan_with_llm(state: AgentState) -> dict[str, Any]:
    candidates = state["candidates"]
    constraints = state.get("constraints", {})
    day_count = constraints.get("day_count", 1)
    user_input = state.get("user_input", "")
    coord_lookup = _build_coord_lookup(candidates)

    def _invoke(extra_instruction: str = "") -> AgentPlan:
        sp, up = format_compose_prompt(
            scenario=state["scenario"],
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
            validate=_make_plan_validator(candidates),
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
        print(f"[ReAct-Compose] 校验失败：期望 {day_count} 天，实际 {actual_days}，触发重试")
        _emit_step("正在修正多日拆分方案...")
        retry_instruction = _build_day_retry_instruction(user_input, day_count)
        try:
            plan = _invoke(retry_instruction)
            actual_days = sorted(set(it.day_num for it in plan.items))
            if len(actual_days) < day_count:
                print(f"[ReAct-Compose] 重试仍失败，启用规则化拆分")
                plan = _force_split_days(plan, day_count, user_input)
        except Exception:
            print(f"[ReAct-Compose] 重试异常，启用规则化拆分")
            plan = _force_split_days(plan, day_count, user_input)

    # ── 单日也补 day_label ──
    _emit_step("正在整理最终方案...")
    plan = _ensure_day_labels(plan, user_input)

    return {
        "plan": plan,
        "current_step": "persist",
        "messages": [{"role": "assistant", "content": plan.description}],
    }


def _build_day_retry_instruction(user_input: str, day_count: int) -> str:
    """构建强制多日拆分的重试指令。"""
    return (
        f"【纠错指令 - 必须遵守】\n"
        f"上一轮你生成了 {day_count} 天的计划，但所有活动都挤在 day_num=1！\n"
        f"这不符合用户需求。请重新阅读用户原始输入，严格按照日期拆分：\n"
        f"用户说：「{user_input}」\n\n"
        f"拆分要求：\n"
        + "\n".join(
            f"  - 第 {d} 天的活动全部设为 day_num={d}，从用户输入中找到对应的星期填到 day_label"
            for d in range(1, day_count + 1)
        )
        + f"\n\n禁止将所有活动放在同一天！每天至少 1 个活动项。"
    )


def _force_split_days(plan: AgentPlan, day_count: int, user_input: str) -> AgentPlan:
    """规则化拆分：将单日计划按活动数均分到多天。"""
    items = list(plan.items)
    if len(items) < day_count:
        # 不够分，保持不变但标记 day_num
        for i, item in enumerate(items):
            item.day_num = (i % day_count) + 1
        return plan

    # 均分：前 day_count-1 天各分 floor(n/day_count) 个，其余归最后一天
    per_day = len(items) // day_count
    day_labels = _extract_day_labels_from_input(user_input, day_count)

    for d in range(day_count):
        start = d * per_day
        end = start + per_day if d < day_count - 1 else len(items)
        for item in items[start:end]:
            item.day_num = d + 1
            item.day_label = day_labels.get(d + 1, f"第{d + 1}天")

    # 每天独立调整时间：第一天保持原时间，后续天从 10:00 开始
    base_time = "10:00"
    for d in range(1, day_count):
        day_items = [it for it in items if it.day_num == d + 1]
        if not day_items:
            continue
        cursor = base_time
        for item in day_items:
            stay = item.stay_minute or 60
            item.arrive_time = cursor
            item.leave_time = add_minutes(cursor, stay)
            cursor = add_minutes(cursor, stay + 15)  # 15min 间隔

    return plan


def _ensure_day_labels(plan: AgentPlan, user_input: str) -> AgentPlan:
    """单日行程也补上 day_label（从用户输入提取星期）。"""
    actual_days = sorted(set(it.day_num for it in plan.items))
    if len(actual_days) == 1:
        day_num = actual_days[0]
        label = _extract_single_day_label(user_input, day_num)
        if label:
            for item in plan.items:
                if not item.day_label:
                    item.day_label = label
    return plan


def _extract_day_labels_from_input(user_input: str, day_count: int) -> dict[int, str]:
    """从用户输入中提取各天的星期标签。"""
    import re
    labels: dict[int, str] = {}
    day_patterns = [
        (r'(周六|周日|星期六|星期日|星期天)', lambda m: m.group(1)[:2] if m.group(1) != '星期天' else '周日'),
        (r'周([一二三四五六日天])', lambda m: f'周{m.group(1)}' if m.group(1) != '天' else '周日'),
        (r'星期([一二三四五六日天])', lambda m: f'星期{m.group(1)}' if m.group(1) != '天' else '星期日'),
    ]
    found: list[str] = []
    for pattern, fn in day_patterns:
        matches = re.findall(pattern, user_input)
        for m in re.finditer(pattern, user_input):
            label = fn(m)
            if label not in found:
                found.append(label)
    for i, label in enumerate(found[:day_count]):
        labels[i + 1] = label
    return labels


def _extract_single_day_label(user_input: str, default_day_num: int = 1) -> str:
    """从输入提取单日星期标签。"""
    import re
    for pat in [r'(周六|周日|星期六|星期日|星期天)', r'周([一二三四五六日天])', r'星期([一二三四五六日天])']:
        m = re.search(pat, user_input)
        if m:
            label = m.group(0)
            return label[:2] if len(label) > 2 else label
    return ""


def _compose_plan_rule_based(state: AgentState) -> dict[str, Any]:
    scenario = state.get("scenario", "other")
    constraints = state.get("constraints", {})
    candidates = state.get("candidates", {})
    start = constraints.get("start_time", "14:00")
    day_count = constraints.get("day_count", 1)
    user_input = state.get("user_input", "")

    # 应用反馈约束
    feedback_constraints = state.get("feedback_constraints", {})
    if feedback_constraints:
        constraints = {**constraints, **feedback_constraints}

    if scenario == "friends":
        plan = _compose_friends_plan(candidates, start)
    elif scenario == "family":
        plan = _compose_family_plan(candidates, start, constraints)
    else:
        plan = _compose_generic_plan(candidates, start, constraints)

    # ── 多日处理 ──
    if day_count > 1:
        plan = _force_split_days(plan, day_count, user_input)
    plan = _ensure_day_labels(plan, user_input)

    return {
        "plan": plan,
        "current_step": "persist",
        "messages": [{"role": "assistant", "content": plan.description}],
    }


# ═══════════════════════════════════════════════════════════════
# 12. persist_plan — 持久化方案
# ═══════════════════════════════════════════════════════════════

def persist_plan_node(state: AgentState) -> dict[str, Any]:
    plan = state.get("plan")
    if not plan:
        return {"error": "没有可保存的方案", "current_step": "error"}

    if plan.id:
        # Replan: 替换已有方案的明细项
        _replace_plan_items(plan.id, plan.items)
        persisted = plan
    else:
        # 新建方案
        persisted = persist_agent_plan(state["session_id"], plan)
        memory.bind_plan(state["session_id"], persisted.id or 0)

    # 用 AI 生成的方案标题更新会话标题
    if plan.title:
        memory.update_session_title(state["session_id"], plan.title)

    # 路由：auto_execute 或执行重试 → 直接进入预约执行
    auto_execute = state.get("auto_execute", False)
    exec_attempt = state.get("exec_attempt", 0)
    if auto_execute or exec_attempt > 0:
        next_step = "execute_bookings"
    else:
        next_step = "present_plan"

    return {
        "plan": persisted,
        "plan_id": persisted.id,
        "current_step": next_step,
    }


# ═══════════════════════════════════════════════════════════════
# 13. present_plan — 展示方案（等待用户确认/反馈）
# ═══════════════════════════════════════════════════════════════

def present_plan_node(state: AgentState) -> dict[str, Any]:
    plan = state.get("plan")
    if not plan:
        return {"error": "没有生成方案", "current_step": "error"}

    share_text = build_share_text(plan)
    share_url = f"/api/agent/plans/{plan.id}/share" if plan.id else ""
    plan = plan.model_copy(update={"share_text": share_text, "share_url": share_url})

    # 构建自然语言展示文案
    exceptions = state.get("exceptions", [])
    warnings_list = state.get("warnings", [])
    presentation = _build_presentation(plan, exceptions, warnings_list)

    memory.append_message(
        state["session_id"], "assistant", presentation,
        metadata={"plan_id": plan.id, "share_url": share_url, "stage": "reviewing"},
    )

    return {
        "plan": plan,
        "share_text": share_text,
        "share_url": share_url,
        "stage": "reviewing",
        "current_step": "done",
        "messages": [{"role": "assistant", "content": presentation}],
    }


# ═══════════════════════════════════════════════════════════════
# 14. analyze_feedback — 解析用户反馈（ReAct 再推理）
# ═══════════════════════════════════════════════════════════════

def analyze_feedback_node(state: AgentState) -> dict[str, Any]:
    user_input = state["user_input"]
    existing_plan_id = state.get("existing_plan_id")

    # auto_execute 仅来自前端显式开关
    auto_execute = state.get("auto_execute", False)

    # 如果没有已有方案的详情，构建简要 summary
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
            )
            return {
                "feedback_text": result.change_summary,
                "needs_research": result.needs_new_search,
                "replaced_items": result.replaced_categories,
                "feedback_constraints": result.additional_constraints,
                "revision_count": state.get("revision_count", 0) + 1,
                "auto_execute": auto_execute,
                "current_step": "search" if result.needs_new_search else "compose",
            }
        except Exception:
            pass

    # 规则降级
    needs_research, replaced, new_constraints = _parse_feedback_rule_based(user_input)
    return {
        "feedback_text": user_input,
        "needs_research": needs_research,
        "replaced_items": replaced,
        "feedback_constraints": new_constraints,
        "revision_count": state.get("revision_count", 0) + 1,
        "auto_execute": auto_execute,
        "current_step": "search" if needs_research else "compose",
    }


# ═══════════════════════════════════════════════════════════════
# 15. execute_bookings — 执行预约（Plan&Execute 执行阶段）
# ═══════════════════════════════════════════════════════════════

def execute_bookings_node(state: AgentState) -> dict[str, Any]:
    plan_id = state.get("existing_plan_id") or state.get("plan_id")
    if not plan_id:
        plan = state.get("plan")
        if plan and plan.id:
            plan_id = plan.id

    if not plan_id:
        return {"error": "没有可执行的方案", "current_step": "error"}

    results = execute_plan_actions(plan_id)
    all_success = all(r["status"] == "success" for r in results)
    exec_attempt = state.get("exec_attempt", 0)
    can_retry = not all_success and exec_attempt < 2
    ok = sum(1 for r in results if r["status"] == "success")
    print(f"[P&E-Exec] 第{exec_attempt}次执行：{ok}/{len(results)}成功，可重试={can_retry}")

    summary = _build_booking_summary(results, all_success)
    if can_retry:
        summary += "\n正在尝试为您寻找替代方案..."
    memory.append_message(
        state["session_id"], "assistant", summary,
        metadata={"plan_id": plan_id, "booking_results": results, "stage": "executed"},
    )
    # 仅当全部成功或重试次数用尽时才标记完成
    if all_success or exec_attempt >= 2:
        memory.mark_completed(state["session_id"])

    return {
        "booking_results": results,
        "exec_attempt": exec_attempt,
        "stage": "executed",
        "current_step": "finalize_executed",
        "messages": [{"role": "assistant", "content": summary}],
    }


# ═══════════════════════════════════════════════════════════════
# 15b. replan_execute — ReAct 执行自愈：替换失败项
# ═══════════════════════════════════════════════════════════════

def replan_execute_node(state: AgentState) -> dict[str, Any]:
    """从 candidates 找到同类别替代地点替换预约失败项。不调 LLM。"""
    candidates = state.get("candidates", {})
    plan = state.get("plan")
    booking_results = state.get("booking_results", [])
    exec_attempt = state.get("exec_attempt", 0) + 1

    if not plan:
        return {"error": "无可修复的方案", "current_step": "error"}

    # confirm 路径直接执行跳过了搜索，candidates 可能为空 → 先搜
    if not candidates:
        scenario = plan.scenario or "family"
        constraints = {
            "start_time": "14:00",
            "nearby": True,
            "max_distance": 5000 * (exec_attempt + 1),  # 重试时放宽距离
            "duration_hours": 5,
            "party_size": 3,
            "child_age": 5 if scenario == "family" else None,
            "requirements": [],
        }
        candidates = search_local_candidates(scenario, constraints)
        for cat in candidates:
            for item in candidates[cat]:
                item["available"] = _check_availability(item)

    failed = [r for r in booking_results if r["status"] != "success"]
    new_items = list(plan.items)
    replaced_count = 0

    for fail in failed:
        table = fail["location_table_name"]
        fail_id = fail["location_id"]
        pool = candidates.get(table, [])
        alt = next(
            (item for item in pool
             if item.get("id") != fail_id and item.get("available", True)),
            None,
        )
        if alt is None:
            continue

        for i, old_item in enumerate(new_items):
            if (old_item.location_table_name == table
                    and old_item.location_id == fail_id):
                new_items[i] = _plan_item(
                    old_item.step_order, old_item.activity_type,
                    table, alt,
                    old_item.arrive_time, old_item.stay_minute,
                    f"替代{old_item.location_name}：{alt.get('name', '')}",
                    old_item.travel_mode,
                )
                replaced_count += 1
                break

    updated_plan = plan.model_copy(update={"items": new_items})

    print(f"[ReAct-Exec] 第{exec_attempt}次重试：{len(failed)}项失败，替换{replaced_count}项")
    return {
        "plan": updated_plan,
        "candidates": candidates,
        "exec_attempt": exec_attempt,
        "current_step": "persist_plan",
        "messages": [{"role": "assistant",
                      "content": f"已找到 {replaced_count} 个替代地点，重新预约..."}],
    }


# ═══════════════════════════════════════════════════════════════
# 16. finalize_executed — 执行后总结
# ═══════════════════════════════════════════════════════════════

def finalize_executed_node(state: AgentState) -> dict[str, Any]:
    results = state.get("booking_results", [])
    all_ok = all(r["status"] == "success" for r in results)

    if all_ok:
        closing = "预约全部完成！祝您周末愉快！如有变动可随时调整。"
    else:
        failed = [r for r in results if r["status"] != "success"]
        names = ", ".join(r.get("location_name", "") for r in failed)
        closing = f"部分预约未成功：{names}。其余预约已完成。如需调整请告诉我。"

    return {
        "current_step": "done",
        "messages": [{"role": "assistant", "content": closing}],
    }


# ═══════════════════════════════════════════════════════════════
# 17. finalize（保留，供同步端点使用）
# ═══════════════════════════════════════════════════════════════

def finalize_node(state: AgentState) -> dict[str, Any]:
    plan = state.get("plan")
    if not plan:
        return {"error": "没有生成方案", "current_step": "error"}

    share_text = build_share_text(plan)
    share_url = f"/api/agent/plans/{plan.id}/share" if plan.id else ""
    plan = plan.model_copy(update={"share_text": share_text, "share_url": share_url})
    memory.append_message(
        state["session_id"], "assistant", share_text,
        metadata={"plan_id": plan.id, "share_url": share_url},
    )
    return {
        "plan": plan,
        "share_text": share_text,
        "share_url": share_url,
        "current_step": "done",
        "messages": [{"role": "assistant", "content": share_text}],
    }


# ═══════════════════════════════════════════════════════════════
# 辅助函数
# ═══════════════════════════════════════════════════════════════

def _is_inquiry(user_input: str) -> bool:
    """判断是否是查询/浏览意图（而非规划意图）。"""
    inquiry_patterns = [
        "有什么", "有没有", "附近", "推荐", "帮我看看", "帮我找", "查找",
        "搜一下", "查一下", "看看", "哪些", "哪家", "有什么好", "介绍",
        "什么面", "什么菜", "什么火锅", "什么餐厅",
        # 直接表达吃/去某类地点的请求
        "想吃", "想去", "想喝", "吃个", "找个", "去个",
        "推荐", "帮我推荐",
    ]
    plan_patterns = [
        "规划", "安排", "计划", "方案", "行程", "帮我规划", "帮我安排",
        "出去玩", "一日游", "半天", "下午去", "周末怎么", "怎么玩",
    ]
    has_inquiry = any(p in user_input for p in inquiry_patterns)
    has_plan = any(p in user_input for p in plan_patterns)
    # 如果同时有规划和查询关键词，优先规划
    if has_plan:
        return False
    return has_inquiry


def _is_domain_term(user_input: str) -> bool:
    """短输入只包含领域关键词（菜系/地点类型），应视为 inquiry 而非 new_plan。"""
    stripped = user_input.strip()
    if len(stripped) > 6:
        return False
    # 菜系 + 地点类别关键词
    domain_only = [
        "火锅", "烧烤", "日料", "西餐", "粤菜", "中餐", "川菜", "湘菜",
        "面食", "素食", "海鲜", "自助", "小吃", "家常菜", "饺子", "烤鸭",
        "拉面", "米线", "东南亚菜", "韩餐", "寿司",
        "商场", "游乐园", "景点", "展馆", "博物馆", "公园", "海洋馆",
        "面", "粉", "玩", "吃", "逛",
    ]
    return any(kw == stripped or (kw in stripped and len(stripped) <= len(kw) + 2) for kw in domain_only)


def _is_vague_inquiry(user_input: str) -> bool:
    """判断是否是宽泛的查询——缺少菜系、距离、预算等具体条件。"""
    # 具体类别/菜系关键词：如果用户提到了这些，说明有明确指向
    specific_cuisine = ["火锅", "日料", "西餐", "烧烤", "川菜", "粤菜", "面食", "海鲜",
                        "拉面", "寿司", "牛排", "披萨", "汉堡", "麻辣烫", "串串",
                        "烤肉", "自助", "早茶", "小龙虾", "酸菜鱼", "烤鸭",
                        "家常菜", "饺子", "米线", "中餐", "湘菜", "素食", "小吃",
                        "东南亚菜", "韩餐"]
    specific_distance = ["附近", "1km", "2km", "3km", "500米", "一公里", "两公里",
                         "近的", "近一点", "离家近", "周边", "不远"]
    specific_budget = ["便宜", "实惠", "性价比", "高档", "人均", "贵"]
    specific_place = ["商场", "游乐园", "景点", "展馆", "博物馆", "公园", "海洋馆", "动物园"]
    # 具体查询模式：带有明确条件的
    specific_patterns = ["哪家", "哪些", "哪个", "有什么面", "有什么菜", "有什么火锅",
                         "有没有", "帮我找", "搜一下", "查一下", "介绍"]

    text = user_input

    # 如果包含具体条件，不算宽泛
    if any(kw in text for kw in specific_cuisine):
        return False
    if any(kw in text for kw in specific_distance):
        return False
    if any(kw in text for kw in specific_budget):
        return False
    if any(kw in text for kw in specific_place):
        return False
    if any(kw in text for kw in specific_patterns):
        return False

    # 宽泛的推荐请求
    vague_patterns = ["推荐", "有什么好", "建议", "想吃", "想吃什么", "不知道吃",
                      "有什么吃", "好吃的", "好玩的", "好逛的"]
    return any(kw in text for kw in vague_patterns)


def _build_clarify_reply(user_input: str) -> str:
    """根据用户输入构建反问缩小范围的回复。"""
    if any(kw in user_input for kw in ["吃", "饭", "餐厅", "美食", "好吃"]):
        return (
            "好的！为了帮您更精准地推荐，想了解一下：\n"
            "1. 您偏好哪种菜系？（火锅、日料、烧烤、川菜、粤菜...）\n"
            "2. 接受多远的距离？（附近步行可达 / 3公里内 / 无所谓）\n"
            "3. 预算大概多少？（人均 50 以内 / 100 左右 / 没有限制）\n\n"
            "告诉我您的偏好，我马上帮您筛选！"
        )
    if any(kw in user_input for kw in ["玩", "逛", "游", "活动", "好玩的"]):
        return (
            "好的！为了帮您找到合适的去处，想了解一下：\n"
            "1. 您偏好哪种类型的活动？（户外景点、游乐场、博物馆、逛街...）\n"
            "2. 接受多远的距离？（附近 / 几公里内 / 无所谓）\n"
            "3. 是亲子出行还是朋友聚会？\n\n"
            "告诉我更多细节，我帮您精准推荐！"
        )
    return (
        "好的！为了帮您更精准地推荐，想多了解一些您的偏好：\n"
        "1. 您想要什么类型的？（吃的、玩的、逛的？）\n"
        "2. 接受多远的距离？\n"
        "3. 有什么特别要求吗？（预算、氛围、排队时间等）\n\n"
        "告诉我您的偏好，我马上帮您筛选！"
    )


def _is_casual(user_input: str) -> bool:
    """判断是否是寒暄/闲聊，不应触发规划。"""
    casual_patterns = [
        "你好", "您好", "嗨", "hi", "hello", "hey", "在吗", "在不在",
        "谢谢", "感谢", "辛苦了", "再见", "拜拜", "bye",
    ]
    if any(p in user_input.lower() for p in casual_patterns):
        return True
    # 极短的纯文字输入（≤4个字符），且不含规划/查询/领域关键词
    stripped = user_input.strip()
    plan_inquiry_kw = ["玩", "吃", "逛", "去", "游", "买", "看", "附近", "推荐", "规划",
                       "找", "搜", "查", "要", "想", "订", "约"]
    # 领域关键词：菜系、地点、活动类型 —— 这些短词不应被判为寒暄
    domain_kw = [
        "火锅", "烧烤", "日料", "西餐", "粤菜", "中餐", "川菜", "湘菜",
        "面", "粉", "素食", "海鲜", "自助", "小吃", "饺子", "烤鸭", "家常菜",
        "拉面", "米线", "寿司", "奶茶", "咖啡", "甜品",
        "商场", "游乐园", "景点", "展馆", "博物馆", "公园", "海洋馆",
        "餐厅", "美食", "好吃", "好玩",
    ]
    all_exclude_kw = plan_inquiry_kw + domain_kw
    if len(stripped) <= 4 and not any(kw in stripped for kw in all_exclude_kw):
        return True
    return False


def _is_new_plan_request(user_input: str) -> bool:
    """判断用户是否想开启全新规划。"""
    new_plan_keywords = ["重新规划", "换个方案", "新的方案", "重新来", "重新开始", "新计划", "重新安排"]
    return any(kw in user_input for kw in new_plan_keywords)


def _parse_feedback_rule_based(user_input: str) -> tuple[bool, list[str], dict]:
    """规则降级：解析用户反馈。"""
    needs_research = False
    replaced: list[str] = []
    constraints: dict[str, Any] = {}

    # 排队/等位
    if any(kw in user_input for kw in ["排队", "等位", "换一家", "不用排队", "不等位"]):
        constraints["no_queue"] = True
        replaced.append("restaurant")
        needs_research = True
    # 距离
    if any(kw in user_input for kw in ["近一", "远", "离家近", "更近", "近的"]):
        constraints["max_distance"] = 1000
        needs_research = True
    elif "远一点" in user_input or "远些" in user_input:
        constraints["max_distance"] = 8000
        needs_research = True
    # 预算
    if any(kw in user_input for kw in ["便宜", "省钱", "性价比", "太贵", "贵了"]):
        constraints["budget"] = "low"
        needs_research = True
    # 时间
    if any(kw in user_input for kw in ["早点", "早些", "提前"]):
        constraints["time_shift"] = -1
    elif any(kw in user_input for kw in ["晚点", "晚些", "推迟"]):
        constraints["time_shift"] = 1
    # 菜系
    for cuisine in ["火锅", "日料", "西餐", "烧烤", "川菜", "粤菜", "面食", "海鲜"]:
        if cuisine in user_input:
            constraints["cuisine_type"] = cuisine
            replaced.append("restaurant")
            needs_research = True
    # 不去/换掉
    if any(kw in user_input for kw in ["不去", "不想去", "换掉", "不要", "去掉", "取消"]):
        needs_research = True
        for label, key in [("餐厅", "restaurant"), ("乐园", "amusement_park"),
                           ("景点", "scenic_spot"), ("展馆", "exhibition_hall"),
                           ("商场", "mall"), ("游乐园", "amusement_park"),
                           ("博物馆", "exhibition_hall"), ("公园", "scenic_spot")]:
            if label in user_input:
                replaced.append(key)

    return needs_research, replaced, constraints


def _build_presentation(plan: AgentPlan, exceptions: list[dict], warnings: list[str]) -> str:
    """构建方案展示的自然语言文案。"""
    lines = [f"为您规划了以下方案「{plan.title}」："]
    for i, item in enumerate(plan.items, 1):
        lines.append(
            f"{i}. {item.location_name} ({item.arrive_time}-{item.leave_time}) "
            f"- {item.remark}"
        )

    # 预约提醒
    need_book = [item for item in plan.items if item.location_table_name != "mall"]
    if need_book:
        names = "、".join(item.location_name for item in need_book)
        lines.append(f"\n需要预约的是：{names}。")

    # 异常提示
    if exceptions:
        for e in exceptions:
            lines.append(f"⚠ {e['detail']}")

    # 排队等提醒
    if warnings:
        for w in warnings[:3]:
            lines.append(f"💡 {w}")

    lines.append(f"\n预计总花费约 {int(plan.total_cost)} 元。")
    lines.append('您觉得这个方案如何？如需调整请告诉我，确认请回复"确认"。')
    return "\n".join(lines)


def _build_booking_summary(results: list[dict], all_success: bool) -> str:
    """构建预约执行结果文案。"""
    if not results:
        return "该方案没有需要预约的项目。祝您周末愉快！"
    lines = ["预约执行结果："]
    for r in results:
        status = "✓" if r["status"] == "success" else "✗"
        lines.append(f"  {status} {r['location_name']}: {r['message']}")
    if all_success:
        lines.append("全部预约成功！")
    else:
        lines.append("部分预约未成功，可重新尝试。")
    return "\n".join(lines)


def _count_revisions(history: list[dict]) -> int:
    """统计历史消息中出现方案的次数（近似修订次数）。"""
    count = 0
    for msg in history:
        if msg.get("metadata", {}).get("stage") == "reviewing":
            count += 1
    return count


def _detect_scenario(text: str, history: list[dict[str, Any]]) -> str:
    if any(keyword in text for keyword in ("老婆", "孩子", "娃", "亲子", "一家")):
        return "family"
    if any(keyword in text for keyword in ("朋友", "2男2女", "两男两女", "4个人", "四个人")):
        return "friends"
    if any(keyword in text for keyword in ("情侣", "对象", "女朋友", "男朋友", "老公", "约会", "两人", "2个人", "两个人")):
        return "couple"
    for message in reversed(history):
        content = message.get("content", "")
        if any(keyword in content for keyword in ("老婆", "孩子", "娃", "亲子", "一家")):
            return "family"
        if any(keyword in content for keyword in ("朋友", "2男2女", "两男两女", "4个人", "四个人")):
            return "friends"
        if any(keyword in content for keyword in ("情侣", "对象", "女朋友", "男朋友", "老公", "约会", "两人")):
            return "couple"
    # 无法判断时不预设为家庭，交由 LLM 或默认使用通用场景
    return "other"


def _extract_constraints(text: str, scenario: str) -> dict[str, Any]:
    start_time = "14:00"
    if "晚上" in text:
        start_time = "17:00"
    elif "上午" in text:
        start_time = "10:00"

    requirements: list[str] = []
    if any(kw in text for kw in ["减肥", "减脂", "低卡"]):
        requirements.append("diet")
    if "蛋糕" in text:
        requirements.append("cake")
    if "鲜花" in text:
        requirements.append("flower")

    result: dict[str, Any] = {
        "start_time": start_time,
        "nearby": any(keyword in text for keyword in ("近", "附近", "离家")),
        "max_distance": 2000 if any(keyword in text for keyword in ("近", "附近", "离家")) else 5000,
        "duration_hours": 5,
        "day_count": 1,
        "party_size": 4 if scenario == "friends" else 3,
        "child_age": 5 if scenario == "family" else None,
        "requirements": requirements,
    }

    # 提取菜系偏好
    cuisine_keywords = ["火锅", "烧烤", "日料", "西餐", "粤菜", "中餐", "川菜", "湘菜",
                        "面食", "面", "粉", "素食", "海鲜", "自助", "小吃", "家常菜",
                        "饺子", "烤鸭", "拉面", "米线", "东南亚菜", "韩餐", "寿司"]
    for ck in cuisine_keywords:
        if ck in text:
            result["cuisine_type"] = ck
            break

    return result


def _get_xy(loc: dict[str, Any]) -> tuple[int, int]:
    try:
        return int(loc.get("x", 0)), int(loc.get("y", 0))
    except (ValueError, TypeError):
        return 0, 0


def _compose_family_plan(
    candidates: dict[str, list[dict[str, Any]]],
    start: str,
    constraints: dict[str, Any],
) -> AgentPlan:
    amusement = (candidates.get("amusement_park") or candidates.get("scenic_spot") or [None])[0]
    mall = (candidates.get("mall") or [None])[0]
    restaurant = _pick_family_restaurant(candidates.get("restaurant") or [], constraints)

    items: list[AgentPlanItem] = []
    cursor = start
    prev_x, prev_y = 0, 0  # 从原点出发

    if amusement:
        table = "amusement_park" if amusement in (candidates.get("amusement_park") or []) else "scenic_spot"
        ax, ay = _get_xy(amusement)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, ax, ay), "walking")
        arrive = add_minutes(cursor, travel_min)
        items.append(_plan_item(1, "play", table, amusement, arrive, 100, "亲子友好，下午主活动。"))
        cursor = add_minutes(arrive, 100)
        prev_x, prev_y = ax, ay

    if mall:
        mx, my = _get_xy(mall)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, mx, my), "walking")
        arrive = add_minutes(cursor, travel_min)
        items.append(_plan_item(len(items) + 1, "extra", "mall", mall, arrive, 50, "餐前缓冲休息。", "walking"))
        cursor = add_minutes(arrive, 50)
        prev_x, prev_y = mx, my

    dinner_time = cursor if cursor >= "17:30" else "17:30"
    if restaurant:
        rx, ry = _get_xy(restaurant)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, rx, ry), "walking")
        arrive = dinner_time if dinner_time > add_minutes(cursor, travel_min) else add_minutes(cursor, travel_min)
        items.append(_plan_item(len(items) + 1, "dining", "restaurant", restaurant, arrive, 90,
                                "儿童友好，适合家庭用餐。", "walking"))

    total_cost = sum(item.estimated_cost for item in items)
    day_count = constraints.get("day_count", 1)
    title = _make_rule_title(items, day_count)
    return AgentPlan(
        title=title,
        description="按亲子友好、离家不远来安排，已包含活动、缓冲和晚餐。",
        scenario="family",
        travel_type="亲子",
        total_cost=total_cost,
        items=items,
    )


def _compose_friends_plan(candidates: dict[str, list[dict[str, Any]]], start: str) -> AgentPlan:
    exhibition = (candidates.get("exhibition_hall") or candidates.get("scenic_spot") or [None])[0]
    mall = (candidates.get("mall") or [None])[0]
    restaurant = (candidates.get("restaurant") or [None])[0]

    items: list[AgentPlanItem] = []
    cursor = start
    prev_x, prev_y = 0, 0  # 从原点出发

    if exhibition:
        table = "exhibition_hall" if exhibition in (candidates.get("exhibition_hall") or []) else "scenic_spot"
        ex, ey = _get_xy(exhibition)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, ex, ey), "walking")
        arrive = add_minutes(cursor, travel_min)
        items.append(_plan_item(1, "play", table, exhibition, arrive, 90, "适合朋友聊天拍照。"))
        cursor = add_minutes(arrive, 90)
        prev_x, prev_y = ex, ey

    if mall:
        mx, my = _get_xy(mall)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, mx, my), "walking")
        arrive = add_minutes(cursor, travel_min)
        items.append(_plan_item(len(items) + 1, "extra", "mall", mall, arrive, 50, "预留自由逛街时间。", "walking"))
        cursor = add_minutes(arrive, 50)
        prev_x, prev_y = mx, my

    dinner_time = cursor if cursor >= "17:30" else "17:30"
    if restaurant:
        rx, ry = _get_xy(restaurant)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, rx, ry), "walking")
        arrive = dinner_time if dinner_time > add_minutes(cursor, travel_min) else add_minutes(cursor, travel_min)
        items.append(_plan_item(len(items) + 1, "dining", "restaurant", restaurant, arrive, 100,
                                "适合聚餐聊天。", "walking"))

    total_cost = sum(item.estimated_cost for item in items)
    title = _make_rule_title(items, 1)
    return AgentPlan(
        title=title,
        description="按朋友聚会、拍照聊天、聚餐可执行来安排。",
        scenario="friends",
        travel_type="美食",
        total_cost=total_cost,
        items=items,
    )


def _compose_generic_plan(
    candidates: dict[str, list[dict[str, Any]]],
    start: str,
    constraints: dict[str, Any],
) -> AgentPlan:
    """通用编排（非家庭/非朋友场景），按候选顺序简单组合。"""
    play = (candidates.get("amusement_park")
            or candidates.get("scenic_spot")
            or candidates.get("exhibition_hall")
            or [None])[0]
    mall = (candidates.get("mall") or [None])[0]
    restaurant = (candidates.get("restaurant") or [None])[0]

    items: list[AgentPlanItem] = []
    cursor = start
    prev_x, prev_y = 0, 0

    if play:
        table = "amusement_park"
        if play in (candidates.get("scenic_spot") or []):
            table = "scenic_spot"
        elif play in (candidates.get("exhibition_hall") or []):
            table = "exhibition_hall"
        px, py = _get_xy(play)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, px, py), "walking")
        arrive = add_minutes(cursor, travel_min)
        items.append(_plan_item(1, "play", table, play, arrive, 90, "下午主活动。"))
        cursor = add_minutes(arrive, 90)
        prev_x, prev_y = px, py

    if mall:
        mx, my = _get_xy(mall)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, mx, my), "walking")
        arrive = add_minutes(cursor, travel_min)
        items.append(_plan_item(len(items) + 1, "extra", "mall", mall, arrive, 50, "自由逛街。", "walking"))
        cursor = add_minutes(arrive, 50)
        prev_x, prev_y = mx, my

    dinner_time = cursor if cursor >= "17:30" else "17:30"
    if restaurant:
        rx, ry = _get_xy(restaurant)
        travel_min = estimate_travel_time(calc_distance_between(prev_x, prev_y, rx, ry), "walking")
        arrive = dinner_time if dinner_time > add_minutes(cursor, travel_min) else add_minutes(cursor, travel_min)
        items.append(_plan_item(len(items) + 1, "dining", "restaurant", restaurant, arrive, 90,
                                "晚餐推荐。", "walking"))

    total_cost = sum(item.estimated_cost for item in items)
    day_count = constraints.get("day_count", 1)
    title = _make_rule_title(items, day_count)
    return AgentPlan(
        title=title,
        description="根据需求自动编排，已包含游玩、购物和用餐。",
        scenario="other",
        travel_type="休闲",
        total_cost=total_cost,
        items=items,
    )


def _make_rule_title(items: list[AgentPlanItem], day_count: int) -> str:
    """根据实际行程内容生成动态标题。"""
    names = [it.location_name for it in items[:3] if it.location_name]
    if not names:
        return f"{day_count}日出行方案" if day_count > 1 else "半日出游方案"
    core = " · ".join(names[:2]) if len(names) >= 2 else names[0]
    if day_count > 1:
        return f"{core}等{day_count}日游"
    return f"{core}半日游"


def _pick_family_restaurant(restaurants: list[dict[str, Any]], constraints: dict[str, Any]) -> dict[str, Any] | None:
    if not restaurants:
        return None
    if "diet" not in constraints.get("requirements", []):
        return restaurants[0]
    preferred_types = {"日料", "粤菜", "中餐", "西餐"}
    for restaurant in restaurants:
        if restaurant.get("cuisine_type") in preferred_types:
            return restaurant
    return restaurants[0]


def _plan_item(
    step_order: int, activity_type: str, table_name: str,
    location: dict[str, Any], arrive_time: str, stay_minute: int, remark: str,
    travel_mode: str | None = None,
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
        travel_mode=travel_mode,
    )


def _estimate_cost(table_name: str, location: dict[str, Any]) -> float:
    if table_name == "restaurant":
        cuisine = location.get("cuisine_type")
        per_person = {
            "火锅": 130, "烧烤": 110, "日料": 150, "西餐": 120,
            "粤菜": 120, "中餐": 100,
        }.get(cuisine, 90)
        return per_person * 4
    if table_name in {"amusement_park", "exhibition_hall"}:
        return float(location.get("ticket_price") or 0) * 4
    return 0


# ═══════════════════════════════════════════════════════════════
# LLM 输出业务校验器（防止 AI 瞎填参数）
# ═══════════════════════════════════════════════════════════════

_VALID_SCENARIOS = {"family", "friends", "couple", "solo", "other"}
_VALID_LOCATION_PREFS = {"nearby", "downtown", "suburb", "any"}
_VALID_TABLES = {"restaurant", "mall", "amusement_park", "scenic_spot", "exhibition_hall"}
_VALID_ACTIVITY_TYPES = {"play", "dining", "extra", "rest"}
_TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})$")


_VALID_INTENT_TYPES = {"casual", "out_of_domain", "inquiry", "clarify", "new_plan", "feedback", "confirm"}


def _validate_classify_output(obj: ClassifyOutput) -> list[str]:
    """校验意图分类输出。"""
    errors: list[str] = []
    if obj.intent_type not in _VALID_INTENT_TYPES:
        errors.append(f"intent_type '{obj.intent_type}' 无效，应为 {_VALID_INTENT_TYPES} 之一")
    if obj.intent_type in ("casual", "out_of_domain", "clarify") and not obj.direct_reply:
        errors.append(f"intent_type={obj.intent_type} 时 direct_reply 不能为空")
    return errors


def _validate_intent_output(obj: IntentAnalysisOutput) -> list[str]:
    """校验意图解析输出。"""
    errors: list[str] = []
    if obj.scenario not in _VALID_SCENARIOS:
        errors.append(f"scenario '{obj.scenario}' 无效，应为 {_VALID_SCENARIOS} 之一")
    if not _TIME_RE.match(obj.start_time):
        errors.append(f"start_time '{obj.start_time}' 格式无效，应为 HH:MM")
    if not 1 <= obj.duration_hours <= 12:
        errors.append(f"duration_hours {obj.duration_hours} 不在 1-12 范围内")
    if not 500 <= obj.max_distance <= 50000:
        errors.append(f"max_distance {obj.max_distance} 不在 500-50000 范围内")
    if obj.location_preference not in _VALID_LOCATION_PREFS:
        errors.append(f"location_preference '{obj.location_preference}' 无效")
    if obj.party_size < 1:
        errors.append(f"party_size {obj.party_size} 必须 >= 1")
    return errors


# feedback 约束键白名单
_ALLOWED_CONSTRAINT_KEYS = {
    "max_distance", "no_queue", "cuisine_type", "exclude_ids",
    "budget", "time_shift", "min_rating",
}
_VALID_CATEGORIES = {"restaurant", "mall", "amusement_park", "scenic_spot", "exhibition_hall"}


def _validate_feedback_output(obj: FeedbackAnalysisOutput) -> list[str]:
    """校验反馈解析输出。"""
    errors: list[str] = []
    for cat in obj.replaced_categories:
        if cat not in _VALID_CATEGORIES:
            errors.append(f"replaced_categories 含无效类别 '{cat}'，有效值: {_VALID_CATEGORIES}")
    for key in obj.additional_constraints:
        if key not in _ALLOWED_CONSTRAINT_KEYS:
            errors.append(f"additional_constraints 含无效键 '{key}'，白名单: {_ALLOWED_CONSTRAINT_KEYS}")
    # 校验 constraint 值类型
    if "max_distance" in obj.additional_constraints:
        v = obj.additional_constraints["max_distance"]
        if not isinstance(v, (int, float)) or v < 100 or v > 50000:
            errors.append(f"max_distance {v} 不在 100-50000 范围内")
    if "cuisine_type" in obj.additional_constraints:
        if not isinstance(obj.additional_constraints["cuisine_type"], str):
            errors.append("cuisine_type 必须是字符串")
    return errors


_SAFE_COMPANION_RE = re.compile(r"[一-鿿　-〿＀-￯a-zA-Z0-9\s，。、（）()]+$")


def _sanitize_companion(text: str) -> str:
    """清洗 companion 字符串，去控制字符，截断过长。"""
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", text).strip()
    if len(cleaned) > 60:
        cleaned = cleaned[:60]
    if not _SAFE_COMPANION_RE.match(cleaned):
        cleaned = re.sub(r"[^一-鿿　-〿＀-￯a-zA-Z0-9\s，。、（）()]", "", cleaned).strip()
    return cleaned or "同行人"


def _make_plan_validator(candidates: dict[str, list[dict[str, Any]]]):
    """返回一个 PlanOutput 校验器，验证所有 location_id 来自候选且可用。"""

    # 构建 (table_name, location_id) → item 的索引
    valid_ids: dict[tuple[str, int], dict] = {}
    for table_name, items in candidates.items():
        for item in items:
            lid = item.get("id")
            if lid is not None:
                valid_ids[(table_name, int(lid))] = item

    def validate(plan: PlanOutput) -> list[str]:
        errors: list[str] = []
        if plan.scenario not in _VALID_SCENARIOS:
            errors.append(f"scenario '{plan.scenario}' 无效")
        if len(plan.items) < 2:
            errors.append("方案至少需要 2 个活动项")
        if len(plan.items) > 8:
            errors.append("方案最多 8 个活动项")

        prev_leave_minutes = 0
        for i, item in enumerate(plan.items):
            prefix = f"items[{i}]"

            # activity_type
            if item.activity_type not in _VALID_ACTIVITY_TYPES:
                errors.append(f"{prefix}: activity_type '{item.activity_type}' 无效")

            # table_name
            if item.location_table_name not in _VALID_TABLES:
                errors.append(f"{prefix}: location_table_name '{item.location_table_name}' 无效")

            # location_id 存在于候选
            key = (item.location_table_name, item.location_id)
            candidate = valid_ids.get(key)
            if candidate is None:
                errors.append(
                    f"{prefix}: location_id={item.location_id} 不在 {item.location_table_name} 候选列表中，请从提供的候选 JSON 中选择"
                )

            # 可用性
            if candidate and not candidate.get("available", True):
                errors.append(f"{prefix}: {candidate['name']} 标记为不可用(available=false)，必须避开")

            # 时间格式
            if not _TIME_RE.match(item.arrive_time):
                errors.append(f"{prefix}: arrive_time '{item.arrive_time}' 格式无效")
            if not _TIME_RE.match(item.leave_time):
                errors.append(f"{prefix}: leave_time '{item.leave_time}' 格式无效")

            # arrive < leave
            try:
                arr = _time_to_minutes(item.arrive_time)
                lv = _time_to_minutes(item.leave_time)
                if arr >= lv:
                    errors.append(f"{prefix}: arrive_time >= leave_time ({item.arrive_time} >= {item.leave_time})")
                if arr < prev_leave_minutes:
                    errors.append(f"{prefix}: arrive_time 早于上一项的 leave_time")
                prev_leave_minutes = lv
            except ValueError:
                pass

            # stay_minute 合理
            if not 10 <= item.stay_minute <= 300:
                errors.append(f"{prefix}: stay_minute {item.stay_minute} 不在 10-300 范围内")

            # step_order
            if item.step_order != i + 1:
                errors.append(f"{prefix}: step_order 应为 {i + 1}，实际 {item.step_order}")

        # total_cost 与各项求和大致匹配
        items_sum = sum(it.estimated_cost for it in plan.items)
        if abs(plan.total_cost - items_sum) > max(items_sum * 0.3, 50):
            errors.append(
                f"total_cost {plan.total_cost} 与各项 estimated_cost 之和 {items_sum} 偏差过大"
            )

        return errors

    return validate


def _time_to_minutes(t: str) -> int:
    """HH:MM → 分钟数。"""
    m = _TIME_RE.match(t)
    if not m:
        raise ValueError(f"invalid time: {t}")
    return int(m.group(1)) * 60 + int(m.group(2))


def _replace_plan_items(plan_id: int, items: list[AgentPlanItem]) -> None:
    """替换已有方案的全部明细项：先删旧项，再插入新项。"""
    from app.repository import travel_plan_item_repo
    from app.service import travel_plan_item_service

    old_items = travel_plan_item_repo.get_by_plan_id(plan_id)
    for old in old_items:
        travel_plan_item_service.delete(old["id"])

    for item in items:
        is_need = 0
        if item.location_table_name in {"restaurant", "amusement_park", "exhibition_hall", "scenic_spot"}:
            is_need = 1
        travel_plan_item_repo.create({
            "plan_id": plan_id,
            "location_table_name": item.location_table_name,
            "location_id": item.location_id,
            "day_num": item.day_num,
            "is_need_booking": is_need,
            "is_had_booking": 0,
            "arrive_time": item.arrive_time,
            "leave_time": item.leave_time,
            "stay_minute": item.stay_minute,
            "travel_mode": item.travel_mode,
            "remark": item.remark,
        })
