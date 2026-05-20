"""FastAPI 应用入口，提供 SSE streaming 聊天端点。"""

from __future__ import annotations

import json
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from app.agent.graph import graph
from app.agent.state import AgentState
from app.models.schemas import ChatRequest
from app.service.database import init_db

app = FastAPI(title="LeisureAgent", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    """应用启动时初始化数据库。"""
    init_db()


async def _stream_events(request: ChatRequest) -> AsyncGenerator[bytes, None]:
    """执行 LangGraph Agent 并以 SSE 格式流式返回。"""
    initial_state: AgentState = {
        "user_input": request.message,
        "intent": None,
        "plan": None,
        "plan_confirmed": False,
        "messages": [{"role": "user", "content": request.message}],
        "current_step": "analyze",
        "execution_results": [],
        "error": None,
    }

    try:
        async for event in graph.astream_events(initial_state, version="v2"):
            event_type = event.get("event")
            name = event.get("name", "")
            data = event.get("data", {})

            if event_type == "on_chain_start" and name == "LangGraph":
                yield _sse("token", "正在分析您的需求...")

            elif event_type == "on_chat_model_stream":
                chunk = data.get("chunk", "")
                if chunk and hasattr(chunk, "content"):
                    content = chunk.content
                    if content:
                        yield _sse("token", content)

            elif event_type == "on_tool_start":
                yield _sse("tool_call", json.dumps({"tool": name, "input": data.get("input", {})}))

            elif event_type == "on_tool_end":
                yield _sse("tool_result", json.dumps({"tool": name, "output": data.get("output", "")}))

            elif name == "finalize_node" and event_type == "on_chain_end":
                plan = data.get("output", {}).get("plan", {})
                if plan:
                    yield _sse("plan", json.dumps(plan, ensure_ascii=False))

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
@app.post("/chat/stream")
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
@app.post("/chat")
async def chat(request: ChatRequest):
    initial_state: AgentState = {
        "user_input": request.message,
        "intent": None,
        "plan": None,
        "plan_confirmed": False,
        "messages": [{"role": "user", "content": request.message}],
        "current_step": "analyze",
        "execution_results": [],
        "error": None,
    }

    result = await graph.ainvoke(initial_state)
    return {
        "reply": result.get("messages", [{}])[-1].get("content", ""),
        "plan": result.get("plan"),
        "current_step": result.get("current_step"),
    }