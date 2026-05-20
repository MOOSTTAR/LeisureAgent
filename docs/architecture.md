# 项目架构

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
