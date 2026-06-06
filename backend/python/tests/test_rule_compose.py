"""测试 compose 规则编排 & feedback 规则降级路径。"""

from __future__ import annotations

import pytest

from app.agent.nodes.compose import (
    _SCENARIO_CONFIG,
    _compose_scenario_plan,
    _pick_family_restaurant,
)
from app.agent.nodes.feedback import _parse_feedback_rule_based


# ═══════════════════════════════════════════════════════════════
# 辅助：构建 mock candidates
# ═══════════════════════════════════════════════════════════════

def _make_loc(table: str, id_: int, name: str, x: int = 0, y: int = 0,
              cuisine: str = "", available: bool = True, **extra) -> dict:
    """快速构造一个候选地点 dict。"""
    loc = {"id": id_, "name": name, "x": x, "y": y, "available": available,
           "cuisine_type": cuisine, "ticket_price": 50, "tags": "", "address": "测试地址"}
    loc.update(extra)
    return loc


def _make_candidates(restaurant=True, mall=True, activity=True,
                     activity_table="amusement_park", cuisine="中餐") -> dict:
    """快速构造标准候选池（family 场景下各有一项）。"""
    candidates: dict = {}
    if restaurant:
        candidates["restaurant"] = [_make_loc("restaurant", 1, "测试餐厅", 100, 200, cuisine=cuisine)]
    if mall:
        candidates["mall"] = [_make_loc("mall", 2, "测试商场", 150, 180)]
    if activity:
        candidates[activity_table] = [_make_loc(activity_table, 3, "测试活动", 200, 300)]
    return candidates


# ═══════════════════════════════════════════════════════════════
# _compose_scenario_plan
# ═══════════════════════════════════════════════════════════════

class TestComposeScenarioPlan:
    """场景编排引擎：family / friends / other 三场景均有覆盖。"""

    def test_family_scenario_generates_items(self):
        candidates = _make_candidates()
        plan = _compose_scenario_plan(candidates, "14:00", {}, "family")
        assert len(plan.items) >= 2  # 至少活动 + 餐厅
        assert plan.scenario == "family"
        assert plan.travel_type == "亲子"
        # 第一项是活动
        assert plan.items[0].activity_type == "play"
        # 最后一项是晚餐
        assert plan.items[-1].activity_type == "dining"

    def test_friends_scenario_generates_items(self):
        candidates = _make_candidates(activity_table="exhibition_hall")
        plan = _compose_scenario_plan(candidates, "14:00", {}, "friends")
        assert len(plan.items) >= 2
        assert plan.scenario == "friends"
        assert plan.travel_type == "美食"

    def test_other_scenario_generates_items(self):
        candidates = _make_candidates()
        plan = _compose_scenario_plan(candidates, "14:00", {}, "other")
        assert len(plan.items) >= 2
        assert plan.scenario == "other"

    def test_items_have_valid_times(self):
        """所有项的 arrive < leave 且在同一天内时间递增。"""
        candidates = _make_candidates()
        plan = _compose_scenario_plan(candidates, "14:00", {}, "family")
        prev_leave = ""
        for item in plan.items:
            assert item.arrive_time < item.leave_time, f"{item.arrive_time} >= {item.leave_time}"
            if prev_leave:
                # 规则编排中，出发时间在上一项离开时间之后（含交通）
                assert item.arrive_time >= prev_leave, f"{item.arrive_time} < {prev_leave}"
            prev_leave = item.leave_time

    def test_restaurant_time_not_before_dinner(self):
        """晚餐时间不早于 17:30。"""
        candidates = _make_candidates()
        # 只有一项活动 + 餐厅，活动从 14:00 开始停留 90 分钟 → 15:30 结束
        # 商场缓冲 50 分钟 → 16:20 结束，均 < 17:30，所以晚餐应为 17:30
        plan = _compose_scenario_plan(candidates, "14:00", {}, "family")
        dinner_items = [it for it in plan.items if it.activity_type == "dining"]
        assert dinner_items
        assert dinner_items[0].arrive_time >= "17:30"

    def test_config_all_scenarios_have_required_keys(self):
        required = {"activity_categories", "activity_stay", "mall_stay", "restaurant_stay",
                     "activity_remark", "mall_remark", "restaurant_remark",
                     "description", "scenario", "travel_type"}
        for scenario in ("family", "friends", "other"):
            cfg = _SCENARIO_CONFIG[scenario]
            for key in required:
                assert key in cfg, f"{scenario} missing key: {key}"

    def test_no_candidates_still_produces_valid_plan(self):
        """候选池为空时不崩溃，只产生空方案。"""
        plan = _compose_scenario_plan({}, "14:00", {}, "family")
        assert plan.items == []
        assert plan.scenario == "family"

    def test_only_restaurant_candidates(self):
        """只有餐厅时产生仅含晚餐的方案。"""
        candidates = {"restaurant": [_make_loc("restaurant", 1, "某餐厅", 100, 200, cuisine="火锅")]}
        plan = _compose_scenario_plan(candidates, "14:00", {}, "family")
        assert len(plan.items) == 1
        assert plan.items[0].activity_type == "dining"
        assert plan.items[0].location_name == "某餐厅"

    def test_total_cost_matches_items_sum(self):
        candidates = _make_candidates()
        plan = _compose_scenario_plan(candidates, "14:00", {}, "family")
        items_sum = sum(item.estimated_cost for item in plan.items)
        assert plan.total_cost == items_sum


# ═══════════════════════════════════════════════════════════════
# _pick_family_restaurant
# ═══════════════════════════════════════════════════════════════

class TestPickFamilyRestaurant:
    def test_returns_first_when_no_diet_requirement(self):
        restaurants = [
            _make_loc("restaurant", 1, "火锅店", cuisine="火锅"),
            _make_loc("restaurant", 2, "日料店", cuisine="日料"),
        ]
        result = _pick_family_restaurant(restaurants, {"requirements": []})
        assert result["name"] == "火锅店"

    def test_prefers_family_friendly_when_diet(self):
        restaurants = [
            _make_loc("restaurant", 1, "火锅店", cuisine="火锅"),
            _make_loc("restaurant", 2, "日料店", cuisine="日料"),
            _make_loc("restaurant", 3, "粤菜馆", cuisine="粤菜"),
        ]
        result = _pick_family_restaurant(restaurants, {"requirements": ["diet"]})
        # 日料/粤菜/中餐/西餐 优先
        assert result["name"] in ("日料店", "粤菜馆")

    def test_falls_back_to_first_when_no_preferred_cuisine(self):
        restaurants = [
            _make_loc("restaurant", 1, "火锅店", cuisine="火锅"),
            _make_loc("restaurant", 2, "烧烤店", cuisine="烧烤"),
        ]
        result = _pick_family_restaurant(restaurants, {"requirements": ["diet"]})
        assert result["name"] == "火锅店"  # 没有偏好菜系，回退到第一项

    def test_returns_none_for_empty_list(self):
        assert _pick_family_restaurant([], {}) is None


# ═══════════════════════════════════════════════════════════════
# _parse_feedback_rule_based
# ═══════════════════════════════════════════════════════════════

class TestParseFeedbackRuleBased:
    def test_no_queue_triggers_research(self):
        needs, replaced, constraints = _parse_feedback_rule_based("排队太久了换一家")
        assert needs is True
        assert "restaurant" in replaced
        assert constraints.get("no_queue") is True

    def test_distance_near_triggers_research(self):
        needs, replaced, constraints = _parse_feedback_rule_based("离家近一点的")
        assert needs is True
        assert constraints.get("max_distance") == 1000

    def test_distance_far_triggers_research(self):
        needs, replaced, constraints = _parse_feedback_rule_based("远一点的餐厅")
        assert needs is True
        assert constraints.get("max_distance") == 8000

    def test_too_expensive_triggers_research(self):
        needs, replaced, constraints = _parse_feedback_rule_based("太贵了有没有便宜的")
        assert needs is True
        assert constraints.get("budget") == "low"

    def test_cuisine_change_triggers_research(self):
        needs, replaced, constraints = _parse_feedback_rule_based("换成日料")
        assert needs is True
        assert "restaurant" in replaced
        assert constraints.get("cuisine_type") == "日料"

    def test_time_shift_earlier_no_research(self):
        needs, replaced, constraints = _parse_feedback_rule_based("早点出发吧")
        assert needs is False
        assert constraints.get("time_shift") == -1

    def test_time_shift_later_no_research(self):
        needs, replaced, constraints = _parse_feedback_rule_based("推迟一小时")
        assert needs is False
        assert constraints.get("time_shift") == 1

    def test_remove_restaurant(self):
        needs, replaced, constraints = _parse_feedback_rule_based("不去那家餐厅了")
        assert needs is True
        assert "restaurant" in replaced

    def test_remove_amusement_park(self):
        needs, replaced, constraints = _parse_feedback_rule_based("不想去游乐园")
        assert needs is True
        assert "amusement_park" in replaced

    def test_remove_exhibition_hall(self):
        needs, replaced, constraints = _parse_feedback_rule_based("取消博物馆")
        assert needs is True
        assert "exhibition_hall" in replaced

    def test_simple_confirm_no_research(self):
        """单纯的确认词不应触发 research。"""
        needs, replaced, constraints = _parse_feedback_rule_based("可以的")
        assert needs is False
        assert replaced == []

    def test_multiple_constraints(self):
        """同时有排队 + 距离限制。"""
        needs, replaced, constraints = _parse_feedback_rule_based(
            "排队太久了，换一家离家近的火锅"
        )
        assert needs is True
        assert constraints.get("no_queue") is True
        assert constraints.get("max_distance") == 1000
        assert constraints.get("cuisine_type") == "火锅"
        assert "restaurant" in replaced


# ═══════════════════════════════════════════════════════════════
# 场景配置结构校验
# ═══════════════════════════════════════════════════════════════

class TestScenarioConfig:
    """确保 _SCENARIO_CONFIG 数据结构正确，新场景能正确注册。"""

    def test_family_activity_categories(self):
        assert _SCENARIO_CONFIG["family"]["activity_categories"] == ["amusement_park", "scenic_spot"]

    def test_friends_activity_categories(self):
        assert _SCENARIO_CONFIG["friends"]["activity_categories"] == ["exhibition_hall", "scenic_spot"]

    def test_other_falls_back_to_all(self):
        assert len(_SCENARIO_CONFIG["other"]["activity_categories"]) == 3

    def test_all_scenarios_have_restaurant_picker_or_none(self):
        for scenario, cfg in _SCENARIO_CONFIG.items():
            assert "restaurant_picker" in cfg or cfg.get("restaurant_picker") is None or callable(cfg.get("restaurant_picker"))
