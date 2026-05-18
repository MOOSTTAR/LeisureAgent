# LeisureAgent

本地场景短时活动规划与执行 Agent —— 接受自然语言输入，输出可执行的活动方案并自动完成下单/预订。

## 场景示例

> "今天下午是空的，想和老婆孩子出去玩几个小时，别离家太远，帮我安排一下。"

Agent 会在几分钟内完成：
1. 规划 4-6 小时的综合方案（去哪玩 → 去哪吃 → 额外活动）
2. 查餐厅是否有位置、是否需要排队
3. 安排吃喝玩乐的可执行方案
4. 一键下单/预约/配送

## 技术栈

| 层       | 选型                                |
|----------|-------------------------------------|
| 前端框架 | Next.js 14 (App Router)             |
| UI 库    | shadcn/ui + Tailwind CSS            |
| AI 集成  | Vercel AI SDK (ai + @ai-sdk/openai) |
| 状态管理 | React Context + useReducer          |
| 动画     | Framer Motion                       |
| 地图     | 高德地图 JS API                     |
## 项目结构

```
├── frontend/    # Next.js 前端（含 Agent 逻辑、API Route）
├── design/      # 设计文档
└── .claude/     # Claude Code 配置
```

## 快速开始

```bash
cd frontend
npm install
npm run dev
```

## 交付目标

1. Web UI —— 移动端优先的聊天式交互界面
2. 完整 Tool 实现代码 —— 含 Mock API 调用
3. 设计文档 —— Planning 策略、工具调用链路、异常处理机制
