# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## 回复语言

始终使用中文回复。

## 项目概述

LeisureAgent - 本地场景短时活动规划与执行 Agent，接受自然语言输入，输出可执行的完整方案并自动完成关键下单/预订动作。

**核心场景：** 周末下午 4-6 小时的综合活动规划（去哪玩 → 去哪吃 → 额外活动 → 一键下单/预约）。

**交付目标：**

1. Web UI
2. 完整的 Tool 实现代码（含 Mock API 调用）
3. 设计文档（≤2 页，说明 Planning 策略、工具调用链路、异常处理机制）

## 技术栈

### 前端
| 层       | 选型                                |
|----------|-------------------------------------|
| 框架     | Next.js 14 (App Router)             |
| UI 库    | shadcn/ui + Tailwind CSS            |
| 状态管理 | React Context + useReducer          |
| 动画     | Framer Motion                       |
| 地图     | 高德地图 JS API                     |
| 部署     | Vercel / 本地 Docker                |

### 后端
| 层           | 选型                          |
|--------------|-------------------------------|
| 框架         | Python FastAPI                |
| Agent 框架   | LangChain + LangGraph         |
| 运行时       | Uvicorn                       |
| API 通信     | REST + SSE (Server-Sent Events) |
| 部署         | Docker / Docker Compose       |

## 项目结构

```text
LeisureAgent/
├── backend/                    # Python 后端（FastAPI + LangChain + LangGraph）
│   ├── app/
│   │   ├── main.py            # FastAPI 入口，SSE streaming 端点
│   │   ├── agent/
│   │   │   ├── planner.py     # LangGraph Planning 策略
│   │   │   ├── state.py       # Agent State 定义
│   │   │   └── graph.py       # LangGraph 编排（节点、边、条件分支）
│   │   ├── tools/
│   │   │   ├── search.py      # 搜索餐厅/活动（调用第三方 API）
│   │   │   ├── booking.py     # 预订/下单工具
│   │   │   └── delivery.py    # 配送服务工具
│   │   ├── models/
│   │   │   └── schemas.py     # Pydantic 请求/响应模型
│   │   └── mock/
│   │       └── data.py        # Mock API 数据
│   ├── requirements.txt
│   ├── Dockerfile
│   └── tests/
│       ├── test_planner.py
│       └── test_tools.py
├── frontend/                   # Next.js 前端
│   ├── app/
│   │   ├── page.tsx            # 主页面（聊天界面）
│   │   └── layout.tsx          # 根布局
│   ├── components/
│   │   ├── chat/               # 聊天面板、消息气泡
│   │   ├── plan/               # 计划时间线、活动卡片
│   │   ├── booking/            # 预约确认、状态标签
│   │   └── ui/                 # shadcn/ui 组件
│   ├── lib/
│   │   └── api-client.ts       # 后端 API 调用封装（SSE 客户端）
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
├── docker-compose.yml          # 编排前后端服务
├── .claude/
│   ├── skills/
│   ├── agents/
│   └── CLAUDE.md
└── design/
    └── design-doc.md           # 设计文档
```

## 命令

后端（开发）：
```bash
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
```

前端（开发）：
```bash
cd frontend && npm run dev
```

全栈启动（Docker）：
```bash
docker-compose up -d
```

测试：
```bash
cd backend && pytest
cd frontend && npm run test
```

## 架构

前后端分离架构：
- **前端**：Next.js 纯 UI 层，通过 SSE 与后端通信
- **后端**：FastAPI 提供 REST + SSE 端点，LangChain + LangGraph 编排 Agent
- **通信流程**：用户输入 → 前端 SSE 连接 → FastAPI → LangGraph Agent（含工具调用）→ Streaming 回复 → 前端实时展示

## 关键目录

- `backend/` - Python 后端（FastAPI + LangChain + LangGraph）
  - `app/agent/` - Agent 核心（Planner + State + Graph 编排）
  - `app/tools/` - 各种工具调用实现
  - `app/mock/` - Mock API 数据
- `frontend/` - Next.js 前端
  - `components/chat/` - 聊天界面组件
  - `components/plan/` - 计划展示组件
- `design/` - 设计文档

## 开发规范

- 使用中文回复
- 前端优先使用 shadcn/ui 组件，避免引入额外 UI 库
- 后端使用 FastAPI + Pydantic 做请求/响应校验
- Agent 逻辑使用 LangGraph 编排，定义清晰的 State、Node、Edge
- Tool 调用链路需包含完整的错误处理和回退逻辑
- Mock 数据需覆盖正常流程和异常场景
- 前后端通过 SSE（Server-Sent Events）通信，前端使用 fetch + ReadableStream 消费
