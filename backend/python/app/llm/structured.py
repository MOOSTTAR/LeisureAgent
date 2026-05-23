"""结构化 LLM 输出，使用 LangChain 的 with_structured_output。"""

from __future__ import annotations

from typing import TypeVar, Type

from pydantic import BaseModel
from langchain_core.language_models.chat_models import BaseChatModel

from app.llm.provider import get_chat_model

T = TypeVar("T", bound=BaseModel)


def invoke_structured(
    system_prompt: str,
    user_prompt: str,
    output_schema: Type[T],
    model: BaseChatModel | None = None,
) -> T:
    """调用 LLM 并返回结构化 Pydantic 对象。"""
    llm = model or get_chat_model()
    structured_llm = llm.with_structured_output(output_schema, method="json_mode")
    messages = [
        ("system", system_prompt),
        ("human", user_prompt),
    ]
    return structured_llm.invoke(messages)


async def ainvoke_structured(
    system_prompt: str,
    user_prompt: str,
    output_schema: Type[T],
    model: BaseChatModel | None = None,
) -> T:
    """异步调用 LLM 并返回结构化 Pydantic 对象。"""
    llm = model or get_chat_model()
    structured_llm = llm.with_structured_output(output_schema, method="json_mode")
    messages = [
        ("system", system_prompt),
        ("human", user_prompt),
    ]
    return await structured_llm.ainvoke(messages)
