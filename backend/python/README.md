# backend/python — Python 后端（FastAPI + LangGraph）

## 技术栈

### 后端
| 切面 | 技术组件 | 推荐版本 | 核心作用 |
|------|----------|----------|----------|
| 语言 | Python | 3.12 | AI 编程首选语言，生态最成熟 |
| Web 框架 | FastAPI | 0.136.1 | 异步高性能 Web 框架，自动生成 Swagger 文档 |
| 数据校验 | Pydantic | 2.9.0 | 用于 Agent 输入输出的严格数据格式校验 |
| 测试框架 | Pytest | 9.0.3 | 用于接口测试 |

### Agent
| 切面 | 技术组件 | 推荐版本 | 核心作用 |
|------|----------|----------|----------|
| 编排框架 | LangGraph | 最新版 (暂定 1.2) | 构建带状态循环、复杂规划逻辑的 Agent |

### 存储
| 切面 | 技术组件 | 推荐版本 | 核心作用 |
|------|----------|----------|----------|
| 数据库 | SQLite | Python 内置 | 零配置轻量级数据库，持久化 Mock 数据和订单状态 |

## 职责

基于 LangGraph 编排 Agent 逻辑，完成自然语言理解 → 规划 → 工具调用的完整链路。

## 核心模块

| 模块 | 说明 |
|------|------|
| `app/agent/` | LangGraph 编排（State、Node、Graph、Planner） |
| `app/tools/` | 工具调用定义（搜索、预订、配送） |
| `app/service/` | 业务服务层（第三方 API 封装、数据持久化） |
| `app/db/` | SQLite 数据存储（订单状态、Mock 数据持久化） |
| `app/models/` | Pydantic 请求/响应模型 |
| `app/mock/` | Mock API 数据 |
| `app/main.py` | FastAPI 入口，提供 SSE streaming 端点 |

## 通信方式

- **前端 → Python 后端**：SSE（Server-Sent Events）

## 快速开始

```bash
cd backend/python
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## 依赖

- Python 3.12
- FastAPI 0.136.1
- Pydantic 2.9.0
- LangGraph
- Uvicorn
- Pytest 9.0.3
- SQLite（Python 内置）