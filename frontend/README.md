# LeisureAgent 前端

基于 Next.js 16 + shadcn/ui 构建的移动端优先聊天式 AI Agent 交互界面。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 框架 | Next.js 16 (App Router) |
| UI | shadcn/ui + Tailwind CSS v3 |
| AI | Vercel AI SDK v6 + @ai-sdk/openai |
| 动画 | Framer Motion |
| 状态 | React Context + useReducer |

## 核心模块

| 目录 | 说明 |
| --- | --- |
| `components/chat/` | 聊天面板、消息气泡、输入框、欢迎页 |
| `components/plan/` | 方案时间线、活动卡片、摘要面板 |
| `components/booking/` | 预订卡片、配送卡片、状态标签 |
| `components/ui/` | shadcn/ui 基础组件 |
| `lib/agent/` | Agent 核心逻辑（Planner + Tools + Mock） |
| `lib/store/` | 状态管理（Context + Reducer） |
| `app/api/chat/` | SSE 流式对话接口 |

## 快速开始

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:3000`。

## 环境变量

复制 `.env.local.example` 为 `.env.local` 并填写：

```bash
OPENAI_API_KEY=your-api-key
OPENAI_BASE_URL=https://api.openai.com/v1  # 可选，自定义 API 地址
OPENAI_MODEL=gpt-4o-mini                      # 可选
```
