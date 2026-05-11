from dataclasses import dataclass
from typing import Any

from langchain_openai import ChatOpenAI

from .settings import settings


@dataclass(frozen=True)
class LlmConfig:
    provider: str
    model: str | None
    api_key: str
    temperature: float | None
    top_p: float | None
    top_k: int | None


class LlmAdapterFactory:
    def build_chat_model(self, config: LlmConfig) -> ChatOpenAI:
        provider = (config.provider or settings.default_llm_provider).lower()
        if provider == "openrouter":
            return self._openrouter(config)
        if provider == "openai":
            return self._openai_compatible(config)
        raise RuntimeError(f"unsupported LLM provider: {provider}")

    def _openrouter(self, config: LlmConfig) -> ChatOpenAI:
        if not config.api_key:
            raise RuntimeError("OPENROUTER_API_KEY is required for OpenRouter agents")

        headers: dict[str, str] = {}
        if settings.openrouter_http_referer:
            headers["HTTP-Referer"] = settings.openrouter_http_referer
        if settings.openrouter_app_title:
            headers["X-Title"] = settings.openrouter_app_title

        return self._chat_openai(
            api_key=config.api_key,
            base_url=settings.openrouter_base_url,
            model=config.model or settings.default_model,
            temperature=config.temperature,
            top_p=config.top_p,
            default_headers=headers or None,
            model_kwargs={},
        )

    def _openai_compatible(self, config: LlmConfig) -> ChatOpenAI:
        if not config.api_key:
            raise RuntimeError("OPENAI_API_KEY is required for OpenAI-compatible agents")

        model_kwargs: dict[str, Any] = {}
        if config.top_k is not None:
            model_kwargs["top_k"] = config.top_k

        return self._chat_openai(
            api_key=config.api_key,
            base_url=settings.openai_base_url,
            model=config.model or settings.default_model,
            temperature=config.temperature,
            top_p=config.top_p,
            default_headers=None,
            model_kwargs=model_kwargs,
        )

    def _chat_openai(
        self,
        *,
        api_key: str,
        base_url: str | None,
        model: str,
        temperature: float | None,
        top_p: float | None,
        default_headers: dict[str, str] | None,
        model_kwargs: dict[str, Any],
    ) -> ChatOpenAI:
        kwargs: dict[str, Any] = {
            "api_key": api_key,
            "base_url": base_url,
            "model": model,
            "temperature": temperature,
            "top_p": top_p,
        }
        if default_headers:
            kwargs["default_headers"] = default_headers
        if model_kwargs:
            kwargs["model_kwargs"] = model_kwargs
        return ChatOpenAI(**kwargs)
