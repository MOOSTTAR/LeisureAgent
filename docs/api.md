# API 文档

LeisureAgent 后端 API 接口定义。

## 端点概览

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/restaurants` | GET | 获取餐厅列表 |
| `/api/parks` | GET | 获取户外列表 |
| `/api/malls` | GET | 获取商场列表 |
| `/api/exhibitions` | GET | 获取展馆展览列表 |
| `/api/amusement-parks` | GET | 获取游乐园列表 |
| `/api/travel-plans` | GET | 获取计划列表 |
| `/api/travel-plans/{id}` | DELETE | 删除计划列表 |

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

---

## `/api/restaurants` - 获取餐厅列表

**请求：** `GET /api/restaurants`

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 餐厅名字模糊搜索 |
| `cuisine_type` | string | 否 | 菜系：中餐/西餐/日料/火锅/烧烤/快餐/其他 |
| `dining_style` | integer | 否 | 用餐方式：0 堂食/1 外卖/2 均可 |
| `can_book` | boolean | 否 | 是否可预约：true/false |
| `distance` | string | 否 | 距离筛选：`<200m`/`<500m`/`<1.0km`/`<2.0km`/`other` |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 5 |

**响应：**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "海底捞火锅",
        "address": "朝阳区建国路 93 号万达广场 3 层",
        "x": 500,
        "y": 300,
        "cuisine_type": "火锅",
        "dining_style": 2,
        "tags": ["网红店", "服务好"],
        "business_hours": "10:00-22:00",
        "booking_hours": "10:00-21:00",
        "current_booking_count": 15,
        "max_booking_count": 50,
        "queue_time": -1,
        "indoor_env": "宽敞明亮，有包间"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 5
  },
  "msg": "success"
}
```

**字段说明：**

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

**距离计算规则：**
- 距离 = |x| + |y|（单位：米）
- >= 1000 米时转换为千米，如 `1.7km`

**预约/排队逻辑（三选一）：**
1. 只预约不排队：`booking_hours` 有效，`queue_time = -1`
2. 只排队不预约：`queue_time > 0`，`booking_hours = "不能预约"`
3. 既不排队也不预约：`queue_time = -1`，`booking_hours = "不能预约"`

---

## `/api/parks` - 获取户外景点列表

**请求：** `GET /api/parks`

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 景点名字模糊搜索 |
| `spot_type` | string | 否 | 景点类型：山水/古迹/人文/溶洞 |
| `crowd_density` | integer | 否 | 人流量：1 稀少/2 适中/3 拥挤 |
| `can_book` | boolean | 否 | 是否可预约：true/false |
| `distance` | string | 否 | 距离筛选：`<200m`/`<500m`/`<1.0km`/`<2.0km`/`other` |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 5 |

**响应：**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "颐和园",
        "address": "海淀区新建宫门路 19 号",
        "x": 2000,
        "y": 1500,
        "spot_type": "古迹",
        "business_hours": "06:30-18:00",
        "booking_hours": "06:00-17:00",
        "current_booking_count": 120,
        "max_booking_count": 500,
        "crowd_density": 3
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 5
  },
  "msg": "success"
}
```

**字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 景点 ID |
| `name` | string | 景点名字 |
| `address` | string | 详细地址 |
| `x` | integer | 坐标系横坐标（用于计算距离） |
| `y` | integer | 坐标系纵坐标（用于计算距离） |
| `spot_type` | string | 景点类型：山水/古迹/人文/溶洞等 |
| `business_hours` | string | 开放时间 |
| `booking_hours` | string | 可预约时段，"不能预约"表示不可预约 |
| `current_booking_count` | integer | 当前已预约数量，-1 表示无效 |
| `max_booking_count` | integer | 最大预约容量，-1 表示无效 |
| `crowd_density` | integer | 人流量：1 稀少/2 适中/3 拥挤 |

**距离计算规则：**
- 距离 = |x| + |y|（单位：米）
- >= 1000 米时转换为千米，如 `1.7km`

---

## `/api/malls` - 获取商场列表

**请求：** `GET /api/malls`

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 商场名字模糊搜索 |
| `cinema_has` | integer | 否 | 是否有影院：0 无/1 有 |
| `supermarket_has` | integer | 否 | 是否有大型超市：0 无/1 有 |
| `discount_status` | integer | 否 | 是否有优惠活动：0 无/1 有 |
| `distance` | string | 否 | 距离筛选：`<200m`/`<500m`/`<1.0km`/`<2.0km`/`other` |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 5 |

**响应：**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "朝阳大悦城",
        "address": "朝阳区朝阳北路 101 号",
        "x": 600,
        "y": 450,
        "cinema_has": 1,
        "supermarket_has": 1,
        "discount_status": 1
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 5
  },
  "msg": "success"
}
```

**字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 商场 ID |
| `name` | string | 商场名字 |
| `address` | string | 详细地址 |
| `x` | integer | 坐标系横坐标（用于计算距离） |
| `y` | integer | 坐标系纵坐标（用于计算距离） |
| `cinema_has` | integer | 是否有影院：0 无/1 有 |
| `supermarket_has` | integer | 是否有大型超市：0 无/1 有 |
| `discount_status` | integer | 是否有优惠活动：0 无/1 有 |

**距离计算规则：**
- 距离 = |x| + |y|（单位：米）
- >= 1000 米时转换为千米，如 `1.7km`

---

## `/api/exhibitions` - 获取展馆展览列表

**请求：** `GET /api/exhibitions`

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 展馆名字模糊搜索 |
| `hall_type` | string | 否 | 展馆类型：历史/艺术/科技/自然 |
| `ticket_type` | integer | 否 | 门票类型：0 免费/1 收费 |
| `crowd_level` | integer | 否 | 人流量：1 偏少/2 适中/3 拥挤 |
| `can_book` | boolean | 否 | 是否可预约：true/false |
| `manual_guide` | integer | 否 | 是否有人工讲解：0 无/1 有 |
| `interactive_project` | integer | 否 | 有无互动体验：0 无/1 有 |
| `distance` | string | 否 | 距离筛选：`<200m`/`<500m`/`<1.0km`/`<2.0km`/`other` |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 5 |

**响应：**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "中国国家博物馆",
        "address": "东城区东长安街 16 号",
        "x": 320,
        "y": 240,
        "hall_type": "历史",
        "business_hours": "09:00-17:00",
        "booking_hours": "09:00-16:00",
        "current_booking_count": 200,
        "max_booking_count": 800,
        "exhibition_theme": "古代中国基本陈列",
        "ticket_type": 0,
        "ticket_price": null,
        "manual_guide": 1,
        "interactive_project": 0,
        "crowd_level": 3
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 5
  },
  "msg": "success"
}
```

**字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 展馆 ID |
| `name` | string | 展馆名字 |
| `address` | string | 详细地址 |
| `x` | integer | 坐标系横坐标（用于计算距离） |
| `y` | integer | 坐标系纵坐标（用于计算距离） |
| `hall_type` | string | 展馆类型：历史/艺术/科技/自然 |
| `business_hours` | string | 开放时间 |
| `booking_hours` | string | 可预约时段，"不能预约"表示不可预约 |
| `current_booking_count` | integer | 当前已预约数量，-1 表示无效 |
| `max_booking_count` | integer | 最大预约容量，-1 表示无效 |
| `exhibition_theme` | string | 主打展览主题 |
| `ticket_type` | integer | 门票类型：0 免费/1 收费 |
| `ticket_price` | number | 门票价格 |
| `manual_guide` | integer | 是否有人工讲解：0 无/1 有 |
| `interactive_project` | integer | 有无互动体验项目：0 无/1 有 |
| `crowd_level` | integer | 人流量：1 偏少/2 适中/3 拥挤 |

**距离计算规则：**
- 距离 = |x| + |y|（单位：米）
- >= 1000 米时转换为千米，如 `1.7km`

---

## `/api/amusement-parks` - 获取游乐园列表

**请求：** `GET /api/amusement-parks`

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | 否 | 乐园名字模糊搜索 |
| `park_theme` | string | 否 | 乐园主题：童话/海洋/科幻/卡通 |
| `can_book` | boolean | 否 | 是否可预约：true/false |
| `distance` | string | 否 | 距离筛选：`<200m`/`<500m`/`<1.0km`/`<2.0km`/`other` |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 5 |

**响应：**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "id": 1,
        "name": "北京欢乐谷",
        "address": "朝阳区东四环小武基北路",
        "x": 1500,
        "y": 1100,
        "business_hours": "09:00-22:00",
        "booking_hours": "08:30-21:00",
        "current_booking_count": 200,
        "max_booking_count": 800,
        "park_theme": "科幻",
        "ticket_price": 299,
        "queue_time": 30,
        "performance_info": "《金面王朝》大型演出 14:00/16:00"
      }
    ],
    "total": 100,
    "page": 1,
    "page_size": 5
  },
  "msg": "success"
}
```

**字段说明：**

| 字段 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 乐园 ID |
| `name` | string | 乐园名字 |
| `address` | string | 详细地址 |
| `x` | integer | 坐标系横坐标（用于计算距离） |
| `y` | integer | 坐标系纵坐标（用于计算距离） |
| `business_hours` | string | 营业时间 |
| `booking_hours` | string | 可预约时段，"不能预约"表示不可预约 |
| `current_booking_count` | integer | 当前已预约数量，-1 表示无效 |
| `max_booking_count` | integer | 最大预约容量，-1 表示无效 |
| `park_theme` | string | 乐园主题：童话/海洋/科幻/卡通等 |
| `ticket_price` | number | 门票价格 |
| `queue_time` | integer | 预计排队时间（分钟），-1 表示无需排队 |
| `performance_info` | string | 演出/表演信息 |

**距离计算规则：**
- 距离 = |x| + |y|（单位：米）
- >= 1000 米时转换为千米，如 `1.7km`

---

## 错误响应

```json
{
  "code": 400,
  "data": null,
  "msg": "参数错误：缺少必填字段 name"
}
```

**常见错误码：**

| 错误码 | 描述 |
|--------|------|
| 400 | 请求参数错误 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## TODO

以下接口为规划中，尚未实现：

- `GET /api/restaurants/:id` - 获取单个餐厅详情（如需实现餐厅详情页）
- `POST /api/bookings` - 创建预订
- `GET /api/bookings` - 获取预订列表
- `POST /api/delivery-orders` - 创建外卖订单
- `GET /api/delivery-orders` - 获取外卖订单列表
- `POST /api/chat` - AI 聊天对话（SSE 流式响应）
