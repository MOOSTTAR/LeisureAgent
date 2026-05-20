# 开发规范

## 核心规范

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
