"""Agent 可观测性模块 — 结构化日志、LLM 调用计时、节点性能指标。

提供:
  - AgentMetrics: 上下文管理器，自动记录操作耗时和结果
  - log_llm_call: 记录 LLM 调用的耗时/成功/失败
  - log_node_perf: 节点级别的性能打点

所有日志以 JSON 格式输出，方便接入 ELK/Loki 等日志聚合系统。
"""

from __future__ import annotations

import json
import logging
import time
from contextlib import contextmanager
from typing import Any

logger = logging.getLogger("leisure_agent.metrics")


# ═══════════════════════════════════════════════════════════════
# 结构化日志
# ═══════════════════════════════════════════════════════════════

def _log(event: str, **kwargs: Any) -> None:
    """输出一条 JSON 格式的结构化指标日志。"""
    payload = {"event": event, "timestamp": time.time(), **kwargs}
    logger.info(json.dumps(payload, ensure_ascii=False, default=str))


# ═══════════════════════════════════════════════════════════════
# 操作计时
# ═══════════════════════════════════════════════════════════════

@contextmanager
def AgentMetrics(operation: str, **tags: str):
    """上下文管理器 — 自动计时并记录操作结果。

    Usage:
        with AgentMetrics("classify_intent", path="llm"):
            result = llm.invoke(...)

    输出:
        {"event": "op.complete", "operation": "classify_intent", "elapsed_ms": 1234, "success": true}
        {"event": "op.error", "operation": "classify_intent", "elapsed_ms": 567, "error": "..."}
    """
    start = time.perf_counter()
    try:
        yield
        elapsed_ms = (time.perf_counter() - start) * 1000
        _log("op.complete", operation=operation, elapsed_ms=round(elapsed_ms, 1), success=True, **tags)
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start) * 1000
        _log("op.error", operation=operation, elapsed_ms=round(elapsed_ms, 1),
             success=False, error=f"{type(e).__name__}: {e}", **tags)
        raise


# ═══════════════════════════════════════════════════════════════
# LLM 调用追踪
# ═══════════════════════════════════════════════════════════════

_llm_call_count: dict[str, int] = {}
_llm_total_ms: dict[str, float] = {}


def log_llm_call(node: str, elapsed_ms: float, success: bool,
                 model: str = "", token_usage: dict | None = None) -> None:
    """记录单次 LLM 调用指标并更新聚合计数器。"""
    _llm_call_count[node] = _llm_call_count.get(node, 0) + 1
    _llm_total_ms[node] = _llm_total_ms.get(node, 0) + elapsed_ms

    _log(
        "llm.call",
        node=node,
        elapsed_ms=round(elapsed_ms, 1),
        success=success,
        model=model,
        total_calls=_llm_call_count[node],
        avg_ms=round(_llm_total_ms[node] / _llm_call_count[node], 1),
        token_usage=token_usage or {},
    )


def get_llm_stats() -> dict[str, dict]:
    """获取所有节点的 LLM 调用统计（供调试/健康检查端点使用）。"""
    return {
        node: {
            "calls": _llm_call_count.get(node, 0),
            "total_ms": round(_llm_total_ms.get(node, 0), 1),
            "avg_ms": round(_llm_total_ms.get(node, 0) / _llm_call_count.get(node, 1), 1),
        }
        for node in _llm_call_count
    }


# ═══════════════════════════════════════════════════════════════
# 节点性能打点
# ═══════════════════════════════════════════════════════════════

def log_node_perf(node_name: str, elapsed_ms: float, extra: dict | None = None) -> None:
    """记录单个节点的性能指标。"""
    _log(
        "node.perf",
        node=node_name,
        elapsed_ms=round(elapsed_ms, 1),
        **(extra or {}),
    )


# ═══════════════════════════════════════════════════════════════
# 安全网触发统计（_ensure_critical_items 等）
# ═══════════════════════════════════════════════════════════════

_safety_net_counts: dict[str, int] = {}


def log_safety_net(name: str, detail: str = "") -> None:
    """记录安全网触发事件。"""
    _safety_net_counts[name] = _safety_net_counts.get(name, 0) + 1
    _log(
        "safety_net.triggered",
        name=name,
        total=_safety_net_counts[name],
        detail=detail,
    )


def get_safety_net_stats() -> dict[str, int]:
    """获取安全网触发统计。"""
    return dict(_safety_net_counts)
