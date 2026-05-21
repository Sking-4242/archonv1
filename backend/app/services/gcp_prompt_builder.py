"""Builds system + user prompts for GCP Terraform generation (google provider)."""

from __future__ import annotations

import json

from app.models.graph import Graph

_SYSTEM = (
    "You are an expert Google Cloud infrastructure engineer. "
    "You generate valid, production-ready Terraform HCL (google provider) "
    "from architecture diagrams described as JSON. "
    "Follow these rules strictly:\n"
    "1. Output ONLY Terraform HCL. No prose, no markdown fences, no comments unless "
    "they clarify non-obvious resource relationships.\n"
    "2. Every resource must have a unique, snake_case resource name.\n"
    "3. Use the google provider. Declare 'terraform { required_providers { google = { "
    "source = \"hashicorp/google\" version = \"~> 5.0\" } } }' at the top.\n"
    "4. Add 'provider \"google\" { project = var.project_id region = var.region }' block.\n"
    "5. Use variables for sensitive values (project_id, credentials, etc.).\n"
    "6. Reference resources by Terraform identifiers, not hardcoded IDs.\n"
    "7. Include firewall rules based on the security_groups array when present.\n"
    "8. Edge types: network=VPC connectivity, data_flow=data transfer, "
    "dependency=logical dependency, streaming=Pub/Sub or Dataflow stream, "
    "batch=scheduled batch job, event=Cloud Functions or Eventarc trigger.\n"
    "9. Respect the region in the graph meta for the GCP region field.\n"
    "10. If instructions are provided on a component, honour them in the resource config.\n"
    "11. If a component lists config values, treat them as the authoritative Terraform "
    "resource configuration. Reproduce those attribute key-value pairs exactly in the "
    "generated HCL resource block for that component.\n"
)


def build_gcp_prompt(graph: Graph) -> tuple[str, str]:
    safe = _sanitize(graph)
    user = (
        f"Generate Terraform HCL for the following GCP architecture:\n\n"
        f"```json\n{json.dumps(safe, indent=2)}\n```"
    )
    return _SYSTEM, user


def _sanitize(graph: Graph) -> dict:
    MAX_LABEL = 120
    MAX_INSTRUCTIONS = 500

    def _clean_str(s: str, limit: int) -> str:
        return s.replace("\x00", "").strip()[:limit]

    components = []
    for c in graph.components:
        components.append(
            {
                "id": c.id[:64],
                "type": c.type,
                "label": _clean_str(c.label, MAX_LABEL),
                "config": {
                    k: v
                    for k, v in (c.config or {}).items()
                    if isinstance(k, str) and len(k) <= 64
                },
                "instructions": _clean_str(
                    c.config.get("instructions", "") if c.config else "",
                    MAX_INSTRUCTIONS,
                ),
            }
        )

    edges = [
        {
            "source": e.source[:64],
            "target": e.target[:64],
            "type": e.type,
            "bidirectional": e.bidirectional,
        }
        for e in graph.edges
    ]

    security_groups = [
        {
            "name": _clean_str(sg.name, MAX_LABEL),
            "inbound": sg.inbound,
            "outbound": sg.outbound,
        }
        for sg in graph.security_groups
    ]

    return {
        "name": _clean_str(graph.name or "GCP Architecture", MAX_LABEL),
        "provider": "gcp",
        "region": graph.region or "us-central1",
        "components": components,
        "edges": edges,
        "security_groups": security_groups,
    }
