"""travel_plan_item 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import paginate
from app.repository import travel_plan_item_repo


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    return travel_plan_item_repo.get_by_id(id)


def list_all(
    plan_id: Optional[int] = None, page: int = 1, page_size: int = 10
) -> tuple[list[dict[str, Any]], int]:
    if plan_id is not None:
        items = travel_plan_item_repo.get_by_plan_id(plan_id)
    else:
        items = travel_plan_item_repo.get_all(limit=9999)
    return paginate(items, page, page_size)


def create(data: dict[str, Any]) -> int:
    return travel_plan_item_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return travel_plan_item_repo.update(id, data)


def delete(id: int) -> bool:
    return travel_plan_item_repo.delete(id)