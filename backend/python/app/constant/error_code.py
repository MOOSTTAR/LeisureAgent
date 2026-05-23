"""集中管理错误码与错误消息。"""


class Err:
    """错误码定义，每个属性为 (错误消息, HTTP 状态码) 二元组，可直接解包传给 error()。"""

    # ── 通用 ──
    NOT_FOUND = ("资源不存在", 404)

    # ── 餐厅 ──
    RESTAURANT_NOT_FOUND = ("餐厅不存在", 404)
    RESTAURANT_NOT_FOUND_OR_UNCHANGED = ("餐厅不存在或未修改", 404)

    # ── 景点 ──
    SCENIC_SPOT_NOT_FOUND = ("景点不存在", 404)
    SCENIC_SPOT_NOT_FOUND_OR_UNCHANGED = ("景点不存在或未修改", 404)

    # ── 商场 ──
    MALL_NOT_FOUND = ("商场不存在", 404)
    MALL_NOT_FOUND_OR_UNCHANGED = ("商场不存在或未修改", 404)

    # ── 展馆 ──
    EXHIBITION_NOT_FOUND = ("展馆不存在", 404)
    EXHIBITION_NOT_FOUND_OR_UNCHANGED = ("展馆不存在或未修改", 404)

    # ── 游乐园 ──
    AMUSEMENT_NOT_FOUND = ("游乐园不存在", 404)
    AMUSEMENT_NOT_FOUND_OR_UNCHANGED = ("游乐园不存在或未修改", 404)

    # ── 旅行方案 ──
    PLAN_NOT_FOUND = ("方案不存在", 404)
    PLAN_NOT_FOUND_OR_UNCHANGED = ("方案不存在或未修改", 404)

    # ── 方案明细 ──
    ITEM_NOT_FOUND = ("明细不存在", 404)
    ITEM_NOT_FOUND_OR_UNCHANGED = ("明细不存在或未修改", 404)
    ITEM_TIME_INVALID = ("到达时间必须早于离开时间", 400)
    ITEM_BOOKING_FULL = ("预约名额已满", 400)
    ITEM_TIME_CONFLICT = ("时间段冲突", 409)

    # ── 预约确认 ──
    BOOKING_ALREADY_CONFIRMED = ("已经预约，无法重复预约", 400)
    BOOKING_NOT_NEEDED = ("该地点无需预约", 200)
    BOOKING_VENUE_NOT_FOUND = ("关联场所不存在", 404)
    BOOKING_NOT_BOOKED = ("未预约，无法取消", 400)
    BOOKING_CANCEL_NOT_NEEDED = ("该地点无需预约，无法取消", 400)