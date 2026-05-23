"""集中管理常量数据。"""

from __future__ import annotations

# 拥有预约计数（current_booking_count / max_booking_count）的场所表
BOOKING_TABLES = frozenset({"restaurant", "amusement_park", "scenic_spot", "exhibition_hall"})

# 所有场所表
VENUE_TABLES = frozenset({"restaurant", "mall", "amusement_park", "scenic_spot", "exhibition_hall"})