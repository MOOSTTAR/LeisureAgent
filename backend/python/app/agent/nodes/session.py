"""会话加载节点：创建/加载会话，安全检查，历史消息加载。"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from app.agent import memory
from app.agent.input_guard import check_user_input
from app.agent.nodes.helpers import _count_revisions, _emit_step
from app.agent.state import AgentState
from app.agent.tools import get_location
from app.models.schemas import AgentPlan, AgentPlanItem
from app.repository import travel_plan_item_repo
from app.service import travel_plan_service


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

    # 加载已有方案（feedback/confirm 路径需要 scenario 等信息）
    existing_plan = _load_existing_plan(existing_plan_id)

    revision_count = _count_revisions(history)

    return {
        "session_id": session_id,
        "session_messages": history,
        "existing_plan_id": existing_plan_id,
        "plan_id": existing_plan_id,
        "plan": existing_plan,
        "stage": stage,
        "revision_count": revision_count,
        "current_step": "classify_intent",
        "user_input": sanitized,
    }


def _load_existing_plan(plan_id: int | None) -> AgentPlan | None:
    """从数据库加载已有方案为 AgentPlan 对象。"""
    if not plan_id:
        return None
    try:
        db_plan = travel_plan_service.get_by_id(plan_id)
        if not db_plan:
            return None
        items_raw = travel_plan_item_repo.get_by_plan_id(plan_id)
        items = []
        for item in items_raw:
            loc = get_location(item.get("location_table_name", ""), item.get("location_id", 0))
            items.append(AgentPlanItem(
                step_order=item.get("id", 0),
                day_num=item.get("day_num", 1),
                day_label=item.get("day_label", ""),
                activity_type="",
                location_table_name=item.get("location_table_name", ""),
                location_id=item.get("location_id", 0),
                location_name=loc.get("name", "") if loc else "",
                address=loc.get("address", "") if loc else "",
                arrive_time=item.get("arrive_time", ""),
                leave_time=item.get("leave_time", ""),
                stay_minute=item.get("stay_minute", 0),
                remark=item.get("remark", ""),
                estimated_cost=0,
                travel_mode=item.get("travel_mode"),
                location_x=loc.get("x", 0) if loc else 0,
                location_y=loc.get("y", 0) if loc else 0,
            ))
        return AgentPlan(
            id=db_plan.get("id"),
            title=db_plan.get("plan_title", ""),
            description=db_plan.get("plan_desc", ""),
            scenario=_infer_scenario(db_plan, items_raw),
            travel_type=db_plan.get("travel_type", ""),
            total_cost=db_plan.get("total_cost", 0),
            items=items,
        )
    except Exception as e:
        logger.warning("Failed to load existing plan %s: %s: %s", plan_id, type(e).__name__, e)
        return None


def _infer_scenario(db_plan: dict, items_raw: list[dict]) -> str:
    """从方案的 travel_type 和地点类型反推场景。"""
    travel_type = db_plan.get("travel_type", "")
    # travel_type → scenario 映射（persist 时的常用值）
    type_map = {"亲子": "family", "美食": "friends", "休闲": "other"}
    if travel_type in type_map:
        return type_map[travel_type]
    # 从地点类型反推
    tables = {item.get("location_table_name", "") for item in items_raw}
    if "amusement_park" in tables:
        return "family"
    if "exhibition_hall" in tables:
        return "friends"
    return "other"
