"""测试场景检测与约束提取函数。"""

from __future__ import annotations

from app.agent.nodes.helpers import (
    _detect_scenario,
    _extract_constraints,
    _sanitize_companion,
    _time_to_minutes,
)


class TestDetectScenario:
    def test_family_by_child(self):
        assert _detect_scenario("带孩子出去玩", []) == "family"

    def test_family_by_wife(self):
        assert _detect_scenario("老婆想去逛街", []) == "family"

    def test_friends_by_explicit(self):
        assert _detect_scenario("2男2女出去玩", []) == "friends"

    def test_friends_by_group(self):
        assert _detect_scenario("4个人一起出去玩", []) == "friends"

    def test_couple_by_boyfriend(self):
        assert _detect_scenario("男朋友想去", []) == "couple"

    def test_couple_by_two_people(self):
        assert _detect_scenario("2个人约会", []) == "couple"

    def test_default_is_other(self):
        assert _detect_scenario("想出去玩", []) == "other"

    def test_from_history(self):
        history = [{"role": "user", "content": "想带孩子去游乐园"}]
        assert _detect_scenario("再推荐一个", history) == "family"

    def test_history_couple(self):
        history = [{"role": "user", "content": "和女朋友出去玩"}]
        assert _detect_scenario("有没有近一点的", history) == "couple"


class TestExtractConstraints:
    def test_default_values(self):
        result = _extract_constraints("下午出去玩", "other")
        assert result["start_time"] == "14:00"
        assert result["day_count"] == 1
        assert result["max_distance"] == 5000

    def test_evening_time(self):
        result = _extract_constraints("晚上吃火锅", "other")
        assert result["start_time"] == "17:00"

    def test_morning_time(self):
        result = _extract_constraints("上午去游乐园", "other")
        assert result["start_time"] == "10:00"

    def test_nearby_constraint(self):
        result = _extract_constraints("离家近的地方", "other")
        assert result["nearby"] is True
        assert result["max_distance"] == 2000

    def test_family_scenario(self):
        result = _extract_constraints("带娃出去玩", "family")
        assert result["child_age"] == 5
        assert result["party_size"] == 3

    def test_friends_scenario(self):
        result = _extract_constraints("朋友聚会", "friends")
        assert result["party_size"] == 4
        assert result["child_age"] is None

    def test_cuisine_extraction(self):
        result = _extract_constraints("想吃火锅", "other")
        assert result.get("cuisine_type") == "火锅"

    def test_diet_requirement(self):
        result = _extract_constraints("老婆在减肥，吃点低卡的", "family")
        assert "diet" in result["requirements"]


class TestSanitizeCompanion:
    def test_plain_text(self):
        assert _sanitize_companion("老婆和孩子") == "老婆和孩子"

    def test_control_characters_removed(self):
        assert _sanitize_companion("hello\x00world") == "helloworld"

    def test_empty_fallback(self):
        assert _sanitize_companion("") == "同行人"

    def test_truncate_long(self):
        long_text = "A" * 70
        assert len(_sanitize_companion(long_text)) <= 60


class TestTimeToMinutes:
    def test_basic(self):
        assert _time_to_minutes("14:00") == 840

    def test_single_digit_hour(self):
        assert _time_to_minutes("8:06") == 486

    def test_invalid_raises(self):
        import pytest
        with pytest.raises(ValueError):
            _time_to_minutes("not a time")
