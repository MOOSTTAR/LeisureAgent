"""收尾节点：执行后总结、最终方案输出、直接回复。"""

from __future__ import annotations

from typing import Any

from app.agent import memory
from app.agent.state import AgentState
from app.agent.tools import build_share_text


def finalize_executed_node(state: AgentState) -> dict[str, Any]:
    results = state.get("booking_results", [])
    all_ok = all(r["status"] == "success" for r in results)
    plan = state.get("plan")

    if all_ok:
        closing = "预约全部完成！祝您周末愉快！如有变动可随时调整。"
    else:
        failed = [r for r in results if r["status"] != "success"]
        names = ", ".join(r.get("location_name", "") for r in failed)
        closing = f"部分预约未成功：{names}。其余预约已完成。如需调整请告诉我。"

    # 生成分享文案（与 finalize_node 一致）
    share_text = ""
    share_url = ""
    if plan:
        share_text = build_share_text(plan)
        share_url = f"/api/agent/plans/{plan.id}/share" if plan.id else ""

    memory.mark_completed(state["session_id"])
    return {
        "current_step": "done",
        "share_text": share_text,
        "share_url": share_url,
        "messages": [{"role": "assistant", "content": closing}],
    }


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


def direct_reply_node(state: AgentState) -> dict[str, Any]:
    """处理 LLM 生成的直接回复（寒暄问候或 out_of_domain 拒绝）。"""
    msg = state.get("direct_reply", "")
    if msg:
        memory.append_message(state["session_id"], "assistant", msg)
    return {
        "current_step": "done",
        "stage": "chatting",
    }
