"""旅行方案明细 CRUD API"""

from __future__ import annotations

from fastapi import APIRouter, Body, Query

from app.api import error, paged, success
from app.constant.error_code import Err
from app.models.schemas import TravelPlanItemCreate
from app.service import travel_plan_item_service

router = APIRouter(prefix="/api/travel-plan-items", tags=["旅行方案明细"])


@router.get("")
def list_travel_plan_items(
    plan_id: int = Query(None, description="关联方案 ID"),
    page: int = Query(1, ge=1),
    page_size: int = Query(9999, ge=1, le=9999),
):
    items, total = travel_plan_item_service.list_all(
        plan_id=plan_id, page=page, page_size=page_size
    )
    return success(paged(items, total, page, page_size))


@router.get("/{id}")
def get_travel_plan_item(id: int):
    row = travel_plan_item_service.get_by_id(id)
    if not row:
        return error(*Err.ITEM_NOT_FOUND)
    return success(row)


@router.post("")
def create_travel_plan_item(data: TravelPlanItemCreate):
    iid, err_msg = travel_plan_item_service.create(data.model_dump())
    if err_msg:
        code = 409 if err_msg == Err.ITEM_TIME_CONFLICT[0] else 400
        return error(err_msg, code)
    return success({"id": iid}, "创建成功")


@router.put("/{id}")
def update_travel_plan_item(id: int, data: dict = Body(...)):
    ok = travel_plan_item_service.update(id, data)
    if not ok:
        return error(*Err.ITEM_NOT_FOUND_OR_UNCHANGED)
    return success(None, "更新成功")


@router.delete("/{id}")
def delete_travel_plan_item(id: int):
    ok = travel_plan_item_service.delete(id)
    if not ok:
        return error(*Err.ITEM_NOT_FOUND)
    return success(None, "删除成功")