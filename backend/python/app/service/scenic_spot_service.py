"""scenic_spot 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import parse_distance_filter
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
    offset = (page - 1) * page_size
    d_min, d_max = parse_distance_filter(distance) if distance else (None, None)

    items = scenic_spot_repo.search(
        name=name,
        spot_type=spot_type,
        crowd_level=crowd_level,
        distance_min=d_min,
        distance_max=d_max,
        limit=page_size,
        offset=offset,
    )
    total = scenic_spot_repo.count(
        name=name,
        spot_type=spot_type,
        crowd_level=crowd_level,
        distance_min=d_min,
        distance_max=d_max,
    )
    return items, total


def create(data: dict[str, Any]) -> int:
    return scenic_spot_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return scenic_spot_repo.update(id, data)


def delete(id: int) -> bool:
    return scenic_spot_repo.delete(id)