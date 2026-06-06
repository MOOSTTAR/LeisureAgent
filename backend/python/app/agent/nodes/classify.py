"""意图分类节点：LLM + 规则降级，判断用户意图类型。

规则路径使用 TF-IDF 语义匹配器辅助关键词判断，减少对精确关键词命中的依赖。
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from app.agent.constants import (
    CASUAL_KEYWORDS,
    CONFIRM_KEYWORDS,
    CUISINE_KEYWORDS,
    DOMAIN_RELATED_KEYWORDS,
    DOMAIN_TERMS,
    FEEDBACK_KEYWORDS,
    INQUIRY_KEYWORDS,
    NEW_PLAN_KEYWORDS,
    PLAN_INQUIRY_KEYWORDS,
    PLAN_REQUEST_KEYWORDS,
    SPECIFIC_INQUIRY_KEYWORDS,
    VAGUE_INQUIRY_KEYWORDS,
    WEEKDAY_KEYWORDS,
    WEEKDAY_REJECT_REPLY,
    WEEKEND_KEYWORDS,
    BUDGET_KEYWORDS,
    DISTANCE_KEYWORDS,
    PLACE_TYPE_KEYWORDS,
    FOOD_KEYWORDS,
    PLAY_KEYWORDS,
)
from app.agent.nodes.helpers import _VALID_INTENT_TYPES
from app.agent.semantic import get_matcher
from app.agent.state import AgentState
from app.config.llm_config import get_llm_settings
from app.llm.provider import get_light_chat_model
from app.llm.prompts import format_classify_prompt
from app.llm.schemas import ClassifyOutput
from app.llm.structured import invoke_structured


def _check_weekday_block(user_input: str) -> dict[str, Any] | None:
    """检查是否为工作日请求，如果是则返回阻止响应，否则返回 None。"""
    has_weekday = any(kw in user_input for kw in WEEKDAY_KEYWORDS)
    has_weekend = any(kw in user_input for kw in WEEKEND_KEYWORDS)
    if has_weekday and not has_weekend:
        return {
            "intent_type": "casual",
            "direct_reply": WEEKDAY_REJECT_REPLY,
            "stage": "chatting",
            "current_step": "direct_reply",
            "messages": [{"role": "assistant", "content": WEEKDAY_REJECT_REPLY}],
        }
    return None


def _fuzzy_match(text: str, keywords: list[str], sem_category: str,
                 sem_threshold: float = 0.18) -> bool:
    """关键词精确匹配 OR 语义模糊匹配 → 任一命中即返回 True。"""
    if any(kw in text for kw in keywords):
        return True
    try:
        return get_matcher().is_match(text, sem_category, sem_threshold)
    except Exception:
        return False


def _try_confirm_fast_path(user_input: str, existing_plan_id: int | None) -> dict[str, Any] | None:
    """有 pending 方案 + 确认关键词 → 直接走 confirm 快速路径。"""
    if not existing_plan_id:
        return None
    if _fuzzy_match(user_input.lower(), CONFIRM_KEYWORDS, "confirm"):
        return {
            "intent_type": "confirm",
            "existing_plan_id": existing_plan_id,
            "direct_reply": "",
            "current_step": "execute_bookings",
        }
    return None


def _try_feedback_fast_path(user_input: str, existing_plan_id: int | None) -> dict[str, Any] | None:
    """有 pending 方案 + 反馈关键词 → 直接走 feedback 快速路径。"""
    if not existing_plan_id:
        return None
    if _fuzzy_match(user_input, FEEDBACK_KEYWORDS, "feedback"):
        return {
            "intent_type": "feedback",
            "existing_plan_id": existing_plan_id,
            "direct_reply": "",
            "is_relevant": True,
            "stage": "reviewing",
            "current_step": "analyze_feedback",
        }
    return None


def classify_intent_node(state: AgentState) -> dict[str, Any]:
    user_input = state["user_input"]
    existing_plan_id = state.get("existing_plan_id")

    # auto_execute 仅来自前端显式开关，不做关键词自动检测
    auto_execute = state.get("auto_execute", False) and not existing_plan_id

    # 快速规则：有 pending 方案 + 明确确认词 → 直接执行
    fast_result = _try_confirm_fast_path(user_input, existing_plan_id)
    if fast_result:
        return fast_result

    # 快速规则：有 pending 方案 + 修改关键词 → 直接走 feedback
    fast_result = _try_feedback_fast_path(user_input, existing_plan_id)
    if fast_result:
        return fast_result

    # 快速规则：工作日拒绝 —— 仅支持周末规划
    fast_result = _check_weekday_block(user_input)
    if fast_result:
        return fast_result

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
                model=get_light_chat_model(),
                validate=_validate_classify_output,
                node="classify_intent",
            )
            intent_type = result.intent_type
            direct_reply = result.direct_reply or ""

            if intent_type == "confirm" and not existing_plan_id:
                intent_type = "new_plan"
            if intent_type == "feedback" and not existing_plan_id:
                intent_type = "new_plan"

            return _build_classify_result(intent_type, direct_reply, existing_plan_id, auto_execute)
        except Exception as e:
            logger.warning("LLM intent classify failed, falling back to rule-based: %s: %s", type(e).__name__, e)

    # 规则降级
    return _classify_rule_based(user_input, existing_plan_id, auto_execute)


def _build_classify_result(
    intent_type: str, direct_reply: str, existing_plan_id: int | None,
    auto_execute: bool = False,
) -> dict[str, Any]:
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
    return {**base, "stage": "planning", "current_step": "analyze_goal", "auto_execute": auto_execute}


def _classify_rule_based(user_input: str, existing_plan_id: int | None,
                         auto_execute: bool = False) -> dict[str, Any]:
    """LLM 不可用时的规则降级分类。"""
    # 工作日拒绝
    blocked = _check_weekday_block(user_input)
    if blocked:
        return blocked

    fast = _try_confirm_fast_path(user_input, existing_plan_id)
    if fast:
        return fast

    if _is_casual(user_input):
        return {
            "intent_type": "casual",
            "direct_reply": "你好！我是周末活动规划助手，可以帮你搜索附近的餐厅、商场、景点、游乐园和展馆，也能帮你规划周末半日行程。想出去玩的话直接告诉我就好～",
            "stage": "chatting",
            "current_step": "direct_reply",
            "messages": [{"role": "assistant", "content": "你好！我是周末活动规划助手，可以帮你搜索附近的餐厅、商场、景点、游乐园和展馆，也能帮你规划周末半日行程。想出去玩的话直接告诉我就好～"}],
        }

    if _is_domain_term(user_input):
        return {"intent_type": "inquiry", "direct_reply": "", "is_relevant": True, "stage": "chatting", "current_step": "search_inquiry"}

    if _is_inquiry(user_input) and not _is_new_plan_request(user_input):
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


# ── 规则分类辅助函数 ──

def _is_casual(user_input: str) -> bool:
    """判断是否是寒暄/闲聊，不应触发规划。"""
    if _fuzzy_match(user_input, CASUAL_KEYWORDS, "casual", sem_threshold=0.25):
        return True
    stripped = user_input.strip()
    all_exclude_kw = PLAN_INQUIRY_KEYWORDS + DOMAIN_RELATED_KEYWORDS
    if len(stripped) <= 4 and not any(kw in stripped for kw in all_exclude_kw):
        # 极短输入 + 无领域词汇 → 用语义确认不匹配 domain
        if not get_matcher().is_match(stripped, "domain", min_score=0.25):
            return True
    return False


def _is_inquiry(user_input: str) -> bool:
    """判断是否是查询/浏览意图（而非规划意图）。"""
    # 先排除规划请求
    if _fuzzy_match(user_input, PLAN_REQUEST_KEYWORDS, "plan_request", sem_threshold=0.2):
        return False
    return _fuzzy_match(user_input, INQUIRY_KEYWORDS, "inquiry", sem_threshold=0.15)


def _is_domain_term(user_input: str) -> bool:
    """短输入只包含领域关键词，应视为 inquiry。"""
    stripped = user_input.strip()
    if len(stripped) > 6:
        return False
    # 精确匹配优先
    if any(kw == stripped or (kw in stripped and len(stripped) <= len(kw) + 2) for kw in DOMAIN_TERMS):
        return True
    # 短输入 + 语义接近领域词 → 也视为领域术语
    return get_matcher().is_match(stripped, "domain", min_score=0.3)


def _is_vague_inquiry(user_input: str) -> bool:
    """判断是否是宽泛的查询——缺少菜系、距离、预算等具体条件。"""
    text = user_input

    # 有具体条件 → 非模糊
    if any(kw in text for kw in CUISINE_KEYWORDS):
        return False
    if any(kw in text for kw in DISTANCE_KEYWORDS):
        return False
    if any(kw in text for kw in BUDGET_KEYWORDS):
        return False
    if any(kw in text for kw in PLACE_TYPE_KEYWORDS):
        return False
    if any(kw in text for kw in SPECIFIC_INQUIRY_KEYWORDS):
        return False

    # 精确匹配模糊词 OR 语义上偏模糊（与 vague 相似度 > specific 相似度）
    if any(kw in text for kw in VAGUE_INQUIRY_KEYWORDS):
        return True
    try:
        matcher = get_matcher()
        vague_score = matcher.match(text, "vague_inquiry")
        specific_score = matcher.match(text, "specific_inquiry")
        return vague_score > specific_score and vague_score > 0.12
    except Exception:
        return False


def _build_clarify_reply(user_input: str) -> str:
    """根据用户输入构建反问缩小范围的回复。"""
    if any(kw in user_input for kw in FOOD_KEYWORDS):
        return (
            "好的！为了帮您更精准地推荐，想了解一下：\n"
            "1. 您偏好哪种菜系？（火锅、日料、烧烤、川菜、粤菜...）\n"
            "2. 接受多远的距离？（附近步行可达 / 3公里内 / 无所谓）\n"
            "3. 预算大概多少？（人均 50 以内 / 100 左右 / 没有限制）\n\n"
            "告诉我您的偏好，我马上帮您筛选！"
        )
    if any(kw in user_input for kw in PLAY_KEYWORDS):
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


def _is_new_plan_request(user_input: str) -> bool:
    """判断用户是否想开启全新规划。"""
    return _fuzzy_match(user_input, NEW_PLAN_KEYWORDS, "new_plan", sem_threshold=0.25)


def _validate_classify_output(obj: ClassifyOutput) -> list[str]:
    """校验意图分类输出。"""
    errors: list[str] = []
    if obj.intent_type not in _VALID_INTENT_TYPES:
        errors.append(f"intent_type '{obj.intent_type}' 无效，应为 {_VALID_INTENT_TYPES} 之一")
    if obj.intent_type in ("casual", "out_of_domain", "clarify") and not obj.direct_reply:
        errors.append(f"intent_type={obj.intent_type} 时 direct_reply 不能为空")
    return errors
