"""LLM Provider 配置层，支持多 provider 切换。"""

from __future__ import annotations

from enum import Enum

from pydantic import Field
from pydantic_settings import BaseSettings


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
