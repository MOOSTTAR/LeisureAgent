"""FastAPI 应用入口，提供 SSE streaming 聊天端点。"""

from __future__ import annotations

import json
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.agent.graph import graph
from app.agent import memory
from app.agent.state import AgentState
from app.agent.tools import build_share_payload, execute_plan_actions
from app.api.amusement_park_api import router as amusement_park_router
from app.api.exhibition_hall_api import router as exhibition_hall_router
from app.api.mall_api import router as mall_router
from app.api.restaurant_api import router as restaurant_router
from app.api.scenic_spot_api import router as scenic_spot_router
from app.api.travel_plan_api import router as travel_plan_router
from app.api.travel_plan_item_api import router as travel_plan_item_router
from app.api.booking import router as booking_router
from app.db.database import init_db
from app.models.schemas import ChatRequest

app = FastAPI(title="LeisureAgent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 注册业务 API 路由 ──
app.include_router(restaurant_router)
app.include_router(mall_router)
app.include_router(amusement_park_router)
app.include_router(scenic_spot_router)
app.include_router(exhibition_hall_router)
app.include_router(travel_plan_router)
app.include_router(travel_plan_item_router)
app.include_router(booking_router)


@app.on_event("startup")
async def startup():
    """应用启动时初始化数据库。"""
    init_db()


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
    }

    try:
        async for update in graph.astream(initial_state):
            node_name, payload = next(iter(update.items()))
            yield _sse(
                "token",
                json.dumps(
                    {
                        "node": node_name,
                        "current_step": payload.get("current_step", ""),
                        "message": (payload.get("messages") or [{}])[-1].get("content", ""),
                    },
                    ensure_ascii=False,
                ),
            )

            if payload.get("plan"):
                yield _sse(
                    "plan",
                    json.dumps(payload["plan"], ensure_ascii=False, default=_json_default),
                )

        yield _sse("done", json.dumps({"message": "完成"}))

    except Exception as e:
        yield _sse("error", json.dumps({"message": str(e)}, ensure_ascii=False))


def _sse(event: str, data: str) -> bytes:
    """构造 SSE 格式消息。"""
    return f"event: {event}\ndata: {data}\n\n".encode("utf-8")


# ── 健康检查 ──

@app.get("/health")
async def health():
    return {"status": "ok"}


# ── SSE 聊天端点 ──
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest):
    return StreamingResponse(
        _stream_events(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )


# ── 同步聊天端点（非流式） ──
@app.post("/api/chat")
async def chat(request: ChatRequest):
    initial_state: AgentState = {
        "user_input": request.message,
        "session_id": request.session_id,
        "intent": None,
        "plan": None,
        "messages": [{"role": "user", "content": request.message}],
        "current_step": "load_session",
        "error": None,
    }

    result = await graph.ainvoke(initial_state)
    plan = result.get("plan")
    plan_data = plan.model_dump() if hasattr(plan, "model_dump") else plan
    return {
        "session_id": result.get("session_id", ""),
        "reply": result.get("share_text") or result.get("messages", [{}])[-1].get("content", ""),
        "plan": plan_data,
        "share_text": result.get("share_text", ""),
        "share_url": result.get("share_url", ""),
        "current_step": result.get("current_step"),
    }


@app.get("/api/agent/sessions")
async def list_agent_sessions():
    sessions = memory.list_sessions()
    return {"code": 0, "data": {"list": sessions, "total": len(sessions)}, "msg": "success"}


@app.get("/api/agent/sessions/{session_id}")
async def get_agent_session(session_id: int):
    session = memory.get_session(session_id)
    if not session:
        return {"code": 404, "data": None, "msg": "会话不存在"}
    return {"code": 0, "data": session, "msg": "success"}


@app.delete("/api/agent/sessions/{session_id}")
async def delete_agent_session(session_id: int):
    if not memory.delete_session(session_id):
        return {"code": 404, "data": None, "msg": "会话不存在"}
    return {"code": 0, "data": None, "msg": "删除成功"}


@app.get("/api/agent/plans/{plan_id}/share")
async def share_agent_plan(plan_id: int):
    payload = build_share_payload(plan_id)
    if not payload:
        return {"code": 404, "data": None, "msg": "方案不存在"}
    return {"code": 0, "data": payload, "msg": "success"}


@app.post("/api/agent/plans/{plan_id}/execute")
async def execute_plan(plan_id: int):
    """用户确认方案后执行预约，只更新业务表的 current_booking_count。"""
    results = execute_plan_actions(plan_id)
    all_success = all(r["status"] == "success" for r in results)
    return {
        "code": 0 if all_success else 1,
        "data": results,
        "msg": "全部预约成功" if all_success else "部分预约失败",
    }


def _json_default(obj):
    if hasattr(obj, "model_dump"):
        return obj.model_dump()
    raise TypeError(f"Object of type {type(obj)!r} is not JSON serializable")
