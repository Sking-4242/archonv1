import time

from fastapi import APIRouter, HTTPException, Request

from app.models.generate import GenerateRequest, GenerateResponse
from app.services.llm.factory import get_provider
from app.services.prompt_builder import build_prompt
from app.services.azure_prompt_builder import build_azure_prompt
from app.services.gcp_prompt_builder import build_gcp_prompt
from app.services.onprem_prompt_builder import build_onprem_prompt
from app.services.terraform_splitter import make_zip_b64, split_hcl
from app.utils.validators import strip_fences, validate_hcl

router = APIRouter()

_MAX_BODY_BYTES = 512 * 1024  # 512 KB
_MAX_RETRIES = 2
_RETRY_BASE_SECONDS = 1.0

_PROMPT_BUILDERS = {
    "aws": build_prompt,
    "azure": build_azure_prompt,
    "gcp": build_gcp_prompt,
    "onprem": build_onprem_prompt,
}


def _call_with_retry(provider, system_prompt: str, user_prompt: str) -> str:
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        if attempt > 0:
            time.sleep(_RETRY_BASE_SECONDS * (2 ** (attempt - 1)))
        try:
            return provider.generate(system_prompt, user_prompt)
        except Exception as exc:
            last_exc = exc
            exc_str = str(exc).lower()
            if any(
                k in exc_str
                for k in ("401", "unauthorized", "invalid api key", "authentication")
            ):
                raise
    raise last_exc


@router.post("/generate", response_model=GenerateResponse)
async def generate(request: Request, body: GenerateRequest):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > _MAX_BODY_BYTES:
        raise HTTPException(status_code=413, detail="Request payload too large.")

    infra_provider = (body.graph.provider or "aws").lower()
    prompt_builder = _PROMPT_BUILDERS.get(infra_provider, build_prompt)
    system_prompt, user_prompt = prompt_builder(body.graph)

    try:
        provider = get_provider(
            provider_name=body.provider,
            api_key=body.api_key,
            model=body.model,
            base_url=body.base_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    try:
        raw = _call_with_retry(provider, system_prompt, user_prompt)
    except RuntimeError as exc:
        msg = str(exc)
        if "not reachable" in msg:
            raise HTTPException(status_code=503, detail=msg)
        raise HTTPException(
            status_code=500, detail="Generation failed. Please try again."
        )
    except Exception as exc:
        exc_str = str(exc).lower()
        if any(
            k in exc_str
            for k in ("401", "unauthorized", "invalid api key", "authentication")
        ):
            raise HTTPException(
                status_code=401,
                detail="Invalid API key. Please check your provider settings.",
            )
        raise HTTPException(
            status_code=500, detail="Generation failed. Please try again."
        )

    hcl = strip_fences(raw)
    errors = validate_hcl(hcl)
    if errors:
        raise HTTPException(status_code=422, detail=f"Invalid HCL output: {errors[0]}")

    files = split_hcl(hcl)
    zip_b64 = make_zip_b64(files)

    return GenerateResponse(hcl=hcl, files=files, zip_b64=zip_b64)
