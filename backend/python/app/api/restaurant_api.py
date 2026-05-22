"""餐厅 CRUD API"""

from __future__ import annotations

from fastapi import APIRouter, Body, Query

from app.api import error, paged, success
from app.service import restaurant_service

router = APIRouter(prefix="/api/restaurants", tags=["餐厅"])


@router.get("")
def list_restaurants(
    name: str = Query(None, description="餐厅名字模糊搜索"),
    cuisine_type: str = Query(None, description="菜系：中餐/西餐/日料/火锅/烧烤/快餐/其他"),
    dining_style: int = Query(None, description="用餐方式：0 堂食/1 外卖/2 均可"),
    distance: str = Query(None, description="距离筛选：<200m/<500m/<1.0km/<2.0km/other"),
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(5, ge=1, le=50, description="每页数量"),
):
    items, total = restaurant_service.list_all(
        name=name,
        cuisine_type=cuisine_type,
        dining_style=dining_style,
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
    items, total = restaurant_service.get_booking_list(
        page=page,
        page_size=page_size,
    )
    return success(paged(items, total, page, page_size))


@router.get("/{id}")
def get_restaurant(id: int):
    row = restaurant_service.get_by_id(id)
    if not row:
        return error("餐厅不存在", 404)
    return success(row)


@router.post("")
def create_restaurant(data: dict = Body(...)):
    rid = restaurant_service.create(data)
    return success({"id": rid}, "创建成功")


@router.put("/{id}")
def update_restaurant(id: int, data: dict = Body(...)):
    ok = restaurant_service.update(id, data)
    if not ok:
        return error("餐厅不存在或未修改", 404)
    return success(None, "更新成功")


@router.delete("/{id}")
def delete_restaurant(id: int):
    ok = restaurant_service.delete(id)
    if not ok:
        return error("餐厅不存在", 404)
    return success(None, "删除成功")