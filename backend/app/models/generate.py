from pydantic import BaseModel

from app.models.graph import Graph


class GenerateRequest(BaseModel):
    graph: Graph
    provider: str | None = None
    api_key: str | None = None
    model: str | None = None
    base_url: str | None = None


class GenerateResponse(BaseModel):
    hcl: str
    files: dict[str, str] = {}  # filename → HCL content
    zip_b64: str = ""  # base64-encoded ZIP of all files


class GenerateError(BaseModel):
    detail: str
