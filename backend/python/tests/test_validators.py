"""测试 LLM 输出校验器。"""

from __future__ import annotations

from unittest.mock import MagicMock

from app.agent.nodes.analyze import _validate_intent_output
from app.agent.nodes.classify import _validate_classify_output
from app.agent.nodes.feedback import _validate_feedback_output
from app.agent.nodes.helpers import _make_plan_validator


class TestValidateClassifyOutput:
    def test_valid_output(self):
        obj = MagicMock(intent_type="new_plan", direct_reply="")
        assert _validate_classify_output(obj) == []

    def test_casual_requires_reply(self):
        obj = MagicMock(intent_type="casual", direct_reply="")
        errors = _validate_classify_output(obj)
        assert len(errors) >= 1
        assert "direct_reply" in errors[0]

    def test_casual_with_reply_passes(self):
        obj = MagicMock(intent_type="casual", direct_reply="你好")
        assert _validate_classify_output(obj) == []

    def test_invalid_intent_type(self):
        obj = MagicMock(intent_type="unknown", direct_reply="")
        errors = _validate_classify_output(obj)
        assert len(errors) >= 1
        assert "intent_type" in errors[0]


class TestValidateIntentOutput:
    def _make_mock(self, **overrides):
        defaults = {
            "scenario": "family", "start_time": "14:00", "duration_hours": 5,
            "max_distance": 5000, "location_preference": "nearby",
            "party_size": 3, "special_requirements": [], "cuisine_type": None,
            "child_age": 5, "time_slot": "14:00-19:00", "budget_hint": "",
            "companion": "老婆孩子", "day_count": 1,
        }
        defaults.update(overrides)
        return MagicMock(**defaults)

    def test_valid_family_output(self):
        mock = self._make_mock()
        assert _validate_intent_output(mock) == []

    def test_invalid_scenario(self):
        mock = self._make_mock(scenario="unknown")
        errors = _validate_intent_output(mock)
        assert any("scenario" in e for e in errors)

    def test_invalid_start_time_format(self):
        mock = self._make_mock(start_time="14:00:00")
        errors = _validate_intent_output(mock)
        assert any("start_time" in e for e in errors)

    def test_duration_out_of_range_low(self):
        mock = self._make_mock(duration_hours=0)
        errors = _validate_intent_output(mock)
        assert any("duration_hours" in e for e in errors)

    def test_duration_out_of_range_high(self):
        mock = self._make_mock(duration_hours=13)
        errors = _validate_intent_output(mock)
        assert any("duration_hours" in e for e in errors)

    def test_distance_too_small(self):
        mock = self._make_mock(max_distance=100)
        errors = _validate_intent_output(mock)
        assert any("max_distance" in e for e in errors)

    def test_distance_too_large(self):
        mock = self._make_mock(max_distance=100000)
        errors = _validate_intent_output(mock)
        assert any("max_distance" in e for e in errors)

    def test_valid_start_time_with_single_digit_hour(self):
        mock = self._make_mock(start_time="8:06")
        assert _validate_intent_output(mock) == []


class TestValidateFeedbackOutput:
    def _make_mock(self, **overrides):
        defaults = {
            "change_summary": "换一家餐厅",
            "needs_new_search": True,
            "replaced_categories": ["restaurant"],
            "additional_constraints": {"cuisine_type": "火锅"},
        }
        defaults.update(overrides)
        return MagicMock(**defaults)

    def test_valid_feedback(self):
        mock = self._make_mock()
        assert _validate_feedback_output(mock) == []

    def test_invalid_category(self):
        mock = self._make_mock(replaced_categories=["unknown_type"])
        errors = _validate_feedback_output(mock)
        assert any("replaced_categories" in e for e in errors)

    def test_invalid_constraint_key(self):
        mock = self._make_mock(additional_constraints={"not_allowed": True})
        errors = _validate_feedback_output(mock)
        assert any("additional_constraints" in e for e in errors)

    def test_max_distance_too_small(self):
        mock = self._make_mock(additional_constraints={"max_distance": 50})
        errors = _validate_feedback_output(mock)
        assert any("max_distance" in e for e in errors)


class TestMakePlanValidator:
    def _make_item(self, **overrides):
        defaults = {
            "scenario": "family",
            "activity_type": "play",
            "location_table_name": "amusement_park",
            "location_id": 1,
            "arrive_time": "14:00",
            "leave_time": "15:40",
            "stay_minute": 100,
            "step_order": 1,
            "day_num": 1,
            "estimated_cost": 200,
        }
        defaults.update(overrides)
        return MagicMock(**defaults)

    def _plan(self, items, **kwargs):
        defaults = {"scenario": "family", "items": items, "total_cost": sum(it.estimated_cost for it in items)}
        defaults.update(kwargs)
        return MagicMock(**defaults)

    def test_valid_single_item_plan(self):
        candidates = {"amusement_park": [{"id": 1, "name": "欢乐谷", "available": True}]}
        validate = _make_plan_validator(candidates, day_count=1)
        item = self._make_item()
        errors = validate(self._plan([item]))
        assert errors == []

    def test_location_id_not_in_candidates(self):
        candidates = {"amusement_park": [{"id": 99, "name": "欢乐谷", "available": True}]}
        validate = _make_plan_validator(candidates, day_count=1)
        item = self._make_item(location_id=1)
        errors = validate(self._plan([item]))
        assert any("candidate" in e.lower() or "location_id" in e for e in errors)

    def test_unavailable_item_flagged(self):
        candidates = {"amusement_park": [{"id": 1, "name": "欢乐谷", "available": False}]}
        validate = _make_plan_validator(candidates, day_count=1)
        item = self._make_item()
        errors = validate(self._plan([item]))
        assert any("available" in e.lower() or "不可用" in e for e in errors)

    def test_empty_plan(self):
        validate = _make_plan_validator({}, day_count=1)
        errors = validate(self._plan([]))
        assert any("至少" in e or "至少" in e for e in errors)

    def test_time_reversed(self):
        candidates = {"amusement_park": [{"id": 1, "name": "欢乐谷", "available": True}]}
        validate = _make_plan_validator(candidates, day_count=1)
        item = self._make_item(arrive_time="16:00", leave_time="14:00")
        errors = validate(self._plan([item]))
        assert any("arrive_time" in e for e in errors)

    def test_multi_day_missing_day(self):
        candidates = {"restaurant": [{"id": 1, "name": "某餐厅", "available": True}]}
        validate = _make_plan_validator(candidates, day_count=2)
        item = self._make_item(location_table_name="restaurant", activity_type="dining")
        errors = validate(self._plan([item]))
        assert any("day" in e.lower() or "天" in e for e in errors)

    def test_cost_mismatch(self):
        candidates = {"amusement_park": [{"id": 1, "name": "欢乐谷", "available": True}]}
        validate = _make_plan_validator(candidates, day_count=1)
        item = self._make_item(estimated_cost=100)
        errors = validate(self._plan([item], total_cost=9999))
        assert any("total_cost" in e or "花费" in e for e in errors)
