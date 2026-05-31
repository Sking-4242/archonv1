"""GitOps integration smoke tests — mirrors .github/workflow-templates steps."""

import io
import json
import subprocess
import sys
from pathlib import Path

import pytest

from archon_cli.cost import cost_plan_json
from archon_cli.formatters import format_cost_github, format_validate_github
from archon_cli.main import cmd_cost, cmd_validate
from archon_cli.validate import validate_plan_json

SAMPLE_PLAN = Path(__file__).resolve().parents[1] / "sample_plan.json"
REPO_ROOT = Path(__file__).resolve().parents[2]
EMPTY_PLAN = {
    "format_version": "1.2",
    "variables": {},
    "planned_values": {"root_module": {"resources": []}},
    "resource_changes": [],
    "configuration": {"root_module": {}},
}


def _load_sample_plan() -> dict:
    return json.loads(SAMPLE_PLAN.read_text(encoding="utf-8"))


class _Args:
    def __init__(self, plan_file: str, fmt: str = "github", output: str | None = None, standard: str | None = None):
        self.plan_file = plan_file
        self.format = fmt
        self.output = output
        self.standard = standard


def test_validate_github_format_on_sample_plan():
    findings = validate_plan_json(_load_sample_plan())
    buf = io.StringIO()
    format_validate_github(findings, str(SAMPLE_PLAN), buf)
    md = buf.getvalue()
    assert md.startswith("## Archon Validation")
    assert "| Severity | Count |" in md
    assert "CRITICAL" in md


def test_cost_github_format_on_sample_plan():
    report = cost_plan_json(_load_sample_plan())
    buf = io.StringIO()
    format_cost_github(report, str(SAMPLE_PLAN), buf)
    md = buf.getvalue()
    assert md.startswith("## Archon Cost Impact")
    assert "Net delta" in md


def test_validate_exits_nonzero_on_critical_findings():
    code = cmd_validate(_Args(str(SAMPLE_PLAN), fmt="table"))
    assert code == 1


def test_validate_exits_zero_on_empty_plan():
    empty_path = Path(__file__).parent / "_empty_plan.json"
    empty_path.write_text(json.dumps(EMPTY_PLAN), encoding="utf-8")
    try:
        code = cmd_validate(_Args(str(empty_path), fmt="github"))
        assert code == 0
    finally:
        empty_path.unlink(missing_ok=True)


def test_cost_always_exits_zero():
    code = cmd_cost(_Args(str(SAMPLE_PLAN), fmt="github"))
    assert code == 0


def test_validate_compliance_filter_pci():
    findings = validate_plan_json(_load_sample_plan())
    buf = io.StringIO()
    format_validate_github(findings, str(SAMPLE_PLAN), buf, standard="PCI")
    md = buf.getvalue()
    assert "PCI" in md


def test_gitops_workflow_commands(tmp_path):
    """Simulate archon-validate.yml validate + cost steps."""
    validate_out = tmp_path / "validate-report.md"
    cost_out = tmp_path / "cost-report.md"

    validate_code = cmd_validate(_Args(str(SAMPLE_PLAN), output=str(validate_out)))
    cost_code = cmd_cost(_Args(str(SAMPLE_PLAN), output=str(cost_out)))

    assert validate_out.exists()
    assert cost_out.exists()
    assert "Archon Validation" in validate_out.read_text(encoding="utf-8")
    assert "Archon Cost Impact" in cost_out.read_text(encoding="utf-8")
    assert validate_code == 1
    assert cost_code == 0


@pytest.mark.skipif(sys.platform == "win32", reason="pre-commit hook is bash-only")
def test_pre_commit_hook_runs_when_plan_present(tmp_path):
    plan = tmp_path / "plan.json"
    plan.write_text(json.dumps(EMPTY_PLAN), encoding="utf-8")
    hook = REPO_ROOT / ".github" / "hooks" / "pre-commit"
    result = subprocess.run(
        ["bash", str(hook)],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr + result.stdout
