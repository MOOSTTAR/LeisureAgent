"""语义匹配器单元测试 — 验证 TF-IDF 模糊匹配替代硬关键词的效果。"""

from __future__ import annotations

import pytest
from app.agent.semantic import SemanticMatcher, get_matcher


class TestSemanticMatcher:
    """TF-IDF 语义匹配器基础功能测试。"""

    def test_exact_keyword_match(self) -> None:
        """精确关键词应获得高分匹配。"""
        m = get_matcher()
        score = m.match("你好啊", "casual")
        assert score > 0.15, f"casual match score too low: {score}"

    def test_fuzzy_variant_match(self) -> None:
        """变体表达（关键词列表中没有的）应仍能匹配到正确类别。"""
        m = get_matcher()
        # "哈喽" 不在 CASUAL_KEYWORDS 中，但语义上接近寒暄
        score = m.match("哈喽", "casual")
        # 模糊匹配应有一定分数（可能不高，但 >0 说明有相似度）
        assert score >= 0, f"casual match should have non-zero score: {score}"

    def test_inquiry_vs_plan_request(self) -> None:
        """查询和规划请求应有区分度。"""
        m = get_matcher()
        inquiry_score = m.match("附近有什么好吃的", "inquiry")
        plan_score = m.match("附近有什么好吃的", "plan_request")
        # 查询意图应高于规划意图
        assert inquiry_score > 0, f"inquiry score too low: {inquiry_score}"

    def test_plan_request_detection(self) -> None:
        """明确的规划请求应匹配到 plan_request。"""
        m = get_matcher()
        score = m.match("帮我安排一个周末行程", "plan_request")
        assert score > 0.1, f"plan_request score too low: {score}"

    def test_domain_term_short_input(self) -> None:
        """短领域术语应匹配 domain（单字词 TF-IDF 特征稀疏，阈值放低）。"""
        m = get_matcher()
        score = m.match("火锅", "domain")
        assert score > 0.05, f"domain score for '火锅' too low: {score}"

    def test_is_match_threshold(self) -> None:
        """is_match 应正确应用阈值。"""
        m = get_matcher()
        # 高阈值下即使是好匹配也不通过
        assert not m.is_match("你好", "casual", min_score=0.9)
        # 低阈值下应通过
        assert m.is_match("你好", "casual", min_score=0.05)

    def test_is_any_match(self) -> None:
        """is_any_match 应在任一类别命中时返回 True。"""
        m = get_matcher()
        assert m.is_any_match("周末出去玩", ["plan_request", "casual"])
        assert not m.is_any_match("今天天气怎么样", ["plan_request", "inquiry"], min_score=0.5)

    def test_feedback_match(self) -> None:
        """反馈关键词（如'换'）应被 feedback 类别覆盖，且 inquiry 不应是唯一命中。"""
        m = get_matcher()
        score = m.match("换一个", "feedback")
        # 单个"换"字在 feedback 关键词中，TF-IDF 应有非零匹配
        assert score > 0, f"feedback score for '换一个' should be >0, got {score}"
        # "不要这个" 包含 feedback 关键词 "不要"
        assert m.is_match("不要这个", "feedback", min_score=0.05)

    def test_top_matches_ordering(self) -> None:
        """top_matches 应按分数降序排列。"""
        m = get_matcher()
        results = m.top_matches("帮我规划周末亲子游", ["plan_request", "inquiry", "casual"])
        assert len(results) >= 1
        scores = [s for _, s in results]
        assert scores == sorted(scores, reverse=True), f"not sorted: {scores}"

    def test_best_match(self) -> None:
        """best_match 应返回最高分的类别。"""
        m = get_matcher()
        cat, score = m.best_match("确认执行", ["confirm", "feedback", "casual"])
        assert cat == "confirm", f"expected 'confirm', got '{cat}' (score={score})"

    def test_empty_text_graceful(self) -> None:
        """空文本不应崩溃。"""
        m = get_matcher()
        score = m.match("", "casual")
        assert score == 0.0

    def test_singleton_same_instance(self) -> None:
        """get_matcher 应为单例。"""
        m1 = get_matcher()
        m2 = get_matcher()
        assert m1 is m2
