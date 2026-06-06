"""Agent 工具函数包 — 搜索、预约、地点查询。

从原 tools.py 按职责拆分为：
  _utils.py   — 类型转换、距离计算等共享工具
  _search.py  — 候选地点搜索 + 咨询搜索 + 命名地点提取 + 场景评分
  _booking.py — 预约执行 + 可用性检查 + 方案持久化
  _location.py — 地点查询 + 分类标签 + 分享文案
"""

from app.agent.tools._booking import (
    _can_book,
    _check_availability,
    _is_fully_booked,
    execute_plan_actions,
    persist_agent_plan,
)
from app.agent.tools._location import (
    _category_label,
    _check_need_booking,
    _get_needed_categories,
    build_share_payload,
    build_share_text,
    get_location,
    get_location_by_name,
)
from app.agent.tools._search import (
    _clear_locations_cache,
    _extract_named_locations,
    search_inquiry,
    search_local_candidates,
)
from app.agent.tools._utils import (
    _safe_str,
    _to_int,
    _with_distance,
)

# 从 app.api 透传，保持向后兼容
from app.api import add_minutes  # noqa: F401

__all__ = [
    # 搜索
    "search_local_candidates",
    "search_inquiry",
    "_extract_named_locations",
    "_clear_locations_cache",
    # 预约
    "execute_plan_actions",
    "persist_agent_plan",
    "_check_availability",
    "_is_fully_booked",
    "_can_book",
    # 地点
    "get_location",
    "get_location_by_name",
    "_check_need_booking",
    "_get_needed_categories",
    "_category_label",
    "build_share_text",
    "build_share_payload",
    # 工具
    "add_minutes",
    "_with_distance",
    "_to_int",
    "_safe_str",
]
