"""方案持久化与展示节点：保存方案到数据库、生成展示文案。"""

from __future__ import annotations

from typing import Any

from app.agent import memory
from app.agent.nodes.helpers import _build_presentation
from app.agent.state import AgentState
from app.agent.tools import build_share_text, persist_agent_plan
from app.models.schemas import AgentPlanItem


def persist_plan_node(state: AgentState) -> dict[str, Any]:
    plan = state.get("plan")
    if not plan:
        return {"error": "没有可保存的方案", "current_step": "error"}

    if plan.id:
        # Replan: 替换已有方案的明细项
        _replace_plan_items(plan.id, plan.items)
        persisted = plan
    else:
        persisted = persist_agent_plan(state["session_id"], plan)
        memory.bind_plan(state["session_id"], persisted.id or 0)

    if plan.title:
        memory.update_session_title(state["session_id"], plan.title)

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


def present_plan_node(state: AgentState) -> dict[str, Any]:
    plan = state.get("plan")
    if not plan:
        return {"error": "没有生成方案", "current_step": "error"}

    share_text = build_share_text(plan)
    share_url = f"/api/agent/plans/{plan.id}/share" if plan.id else ""
    plan = plan.model_copy(update={"share_text": share_text, "share_url": share_url})

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
