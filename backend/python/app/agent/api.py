"""Agent 相关 API 路由 — SSE 流式聊天、会话管理、方案执行、分享。"""

from __future__ import annotations

import json
import logging
import time
from typing import AsyncGenerator

logger = logging.getLogger(__name__)

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.agent import memory
from app.agent.graph import graph
from app.agent.state import AgentState
from app.agent.tools import build_share_payload, execute_plan_actions, get_location
from app.models.schemas import ChatRequest
from app.repository import travel_plan_item_repo
from app.service import travel_plan_item_service, travel_plan_service

router = APIRouter(prefix="/api", tags=["agent"])


# ═══════════════════════════════════════════════════════════════
# SSE 流式聊天（核心入口）
# ═══════════════════════════════════════════════════════════════

@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    return StreamingResponse(
        _stream_events(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


_NODE_LABELS: dict[str, str] = {
    "load_session": "正在加载会话数据...",
    "classify_intent": "正在分类意图（Agent）...",
    "analyze_goal": "正在解析出行需求...",
    "search_candidates": "正在搜索候选地点...",
    "search_inquiry": "正在搜索...",
    "detect_exceptions": "正在检查地点可用性...",
    "adjust_search": "正在扩大搜索范围...",
    "compose_plan": "Agent 正在编排行程方案...",
    "persist_plan": "正在保存方案到数据库...",
    "present_plan": "正在整理方案...",
    "present_inquiry": "正在整理搜索结果...",
    "analyze_feedback": "正在理解修改意见（Agent）...",
    "execute_bookings": "正在执行预约...",
    "replan_execute": "正在重新规划替代方案...",
    "finalize": "正在完成...",
    "finalize_executed": "预约完成",
    "direct_reply": "正在生成回复...",
}


async def _stream_events(request: ChatRequest) -> AsyncGenerator[bytes, None]:
    """执行 LangGraph Agent 并以 SSE 格式流式返回。"""
    initial_state: AgentState = {
        "user_input": request.message,
        "session_id": request.session_id,
        "intent": None,
        "plan": None,
        "messages": [{"role": "user", "content": request.message}],
        "current_step": "load_session",
        "error": None,
        "auto_execute": request.auto_execute,
    }

    # 处理步骤计时：节点到达时记录该节点耗时（= 距上一节点/起点的时间）
    proc_steps: list[dict] = []
    proc_start = time.time()
    current_label = "正在处理..."
    final_session_id = request.session_id
    first_node = True

    # Graph 配置：通过 thread_id 关联会话，启用 checkpointing
    graph_config = {"configurable": {"thread_id": str(request.session_id)}}

    try:
        async for stream_event in graph.astream(initial_state, config=graph_config, stream_mode=["updates", "custom"]):
            if isinstance(stream_event, tuple) and len(stream_event) == 2:
                mode, data = stream_event
                if mode == "custom":
                    if isinstance(data, tuple) and len(data) == 2 and data[0] == "step":
                        current_label = data[1]
                        yield _sse("step", json.dumps({"label": data[1]}, ensure_ascii=False))
                    continue
                elif mode == "updates":
                    update = data
            else:
                update = stream_event

            node_name, payload = next(iter(update.items()))

            # ── 记录节点耗时：新节点的 label，耗时=距上一节点的时间 ──
            now = time.time()
            elapsed = round(now - proc_start, 1)
            proc_start = now
            label = _NODE_LABELS.get(node_name, node_name)
            if not first_node and elapsed >= 0.1:
                proc_steps.append({"label": label, "elapsed": elapsed})
            first_node = False
            current_label = label
            sid = payload.get("session_id", 0)
            if sid:
                final_session_id = sid

            # ── guard_reject 事件 ──
            if node_name == "guard_reject":
                msg = (payload.get("messages") or [{}])[-1].get("content", "")
                yield _sse("guard_reject", json.dumps({"message": msg}, ensure_ascii=False))

            # ── stage 事件 ──
            if payload.get("stage"):
                yield _sse("stage", json.dumps({"stage": payload["stage"]}, ensure_ascii=False))

            # ── exceptions 事件 ──
            if payload.get("exceptions") or payload.get("warnings"):
                yield _sse("exceptions", json.dumps({
                    "exceptions": payload.get("exceptions", []),
                    "warnings": payload.get("warnings", []),
                }, ensure_ascii=False))

            # ── inquiry 事件 ──
            inquiry_results = payload.get("inquiry_results")
            if inquiry_results:
                inquiry_msg = (payload.get("messages") or [{}])[-1].get("content", "")
                yield _sse("inquiry", json.dumps({
                    "items": inquiry_results,
                    "message": inquiry_msg,
                    "query": payload.get("inquiry_query", ""),
                }, ensure_ascii=False, default=_json_default))

            # ── token 进度事件 ──
            constraints = payload.get("constraints", {}) or {}
            day_count = constraints.get("day_count", 1) if isinstance(constraints, dict) else 1
            yield _sse("token", json.dumps({
                "node": node_name,
                "current_step": payload.get("current_step", ""),
                "message": (payload.get("messages") or [{}])[-1].get("content", ""),
                "session_id": payload.get("session_id", 0),
                "day_count": day_count,
            }, ensure_ascii=False))

            # ── plan 事件 ──
            if payload.get("plan"):
                yield _sse("plan", json.dumps(payload["plan"], ensure_ascii=False, default=_json_default))

            # ── booking_results 事件 ──
            booking_results = payload.get("booking_results")
            if booking_results:
                yield _sse("execute_result", json.dumps(booking_results, ensure_ascii=False, default=_json_default))

        # 记录最后一步（"预约完成" / "正在生成回复..." 等收尾节点，耗时通常≈0）
        now = time.time()
        elapsed = round(now - proc_start, 1)
        if elapsed >= 0.1:
            proc_steps.append({"label": current_label + "（收尾）", "elapsed": elapsed})

        # 持久化处理日志（追加到累积日志）
        if final_session_id and proc_steps:
            try:
                memory.append_processing_log(final_session_id, json.dumps(proc_steps, ensure_ascii=False))
            except Exception as e:
                logger.warning("Failed to persist processing log for session %s: %s", final_session_id, e)

        yield _sse("done", json.dumps({"message": "完成"}))

    except Exception as e:
        yield _sse("error", json.dumps({"message": str(e)}, ensure_ascii=False))


# ═══════════════════════════════════════════════════════════════
# 同步聊天（非流式）
# ═══════════════════════════════════════════════════════════════

@router.post("/chat")
async def chat(request: ChatRequest):
    initial_state: AgentState = {
        "user_input": request.message,
        "session_id": request.session_id,
        "intent": None,
        "plan": None,
        "messages": [{"role": "user", "content": request.message}],
        "current_step": "load_session",
        "error": None,
        "auto_execute": request.auto_execute,
    }

    graph_config = {"configurable": {"thread_id": str(request.session_id)}}
    result = await graph.ainvoke(initial_state, config=graph_config)
    plan = result.get("plan")
    plan_data = plan.model_dump() if hasattr(plan, "model_dump") else plan
    return {
        "session_id": result.get("session_id", ""),
        "reply": result.get("share_text") or result.get("messages", [{}])[-1].get("content", ""),
        "plan": plan_data,
        "share_text": result.get("share_text", ""),
        "share_url": result.get("share_url", ""),
        "current_step": result.get("current_step"),
        "stage": result.get("stage", ""),
    }


# ═══════════════════════════════════════════════════════════════
# 会话管理
# ═══════════════════════════════════════════════════════════════

@router.get("/agent/sessions")
async def list_agent_sessions():
    sessions = memory.list_sessions()
    return {"code": 0, "data": {"list": sessions, "total": len(sessions)}, "msg": "success"}


@router.get("/agent/sessions/{session_id}")
async def get_agent_session(session_id: int):
    session = memory.get_session(session_id)
    if not session:
        return {"code": 404, "data": None, "msg": "会话不存在"}

    # 如果会话关联了方案，附带完整的 plan 数据
    plan_id = session.get("travel_plan_id")
    if plan_id:
        plan = travel_plan_service.get_by_id(plan_id)
        if plan:
            items, _ = travel_plan_item_service.list_all(plan_id=plan_id, page=1, page_size=100)
            enriched_items: list[dict] = []
            for item in items:
                loc = get_location(item["location_table_name"], item["location_id"])
                enriched_items.append({
                    "step_order": item.get("id", 0),
                    "day_num": item.get("day_num", 1),
                    "day_label": item.get("day_label", ""),
                    "activity_type": "",
                    "location_table_name": item["location_table_name"],
                    "location_id": item["location_id"],
                    "location_name": loc["name"] if loc else "",
                    "address": loc.get("address", "") if loc else "",
                    "arrive_time": item.get("arrive_time", ""),
                    "leave_time": item.get("leave_time", ""),
                    "stay_minute": item.get("stay_minute", 0),
                    "remark": item.get("remark", ""),
                    "estimated_cost": 0,
                    "travel_mode": item.get("travel_mode"),
                    "location_x": loc.get("x", 0) if loc else 0,
                    "location_y": loc.get("y", 0) if loc else 0,
                })
            session["plan"] = {
                "id": plan["id"],
                "title": plan.get("plan_title", ""),
                "description": plan.get("plan_desc", ""),
                "scenario": "",
                "travel_type": plan.get("travel_type", ""),
                "total_cost": plan.get("total_cost", 0),
                "items": enriched_items,
            }

    return {"code": 0, "data": session, "msg": "success"}


@router.delete("/agent/sessions/{session_id}")
async def delete_agent_session(session_id: int):
    if not memory.delete_session(session_id):
        return {"code": 404, "data": None, "msg": "会话不存在"}
    return {"code": 0, "data": None, "msg": "删除成功"}


# ═══════════════════════════════════════════════════════════════
# 方案分享与执行
# ═══════════════════════════════════════════════════════════════

@router.get("/agent/plans/{plan_id}/share")
async def share_agent_plan(plan_id: int):
    payload = build_share_payload(plan_id)
    if not payload:
        return {"code": 404, "data": None, "msg": "方案不存在"}
    return {"code": 0, "data": payload, "msg": "success"}


@router.post("/agent/plans/{plan_id}/execute")
async def execute_plan(plan_id: int):
    """用户确认方案后执行预约。"""
    results = execute_plan_actions(plan_id)
    all_success = all(r["status"] == "success" for r in results)
    return {
        "code": 0 if all_success else 1,
        "data": results,
        "msg": "全部预约成功" if all_success else "部分预约失败",
    }


@router.put("/agent/plans/{plan_id}/travel-modes")
async def update_travel_modes(plan_id: int, modes: list[str | None]):
    """更新方案中每项的出行方式（按顺序匹配）。"""
    items = travel_plan_item_repo.get_by_plan_id(plan_id)
    if len(modes) != len(items):
        return {"code": 400, "data": None, "msg": f"出行方式数量({len(modes)})与方案项数量({len(items)})不匹配"}
    for item, mode in zip(items, modes):
        if mode:
            travel_plan_item_service.update(item["id"], {"travel_mode": mode})
    return {"code": 0, "data": None, "msg": "success"}


# ═══════════════════════════════════════════════════════════════
# Agent 可观测性端点
# ═══════════════════════════════════════════════════════════════

@router.get("/agent/metrics")
async def get_agent_metrics():
    """返回 Agent 运行时指标：LLM 调用统计 + 安全网触发次数。"""
    from app.agent.metrics import get_llm_stats, get_safety_net_stats
    return {
        "code": 0,
        "data": {
            "llm": get_llm_stats(),
            "safety_net": get_safety_net_stats(),
        },
        "msg": "success",
    }


# ═══════════════════════════════════════════════════════════════
# SSE 工具函数
# ═══════════════════════════════════════════════════════════════

def _sse(event: str, data: str) -> bytes:
    """构造 SSE 格式消息。"""
    return f"event: {event}\ndata: {data}\n\n".encode("utf-8")


def _json_default(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    raise TypeError(f"Object of type {type(obj)!r} is not JSON serializable")
