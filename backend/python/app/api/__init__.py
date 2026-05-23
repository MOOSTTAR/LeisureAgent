"""API 通用响应格式和工具函数。"""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Any, Optional


def success(data: Any = None, msg: str = "success") -> dict:
    return {"code": 0, "data": data, "msg": msg}


def error(msg: str = "error", code: int = 400) -> dict:
    return {"code": code, "data": None, "msg": msg}


def paged(data: list, total: int, page: int, page_size: int) -> dict:
    return {"list": data, "total": total, "page": page, "page_size": page_size}


def calc_distance(x: int, y: int) -> int:
    """曼哈顿距离 = |x| + |y|（单位：米）"""
    return abs(x) + abs(y)


def parse_distance_filter(
    value: str,
) -> tuple[Optional[int], Optional[int]]:
    """解析距离筛选参数，返回 (min, max) 米，None 表示无限制。"""
    if value.startswith("<"):
        num_str = value[1:]
        if num_str.endswith("km"):
            max_val = int(float(num_str[:-2]) * 1000)
        elif num_str.endswith("m"):
            max_val = int(num_str[:-1])
        else:
            return None, None
        return 0, max_val
    if value == "other":
        return 2000, None
    return None, None


def filter_by_distance(
    items: list[dict], distance: str
) -> list[dict]:
    """按距离过滤记录列表。"""
    d_min, d_max = parse_distance_filter(distance)
    if d_min is None and d_max is None:
        return items
    result = []
    for item in items:
        d = calc_distance(item["x"], item["y"])
        if d_min is not None and d < d_min:
            continue
        if d_max is not None and d > d_max:
            continue
        result.append(item)
    return result


def parse_tags(tags_str: Optional[str]) -> list[str]:
    """将 JSON 字符串标签解析为列表。"""
    if not tags_str:
        return []
    import json
    try:
        return json.loads(tags_str)
    except (json.JSONDecodeError, TypeError):
        return []


def paginate(
    items: list[dict], page: int, page_size: int
) -> tuple[list[dict], int]:
    """对列表进行分页，返回 (切片后的列表, 总数)。"""
    total = len(items)
    start = (page - 1) * page_size
    end = start + page_size
    return items[start:end], total


def add_minutes(time_text: str, minutes: int) -> str:
    """ 给 HH:MM 时间字符串增加指定分钟数。"""
    dt = datetime.strptime(time_text, "%H:%M") + timedelta(minutes=minutes)
    return dt.strftime("%H:%M")