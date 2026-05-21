"""travel_plan 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import paginate
from app.repository import travel_plan_repo


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    return travel_plan_repo.get_by_id(id)


def list_all(
    title: Optional[str] = None,
    travel_type: Optional[str] = None,
    travel_date: Optional[str] = None,
    page: int = 1,
    page_size: int = 5,
) -> tuple[list[dict[str, Any]], int]:
    items = travel_plan_repo.get_all(limit=9999)

    if title:
        items = [i for i in items if title.lower() in i["plan_title"].lower()]
    if travel_type:
        items = [i for i in items if i["travel_type"] == travel_type]
    if travel_date:
        items = [i for i in items if i["travel_date"] == travel_date]

    return paginate(items, page, page_size)


def create(data: dict[str, Any]) -> int:
    return travel_plan_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return travel_plan_repo.update(id, data)


def delete(id: int) -> bool:
    return travel_plan_repo.delete(id)