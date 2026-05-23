"""展馆 CRUD API"""

from __future__ import annotations

from fastapi import APIRouter, Body, Query

from app.api import error, paged, success
from app.constant.error_code import Err
from app.service import exhibition_hall_service

router = APIRouter(prefix="/api/exhibition-halls", tags=["展馆"])


@router.get("")
def list_exhibition_halls(
    name: str = Query(None, description="展馆名字模糊搜索"),
    hall_type: str = Query(None, description="展馆类型：历史/艺术/科技/自然"),
    free_entry: bool = Query(None, description="是否免费"),
    distance: str = Query(None, description="距离筛选：<200m/<500m/<1.0km/<2.0km/other"),
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=50),
):
    items, total = exhibition_hall_service.list_all(
        name=name,
        hall_type=hall_type,
        free_entry=free_entry,
        distance=distance,
        page=page,
        page_size=page_size,
    )
    return success(paged(items, total, page, page_size))


@router.get("/get_booking_list")
def get_booking_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=50),
):
    items, total = exhibition_hall_service.get_booking_list(page=page, page_size=page_size)
    return success(paged(items, total, page, page_size))


@router.get("/{id}")
def get_exhibition_hall(id: int):
    row = exhibition_hall_service.get_by_id(id)
    if not row:
        return error(*Err.EXHIBITION_NOT_FOUND)
    return success(row)


@router.post("")
def create_exhibition_hall(data: dict = Body(...)):
    eid = exhibition_hall_service.create(data)
    return success({"id": eid}, "创建成功")


@router.put("/{id}")
def update_exhibition_hall(id: int, data: dict = Body(...)):
    ok = exhibition_hall_service.update(id, data)
    if not ok:
        return error(*Err.EXHIBITION_NOT_FOUND_OR_UNCHANGED)
    return success(None, "更新成功")


@router.delete("/{id}")
def delete_exhibition_hall(id: int):
    ok = exhibition_hall_service.delete(id)
    if not ok:
        return error(*Err.EXHIBITION_NOT_FOUND)
    return success(None, "删除成功")