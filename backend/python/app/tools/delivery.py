from __future__ import annotations

from app.models.schemas import BookingRequest, BookingResult
from app.mock.data import SUCCESS_BOOKING


def order_delivery(request: BookingRequest) -> dict:
    """下单配送/外卖。

    接受配送请求，下单并返回配送信息。
    """
    if not request.item_id:
        return {"success": False, "error": "缺少商品信息"}

    result = SUCCESS_BOOKING.model_dump()
    result["message"] = f"已下单 {request.item_name}，预计 30 分钟内送达"
    return result