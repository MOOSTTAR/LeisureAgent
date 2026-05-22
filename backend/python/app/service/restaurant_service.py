"""restaurant 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import filter_by_distance, paginate, parse_tags
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
    items = restaurant_repo.get_all(limit=9999)

    if name:
        items = [i for i in items if name.lower() in i["name"].lower()]
    if cuisine_type:
        items = [i for i in items if i["cuisine_type"] == cuisine_type]
    if dining_style is not None:
        items = [i for i in items if i["dining_style"] == dining_style]
    if distance:
        items = filter_by_distance(items, distance)

    items = [_format(i) for i in items]
    return paginate(items, page, page_size)


def create(data: dict[str, Any]) -> int:
    return restaurant_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return restaurant_repo.update(id, data)


def delete(id: int) -> bool:
    return restaurant_repo.delete(id)


def _format(row: dict[str, Any]) -> dict[str, Any]:
    row["tags"] = parse_tags(row.get("tags"))
    return row