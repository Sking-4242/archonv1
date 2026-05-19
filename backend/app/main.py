import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.models import academy as _academy_models  # noqa: F401 -- registers ORM models
from app.routers import chat as chat_router
from app.routers import estimate as estimate_router
from app.routers import generate as generate_router
from app.routers import import_tf as import_tf_router
from app.routers.academy import auth as academy_auth_router
from app.routers.academy import assignments as academy_assignments_router
from app.routers.academy import submissions as academy_submissions_router

app = FastAPI(title="Archon API", version="0.1.0")

_frontend_port = os.environ.get("FRONTEND_PORT", "3000")
_academy_port = os.environ.get("ACADEMY_PORT", "3001")
_allowed_origins = [
    "http://localhost:" + _frontend_port,
    "http://localhost:" + _academy_port,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(generate_router.router)
app.include_router(estimate_router.router)
app.include_router(chat_router.router)
app.include_router(import_tf_router.router)
app.include_router(academy_auth_router.router)
app.include_router(academy_assignments_router.router)
app.include_router(academy_submissions_router.router)


@app.on_event("startup")
def create_tables():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
