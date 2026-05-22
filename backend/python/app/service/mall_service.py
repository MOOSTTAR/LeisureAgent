"""mall 业务层"""

from __future__ import annotations

from typing import Any, Optional

from app.api import filter_by_distance, paginate
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
    items = mall_repo.get_all(limit=9999)

    if has_cinema is not None:
        items = [i for i in items if (i["cinema_has"] == 1) == has_cinema]
    if has_supermarket is not None:
        items = [i for i in items if (i["supermarket_has"] == 1) == has_supermarket]
    if distance:
        items = filter_by_distance(items, distance)

    return paginate(items, page, page_size)


def create(data: dict[str, Any]) -> int:
    return mall_repo.create(data)


def update(id: int, data: dict[str, Any]) -> bool:
    return mall_repo.update(id, data)


def delete(id: int) -> bool:
    return mall_repo.delete(id)