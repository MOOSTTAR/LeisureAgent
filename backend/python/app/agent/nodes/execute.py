"""预约执行节点：执行预约、失败自愈（替换替代地点）。"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from app.agent import memory
from app.agent.constants import (
    DEFAULT_CHILD_AGE,
    DEFAULT_MAX_DISTANCE,
    DEFAULT_PARTY_SIZE,
    DEFAULT_START_TIME,
    MAX_EXEC_RETRIES,
)
from app.agent.nodes.helpers import _build_booking_summary, _get_xy, _plan_item
from app.agent.state import AgentState
from app.agent.tools import (
    _check_availability,
    add_minutes,
    execute_plan_actions,
    search_local_candidates,
)
from app.api import calc_distance_between, estimate_travel_time
from app.service import travel_plan_item_service


def _preflight_check(plan_id: int) -> list[str]:
    """快速检查方案中各项的当前可用性，返回警告列表。"""
    from app.agent.tools import get_location

    warnings: list[str] = []
    try:
        items, _ = travel_plan_item_service.list_all(plan_id=plan_id, page=1, page_size=100)
        for item in items:
            loc = get_location(item["location_table_name"], item["location_id"])
            if loc and not _check_availability(dict(loc)):
                warnings.append(f"{loc.get('name', '未知')} 当前已约满，将尝试寻找替代")
    except Exception as e:
        logger.warning("preflight check failed for plan %s: %s: %s", plan_id, type(e).__name__, e)


def execute_bookings_node(state: AgentState) -> dict[str, Any]:
    plan_id = state.get("existing_plan_id") or state.get("plan_id")
    if not plan_id:
        plan = state.get("plan")
        if plan and plan.id:
            plan_id = plan.id

    if not plan_id:
        return {"error": "没有可执行的方案", "current_step": "error"}

    # ── 预检查：方案中的地点是否仍然可用 ──
    preflight_warnings = _preflight_check(plan_id)
    if preflight_warnings:
        logger.info("[P&E-Exec] preflight: %d warnings", len(preflight_warnings))

    results = execute_plan_actions(plan_id)
    all_success = all(r["status"] == "success" for r in results)
    exec_attempt = state.get("exec_attempt", 0)
    can_retry = not all_success and exec_attempt < MAX_EXEC_RETRIES
    ok = sum(1 for r in results if r["status"] == "success")
    logger.info("[P&E-Exec] attempt #%d: %d/%d succeeded, can_retry=%s", exec_attempt, ok, len(results), can_retry)

    summary = _build_booking_summary(results, all_success)
    if can_retry:
        summary += "\n正在尝试为您寻找替代方案..."
    memory.append_message(
        state["session_id"], "assistant", summary,
        metadata={"plan_id": plan_id, "booking_results": results, "stage": "executed"},
    )
    if all_success or exec_attempt >= MAX_EXEC_RETRIES:
        memory.mark_completed(state["session_id"])

    # 将预检查警告合并到消息中
    if preflight_warnings:
        summary = "\n".join(preflight_warnings) + "\n" + summary

    return {
        "booking_results": results,
        "exec_attempt": exec_attempt,
        "warnings": preflight_warnings,
        "stage": "executed",
        "current_step": "finalize_executed",
        "messages": [{"role": "assistant", "content": summary}],
    }


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
            "start_time": DEFAULT_START_TIME,
            "nearby": True,
            "max_distance": DEFAULT_MAX_DISTANCE * (exec_attempt + 1),
            "duration_hours": 5,
            "party_size": DEFAULT_PARTY_SIZE,
            "child_age": DEFAULT_CHILD_AGE if scenario == "family" else None,
            "requirements": [],
        }
        candidates = search_local_candidates(scenario, constraints)
        for cat in candidates:
            for item in candidates[cat]:
                item["available"] = _check_availability(item)

    failed = [r for r in booking_results if r["status"] != "success"]
    new_items = list(plan.items)
    replaced_count = 0
    unreplaced: list[str] = []

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
            name = fail.get("location_name", "未知")
            unreplaced.append(name)
            logger.warning("[ReAct-Exec] no alternative for %s (id=%s, table=%s)", name, fail_id, table)
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
    existing_warnings = list(state.get("warnings", []))

    if unreplaced:
        existing_warnings.append(
            f"以下地点无可用替代，仍保留在原方案中（可能已约满）：{'、'.join(unreplaced)}"
        )

    if replaced_count > 0:
        msg = f"已找到 {replaced_count} 个替代地点，重新预约..."
        if unreplaced:
            msg += f"（{'、'.join(unreplaced)} 无替代，跳过）"
    else:
        msg = f"未找到替代地点，{'、'.join(unreplaced)} 仍保留在原方案中。建议手动调整。"

    logger.info("[ReAct-Exec] retry #%d: %d failed, %d replaced, %d unreplaced",
                exec_attempt, len(failed), replaced_count, len(unreplaced))
    return {
        "plan": updated_plan,
        "candidates": candidates,
        "exec_attempt": exec_attempt,
        "warnings": existing_warnings,
        "current_step": "persist_plan",
        "messages": [{"role": "assistant", "content": msg}],
    }
