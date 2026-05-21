# API 文档

LeisureAgent 后端 API 接口定义。

## 端点概览

| 端点 | 方法 | 描述 |
|------|------|------|
| `/api/restaurants` | GET | 获取餐厅列表 |
| `/api/restaurants/:id` | GET | 获取单个餐厅详情 |
| `/api/bookings` | POST | 创建预订 |
| `/api/bookings` | GET | 获取预订列表 |
| `/api/delivery-orders` | POST | 创建外卖订单 |
| `/api/delivery-orders` | GET | 获取外卖订单列表 |

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

## `/api/restaurants/:id` - 获取单个餐厅详情

**请求：** `GET /api/restaurants/{id}`

**路径参数：**

| 参数 | 类型 | 描述 |
|------|------|------|
| `id` | integer | 餐厅 ID |

**响应：**

```json
{
  "code": 0,
  "data": {
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
  },
  "msg": "success"
}
```

---

## `/api/bookings` - 创建预订

**请求：** `POST /api/bookings`

**请求体：**

```json
{
  "item_id": "1",
  "item_name": "海底捞火锅",
  "time": "2026-05-21 18:00",
  "party_size": 4,
  "contact_name": "张三",
  "contact_phone": "13800138000"
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `item_id` | string | 是 | 餐厅 ID |
| `item_name` | string | 是 | 餐厅名字 |
| `time` | string | 是 | 预订时间（格式：YYYY-MM-DD HH:mm） |
| `party_size` | integer | 是 | 用餐人数（1-20） |
| `contact_name` | string | 是 | 联系人姓名 |
| `contact_phone` | string | 是 | 联系电话 |

**响应：**

```json
{
  "code": 0,
  "data": {
    "booking_id": "BK202605210001",
    "status": "confirmed"
  },
  "msg": "预订成功"
}
```

---

## `/api/bookings` - 获取预订列表

**请求：** `GET /api/bookings`

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `status` | string | 否 | 预订状态：confirmed/cancelled/completed |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 10 |

**响应：**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "booking_id": "BK202605210001",
        "item_id": "1",
        "item_name": "海底捞火锅",
        "time": "2026-05-21 18:00",
        "party_size": 4,
        "contact_name": "张三",
        "contact_phone": "13800138000",
        "status": "confirmed",
        "created_at": "2026-05-21T10:00:00Z"
      }
    ],
    "total": 10,
    "page": 1,
    "page_size": 10
  },
  "msg": "success"
}
```

---

## `/api/delivery-orders` - 创建外卖订单

**请求：** `POST /api/delivery-orders`

**请求体：**

```json
{
  "item_id": "1",
  "item_name": "麦当劳",
  "address": "朝阳区 xx 街道 xx 号",
  "quantity": 2
}
```

**字段说明：**

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `item_id` | string | 是 | 餐厅 ID |
| `item_name` | string | 是 | 餐厅名字 |
| `address` | string | 是 | 配送地址 |
| `quantity` | integer | 是 | 数量（>=1） |

**响应：**

```json
{
  "code": 0,
  "data": {
    "order_id": "OD202605210001",
    "status": "pending"
  },
  "msg": "下单成功"
}
```

---

## `/api/delivery-orders` - 获取外卖订单列表

**请求：** `GET /api/delivery-orders`

**查询参数：**

| 参数 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `status` | string | 否 | 订单状态：pending/delivering/completed/cancelled |
| `page` | integer | 否 | 页码，默认 1 |
| `page_size` | integer | 否 | 每页数量，默认 10 |

**响应：**

```json
{
  "code": 0,
  "data": {
    "list": [
      {
        "order_id": "OD202605210001",
        "item_id": "1",
        "item_name": "麦当劳",
        "address": "朝阳区 xx 街道 xx 号",
        "quantity": 2,
        "status": "pending",
        "created_at": "2026-05-21T10:00:00Z"
      }
    ],
    "total": 5,
    "page": 1,
    "page_size": 10
  },
  "msg": "success"
}
```

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
