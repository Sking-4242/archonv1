import os

import anthropic

from app.services.llm.base import LLMProvider

_DEFAULT_MODEL = "claude-sonnet-4-6"


class AnthropicProvider(LLMProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        resolved_key = api_key or os.environ.get("ANTHROPIC_API_KEY", "")
        if not resolved_key:
            raise ValueError(
                "Anthropic API key is required. Set it in LLM Settings or "
                "add ANTHROPIC_API_KEY to your .env file."
            )
        self._client = anthropic.Anthropic(api_key=resolved_key)
        self._model = model or os.environ.get("ANTHROPIC_MODEL", _DEFAULT_MODEL)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        message = self._client.messages.create(
            model=self._model,
            max_tokens=8096,
            system=system_prompt,
            messages=[{"role": "user", "content": user_prompt}],
        )
        return message.content[0].text
