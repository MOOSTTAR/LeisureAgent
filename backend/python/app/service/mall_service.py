"""mall 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import parse_distance_filter
from app.repository import mall_repo


def get_by_id(id: int) -> Optional[dict[str, Any]]:
    return mall_repo.get_by_id(id)


def list_all(
    has_cinema: Optional[bool] = None,
    has_supermarket: Optional[bool] = None,
    distance: Optional[str] = None,
    page: int = 1,
    page_size: int = 5,
) -> tuple[list[dict[str, Any]], int]:
    offset = (page - 1) * page_size
    d_min, d_max = parse_distance_filter(distance) if distance else (None, None)

    items = mall_repo.search(
        has_cinema=has_cinema,
        has_supermarket=has_supermarket,
        distance_min=d_min,
        distance_max=d_max,
        limit=page_size,
        offset=offset,
    )
    total = mall_repo.count(
        has_cinema=has_cinema,
        has_supermarket=has_supermarket,
        distance_min=d_min,
        distance_max=d_max,
    )
    return items, total


def create(data: dict[str, Any]) -> int:
    return mall_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return mall_repo.update(id, data)


def delete(id: int) -> bool:
    return mall_repo.delete(id)