"""景点/公园 CRUD API（对应 API 文档 /api/parks 端点）"""

from __future__ import annotations

from fastapi import APIRouter, Body, Query

from app.api import error, paged, success
from app.constant.error_code import Err
from app.service import scenic_spot_service

router = APIRouter(prefix="/api/parks", tags=["景点/公园"])


@router.get("")
def list_parks(
    name: str = Query(None, description="公园名字模糊搜索"),
    spot_type: str = Query(None, description="景点类型"),
    crowd_level: int = Query(None, description="人流量：1 稀少/2 适中/3 拥挤"),
    distance: str = Query(None, description="距离筛选：<200m/<500m/<1.0km/<2.0km/other"),
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=50),
):
    items, total = scenic_spot_service.list_all(
        name=name,
        spot_type=spot_type,
        crowd_level=crowd_level,
        distance=distance,
        page=page,
        page_size=page_size,
    )
    return success(paged(items, total, page, page_size))


@router.get("/{id}")
def get_park(id: int):
    row = scenic_spot_service.get_by_id(id)
    if not row:
        return error(*Err.SCENIC_SPOT_NOT_FOUND)
    return success(row)


@router.post("")
def create_park(data: dict = Body(...)):
    sid = scenic_spot_service.create(data)
    return success({"id": sid}, "创建成功")


@router.put("/{id}")
def update_park(id: int, data: dict = Body(...)):
    ok = scenic_spot_service.update(id, data)
    if not ok:
        return error(*Err.SCENIC_SPOT_NOT_FOUND_OR_UNCHANGED)
    return success(None, "更新成功")


@router.delete("/{id}")
def delete_park(id: int):
    ok = scenic_spot_service.delete(id)
    if not ok:
        return error(*Err.SCENIC_SPOT_NOT_FOUND)
    return success(None, "删除成功")