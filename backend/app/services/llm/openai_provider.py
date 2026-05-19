import os

from openai import OpenAI

from app.services.llm.base import LLMProvider

_DEFAULT_MODEL = "gpt-4.1"


class OpenAIProvider(LLMProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        resolved_key = api_key or os.environ.get("OPENAI_API_KEY", "")
        if not resolved_key:
            raise ValueError(
                "OpenAI API key is required. Set it in LLM Settings or "
                "add OPENAI_API_KEY to your .env file."
            )
        self._client = OpenAI(api_key=resolved_key)
        self._model = model or os.environ.get("OPENAI_MODEL", _DEFAULT_MODEL)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        response = self._client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )
        return response.choices[0].message.content
