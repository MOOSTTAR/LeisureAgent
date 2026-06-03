"""LLM Provider 统一封装，隐藏不同 provider 的差异。"""

from __future__ import annotations

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_ollama import ChatOllama

from app.config.llm_config import get_llm_settings, LLMProvider


_chat_model_cache: BaseChatModel | None = None


def create_chat_model(
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> BaseChatModel:
    """根据配置创建对应的 ChatModel 实例。"""
    settings = get_llm_settings()
    temp = temperature if temperature is not None else settings.temperature
    max_tok = max_tokens if max_tokens is not None else settings.max_tokens
    provider = settings.llm_provider

    if provider == LLMProvider.OPENAI:
        return ChatOpenAI(
            model=settings.openai_model,
            api_key=settings.openai_api_key or None,
            base_url=settings.openai_base_url or None,
            temperature=temp,
            max_tokens=max_tok,
            timeout=settings.timeout,
        )

    if provider == LLMProvider.ANTHROPIC:
        return ChatAnthropic(
            model=settings.anthropic_model,
            api_key=settings.anthropic_api_key or None,
            temperature=temp,
            max_tokens=max_tok,
            timeout=settings.timeout,
        )

    if provider == LLMProvider.OLLAMA:
        return ChatOllama(
            model=settings.ollama_model,
            base_url=settings.ollama_base_url,
            temperature=temp,
            num_predict=max_tok,
        )

    if provider == LLMProvider.DEEPSEEK:
        return ChatOpenAI(
            model=settings.deepseek_model,
            api_key=settings.deepseek_api_key or None,
            base_url=settings.deepseek_base_url,
            temperature=temp,
            max_tokens=max_tok,
            timeout=settings.timeout,
            reasoning_effort="medium",
            extra_body={"thinking": {"type": "enabled"}},
        )

    if provider == LLMProvider.OPENAI_COMPATIBLE:
        return ChatOpenAI(
            model=settings.compatible_model,
            api_key=settings.compatible_api_key or None,
            base_url=settings.compatible_base_url,
            temperature=temp,
            max_tokens=max_tok,
            timeout=settings.timeout,
        )

    raise ValueError(f"不支持的 LLM provider: {provider}")


_light_model_cache: BaseChatModel | None = None


def get_chat_model() -> BaseChatModel:
    """获取 ChatModel（缓存）。"""
    global _chat_model_cache
    if _chat_model_cache is None:
        _chat_model_cache = create_chat_model()
    return _chat_model_cache


def get_light_chat_model() -> BaseChatModel:
    """获取轻量 ChatModel（无深度推理模式，用于简单分类任务）。"""
    global _light_model_cache
    if _light_model_cache is not None:
        return _light_model_cache
    settings = get_llm_settings()
    if settings.llm_provider == LLMProvider.DEEPSEEK:
        _light_model_cache = ChatOpenAI(
            model=settings.deepseek_model,
            api_key=settings.deepseek_api_key or None,
            base_url=settings.deepseek_base_url,
            temperature=0.0,
            max_tokens=512,
            timeout=settings.timeout,
        )
    else:
        _light_model_cache = create_chat_model(temperature=0.0, max_tokens=512)
    return _light_model_cache
