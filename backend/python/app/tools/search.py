from __future__ import annotations

from typing import Any

from app.models.schemas import SearchParams


def search_places(params: SearchParams) -> list[dict[str, Any]]:
    """搜索餐厅或活动场所。"""
    return _search(params.query, limit=params.limit)


def search_activities(params: SearchParams) -> list[dict[str, Any]]:
    """搜索可参与的活动。"""
    return _search(params.query, limit=params.limit)


def search_delivery(params: SearchParams) -> list[dict[str, Any]]:
    """搜索可配送的商品。"""
    return _search(params.query, limit=params.limit)


def _search(query: str, limit: int = 5) -> list[dict[str, Any]]:
    """简单的关键词搜索。"""
    from app.service import restaurant_service, scenic_spot_service, amusement_park_service, exhibition_hall_service

    results: list[dict] = []
    kw = query.lower()

    for svc in (restaurant_service, scenic_spot_service, amusement_park_service, exhibition_hall_service):
        items, _ = svc.list_all(page=1, page_size=9999)
        for item in items:
            if kw in item.get("name", "").lower() or kw in item.get("address", "").lower():
                results.append(item)

    return results[:limit]