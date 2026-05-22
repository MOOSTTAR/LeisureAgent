"""exhibition_hall 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import parse_distance_filter
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
    offset = (page - 1) * page_size
    d_min, d_max = parse_distance_filter(distance) if distance else (None, None)

    items = exhibition_hall_repo.search(
        name=name,
        hall_type=hall_type,
        free_entry=free_entry,
        distance_min=d_min,
        distance_max=d_max,
        limit=page_size,
        offset=offset,
    )
    total = exhibition_hall_repo.count(
        name=name,
        hall_type=hall_type,
        free_entry=free_entry,
        distance_min=d_min,
        distance_max=d_max,
    )
    return items, total


def create(data: dict[str, Any]) -> int:
    return exhibition_hall_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return exhibition_hall_repo.update(id, data)


def delete(id: int) -> bool:
    return exhibition_hall_repo.delete(id)


def get_booking_list(
    page: int = 1,
    page_size: int = 5,
) -> tuple[list[dict[str, Any]], int]:
    offset = (page - 1) * page_size
    items = exhibition_hall_repo.search(
        bookable=True, limit=page_size, offset=offset
    )
    total = exhibition_hall_repo.count(bookable=True)
    return items, total