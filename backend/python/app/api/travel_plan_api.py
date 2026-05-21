"""旅行方案 CRUD API"""

from __future__ import annotations

from fastapi import APIRouter, Body, Query

from app.api import error, paged, success
from app.service import travel_plan_service

router = APIRouter(prefix="/api/travel-plans", tags=["旅行方案"])


@router.get("")
def list_travel_plans(
    title: str = Query(None, description="方案标题搜索"),
    travel_type: str = Query(None, description="游玩类型：亲子/美食/逛街/风景/人文"),
    travel_date: str = Query(None, description="出行日期：YYYY-MM-DD"),
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=50),
):
    items, total = travel_plan_service.list_all(
        title=title,
        travel_type=travel_type,
        travel_date=travel_date,
        page=page,
        page_size=page_size,
    )
    return success(paged(items, total, page, page_size))


@router.get("/{id}")
def get_travel_plan(id: int):
    row = travel_plan_service.get_by_id(id)
    if not row:
        return error("方案不存在", 404)
    return success(row)


@router.post("")
def create_travel_plan(data: dict = Body(...)):
    pid = travel_plan_service.create(data)
    return success({"id": pid}, "创建成功")


@router.put("/{id}")
def update_travel_plan(id: int, data: dict = Body(...)):
    ok = travel_plan_service.update(id, data)
    if not ok:
        return error("方案不存在或未修改", 404)
    return success(None, "更新成功")


@router.delete("/{id}")
def delete_travel_plan(id: int):
    ok = travel_plan_service.delete(id)
    if not ok:
        return error("方案不存在", 404)
    return success(None, "删除成功")