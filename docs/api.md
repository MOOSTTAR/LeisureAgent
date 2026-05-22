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

---

## `/api/malls` - 商场

### GET 获取列表

**查询参数：**

| 参数                | 类型      | 必填 | 描述                 |
|-------------------|---------|------|--------------------|
| `has_cinema`      | boolean | 否 | 是否有影院：true/false   |
| `name`            | str     | 否 | 商场名字               |
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

### GET/POST/PUT/DELETE
同餐厅接口模式。

---

## 架构说明

```
/api/* (FastAPI Router) → app/service/* (业务层) → app/repository/* (数据层) → SQLite
```