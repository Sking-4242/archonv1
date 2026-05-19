import os

from openai import OpenAI

from app.services.llm.base import LLMProvider

_DEFAULT_MODEL = "grok-3"
_DEFAULT_BASE_URL = "https://api.x.ai/v1"


class XAIProvider(LLMProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
        base_url: str | None = None,
    ) -> None:
        resolved_key = api_key or os.environ.get("XAI_API_KEY", "")
        if not resolved_key:
            raise ValueError(
                "xAI API key is required. Set it in LLM Settings or "
                "add XAI_API_KEY to your .env file."
            )
        resolved_base = (
            base_url
            or os.environ.get("XAI_BASE_URL", _DEFAULT_BASE_URL)
        )
        self._client = OpenAI(api_key=resolved_key, base_url=resolved_base)
        self._model = model or os.environ.get("XAI_MODEL", _DEFAULT_MODEL)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content
