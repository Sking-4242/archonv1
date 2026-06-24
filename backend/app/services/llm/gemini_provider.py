import os

import google.generativeai as genai

from app.services.llm.base import LLMProvider

_DEFAULT_MODEL = "gemini-2.5-flash"


class GeminiProvider(LLMProvider):
    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        resolved_key = api_key or os.environ.get("GOOGLE_API_KEY", "")
        if not resolved_key:
            raise ValueError(
                "Google API key is required. Set it in LLM Settings or "
                "add GOOGLE_API_KEY to your .env file."
            )
        genai.configure(api_key=resolved_key)
        model_name = model or os.environ.get("GOOGLE_MODEL", _DEFAULT_MODEL)
        self._model = genai.GenerativeModel(model_name)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        response = self._model.generate_content(
            full_prompt,
            generation_config={"max_output_tokens": 16384},
        )
        return response.text
