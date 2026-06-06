"""LeisureAgent 共享辅助函数与校验器。

从 planner.py 拆出，供各节点模块使用。
"""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

from app.agent.constants import (
    CAKE_KEYWORDS,
    COUPLE_SCENARIO_KEYWORDS,
    CUISINE_KEYWORDS,
    DEFAULT_CHILD_AGE,
    DEFAULT_MAX_DISTANCE,
    DEFAULT_PARTY_SIZE,
    DEFAULT_START_TIME,
    DIET_KEYWORDS,
    EVENING_KEYWORDS,
    FAMILY_SCENARIO_KEYWORDS,
    FLOWER_KEYWORDS,
    FRIENDS_SCENARIO_KEYWORDS,
    MORNING_KEYWORDS,
    NEARBY_KEYWORDS,
    NEARBY_MAX_DISTANCE,
)
from app.agent.tools import add_minutes
from app.models.schemas import AgentPlan, AgentPlanItem

# ═══════════════════════════════════════════════════════════════
# Stream 事件发射
# ═══════════════════════════════════════════════════════════════

try:
    from langgraph.config import get_stream_writer as _get_stream_writer
except ImportError:
    _get_stream_writer = None  # type: ignore[assignment]


def _emit_step(label: str) -> None:
    """通过 LangGraph stream writer 发射子步骤事件（安全调用）。"""
    if _get_stream_writer is None:
        return
    try:
        writer = _get_stream_writer()
        writer(("step", label))
    except Exception as e:
        logger.debug("stream writer emit failed for step '%s': %s", label, e)


# ═══════════════════════════════════════════════════════════════
# 校验常量（供 LLM 输出校验使用）
# ═══════════════════════════════════════════════════════════════

_VALID_SCENARIOS = {"family", "friends", "couple", "solo", "other"}
_VALID_LOCATION_PREFS = {"nearby", "downtown", "suburb", "any"}
_VALID_TABLES = {"restaurant", "mall", "amusement_park", "scenic_spot", "exhibition_hall"}
_VALID_ACTIVITY_TYPES = {"play", "dining", "extra", "rest"}
_VALID_INTENT_TYPES = {"casual", "out_of_domain", "inquiry", "clarify", "new_plan", "feedback", "confirm"}
_VALID_CATEGORIES = {"restaurant", "mall", "amusement_park", "scenic_spot", "exhibition_hall"}
_ALLOWED_CONSTRAINT_KEYS = {
    "max_distance", "no_queue", "cuisine_type", "exclude_ids",
    "budget", "time_shift", "min_rating",
}

_TIME_RE = re.compile(r"^(\d{1,2}):(\d{2})$")
_SAFE_COMPANION_RE = re.compile(r"[一-鿿　-〿＀-￯a-zA-Z0-9\s，。、（）()]+$")


# ═══════════════════════════════════════════════════════════════
# 时间工具
# ═══════════════════════════════════════════════════════════════

def _time_to_minutes(t: str) -> int:
    """HH:MM → 分钟数。"""
    m = _TIME_RE.match(t)
    if not m:
        raise ValueError(f"invalid time: {t}")
    return int(m.group(1)) * 60 + int(m.group(2))


# ═══════════════════════════════════════════════════════════════
# 坐标与候选辅助
# ═══════════════════════════════════════════════════════════════

def _get_xy(loc: dict[str, Any]) -> tuple[int, int]:
    try:
        return int(loc.get("x", 0)), int(loc.get("y", 0))
    except (ValueError, TypeError):
        return 0, 0


def _build_coord_lookup(candidates: dict) -> dict[tuple[str, int], tuple[int, int]]:
    """构建 (table_name, location_id) → (x, y) 坐标查找表。"""
    lookup: dict[tuple[str, int], tuple[int, int]] = {}
    for table_name, items_list in candidates.items():
        for item in items_list:
            key = (table_name, item.get("id", 0))
            lookup[key] = (item.get("x", 0), item.get("y", 0))
    return lookup


def _enrich_items(items, coord_lookup: dict) -> list[AgentPlanItem]:
    """为 LLM 输出的 plan items 填充 location_x/location_y。"""
    result = []
    for item in items:
        data = item.model_dump() if hasattr(item, "model_dump") else item
        key = (data.get("location_table_name", ""), data.get("location_id", 0))
        x, y = coord_lookup.get(key, (0, 0))
        data["location_x"] = x
        data["location_y"] = y
        result.append(AgentPlanItem(**data))
    return result


# ═══════════════════════════════════════════════════════════════
# Plan Item 构造与费用估算
# ═══════════════════════════════════════════════════════════════

def _plan_item(
    step_order: int, activity_type: str, table_name: str,
    location: dict[str, Any], arrive_time: str, stay_minute: int, remark: str,
    travel_mode: str | None = None,
) -> AgentPlanItem:
    leave_time = add_minutes(arrive_time, stay_minute)
    cost = _estimate_cost(table_name, location)
    return AgentPlanItem(
        step_order=step_order,
        activity_type=activity_type,
        location_table_name=table_name,
        location_id=location["id"],
        location_name=location["name"],
        address=location.get("address", ""),
        arrive_time=arrive_time,
        leave_time=leave_time,
        stay_minute=stay_minute,
        remark=remark,
        estimated_cost=cost,
        travel_mode=travel_mode,
    )


def _estimate_cost(table_name: str, location: dict[str, Any]) -> float:
    if table_name == "restaurant":
        cuisine = location.get("cuisine_type")
        per_person = {
            "火锅": 130, "烧烤": 110, "日料": 150, "西餐": 120,
            "粤菜": 120, "中餐": 100,
        }.get(cuisine, 90)
        return per_person * 4
    if table_name in {"amusement_park", "exhibition_hall"}:
        return float(location.get("ticket_price") or 0) * 4
    return 0


# ═══════════════════════════════════════════════════════════════
# 标题与展示文案
# ═══════════════════════════════════════════════════════════════

def _make_rule_title(items: list[AgentPlanItem], day_count: int) -> str:
    """根据实际行程内容生成动态标题。"""
    names = [it.location_name for it in items[:3] if it.location_name]
    if not names:
        return f"{day_count}日出行方案" if day_count > 1 else "半日出游方案"
    core = " · ".join(names[:2]) if len(names) >= 2 else names[0]
    if day_count > 1:
        return f"{core}等{day_count}日游"
    return f"{core}半日游"


def _build_presentation(plan: AgentPlan, exceptions: list[dict], warnings: list[str]) -> str:
    """构建方案展示的自然语言文案。"""
    lines = [f"为您规划了以下方案「{plan.title}」："]
    for i, item in enumerate(plan.items, 1):
        lines.append(
            f"{i}. {item.location_name} ({item.arrive_time}-{item.leave_time}) "
            f"- {item.remark}"
        )

    need_book = [item for item in plan.items if item.location_table_name != "mall"]
    if need_book:
        names = "、".join(item.location_name for item in need_book)
        lines.append(f"\n需要预约的是：{names}。")

    if exceptions:
        for e in exceptions:
            lines.append(f"⚠ {e['detail']}")

    if warnings:
        for w in warnings[:3]:
            lines.append(f"💡 {w}")

    lines.append(f"\n预计总花费约 {int(plan.total_cost)} 元。")
    lines.append('您觉得这个方案如何？如需调整请告诉我，确认请回复"确认"。')
    return "\n".join(lines)


def _build_booking_summary(results: list[dict], all_success: bool) -> str:
    """构建预约执行结果文案。"""
    if not results:
        return "该方案没有需要预约的项目。祝您周末愉快！"
    lines = ["预约执行结果："]
    for r in results:
        status = "✓" if r["status"] == "success" else "✗"
        lines.append(f"  {status} {r['location_name']}: {r['message']}")
    if all_success:
        lines.append("全部预约成功！")
    else:
        lines.append("部分预约未成功，可重新尝试。")
    return "\n".join(lines)


def _count_revisions(history: list[dict]) -> int:
    """统计历史消息中出现方案的次数（近似修订次数）。"""
    count = 0
    for msg in history:
        if msg.get("metadata", {}).get("stage") == "reviewing":
            count += 1
    return count


# ═══════════════════════════════════════════════════════════════
# 多日处理与日期标签
# ═══════════════════════════════════════════════════════════════

def _extract_day_labels_from_input(user_input: str, day_count: int) -> dict[int, str]:
    """从用户输入中提取各天的星期标签。"""
    labels: dict[int, str] = {}
    day_patterns = [
        (r'(周六|周日|星期六|星期日|星期天)', lambda m: m.group(1)[:2] if m.group(1) != '星期天' else '周日'),
        (r'周([一二三四五六日天])', lambda m: f'周{m.group(1)}' if m.group(1) != '天' else '周日'),
        (r'星期([一二三四五六日天])', lambda m: f'星期{m.group(1)}' if m.group(1) != '天' else '星期日'),
    ]
    found: list[str] = []
    for pattern, fn in day_patterns:
        for m in re.finditer(pattern, user_input):
            label = fn(m)
            if label not in found:
                found.append(label)
    for i, label in enumerate(found[:day_count]):
        labels[i + 1] = label
    return labels


def _extract_single_day_label(user_input: str, default_day_num: int = 1) -> str:
    """从输入提取单日星期标签。"""
    for pat in [r'(周六|周日|星期六|星期日|星期天)', r'周([一二三四五六日天])', r'星期([一二三四五六日天])']:
        m = re.search(pat, user_input)
        if m:
            label = m.group(0)
            return label[:2] if len(label) > 2 else label
    return ""


def _build_day_retry_instruction(user_input: str, day_count: int) -> str:
    """构建强制多日拆分的重试指令。"""
    return (
        f"【纠错指令 - 必须遵守】\n"
        f"上一轮你生成了 {day_count} 天的计划，但所有活动都挤在 day_num=1！\n"
        f"这不符合用户需求。请重新阅读用户原始输入，严格按照日期拆分：\n"
        f"用户说：「{user_input}」\n\n"
        f"拆分要求：\n"
        + "\n".join(
            f"  - 第 {d} 天的活动全部设为 day_num={d}，从用户输入中找到对应的星期填到 day_label"
            for d in range(1, day_count + 1)
        )
        + "\n\n禁止将所有活动放在同一天！每天至少 1 个活动项。"
    )


def _force_split_days(plan: AgentPlan, day_count: int, user_input: str) -> AgentPlan:
    """规则化拆分：将单日计划按活动数均分到多天。"""
    items = list(plan.items)
    if len(items) < day_count:
        for i, item in enumerate(items):
            item.day_num = (i % day_count) + 1
        return plan

    per_day = len(items) // day_count
    day_labels = _extract_day_labels_from_input(user_input, day_count)

    for d in range(day_count):
        start = d * per_day
        end = start + per_day if d < day_count - 1 else len(items)
        for item in items[start:end]:
            item.day_num = d + 1
            item.day_label = day_labels.get(d + 1, f"第{d + 1}天")

    # 每天独立调整时间
    base_time = "10:00"
    for d in range(1, day_count):
        day_items = [it for it in items if it.day_num == d + 1]
        if not day_items:
            continue
        cursor = base_time
        for item in day_items:
            stay = item.stay_minute or 60
            item.arrive_time = cursor
            item.leave_time = add_minutes(cursor, stay)
            cursor = add_minutes(cursor, stay + 15)

    return plan


def _ensure_day_labels(plan: AgentPlan, user_input: str) -> AgentPlan:
    """单日行程也补上 day_label（从用户输入提取星期）。"""
    actual_days = sorted(set(it.day_num for it in plan.items))
    if len(actual_days) == 1:
        day_num = actual_days[0]
        label = _extract_single_day_label(user_input, day_num)
        if label:
            for item in plan.items:
                if not item.day_label:
                    item.day_label = label
    return plan


# ═══════════════════════════════════════════════════════════════
# 文本清洗
# ═══════════════════════════════════════════════════════════════

def _sanitize_companion(text: str) -> str:
    """清洗 companion 字符串，去控制字符，截断过长。"""
    cleaned = re.sub(r"[\x00-\x1f\x7f]", "", text).strip()
    if len(cleaned) > 60:
        cleaned = cleaned[:60]
    if not _SAFE_COMPANION_RE.match(cleaned):
        cleaned = re.sub(r"[^一-鿿　-〿＀-￯a-zA-Z0-9\s，。、（）()]", "", cleaned).strip()
    return cleaned or "同行人"


# ═══════════════════════════════════════════════════════════════
# 场景检测与约束提取（规则兜底用）
# ═══════════════════════════════════════════════════════════════

def _detect_scenario(text: str, history: list[dict[str, Any]]) -> str:
    """检测场景（关键词 + TF-IDF 语义匹配双路径）。

    couple 必须在 friends 之前检查（"男朋友" 包含 "朋友"）。
    """
    from app.agent.semantic import get_matcher

    # 先尝试文本精确关键词
    if any(keyword in text for keyword in FAMILY_SCENARIO_KEYWORDS):
        return "family"
    if any(keyword in text for keyword in COUPLE_SCENARIO_KEYWORDS):
        return "couple"
    if any(keyword in text for keyword in FRIENDS_SCENARIO_KEYWORDS):
        return "friends"

    # 语义匹配：关键词没命中但语义相近
    matcher = get_matcher()
    if matcher.is_match(text, "family", min_score=0.25):
        return "family"
    if matcher.is_match(text, "couple", min_score=0.25):
        return "couple"
    if matcher.is_match(text, "friends", min_score=0.25):
        return "friends"

    # 回退历史
    for message in reversed(history):
        content = message.get("content", "")
        if any(keyword in content for keyword in FAMILY_SCENARIO_KEYWORDS):
            return "family"
        if any(keyword in content for keyword in COUPLE_SCENARIO_KEYWORDS):
            return "couple"
        if any(keyword in content for keyword in FRIENDS_SCENARIO_KEYWORDS):
            return "friends"
    return "other"


def _extract_constraints(text: str, scenario: str) -> dict[str, Any]:
    start_time = DEFAULT_START_TIME
    if any(kw in text for kw in EVENING_KEYWORDS):
        start_time = "17:00"
    elif any(kw in text for kw in MORNING_KEYWORDS):
        start_time = "10:00"

    requirements: list[str] = []
    if any(kw in text for kw in DIET_KEYWORDS):
        requirements.append("diet")
    if any(kw in text for kw in CAKE_KEYWORDS):
        requirements.append("cake")
    if any(kw in text for kw in FLOWER_KEYWORDS):
        requirements.append("flower")

    is_nearby = any(keyword in text for keyword in NEARBY_KEYWORDS)
    result: dict[str, Any] = {
        "start_time": start_time,
        "nearby": is_nearby,
        "max_distance": NEARBY_MAX_DISTANCE if is_nearby else DEFAULT_MAX_DISTANCE,
        "duration_hours": 5,
        "day_count": 1,
        "party_size": 4 if scenario == "friends" else DEFAULT_PARTY_SIZE,
        "child_age": DEFAULT_CHILD_AGE if scenario == "family" else None,
        "requirements": requirements,
    }

    for ck in CUISINE_KEYWORDS:
        if ck in text:
            result["cuisine_type"] = ck
            break

    return result


# ═══════════════════════════════════════════════════════════════
# PlanOutput 业务校验器（防止 LLM 瞎填参数）
# ═══════════════════════════════════════════════════════════════

def _make_plan_validator(candidates: dict[str, list[dict[str, Any]]], day_count: int = 1):
    """返回一个 PlanOutput 校验器，验证所有 location_id 来自候选且可用。"""

    valid_ids: dict[tuple[str, int], dict] = {}
    for table_name, items in candidates.items():
        for item in items:
            lid = item.get("id")
            if lid is not None:
                valid_ids[(table_name, int(lid))] = item

    def validate(plan) -> list[str]:
        errors: list[str] = []
        if plan.scenario not in _VALID_SCENARIOS:
            errors.append(f"scenario '{plan.scenario}' 无效")
        if len(plan.items) < 1:
            errors.append("方案至少需要 1 个活动项")
        if len(plan.items) > 10:
            errors.append("方案最多 10 个活动项")
        if day_count > 1:
            days_present = set(it.day_num for it in plan.items)
            missing_days = set(range(1, day_count + 1)) - days_present
            if missing_days:
                errors.append(
                    f"方案应覆盖 {day_count} 天，但缺少第{'、'.join(str(d) for d in sorted(missing_days))}天的活动。"
                    f"请确保每天至少安排 1 项活动。"
                )

        prev_leave_minutes = 0
        prev_day_num = 1
        for i, item in enumerate(plan.items):
            prefix = f"items[{i}]"

            if item.activity_type not in _VALID_ACTIVITY_TYPES:
                errors.append(f"{prefix}: activity_type '{item.activity_type}' 无效")

            if item.location_table_name not in _VALID_TABLES:
                errors.append(f"{prefix}: location_table_name '{item.location_table_name}' 无效")

            key = (item.location_table_name, item.location_id)
            candidate = valid_ids.get(key)
            if candidate is None:
                errors.append(
                    f"{prefix}: location_id={item.location_id} 不在 {item.location_table_name} 候选列表中，请从提供的候选 JSON 中选择"
                )

            if candidate and not candidate.get("available", True):
                errors.append(f"{prefix}: {candidate['name']} 标记为不可用(available=false)，必须避开")

            if not _TIME_RE.match(item.arrive_time):
                errors.append(f"{prefix}: arrive_time '{item.arrive_time}' 格式无效")
            if not _TIME_RE.match(item.leave_time):
                errors.append(f"{prefix}: leave_time '{item.leave_time}' 格式无效")

            try:
                arr = _time_to_minutes(item.arrive_time)
                lv = _time_to_minutes(item.leave_time)
                if arr >= lv:
                    errors.append(f"{prefix}: arrive_time >= leave_time ({item.arrive_time} >= {item.leave_time})")
                if item.day_num == prev_day_num and arr < prev_leave_minutes:
                    errors.append(f"{prefix}: arrive_time 早于上一项的 leave_time")
                prev_leave_minutes = lv
                prev_day_num = item.day_num or 1
            except ValueError:
                pass

            if not 5 <= item.stay_minute <= 360:
                errors.append(f"{prefix}: stay_minute {item.stay_minute} 不在 5-360 范围内")

            if item.step_order != i + 1:
                item.step_order = i + 1

        items_sum = sum(it.estimated_cost for it in plan.items)
        if items_sum > 0 and abs(plan.total_cost - items_sum) > max(items_sum * 0.5, 100):
            errors.append(
                f"total_cost {plan.total_cost} 与各项 estimated_cost 之和 {items_sum} 偏差过大"
            )

        return errors

    return validate
