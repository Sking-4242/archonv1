"""Ensure every Archon canvas palette type has a discovery handler."""

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
PALETTE_FILE = REPO_ROOT / "frontend" / "src" / "components" / "canvas" / "palette.js"
DISCOVER_SOURCES = [
    REPO_ROOT / "archon-cli" / "archon_cli" / "discover.py",
    REPO_ROOT / "archon-cli" / "archon_cli" / "discover_extended.py",
    REPO_ROOT / "archon-cli" / "archon_cli" / "discover_palette.py",
]


def _palette_types() -> set[str]:
    text = PALETTE_FILE.read_text(encoding="utf-8")
    return set(re.findall(r'type:\s*"([^"]+)"', text))


def _covered_canvas_types() -> set[str]:
    covered: set[str] = set()
    for path in DISCOVER_SOURCES:
        text = path.read_text(encoding="utf-8")
        covered.update(re.findall(r'canvas_type="([^"]+)"', text))
        covered.update(re.findall(r"canvas_type=(\w+)", text))
    # Dynamic assignments not captured by regex above
    covered.update({
        "alb", "nlb",          # _discover_albs sets canvas_type from lb type
        "rds", "aurora",       # _discover_rds engine branch
        "documentdb", "neptune",  # _discover_rds_engine_clusters(canvas_type=...)
    })
    return covered


def test_all_palette_types_have_discovery_handlers():
    palette = _palette_types()
    covered = _covered_canvas_types()
    missing = sorted(palette - covered)
    assert not missing, f"Missing discovery handlers for palette types: {missing}"


def test_discoverer_count_is_complete():
    from archon_cli.discover import _DISCOVERERS

    assert len(_DISCOVERERS) >= 80
