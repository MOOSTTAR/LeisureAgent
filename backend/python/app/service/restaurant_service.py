"""restaurant 业务层"""

from __future__ import annotations

import json
from typing import Any, Optional

from app.api import parse_distance_filter, parse_tags
from app.repository import restaurant_repo


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    row = restaurant_repo.get_by_id(id)
    return _format(row) if row else None


def list_all(
    name: Optional[str] = None,
    cuisine_type: Optional[str] = None,
    dining_style: Optional[int] = None,
    distance: Optional[str] = None,
    page: int = 1,
    page_size: int = 5,
) -> tuple[list[dict[str, Any]], int]:
    offset = (page - 1) * page_size
    d_min, d_max = parse_distance_filter(distance) if distance else (None, None)

    items = restaurant_repo.search(
        name=name,
        cuisine_type=cuisine_type,
        dining_style=dining_style,
        distance_min=d_min,
        distance_max=d_max,
        limit=page_size,
        offset=offset,
    )
    total = restaurant_repo.count(
        name=name,
        cuisine_type=cuisine_type,
        dining_style=dining_style,
        distance_min=d_min,
        distance_max=d_max,
    )
    return [_format(i) for i in items], total


def _prepare(data: dict[str, Any]) -> dict[str, Any]:
    if isinstance(data.get("tags"), list):
        data["tags"] = json.dumps(data["tags"], ensure_ascii=False)
    return data


def create(data: dict[str, Any]) -> int:
    return restaurant_repo.create(_prepare(data))


def update(id: int, data: dict[str, Any]) -> bool:
    return restaurant_repo.update(id, _prepare(data))


def delete(id: int) -> bool:
    return restaurant_repo.delete(id)


def get_booking_list(
    page: int = 1,
    page_size: int = 5,
) -> tuple[list[dict[str, Any]], int]:
    offset = (page - 1) * page_size
    items = restaurant_repo.search(
        bookable=True, limit=page_size, offset=offset
    )
    total = restaurant_repo.count(bookable=True)
    return [_format(i) for i in items], total


def _format(row: dict[str, Any]) -> dict[str, Any]:
    row["tags"] = parse_tags(row.get("tags"))
    return row