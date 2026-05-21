"""商场 CRUD API"""

from __future__ import annotations

from fastapi import APIRouter, Body, Query

from app.api import error, paged, success
from app.service import mall_service

router = APIRouter(prefix="/api/malls", tags=["商场"])


@router.get("")
def list_malls(
    has_cinema: bool = Query(None, description="是否有影院"),
    has_supermarket: bool = Query(None, description="是否有大型超市"),
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=50),
):
    items, total = mall_service.list_all(
        has_cinema=has_cinema,
        has_supermarket=has_supermarket,
        page=page,
        page_size=page_size,
    )
    return success(paged(items, total, page, page_size))


@router.get("/{id}")
def get_mall(id: int):
    row = mall_service.get_by_id(id)
    if not row:
        return error("商场不存在", 404)
    return success(row)


@router.post("")
def create_mall(data: dict = Body(...)):
    mid = mall_service.create(data)
    return success({"id": mid}, "创建成功")


@router.put("/{id}")
def update_mall(id: int, data: dict = Body(...)):
    ok = mall_service.update(id, data)
    if not ok:
        return error("商场不存在或未修改", 404)
    return success(None, "更新成功")


@router.delete("/{id}")
def delete_mall(id: int):
    ok = mall_service.delete(id)
    if not ok:
        return error("商场不存在", 404)
    return success(None, "删除成功")