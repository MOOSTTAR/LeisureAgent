from __future__ import annotations

from app.models.schemas import SearchParams, SearchResult
from app.mock.data import search_by_keyword


def search_places(params: SearchParams) -> list[dict]:
    """搜索餐厅或活动场所。

    接受自然语言查询，返回匹配的地点列表。
    """
    items = search_by_keyword(params.query)
    results = [item.model_dump() for item in items[: params.limit]]
    return results


def search_activities(params: SearchParams) -> list[dict]:
    """搜索可参与的活动。

    接受自然语言查询，返回匹配的活动列表。
    """
    items = search_by_keyword(params.query, category="activity")
    results = [item.model_dump() for item in items[: params.limit]]
    return results


def search_delivery(params: SearchParams) -> list[dict]:
    """搜索可配送的商品。

    接受自然语言查询，返回匹配的外卖/商品列表。
    """
    items = search_by_keyword(params.query, category="delivery")
    results = [item.model_dump() for item in items[: params.limit]]
    return results