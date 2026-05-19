# backend/python — 智能体层（Python + LangGraph）

## 职责

基于 LangGraph 编排 Agent 逻辑，完成自然语言理解 → 规划 → 工具调用的完整链路。

## 核心模块

| 模块 | 说明 |
|------|------|
| `app/agent/` | LangGraph 编排（State、Node、Graph、Planner） |
| `app/tools/` | 工具调用定义（搜索、预订、配送） |
| `app/models/` | Pydantic 请求/响应模型 |
| `app/mock/` | Mock API 数据 |
| `app/main.py` | FastAPI 入口，提供 SSE streaming 端点 |

## 通信方式

- **前端 → Python Agent**：SSE（Server-Sent Events）
- **Python Agent → Java 后端**：REST/gRPC（调用业务服务）

## 快速开始

```bash
cd backend/python
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 依赖

- Python 3.12.8  
- FastAPI
- LangChain + LangGraph
- Uvicorn