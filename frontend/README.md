# frontend — React + TypeScript + Vite

## 技术栈

| 切面 | 技术组件 | 核心作用 |
|------|----------|----------|
| 框架 | React 19 | 构建 Web UI 交互界面 |
| 构建工具 | Vite 8 | 极速的前端构建工具 |
| 语言 | TypeScript 6 | 类型安全 |
| UI 库 | Tailwind CSS 4 | 快速编写精美、响应式的 UI |
| 动画 | Framer Motion 12 | 页面转场和交互动画 |
| 路由 | React Router 7 | 声明式 HashRouter 路由 |
| 图标 | Phosphor Icons | 轻量图标库 |

## 项目结构

```
src/
├── App.tsx                 # 根组件 + HashRouter 路由 + 卡片转场动画
├── main.tsx                # 入口文件
├── api/
│   ├── client.ts           # HTTP 客户端封装（get/post/put/del）
│   └── index.ts            # API 函数 + SSE stream 客户端 + 类型定义
├── components/
│   ├── ai-plan/            # AI 规划页面组件
│   │   ├── ChatArea.tsx    # 聊天区域（消息列表 + 入场动画 + 滚动控制）
│   │   ├── ChatInput.tsx   # 聊天输入框
│   │   ├── PlanView.tsx    # 方案时间线（Yes/No/Other 交互）
│   │   ├── MessageBubble.tsx # 消息气泡 + 装饰粒子动画
│   │   ├── ProcessingRecord.tsx # 处理步骤记录（实时计时）
│   │   ├── InquiryModal.tsx# 查询结果弹窗（多选/全选/自定义）
│   │   ├── ConversationSidebar.tsx # 会话侧边栏
│   │   ├── constants.ts    # 共享常量和工具函数
│   │   └── types.ts       # 共享类型定义
│   ├── lobby/              # 首页大厅（入口卡片）
│   ├── category/           # 分类板块卡片
│   ├── PlanMapView.tsx     # 地图视图（多日行程可视化）
│   ├── ShareModal.tsx      # 分享弹窗
│   ├── TravelModeSelector.tsx # 出行方式选择
│   ├── CustomSelect.tsx    # 自定义下拉选框
│   ├── AddToPlanModal.tsx  # 添加到计划弹窗
│   └── Toast.tsx           # Toast 通知
├── pages/
│   ├── AIPlanPage.tsx      # AI 一键规划（主编排页面）
│   ├── ManualPlanPage.tsx  # 手动规划（分类选择）
│   ├── RestaurantPage.tsx  # 餐厅列表（筛选/CRUD）
│   ├── ParkPage.tsx        # 户外景点列表
│   ├── MallPage.tsx        # 商场列表
│   ├── ExhibitionPage.tsx  # 展馆列表
│   ├── AmusementParkPage.tsx # 游乐园列表
│   ├── TravelPlanPage.tsx  # 我的计划（列表/详情/CRUD）
│   └── SharedPlanPage.tsx  # 分享详情页（只读）
└── utils/
    └── shareCode.ts        # 分享码编解码（Base64）
```

## 路由

```
/                          → Lobby（首页大厅）
/manual-plan              → ManualPlanPage（手动规划）
/manual-plan/restaurant   → RestaurantPage（餐厅）
/manual-plan/park         → ParkPage（户外景点）
/manual-plan/mall         → MallPage（商场）
/manual-plan/exhibition   → ExhibitionPage（展馆）
/manual-plan/amusement    → AmusementParkPage（游乐园）
/ai-plan                  → AIPlanPage（AI 一键规划）
/travel-plans             → TravelPlanPage（我的计划）
/travel-plans/:shareCode  → SharedPlanPage（分享详情）
```

## 快速开始

```bash
cd frontend
npm install
npm run dev
```

## 通信

前端通过 SSE（Server-Sent Events）与 Python 后端通信：

| SSE 事件 | 说明 |
|----------|------|
| `token` | 节点执行进度（含当前节点、步骤状态、消息）|
| `plan` | 完整方案 JSON |
| `inquiry` | 查询结果（浏览/咨询模式）|
| `exceptions` | 异常/警告信息 |
| `stage` | 会话阶段变更 |
| `execute_result` | 预约执行结果 |
| `step` | 自定义步骤标签 |
| `done` | 流程完成 |
| `error` | 执行异常 |
