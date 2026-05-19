# frontend — 前端（Next.js + shadcn/ui）

## 职责

纯 UI 层，提供移动端优先的聊天式交互界面，通过 SSE 与 Python Agent 后端通信。

## 核心模块

| 模块 | 说明 |
|------|------|
| `components/chat/` | 聊天面板、消息气泡 |
| `components/plan/` | 计划时间线、活动卡片 |
| `components/booking/` | 预约确认、状态标签 |
| `components/ui/` | shadcn/ui 基础组件 |
| `lib/api-client.ts` | 后端 SSE API 调用封装 |

## 快速开始

```bash
cd frontend
npm install
npm run dev
```

## 依赖

- Next.js 14 (App Router)
- shadcn/ui + Tailwind CSS
- Framer Motion
- React Context + useReducer