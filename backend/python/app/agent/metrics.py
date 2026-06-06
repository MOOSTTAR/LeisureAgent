"""Agent 可观测性模块 — 结构化日志、LLM 调用计时、节点性能指标。

提供:
  - AgentMetrics: 上下文管理器，自动记录操作耗时和结果
  - log_llm_call: 记录 LLM 调用的耗时/成功/失败
  - log_node_perf: 节点级别的性能打点

所有日志以 JSON 格式输出，方便接入 ELK/Loki 等日志聚合系统。
计数器持久化到 SQLite (metrics_counter 表)，进程重启不丢失。
"""

from __future__ import annotations

import json
import logging
import time
from contextlib import contextmanager
from typing import Any

logger = logging.getLogger("leisure_agent.metrics")


# ═══════════════════════════════════════════════════════════════
# 持久化辅助
# ═══════════════════════════════════════════════════════════════

def _persist_counter(name: str, value: float) -> None:
    """将计数器写入 metrics_counter 表（UPSERT）。"""
    try:
        from app.db.database import get_connection, safe_commit
        conn = get_connection()
        conn.execute(
            """INSERT INTO metrics_counter (name, value) VALUES (?, ?)
               ON CONFLICT(name) DO UPDATE SET
               value = value + ?, updated_at = CURRENT_TIMESTAMP""",
            (name, value, value),
        )
        safe_commit(conn)
    except Exception:
        pass  # 持久化失败不阻塞主流程


def _load_counters() -> dict[str, float]:
    """从 metrics_counter 表加载所有计数器。"""
    try:
        from app.db.database import get_connection
        conn = get_connection()
        rows = conn.execute("SELECT name, value FROM metrics_counter").fetchall()
        return {row["name"]: row["value"] for row in rows}
    except Exception:
        return {}


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

# 启动时从 DB 恢复
_counters = _load_counters()
_llm_call_count: dict[str, int] = {
    k.removeprefix("llm:").removesuffix(":calls"): int(v)
    for k, v in _counters.items() if k.startswith("llm:") and k.endswith(":calls")
}
_llm_total_ms: dict[str, float] = {
    k.removeprefix("llm:").removesuffix(":total_ms"): v
    for k, v in _counters.items() if k.startswith("llm:") and k.endswith(":total_ms")
}


def log_llm_call(node: str, elapsed_ms: float, success: bool,
                 model: str = "", token_usage: dict | None = None) -> None:
    """记录单次 LLM 调用指标并更新聚合计数器（内存 + 持久化）。"""
    _llm_call_count[node] = _llm_call_count.get(node, 0) + 1
    _llm_total_ms[node] = _llm_total_ms.get(node, 0) + elapsed_ms

    # 持久化增量写入
    _persist_counter(f"llm:{node}:calls", 1)
    _persist_counter(f"llm:{node}:total_ms", elapsed_ms)

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
    """获取所有节点的 LLM 调用统计（供调试/健康检查端点使用）。

    优先使用内存数据，若内存为空则从 DB 加载。
    """
    if _llm_call_count:
        return {
            node: {
                "calls": _llm_call_count.get(node, 0),
                "total_ms": round(_llm_total_ms.get(node, 0), 1),
                "avg_ms": round(_llm_total_ms.get(node, 0) / _llm_call_count.get(node, 1), 1),
            }
            for node in _llm_call_count
        }
    # 回退：从 DB 重建（进程重启后）
    db = _load_counters()
    result: dict[str, dict] = {}
    for k, v in db.items():
        if k.startswith("llm:") and k.endswith(":calls"):
            node = k.removeprefix("llm:").removesuffix(":calls")
            result.setdefault(node, {"calls": 0, "total_ms": 0, "avg_ms": 0})["calls"] = int(v)
        elif k.startswith("llm:") and k.endswith(":total_ms"):
            node = k.removeprefix("llm:").removesuffix(":total_ms")
            result.setdefault(node, {"calls": 0, "total_ms": 0, "avg_ms": 0})["total_ms"] = round(v, 1)
    for node, stats in result.items():
        if stats["calls"] > 0:
            stats["avg_ms"] = round(stats["total_ms"] / stats["calls"], 1)
    return result


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

_safety_net_counts: dict[str, int] = {
    k.removeprefix("safety_net:"): int(v)
    for k, v in _counters.items() if k.startswith("safety_net:")
}


def log_safety_net(name: str, detail: str = "") -> None:
    """记录安全网触发事件（内存 + 持久化）。"""
    _safety_net_counts[name] = _safety_net_counts.get(name, 0) + 1
    _persist_counter(f"safety_net:{name}", 1)
    _log(
        "safety_net.triggered",
        name=name,
        total=_safety_net_counts[name],
        detail=detail,
    )


def get_safety_net_stats() -> dict[str, int]:
    """获取安全网触发统计（优先内存，回退 DB）。"""
    if _safety_net_counts:
        return dict(_safety_net_counts)
    db = _load_counters()
    return {
        k.removeprefix("safety_net:"): int(v)
        for k, v in db.items() if k.startswith("safety_net:")
    }
