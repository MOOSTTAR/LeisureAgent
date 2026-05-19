"""Planning 策略：将用户输入转化为可执行的计划。"""

from __future__ import annotations

from app.agent.state import AgentState
from app.models.schemas import (
    ActivityPlan,
    PlanStep,
    UserIntent,
)


def parse_intent(state: AgentState) -> dict:
    """从用户输入解析意图。

    将自然语言转化为结构化的 UserIntent，为后续搜索做准备。
    """
    text = state["user_input"]

    intent = UserIntent(
        raw_input=text,
        time_slot=_extract_time(text),
        companion=_extract_companion(text),
        location_preference=_extract_location(text),
        budget_hint=_extract_budget(text),
    )

    return {"intent": intent, "current_step": "search"}


def create_plan(state: AgentState) -> dict:
    """将搜索结果编排为完整的时间线方案。

    根据搜索到的餐厅/活动，按时间顺序排列为可执行的计划。
    """
    intent = state.get("intent")
    results = state.get("execution_results", [])

    if not results:
        return {"error": "没有可用的搜索结果，无法生成计划"}

    steps = []
    for item in results:
        step = PlanStep(
            type=_infer_type(item.get("category", "")),
            name=item.get("name", ""),
            address=item.get("address", ""),
            duration_minutes=90,
            estimated_cost=item.get("avg_cost", 0),
        )
        steps.append(step)

    total_cost = sum(s.estimated_cost for s in steps)
    total_duration = sum(s.duration_minutes for s in steps)

    plan = ActivityPlan(
        steps=steps,
        total_duration_minutes=total_duration,
        total_estimated_cost=total_cost,
        summary=_generate_summary(steps, intent),
    )

    return {"plan": plan, "current_step": "confirm"}


def _extract_time(text: str) -> str:
    keywords = {"下午": "下午", "晚上": "晚上", "明天": "明天"}
    for k, v in keywords.items():
        if k in text:
            return v
    return "下午"


def _extract_companion(text: str) -> str:
    if "老婆" in text or "媳妇" in text:
        companions = "老婆"
        if "孩子" in text or "娃" in text:
            companions += "和孩子"
        return companions
    if "朋友" in text or "哥们" in text:
        return "朋友"
    if "对象" in text or "女朋友" in text:
        return "对象"
    return "自己"


def _extract_location(text: str) -> str:
    if "近" in text or "附近" in text or "离家" in text:
        return "nearby"
    return "any"


def _extract_budget(text: str) -> str:
    if "预算" in text:
        return text
    return ""


def _infer_type(category: str) -> str:
    mapping = {
        "公园": "outdoor",
        "博物馆": "indoor",
        "电影院": "entertainment",
        "火锅": "dining",
        "西北菜": "dining",
        "中式": "dining",
        "饮品": "shopping",
    }
    return mapping.get(category, "entertainment")


def _generate_summary(steps: list[PlanStep], intent: UserIntent | None) -> str:
    companion = f"和{intent.companion}" if intent and intent.companion else ""
    names = " → ".join(s.name for s in steps)
    return f"{companion} {names}，预计 {sum(s.duration_minutes for s in steps)} 分钟，约 {sum(s.estimated_cost for s in steps)} 元"