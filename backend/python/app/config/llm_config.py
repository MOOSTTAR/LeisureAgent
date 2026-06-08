"""LLM Provider 配置层，支持多 provider 切换。"""

from __future__ import annotations

import logging
from enum import Enum

from pydantic import Field
from pydantic_settings import BaseSettings

logger = logging.getLogger(__name__)


class LLMProvider(str, Enum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    OLLAMA = "ollama"
    DEEPSEEK = "deepseek"
    OPENAI_COMPATIBLE = "openai_compatible"


class LLMSettings(BaseSettings):
    """LLM 配置，优先从环境变量读取，支持 .env 文件。"""

    llm_provider: LLMProvider = Field(default=LLMProvider.DEEPSEEK, alias="LLM_PROVIDER")

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_base_url: str = Field(default="https://api.openai.com/v1", alias="OPENAI_BASE_URL")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")

    anthropic_api_key: str = Field(default="", alias="ANTHROPIC_API_KEY")
    anthropic_model: str = Field(default="claude-3-5-sonnet-20241022", alias="ANTHROPIC_MODEL")

    ollama_base_url: str = Field(default="http://localhost:11434", alias="OLLAMA_BASE_URL")
    ollama_model: str = Field(default="qwen2.5:14b", alias="OLLAMA_MODEL")

    deepseek_api_key: str = Field(default="", alias="DEEPSEEK_API_KEY")
    deepseek_base_url: str = Field(default="https://api.deepseek.com", alias="DEEPSEEK_BASE_URL")
    deepseek_model: str = Field(default="deepseek-v4-pro", alias="DEEPSEEK_MODEL")

    compatible_api_key: str = Field(default="", alias="COMPATIBLE_API_KEY")
    compatible_base_url: str = Field(default="", alias="COMPATIBLE_BASE_URL")
    compatible_model: str = Field(default="", alias="COMPATIBLE_MODEL")

    temperature: float = Field(default=0.3, alias="LLM_TEMPERATURE")
    max_tokens: int = Field(default=2048, alias="LLM_MAX_TOKENS")
    timeout: int = Field(default=60, alias="LLM_TIMEOUT")

    use_llm_for_intent: bool = Field(default=True, alias="USE_LLM_FOR_INTENT")
    use_llm_for_plan: bool = Field(default=True, alias="USE_LLM_FOR_PLAN")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


_llm_settings: LLMSettings | None = None


def get_llm_settings() -> LLMSettings:
    global _llm_settings
    if _llm_settings is None:
        _llm_settings = LLMSettings()
    return _llm_settings


# ── 启动配置校验 ──────────────────────────────────────────────

# provider → (api_key_field, api_key_env_var) 映射
_API_KEY_MAP: dict[LLMProvider, tuple[str, str]] = {
    LLMProvider.OPENAI: ("openai_api_key", "OPENAI_API_KEY"),
    LLMProvider.ANTHROPIC: ("anthropic_api_key", "ANTHROPIC_API_KEY"),
    LLMProvider.DEEPSEEK: ("deepseek_api_key", "DEEPSEEK_API_KEY"),
    LLMProvider.OLLAMA: ("", ""),           # Ollama 本地运行，无需 API key
    LLMProvider.OPENAI_COMPATIBLE: ("compatible_api_key", "COMPATIBLE_API_KEY"),
}


def validate_config_or_die() -> None:
    """启动时校验 LLM 配置——未配置 API Key 则直接退出并打印配置指引。"""
    import sys

    settings = get_llm_settings()
    provider = settings.llm_provider

    needs_llm = settings.use_llm_for_intent or settings.use_llm_for_plan
    if not needs_llm:
        logger.info("LLM features disabled via config, all operations will use rule-based fallback")
        return

    if provider == LLMProvider.OLLAMA:
        return

    field_name, env_var = _API_KEY_MAP.get(provider, ("", ""))
    if field_name and env_var:
        api_key = getattr(settings, field_name, "")
        if not api_key:
            msg = (
                f"\n{'=' * 60}\n"
                f"  LLM 配置错误：Provider = '{provider.value}'，但 {env_var} 未设置。\n"
                f"\n"
                f"  请按以下步骤配置：\n"
                f"    1. 复制 .env.example → backend/python/.env\n"
                f"       cp .env.example backend/python/.env\n"
                f"    2. 编辑 backend/python/.env，设置 {env_var}=你的API密钥\n"
                f"       方式一（推荐）：系统环境变量 + .env 中写 ${{{env_var}}}\n"
                f"       方式二：.env 中直接填写 {env_var}=sk-xxx\n"
                f"{'=' * 60}\n"
            )
            logger.critical(msg)
            sys.exit(1)

    logger.info("LLM config validated: provider=%s, model=%s", provider.value,
                _get_model_name(settings, provider))


def _get_model_name(settings: LLMSettings, provider: LLMProvider) -> str:
    """获取当前 provider 对应的模型名。"""
    model_map: dict[LLMProvider, str] = {
        LLMProvider.OPENAI: settings.openai_model,
        LLMProvider.ANTHROPIC: settings.anthropic_model,
        LLMProvider.DEEPSEEK: settings.deepseek_model,
        LLMProvider.OLLAMA: settings.ollama_model,
        LLMProvider.OPENAI_COMPATIBLE: settings.compatible_model,
    }
    return model_map.get(provider, "unknown")
