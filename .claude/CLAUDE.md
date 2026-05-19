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
