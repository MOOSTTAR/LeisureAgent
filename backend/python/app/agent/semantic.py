"""TF-IDF 语义匹配器 — 替代硬关键词匹配的模糊意图判断。

原理：
  将每个意图类别的关键词列表拼接为"参考文档"，与用户输入一起做
  char n-gram TF-IDF 向量化，用余弦相似度作为匹配置信度。

优势（vs 精确关键词）：
  - "哈喽" → 能匹配 CASUAL（与"你好""嗨"共享上下文）
  - "推荐一下好吃的" → 能匹配 INQUIRY（即使"推荐一下"不在关键词列表）
  - "想出去逛逛" → 能匹配 PLAN_REQUEST（与"出去玩"语义相近）
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


class SemanticMatcher:
    """TF-IDF 语义匹配器 — 单例，首次使用时预热。"""

    def __init__(
        self,
        *,
        threshold: float = 0.15,
        ngram_range: tuple[int, int] = (1, 2),
    ):
        self._threshold = threshold
        self._vectorizer = TfidfVectorizer(
            analyzer="char",
            ngram_range=ngram_range,
            lowercase=False,
        )
        self._category_docs: dict[str, str] = {}
        self._category_vectors: np.ndarray | None = None
        self._category_names: list[str] = []
        self._fitted = False

    # ── 注册类别 ──────────────────────────────────────────────

    def register(self, name: str, keywords: list[str]) -> None:
        """注册一个意图类别及其参考关键词列表。"""
        self._category_docs[name] = " ".join(keywords)
        self._fitted = False  # 注册新类别后需重新 fit

    def register_all(self, mapping: dict[str, list[str]]) -> None:
        """批量注册多个类别。"""
        for name, keywords in mapping.items():
            self._category_docs[name] = " ".join(keywords)
        self._fitted = False

    # ── 拟合 ──────────────────────────────────────────────────

    def _ensure_fit(self) -> None:
        if self._fitted:
            return
        if not self._category_docs:
            return
        self._category_names = list(self._category_docs.keys())
        docs = [self._category_docs[name] for name in self._category_names]
        self._category_vectors = self._vectorizer.fit_transform(docs)
        self._fitted = True

    # ── 查询 ──────────────────────────────────────────────────

    def match(self, text: str, category: str) -> float:
        """返回 text 与指定类别的相似度 (0~1)。

        > 0.3  → 强匹配
        > 0.15 → 弱匹配
        < 0.15 → 不匹配（更适合用其他类别）
        """
        self._ensure_fit()
        if category not in self._category_docs:
            return 0.0
        vec = self._vectorizer.transform([text])
        idx = self._category_names.index(category)
        sim = float(cosine_similarity(vec, self._category_vectors[idx:idx + 1])[0][0])  # type: ignore[arg-type]
        return sim

    def best_match(self, text: str, categories: list[str]) -> tuple[str, float]:
        """返回最高相似度的类别及其分数。"""
        scores = [(c, self.match(text, c)) for c in categories]
        scores.sort(key=lambda x: x[1], reverse=True)
        return scores[0] if scores else ("", 0.0)

    def top_matches(self, text: str, categories: list[str] | None = None,
                    min_score: float | None = None) -> list[tuple[str, float]]:
        """返回所有超过阈值的类别（按分数降序）。"""
        cats = categories if categories is not None else self._category_names
        scores = [(c, self.match(text, c)) for c in cats]
        threshold = min_score if min_score is not None else self._threshold
        result = [(c, s) for c, s in scores if s >= threshold]
        result.sort(key=lambda x: x[1], reverse=True)
        return result

    def is_match(self, text: str, category: str, min_score: float | None = None) -> bool:
        """文本是否匹配指定类别（阈值默认 0.15）。"""
        return self.match(text, category) >= (min_score or self._threshold)

    def is_any_match(self, text: str, categories: list[str],
                     min_score: float | None = None) -> bool:
        """文本是否匹配任一类别。"""
        threshold = min_score or self._threshold
        for c in categories:
            if self.match(text, c) >= threshold:
                return True
        return False


# ═══════════════════════════════════════════════════════════════
# 全局实例 + 预热
# ═══════════════════════════════════════════════════════════════

_matcher: SemanticMatcher | None = None


def get_matcher() -> SemanticMatcher:
    """获取全局 SemanticMatcher 单例（懒加载 + 预热）。"""
    global _matcher
    if _matcher is None:
        _matcher = SemanticMatcher()
        _warm_up(_matcher)
    return _matcher


def _warm_up(m: SemanticMatcher) -> None:
    """注册所有意图类别（从 constants 导入以避免循环依赖）。"""
    from app.agent.constants import (
        CASUAL_KEYWORDS,
        CONFIRM_KEYWORDS,
        CUISINE_KEYWORDS,
        DISTANCE_KEYWORDS,
        DOMAIN_RELATED_KEYWORDS,
        FEEDBACK_KEYWORDS,
        INQUIRY_KEYWORDS,
        NEW_PLAN_KEYWORDS,
        PLAN_REQUEST_KEYWORDS,
        SPECIFIC_INQUIRY_KEYWORDS,
        VAGUE_INQUIRY_KEYWORDS,
        WEEKDAY_KEYWORDS,
        FRIENDS_SCENARIO_KEYWORDS,
        FAMILY_SCENARIO_KEYWORDS,
        COUPLE_SCENARIO_KEYWORDS,
    )

    m.register_all({
        "casual": CASUAL_KEYWORDS,
        "confirm": CONFIRM_KEYWORDS,
        "cuisine": CUISINE_KEYWORDS,
        "distance": DISTANCE_KEYWORDS,
        "domain": DOMAIN_RELATED_KEYWORDS,
        "feedback": FEEDBACK_KEYWORDS,
        "inquiry": INQUIRY_KEYWORDS,
        "new_plan": NEW_PLAN_KEYWORDS,
        "plan_request": PLAN_REQUEST_KEYWORDS,
        "specific_inquiry": SPECIFIC_INQUIRY_KEYWORDS,
        "vague_inquiry": VAGUE_INQUIRY_KEYWORDS,
        "weekday": WEEKDAY_KEYWORDS,
        "family": FAMILY_SCENARIO_KEYWORDS,
        "friends": FRIENDS_SCENARIO_KEYWORDS,
        "couple": COUPLE_SCENARIO_KEYWORDS,
    })
    logger.info("[SemanticMatcher] warmed up with %d categories", len(m._category_docs))
