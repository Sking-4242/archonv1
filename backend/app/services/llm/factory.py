import os

from app.services.llm.anthropic_provider import AnthropicProvider
from app.services.llm.base import LLMProvider
from app.services.llm.gemini_provider import GeminiProvider
from app.services.llm.ollama_provider import OllamaProvider
from app.services.llm.openai_provider import OpenAIProvider
from app.services.llm.xai_provider import XAIProvider


def get_provider(
    provider_name: str | None = None,
    api_key: str | None = None,
    model: str | None = None,
    base_url: str | None = None,
) -> LLMProvider:
    name = (provider_name or os.environ.get("LLM_PROVIDER", "anthropic")).lower()

    if name == "anthropic":
        return AnthropicProvider(api_key=api_key, model=model)
    elif name == "openai":
        return OpenAIProvider(api_key=api_key, model=model)
    elif name == "gemini":
        return GeminiProvider(api_key=api_key, model=model)
    elif name == "ollama":
        return OllamaProvider(base_url=base_url, model=model)
    elif name == "xai":
        return XAIProvider(api_key=api_key, model=model, base_url=base_url)
    else:
        raise ValueError(f"Unknown LLM provider: {name!r}")
