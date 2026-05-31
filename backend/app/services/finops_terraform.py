"""Generate Terraform HCL snippets from FinOps recommendations."""

from __future__ import annotations

import re

from app.models.graph import Component, Graph

_TF_NAME_RE = re.compile(r"[^a-zA-Z0-9_]")


def _tf_name(label: str, fallback: str) -> str:
    slug = _TF_NAME_RE.sub("_", label.lower()).strip("_")
    return slug or fallback


def _cfg(component: Component, key: str, default=None):
    return (component.config or {}).get(key, default)


def _components_by_id(graph: Graph) -> dict[str, Component]:
    return {c.id: c for c in graph.components}


def generate_terraform_diff(
    graph: Graph,
    recommendations: list[dict],
) -> str:
    """
    Build a combined HCL document for selected recommendations.
    Each block includes a comment with the recommendation title.
    """
    by_id = _components_by_id(graph)
    blocks: list[str] = []

    for rec in recommendations:
        rid = rec.get("id", "")
        title = rec.get("title", rid)
        hint = rec.get("terraformHint") or rec.get("terraform_hint") or ""
        component_ids = rec.get("componentIds") or rec.get("component_ids") or []

        if rid.startswith("finops_ec2_rightsize"):
            comp = by_id.get(component_ids[0]) if component_ids else None
            if not comp:
                continue
            name = _tf_name(comp.label, "web")
            current = _cfg(comp, "instance_type", "t3.micro")
            target = hint.split('"')[1] if hint.count('"') >= 2 else "t3.medium"
            blocks.append(
                f'# FinOps: {title}\n'
                f'resource "aws_instance" "{name}" {{\n'
                f"  # Update instance_type on existing resource\n"
                f'  instance_type = "{target}"  # was {current}\n'
                f"}}\n"
            )
            continue

        if rid.startswith("finops_ec2_prev_gen"):
            comp = by_id.get(component_ids[0]) if component_ids else None
            if not comp:
                continue
            name = _tf_name(comp.label, "web")
            current = _cfg(comp, "instance_type", "t3.micro")
            blocks.append(
                f'# FinOps: {title}\n'
                f'resource "aws_instance" "{name}" {{\n'
                f'  instance_type = "t3.medium"  # migrate from legacy {current}\n'
                f"}}\n"
            )
            continue

        if rid.startswith("finops_ebs_gp3"):
            comp = by_id.get(component_ids[0]) if component_ids else None
            if not comp:
                continue
            name = _tf_name(comp.label, "data")
            blocks.append(
                f'# FinOps: {title}\n'
                f'resource "aws_ebs_volume" "{name}" {{\n'
                f'  volume_type = "gp3"\n'
                f"}}\n"
            )
            continue

        if rid.startswith("finops_rds_gp3"):
            comp = by_id.get(component_ids[0]) if component_ids else None
            if not comp:
                continue
            name = _tf_name(comp.label, "database")
            blocks.append(
                f'# FinOps: {title}\n'
                f'resource "aws_db_instance" "{name}" {{\n'
                f'  storage_type = "gp3"\n'
                f"}}\n"
            )
            continue

        if rid.startswith("finops_rds_ri"):
            blocks.append(
                f"# FinOps: {title}\n"
                f"# Purchase a 1-year Reserved Instance in AWS Console for steady-state RDS.\n"
                f"# Terraform tracks on-demand config; RI billing is a separate purchase.\n"
            )
            continue

        if rid.startswith("finops_lambda_arm64"):
            comp = by_id.get(component_ids[0]) if component_ids else None
            if not comp:
                continue
            name = _tf_name(comp.label, "function")
            blocks.append(
                f'# FinOps: {title}\n'
                f'resource "aws_lambda_function" "{name}" {{\n'
                f'  architectures = ["arm64"]\n'
                f"}}\n"
            )
            continue

        if rid.startswith("finops_s3_lifecycle"):
            comp = by_id.get(component_ids[0]) if component_ids else None
            if not comp:
                continue
            name = _tf_name(comp.label, "bucket")
            blocks.append(
                f'# FinOps: {title}\n'
                f'resource "aws_s3_bucket_lifecycle_configuration" "{name}" {{\n'
                f'  bucket = aws_s3_bucket.{name}.id\n\n'
                f"  rule {{\n"
                f'    id     = "expire-noncurrent"\n'
                f'    status = "Enabled"\n\n'
                f"    noncurrent_version_expiration {{\n"
                f"      noncurrent_days = 30\n"
                f"    }}\n"
                f"  }}\n"
                f"}}\n"
            )
            continue

        if rid.startswith("finops_nat_review"):
            blocks.append(
                f"# FinOps: {title}\n"
                f'resource "aws_vpc_endpoint" "s3" {{\n'
                f"  vpc_id       = var.vpc_id\n"
                f'  service_name = "com.amazonaws.${{var.region}}.s3"\n'
                f"}}\n"
            )
            continue

        if hint:
            blocks.append(f"# FinOps: {title}\n# {hint}\n")

    if not blocks:
        return "# No Terraform changes could be generated for the selected recommendations.\n"

    header = (
        "# Generated by Archon FinOps — apply selectively after review.\n"
        "# Merge these attribute changes into your existing Terraform modules.\n\n"
    )
    return header + "\n".join(blocks)
