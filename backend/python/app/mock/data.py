"""Mock API 数据，覆盖正常流程和异常场景

每个表包含 50 条假数据，覆盖主流场景和边界情况。
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta

# ── 工具函数 ──

random.seed(42)
_AREAS = [
    ("朝阳区", 10, 30),
    ("海淀区", -5, 20),
    ("东城区", 15, 25),
    ("西城区", 10, 20),
    ("丰台区", 5, 15),
    ("通州区", -10, 5),
    ("大兴区", -15, -5),
    ("顺义区", 0, 35),
    ("昌平区", -20, 30),
    ("石景山区", -5, 10),
]

_CUISINE_TYPES = ["中餐", "西餐", "日料", "火锅", "烧烤", "东南亚菜", "韩餐", "自助餐", "小吃", "粤菜",
                   "川菜", "湘菜", "面食", "素食", "海鲜", "家常菜", "饺子", "烤鸭", "拉面", "米线", "寿司"]

_CUISINE_NAME_RULES: list[tuple[list[str], str]] = [
    (["火锅", "海底捞", "呷哺", "涮肉", "聚宝源", "南门", "涮"], "火锅"),
    (["烤鸭", "全聚德", "大董", "便宜坊", "金百万"], "烤鸭"),
    (["饺子", "百饺", "馅老满", "大清花", "老边饺子", "东方饺子王"], "饺子"),
    (["日料", "寿司", "居酒屋", "筑地", "牛角", "温野菜", "野菜村", "旬野菜", "青空"], "日料"),
    (["川菜", "蜀国", "渝信", "沸腾", "辣婆婆", "眉州", "酸菜鱼"], "川菜"),
    (["粤菜", "利苑", "翠园", "唐宫", "金鼎轩"], "粤菜"),
    (["烧烤", "老干杯", "极炙", "烤肉"], "烧烤"),
    (["傣家", "云海肴", "火烧云", "东南亚"], "东南亚菜"),
    (["韩餐", "韩式", "韩国"], "韩餐"),
    (["小吃", "护国寺", "庆丰", "包子", "豆汁", "炒肝", "姚记", "白魁"], "小吃"),
    (["西餐", "牛排", "披萨", "汉堡"], "西餐"),
    (["海鲜", "鱼", "虾", "蟹", "海鲜"], "海鲜"),
    (["素食", "素", "斋"], "素食"),
    (["拉面", "牛肉面", "兰州"], "拉面"),
    (["米线", "米粉", "过桥"], "米线"),
    (["面食", "面", "莜面", "鼎泰丰"], "面食"),
    (["自助", "自助餐"], "自助餐"),
    (["湘菜", "湘"], "湘菜"),
    (["寿司"], "寿司"),
    (["家常菜", "外婆家", "绿茶", "紫光园", "大鸭梨", "胡大", "花家怡园",
      "京味斋", "旺顺阁", "莆田", "西贝", "眉州东坡"], "中餐"),
]


def _get_cuisine_type(name: str) -> str:
    """根据餐厅名称推断菜系类型。"""
    for keywords, cuisine in _CUISINE_NAME_RULES:
        if any(kw in name for kw in keywords):
            return cuisine
    return "中餐"

_RESTAURANT_NAMES = [
    "海底捞", "西贝莜面村", "鼎泰丰", "大董烤鸭", "全聚德",
    "眉州东坡", "太二酸菜鱼", "呷哺呷哺", "云海肴", "外婆家",
    "绿茶餐厅", "胡大饭馆", "花家怡园", "南门涮肉", "聚宝源",
    "京味斋", "旺顺阁", "金鼎轩", "唐宫", "翠园",
    "莆田餐厅", "利苑酒家", "老干杯", "极炙", "鸟剑居酒屋",
    "筑地青空", "牛角", "温野菜", "伊豆野菜村", "旬野菜",
    "火烧云傣家菜", "紫光园", "护国寺小吃", "姚记炒肝", "庆丰包子铺",
    "老磁器口豆汁", "白魁老号", "便宜坊", "大鸭梨", "金百万",
    "蜀国演义", "渝信川菜", "沸腾鱼乡", "辣婆婆", "眉州小吃",
    "东方饺子王", "老边饺子", "大清花", "馅老满", "天津百饺园",
]

_RESTAURANT_TAGS_POOL = [
    "网红店", "亲子餐厅", "夜景", "老字号", "排队王",
    "适合约会", "商务宴请", "适合带娃", "性价比高", "环境好",
    "上菜快", "服务好", "有包间", "有露天位", "深夜营业",
]

_MALL_NAMES = [
    "朝阳大悦城", "国贸商城", "三里屯太古里", "王府井百货", "西单大悦城",
    "合生汇", "蓝色港湾", "华熙LIVE", "荟聚购物中心", "龙湖长楹天街",
    "万达广场", "新中关购物中心", "世纪金源购物中心", "汉光百货", "君太百货",
    "SKP", "侨福芳草地", "颐堤港", "凯德MALL", "来福士中心",
    "东方新天地", "APM", "新世界百货", "银泰中心", "国瑞购物中心",
    "富力广场", "乐成中心", "双安商场", "当代商城", "翠微百货",
    "长安商场", "百盛购物中心", "庄胜崇光", "搜秀城", "前门大街",
    "大栅栏商业街", "秀水街", "雅宝路", "红桥市场", "天意小商品",
    "万通小商品", "官园商品", "金源燕莎", "燕莎奥特莱斯", "赛特奥特莱斯",
    "八达岭奥特莱斯", "佛罗伦萨小镇", "首创奥特莱斯", "斯普瑞斯奥特莱斯", "老佛爷百货",
]

_MALL_TAGS_POOL = ["有影院", "有超市", "有餐饮", "有亲子", "有停车场"]

_AMUSEMENT_NAMES = [
    # 0-9: 主题乐园 / 动物园 / 海洋馆
    "北京欢乐谷", "环球影城", "石景山游乐园", "北京动物园", "北京海洋馆",
    "世界公园", "中华民族园", "北京野生动物园", "朝阳公园游乐场", "龙潭公园游乐场",
    # 10-19: 水上乐园 / 温泉
    "水立方嬉水乐园", "乐高探索中心", "乐多港奇幻乐园", "运河苑温泉水世界",
    "摩锐水世界", "温都水城", "南宫温泉水世界", "蟹岛绿色生态度假村",
    "奥林匹克水上公园", "青年湖公园水上乐园",
    # 20-29: 冰雪 / 海洋 / 特色园区
    "乔波冰雪世界", "太平洋海底世界", "富国海底世界", "杜莎夫人蜡像馆",
    "呀路古热带植物园", "七彩蝶园", "北京国际鲜花港", "张裕爱斐堡国际酒庄",
    "蓝调庄园", "北京园博园",
    # 30-39: 影视 / 运动 / 儿童乐园
    "中国影视大乐园", "欢乐松鼠谷", "国际雕塑公园", "首钢极限公园",
    "人定湖公园游乐场", "红领巾公园游乐场", "团结湖公园水上乐园",
    "KidSteam儿童乐园", "万达宝贝王乐园", "大玩家超乐场",
    # 40-49: 亲子乐园 / 室内公园
    "卡通尼乐园", "宝露露儿童乐园", "莫莉幻想亲子乐园", "汤姆熊欢乐世界",
    "悠游堂亲子乐园", "奇乐儿儿童乐园", "幻贝家室内公园", "乐翻了运动乐园",
    "米蒂跳儿童乐园", "家盒子亲子乐园",
]

_AMUSEMENT_THEMES = ["童话", "海洋", "科幻", "卡通", "自然", "历史", "探险", "亲子", "刺激", "休闲"]

_PARK_THEME_RULES: list[tuple[list[str], str]] = [
    # ── 精确主题匹配 ──
    (["海洋", "水族", "海底", "海"], "海洋"),
    (["环球影城", "科幻", "星际"], "科幻"),
    (["蜡像馆", "雕塑", "艺术区", "798"], "休闲"),
    (["酒庄", "蓝调"], "休闲"),
    (["世界公园", "民族园", "影视", "卡通", "乐高"], "卡通"),
    (["动物园", "野生动物", "植物园", "热带", "蝶园", "鲜花港", "生态", "园博园", "松鼠谷"], "自然"),
    (["冰雪", "滑雪"], "探险"),
    (["欢乐谷", "极限", "运动乐园"], "探险"),
    (["故宫", "雍和宫", "长城", "寺庙", "古迹", "遗址", "十三陵", "塔林"], "历史"),
    # ── 泛化匹配（水/乐园/亲子在前，自然在后）──
    (["儿童", "宝贝", "亲子", "KidSteam", "宝露露", "莫莉幻想", "悠游堂",
      "奇乐儿", "幻贝家", "米蒂跳", "家盒子", "卡通尼", "汤姆熊", "大玩家"], "亲子"),
    (["游乐园", "游乐场", "嬉水", "水世界", "水城", "水乐园", "水上"], "亲子"),
    (["乐园"], "卡通"),
    (["山", "峰", "湖", "峡", "谷", "潭", "洞", "草原", "森林", "画廊"], "自然"),
    (["公园"], "休闲"),
]


def _get_park_theme(name: str) -> str:
    for keywords, theme in _PARK_THEME_RULES:
        if any(kw in name for kw in keywords):
            return theme
    return "休闲"

_SCENIC_NAMES = [
    "颐和园", "圆明园", "天坛公园", "北海公园", "景山公园",
    "香山公园", "八大处公园", "百望山", "西山森林公园", "凤凰岭",
    "阳台山", "鹫峰", "大觉寺", "潭柘寺", "戒台寺",
    "红螺寺", "慕田峪长城", "八达岭长城", "居庸关长城", "司马台长城",
    "古北水镇", "雁栖湖", "青龙峡", "幽谷神潭", "京东大峡谷",
    "京东大溶洞", "金海湖", "十渡", "野三坡", "龙庆峡",
    "百里山水画廊", "玉渡山", "康西草原", "松山", "蟒山森林公园",
    "十三陵", "银山塔林", "虎峪", "白羊沟", "双龙峡",
    "百花山", "灵山", "妙峰山", "珍珠湖", "落坡岭",
    "野鸭湖", "妫河", "大杨山", "上方山", "圣莲山",
]

_SPOT_TYPES = ["山水", "古迹", "人文", "溶洞", "湖泊", "森林", "草原", "峡谷", "寺庙", "长城"]

_SPOT_TYPE_RULES: list[tuple[list[str], str]] = [
    (["长城"], "长城"),
    (["寺", "庙", "宫", "观", "塔林", "塔", "陵"], "古迹"),
    (["湖", "海", "潭", "淀"], "湖泊"),
    (["洞", "溶洞"], "溶洞"),
    (["峡谷", "峡", "沟", "谷"], "峡谷"),
    (["草原", "甸"], "草原"),
    (["森林", "山", "峰", "岭", "顶", "台"], "山水"),
    (["水镇", "古镇", "村", "镇"], "人文"),
    (["河", "画廊", "泉", "瀑"], "山水"),
]


def _get_spot_type(name: str) -> str:
    for keywords, spot_type in _SPOT_TYPE_RULES:
        if any(kw in name for kw in keywords):
            return spot_type
    return "山水"

_EXHIBITION_NAMES = [
    "中国国家博物馆", "故宫博物院", "首都博物馆", "北京自然博物馆", "中国科技馆",
    "中国军事博物馆", "中国美术馆", "国家动物博物馆", "中国电影博物馆", "中国航空博物馆",
    "北京天文馆", "中国地质博物馆", "中国铁道博物馆", "中国邮政邮票博物馆", "中国钱币博物馆",
    "中国农业博物馆", "中国水利博物馆", "中国体育博物馆", "中国印刷博物馆", "中国化工博物馆",
    "北京汽车博物馆", "北京民俗博物馆", "北京古建筑博物馆", "北京石刻艺术博物馆", "北京艺术博物馆",
    "今日美术馆", "UCCA尤伦斯", "798艺术区", "草场地艺术区", "宋庄艺术区",
    "红砖美术馆", "松美术馆", "罗红摄影艺术馆", "中间美术馆", "民生现代美术馆",
    "中华世纪坛", "国家会议中心", "北京展览馆", "全国农业展览馆", "中国国际展览中心",
    "国家速滑馆", "冰丝带", "鸟巢", "水立方", "国家体育馆",
    "五棵松体育馆", "凯迪拉克中心", "国家大剧院", "保利剧院", "天桥艺术中心",
]

_HALL_TYPES = ["历史", "艺术", "科技", "自然", "综合"]

_HALL_TYPE_RULES: list[tuple[list[str], str]] = [
    (["科技", "天文", "航空", "航天", "铁道", "汽车", "化工", "印刷", "水利", "速滑"], "科技"),
    (["美术", "艺术", "UCCA", "798", "草场地", "宋庄", "红砖", "松美术", "摄影", "罗红"], "艺术"),
    (["自然", "动物", "地质", "农业"], "自然"),
    (["故宫", "国家博物馆", "首都博物馆", "军事", "民俗", "古建筑", "石刻", "钱币", "邮票", "世纪坛"], "历史"),
    (["电影", "国家大剧院", "保利剧院", "天桥", "鸟巢", "水立方", "体育馆", "会议", "展览"], "综合"),
]


def _get_hall_type(name: str) -> str:
    for keywords, hall_type in _HALL_TYPE_RULES:
        if any(kw in name for kw in keywords):
            return hall_type
    return "综合"

_PLAN_TITLES = [
    "周末亲子一日游", "情侣浪漫约会", "好友聚餐逛街", "家庭休闲游", "文化历史之旅",
    "户外运动一日", "美食探店之旅", "文艺青年路线", "亲子科普游", "购物狂欢日",
    "老年休闲游", "学生党穷游", "商务接待方案", "外地朋友游", "生日派对方案",
    "纪念日特别策划", "公司团建方案", "摄影采风路线", "研学教育之旅", "季节性特色游",
    "春季赏花游", "夏季避暑游", "秋季红叶游", "冬季温泉游", "节假日短途游",
    "周末放松游", "自驾游路线", "地铁沿线游", "步行游览路线", "夜景游览路线",
    "美食一条街", "文艺打卡路线", "网红探店之旅", "老北京文化游", "新北京地标游",
    "亲子乐园游", "博物馆一日游", "公园野餐计划", "登山徒步路线", "骑行游览路线",
    "水上乐园游", "冰雪体验之旅", "温泉放松之旅", "养生休闲之旅", "禅修体验之旅",
    "非遗文化之旅", "京郊民宿体验", "露营烧烤计划", "观鸟自然之旅", "星空观测之旅",
]

_TRAVEL_TYPES = ["亲子", "美食", "逛街", "风景", "人文", "探险", "休闲", "购物", "文化", "自然","单人出行"]


def _gen_addr(area: str) -> str:
    streets = ["建国路", "朝阳路", "望京街", "中关村大街", "王府井大街", "西单北大街",
               "三里屯路", "工体北路", "东直门外大街", "长安街", "平安大街", "学院路"]
    nums = [f"{i}号" for i in range(1, 301)]
    return f"{area}{random.choice(streets)}{random.choice(nums)}"


def _gen_tags(pool: list[str], k: int = 3) -> str:
    import json
    return json.dumps(random.sample(pool, min(k, len(pool))), ensure_ascii=False)


def _gen_hours() -> str:
    opens = [f"{h}:00" for h in range(6, 12)]
    closes = [f"{h}:00" for h in range(18, 24)]
    return f"{random.choice(opens)}-{random.choice(closes)}"


def _gen_booking_limit() -> tuple[int, int]:
    max_b = random.randint(20, 200)
    current = random.randint(0, max_b)
    return current, max_b


def _gen_coord(base_x: int, base_y: int) -> tuple[int, int]:
    return random.randint(-1200, 1200), random.randint(-1200, 1200)


# ═══════════════════════════════════════════
#  restaurant — 餐厅（50 条）
# ═══════════════════════════════════════════

MOCK_RESTAURANTS: list[dict] = []
for i in range(1, 51):
    area_name, bx, by = _AREAS[i % len(_AREAS)]
    x, y = _gen_coord(bx, by)
    current, max_b = _gen_booking_limit()
    MOCK_RESTAURANTS.append({
        "id": i,
        "name": _RESTAURANT_NAMES[i - 1],
        "address": _gen_addr(area_name),
        "x": x,
        "y": y,
        "cuisine_type": _get_cuisine_type(_RESTAURANT_NAMES[i - 1]),
        "dining_style": random.choice([0, 1, 2]),
        "tags": _gen_tags(_RESTAURANT_TAGS_POOL),
        "business_hours": _gen_hours(),
        "booking_hours": _gen_hours() if random.random() > 0.15 else "不能预约",
        "current_booking_count": current,
        "max_booking_count": max_b,
        "queue_time": random.choice([-1, -1, -1, 10, 20, 30, 45, 60]),
        "indoor_env": random.choice(["简约温馨", "中式古典", "现代轻奢", "工业风", "田园风", None]),
    })

# ═══════════════════════════════════════════
#  mall — 商场（50 条）
# ═══════════════════════════════════════════

MOCK_MALLS: list[dict] = []
for i in range(1, 51):
    area_name, bx, by = _AREAS[i % len(_AREAS)]
    x, y = _gen_coord(bx, by)
    MOCK_MALLS.append({
        "id": i,
        "name": _MALL_NAMES[i - 1],
        "address": _gen_addr(area_name),
        "x": x,
        "y": y,
        "cinema_has": random.choice([0, 0, 1]),
        "supermarket_has": random.choice([0, 1, 1]),
    })

# ═══════════════════════════════════════════
#  amusement_park — 游乐园/主题乐园（50 条）
# ═══════════════════════════════════════════

MOCK_AMUSEMENT_PARKS: list[dict] = []
for i in range(1, 51):
    area_name, bx, by = _AREAS[i % len(_AREAS)]
    x, y = _gen_coord(bx, by)
    current, max_b = _gen_booking_limit()
    MOCK_AMUSEMENT_PARKS.append({
        "id": i,
        "name": _AMUSEMENT_NAMES[i - 1],
        "address": _gen_addr(area_name),
        "x": x,
        "y": y,
        "business_hours": _gen_hours(),
        "booking_hours": _gen_hours() if random.random() > 0.2 else "不能预约",
        "current_booking_count": current,
        "max_booking_count": max_b,
        "park_theme": _get_park_theme(_AMUSEMENT_NAMES[i - 1]),
        "ticket_price": round(random.choice([0, 0, 10, 30, 50, 80, 100, 150, 200, 299]), 2),
        "queue_time": random.choice([-1, -1, 5, 10, 15, 20, 30, 45]),
        "performance_info": random.choice(["有日常表演", "周末有演出", "节假日有活动", None, None]),
    })

# ═══════════════════════════════════════════
#  scenic_spot — 户外景点（50 条）
# ═══════════════════════════════════════════

MOCK_SCENIC_SPOTS: list[dict] = []
for i in range(1, 51):
    area_name, bx, by = _AREAS[i % len(_AREAS)]
    x, y = _gen_coord(bx, by)
    MOCK_SCENIC_SPOTS.append({
        "id": i,
        "name": _SCENIC_NAMES[i - 1],
        "address": _gen_addr(area_name),
        "x": x,
        "y": y,
        "spot_type": _get_spot_type(_SCENIC_NAMES[i - 1]),
        "business_hours": _gen_hours(),
        "booking_hours": _gen_hours() if random.random() > 0.3 else "不能预约",
        "current_booking_count": (s_c := random.randint(0, 2000)),
        "max_booking_count": s_c + random.randint(1, 500),
        "crowd_density": random.choice([1, 1, 2, 2, 2, 3]),
    })

# ═══════════════════════════════════════════
#  exhibition_hall — 展馆展览馆（50 条）
# ═══════════════════════════════════════════

MOCK_EXHIBITION_HALLS: list[dict] = []
for i in range(1, 51):
    area_name, bx, by = _AREAS[i % len(_AREAS)]
    x, y = _gen_coord(bx, by)
    MOCK_EXHIBITION_HALLS.append({
        "id": i,
        "name": _EXHIBITION_NAMES[i - 1],
        "address": _gen_addr(area_name),
        "x": x,
        "y": y,
        "hall_type": _get_hall_type(_EXHIBITION_NAMES[i - 1]),
        "business_hours": _gen_hours(),
        "booking_hours": _gen_hours() if random.random() > 0.1 else "不能预约",
        "current_booking_count": (e_c := random.randint(0, 1000)),
        "max_booking_count": e_c + random.randint(1, 400),
        "exhibition_theme": random.choice(
            ["古代文明", "现代艺术", "自然科学", "航空航天", "汽车文化",
             "摄影艺术", "非遗传承", "数字科技", "经典永恒", "潮流前沿"]
        ),
        "ticket_type": random.choice([0, 0, 1, 1]),
        "ticket_price": round(random.choice([0, 10, 20, 30, 50, 60, 80, 100, 120, 150]), 2),
        "manual_guide": random.choice([0, 1]),
        "interactive_project": random.choice([0, 0, 1]),
        "crowd_level": random.choice([1, 1, 2, 2, 2, 3]),
    })

# ═══════════════════════════════════════════
#  travel_plan — 游玩规划方案（50 条）
# ═══════════════════════════════════════════

MOCK_TRAVEL_PLANS: list[dict] = []
for i in range(1, 51):
    cost = round(random.uniform(50, 2000), 2)
    days = random.choice([1, 1, 1, 1, 2, 2])
    MOCK_TRAVEL_PLANS.append({
        "id": i,
        "plan_title": _PLAN_TITLES[i - 1],
        "plan_desc": f"{_TRAVEL_TYPES[i % len(_TRAVEL_TYPES)]}主题的周末出行方案，适合{random.choice(['全家', '情侣', '朋友', '独自'])}出行",
        "travel_days": days,
        "travel_type": _TRAVEL_TYPES[i % len(_TRAVEL_TYPES)],
        "travel_date": (datetime.now() + timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d"),
        "total_cost": cost,
    })

# ═══════════════════════════════════════════
#  travel_plan_item — 规划方案明细（50 条）
# ═══════════════════════════════════════════

_LOCATION_TABLES = ["restaurant", "mall", "amusement_park", "scenic_spot", "exhibition_hall"]


def _get_location_bias(title: str) -> list[str]:
    """根据计划标题的主题偏向，返回加权的地点类型列表"""
    # 美食/探店/聚餐 → 餐厅为主
    if any(kw in title for kw in ["美食", "探店", "聚餐"]):
        return ["restaurant"] * 4 + ["mall", "scenic_spot"]

    # 购物 → 商场为主
    if "购物" in title:
        return ["mall"] * 4 + ["restaurant", "exhibition_hall"]

    # 乐园/水上/冰雪 → 游乐园为主
    if any(kw in title for kw in ["乐园", "水上", "冰雪"]):
        return ["amusement_park"] * 4 + ["restaurant", "mall"]

    # 户外/自然/运动 → 景点为主
    if any(kw in title for kw in ["登山", "徒步", "骑行", "观鸟", "露营",
                                    "野餐", "自然", "赏花", "红叶", "避暑",
                                    "温泉", "自驾", "户外", "运动", "公园", "民宿"]):
        return ["scenic_spot"] * 4 + ["restaurant", "amusement_park"]

    # 夜景 → 景点 + 商场
    if "夜景" in title:
        return ["scenic_spot"] * 3 + ["mall"] * 2 + ["restaurant"]

    # 博物馆/文化/历史/文艺/科普/非遗/研学/摄影/禅修 → 展馆为主
    if any(kw in title for kw in ["博物馆", "文化", "历史", "文艺",
                                    "科普", "非遗", "研学", "摄影", "禅修", "星空"]):
        return ["exhibition_hall"] * 4 + ["scenic_spot", "restaurant"]

    # 逛街 → 商场 + 餐厅
    if "逛街" in title:
        return ["mall"] * 3 + ["restaurant"] * 3

    # 综合类：餐厅稍多（每段行程总得吃饭）
    return _LOCATION_TABLES + ["restaurant"]


def _to_minutes(t: str) -> int:
    h, m = t.split(":")
    return int(h) * 60 + int(m)


_TRAVEL_MODES = ["walking", "biking", "driving", "subway"]

MOCK_TRAVEL_PLAN_ITEMS: list[dict] = []
_item_id = 1
for plan_id in range(1, 51):
    plan_title = MOCK_TRAVEL_PLANS[plan_id - 1]["plan_title"]
    plan_days = MOCK_TRAVEL_PLANS[plan_id - 1]["travel_days"]
    location_pool = _get_location_bias(plan_title)
    num_items = random.randint(2, 5)

    # 将 items 分配到各天
    if plan_days == 1:
        day_counts = [num_items]
    else:
        day1 = max(1, num_items // 2)
        day_counts = [day1, num_items - day1]

    plan_items = []
    is_first = True  # 第一个 item travel_mode 为 null
    for day_num, count in enumerate(day_counts, start=1):
        # 当天第一个活动 9:00-10:00 开始
        cursor = 9 * 60 + random.randint(0, 60)
        for _ in range(count):
            arrive = cursor
            stay = random.choice([60, 90, 120, 150, 180])
            leave = arrive + stay
            # 取整到 5 分钟
            arrive = (arrive + 2) // 5 * 5
            leave = (leave + 2) // 5 * 5
            stay_min = max(5, leave - arrive)
            plan_items.append({
                "id": _item_id,
                "plan_id": plan_id,
                "location_table_name": random.choice(location_pool),
                "location_id": random.randint(1, 50),
                "day_num": day_num,
                "is_need_booking": random.choice([0, 1]),
                "is_had_booking": 0,
                "arrive_time": f"{arrive // 60}:{arrive % 60:02d}",
                "leave_time": f"{leave // 60}:{leave % 60:02d}",
                "stay_minute": stay_min,
                "travel_mode": None if is_first else random.choice(_TRAVEL_MODES),
                "remark": random.choice(["推荐提前预约", "适合拍照", "注意防晒", "带好证件", None, None, None, None]),
            })
            _item_id += 1
            is_first = False
            # 下一个活动在上一个结束后 15-60 分钟开始
            cursor = leave + random.randint(15, 60)
    MOCK_TRAVEL_PLAN_ITEMS.extend(plan_items)