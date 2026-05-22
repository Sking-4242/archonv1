"""
test_run.py — Quick smoke test for archon-cli.

Creates a sample Terraform plan JSON with a realistic set of resources,
then runs validate and cost against it so you can see real output.

Usage:
    python test_run.py
"""

import json
import os
import subprocess
import sys

# Use "python -m archon_cli.main" so this works even if the archon-cli
# script isn't on PATH yet (common on Windows after a fresh pip install).
CLI = [sys.executable, "-m", "archon_cli.main"]

# ─── Sample Terraform plan ────────────────────────────────────────────────────
# Mimics the output of: terraform show -json tfplan
# Includes intentional issues so validate has something to flag.

SAMPLE_PLAN = {
    "format_version": "1.0",
    "planned_values": {
        "root_module": {
            "resources": [
                {
                    "type": "aws_instance",
                    "name": "web",
                    "address": "aws_instance.web",
                    "values": {
                        "instance_type": "t3.micro",
                        "metadata_options": [{"http_tokens": "optional"}],  # triggers ec2_imdsv2_optional
                    },
                },
                {
                    "type": "aws_instance",
                    "name": "app",
                    "address": "aws_instance.app",
                    "values": {
                        "instance_type": "t3.medium",
                        "metadata_options": [{"http_tokens": "required"}],
                    },
                },
                {
                    "type": "aws_db_instance",
                    "name": "db",
                    "address": "aws_db_instance.db",
                    "values": {
                        "instance_class": "db.t3.micro",
                        "publicly_accessible": True,   # triggers rds_publicly_accessible (CRITICAL)
                        "storage_encrypted": False,    # triggers rds_unencrypted
                        "backup_retention_period": 0,  # triggers rds_no_backup
                        "deletion_protection": False,  # triggers rds_no_deletion_protection
                    },
                },
                {
                    "type": "aws_s3_bucket",
                    "name": "logs",
                    "address": "aws_s3_bucket.logs",
                    "values": {},
                },
                {
                    "type": "aws_vpc",
                    "name": "main",
                    "address": "aws_vpc.main",
                    "values": {"cidr_block": "10.0.0.0/16"},
                },
                {
                    "type": "aws_lambda_function",
                    "name": "processor",
                    "address": "aws_lambda_function.processor",
                    "values": {
                        "function_name": "processor",
                        "runtime": "python3.12",
                        "tracing_config": [{"mode": "PassThrough"}],  # triggers lambda_no_tracing
                    },
                },
            ]
        }
    },
    "resource_changes": [
        {
            "type": "aws_instance",
            "address": "aws_instance.web",
            "change": {
                "actions": ["create"],
                "before": None,
                "after": {"instance_type": "t3.micro"},
            },
        },
        {
            "type": "aws_instance",
            "address": "aws_instance.app",
            "change": {
                "actions": ["create"],
                "before": None,
                "after": {"instance_type": "t3.medium"},
            },
        },
        {
            "type": "aws_db_instance",
            "address": "aws_db_instance.db",
            "change": {
                "actions": ["create"],
                "before": None,
                "after": {"instance_class": "db.t3.micro"},
            },
        },
        {
            "type": "aws_s3_bucket",
            "address": "aws_s3_bucket.logs",
            "change": {
                "actions": ["create"],
                "before": None,
                "after": {},
            },
        },
        {
            "type": "aws_vpc",
            "address": "aws_vpc.main",
            "change": {
                "actions": ["create"],
                "before": None,
                "after": {},
            },
        },
        {
            "type": "aws_lambda_function",
            "address": "aws_lambda_function.processor",
            "change": {
                "actions": ["create"],
                "before": None,
                "after": {},
            },
        },
        # One delete to make the cost delta interesting
        {
            "type": "aws_instance",
            "address": "aws_instance.old",
            "change": {
                "actions": ["delete"],
                "before": {"instance_type": "t3.large"},
                "after": None,
            },
        },
    ],
    "configuration": {
        "root_module": {
            "resources": []
        }
    },
}


def run(label, cmd):
    print(f"\n{'=' * 60}")
    print(f"  {label}")
    print(f"  $ {' '.join(cmd)}")
    print("=" * 60)
    result = subprocess.run(cmd, capture_output=False, text=True)
    return result.returncode


def main():
    # Write the sample plan to the current directory so you can re-run
    # individual commands against it after this script finishes.
    plan_path = os.path.join(os.path.dirname(__file__), "sample_plan.json")
    with open(plan_path, "w", encoding="utf-8") as f:
        json.dump(SAMPLE_PLAN, f, indent=2)

    print(f"\nSample plan written to: {plan_path}")
    print("You can re-run commands against it manually after this script finishes.\n")
    print("Running archon-cli against it...\n")

    try:
        # ── validate (table) ──────────────────────────────────────────────────
        rc = run("VALIDATE — table output", [*CLI, "validate", plan_path])
        print(f"\n[exit code: {rc}]  (1 = critical findings present)")

        # ── validate (json) ───────────────────────────────────────────────────
        run("VALIDATE — json output", [*CLI, "validate", plan_path, "--format", "json"])

        # ── cost (table) ──────────────────────────────────────────────────────
        run("COST — table output", [*CLI, "cost", plan_path])

        # ── cost (json) ───────────────────────────────────────────────────────
        run("COST — json output", [*CLI, "cost", plan_path, "--format", "json"])

        # ── archon format (for UI import) ─────────────────────────────────────
        archon_out = os.path.join(os.path.dirname(__file__), "sample_validate_report.json")
        run(
            "VALIDATE — archon format (for Archon Pro import)",
            [*CLI, "validate", plan_path, "--format", "archon", "--output", archon_out],
        )
        if os.path.exists(archon_out):
            with open(archon_out) as f:
                data = json.load(f)
            print(f"\n  Archon report written to: {archon_out}")
            print(f"  reportType: {data.get('reportType')}")
            print(f"  findings:   {len(data.get('findings', []))}")
            print(f"  Load this file into Archon Pro via the 'CLI Report' button.")

        print(f"\n{'=' * 60}")
        print("  All commands ran successfully.")
        print()
        print("  Files saved for manual testing:")
        print(f"    Plan:   sample_plan.json")
        print(f"    Report: sample_validate_report.json  (import into Archon Pro)")
        print()
        print("  Try these commands yourself:")
        print("    archon-cli validate sample_plan.json")
        print("    archon-cli cost sample_plan.json")
        print("    archon-cli validate sample_plan.json --format json")
        print()
        print("  To test discover (requires AWS credentials):")
        print("    archon-cli discover --region us-east-1")
        print("=" * 60 + "\n")

    finally:
        pass  # keep sample_plan.json for manual testing


if __name__ == "__main__":
    main()
