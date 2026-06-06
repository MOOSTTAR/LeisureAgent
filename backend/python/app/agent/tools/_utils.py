"""共享工具函数 — 类型转换、距离计算、字符串安全处理。"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from app.api import calc_distance


def _with_distance(item: dict[str, Any]) -> dict[str, Any]:
    row = dict(item)
    try:
        row["distance"] = calc_distance(int(row["x"]), int(row["y"]))
    except (ValueError, TypeError):
        row["distance"] = 9999999
    return row


def _to_int(val: Any, default: int = 0) -> int:
    try:
        return int(val)
    except (ValueError, TypeError):
        return default


def _safe_str(val: Any) -> str:
    """Safely convert any value to string for 'in' checks."""
    if val is None:
        return ""
    if isinstance(val, str):
        return val
    try:
        return str(val)
    except Exception as e:
        logger.debug("_safe_str failed for %r: %s", val, e)
        return ""
