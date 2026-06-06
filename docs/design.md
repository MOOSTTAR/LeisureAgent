# LeisureAgent 设计文档

## 1. Planning 策略 — ReAct + Plan&Execute 混合模式

### 1.1 整体流程

```
用户输入 → load_session → classify_intent ──[路由分发]──┐
  ├─ casual/out_of_domain → direct_reply → END           │
  ├─ inquiry → search_inquiry → present_inquiry → END    │
  ├─ new_plan → analyze_goal → search → detect → compose │
  │     → persist → (auto?执行:展示)                        │
  ├─ feedback → analyze_feedback → (search?) → compose   │
  │     → persist → present → END                         │
  └─ confirm → execute_bookings → finalize_executed → END│
```

### 1.2 意图分类 (classify)

支持 6 种意图类型，LLM + 规则双重保障：

| 意图 | 路由 | 触发条件 |
|------|------|----------|
| `casual` | direct_reply | 寒暄问候 |
| `out_of_domain` | direct_reply | 超出领域 |
| `clarify` | direct_reply | 模糊查询需反问 |
| `inquiry` | search_inquiry | 浏览/查询意图 |
| `new_plan` | analyze_goal | 新规划请求 |
| `feedback` | analyze_feedback | 对已有方案的修改 |
| `confirm` | execute_bookings | 确认执行预约 |

**快速路径优化**：有 pending 方案时，确认/反馈关键词直接路由，跳过 LLM 调用。

**降级机制**：LLM 调用失败 → 规则分类（TF-IDF 语义匹配 + 关键词）。

### 1.3 方案编排 (compose)

**场景驱动**：三种场景配置（family/friends/other），驱动候选选择优先级：

| 场景 | 活动优先 | 餐厅策略 | 特征 |
|------|----------|----------|------|
| `family` | amusement_park > scenic_spot | 偏好火锅/中餐 | 儿童友好 |
| `friends` | exhibition_hall > scenic_spot | 默认第一项 | 拍照聊天 |
| `other` | amusement_park > scenic_spot > exhibition_hall | 默认第一项 | 通用 |

**编排流程**：
1. LLM 一站式生成（5 项）+ 结构化 JSON 输出 + Pydantic 校验
2. 多日校验：day_num 分布不满足 day_count → LLM 重试 → 规则强制拆分
3. 结构补全（安全网）：`_ensure_critical_items` 检测 dining/play 缺失，从候选池自动补齐
4. 用户提及地点：`_extract_named_locations` 确保用户输入中提到的地点在候选列表，即使搜索未命中

**降级机制**：LLM 失败 → 场景配置驱动的规则编排。

## 2. 工具调用链路

### 2.1 搜索 (search)

```
search_candidates_node
  ├── 读取 constraints（场景/人数/预算/距离/菜系）
  ├── search_local_candidates() 遍历 5 类场所表
  │     ├── restaurant: 按菜系/距离/用餐方式筛选
  │     ├── scenic_spot: 按类型/人流量筛选
  │     ├── amusement_park: 按主题/价格筛选
  │     ├── exhibition_hall: 按类型/免费/收费筛选
  │     └── mall: 按影院/超市筛选
  ├── _extract_named_locations() 提取用户提及的具体地点
  └── 返回 candidates: dict[category, list[item]]
```

### 2.2 异常检测 (detect)

```
detect_exceptions_node
  ├── _check_availability() 检查每个候选的可预约状态
  ├── _is_fully_booked() 判断是否已满
  └── _can_book() 判断是否需要预约
      └── 返回 exceptions + warnings
          ├── critical_gaps=True → adjust_search (放宽约束重搜, 上限2次)
          └── critical_gaps=False → compose_plan
```

### 2.3 持久化 (persist)

```
persist_plan_node
  ├── travel_plan_service.create() 创建方案记录
  ├── for each item:
  │     ├── _check_need_booking() 判断是否需预约
  │     ├── travel_plan_item_service.create() 写入明细
  │     │     ├── 场馆存在性检查
  │     │     ├── 预约名额检查
  │     │     ├── 时段冲突检测（仅同 day_num 内）
  │     │     └── INSERT 到 DB
  │     └── 失败 → WARNING 日志 + 保留在内存方案
  └── 返回 persisted plan
```

### 2.4 执行预约 (execute)

```
execute_bookings_node (ReAct 自愈循环, 上限2次)
  ├── preflight_check() 预检查
  ├── for each plan_item:
  │     ├── 无需预约 → "无需预约"
  │     ├── 无容量限制 → 直接标记已预约
  │     ├── 有容量限制 → 原子 UPDATE WHERE
  │     │     UPDATE {table} SET current = current + 1
  │     │     WHERE id=? AND current < max
  │     │     └── rowcount=0 → "已约满"
  │     └── UPDATE travel_plan_item SET is_had_booking=1
  └── 有失败项 + 未达重试上限
        ├── replan_execute_node → 从 candidates 找同类替代
        └── 重试执行 (loop)
```

### 2.5 咨询模式 (inquiry)

```
search_inquiry_node → present_inquiry_node
  └── 返回 InquiryEvent（含可用性/预约状态）
      └── 前端展示 Yes/No/Other 弹窗
```

## 3. 异常处理机制

### 3.1 LLM 降级

每个关键节点有 LLM → 规则的完整降级链路：

| 节点 | LLM 路径 | 规则降级 | 触发条件 |
|------|----------|----------|----------|
| classify_intent | DeepSeek 轻量模式 | TF-IDF + 关键词 | 调用失败/超时 |
| analyze_goal | DeepSeek | 默认约束 | 调用失败 |
| compose_plan | DeepSeek (max_tokens=4096) | `_SCENARIO_CONFIG` 驱动 | 调用失败 |

**结构化输出安全网**：`invoke_structured()` 内嵌 JSON 提取 → 清洗修复 → Pydantic 校验 → 最多 3 次重试。

### 3.2 ReAct 自愈循环

```
搜索自愈: detect_exceptions → critical_gaps + attempt < 2
  → adjust_search (放宽距离/预算/类型约束)
  → search_candidates (重新搜索)
  → detect_exceptions (再次检测)

执行自愈: execute_bookings → 有失败项 + attempt < 2
  → replan_execute (同类替代, 不调 LLM)
  → persist_plan → execute_bookings (重试)
```

### 3.3 结构安全网

`_ensure_critical_items` 在 LLM 生成方案后检查：
- 是否缺少 `dining` → 从 restaurant 候选池选第一项补齐
- 是否缺少 `play` → 按场景优先级从活动候选池补齐
- 每次触发记录 `safety_net` 指标 + WARNING 日志

### 3.4 输入安全

`input_guard.check_user_input()` 在 `load_session` 阶段拦截：
- **注入检测**：22 个正则模式覆盖英文/中文的指令覆盖、角色劫持、提示词提取、SQL 注入标记
- **清洗**：控制字符 + 零宽字符去除
- **长度限制**：2000 字符上限
- **拦截后**：返回 guard_reject 事件，不进入 LLM

### 3.5 并发安全

- **数据库连接**：单连接 + `threading.Lock()` 写锁 + WAL 模式
- **预约原子性**：`BEGIN IMMEDIATE` + `UPDATE WHERE current < max`，`rowcount=0` 判满
- **配置校验**：启动时 `validate_config()` 检查 API key，缺失提前 WARNING

### 3.6 处理步骤透明化

每个节点通过 SSE `token` 事件推送进度，前端实时展示处理步骤和耗时：

```
正在分类意图（Agent）... 7.8s
正在解析出行需求... 16.3s
Agent 正在编排行程方案... 64.7s
```

步骤记录持久化到 DB，会话恢复时可回放历史处理记录。

## 4. 架构总览

```
┌───────────────────────────────────────────────────────┐
│                      Frontend (React)                  │
│  HashRouter → SSE Stream → 聊天界面 + 时间线 + 地图     │
└──────────────────┬────────────────────────────────────┘
                   │ SSE (token/plan/inquiry/execute_result)
┌──────────────────▼────────────────────────────────────┐
│                  FastAPI (app/main.py)                 │
│  /api/chat/stream  /api/chat  /api/agent/*            │
└──────────────────┬────────────────────────────────────┘
                   │
┌──────────────────▼────────────────────────────────────┐
│              LangGraph (app/agent/)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │
│  │ Classify │→│  Search  │→│ Compose (LLM+Rule) │    │
│  │ (LLM+TF) │  │ (5类场所) │  │ + Safety Net     │    │
│  └──────────┘  └──────────┘  └──────┬───────────┘    │
│                                     │                 │
│  ┌──────────┐  ┌──────────┐  ┌──────▼───────────┐    │
│  │ Execute  │←│ Feedback │←│ Persist + Present │    │
│  │ (原子SQL) │  │ (ReAct)  │  │ (时段冲突检测)    │    │
│  └──────────┘  └──────────┘  └──────────────────┘    │
└──────────────────┬────────────────────────────────────┘
                   │
┌──────────────────▼────────────────────────────────────┐
│                SQLite (WAL + 写锁)                     │
│  restaurant / mall / amusement_park / scenic_spot     │
│  exhibition_hall / travel_plan / travel_plan_item     │
│  agent_session / agent_message / metrics_counter      │
└───────────────────────────────────────────────────────┘
```
