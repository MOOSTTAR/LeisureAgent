"""预约确认 API"""

from __future__ import annotations

from fastapi import APIRouter

from app.api import error, success
from app.constant.error_code import Err
from app.service import booking_service

router = APIRouter(prefix="/api/booking", tags=["预约确认"])


@router.post("/confirm/{item_id}")
def confirm_booking(item_id: int):
    ok, err = booking_service.confirm_booking(item_id)
    if not ok:
        return error(*err)
    return success(None, "预约成功")