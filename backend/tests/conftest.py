"""Pytest configuration — set required env before app modules import."""

import os

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
