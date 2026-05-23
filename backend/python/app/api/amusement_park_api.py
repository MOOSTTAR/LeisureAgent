"""游乐园 CRUD API"""

from __future__ import annotations

from fastapi import APIRouter, Body, Query

from app.api import error, paged, success
from app.constant.error_code import Err
from app.service import amusement_park_service

router = APIRouter(prefix="/api/amusement-parks", tags=["游乐园"])


@router.get("")
def list_amusement_parks(
    name: str = Query(None, description="景点乐园名字模糊搜索"),
    park_theme: str = Query(None, description="乐园主题：童话/海洋/科幻/卡通"),
    free_entry: bool = Query(None, description="是否免费入园"),
    distance: str = Query(None, description="距离筛选：<200m/<500m/<1.0km/<2.0km/other"),
    page: int = Query(1, ge=1),
    page_size: int = Query(9999, ge=1, le=9999),
):
    items, total = amusement_park_service.list_all(
        name=name,
        park_theme=park_theme,
        free_entry=free_entry,
        distance=distance,
        page=page,
        page_size=page_size,
    )
    return success(paged(items, total, page, page_size))

@router.get("/get_booking_list")
def get_booking_list(
    page: int = Query(1, ge=1),
    page_size: int = Query(9999, ge=1, le=50),
):
    items, total = amusement_park_service.get_booking_list(
        page=page,
        page_size=page_size,
    )

    return success(paged(items, total, page, page_size))


@router.get("/{id}")
def get_amusement_park(id: int):
    row = amusement_park_service.get_by_id(id)
    if not row:
        return error(*Err.AMUSEMENT_NOT_FOUND)
    return success(row)


@router.post("")
def create_amusement_park(data: dict = Body(...)):
    pid = amusement_park_service.create(data)
    return success({"id": pid}, "创建成功")


@router.put("/{id}")
def update_amusement_park(id: int, data: dict = Body(...)):
    ok = amusement_park_service.update(id, data)
    if not ok:
        return error(*Err.AMUSEMENT_NOT_FOUND_OR_UNCHANGED)
    return success(None, "更新成功")


@router.delete("/{id}")
def delete_amusement_park(id: int):
    ok = amusement_park_service.delete(id)
    if not ok:
        return error(*Err.AMUSEMENT_NOT_FOUND)
    return success(None, "删除成功")