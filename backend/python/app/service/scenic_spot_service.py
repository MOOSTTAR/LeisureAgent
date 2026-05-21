"""scenic_spot 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import filter_by_distance, paginate
from app.repository import scenic_spot_repo


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    return scenic_spot_repo.get_by_id(id)


def list_all(
    name: Optional[str] = None,
    spot_type: Optional[str] = None,
    crowd_level: Optional[int] = None,
    distance: Optional[str] = None,
    page: int = 1,
    page_size: int = 5,
) -> tuple[list[dict[str, Any]], int]:
    items = scenic_spot_repo.get_all(limit=9999)

    if name:
        items = [i for i in items if name.lower() in i["name"].lower()]
    if spot_type:
        items = [i for i in items if i["spot_type"] == spot_type]
    if crowd_level is not None:
        items = [i for i in items if i["crowd_density"] == crowd_level]
    if distance:
        items = filter_by_distance(items, distance)

    return paginate(items, page, page_size)


def create(data: dict[str, Any]) -> int:
    return scenic_spot_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return scenic_spot_repo.update(id, data)


def delete(id: int) -> bool:
    return scenic_spot_repo.delete(id)