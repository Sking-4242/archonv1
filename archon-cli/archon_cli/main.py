"""
main.py — Archon CLI entrypoint.

Commands
--------
archon-cli validate <plan.json>     Run architecture validation on a TF plan
archon-cli cost     <plan.json>     Calculate cost delta for a TF plan
archon-cli discover [--region R]    Discover live AWS infrastructure

Global flags
------------
--format table|json|archon|github   Output format (default: table)
--output <file>                     Write output to file instead of stdout
--profile <aws-profile>             AWS profile name (discover only)
--version                           Print version and exit

Security note
-------------
AWS credentials are NEVER passed to this tool as arguments — they are
resolved by boto3 using the standard credential chain only
(env vars, ~/.aws/credentials, instance metadata).
Credentials never leave this machine.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from archon_cli import __version__


def _load_plan(path: str) -> dict:
    """Read and parse a terraform show -json plan file."""
    plan_path = Path(path)
    if not plan_path.exists():
        print(f"Error: file not found: {path}", file=sys.stderr)
        sys.exit(1)
    try:
        with open(plan_path, encoding="utf-8") as fh:
            return json.load(fh)
    except json.JSONDecodeError as exc:
        print(f"Error: {path} is not valid JSON: {exc}", file=sys.stderr)
        sys.exit(1)


def _open_output(path: str | None):
    """Return an open file handle for output (stdout if path is None)."""
    if path is None:
        return sys.stdout, False
    try:
        fh = open(path, "w", encoding="utf-8")  # noqa: SIM115
        return fh, True
    except OSError as exc:
        print(f"Error: cannot open output file {path}: {exc}", file=sys.stderr)
        sys.exit(1)


# ─── Command implementations ─────────────────────────────────────────────────


def cmd_validate(args: argparse.Namespace) -> int:
    from archon_cli.validate import validate_plan_json
    from archon_cli.formatters import (
        format_validate_table,
        format_validate_json,
        format_validate_archon,
        format_validate_github,
    )

    plan = _load_plan(args.plan_file)
    findings = validate_plan_json(plan)

    standard = getattr(args, "standard", None)

    out, close = _open_output(args.output)
    try:
        fmt = args.format
        if fmt == "json":
            format_validate_json(findings, out)
        elif fmt == "archon":
            format_validate_archon(findings, args.plan_file, out)
        elif fmt == "github":
            format_validate_github(findings, args.plan_file, out, standard=standard)
        else:
            format_validate_table(findings, out, standard=standard)
    finally:
        if close:
            out.close()

    # Exit 1 if any critical findings
    has_critical = any(f.level == "critical" for f in findings)
    return 1 if has_critical else 0


def cmd_cost(args: argparse.Namespace) -> int:
    from archon_cli.cost import cost_plan_json
    from archon_cli.formatters import (
        format_cost_table,
        format_cost_json,
        format_cost_archon,
        format_cost_github,
    )

    plan = _load_plan(args.plan_file)
    report = cost_plan_json(plan)

    out, close = _open_output(args.output)
    try:
        fmt = args.format
        if fmt == "json":
            format_cost_json(report, out)
        elif fmt == "archon":
            format_cost_archon(report, args.plan_file, out)
        elif fmt == "github":
            format_cost_github(report, args.plan_file, out)
        else:
            format_cost_table(report, out)
    finally:
        if close:
            out.close()

    return 0


def cmd_discover(args: argparse.Namespace) -> int:
    try:
        import boto3  # noqa: F401
    except ImportError:
        print(
            "Error: boto3 is not installed.\n"
            "Install it with:  pip install boto3",
            file=sys.stderr,
        )
        return 1

    from archon_cli.discover import discover_region
    from archon_cli.formatters import (
        format_discover_table,
        format_discover_json,
        format_discover_archon,
    )

    region = args.region
    profile = getattr(args, "profile", None)

    print(f"Discovering AWS resources in {region}...", file=sys.stderr)
    report = discover_region(region, profile=profile)

    out, close = _open_output(args.output)
    try:
        fmt = args.format
        if fmt == "json":
            format_discover_json(report, out)
        elif fmt == "archon":
            format_discover_archon(report, out)
        else:
            format_discover_table(report, out)
    finally:
        if close:
            out.close()

    return 0


# ─── CLI parser ───────────────────────────────────────────────────────────────


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="archon-cli",
        description=(
            "Archon CLI — validate, cost-diff, and discover AWS infrastructure.\n\n"
            "Security: AWS credentials are resolved locally via boto3 standard chain.\n"
            "Credentials never leave this machine."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--version", action="version", version=f"archon-cli {__version__}"
    )

    _global = argparse.ArgumentParser(add_help=False)
    _global.add_argument(
        "--format", choices=["table", "json", "archon", "github"], default="table",
        help="Output format: table (default), json, archon (Archon Pro import), or github (markdown for PR comments)",
    )
    _global.add_argument(
        "--output", "-o", metavar="FILE", default=None,
        help="Write output to FILE instead of stdout",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # ── validate ──────────────────────────────────────────────────────────────
    p_validate = subparsers.add_parser(
        "validate",
        parents=[_global],
        help="Run architecture validation on a terraform show -json plan",
        description=(
            "Validates a TF plan JSON file against Archon's rule set.\n"
            "Exits 0 if clean, 1 if any critical findings are found."
        ),
    )
    p_validate.add_argument(
        "plan_file",
        metavar="PLAN_JSON",
        help="Path to terraform show -json output (e.g. plan.json)",
    )
    p_validate.add_argument(
        "--standard", "-s",
        choices=["CIS", "SOC2", "PCI", "HIPAA", "NIST", "all"],
        default=None,
        metavar="STANDARD",
        help=(
            "Filter findings by compliance standard: "
            "CIS, SOC2, PCI, HIPAA, NIST, or all (default: all). "
            "Example: --standard PCI"
        ),
    )

    # ── cost ──────────────────────────────────────────────────────────────────
    p_cost = subparsers.add_parser(
        "cost",
        parents=[_global],
        help="Calculate monthly cost delta for a terraform plan",
        description=(
            "Estimates the cost impact of applying a TF plan.\n"
            "Uses bundled static pricing data — no AWS API calls required."
        ),
    )
    p_cost.add_argument(
        "plan_file",
        metavar="PLAN_JSON",
        help="Path to terraform show -json output (e.g. plan.json)",
    )

    # ── discover ──────────────────────────────────────────────────────────────
    p_discover = subparsers.add_parser(
        "discover",
        parents=[_global],
        help="Discover live AWS infrastructure in a region",
        description=(
            "Scans 30 common AWS service types in the given region.\n\n"
            "Credentials are resolved via the boto3 standard chain:\n"
            "  1. AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY env vars\n"
            "  2. ~/.aws/credentials file\n"
            "  3. EC2/ECS instance metadata (IAM role)\n\n"
            "Credentials NEVER leave this machine."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p_discover.add_argument(
        "--region", "-r", default="us-east-1",
        help="AWS region to discover (default: us-east-1)",
    )
    p_discover.add_argument(
        "--profile", "-p", default=None,
        help="AWS profile name from ~/.aws/config (optional)",
    )

    return parser


def main() -> None:
    parser = _build_parser()
    args = parser.parse_args()

    dispatch = {
        "validate": cmd_validate,
        "cost":     cmd_cost,
        "discover": cmd_discover,
    }

    handler = dispatch.get(args.command)
    if handler is None:
        parser.print_help()
        sys.exit(1)

    sys.exit(handler(args))


if __name__ == "__main__":
    main()
