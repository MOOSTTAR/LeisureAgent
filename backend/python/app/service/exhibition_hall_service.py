"""exhibition_hall 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import filter_by_distance, paginate
from app.repository import exhibition_hall_repo


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    return exhibition_hall_repo.get_by_id(id)


def list_all(
    name: Optional[str] = None,
    hall_type: Optional[str] = None,
    free_entry: Optional[bool] = None,
    distance: Optional[str] = None,
    page: int = 1,
    page_size: int = 5,
) -> tuple[list[dict[str, Any]], int]:
    items = exhibition_hall_repo.get_all(limit=9999)

    if name:
        items = [i for i in items if name.lower() in i["name"].lower()]
    if hall_type:
        items = [i for i in items if i["hall_type"] == hall_type]
    if free_entry is not None:
        items = [i for i in items if (i["ticket_type"] == 0) == free_entry]
    if distance:
        items = filter_by_distance(items, distance)

    return paginate(items, page, page_size)


def create(data: dict[str, Any]) -> int:
    return exhibition_hall_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return exhibition_hall_repo.update(id, data)


def delete(id: int) -> bool:
    return exhibition_hall_repo.delete(id)