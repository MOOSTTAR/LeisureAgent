"""测试 6 个路由函数的正确性。"""

from __future__ import annotations

from app.agent.graph import (
    _route_after_detect,
    _route_after_exec,
    _route_after_load,
    _route_after_persist,
    _route_by_intent,
    _route_feedback,
)


class TestRouteAfterLoad:
    def test_ok_when_not_blocked(self):
        assert _route_after_load({}) == "ok"

    def test_blocked_when_blocked(self):
        assert _route_after_load({"blocked": True}) == "blocked"


class TestRouteByIntent:
    def test_casual_maps_to_direct_reply(self):
        assert _route_by_intent({"intent_type": "casual"}) == "direct_reply"

    def test_out_of_domain_maps_to_direct_reply(self):
        assert _route_by_intent({"intent_type": "out_of_domain"}) == "direct_reply"

    def test_clarify_maps_to_direct_reply(self):
        assert _route_by_intent({"intent_type": "clarify"}) == "direct_reply"

    def test_inquiry(self):
        assert _route_by_intent({"intent_type": "inquiry"}) == "inquiry"

    def test_new_plan(self):
        assert _route_by_intent({"intent_type": "new_plan"}) == "new_plan"

    def test_feedback(self):
        assert _route_by_intent({"intent_type": "feedback"}) == "feedback"

    def test_confirm(self):
        assert _route_by_intent({"intent_type": "confirm"}) == "confirm"

    def test_default_to_new_plan(self):
        assert _route_by_intent({}) == "new_plan"


class TestRouteFeedback:
    def test_needs_search(self):
        assert _route_feedback({"needs_research": True}) == "needs_search"

    def test_skip_search_default(self):
        assert _route_feedback({}) == "skip_search"

    def test_skip_search_explicit(self):
        assert _route_feedback({"needs_research": False}) == "skip_search"


class TestRouteAfterDetect:
    def test_compose_when_no_gaps(self):
        assert _route_after_detect({"critical_gaps": False}) == "compose"

    def test_compose_default(self):
        assert _route_after_detect({}) == "compose"

    def test_retry_when_gaps_and_attempt_0(self):
        assert _route_after_detect({"critical_gaps": True, "search_attempt": 0}) == "retry_search"

    def test_retry_when_gaps_and_attempt_1(self):
        assert _route_after_detect({"critical_gaps": True, "search_attempt": 1}) == "retry_search"

    def test_gap_report_when_retries_exhausted(self):
        assert _route_after_detect({"critical_gaps": True, "search_attempt": 2}) == "gap_report"


class TestRouteAfterExec:
    def test_finalize_when_no_failures(self):
        assert _route_after_exec({"booking_results": [{"status": "success"}]}) == "finalize"

    def test_finalize_default(self):
        assert _route_after_exec({"booking_results": []}) == "finalize"

    def test_replan_when_failure_and_attempt_0(self):
        assert _route_after_exec({
            "booking_results": [{"status": "fail"}],
            "exec_attempt": 0,
        }) == "replan"

    def test_replan_when_failure_and_attempt_1(self):
        assert _route_after_exec({
            "booking_results": [{"status": "fail"}],
            "exec_attempt": 1,
        }) == "replan"

    def test_finalize_when_retries_exhausted(self):
        assert _route_after_exec({
            "booking_results": [{"status": "fail"}],
            "exec_attempt": 2,
        }) == "finalize"


class TestRouteAfterPersist:
    def test_present_default(self):
        assert _route_after_persist({}) == "present"

    def test_auto_execute_when_flag_set(self):
        assert _route_after_persist({"auto_execute": True}) == "auto_execute"

    def test_auto_execute_when_exec_attempt(self):
        assert _route_after_persist({"exec_attempt": 1}) == "auto_execute"
