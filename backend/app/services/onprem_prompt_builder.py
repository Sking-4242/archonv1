"""
Builds system + user prompts for on-premises infrastructure generation.
Outputs Ansible playbooks, Docker Compose files, or descriptive HCL stubs
depending on what makes sense for the component set.
"""

from __future__ import annotations

import json

from app.models.graph import Graph

_SYSTEM = (
    "You are an expert on-premises infrastructure engineer. "
    "You generate valid infrastructure-as-code for on-premises environments "
    "from architecture diagrams described as JSON. "
    "Follow these rules strictly:\n"
    "1. For VM/bare-metal heavy architectures output Ansible playbooks.\n"
    "2. For container/Kubernetes architectures output Kubernetes YAML manifests.\n"
    "3. For mixed environments output a structured Ansible inventory + playbook.\n"
    "4. Output ONLY the infrastructure-as-code. No prose or markdown fences.\n"
    "5. Use variables/templates for environment-specific values (hostnames, IPs, passwords).\n"
    "6. Include firewall/NSG rules based on the security_groups array.\n"
    "7. Edge types: network=direct connectivity, data_flow=data transfer, "
    "dependency=service dependency, streaming=message stream, "
    "batch=cron/batch job, event=event trigger.\n"
    "8. If instructions are provided on a component, honour them.\n"
    "9. Produce idempotent, production-quality code.\n"
)


def build_onprem_prompt(graph: Graph) -> tuple[str, str]:
    safe = _sanitize(graph)
    user = (
        f"Generate infrastructure-as-code for the following on-premises architecture:\n\n"
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
        "name": _clean_str(graph.name or "On-Prem Architecture", MAX_LABEL),
        "provider": "onprem",
        "region": graph.region or "datacenter-1",
        "components": components,
        "edges": edges,
        "security_groups": security_groups,
    }
