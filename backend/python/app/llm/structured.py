"""结构化 LLM 输出 — 原始文本 + JSON 清洗 + 校验失败重试。

不再依赖 with_structured_output（DeepSeek 支持不稳定），改为：
1. 直接调用 LLM 获取原始文本
2. 从文本中提取 JSON（去 markdown 代码块、定位花括号边界）
3. 修复常见 JSON 语法错误（单引号、尾部逗号等）
4. Pydantic 校验；失败则把错误信息回传给 LLM 重试（最多 3 次）
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable
from typing import Type, TypeVar

from pydantic import BaseModel, ValidationError
from langchain_core.language_models.chat_models import BaseChatModel

from app.agent.constants import MAX_STRUCTURED_RETRIES as MAX_RETRIES
from app.llm.provider import get_chat_model

T = TypeVar("T", bound=BaseModel)

# validate 回调: 接收已解析的 Pydantic 对象，返回错误列表（空=通过）
ValidatorFn = Callable[[T], list[str]]


# ═══════════════════════════════════════════════════════════════
# JSON 清洗
# ═══════════════════════════════════════════════════════════════

def _extract_json(text: str) -> str:
    """从 LLM 原始输出中提取 JSON 字符串。"""
    text = text.strip()

    # 1. 去除 markdown 代码块 ```
    if text.startswith("```"):
        first_nl = text.find("\n")
        if first_nl != -1:
            text = text[first_nl + 1:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    # 2. 定位第一个 { 或 [ 和最后一个 } 或 ]
    for opener, closer in [("{", "}"), ("[", "]")]:
        start = text.find(opener)
        end = text.rfind(closer)
        if start != -1 and end != -1 and end > start:
            return text[start:end + 1]

    return text


def _clean_json(text: str) -> str:
    """修复常见 JSON 语法错误（单引号、尾部逗号、中文标点）。

    不使用 look-behind 断言避免 Python 变长限制。
    """
    # 1. 单引号 key: 'key' : → "key":
    text = re.sub(r"'([^']+)'\s*:", r'"\1":', text)
    # 2. 单引号 value: : 'value' → : "value"
    text = re.sub(r":\s*'([^']*)'", r': "\1"', text)
    # 3. 数组中的单引号字符串: ['a', 'b']
    text = re.sub(r"\[\s*'([^']*)'", r'["\1"', text)
    text = re.sub(r",\s*'([^']*)'", r', "\1"', text)
    # 4. 去除尾部逗号 (, } 或 , ])
    text = re.sub(r",\s*([}\]])", r"\1", text)
    # 5. 中文双引号 -> 英文双引号
    text = text.replace("“", '"').replace("”", '"')
    text = text.replace("‘", "'").replace("’", "'")

    return text


def _repair_json(text: str) -> str | None:
    """尝试多轮修复后返回合法 JSON 字符串，失败返回 None。"""
    cleaned = _clean_json(text)
    try:
        json.loads(cleaned)
        return cleaned
    except json.JSONDecodeError:
        pass
    # 尝试用 ast.literal_eval 处理 Python dict 格式
    try:
        import ast
        obj = ast.literal_eval(text.strip())
        return json.dumps(obj, ensure_ascii=False)
    except Exception:
        import logging
        logging.getLogger(__name__).debug("ast.literal_eval fallback failed for JSON repair")
    return None


# ═══════════════════════════════════════════════════════════════
# Schema 描述（嵌入 prompt，让 LLM 知道期望的 JSON 结构）
# ═══════════════════════════════════════════════════════════════

def _type_str(annotation) -> str:
    """Pydantic 字段类型 -> 可读字符串。"""
    origin = getattr(annotation, "__origin__", None)
    if origin is list:
        args = getattr(annotation, "__args__", ())
        inner = _type_str(args[0]) if args else "any"
        return f"[{inner}, ...]"
    if origin is dict:
        return "{key: value, ...}"
    # 基础类型
    type_map = {
        str: "string",
        int: "int",
        float: "float",
        bool: "bool",
        type(None): "null",
    }
    for py_type, name in type_map.items():
        if annotation is py_type:
            return name
    # Optional[X] -> X | null
    args = getattr(annotation, "__args__", ())
    non_none = [a for a in args if a is not type(None)]
    if non_none and len(non_none) < len(args):
        return _type_str(non_none[0]) + " | null"
    # Pydantic 子模型
    if isinstance(annotation, type) and issubclass(annotation, BaseModel):
        return _describe_schema(annotation)
    return str(annotation)


def _describe_schema(schema: Type[BaseModel]) -> str:
    """将 Pydantic schema 转为人类可读的 JSON 结构描述。"""
    lines = ["{"]
    for i, (name, field) in enumerate(schema.model_fields.items()):
        comma = "," if i < len(schema.model_fields) - 1 else ""
        desc = f"  // {field.description}" if field.description else ""
        lines.append(f'  "{name}": {_type_str(field.annotation)}{comma}{desc}')
    lines.append("}")
    return "\n".join(lines)


def _build_schema_instruction(output_schema: Type[T]) -> str:
    """生成嵌入 system prompt 的 schema 指令。"""
    return (
        "严格按照以下 JSON schema 输出，不要添加任何解释文字，只输出纯 JSON 对象：\n"
        + _describe_schema(output_schema)
    )


# ═══════════════════════════════════════════════════════════════
# 内部异常
# ═══════════════════════════════════════════════════════════════

class _ValidationErrors(Exception):
    """业务校验失败，携带错误列表。"""
    def __init__(self, errors: list[str]):
        super().__init__("\n".join(errors))
        self.errors = errors


# ═══════════════════════════════════════════════════════════════
# 主函数
# ═══════════════════════════════════════════════════════════════

def invoke_structured(
    system_prompt: str,
    user_prompt: str,
    output_schema: Type[T],
    model: BaseChatModel | None = None,
    validate: ValidatorFn[T] | None = None,
    node: str = "",
) -> T:
    """调用 LLM 并返回结构化 Pydantic 对象，带 JSON 清洗 + 业务校验 + 重试。

    validate: 可选的业务校验回调，接收已解析的对象，返回错误列表（空=通过）。
              校验失败时错误会回传给 LLM 重试。
    node: 调用来源节点名（用于 metrics 追踪）。
    """
    import time as _time

    llm = model or get_chat_model()
    schema_instruction = _build_schema_instruction(output_schema)

    messages = [
        ("system", system_prompt + "\n\n" + schema_instruction),
        ("human", user_prompt),
    ]

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            _start = _time.perf_counter()
            response = llm.invoke(messages)
            llm_elapsed_ms = (_time.perf_counter() - _start) * 1000
            raw_text = _llm_response_text(response)

            # 提取 token 用量（如果响应包含）
            token_usage = _extract_token_usage(response)

            # 1. 提取 JSON
            json_text = _extract_json(raw_text)

            # 2. 清洗并修复
            repaired = _repair_json(json_text)
            if repaired is None:
                raise json.JSONDecodeError("cannot extract valid JSON", raw_text, 0)

            # 3. 解析 + Pydantic 校验
            data = json.loads(repaired)
            obj = output_schema.model_validate(data)

            # 4. 业务校验
            if validate is not None:
                errors = validate(obj)
                if errors:
                    raise _ValidationErrors(errors)

            # 成功：记录 LLM 调用指标
            if node:
                try:
                    from app.agent.metrics import log_llm_call
                    model_name = getattr(llm, "model_name", "") or getattr(llm, "model", "") or ""
                    log_llm_call(node, llm_elapsed_ms, True, model=str(model_name),
                                 token_usage=token_usage)
                except Exception:
                    pass

            return obj

        except (json.JSONDecodeError, ValidationError) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                messages.append(
                    ("human",
                     f"output format error: {e}\n"
                     "Please correct your JSON output. Field names and types must exactly match the schema.")
                )
            continue

        except _ValidationErrors as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                error_detail = "\n".join(f"  - {err}" for err in e.errors)
                messages.append(
                    ("human",
                     f"content validation failed:\n{error_detail}\n"
                     "Please fix these issues and output the corrected JSON.")
                )
            continue

    # 全部重试失败：记录失败指标
    if node:
        try:
            from app.agent.metrics import log_llm_call
            log_llm_call(node, 0, False, model="")
        except Exception:
            pass
    raise ValueError(
        f"structured output failed after {MAX_RETRIES} retries. Last error: {last_error}"
    )


def _extract_token_usage(response) -> dict | None:
    """从 LLM 响应中提取 token 用量。"""
    for attr in ("usage_metadata", "response_metadata", "llm_output"):
        meta = getattr(response, attr, None)
        if isinstance(meta, dict):
            usage = meta.get("token_usage") or meta.get("usage")
            if usage:
                return dict(usage)
    return None


async def ainvoke_structured(
    system_prompt: str,
    user_prompt: str,
    output_schema: Type[T],
    model: BaseChatModel | None = None,
    validate: ValidatorFn[T] | None = None,
    node: str = "",
) -> T:
    """异步调用 LLM 并返回结构化 Pydantic 对象，带 JSON 清洗 + 业务校验 + 重试。

    node: 调用来源节点名（用于 metrics 追踪）。
    """
    import time as _time

    llm = model or get_chat_model()
    schema_instruction = _build_schema_instruction(output_schema)

    messages = [
        ("system", system_prompt + "\n\n" + schema_instruction),
        ("human", user_prompt),
    ]

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            _start = _time.perf_counter()
            response = await llm.ainvoke(messages)
            llm_elapsed_ms = (_time.perf_counter() - _start) * 1000
            raw_text = _llm_response_text(response)

            token_usage = _extract_token_usage(response)

            # 1. 提取 JSON
            json_text = _extract_json(raw_text)

            # 2. 清洗并修复
            repaired = _repair_json(json_text)
            if repaired is None:
                raise json.JSONDecodeError("cannot extract valid JSON", raw_text, 0)

            # 3. 解析 + Pydantic 校验
            data = json.loads(repaired)
            obj = output_schema.model_validate(data)

            # 4. 业务校验
            if validate is not None:
                errors = validate(obj)
                if errors:
                    raise _ValidationErrors(errors)

            # 成功：记录 LLM 调用指标
            if node:
                try:
                    from app.agent.metrics import log_llm_call
                    model_name = getattr(llm, "model_name", "") or getattr(llm, "model", "") or ""
                    log_llm_call(node, llm_elapsed_ms, True, model=str(model_name),
                                 token_usage=token_usage)
                except Exception:
                    pass

            return obj

        except (json.JSONDecodeError, ValidationError) as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                messages.append(
                    ("human",
                     f"output format error: {e}\n"
                     "Please correct your JSON output. Field names and types must exactly match the schema.")
                )
            continue

        except _ValidationErrors as e:
            last_error = e
            if attempt < MAX_RETRIES - 1:
                error_detail = "\n".join(f"  - {err}" for err in e.errors)
                messages.append(
                    ("human",
                     f"content validation failed:\n{error_detail}\n"
                     "Please fix these issues and output the corrected JSON.")
                )
            continue

    # 全部重试失败
    if node:
        try:
            from app.agent.metrics import log_llm_call
            log_llm_call(node, 0, False, model="")
        except Exception:
            pass
    raise ValueError(
        f"structured output failed after {MAX_RETRIES} retries. Last error: {last_error}"
    )


def _llm_response_text(response) -> str:
    """从各种 LLM 响应对象中提取文本。"""
    if hasattr(response, "content") and isinstance(response.content, str):
        return response.content
    if hasattr(response, "text"):
        return response.text
    return str(response)
