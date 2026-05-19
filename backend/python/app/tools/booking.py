from __future__ import annotations

from app.models.schemas import BookingRequest, BookingResult
from app.mock.data import SUCCESS_BOOKING


def create_booking(request: BookingRequest) -> dict:
    """创建预订/预约。

    接受预订请求，执行预订操作并返回结果。
    支持餐厅订座、活动预约等场景。
    """
    if not request.item_id or not request.time:
        return {"success": False, "error": "缺少必填信息：item_id 或 time"}

    result = SUCCESS_BOOKING.model_dump()
    return result