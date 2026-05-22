"""amusement_park 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import parse_distance_filter
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
    offset = (page - 1) * page_size
    d_min, d_max = parse_distance_filter(distance) if distance else (None, None)

    items = amusement_park_repo.search(
        name=name,
        park_theme=park_theme,
        free_entry=free_entry,
        distance_min=d_min,
        distance_max=d_max,
        limit=page_size,
        offset=offset,
    )
    total = amusement_park_repo.count(
        name=name,
        park_theme=park_theme,
        free_entry=free_entry,
        distance_min=d_min,
        distance_max=d_max,
    )
    return items, total


def create(data: dict[str, Any]) -> int:
    return amusement_park_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return amusement_park_repo.update(id, data)


def delete(id: int) -> bool:
    return amusement_park_repo.delete(id)


def get_booking_list(
    page: int = 1,
    page_size: int = 5,
) -> tuple[list[dict[str, Any]], int]:
    offset = (page - 1) * page_size
    items = amusement_park_repo.search(
        bookable=True, limit=page_size, offset=offset
    )
    total = amusement_park_repo.count(bookable=True)
    return items, total