"""测试意图分类辅助函数。"""

from __future__ import annotations

from app.agent.nodes.classify import (
    _build_classify_result,
    _build_clarify_reply,
    _is_casual,
    _is_domain_term,
    _is_inquiry,
    _is_new_plan_request,
    _is_vague_inquiry,
)


class TestIsCasual:
    def test_hello(self):
        assert _is_casual("你好") is True

    def test_thanks(self):
        assert _is_casual("谢谢") is True

    def test_hi(self):
        assert _is_casual("hi") is True

    def test_short_unknown_text(self):
        # ≤4 chars without domain keywords
        assert _is_casual("嗯嗯") is True

    def test_play_request_not_casual(self):
        assert _is_casual("想出去玩") is False

    def test_eat_request_not_casual(self):
        assert _is_casual("想吃火锅") is False


class TestIsInquiry:
    def test_recommendation(self):
        assert _is_inquiry("有什么好吃的推荐") is True

    def test_find(self):
        assert _is_inquiry("帮我找附近的火锅") is True

    def test_want_to_eat(self):
        assert _is_inquiry("想吃日料") is True

    def test_plan_not_inquiry(self):
        assert _is_inquiry("帮我规划一个周末行程") is False

    def test_plan_keyword_overrides(self):
        assert _is_inquiry("帮我安排一个周末行程顺便推荐餐厅") is False


class TestIsDomainTerm:
    def test_short_cuisine_term(self):
        assert _is_domain_term("火锅") is True

    def test_short_place_term(self):
        assert _is_domain_term("商场") is True

    def test_long_input_not_domain(self):
        assert _is_domain_term("我想吃火锅") is False

    def test_empty(self):
        assert _is_domain_term("") is False


class TestIsNewPlanRequest:
    def test_replan(self):
        assert _is_new_plan_request("重新规划一下") is True

    def test_new_plan(self):
        assert _is_new_plan_request("给我一个新的方案") is True

    def test_regular_input(self):
        assert _is_new_plan_request("换一家餐厅") is False


class TestBuildClassifyResult:
    def test_casual_result(self):
        result = _build_classify_result("casual", "你好", None)
        assert result["intent_type"] == "casual"
        assert result["current_step"] == "direct_reply"
        assert "messages" in result

    def test_new_plan_result(self):
        result = _build_classify_result("new_plan", "", None, auto_execute=True)
        assert result["intent_type"] == "new_plan"
        assert result["current_step"] == "analyze_goal"
        assert result["auto_execute"] is True

    def test_confirm_result(self):
        result = _build_classify_result("confirm", "", 1)
        assert result["current_step"] == "execute_bookings"

    def test_feedback_result(self):
        result = _build_classify_result("feedback", "", 1)
        assert result["current_step"] == "analyze_feedback"


class TestBuildClarifyReply:
    def test_food_clarify(self):
        reply = _build_clarify_reply("想吃点好的")
        assert "菜系" in reply

    def test_play_clarify(self):
        reply = _build_clarify_reply("有什么好玩的")
        assert "活动" in reply

    def test_generic_clarify(self):
        reply = _build_clarify_reply("推荐一下")
        assert "类型" in reply
