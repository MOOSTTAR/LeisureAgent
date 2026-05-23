# API 文档

LeisureAgent 后端 API 接口定义。所有接口已通过 FastAPI 实现，支持完整的 CRUD 操作。

## 端点概览

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/restaurants` | GET | 获取餐厅列表 |
| `/api/restaurants` | POST | 创建餐厅 |
| `/api/restaurants/get_booking_list` | GET | 获取可预约餐厅列表 |
| `/api/restaurants/{id}` | GET | 获取单个餐厅详情 |
| `/api/restaurants/{id}` | PUT | 更新餐厅信息 |
| `/api/restaurants/{id}` | DELETE | 删除餐厅 |
| `/api/parks` | GET | 获取户外景点列表 |
| `/api/parks` | POST | 创建景点 |
| `/api/parks/get_booking_list` | GET | 获取可预约户外景点列表 |
| `/api/parks/{id}` | GET | 获取单个景点详情 |
| `/api/parks/{id}` | PUT | 更新景点信息 |
| `/api/parks/{id}` | DELETE | 删除景点 |
| `/api/malls` | GET | 获取商场列表 |
| `/api/malls` | POST | 创建商场 |
| `/api/malls/{id}` | GET | 获取单个商场详情 |
| `/api/malls/{id}` | PUT | 更新商场信息 |
| `/api/malls/{id}` | DELETE | 删除商场 |
| `/api/exhibition-halls` | GET | 获取展馆列表 |
| `/api/exhibition-halls` | POST | 创建展馆 |
| `/api/exhibition-halls/get_booking_list` | GET | 获取可预约展馆列表 |
| `/api/exhibition-halls/{id}` | GET | 获取单个展馆详情 |
| `/api/exhibition-halls/{id}` | PUT | 更新展馆信息 |
| `/api/exhibition-halls/{id}` | DELETE | 删除展馆 |
| `/api/amusement-parks` | GET | 获取游乐园列表 |
| `/api/amusement-parks` | POST | 创建游乐园 |
| `/api/amusement-parks/get_booking_list` | GET | 获取可预约游乐园列表 |
| `/api/amusement-parks/{id}` | GET | 获取单个游乐园详情 |
| `/api/amusement-parks/{id}` | PUT | 更新游乐园信息 |
| `/api/amusement-parks/{id}` | DELETE | 删除游乐园 |
| `/api/travel-plans` | GET | 获取计划方案列表 |
| `/api/travel-plans` | POST | 创建计划方案 |
| `/api/travel-plans/{id}` | GET | 获取单个计划详情 |
| `/api/travel-plans/{id}` | PUT | 更新计划信息 |
| `/api/travel-plans/{id}` | DELETE | 删除计划 |
| `/api/travel-plan-items` | GET | 获取计划明细列表 |
| `/api/travel-plan-items` | POST | 创建计划明细 |
| `/api/travel-plan-items/{id}` | GET | 获取单个计划明细详情 |
| `/api/travel-plan-items/{id}` | PUT | 更新计划明细信息 |
| `/api/travel-plan-items/{id}` | DELETE | 删除明细 |
| `/api/chat/stream` | POST | SSE 流式聊天（Agent 核心入口） |
| `/api/chat` | POST | 同步聊天（非流式） |
| `/api/agent/sessions` | GET | 列出所有会话 |
| `/api/agent/sessions/{session_id}` | GET | 获取会话详情 |
| `/api/agent/sessions/{session_id}` | DELETE | 删除会话 |
| `/api/agent/plans/{plan_id}/share` | GET | 获取方案分享数据 |
| `/api/agent/plans/{plan_id}/execute` | POST | 用户确认后执行预约 |

---

## 通用响应格式

所有接口统一返回格式：

```json
{
  "code": 0,
  "data": { ... },
  "msg": "success"
}
```

**状态码说明：**
- `code = 0`：成功
- `code != 0`：失败，`msg` 中包含错误信息

**列表响应格式：**

```json
{
  "code": 0,
  "data": {
    "list": [ ... ],
    "total": 50,
    "page": 1,
    "page_size": 5
  },
  "msg": "success"
}
```

**错误响应：**

```json
{
  "code": 404,
  "data": null,
  "msg": "餐厅不存在"
}
```

**常见错误码：**

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 409 | 时间段冲突 |
| 500 | 服务器内部错误 |

---

## 公共规则

### 距离计算规则
- 距离 = |x| + |y|（单位：米）
- >= 1000 米时转换为千米，如 `1.7km`

### 距离筛选参数
| 值 | 说明 |
|------|------|
| `<200m` | 200 米以内 |
| `<500m` | 500 米以内 |
| `<1.0km` | 1 千米以内 |
| `<2.0km` | 2 千米以内 |
| `other` | 2 千米以外 |

### 分页参数
所有列表接口默认支持分页：

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 5 | 每页数量，最大 50 |

---

## `/api/restaurants` - 餐厅

### GET 获取列表

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 餐厅名字模糊搜索 |
| `cuisine_type` | string | 否 | 菜系：中餐/西餐/日料/火锅/烧烤/快餐/其他 |
| `dining_style` | integer | 否 | 用餐方式：0 堂食/1 外卖/2 均可 |
| `distance` | string | 否 | 距离筛选 |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 5 |

**响应字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 餐厅 ID |
| `name` | string | 餐厅名字 |
| `address` | string | 详细地址 |
| `x` | integer | 坐标系横坐标（用于计算距离） |
| `y` | integer | 坐标系纵坐标（用于计算距离） |
| `cuisine_type` | string | 菜系 |
| `dining_style` | integer | 用餐方式：0 堂食/1 外卖/2 均可 |
| `tags` | string[] | 标签列表 |
| `business_hours` | string | 营业时间 |
| `booking_hours` | string | 可预约时段，"不能预约"表示不可预约 |
| `current_booking_count` | integer | 当前已预约数量，-1 表示无效 |
| `max_booking_count` | integer | 最大预约容量，-1 表示无效 |
| `queue_time` | integer | 预计排队时间（分钟），-1 表示无需排队 |
| `indoor_env` | string | 室内环境描述 |

**预约/排队逻辑（三选一）：**
1. 只预约不排队：`booking_hours` 有效，`queue_time = -1`
2. 只排队不预约：`queue_time > 0`，`booking_hours = "不能预约"`
3. 既不排队也不预约：`queue_time = -1`，`booking_hours = "不能预约"`

### GET /{id} 获取详情
路径参数 `id`：餐厅 ID。

### POST 创建
请求体为 JSON 对象，字段同响应字段（不含 `id`）。

### PUT /{id} 更新
路径参数 `id`：餐厅 ID。请求体为需要更新的字段。

### DELETE /{id} 删除
路径参数 `id`：餐厅 ID。

### GET /get_booking_list 获取可预约餐厅

筛选 `booking_hours` 不为空且不等于"不能预约"的餐厅列表。

**查询参数：**

| 参数 | 类型 | 必填 | 默认值 | 描述 |
|------|------|------|--------|------|
| `page` | integer | 否 | 1 | 页码 |
| `page_size` | integer | 否 | 5 | 每页数量，最大 50 |

**响应：** 标准分页格式，`data.list` 为餐厅对象数组。

---

## `/api/parks` - 户外景点

### GET 获取列表

**查询参数：**

| 参数            | 类型 | 必填 | 描述                 |
|---------------|------|------|--------------------|
| `name`        | string | 否 | 景点名字模糊搜索           | 
| `spot_type`   | string | 否 | 景点类型枚举             | 
| `crowd_level` | integer | 否 | 人流量：1 稀少/2 适中/3 拥挤 |
| `distance`    | string | 否 | 距离筛选               |
| `page`        | integer | 否 | 页码，默认 1            |
| `page_size`   | integer | 否 | 每页数量，默认 5          |

**响应字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 景点 ID |
| `name` | string | 景点名字 |
| `address` | string | 详细地址 |
| `x` | integer | 坐标系横坐标 |
| `y` | integer | 坐标系纵坐标 |
| `spot_type` | string | 景点类型：山水/古迹/人文/溶洞等 |
| `business_hours` | string | 开放时间 |
| `booking_hours` | string | 可预约时段 |
| `current_booking_count` | integer | 当前已预约数量，-1 表示无效 |
| `max_booking_count` | integer | 最大预约容量，-1 表示无效 |
| `crowd_density` | integer | 人流量：1 稀少/2 适中/3 拥挤 |

### GET/POST/PUT/DELETE
同餐厅接口模式。

### GET /get_booking_list 获取可预约户外景点

筛选 `booking_hours` 不为空且不等于"不能预约"的景点列表。查询参数同餐厅 `get_booking_list`。

---

## `/api/malls` - 商场

### GET 获取列表

**查询参数：**

| 参数                | 类型      | 必填 | 描述                 |
|-------------------|---------|------|--------------------|
| `has_cinema`      | boolean | 否 | 是否有影院：true/false   |
| `name`            | string | 否 | 商场名字               |
| `has_supermarket` | boolean | 否 | 是否有大型超市：true/false |
| `distance`        | string  | 否 | 距离筛选               |
| `page`            | integer | 否 | 页码，默认 1            |
| `page_size`       | integer | 否 | 每页数量，默认 5          |

**响应字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 商场 ID |
| `name` | string | 商场名字 |
| `address` | string | 详细地址 |
| `x` | integer | 坐标系横坐标 |
| `y` | integer | 坐标系纵坐标 |
| `cinema_has` | integer | 是否有影院：0 无/1 有 |
| `supermarket_has` | integer | 是否有大型超市：0 无/1 有 |

### GET/POST/PUT/DELETE
同餐厅接口模式。

---

## `/api/exhibition-halls` - 展馆

### GET 获取列表

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 展馆名字模糊搜索 |
| `hall_type` | string | 否 | 展馆类型：历史/艺术/科技/自然 |
| `free_entry` | boolean | 否 | 是否免费：true/false |
| `distance` | string | 否 | 距离筛选 |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 5 |

**响应字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 展馆 ID |
| `name` | string | 展馆名字 |
| `address` | string | 详细地址 |
| `x` | integer | 坐标系横坐标 |
| `y` | integer | 坐标系纵坐标 |
| `hall_type` | string | 展馆类型：历史/艺术/科技/自然 |
| `business_hours` | string | 开放时间 |
| `booking_hours` | string | 可预约时段 |
| `current_booking_count` | integer | 当前已预约数量，-1 表示无效 |
| `max_booking_count` | integer | 最大预约容量，-1 表示无效 |
| `exhibition_theme` | string | 主打展览主题 |
| `ticket_type` | integer | 门票类型：0 免费/1 收费 |
| `ticket_price` | number | 门票价格 |
| `manual_guide` | integer | 是否有人工讲解：0 无/1 有 |
| `interactive_project` | integer | 有无互动体验项目：0 无/1 有 |
| `crowd_level` | integer | 人流量：1 偏少/2 适中/3 拥挤 |

### GET/POST/PUT/DELETE
同餐厅接口模式。

### GET /get_booking_list 获取可预约展馆

筛选 `booking_hours` 不为空且不等于"不能预约"的展馆列表。查询参数同餐厅 `get_booking_list`。

---

## `/api/amusement-parks` - 游乐园

### GET 获取列表

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 乐园名字模糊搜索 |
| `park_theme` | string | 否 | 乐园主题：童话/海洋/科幻/卡通 |
| `free_entry` | boolean | 否 | 是否免费入园：true/false |
| `distance` | string | 否 | 距离筛选 |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 5 |

**响应字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 乐园 ID |
| `name` | string | 乐园名字 |
| `address` | string | 详细地址 |
| `x` | integer | 坐标系横坐标 |
| `y` | integer | 坐标系纵坐标 |
| `business_hours` | string | 营业时间 |
| `booking_hours` | string | 可预约时段 |
| `current_booking_count` | integer | 当前已预约数量，-1 表示无效 |
| `max_booking_count` | integer | 最大预约容量，-1 表示无效 |
| `park_theme` | string | 乐园主题：童话/海洋/科幻/卡通等 |
| `ticket_price` | number | 门票价格 |
| `queue_time` | integer | 预计排队时间（分钟），-1 表示无需排队 |
| `performance_info` | string | 演出/表演信息 |

### GET/POST/PUT/DELETE
同餐厅接口模式。

### GET /get_booking_list 获取可预约游乐园

筛选 `booking_hours` 不为空且不等于"不能预约"的游乐园列表。查询参数同餐厅 `get_booking_list`。

---

## `/api/travel-plans` - 旅行方案

### GET 获取列表

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `title` | string | 否 | 方案标题搜索 |
| `travel_type` | string | 否 | 游玩类型：亲子/美食/逛街/风景/人文/探险/文化/自然/休闲/购物/单人出行 |
| `travel_date` | string | 否 | 出行日期：YYYY-MM-DD |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 5 |

**响应字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 方案 ID |
| `plan_title` | string | 方案标题 |
| `plan_desc` | string | 方案简介/备注 |
| `travel_days` | integer | 行程天数 |
| `travel_type` | string | 游玩类型 |
| `travel_date` | string | 计划出行日期 |
| `total_cost` | number | 预估总花费 |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

### GET/POST/PUT/DELETE
同餐厅接口模式。

---

## `/api/travel-plan-items` - 方案明细

### GET 获取列表

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `plan_id` | integer | 否 | 关联方案 ID |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 10 |

**响应字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 明细 ID |
| `plan_id` | integer | 关联方案 ID |
| `location_table_name` | string | 关联场所表名称 |
| `location_id` | integer | 场所表中具体 ID |
| `day_num` | integer | 第几天行程 |
| `arrive_time` | string | 预计到达时间 |
| `leave_time` | string | 预计离开时间 |
| `stay_minute` | integer | 停留时长（分钟） |
| `remark` | string | 本段行程备注 |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

### POST 创建明细

**请求体（Pydantic 自动校验，arrive_time/leave_time 支持 "8:06" 或 "08:06" 格式）：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `plan_id` | integer | 是 | 关联方案 ID |
| `location_table_name` | string | 是 | 关联场所表名称（如 restaurants） |
| `location_id` | integer | 是 | 场所表中具体 ID |
| `day_num` | integer | 否 | 第几天行程，默认 1（仅支持 1 或 2） |
| `arrive_time` | string | 否 | 预计到达时间，格式 HH:MM（支持 `8:06` 或 `08:06`） |
| `leave_time` | string | 否 | 预计离开时间，格式 HH:MM（支持 `8:06` 或 `08:06`） |
| `stay_minute` | integer | 否 | 停留时长（分钟），默认 0 |
| `remark` | string | 否 | 本段行程备注 |

**后端业务校验（按顺序执行）：**

1. **时间合法性**：`arrive_time` 必须早于 `leave_time`，否则返回 `{ code: 400, msg: "到达时间必须早于离开时间" }`
2. **预约名额检查**：查询场所的 `current_booking_count` 和 `max_booking_count`，若两者均 >= 0 且 `current_booking_count >= max_booking_count`，拒绝创建，返回 `{ code: 400, msg: "预约名额已满" }`
3. **排队时间调整**：若场所的 `queue_time > 0`，实际 `arrive_time` 应自动提前 `queue_time` 分钟，冲突检测以调整后的时间段为准（不影响入库的 `arrive_time` 原始值）
4. **时间段冲突检测**：新增明细的 `[调整后 arrive_time, leave_time]` 不能与同一 `plan_id` 下已有明细的时间段重叠。重叠判定公式：`!(newEnd <= existStart \|\| newStart >= existEnd)`。冲突时返回 `{ code: 409, msg: "时间段冲突" }`

**成功响应：**

```json
{ "code": 0, "data": { "id": 13 }, "msg": "创建成功" }
```

**错误响应示例：**

```json
{ "code": 409, "data": null, "msg": "时间段冲突" }
```

```json
{ "code": 400, "data": null, "msg": "预约名额已满" }
```

### GET /{id} 获取详情

路径参数 `id`：明细 ID。返回单个明细对象。

### PUT /{id} 更新

路径参数 `id`：明细 ID。请求体为需要更新的字段。

### DELETE /{id} 删除

路径参数 `id`：明细 ID。

---

---

## Agent 接口

以下接口为 LeisureAgent 智能规划核心流程提供支持，基于 LangGraph 工作流编排，支持 LLM 驱动或规则驱动（可通过环境变量切换）。

### 核心流程

```
用户输入 → 解析意图 → 搜索候选 → 生成方案 → 持久化 → 返回方案 → 用户确认 → 执行预约
```

---

## `/api/chat/stream` - SSE 流式聊天

Agent 核心入口。接收用户输入，执行完整规划流程，以 SSE（Server-Sent Events）格式流式返回中间状态和最终方案。

### POST

**请求体：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `message` | string | 是 | 用户输入消息（1-2000 字符） |
| `session_id` | string | 否 | 会话 ID，空字符串表示创建新会话 |

**SSE 事件类型：**

| 事件 | 描述 |
|------|------|
| `token` | 节点执行进度，包含当前节点名称、步骤状态、消息内容 |
| `plan` | 完整方案 JSON，生成后推送 |
| `done` | 流程完成 |
| `error` | 执行异常 |

**`token` 事件数据格式：**

```json
{
  "node": "compose_plan",
  "current_step": "persist",
  "message": "已找到候选地点：..."
}
```

**`plan` 事件数据格式：**

```json
{
  "id": 52,
  "title": "家庭亲子半日可执行方案",
  "description": "按亲子友好...",
  "scenario": "family",
  "travel_type": "亲子",
  "total_cost": 1596.0,
  "items": [
    {
      "step_order": 1,
      "activity_type": "play",
      "location_table_name": "amusement_park",
      "location_id": 39,
      "location_name": "童话峡谷",
      "address": "石景山区...",
      "arrive_time": "14:00",
      "leave_time": "15:40",
      "stay_minute": 100,
      "remark": "亲子友好，适合 5 岁孩子...",
      "estimated_cost": 1196.0
    }
  ],
  "share_text": "搞定了，14:00 出发...",
  "share_url": "/api/agent/plans/52/share"
}
```

**前端接入示例：**

```javascript
const eventSource = new EventSource('/api/chat/stream', {
  method: 'POST',
  body: JSON.stringify({ message: '下午带老婆孩子出去玩', session_id: '' })
});

eventSource.addEventListener('token', (e) => {
  const data = JSON.parse(e.data);
  console.log('节点:', data.node, '步骤:', data.current_step);
});

eventSource.addEventListener('plan', (e) => {
  const plan = JSON.parse(e.data);
  // 展示方案，显示确认按钮
});

eventSource.addEventListener('done', () => {
  eventSource.close();
});
```

---

## `/api/chat` - 同步聊天

与 `/api/chat/stream` 相同流程，但以同步 JSON 响应返回完整结果，适合不需要流式体验的场景。

### POST

**请求体：** 同 `/api/chat/stream`

**响应：**

```json
{
  "session_id": "abc123",
  "reply": "搞定了，14:00 出发...",
  "plan": { ... },
  "share_text": "搞定了，14:00 出发...",
  "share_url": "/api/agent/plans/52/share",
  "current_step": "done"
}
```

| 字段 | 类型 | 描述 |
|------|------|------|
| `session_id` | string | 会话 ID |
| `reply` | string | 最终回复文本 |
| `plan` | object | 完整方案对象（同 SSE plan 事件） |
| `share_text` | string | 分享文案 |
| `share_url` | string | 分享链接 |
| `current_step` | string | 当前步骤状态 |

---

## `/api/agent/sessions` - 会话列表

### GET

获取所有会话列表，按更新时间倒序排列。

**响应：**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": "abc123",
        "title": "下午带老婆孩子出去玩",
        "last_message": "搞定了，14:00 出发...",
        "current_plan_id": 52,
        "status": 0,
        "created_at": "2025-05-23 14:00:00",
        "updated_at": "2025-05-23 14:05:00"
      }
    ],
    "total": 1
  },
  "msg": "success"
}
```

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | string | 会话 ID（UUID） |
| `title` | string | 会话标题（取首条消息前 24 字） |
| `last_message` | string | 最后一条消息内容 |
| `current_plan_id` | integer | 当前关联的方案 ID |
| `status` | integer | 会话状态：0 = active（进行中）/ 1 = completed（已生成方案）|
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

---

## `/api/agent/sessions/{session_id}` - 会话详情

### GET

获取单个会话的完整信息，包含历史消息。

**路径参数：** `session_id` - 会话 ID

**响应：**

```json
{
  "code": 0,
  "data": {
    "id": "abc123",
    "title": "下午带老婆孩子出去玩",
    "last_message": "搞定了...",
    "current_plan_id": 52,
    "status": "active",
    "created_at": "2025-05-23 14:00:00",
    "updated_at": "2025-05-23 14:05:00",
    "messages": [
      {
        "role": "user",
        "content": "下午带老婆孩子出去玩",
        "metadata": {},
        "created_at": "2025-05-23 14:00:00"
      },
      {
        "role": "assistant",
        "content": "搞定了，14:00 出发...",
        "metadata": {
          "plan_id": 52,
          "share_url": "/api/agent/plans/52/share"
        },
        "created_at": "2025-05-23 14:05:00"
      }
    ]
  },
  "msg": "success"
}
```

**消息字段：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `role` | string | user / assistant |
| `content` | string | 消息正文 |
| `metadata` | object | 元数据，assistant 消息包含 plan_id 和 share_url |
| `created_at` | string | 创建时间 |

---

## `/api/agent/sessions/{session_id}` - 删除会话

### DELETE

删除会话及其关联消息（级联删除）。

**路径参数：** `session_id` - 会话 ID

**响应：**

```json
{ "code": 0, "data": null, "msg": "删除成功" }
```

---

## `/api/agent/plans/{plan_id}/share` - 方案分享

### GET

获取方案的完整分享数据，用于生成分享页面或文案。

**路径参数：** `plan_id` - 方案 ID

**响应：**

```json
{
  "code": 0,
  "data": {
    "plan": {
      "id": 52,
      "plan_title": "家庭亲子半日可执行方案",
      "plan_desc": "...",
      "total_cost": 1596.0
    },
    "items": [
      {
        "arrive_time": "14:00",
        "leave_time": "15:40",
        "location_table_name": "amusement_park",
        "location_id": 39,
        "stay_minute": 100,
        "remark": "..."
      }
    ],
    "share_text": "搞定了，14:00 出发...",
    "share_url": "/api/agent/plans/52/share"
  },
  "msg": "success"
}
```

---

## `/api/agent/plans/{plan_id}/execute` - 执行预约

用户在前端确认方案后，调用此接口执行预约操作。

**预约逻辑：** 遍历方案中的每个地点，检查 `current_booking_count < max_booking_count`，满足则 `current_booking_count += 1`。

**不创建订单记录，不涉及金钱。**

### POST

**路径参数：** `plan_id` - 方案 ID

**请求体：** 无

**响应：**

```json
{
  "code": 0,
  "data": [
    {
      "location_table_name": "amusement_park",
      "location_id": 39,
      "location_name": "童话峡谷",
      "status": "success",
      "message": "预约成功"
    },
    {
      "location_table_name": "mall",
      "location_id": 39,
      "location_name": "万达广场",
      "status": "failed",
      "message": "已约满或不可预约"
    }
  ],
  "msg": "全部预约成功"
}
```

| 字段 | 类型 | 描述 |
|------|------|------|
| `location_table_name` | string | 业务表名 |
| `location_id` | integer | 地点 ID |
| `location_name` | string | 地点名称 |
| `status` | string | success / failed |
| `message` | string | 结果说明 |

**状态码：**

| code | 说明 |
|------|------|
| 0 | 全部预约成功 |
| 1 | 部分或全部预约失败 |

---

## Agent 状态说明

### 会话状态

| 状态 | 说明 |
|------|------|
| `0` | 会话进行中（active） |
| `1` | 已生成方案（completed） |

### LangGraph 节点流程

```
load_session → analyze_goal → search_candidates → compose_plan → persist_plan → finalize
```

| 节点 | 说明 |
|------|------|
| `load_session` | 加载/创建会话，保存用户消息 |
| `analyze_goal` | 解析用户意图（LLM 或规则） |
| `search_candidates` | 搜索本地候选地点 |
| `compose_plan` | 生成方案（LLM 或规则） |
| `persist_plan` | 持久化方案到数据库 |
| `finalize` | 生成分享文本，保存 assistant 消息 |

### LLM 配置

通过环境变量 `.env` 配置：

```bash
# Provider 选择
LLM_PROVIDER=openai

# OpenAI
OPENAI_API_KEY=sk-xxx
OPENAI_MODEL=gpt-4o-mini

# 功能开关
USE_LLM_FOR_INTENT=true
USE_LLM_FOR_PLAN=true
```

当未配置 API key 或 LLM 调用失败时，自动降级到规则逻辑，不影响流程。

---

## 架构说明

```
/api/* (FastAPI Router) → app/service/* (业务层) → app/repository/* (数据层) → SQLite

Agent 层：
/api/chat/stream → app/agent/graph.py (LangGraph) → app/agent/planner.py (节点)
                                      ↓
                         app/llm/provider.py (LLM 封装)
```