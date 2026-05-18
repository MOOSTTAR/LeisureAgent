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

| 层       | 选型                                |
|----------|-------------------------------------|
| 框架     | Next.js 14 (App Router)             |
| UI 库    | shadcn/ui + Tailwind CSS            |
| AI 集成  | Vercel AI SDK (ai + @ai-sdk/openai) |
| 状态管理 | React Context + useReducer          |
| 动画     | Framer Motion                       |
| 地图     | 高德地图 JS API                     |
| 部署     | Vercel / 本地 Docker                |

## 项目结构

```text
LeisureAgent/
├── frontend/                   # Next.js 前端（现阶段唯一关注的部分）
│   ├── app/
│   │   ├── page.tsx            # 主页面（聊天界面）
│   │   ├── layout.tsx          # 根布局
│   │   ├── globals.css         # 全局样式
│   │   └── api/
│   │       └── chat/
│   │           └── route.ts    # /api/chat 流式接口（Agent 推理入口）
│   ├── components/
│   │   ├── chat/               # 聊天面板、消息气泡
│   │   ├── plan/               # 计划时间线、活动卡片
│   │   ├── booking/            # 预约确认、状态标签
│   │   └── ui/                 # shadcn/ui 组件
│   ├── lib/
│   │   └── agent/              # Agent 核心逻辑
│   │       ├── planner.ts      # Planning 策略
│   │       ├── tools/          # Tool 实现
│   │       │   ├── search.ts   # 搜索餐厅/活动
│   │       │   ├── booking.ts  # 预订/下单
│   │       │   └── delivery.ts # 配送服务
│   │       ├── chain.ts        # Tool call 链路
│   │       └── mock/           # Mock API 数据
│   ├── next.config.js
│   ├── tailwind.config.ts
│   └── package.json
├── .claude/
│   ├── skills/
│   ├── agents/
│   └── CLAUDE.md
└── design/                     # 设计文档（Planning 策略、调用链路、异常处理）
    └── design-doc.md
```

## 命令

开发：
```bash
npm run dev
```

构建：
```bash
npm run build
```

测试：
```bash
npm run test
```

## 架构

<!-- Add architecture notes here -->

## 关键目录

- `.claude/skills/` - 自定义技能定义
- `.claude/agents/` - 自定义 Agent 定义
- `lib/agent/` - Agent 核心逻辑（Planner + Tools）
- `lib/mock/` - Mock API 数据
- `components/chat/` - 聊天界面组件
- `components/plan/` - 计划展示组件

## 开发规范

- 使用中文回复
- 优先使用 shadcn/ui 组件，避免引入额外 UI 库
- Tool 调用链路需包含完整的错误处理和回退逻辑
- Mock 数据需覆盖正常流程和异常场景
