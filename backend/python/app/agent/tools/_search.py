"""候选地点搜索与咨询搜索工具。"""

from __future__ import annotations

import time
from typing import Any

from app.api import add_minutes, calc_distance_between
from app.service import (
    amusement_park_service,
    exhibition_hall_service,
    mall_service,
    restaurant_service,
    scenic_spot_service,
)
from app.agent.constants import CUISINE_KEYWORDS
from app.agent.tools._utils import _with_distance, _to_int, _safe_str
from app.agent.tools._booking import _can_book, _check_availability

# ═══════════════════════════════════════════════════════════════
# 全量数据 TTL 缓存 — mock 数据不变，避免每次搜索都打 5 个 DB 查询
# ═══════════════════════════════════════════════════════════════

_cache_ttl: float = 60.0  # 缓存有效期（秒）
_cache_expiry: float = 0.0
_cache_data: dict[str, list[dict[str, Any]]] | None = None


def _clear_locations_cache() -> None:
    """清除全量数据缓存 — 测试 reset_db 后调用。"""
    global _cache_expiry, _cache_data
    _cache_expiry = 0.0
    _cache_data = None


def _load_all_locations() -> dict[str, list[dict[str, Any]]]:
    """加载全部地点数据（带 TTL 模块级缓存）。"""
    global _cache_expiry, _cache_data
    now = time.monotonic()
    if _cache_data is not None and now < _cache_expiry:
        return _cache_data
    page_size = 9999
    restaurants, _ = restaurant_service.list_all(page=1, page_size=page_size)
    malls, _ = mall_service.list_all(page=1, page_size=page_size)
    amusement_parks, _ = amusement_park_service.list_all(page=1, page_size=page_size)
    scenic_spots, _ = scenic_spot_service.list_all(page=1, page_size=page_size)
    exhibitions, _ = exhibition_hall_service.list_all(page=1, page_size=page_size)
    _cache_data = {
        "restaurant": restaurants,
        "mall": malls,
        "amusement_park": amusement_parks,
        "scenic_spot": scenic_spots,
        "exhibition_hall": exhibitions,
    }
    _cache_expiry = now + _cache_ttl
    return _cache_data


# ═══════════════════════════════════════════════════════════════
# 搜索：候选地点
# ═══════════════════════════════════════════════════════════════


def search_local_candidates(scenario: str, constraints: dict[str, Any]) -> dict[str, list[dict[str, Any]]]:
    """Search mock local-life data for candidate places."""
    all_locations = _load_all_locations()

    max_distance = constraints.get("max_distance", 2000)
    pools = {
        key: [_with_distance(item) for item in items]
        for key, items in all_locations.items()
    }

    cuisine_type = constraints.get("cuisine_type")

    for key, items in pools.items():
        pools[key] = [item for item in items if item["distance"] <= max_distance]
        # 菜系/类型偏好过滤（若过滤后为空则保留全部，避免餐厅池清空）
        if cuisine_type and key == "restaurant":
            filtered = [
                item for item in pools[key]
                if cuisine_type in str(item.get("cuisine_type", ""))
            ]
            if filtered:
                pools[key] = filtered
            # else: 没有匹配的菜系，保留全部餐厅（不做硬过滤）
        pools[key].sort(key=lambda item: item["distance"])

    if scenario == "family":
        pools["restaurant"].sort(key=lambda item: _family_restaurant_score(item), reverse=True)
        pools["amusement_park"].sort(key=lambda item: _family_activity_score(item), reverse=True)
        pools["mall"].sort(key=lambda item: (item.get("supermarket_has", 0), -item["distance"]), reverse=True)
    elif scenario == "friends":
        pools["restaurant"].sort(key=lambda item: _friends_restaurant_score(item), reverse=True)
        pools["exhibition_hall"].sort(key=lambda item: _friends_exhibition_score(item), reverse=True)
        pools["mall"].sort(key=lambda item: (item.get("cinema_has", 0), -item["distance"]), reverse=True)

    return pools


# ═══════════════════════════════════════════════════════════════
# 搜索：咨询/浏览
# ═══════════════════════════════════════════════════════════════

_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "restaurant": ["面", "粉", "饭", "菜", "餐", "火锅", "烧烤", "日料", "西餐", "粤菜", "中餐",
                   "小吃", "点心", "甜品", "奶茶", "咖啡", "素食", "海鲜", "自助", "拉面", "米线"],
    "amusement_park": ["游乐园", "乐园", "主题公园", "游乐场", "过山车", "摩天轮", "欢乐谷"],
    "scenic_spot": ["公园", "爬山", "山", "湖", "河", "古迹", "寺庙", "园林", "长城", "故宫"],
    "exhibition_hall": ["展", "博物馆", "美术馆", "科技馆", "画廊", "艺术", "展览"],
    "mall": ["商场", "购物", "逛街", "买", "大悦城", "万达", "超市", "影院", "电影院"],
}

_CATEGORY_TO_TABLE: dict[str, str] = {
    "restaurant": "restaurant",
    "amusement_park": "amusement_park",
    "scenic_spot": "scenic_spot",
    "exhibition_hall": "exhibition_hall",
    "mall": "mall",
}


def search_inquiry(user_input: str, constraints: dict[str, Any] | None = None) -> list[dict[str, Any]]:
    """精确搜索：根据用户查询关键词匹配场所。用于咨询/浏览模式。"""
    import re

    from app.agent.tools._location import get_location_by_name

    max_distance = (constraints or {}).get("max_distance", 5000)
    # 尝试从输入中提取距离限制
    dist_match = re.search(r"(\d+)\s*(km|公里|千米|m|米)", user_input)
    if dist_match:
        num = int(dist_match.group(1))
        unit = dist_match.group(2)
        max_distance = num * 1000 if unit in ("km", "公里", "千米") else num

    # 确定要搜索哪些表
    tables_to_search: set[str] = set()
    for table, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in user_input for kw in keywords):
            tables_to_search.add(table)

    # 如果没匹配到任何关键词，搜索所有表（兜底）
    if not tables_to_search:
        tables_to_search = {"restaurant", "amusement_park", "scenic_spot", "exhibition_hall", "mall"}

    # 提取参照地点名：检测 "XX附近" "XX旁边" "距离XX" 等模式
    ref_x, ref_y = 0, 0
    ref_patterns = [
        r"(?:距离|离|看看|去)(.+?)(?:近|附近|旁边|周边|周围)",
        r"(.+?)(?:附近|旁边|周边|周围)",
    ]
    for pat in ref_patterns:
        m = re.search(pat, user_input)
        if m:
            ref_name = m.group(1).strip()
            # 尝试全名匹配 → 逐字缩短匹配（处理"全聚德比较近"误提取为"全聚德比较"的情况）
            for end in range(len(ref_name), 1, -1):
                candidate = ref_name[:end]
                ref_loc = get_location_by_name(candidate)
                if ref_loc:
                    ref_x, ref_y = int(ref_loc.get("x", 0)), int(ref_loc.get("y", 0))
                    break
            if ref_x != 0 or ref_y != 0:
                break

    # 提取菜系/类型关键词做进一步筛选
    target_cuisine: str | None = None
    for ck in CUISINE_KEYWORDS:
        if ck in user_input:
            target_cuisine = ck
            if "restaurant" not in tables_to_search:
                tables_to_search = {"restaurant"}
            break

    results: list[dict[str, Any]] = []
    all_locations = _load_all_locations()
    for table_name in tables_to_search:
        items = all_locations.get(table_name)
        if not items:
            continue
        for item in items:
            item = dict(item)
            try:
                dist = calc_distance_between(ref_x, ref_y, int(item["x"]), int(item["y"]))
            except (ValueError, TypeError):
                continue
            if dist > max_distance:
                continue
            # 菜系筛选
            if target_cuisine and table_name == "restaurant":
                cuisine = str(item.get("cuisine_type", ""))
                if target_cuisine not in cuisine:
                    continue
            item["distance"] = dist
            item["available"] = _check_availability(item)
            item["can_book"] = _can_book(item)
            item["category"] = table_name
            results.append(item)

    results.sort(key=lambda x: x["distance"])
    return results


# ═══════════════════════════════════════════════════════════════
# 命名地点提取
# ═══════════════════════════════════════════════════════════════


def _extract_named_locations(user_input: str) -> list[dict[str, Any]]:
    """从用户输入中提取具体地点名，按名称搜索所有表并返回匹配项。"""
    import re

    from app.agent.tools._location import get_location_by_name

    results: list[dict[str, Any]] = []
    patterns = [
        r"把(.+?)加入计划",
        r"把(.+?)加到计划",
        r"(.+?)加入计划",
        r"去(.+?)(?:玩|逛|吃|吧|，|。|$)",
    ]
    names_to_search: set[str] = set()
    for pat in patterns:
        for m in re.finditer(pat, user_input):
            name = m.group(1).strip()
            if len(name) >= 2 and len(name) <= 10:
                names_to_search.add(name)

    if not names_to_search:
        return results

    all_locations = _load_all_locations()
    for name in names_to_search:
        for cat, items in all_locations.items():
            for item in items:
                item = dict(item)
                if item.get("name", "") == name or name in str(item.get("name", "")):
                    item["category"] = cat
                    results.append(item)
                    break  # 每个名字只取第一个匹配

    return results


# ═══════════════════════════════════════════════════════════════
# 评分函数（按场景给候选排序）
# ═══════════════════════════════════════════════════════════════


def _family_restaurant_score(item: dict[str, Any]) -> float:
    tags = _safe_str(item.get("tags")) or ""
    score = 0
    if "亲子餐厅" in tags or "适合带娃" in tags:
        score += 8
    if _safe_str(item.get("cuisine_type", "")) in {"日料", "粤菜", "中餐"}:
        score += 3
    if "环境好" in tags or "有包间" in tags:
        score += 2
    if _can_book(item):
        score += 3
    return score - _to_int(item["distance"]) / 100


def _friends_restaurant_score(item: dict[str, Any]) -> float:
    tags = _safe_str(item.get("tags")) or ""
    score = 0
    if _safe_str(item.get("cuisine_type", "")) in {"火锅", "中餐", "烧烤", "西餐"}:
        score += 5
    if "网红店" in tags or "环境好" in tags:
        score += 3
    if _can_book(item):
        score += 2
    return score - _to_int(item["distance"]) / 100


def _family_activity_score(item: dict[str, Any]) -> float:
    score = 0
    if item.get("park_theme") in {"亲子", "童话", "卡通", "海洋"}:
        score += 8
    if _to_int(item.get("queue_time", -1)) in {-1, 5, 10}:
        score += 2
    return score - _to_int(item["distance"]) / 100


def _friends_exhibition_score(item: dict[str, Any]) -> float:
    score = 0
    if item.get("hall_type") in {"艺术", "综合", "科技"}:
        score += 5
    if _to_int(item.get("interactive_project")) == 1:
        score += 2
    if _to_int(item.get("crowd_level", 2)) <= 2:
        score += 2
    return score - _to_int(item["distance"]) / 100
