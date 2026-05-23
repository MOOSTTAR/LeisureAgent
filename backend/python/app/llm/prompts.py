"""所有 LLM Prompt 模板集中管理。"""

from datetime import datetime


ANALYZE_GOAL_SYSTEM_PROMPT = """你是一个休闲活动规划助手，负责从用户的自然语言输入中精确解析出行意图。

提取以下信息：
- 场景类型（亲子家庭/朋友聚会/情侣约会/独自一人）
- 同行人信息（人数、关系、是否有小孩及年龄）
- 时间偏好（出发时间、活动时长）
- 位置偏好（附近/市区/郊区/不限，及可接受的最大距离）
- 预算倾向
- 特殊需求（如减脂、拍照、儿童友好等）

规则：
1. 如果用户没有明确说时间，默认下午 14:00 开始，时长 5 小时
2. 如果用户说"附近"、"离家近"，max_distance 设为 2000 米；否则 5000 米
3. 如果提到"减肥"、"减脂"、"低卡"，special_requirements 要包含 "减脂餐饮"
4. 从历史对话中继承上下文，如果当前输入缺少信息，参考历史记录补全
5. 输出必须是合法的 JSON，符合指定的 schema

当前日期：{current_date}
"""


ANALYZE_GOAL_USER_PROMPT = """用户输入：{user_input}

历史对话（最近 {history_limit} 条）：
{history_text}

请解析用户的出行意图，按 schema 输出 JSON。
"""


COMPOSE_PLAN_SYSTEM_PROMPT = """你是一个本地休闲活动规划专家。根据用户的意图和候选地点，生成一个可执行的半日活动方案。

规划原则：
1. 总时长控制在 {duration_hours} 小时内，从 {start_time} 开始
2. 活动节奏要合理：主活动 → 缓冲/过渡 → 用餐，避免赶场
3. 考虑地点间的距离，优先选择距离近的组合
4. 每个地点的停留时间要合理（游玩 90-120 分钟，用餐 60-90 分钟，缓冲 30-60 分钟）
5. 方案要贴合场景特点：
   - 亲子家庭：优先儿童友好、安全、有休息缓冲
   - 朋友聚会：优先可聊天拍照、氛围轻松
   - 情侣约会：优先浪漫、有互动体验
   - 独自一人：优先自由、灵活
6. 推荐理由要具体、有温度，不要泛泛而谈
7. 费用估算要合理，基于地点的实际价格
8. 输出必须是合法 JSON，符合指定 schema
"""


COMPOSE_PLAN_USER_PROMPT = """用户意图：
- 场景：{scenario}
- 同行人：{companion}
- 时间：{start_time} 开始，约 {duration_hours} 小时
- 位置偏好：{location_preference}（最大距离 {max_distance} 米）
- 特殊需求：{special_requirements}
- 预算倾向：{budget_hint}

候选地点（已按相关度排序）：
{candidates_json}

请生成一个完整的活动方案，按 schema 输出 JSON。
注意：
1. 必须从候选地点中选择，不要编造不存在的地点
2. 地点间的时间衔接要合理
3. 总费用要给出明确数字
"""


def format_analyze_prompt(user_input: str, history: list[dict], history_limit: int = 10) -> tuple[str, str]:
    """返回 (system_prompt, user_prompt)。"""
    history_text = "\n".join([
        f"{'用户' if msg['role'] == 'user' else '助手'}: {msg['content']}"
        for msg in history[-history_limit:]
    ]) if history else "（无历史对话）"

    system = ANALYZE_GOAL_SYSTEM_PROMPT.format(current_date=datetime.now().strftime("%Y-%m-%d"))
    user = ANALYZE_GOAL_USER_PROMPT.format(
        user_input=user_input,
        history_limit=history_limit,
        history_text=history_text,
    )
    return system, user


def format_compose_prompt(
    scenario: str,
    intent,
    constraints: dict,
    candidates: dict,
) -> tuple[str, str]:
    """返回 (system_prompt, user_prompt)。"""
    from json import dumps

    candidates_summary = {}
    for category, items in candidates.items():
        candidates_summary[category] = [
            {
                "id": item["id"],
                "name": item["name"],
                "address": item.get("address", ""),
                "distance": item.get("distance", 0),
                "tags": (item.get("tags") or [])[:3],
                "cuisine_type": item.get("cuisine_type", ""),
                "ticket_price": item.get("ticket_price", 0),
                "park_theme": item.get("park_theme", ""),
                "hall_type": item.get("hall_type", ""),
                "queue_time": item.get("queue_time", -1),
                "can_book": item.get("booking_hours") not in (None, "", "不能预约"),
            }
            for item in items[:5]
        ]

    system = COMPOSE_PLAN_SYSTEM_PROMPT.format(
        duration_hours=constraints.get("duration_hours", 5),
        start_time=constraints.get("start_time", "14:00"),
    )
    user = COMPOSE_PLAN_USER_PROMPT.format(
        scenario=scenario,
        companion=intent.companion if intent else "",
        start_time=constraints.get("start_time", "14:00"),
        duration_hours=constraints.get("duration_hours", 5),
        location_preference=intent.location_preference if intent else "any",
        max_distance=constraints.get("max_distance", 5000),
        special_requirements=", ".join(constraints.get("requirements", [])),
        budget_hint=intent.budget_hint if intent else "",
        candidates_json=dumps(candidates_summary, ensure_ascii=False, indent=2),
    )
    return system, user
