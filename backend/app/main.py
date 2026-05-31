import logging
import os

from fastapi import FastAPI

logging.basicConfig(level=logging.WARNING)
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth as auth_router
from app.routers import access as access_router
from app.routers import license as license_router
from app.routers import canvas_saves as canvas_saves_router
from app.routers import portal as portal_router
from app.routers import stripe_webhooks as stripe_webhooks_router
from app.routers import chat as chat_router
from app.routers import estimate as estimate_router
from app.routers import generate as generate_router
from app.routers import import_tf as import_tf_router
from app.routers import import_plan as import_plan_router
from app.routers import design as design_router
from app.routers import finops as finops_router
from app.routers.academy import auth as academy_auth_router
from app.routers.academy import assignments as academy_assignments_router
from app.routers.academy import lessons as academy_lessons_router
from app.routers.academy import library as academy_library_router
from app.routers.academy import library_links as academy_library_links_router
from app.routers.academy import modules as academy_modules_router
from app.routers.academy import notes as academy_notes_router
from app.routers.academy import submissions as academy_submissions_router
from app.routers.academy import practice_tests as academy_practice_tests_router
from app.routers.academy import classes as academy_classes_router
from app.routers.academy import teaching_assistant as academy_teaching_assistant_router
from app.routers.academy import tutor as academy_tutor_router
from app.routers.academy import organization as academy_organization_router

app = FastAPI(title="Archon API", version="0.1.0")

_frontend_port = os.environ.get("FRONTEND_PORT", "3000")
_academy_port = os.environ.get("ACADEMY_PORT", "3001")
_portal_port = os.environ.get("PORTAL_PORT", "3002")
_allowed_origins = [
    "http://localhost:" + _frontend_port,
    "http://localhost:" + _academy_port,
    "http://localhost:" + _portal_port,
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(access_router.router)
app.include_router(license_router.router)
app.include_router(canvas_saves_router.router)
app.include_router(portal_router.router)
app.include_router(stripe_webhooks_router.router)
app.include_router(generate_router.router)
app.include_router(estimate_router.router)
app.include_router(chat_router.router)
app.include_router(import_tf_router.router)
app.include_router(import_plan_router.router)
app.include_router(design_router.router)
app.include_router(finops_router.router)
app.include_router(academy_auth_router.router)
app.include_router(academy_assignments_router.router)
app.include_router(academy_submissions_router.router)
app.include_router(academy_modules_router.router)
app.include_router(academy_lessons_router.router)
app.include_router(academy_library_router.router)
app.include_router(academy_library_links_router.router)
app.include_router(academy_notes_router.router)
app.include_router(academy_practice_tests_router.router)
app.include_router(academy_classes_router.router)
app.include_router(academy_teaching_assistant_router.router)
app.include_router(academy_tutor_router.router)
app.include_router(academy_organization_router.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "0.1.0"}
