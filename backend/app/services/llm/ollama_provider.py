import os

import httpx

from app.services.llm.base import LLMProvider

_DEFAULT_MODEL = "llama3.2"
_DEFAULT_BASE_URL = "http://host.docker.internal:11434"


class OllamaProvider(LLMProvider):
    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
    ) -> None:
        self._base_url = (
            base_url
            or os.environ.get("OLLAMA_BASE_URL", _DEFAULT_BASE_URL)
        ).rstrip("/")
        self._model = model or os.environ.get("OLLAMA_MODEL", _DEFAULT_MODEL)

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        url = f"{self._base_url}/api/generate"
        full_prompt = f"{system_prompt}\n\n{user_prompt}"
        try:
            response = httpx.post(
                url,
                json={"model": self._model, "prompt": full_prompt, "stream": False},
                timeout=120.0,
            )
            response.raise_for_status()
            return response.json()["response"]
        except httpx.ConnectError:
            raise RuntimeError(f"Ollama is not reachable at {self._base_url}")
