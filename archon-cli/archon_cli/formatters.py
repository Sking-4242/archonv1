"""
formatters.py — Output formatters for Archon CLI commands.

Each formatter accepts a result object and writes to stdout (or a file).
Supported formats: table (human-readable), json, archon (Archon Pro import JSON).

The "archon" format produces a JSON blob that Archon Pro's
"Import CLI Report" feature can ingest directly.
"""

from __future__ import annotations

import json
import sys
from typing import Any, TextIO

# ANSI colour codes — disabled automatically when stdout is not a TTY
_IS_TTY = sys.stdout.isatty()

_RESET  = "\033[0m"   if _IS_TTY else ""
_BOLD   = "\033[1m"   if _IS_TTY else ""
_RED    = "\033[31m"  if _IS_TTY else ""
_YELLOW = "\033[33m"  if _IS_TTY else ""
_CYAN   = "\033[36m"  if _IS_TTY else ""
_GREEN  = "\033[32m"  if _IS_TTY else ""
_DIM    = "\033[2m"   if _IS_TTY else ""


def _level_color(level: str) -> str:
    return {
        "critical": _RED,
        "warning":  _YELLOW,
        "info":     _CYAN,
    }.get(level, "")


def _action_color(action: str) -> str:
    return {
        "create":  _GREEN,
        "delete":  _RED,
        "update":  _YELLOW,
        "replace": _YELLOW,
    }.get(action, _DIM)


# ─── Validate formatters ──────────────────────────────────────────────────────


_STANDARD_COLOR = "\033[35m" if _IS_TTY else ""  # magenta for standard badges


def _standard_badges(standards: list) -> str:
    """Format a list of standard codes as compact badge chips."""
    if not standards:
        return ""
    return " " + " ".join(f"{_STANDARD_COLOR}[{s}]{_RESET}" for s in standards)


def format_validate_table(
    findings: list,
    out: TextIO = sys.stdout,
    standard: str | None = None,
) -> None:
    """Human-readable table output for validate command."""
    from archon_cli.compliance import filter_findings_by_standard, STANDARDS

    active = (standard or "").upper()
    display_findings = filter_findings_by_standard(findings, active)

    if not display_findings:
        if active and active != "ALL":
            std_name = STANDARDS.get(active, {}).get("name", active)
            out.write(f"{_GREEN}{_BOLD}✓ No findings for {std_name} — looks clean.{_RESET}\n")
        else:
            out.write(f"{_GREEN}{_BOLD}✓ No findings — architecture looks clean.{_RESET}\n")
        return

    counts = {"critical": 0, "warning": 0, "info": 0}
    for f in display_findings:
        counts[f.level] = counts.get(f.level, 0) + 1

    title = "Validation Findings"
    if active and active != "ALL":
        std_name = STANDARDS.get(active, {}).get("name", active)
        std_ver  = STANDARDS.get(active, {}).get("version", "")
        title = f"Validation Findings  [{std_name} {std_ver}]"

    out.write(f"\n{_BOLD}{title}{_RESET}\n")
    out.write("─" * 70 + "\n")

    current_level = None
    for f in display_findings:
        if f.level != current_level:
            current_level = f.level
            color = _level_color(f.level)
            out.write(f"\n{color}{_BOLD}{f.level.upper()}{_RESET}\n")

        color = _level_color(f.level)
        stds = getattr(f, "standards", [])
        badges = _standard_badges(stds)
        out.write(f"  {color}[{f.level}]{_RESET} {_BOLD}{f.rule_id}{_RESET}{badges}\n")
        out.write(f"    Resource : {f.node_label} ({f.node_type})\n")
        out.write(f"    Message  : {f.message}\n")
        out.write(f"    Fix      : {_DIM}{f.fix}{_RESET}\n\n")

    out.write("─" * 70 + "\n")
    parts = []
    if counts["critical"]:
        parts.append(f"{_RED}{counts['critical']} critical{_RESET}")
    if counts["warning"]:
        parts.append(f"{_YELLOW}{counts['warning']} warning{_RESET}")
    if counts["info"]:
        parts.append(f"{_CYAN}{counts['info']} info{_RESET}")
    out.write(f"Total: {', '.join(parts) if parts else '0 findings'}\n")


def format_validate_json(findings: list, out: TextIO = sys.stdout) -> None:
    """JSON output for validate command (machine-readable)."""
    data = [f.to_dict() for f in findings]
    json.dump(data, out, indent=2)
    out.write("\n")


def format_validate_archon(findings: list, source_file: str, out: TextIO = sys.stdout) -> None:
    """
    Archon Pro import format for validate results.
    Compatible with the ImportCLIReport handler in Archon Pro.
    """
    data = {
        "archonCliVersion": "0.1.0",
        "reportType": "validate",
        "sourceFile": source_file,
        "findings": [f.to_dict() for f in findings],
        "summary": {
            "critical": sum(1 for f in findings if f.level == "critical"),
            "warning":  sum(1 for f in findings if f.level == "warning"),
            "info":     sum(1 for f in findings if f.level == "info"),
            "total":    len(findings),
        },
    }
    json.dump(data, out, indent=2)
    out.write("\n")


# ─── Cost formatters ─────────────────────────────────────────────────────────


def format_cost_table(report: Any, out: TextIO = sys.stdout) -> None:
    """Human-readable table for cost command."""
    from archon_cli.cost import CostReport  # local import to avoid circular

    out.write(f"\n{_BOLD}Cost Impact — TF Plan{_RESET}  {_DIM}(pricing as of {report.pricing_as_of}){_RESET}\n")
    out.write("─" * 78 + "\n")
    out.write(f"  {'ACTION':<10} {'ADDRESS':<40} {'COST/MO':>10}  DESCRIPTION\n")
    out.write("─" * 78 + "\n")

    for item in report.line_items:
        acolor = _action_color(item.action)
        cost_str = f"${item.monthly_cost:>8.2f}" if item.monthly_cost is not None else "      free"
        addr = item.address[:39] if len(item.address) > 39 else item.address
        out.write(
            f"  {acolor}{item.action:<10}{_RESET} {addr:<40} {cost_str}  {_DIM}{item.description}{_RESET}\n"
        )

    out.write("─" * 78 + "\n")
    delta_color = _GREEN if report.net_delta <= 0 else _RED
    delta_sign = "+" if report.net_delta > 0 else ""
    out.write(f"\n  {_BOLD}Added    :{_RESET}  ${report.added_monthly:>10.2f} / month\n")
    out.write(f"  {_BOLD}Removed  :{_RESET}  ${report.removed_monthly:>10.2f} / month\n")
    out.write(f"  {_BOLD}Net delta:{_RESET}  {delta_color}{delta_sign}${report.net_delta:>9.2f} / month{_RESET}\n")
    out.write(f"  {_BOLD}Est. total after apply:{_RESET}  ${report.total_after:>8.2f} / month\n\n")


def format_cost_json(report: Any, out: TextIO = sys.stdout) -> None:
    json.dump(report.to_dict(), out, indent=2)
    out.write("\n")


def format_cost_archon(report: Any, source_file: str, out: TextIO = sys.stdout) -> None:
    data = report.to_dict()
    data["archonCliVersion"] = "0.1.0"
    data["reportType"] = "cost"
    data["sourceFile"] = source_file
    json.dump(data, out, indent=2)
    out.write("\n")


# ─── Discover formatters ─────────────────────────────────────────────────────


def format_discover_table(report: Any, out: TextIO = sys.stdout) -> None:
    """Human-readable table for discover command."""
    out.write(f"\n{_BOLD}AWS Discovery — {report.region}{_RESET}\n")
    out.write("─" * 78 + "\n")
    out.write(f"  {'SERVICE':<16} {'TYPE':<22} {'NAME':<28} STATE\n")
    out.write("─" * 78 + "\n")

    for r in sorted(report.resources, key=lambda x: (x.service, x.resource_type, x.name)):
        name = r.name[:27] if len(r.name) > 27 else r.name
        svc = r.service[:15] if len(r.service) > 15 else r.service
        rtype = r.resource_type[:21] if len(r.resource_type) > 21 else r.resource_type
        state_color = _GREEN if r.state in ("running", "active", "available", "in-use", "ACTIVE") else _DIM
        out.write(f"  {svc:<16} {rtype:<22} {name:<28} {state_color}{r.state}{_RESET}\n")

    out.write("─" * 78 + "\n")
    out.write(f"\n  {_BOLD}Total: {report.resource_count} resources{_RESET}\n")

    if report.resources:
        out.write(f"\n  {_BOLD}By type:{_RESET}\n")
        summary = report.to_dict()["summary"]
        for ctype, count in sorted(summary.items(), key=lambda x: -x[1]):
            bar = "█" * min(count, 30)
            out.write(f"    {ctype:<24} {bar} {count}\n")

    if report.errors:
        out.write(f"\n  {_YELLOW}{_BOLD}Errors ({len(report.errors)}):{_RESET}\n")
        for err in report.errors:
            out.write(f"    {err.service}: {err.error[:60]}\n")
    out.write("\n")


def format_discover_json(report: Any, out: TextIO = sys.stdout) -> None:
    json.dump(report.to_dict(), out, indent=2)
    out.write("\n")


# ─── GitHub formatters ───────────────────────────────────────────────────────


def format_validate_github(
    findings: list,
    source_file: str,
    out: TextIO = sys.stdout,
    standard: str | None = None,
) -> None:
    """
    GitHub-flavored markdown output for validate command.
    Suitable for posting as a PR comment via gh pr comment or similar.
    No ANSI codes. No emoji.
    """
    from archon_cli.compliance import filter_findings_by_standard, STANDARDS
    from archon_cli import __version__

    active = (standard or "").upper()
    display_findings = filter_findings_by_standard(findings, active)

    title_suffix = ""
    if active and active != "ALL":
        std_name = STANDARDS.get(active, {}).get("name", active)
        std_ver  = STANDARDS.get(active, {}).get("version", "")
        title_suffix = f" — {std_name} {std_ver}".rstrip()

    out.write(f"## Archon Validation — {source_file}{title_suffix}\n\n")

    counts = {"critical": 0, "warning": 0, "info": 0}
    for f in display_findings:
        level = f.level if f.level in counts else "info"
        counts[level] += 1

    out.write("| Severity | Count |\n")
    out.write("|---|---|\n")
    if counts["critical"]:
        out.write(f"| **CRITICAL** | {counts['critical']} |\n")
    if counts["warning"]:
        out.write(f"| WARNING | {counts['warning']} |\n")
    if counts["info"]:
        out.write(f"| INFO | {counts['info']} |\n")
    if not display_findings:
        out.write("| PASS | 0 findings |\n")

    if not display_findings:
        out.write("\nNo findings — architecture looks clean.\n\n")
        out.write(f"*Generated by archon-cli {__version__}*\n")
        return

    out.write("\n---\n")

    for level in ("critical", "warning", "info"):
        level_findings = [f for f in display_findings if f.level == level]
        if not level_findings:
            continue

        out.write(f"\n### {level.upper()}\n\n")
        out.write("| Rule | Resource | Message | Fix | Standards |\n")
        out.write("|---|---|---|---|---|\n")
        for f in level_findings:
            stds = getattr(f, "standards", [])
            stds_str = ", ".join(stds) if stds else "—"
            rule   = _md_escape(f.rule_id)
            res    = _md_escape(f"{f.node_label} ({f.node_type})")
            msg    = _md_escape(f.message)
            fix    = _md_escape(f.fix)
            out.write(f"| {rule} | {res} | {msg} | {fix} | {stds_str} |\n")

    out.write("\n---\n")
    out.write(f"*Generated by archon-cli {__version__}*\n")


def _md_escape(text: str) -> str:
    """Escape pipe characters so they don't break markdown table cells."""
    return str(text).replace("|", "\\|")


def format_cost_github(report: Any, source_file: str, out: TextIO = sys.stdout) -> None:
    """
    GitHub-flavored markdown output for cost command.
    Suitable for posting as a PR comment.
    No ANSI codes. No emoji.
    """
    from archon_cli import __version__

    delta_sign = "+" if report.net_delta > 0 else ""

    out.write(f"## Archon Cost Impact \u2014 {source_file}\n\n")
    out.write("| | Amount |\n")
    out.write("|---|---|\n")
    out.write(f"| Added | +${report.added_monthly:.2f}/mo |\n")
    out.write(f"| Removed | -${report.removed_monthly:.2f}/mo |\n")
    out.write(f"| **Net delta** | **{delta_sign}${report.net_delta:.2f}/mo** |\n")
    out.write(f"| Est. total after apply | ${report.total_after:.2f}/mo |\n")

    if report.line_items:
        out.write(f"\n<details>\n<summary>Line items ({len(report.line_items)} resources)</summary>\n\n")
        out.write("| Action | Resource | $/month | Description |\n")
        out.write("|---|---|---|---|\n")
        for item in report.line_items:
            cost_str = f"${item.monthly_cost:.2f}" if item.monthly_cost is not None else "free"
            action = _md_escape(item.action)
            addr   = _md_escape(item.address)
            desc   = _md_escape(item.description)
            out.write(f"| {action} | {addr} | {cost_str} | {desc} |\n")
        out.write("\n</details>\n")

    out.write(f"\n*Generated by archon-cli {__version__} \u00b7 Pricing as of {report.pricing_as_of}*\n")


def format_discover_archon(report: Any, out: TextIO = sys.stdout) -> None:
    """
    Archon Pro import format for discovery results.
    Converts discovered resources into canvas-compatible nodes.
    """
    nodes = []
    for r in report.resources:
        nodes.append({
            "id": r.resource_id.replace(":", "_").replace("/", "_"),
            "type": r.canvas_type,
            "data": {
                "label": r.name,
                "config": r.attributes,
                "service": r.service,
                "awsType": r.resource_type,
                "discoveredState": r.state,
            },
        })

    data = {
        "archonCliVersion": "0.1.0",
        "reportType": "discover",
        "region": report.region,
        "nodes": nodes,
        "summary": report.to_dict()["summary"],
        "errors": [e.to_dict() for e in report.errors],
    }
    json.dump(data, sys.stdout, indent=2)
    sys.stdout.write("\n")
