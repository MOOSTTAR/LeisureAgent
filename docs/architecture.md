# 项目架构

## 项目结构

```text
LeisureAgent/
├── backend/
│   └── python/                     # 后端 — Python + LangGraph + FastAPI
│       ├── app/
│       │   ├── main.py             # FastAPI 入口，SSE streaming 端点
│       │   ├── agent/
│       │   │   ├── graph.py        # LangGraph 编排（18 节点、条件路由、自愈循环）
│       │   │   ├── state.py        # Agent State 定义（TypedDict）
│       │   │   ├── api.py          # Agent API 路由（SSE/sync/会话/分享/执行）
│       │   │   ├── planner.py      # LangGraph Planning 策略（保留兼容）
│       │   │   ├── memory.py       # 会话持久化与短期记忆
│       │   │   ├── semantic.py     # TF-IDF 语义匹配器（模糊意图识别）
│       │   │   ├── input_guard.py  # 用户输入安全过滤（prompt injection 检测）
│       │   │   ├── metrics.py      # 可观测性（LLM 调用追踪/安全网计数）
│       │   │   ├── constants.py    # 集中常量管理
│       │   │   ├── nodes/          # LangGraph 节点（按职责拆分）
│       │   │   │   ├── classify.py # 意图分类（LLM + 规则降级）
│       │   │   │   ├── analyze.py  # 目标解析
│       │   │   │   ├── search.py   # 候选搜索
│       │   │   │   ├── compose.py  # 方案编排（LLM + 规则降级）
│       │   │   │   ├── detect.py   # 异常检测
│       │   │   │   ├── execute.py  # 预约执行 + 替代重试
│       │   │   │   ├── feedback.py # 反馈分析
│       │   │   │   ├── finalize.py # 收尾（分享文案/执行总结）
│       │   │   │   ├── present.py  # 方案展示/持久化
│       │   │   │   ├── session.py  # 会话加载
│       │   │   │   └── helpers.py  # 共享辅助函数
│       │   │   └── tools/          # Agent 工具函数
│       │   │       ├── _search.py  # 搜索工具
│       │   │       ├── _booking.py # 预约/持久化工具
│       │   │       ├── _location.py# 地点查询工具
│       │   │       └── _utils.py   # 通用工具
│       │   ├── llm/
│       │   │   ├── provider.py     # LLM Provider 统一封装（5 种 provider）
│       │   │   ├── prompts.py      # 提示词模板
│       │   │   ├── structured.py   # 结构化输出 + JSON 清洗修复
│       │   │   └── schemas.py      # LLM 输出 Schema
│       │   ├── config/
│       │   │   └── llm_config.py   # LLM 配置 + 启动校验
│       │   ├── api/                # 业务 API（restaurant/mall/park 等 CRUD）
│       │   ├── service/            # 业务服务层
│       │   ├── repository/         # 数据访问层
│       │   ├── models/
│       │   │   └── schemas.py      # Pydantic 请求/响应模型
│       │   ├── db/
│       │   │   └── database.py     # SQLite 连接管理（单连接 + 写锁）
│       │   ├── mock/
│       │   │   └── data.py         # Mock 种子数据
│       │   ├── constant/           # 常量（错误码/业务常量）
│       │   └── tools/              # 业务工具（搜索/预订/配送）
│       ├── tests/                  # 测试（11 个测试文件）
│       ├── requirements.txt
│       └── leisure_agent.db        # SQLite 数据库（.gitignore 排除）
├── frontend/                       # React + Vite 前端
│   ├── src/
│   │   ├── App.tsx                 # 根组件 + HashRouter 路由
│   │   ├── main.tsx                # 入口文件
│   │   ├── api/
│   │   │   ├── client.ts           # HTTP 客户端封装
│   │   │   └── index.ts            # API 函数 + SSE stream 客户端
│   │   ├── components/
│   │   │   ├── ai-plan/            # AI 规划页面组件
│   │   │   │   ├── ChatArea.tsx    # 聊天区域
│   │   │   │   ├── ChatInput.tsx   # 聊天输入
│   │   │   │   ├── PlanView.tsx    # 方案时间线
│   │   │   │   ├── MessageBubble.tsx# 消息气泡
│   │   │   │   ├── ProcessingRecord.tsx # 处理步骤记录
│   │   │   │   ├── InquiryModal.tsx# 查询结果弹窗
│   │   │   │   ├── ConversationSidebar.tsx # 会话侧边栏
│   │   │   │   ├── constants.ts    # 共享常量和工具函数
│   │   │   │   └── types.ts       # 共享类型
│   │   │   ├── lobby/              # 首页大厅
│   │   │   ├── category/           # 分类板块卡片
│   │   │   ├── PlanMapView.tsx     # 地图视图
│   │   │   ├── ShareModal.tsx      # 分享弹窗
│   │   │   ├── TravelModeSelector.tsx # 出行方式选择
│   │   │   └── Toast.tsx           # Toast 提示
│   │   ├── pages/                  # 页面组件
│   │   │   ├── AIPlanPage.tsx      # AI 一键规划（主页面，编排器）
│   │   │   ├── ManualPlanPage.tsx  # 手动规划
│   │   │   ├── RestaurantPage.tsx  # 餐厅列表
│   │   │   ├── ParkPage.tsx        # 景点列表
│   │   │   ├── MallPage.tsx        # 商场列表
│   │   │   ├── ExhibitionPage.tsx  # 展馆列表
│   │   │   ├── AmusementParkPage.tsx # 游乐园列表
│   │   │   ├── TravelPlanPage.tsx  # 我的计划
│   │   │   └── SharedPlanPage.tsx  # 分享详情页
│   │   └── utils/
│   │       └── shareCode.ts        # 分享码编解码
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── package.json
├── docs/
│   ├── architecture.md             # 本文件
│   ├── api.md                      # API 文档
│   ├── requirements-spec.tex       # 需求规格说明书
│   └── requirements-spec.pdf       # 需求规格说明书 (PDF)
├── assets/                         # README 展示截图
├── .claude/                        # Claude Code 配置
├── docker-compose.yml              # Docker 编排
└── README.md
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

- **前端**：React 纯展示层，通过 SSE 连接 Python 后端获取流式回复。使用 `react-router-dom` HashRouter 声明式路由
- **Python 后端**：FastAPI + LangGraph 编排，负责 NL 理解、活动规划、工具调用、业务逻辑

## Agent 工作流

```
load_session → classify_intent → [路由分发]
  ├─ casual/out_of_domain → direct_reply → END
  ├─ inquiry   → search_inquiry → present_inquiry → END
  ├─ new_plan  → analyze_goal → search_candidates → detect_exceptions
  │            ⇢ (critical_gap) adjust_search → search_candidates (loop, max 2)
  │            → compose_plan → persist_plan
  │            ⇢ (auto_execute) execute_bookings → finalize_executed → END
  │            ⇢ (manual) present_plan → END
  ├─ feedback  → analyze_feedback → (search?) → compose_plan → ... → END
  └─ confirm   → execute_bookings
               ⇢ (failure) replan_execute → persist_plan → execute_bookings (loop, max 2)
               ⇢ (ok) finalize_executed → END
```

## Agent 特性

| 特性 | 说明 |
|------|------|
| **ReAct + Plan&Execute** | 混合模式，支持搜索/执行自愈循环（最多 2 次重试）|
| **LLM → 规则降级** | 每个关键节点 LLM 失败时自动回退规则逻辑，流程不中断 |
| **TF-IDF 语义匹配** | char n-gram 余弦相似度替代硬关键词，提升模糊意图识别 |
| **结构化输出 + JSON 修复** | 原始文本 → JSON 提取 → 清洗修复 → Pydantic 校验，最多 3 次重试 |
| **Prompt Injection 防护** | 中英文双语注入检测（指令覆盖/角色劫持/提示词提取/SQL 注入标记）|
| **安全网兜底** | `_ensure_critical_items` 在 LLM 遗漏 dining/play 时自动补齐 |
| **多 Provider 支持** | OpenAI / Anthropic / Ollama / DeepSeek / OpenAI-Compatible |
| **可观测性** | JSON 结构化日志 + LLM 调用追踪 + 安全网触发计数（持久化）|
| **轻量模型** | classify 节点使用轻量配置（temperature=0, max_tokens=512）加速 |

## 关键目录

- `backend/python/app/agent/` - LangGraph 智能体（graph/nodes/tools/state）
- `backend/python/app/llm/` - LLM 调用层（provider/prompts/structured）
- `backend/python/app/db/` - SQLite 连接与 CRUD（单连接 + 写锁）
- `frontend/src/components/ai-plan/` - AI 规划页面的子组件
- `frontend/src/pages/` - 页面级组件
- `docs/` - 项目文档
