"""Mock API 数据，覆盖正常流程和异常场景"""

from app.models.schemas import BookingResult, SearchResult

# ── 搜索 Mock ──

MOCK_RESTAURANTS = [
    SearchResult(
        id="rest-001",
        name="海底捞（朝阳店）",
        category="火锅",
        address="朝阳区建国路88号",
        rating=4.7,
        avg_cost=150,
        tags=["火锅", "服务好", "适合家庭"],
    ),
    SearchResult(
        id="rest-002",
        name="西贝莜面村（望京店）",
        category="西北菜",
        address="望京街9号",
        rating=4.5,
        avg_cost=100,
        tags=["西北菜", "适合带娃", "上菜快"],
    ),
    SearchResult(
        id="rest-003",
        name="鼎泰丰（国贸店）",
        category="中式",
        address="国贸大厦3层",
        rating=4.6,
        avg_cost=180,
        tags=["小笼包", "精致", "排队多"],
    ),
]

MOCK_ACTIVITIES = [
    SearchResult(
        id="act-001",
        name="朝阳公园",
        category="公园",
        address="朝阳区朝阳公园路1号",
        rating=4.6,
        avg_cost=0,
        tags=["户外", "免费", "遛娃"],
    ),
    SearchResult(
        id="act-002",
        name="中国科学技术馆",
        category="博物馆",
        address="朝阳区北辰东路5号",
        rating=4.8,
        avg_cost=30,
        tags=["室内", "科普", "亲子"],
    ),
    SearchResult(
        id="act-003",
        name="万达影城（CBD店）",
        category="电影院",
        address="朝阳区建国路89号",
        rating=4.3,
        avg_cost=80,
        tags=["电影", "室内", "休闲"],
    ),
]

MOCK_DELIVERY_ITEMS = [
    SearchResult(
        id="dlv-001",
        name="星巴克冰美式套餐",
        category="饮品",
        address="朝阳区建国路90号",
        rating=4.2,
        avg_cost=35,
        tags=["咖啡", "外卖"],
    ),
    SearchResult(
        id="dlv-002",
        name="喜茶多肉葡萄",
        category="饮品",
        address="朝阳区望京街10号",
        rating=4.4,
        avg_cost=28,
        tags=["奶茶", "外卖"],
    ),
]

# ── Mock 搜索结果复用 ──


def search_by_keyword(query: str, category: str | None = None) -> list[SearchResult]:
    """模拟搜索，按关键词匹配"""
    query_lower = query.lower()
    pool: list[SearchResult] = []
    if category in (None, "dining"):
        pool.extend(MOCK_RESTAURANTS)
    if category in (None, "activity"):
        pool.extend(MOCK_ACTIVITIES)
    if category in (None, "delivery"):
        pool.extend(MOCK_DELIVERY_ITEMS)

    results = []
    for item in pool:
        if query_lower in item.name.lower() or query_lower in " ".join(item.tags).lower():
            results.append(item)
    if not results:
        results = pool[:3]
    return results


def get_item_by_id(item_id: str) -> SearchResult | None:
    """按 ID 查找"""
    for item in [*MOCK_RESTAURANTS, *MOCK_ACTIVITIES, *MOCK_DELIVERY_ITEMS]:
        if item.id == item_id:
            return item
    return None


# ── 预订 Mock ──

SUCCESS_BOOKING = BookingResult(success=True, booking_id="BK20260519001", message="预订成功！")
FAILURE_BOOKING = BookingResult(success=False, booking_id="", message="该时段已满，请选择其他时间。")