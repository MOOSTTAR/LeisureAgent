# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## 回复语言

始终使用中文回复。

## 编码行为准则

减少常见 LLM 编码错误的通用行为指南。

**权衡：** 这些准则偏向谨慎而非速度。对于简单任务，自行判断。

### 1. 先思考再编码

**不要假设。不要隐藏困惑。明示权衡。**

实现之前：

- 明确陈述你的假设。如果不确定，主动询问。
- 如果存在多种理解，先列出再选择，不要默默决定。
- 如果存在更简单的方案，说出来。必要时反驳需求。
- 如果有不清楚的地方，停下来。指出困惑之处，询问。

### 2. 简洁优先

**用最少的代码解决问题。不做投机性开发。**

- 不添加超出需求的功能。
- 不为单次使用的代码创建抽象。
- 不做未被要求的"灵活性"或"可配置性"。
- 不为不可能出现的场景做错误处理。
- 如果写了 200 行但可以压缩到 50 行，重写。

自问：「资深工程师会觉得这过于复杂吗？」如果是，简化它。

### 3. 精准修改

**只动必须动的。只清理自己造成的混乱。**

编辑已有代码时：

- 不要"改进"相邻的代码、注释或格式。
- 不重构没坏的东西。
- 匹配已有风格，即使你更习惯其他方式。
- 如果你注意到不相关的死代码，提出来 —— 但不要自作主张删除。

当你的修改产生了孤立代码：

- 移除因你的修改而变得无用的 import / 变量 / 函数。
- 不要删除之前就存在的死代码，除非明确要求。

检验标准：每一行改动都能直接追溯到用户的需求。

### 4. 目标驱动的执行

**定义成功标准。循环直到验证通过。**

将任务转化为可验证的目标：

- "添加验证" → "先写无效输入的测试，然后让测试通过"
- "修复 bug" → "先写能复现的测试，然后修复"
- "重构 X" → "确保前后测试都通过"

对多步骤任务，给出简要计划：

```text
1. [步骤] → 验证: [检查项]
2. [步骤] → 验证: [检查项]
3. [步骤] → 验证: [检查项]
```

明确成功标准让你能独立循环推进。模糊的标准（"让它能用"）则需要不断澄清。

---

**这些准则有效的标志是：** diff 中不必要的改动更少、因过度复杂而重写的次数更少、澄清问题在实现之前提出而非出错之后。

## 项目概述

LeisureAgent - 本地场景短时活动规划与执行 Agent，接受自然语言输入，输出可执行的完整方案并自动完成关键下单/预订动作。

**核心场景：** 周末下午 4-6 小时的综合活动规划（去哪玩 → 去哪吃 → 额外活动 → 一键下单/预约）。

**交付目标：**

1. Web UI
2. 完整的 Tool 实现代码（含 Mock API 调用）
3. 设计文档（≤2 页，说明 Planning 策略、工具调用链路、异常处理机制）

## 技术栈

### 前端
| 切面 | 技术组件 | 推荐版本 | 核心作用 |
|------|----------|----------|----------|
| 框架 | React | 19.0.0 | 构建 Web UI 交互界面 |
| 构建工具 | Vite | 6.0.0 | 极速的前端构建工具 |
| 语言 | TypeScript | 5.5.0 | 类型安全，减少前端 Bug |
| UI 库 | Tailwind CSS | 4.0.0 | 快速编写精美、响应式的比赛 UI |
| 组件库 | Shadcn/ui / Ant Design | 最新版 | 现成的组件库（对话框、卡片、时间轴） |

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
| 编排框架 | LangGraph | 最新版 (暂定 1.2) | 构建带状态循环、复杂规划逻辑的 Agent 最佳选择 |

### 存储
| 切面 | 技术组件 | 推荐版本 | 核心作用 |
|------|----------|----------|----------|
| 数据库 | SQLite | Python 内置 | 零配置轻量级数据库，用于持久化 Mock 数据和订单状态 |

## 项目结构

```text
LeisureAgent/
├── backend/
│   └── python/                  # 后端 — Python + LangGraph + FastAPI
│       ├── app/
│       │   ├── main.py         # FastAPI 入口，SSE streaming 端点
│       │   ├── agent/
│       │   │   ├── planner.py  # LangGraph Planning 策略
│       │   │   ├── state.py    # Agent State 定义
│       │   │   └── graph.py    # LangGraph 编排（节点、边、条件分支）
│       │   ├── tools/
│       │   │   ├── search.py   # 搜索餐厅/活动
│       │   │   ├── booking.py  # 预订/下单工具
│       │   │   └── delivery.py # 配送服务工具
│       │   ├── service/
│       │   │   └── api.py      # 业务服务层（第三方 API 封装、数据持久化）
│       │   ├── models/
│       │   │   └── schemas.py  # Pydantic 请求/响应模型
│       │   └── mock/
│       │       └── data.py     # Mock API 数据
│       ├── requirements.txt
│       ├── Dockerfile
│       └── tests/
├── frontend/                    # React + Vite 前端
│   ├── src/
│   │   ├── App.tsx             # 根组件
│   │   ├── main.tsx            # 入口文件
│   │   ├── components/
│   │   │   ├── chat/           # 聊天面板、消息气泡
│   │   │   ├── plan/           # 计划时间线、活动卡片
│   │   │   ├── booking/        # 预约确认、状态标签
│   │   │   └── ui/             # shadcn/ui 或 Ant Design 组件
│   │   ├── lib/
│   │   │   └── api-client.ts   # Python 后端 SSE 客户端
│   │   └── types/
│   │       └── index.ts        # TypeScript 类型定义
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── docker-compose.yml           # 编排两个服务
├── .claude/
│   ├── skills/
│   ├── agents/
│   └── CLAUDE.md
└── design/
    └── design-doc.md
```

## 命令

Python 后端（开发）：
```bash
cd backend/python && pip install -r requirements.txt && uvicorn app.main:app --reload --port 8000
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
cd backend/python && pytest
cd frontend && npm run test
```

## 架构

两层架构：

```text
用户输入
  │
  ▼
┌─────────────┐     SSE      ┌──────────────────┐
│   Frontend   │ ←──────────→ │  Python Backend  │
│  (React)     │              │  (LangGraph)     │
│  纯 UI 层     │  流式回复    │  规划 + 工具调用   │
└─────────────┘              └──────────────────┘
```

- **前端**：React 纯展示层，通过 SSE 连接 Python 后端获取流式回复
- **Python 后端**：FastAPI + LangGraph 编排，负责 NL 理解、活动规划、工具调用、业务逻辑

## 关键目录

- `backend/python/` - Python 后端（LangGraph 智能体编排、FastAPI 服务、业务逻辑、第三方 API 封装、SQLite 数据存储）
- `frontend/` - React + Vite 前端（聊天界面、计划展示组件）
- `design/` - 设计文档

## 开发规范

- 使用中文回复
- 前端优先使用 Shadcn/ui 或 Ant Design 组件，避免引入额外 UI 库
- 使用 TypeScript 编写类型安全的前端代码
- 后端使用 FastAPI + Pydantic 做请求/响应校验
- Agent 逻辑使用 LangGraph 编排，定义清晰的 State、Node、Edge
- 前端通过 SSE（Server-Sent Events）通信，使用 fetch + ReadableStream 消费
- Tool 调用链路需包含完整的错误处理和回退逻辑
- Mock 数据需覆盖正常流程和异常场景

## Agent 使用指南

本项目配置了两个专用 Agent，根据任务类型自动调用：

| 任务类型 | Agent | 触发场景 |
|---------|-------|---------|
| 前端开发 | `frontend-dev` | 开发/修改 React 组件、添加 UI 功能、修复前端 Bug、样式调整 |
| 代码分析/修复 | `code-analyzer-fix` | 查看代码对应功能、查看功能对应代码、修复后端 Bug 和错误 |

### 示例

**前端任务**（自动调用 `frontend-dev`）：
- "添加一个预订确认弹窗"
- "修复聊天消息气泡的间距问题"
- "需要一个时间线组件来展示下午的活动安排"

**代码分析/修复任务**（自动调用 `code-analyzer-fix`）：
- "帮我找到处理预订功能的代码在哪里"
- "这个下单功能报错了，帮我分析一下原因"
- "LangGraph 的状态管理是怎么实现的？"
