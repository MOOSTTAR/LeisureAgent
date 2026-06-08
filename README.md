<div align="center">

<img src="assets/LeisureAgentI.png" alt="LeisureAgent" width="120" />

# LeisureAgent

**AI 周末活动规划助手 —— 输入一句话，2 分钟内拿到完整可执行出行方案**

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.2-1C3C3C?logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![GitHub stars](https://img.shields.io/github/stars/MOOSTTAR/LeisureAgent?style=social)](https://github.com/MOOSTTAR/LeisureAgent/stargazers)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/MOOSTTAR/LeisureAgent/pulls)

[English](README_EN.md) •
[核心功能](#核心功能) •
[使用说明](#使用说明) •
[项目截图](#项目截图) •
[架构设计](#架构设计)

</div>

---

## 这是什么？

LeisureAgent 是一个**本地场景短时活动规划与执行 Agent**。用自然语言描述你的周末下午，它会自动完成：

1. **理解意图** — 场景（亲子/朋友/情侣）、人数、偏好、预算、距离
2. **搜索候选** — 覆盖餐厅、商场、游乐园、户外景点、展馆五类场所，共 250+ 个
3. **编排方案** — 时序优化：主活动 → 缓冲 → 用餐，支持多日拆分
4. **一键预约** — 原子化执行全部预约，容量不足自动寻找替代

全程不超过 2 分钟。不需要手动搜索、不需要切 App、不需要打电话。

> *"今天下午是空的，想和老婆孩子出去玩几个小时，别离家太远，帮我安排一下。"*
>
> *"周六想跟老婆吃火锅然后逛商场，周日带孩子去公园、游乐园，再吃个饭。"*

---

## 核心功能

| | 功能 | 说明 |
|---|------|------|
| 🧠 | **智能规划** | LLM 自动解析场景、人数、菜系、预算、距离等约束，生成完整行程方案 |
| 🔍 | **多类搜索** | 覆盖餐厅、商场、游乐园、户外景点、展馆五类场所，支持菜系/距离/价格/排队时间筛选 |
| 📋 | **方案编排** | 活动→缓冲→用餐时序编排，含地点间出行耗时、费用估算、备注说明 |
| ⚡ | **一键预约** | 方案确认后自动执行全部预约，已满项目自动寻找替代方案 |
| 💬 | **交互式修订** | 自然语言反馈修改（"换一家近的"、"太贵了"、"不去游乐园了"），最多 3 轮迭代 |
| 🗺️ | **地图视图** | 方案地点可视化，支持按天分组查看 |
| 📤 | **分享方案** | 一键生成分享链接与文案，好友可查看只读版方案 |
| 🛡️ | **智能降级** | LLM 不可用时自动切换规则引擎，核心功能不中断 |
| 🔒 | **输入安全** | 中英文双语 prompt injection 检测，控制字符与零宽字符清洗 |

---

## 端到端体验

从输入一行自然语言到拿到完整可执行方案并完成全部预约，**全程不超过 2 分钟**：

```
用户输入 "下午带老婆孩子出去玩"
  ↓  10s  意图分类 + 需求解析（场景/偏好/约束）
  ↓  50s  候选搜索 + 方案编排（5 类场所 × 多维约束）
  ↓  20s  方案持久化 + 时间线展示
  ↓  20s  一键确认 → 逐项原子预约 → 结果汇总
  ↓
✅ 预约完成，分享链接生成
```

---

## 项目截图

<details open>
<summary><b>首页</b></summary>
<br/>
<img src="assets/6a4929d9-a979-466a-91fb-a2fddcad3842.png" alt="首页" width="800" />
</details>

<details open>
<summary><b>AI 一键规划页面</b></summary>
<br/>
<img src="assets/a7ea5801-5605-4757-a282-eaf7877c7e12.png" alt="AI 规划" width="800" />
</details>

<details open>
<summary><b>Agent 生成计划并预约</b></summary>
<br/>
<img src="assets/9179580e-f83f-4fcd-b58c-34e906b7806e.png" alt="预约" width="800" />
</details>

<details open>
<summary><b>意图分类——超出领域拒绝</b></summary>
<br/>
<img src="assets/28be72d4-797d-4cd1-888e-bcf704aab916.png" alt="拒绝" width="800" />
</details>

<details open>
<summary><b>地图视图 & 分享</b></summary>
<br/>
<img src="assets/94e5a607-6444-47e3-b91d-22d6d69b2423.png" alt="地图" width="400" />
<img src="assets/bf1b3cda-87c9-4a5e-94ce-00c5f26cb50f.png" alt="分享" width="400" />
</details>

---

## 技术栈

### 前端

| 切面 | 技术组件 | 推荐版本 | 核心作用 |
|------|----------|----------|----------|
| 框架 | React | 19.0.0 | 构建 Web UI 交互界面 |
| 构建工具 | Vite | 6.0.0 | 极速的前端构建工具 |
| 语言 | TypeScript | 5.5.0 | 类型安全，减少前端 Bug |
| UI 库 | Tailwind CSS | 4.0.0 | 快速编写精美、响应式的 UI |
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
| 编排框架 | LangGraph | 最新版 | 构建带状态循环、复杂规划逻辑的 Agent |

### 存储

| 切面 | 技术组件 | 推荐版本 | 核心作用 |
|------|----------|----------|----------|
| 数据库 | SQLite | Python 内置 | 零配置轻量级数据库，用于持久化 Mock 数据和订单状态 |

---

## 项目结构

```
LeisureAgent/
├── .env.example                     # 环境变量模板
├── .gitignore
├── LICENSE                          # MIT 开源协议
├── README.md                        # 中文文档（默认）
├── README_EN.md                     # 英文文档
├── requirements.txt                 # 前端依赖声明
│
├── assets/                          # 项目截图 & Logo
│   ├── LeisureAgentI.png            # Logo
│   └── *.png                        # 功能截图
│
├── docs/                            # 设计文档
│   ├── architecture.md              # 架构设计
│   ├── api.md                       # API 文档
│   ├── design.tex / design.pdf      # LaTeX 设计文档
│   └── requirements-spec.tex / .pdf # 需求规格说明
│
├── backend/python/
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py                  # FastAPI 入口，路由注册 & 启动校验
│   │   │
│   │   ├── agent/                   # 🧠 LangGraph Agent 核心
│   │   │   ├── graph.py             # StateGraph 图定义 & 路由函数
│   │   │   ├── state.py             # AgentState 全局状态定义
│   │   │   ├── api.py               # SSE 流式聊天 & 会话管理 API
│   │   │   ├── planner.py           # 兼容重导出层（→ nodes/）
│   │   │   ├── memory.py            # SQLite 会话存储 & 清理
│   │   │   ├── input_guard.py       # 输入安全过滤（prompt injection）
│   │   │   ├── constants.py         # 魔法数字 & 关键词常量
│   │   │   ├── metrics.py           # LLM 调用指标统计
│   │   │   ├── semantic.py          # TF-IDF 语义匹配
│   │   │   ├── nodes/               # 图节点（按职责拆分）
│   │   │   │   ├── session.py       # 会话加载
│   │   │   │   ├── classify.py      # 意图分类
│   │   │   │   ├── analyze.py       # 需求解析
│   │   │   │   ├── search.py        # 候选搜索 & 咨询展示
│   │   │   │   ├── detect.py        # 异常检测 & 搜索自愈
│   │   │   │   ├── compose.py       # 方案编排（LLM + 规则降级）
│   │   │   │   ├── execute.py       # 预约执行 & 执行自愈
│   │   │   │   ├── feedback.py      # 反馈解析
│   │   │   │   ├── present.py       # 方案展示 & 持久化
│   │   │   │   ├── finalize.py      # 直接回复 & 执行后总结
│   │   │   │   └── helpers.py       # 公共辅助函数
│   │   │   └── tools/               # Agent 工具集
│   │   │       ├── _search.py       # 候选搜索 & 咨询搜索
│   │   │       ├── _booking.py      # 预约执行 & 持久化
│   │   │       ├── _location.py     # 地点查询 & 共享文案
│   │   │       └── _utils.py        # 距离计算 & 时间工具
│   │   │
│   │   ├── llm/                     # LLM 抽象层
│   │   │   ├── provider.py          # 多 Provider 统一封装（5 种）
│   │   │   ├── prompts.py           # 所有 Prompt 模板集中管理
│   │   │   ├── schemas.py           # LLM 输出 Pydantic Schema
│   │   │   └── structured.py        # 结构化输出 + JSON 修复 + 校验重试
│   │   │
│   │   ├── config/
│   │   │   └── llm_config.py        # LLM 配置 & 启动校验
│   │   │
│   │   ├── api/                     # REST API 路由（8 类场所 CRUD）
│   │   ├── models/                  # Pydantic 数据模型 & 请求/响应 Schema
│   │   ├── service/                 # 业务逻辑层
│   │   ├── repository/              # 数据访问层（SQLite）
│   │   ├── mock/                    # Mock 数据生成（250+ 场所）
│   │   └── db/
│   │       └── database.py          # SQLite 初始化 & 连接管理
│   │
│   └── tests/                       # 测试（55+ 用例）
│       ├── test_agent_layer.py      # Agent 集成测试
│       ├── test_classify.py         # 意图分类测试
│       ├── test_compose.py          # 方案编排测试
│       ├── test_constraints.py      # 约束解析测试
│       ├── test_input_guard.py      # 输入安全测试
│       ├── test_integration.py      # 端到端集成测试
│       ├── test_json_repair.py      # JSON 修复测试
│       ├── test_routes.py           # API 路由测试
│       ├── test_rule_compose.py     # 规则编排测试
│       ├── test_semantic.py         # 语义匹配测试
│       └── test_validators.py       # 校验器测试
│
└── frontend/                        # React 19 + Vite + Tailwind CSS 4
    ├── package.json
    ├── index.html
    └── src/
        ├── App.tsx                  # 路由 & 页面切换
        ├── main.tsx                 # React 入口
        ├── api/                     # API 客户端 & SSE 流式通信
        ├── pages/                   # 页面组件（8 个）
        ├── components/
        │   ├── lobby/               # 首页大厅
        │   ├── category/            # 分类卡片
        │   └── ai-plan/             # AI 规划核心 UI
        │       ├── ChatArea.tsx     # 对话区域
        │       ├── ChatInput.tsx    # 输入框
        │       ├── PlanView.tsx     # 方案时间线
        │       ├── MessageBubble.tsx# 消息气泡
        │       ├── InquiryModal.tsx # 咨询结果弹窗
        │       ├── ProcessingRecord.tsx # 处理步骤进度
        │       └── ConversationSidebar.tsx # 会话侧边栏
        ├── components/              # 公共组件（Toast、地图、分享等）
        └── utils/                   # 工具函数
```

---

## 架构设计

```
用户输入（自然语言）
        │
        ▼
┌─────────────────────────────────────┐
│          LangGraph Agent             │
│                                      │
│  load_session → classify_intent      │
│       │                              │
│       ├─ 寒暄/超领域 → 直接回复      │
│       ├─ 咨询查询 → 搜索 → 展示      │
│       ├─ 新规划 → 解析意图 → 搜索    │
│       │                  │           │
│       │   ┌─ReAct 自愈──┐│           │
│       │   │ 发现缺口    ││           │
│       │   │  → 放宽重搜 ││           │
│       │   └─────────────┘│           │
│       │                  ↓           │
│       │              编排方案        │
│       │                  │           │
│       │   ┌─P&E 自愈───┐│            │
│       │   │ 执行预约   ││            │
│       │   │  → 替换重试││            │
│       │   └────────────┘│           │
│       │                  │           │
│       └─ 反馈修改 → 重新编排         │
│                                      │
│  工具：搜索 / 查地点 / 检查可用性    │
│        / 执行预约                    │
└──────────────────────────────────────┘
        │
        ▼
┌──────────────┐   ┌──────────────┐
│   FastAPI    │   │  React 19    │
│   + SQLite   │◄──│  + Vite      │
│   + SSE      │   │  + Tailwind  │
└──────────────┘   └──────────────┘
```

---

## 使用说明

### 1. 环境准备

- **Python** ≥ 3.12
- **Node.js** ≥ 18
- **DeepSeek API Key**（或其他兼容 OpenAI 接口的 API Key）

### 2. 配置 LLM

项目根目录提供了 `.env.example` 模板文件，**将其复制为 `backend/python/.env`** 并配置 API Key：

```bash
cp .env.example backend/python/.env
```

#### 方式一：系统环境变量（推荐）

在系统环境变量中设置 `DEEPSEEK_API_KEY`，`.env` 中引用即可：

```bash
# backend/python/.env
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}   # 从系统环境变量读取，无需硬编码
```

#### 方式二：直接写入

```bash
# backend/python/.env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxx       # 直接填写你的 API Key
```

> **注意**：`.env` 已在 `.gitignore` 中，不会被提交到 Git。API Key 未配置时程序将**拒绝启动**并打印配置指引。

#### 切换到其他 Provider

<details>
<summary>使用 OpenAI</summary>

```bash
# backend/python/.env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
```
</details>

<details>
<summary>使用 Anthropic Claude</summary>

```bash
# backend/python/.env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxx
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
```
</details>

<details>
<summary>使用本地 Ollama</summary>

```bash
# backend/python/.env
LLM_PROVIDER=ollama
OLLAMA_MODEL=qwen2.5:14b
# 无需 API Key，确保 Ollama 服务已启动
```
</details>

#### 关闭 LLM 意图分类 / 方案编排（纯规则引擎）

```bash
# backend/python/.env
USE_LLM_FOR_INTENT=false
USE_LLM_FOR_PLAN=false
```

### 3. 安装依赖

```bash
# 后端
cd backend/python
pip install -r requirements.txt

# 前端
cd frontend
npm install
```

### 4. 初始化数据库

首次启动时后端会自动建表并填充 Mock 数据（50 家餐厅、50 家商场、50 家游乐园、50 家景点、50 家展馆），无需手动操作。

如需重置数据：

```bash
cd backend/python
python -c "from app.db.database import reset_db; reset_db()"
```

### 5. 启动服务

确保先启动后端（端口 8000），再启动前端（端口 5173）。前端已配置 Vite proxy 将 `/api` 请求自动转发到后端，无需额外配置跨域。

```bash
# 终端 1 — 后端
cd backend/python
uvicorn app.main:app --reload --port 8000

# 终端 2 — 前端
cd frontend
npm run dev
```

打开浏览器访问 `http://localhost:5173`，进入「AI 一键规划」页面即可开始使用。

### 6. 运行测试

```bash
cd backend/python
python -m pytest tests/ -v
```

---

## 交付目标

1. Web UI —— 移动端优先的聊天式交互界面
2. 完整 Tool 实现代码 —— 含 Mock API 调用
3. 设计文档 —— Planning 策略、工具调用链路、异常处理机制

---

## License

MIT © [MOOSTTAR](https://github.com/MOOSTTAR)
