"""amusement_park 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import filter_by_distance, paginate
from app.repository import amusement_park_repo


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    return amusement_park_repo.get_by_id(id)


def list_all(
    name: Optional[str] = None,
    park_theme: Optional[str] = None,
    free_entry: Optional[bool] = None,
    distance: Optional[str] = None,
    page: int = 1,
    page_size: int = 5,
) -> tuple[list[dict[str, Any]], int]:
    items = amusement_park_repo.get_all(limit=9999)

    if name:
        items = [i for i in items if name.lower() in i["name"].lower()]
    if park_theme:
        items = [i for i in items if i["park_theme"] == park_theme]
    if free_entry is not None:
        items = [
            i for i in items if (i["ticket_price"] == 0) == free_entry
        ]
    if distance:
        items = filter_by_distance(items, distance)

    return paginate(items, page, page_size)


def create(data: dict[str, Any]) -> int:
    return amusement_park_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return amusement_park_repo.update(id, data)


def delete(id: int) -> bool:
    return amusement_park_repo.delete(id)