"""用户输入安全过滤 — 防止 prompt injection 攻击。

在用户输入进入 LLM 和下游节点之前进行检测和清洗。
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from app.agent.constants import MAX_INPUT_LENGTH

# 明显的注入攻击模式（正则）
_INJECTION_PATTERNS: list[tuple[str, str]] = [
    # 指令覆盖
    (r"(?i)ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|prompts?|messages?)",
     "检测到指令覆盖尝试"),
    (r"(?i)forget\s+(all\s+)?(previous|prior|your)\s+(instructions?|prompts?|rules?)",
     "检测到指令覆盖尝试"),
    (r"(?i)disregard\s+(all\s+)?(previous|prior|above)",
     "检测到指令覆盖尝试"),
    (r"(?i)override\s+(your\s+)?(instructions?|prompts?|rules?|system)",
     "检测到指令覆盖尝试"),
    # 角色劫持
    (r"(?i)you\s+are\s+(now|no\s+longer)\s+(a\s+)?(different\s+)?(AI|assistant|model|bot|system)",
     "检测到角色劫持尝试"),
    (r"(?i)your\s+(new\s+)?(identity|role|name|persona)\s+(is|now)",
     "检测到角色劫持尝试"),
    (r"(?i)act\s+(as|like)\s+(a\s+)?(different\s+)?(AI|assistant|model|bot)",
     "检测到角色劫持尝试"),
    # 系统提示词提取
    (r"(?i)(show|tell|reveal|print|display|output|dump|leak)\s+(me\s+)?(your\s+)?(system\s+)?(prompts?|instructions?|rules?|config)",
     "检测到系统提示词提取尝试"),
    (r"(?i)what\s+(are|is)\s+(your\s+)?(system\s+)?(prompts?|instructions?)",
     "检测到系统提示词提取尝试"),
    (r"(?i)(repeat|echo|say|recite)\s+(back\s+)?(your\s+)?(system\s+)?(prompts?|instructions?)",
     "检测到系统提示词提取尝试"),
    # 中文注入模式
    (r"(忽略|无视|忘记|别管)(之前的|上面的|所有的)?(指令|提示|规则|对话)",
     "检测到中文指令覆盖尝试"),
    (r"(你|你现在的)(身份|角色|名字)(是|现在|变成)",
     "检测到中文角色劫持尝试"),
    (r"(告诉|展示|显示|泄露|输出|打印)(我|你的)(系统)?(提示词|指令|规则|配置)",
     "检测到中文提示词提取尝试"),
    (r"(重复|复述|说出)(你的)?(系统)?(提示词|指令)",
     "检测到中文提示词提取尝试"),
    # JSON/SQL/代码注入标记
    (r"(\}\s*\}\s*\{)", "检测到 JSON 注入尝试"),
    (r"(?i)(DROP\s+TABLE|DELETE\s+FROM|INSERT\s+INTO|UPDATE\s+.*SET|UNION\s+SELECT)",
     "检测到 SQL 注入标记"),
    # 分隔符溢出
    (r"(_{3,}|-{3,}|`{3,}|'{3,}|\"{3,})", None),  # 不拒绝，但标记
]

# 需要清洗的模式（去除而非拒绝）
_CLEANUP_PATTERNS: list[tuple[str, str]] = [
    (r"[\x00-\x08\x0b\x0c\x0e-\x1f]", ""),  # 控制字符（保留 \t \n）
    (r"​|‌|‍|﻿", ""),     # 零宽字符
]


@dataclass
class InputCheckResult:
    passed: bool
    sanitized: str = ""
    reason: str = ""
    flags: list[str] = field(default_factory=list)

    @property
    def blocked(self) -> bool:
        return not self.passed


def check_user_input(raw: str) -> InputCheckResult:
    """检查并清洗用户输入。

    返回 InputCheckResult:
      - passed=True: 输入安全或仅做清洗
      - passed=False: 检测到注入攻击，应拒绝处理
    """
    if not raw or not raw.strip():
        return InputCheckResult(passed=False, reason="输入为空")

    text = raw.strip()

    # 长度限制
    if len(text) > MAX_INPUT_LENGTH:
        return InputCheckResult(
            passed=False,
            reason=f"输入过长（{len(text)}/{MAX_INPUT_LENGTH}字符）",
        )

    # 清洗控制字符和零宽字符
    for pattern, replacement in _CLEANUP_PATTERNS:
        text = re.sub(pattern, replacement, text)

    # 检查注入模式
    flags: list[str] = []
    for pattern, reason in _INJECTION_PATTERNS:
        if re.search(pattern, text):
            if reason is None:
                flags.append(pattern[:40])
            else:
                return InputCheckResult(
                    passed=False,
                    reason=reason,
                    flags=[reason],
                )

    # 如果只有无害标记
    if flags:
        return InputCheckResult(passed=True, sanitized=text, flags=flags)

    return InputCheckResult(passed=True, sanitized=text)
