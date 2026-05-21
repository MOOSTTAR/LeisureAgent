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

_CUISINE_TYPES = ["中餐", "西餐", "日料", "火锅", "烧烤", "东南亚菜", "韩餐", "自助餐", "小吃", "粤菜"]

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
    "北京欢乐谷", "环球影城", "石景山游乐园", "北京动物园", "北京海洋馆",
    "世界公园", "中华民族园", "北京野生动物园", "朝阳公园游乐场", "龙潭公园游乐场",
    "陶然亭公园", "紫竹院公园", "玉渊潭公园", "北海公园", "景山公园",
    "中山公园", "地坛公园", "天坛公园", "奥林匹克森林公园", "颐和园",
    "圆明园", "香山公园", "八大处公园", "百望山森林公园", "西山国家森林公园",
    "凤凰岭自然风景区", "阳台山", "鹫峰国家森林公园", "大觉寺", "潭柘寺",
    "戒台寺", "红螺寺", "慕田峪长城", "八达岭长城", "居庸关长城",
    "司马台长城", "古北水镇", "雁栖湖", "青龙峡", "幽谷神潭",
    "京东大峡谷", "京东大溶洞", "金海湖", "十渡风景区", "野三坡",
    "龙庆峡", "百里画廊", "玉渡山", "康西草原", "松山自然保护区",
]

_AMUSEMENT_THEMES = ["童话", "海洋", "科幻", "卡通", "自然", "历史", "探险", "亲子", "刺激", "休闲"]

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

_TRAVEL_TYPES = ["亲子", "美食", "逛街", "风景", "人文", "探险", "休闲", "购物", "文化", "自然"]


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
    return base_x + random.randint(-3, 3), base_y + random.randint(-3, 3)


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
        "cuisine_type": random.choice(_CUISINE_TYPES),
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
        "park_theme": random.choice(_AMUSEMENT_THEMES),
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
        "spot_type": random.choice(_SPOT_TYPES),
        "business_hours": _gen_hours(),
        "booking_hours": _gen_hours() if random.random() > 0.3 else "不能预约",
        "current_booking_count": random.randint(0, 500),
        "max_booking_count": random.randint(200, 2000),
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
        "hall_type": random.choice(_HALL_TYPES),
        "business_hours": _gen_hours(),
        "booking_hours": _gen_hours() if random.random() > 0.1 else "不能预约",
        "current_booking_count": random.randint(0, 300),
        "max_booking_count": random.randint(100, 1000),
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
    days = random.choice([1, 1, 1, 1, 2, 2, 3])
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

MOCK_TRAVEL_PLAN_ITEMS: list[dict] = []
for i in range(1, 51):
    arrive_h = random.randint(8, 18)
    leave_h = arrive_h + random.randint(1, 4)
    MOCK_TRAVEL_PLAN_ITEMS.append({
        "id": i,
        "plan_id": random.randint(1, 50),
        "location_table_name": random.choice(_LOCATION_TABLES),
        "location_id": random.randint(1, 50),
        "day_num": random.choice([1, 1, 1, 1, 2, 2, 3]),
        "arrive_time": f"{arrive_h}:{random.choice(['00', '15', '30', '45'])}",
        "leave_time": f"{leave_h}:{random.choice(['00', '15', '30', '45'])}",
        "stay_minute": random.choice([30, 45, 60, 90, 120, 150, 180, 240]),
        "remark": random.choice(["推荐提前预约", "适合拍照", "注意防晒", "带好证件", None, None, None, None]),
    })