"""travel_plan_item 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.repository import travel_plan_item_repo


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    return travel_plan_item_repo.get_by_id(id)


def list_all(
    plan_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 10,
) -> tuple[list[dict[str, Any]], int]:
    offset = (page - 1) * page_size
    items = travel_plan_item_repo.search(
        plan_id=plan_id, limit=page_size, offset=offset
    )
    total = travel_plan_item_repo.count(plan_id=plan_id)
    return items, total


def create(data: dict[str, Any]) -> int:
    return travel_plan_item_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return travel_plan_item_repo.update(id, data)


def delete(id: int) -> bool:
    return travel_plan_item_repo.delete(id)