"""On-premises validation rules — config, topology, and firewall."""

from __future__ import annotations

from archon_cli.onprem_helpers import (
    COMPUTE_TYPES,
    DB_TYPES,
    PUBLIC_EDGE_TYPES,
    SECURITY_STACK_TYPES,
    STATEFUL_TYPES,
    WAF_TYPES,
    cfg,
    has_hybrid_edge,
    has_neighbor_type,
    int_cfg,
    is_truthy,
    neighbor_ids,
    node_types,
    reachable_types,
)
from archon_cli.validate import Finding, IAMRole, Node, SecurityGroup, SGRule


def _finding(
    rule_id: str,
    node: Node,
    *,
    level: str,
    title: str,
    message: str,
    fix: str,
    suggestion: str = "",
    standards: list[str] | None = None,
    sg_id: str | None = None,
) -> Finding:
    return Finding(
        id=f"{rule_id}::{node.id}",
        rule_id=rule_id,
        node_id=node.id,
        node_label=node.label,
        node_type=node.type,
        level=level,
        title=title,
        message=message,
        fix=fix,
        suggestion=suggestion,
        standards=standards or [],
        sg_id=sg_id,
    )


def _sg_finding(
    rule_id: str,
    sg: SecurityGroup,
    *,
    level: str,
    title: str,
    message: str,
    fix: str,
    suggestion: str = "",
    standards: list[str] | None = None,
) -> Finding:
    return Finding(
        id=f"{rule_id}::{sg.id}",
        rule_id=rule_id,
        node_id=sg.id,
        node_label=sg.name,
        node_type="onprem_firewall",
        level=level,
        title=title,
        message=message,
        fix=fix,
        suggestion=suggestion,
        standards=standards or [],
        sg_id=sg.id,
    )


# ─── Config rules (~12) ───────────────────────────────────────────────────────


def onprem_config_findings(nodes: list[Node]) -> list[Finding]:
    findings: list[Finding] = []
    for n in nodes:
        t = n.type
        c = n.config or {}

        if t == "onprem_firewall" and not is_truthy(cfg(c, "ha_mode")):
            findings.append(_finding(
                "onprem_firewall_ha_disabled", n, level="warning",
                title="Firewall: HA mode disabled",
                message=f"{n.label} runs as a single firewall without high availability.",
                fix="Enable active/passive or active/active HA for perimeter firewalls.",
                standards=["NIST", "SOC2"],
            ))

        if t == "onprem_load_balancer" and not is_truthy(cfg(c, "ha_mode", True)):
            findings.append(_finding(
                "onprem_lb_ha_disabled", n, level="warning",
                title="Load balancer: HA mode disabled",
                message=f"{n.label} has no load balancer redundancy configured.",
                fix="Enable HA mode (Keepalived/VRRP or clustered LB pair).",
                standards=["NIST", "SOC2"],
            ))

        if t == "onprem_vpn" and not is_truthy(cfg(c, "ha_mode")):
            findings.append(_finding(
                "onprem_vpn_ha_disabled", n, level="warning",
                title="VPN gateway: HA mode disabled",
                message=f"{n.label} is a single VPN endpoint without failover.",
                fix="Deploy redundant VPN concentrators for hybrid connectivity.",
                standards=["NIST", "SOC2"],
            ))

        if t == "onprem_dns" and not is_truthy(cfg(c, "ha_mode", True)):
            findings.append(_finding(
                "onprem_dns_ha_disabled", n, level="warning",
                title="DNS: HA mode disabled",
                message=f"{n.label} runs DNS without a secondary resolver.",
                fix="Enable HA DNS (secondary BIND/Unbound or Windows DNS replica).",
                standards=["NIST"],
            ))

        if t == "onprem_k8s" and int_cfg(c, "control_plane_nodes", 3) < 2:
            findings.append(_finding(
                "onprem_k8s_single_control_plane", n, level="critical",
                title="Kubernetes: single control plane node",
                message=f"{n.label} has fewer than two control plane nodes.",
                fix="Run at least three control plane nodes for etcd quorum.",
                suggestion="Set control_plane_nodes >= 3 for production clusters.",
                standards=["CIS", "NIST", "SOC2"],
            ))

        if t == "onprem_postgres" and cfg(c, "ha_mode", "streaming_replication") == "standalone":
            findings.append(_finding(
                "onprem_postgres_standalone_ha", n, level="warning",
                title="PostgreSQL: standalone HA mode",
                message=f"{n.label} runs PostgreSQL without replication or Patroni.",
                fix="Use streaming_replication or patroni for database HA.",
                standards=["NIST", "SOC2"],
            ))

        if t == "onprem_mysql" and cfg(c, "ha_mode", "replication") == "standalone":
            findings.append(_finding(
                "onprem_mysql_standalone_ha", n, level="warning",
                title="MySQL: standalone HA mode",
                message=f"{n.label} runs MySQL without replication or Galera.",
                fix="Enable replication or galera_cluster for HA.",
                standards=["NIST", "SOC2"],
            ))

        if t == "onprem_mssql" and cfg(c, "ha_mode", "standalone") == "standalone":
            findings.append(_finding(
                "onprem_mssql_standalone_ha", n, level="warning",
                title="SQL Server: standalone HA mode",
                message=f"{n.label} uses standalone SQL Server without AlwaysOn or FCI.",
                fix="Configure AlwaysOn AG or a failover cluster instance.",
                standards=["NIST", "SOC2"],
            ))

        if t == "onprem_backup_server" and int_cfg(c, "retention_days", 30) < 7:
            findings.append(_finding(
                "onprem_backup_short_retention", n, level="warning",
                title="Backup: retention under 7 days",
                message=f"{n.label} retains backups for fewer than seven days.",
                fix="Increase retention_days to meet recovery objectives.",
                standards=["NIST", "SOC2"],
            ))

        if t == "onprem_object_store" and int_cfg(c, "replication", 3) < 3:
            findings.append(_finding(
                "onprem_object_store_low_replication", n, level="warning",
                title="Object store: replication factor below 3",
                message=f"{n.label} uses a replication factor below three.",
                fix="Set replication >= 3 for erasure coding and node failure tolerance.",
                standards=["NIST"],
            ))

        if t == "onprem_proxy" and not is_truthy(cfg(c, "tls_termination", True)):
            findings.append(_finding(
                "onprem_proxy_tls_off", n, level="warning",
                title="Proxy: TLS termination disabled",
                message=f"{n.label} does not terminate TLS at the proxy.",
                fix="Enable tls_termination for reverse proxy ingress.",
                standards=["CIS", "PCI", "NIST"],
            ))

        if t == "onprem_redis" and cfg(c, "mode", "sentinel") == "standalone":
            findings.append(_finding(
                "onprem_redis_standalone", n, level="warning",
                title="Redis: standalone mode",
                message=f"{n.label} runs Redis without sentinel or cluster HA.",
                fix="Use sentinel or cluster mode for Redis resilience.",
                standards=["NIST", "SOC2"],
            ))

    return findings


# ─── Topology rules (~12) ──────────────────────────────────────────────────────


def onprem_topology_findings(nodes: list[Node], edges) -> list[Finding]:
    findings: list[Finding] = []
    types = node_types(nodes)
    hybrid_without_vpn = has_hybrid_edge(nodes, edges) and "onprem_vpn" not in types
    switch_count = sum(1 for x in nodes if x.type == "onprem_switch")
    hybrid_reported = False

    for n in nodes:
        t = n.type

        if t in DB_TYPES and "onprem_vault" not in types:
            findings.append(_finding(
                "onprem_db_no_vault", n, level="warning",
                title="Database without secrets vault",
                message=f"{n.label} exists without a Vault/HSM for credential management.",
                fix="Add onprem_vault (HashiCorp Vault, HSM, or CyberArk).",
                standards=["CIS", "NIST", "SOC2"],
            ))

        if t in COMPUTE_TYPES:
            has_fw = "onprem_firewall" in types
            if not has_fw or (
                not has_neighbor_type(n.id, {"onprem_firewall"}, nodes, edges)
                and "onprem_firewall" not in reachable_types(n.id, edges, nodes)
            ):
                findings.append(_finding(
                    "onprem_compute_no_firewall", n, level="warning",
                    title="Compute without firewall path",
                    message=f"{n.label} has no firewall in the architecture or adjacency.",
                    fix="Place compute behind onprem_firewall with least-privilege rules.",
                    standards=["CIS", "NIST", "PCI"],
                ))

        if t in STATEFUL_TYPES and "onprem_backup_server" not in types:
            if not has_neighbor_type(n.id, {"onprem_backup_server", "onprem_tape_library"}, nodes, edges):
                findings.append(_finding(
                    "onprem_stateful_no_backup", n, level="warning",
                    title="Stateful resource without backup",
                    message=f"{n.label} has no backup server or tape library in the architecture.",
                    fix="Add onprem_backup_server with adequate retention.",
                    standards=["NIST", "SOC2"],
                ))

        if t in PUBLIC_EDGE_TYPES and not types & WAF_TYPES:
            findings.append(_finding(
                "onprem_public_edge_no_waf", n, level="warning",
                title="Public edge without WAF",
                message=f"{n.label} serves traffic without a WAF or inspecting firewall.",
                fix="Add onprem_waf or WAF-capable firewall in front of public ingress.",
                standards=["PCI", "SOC2", "CIS"],
            ))

        if t == "onprem_k8s" and "onprem_monitoring" not in types:
            if not has_neighbor_type(n.id, {"onprem_monitoring"}, nodes, edges):
                findings.append(_finding(
                    "onprem_k8s_no_monitoring", n, level="warning",
                    title="Kubernetes without monitoring",
                    message=f"{n.label} has no monitoring stack in the architecture.",
                    fix="Add onprem_monitoring (Prometheus/Grafana or equivalent).",
                    standards=["NIST", "SOC2"],
                ))

        if t in SECURITY_STACK_TYPES and "onprem_siem" not in types:
            findings.append(_finding(
                "onprem_security_stack_no_siem", n, level="info",
                title="Security stack without SIEM",
                message=f"{n.label} is present but no SIEM collects security telemetry.",
                fix="Add onprem_siem for centralized detection and audit.",
                standards=["NIST", "SOC2", "CIS"],
            ))

        if len(nodes) > 1 and not neighbor_ids(n.id, edges):
            findings.append(_finding(
                "onprem_orphaned_nodes", n, level="info",
                title="Resource not connected on canvas",
                message=f"{n.label} has no edges to other components.",
                fix="Connect nodes to document traffic flows and dependencies.",
                standards=["NIST"],
            ))

        if t == "onprem_switch" and switch_count == 1:
            findings.append(_finding(
                "onprem_single_switch_spof", n, level="warning",
                title="Single network switch (SPOF)",
                message=f"{n.label} is the only switch — a single point of failure.",
                fix="Add redundant core/distribution switches with LACP or stacking.",
                standards=["NIST", "SOC2"],
            ))

        if t in COMPUTE_TYPES and "onprem_network_zone" not in types:
            if not has_neighbor_type(n.id, {"onprem_network_zone", "onprem_vlan"}, nodes, edges):
                findings.append(_finding(
                    "onprem_compute_no_network_zone", n, level="info",
                    title="Compute without network zone",
                    message=f"{n.label} is not scoped to a network zone or VLAN.",
                    fix="Add onprem_network_zone or onprem_vlan for segmentation.",
                    standards=["NIST", "CIS"],
                ))

        if t == "onprem_load_balancer" and not has_neighbor_type(n.id, {"onprem_firewall"}, nodes, edges):
            findings.append(_finding(
                "onprem_lb_not_behind_firewall", n, level="warning",
                title="Load balancer not behind firewall",
                message=f"{n.label} is not adjacent to a perimeter firewall.",
                fix="Connect the load balancer behind onprem_firewall for ingress control.",
                standards=["CIS", "NIST", "PCI"],
            ))

        if t in DB_TYPES and not has_neighbor_type(n.id, {"onprem_backup_server"}, nodes, edges):
            if "onprem_backup_server" not in types:
                pass  # covered by onprem_stateful_no_backup
            else:
                findings.append(_finding(
                    "onprem_db_no_backup_path", n, level="info",
                    title="Database not connected to backup",
                    message=f"{n.label} has no canvas path to a backup server.",
                    fix="Draw an edge to onprem_backup_server documenting backup flow.",
                    standards=["NIST", "SOC2"],
                ))

        if hybrid_without_vpn and not hybrid_reported:
            findings.append(_finding(
                "hybrid_no_vpn", n, level="warning",
                title="Hybrid connectivity without VPN gateway",
                message="On-premises resources connect to cloud resources without an onprem_vpn node.",
                fix="Add onprem_vpn (WireGuard, IPsec, or site-to-site) for hybrid links.",
                standards=["NIST", "SOC2", "CIS"],
            ))
            hybrid_reported = True

    return findings


# ─── Firewall rules (~6) ────────────────────────────────────────────────────────

ONPREM_FW_PORT_RULES: tuple[tuple[str, int, str, str, str], ...] = (
    ("onprem_fw_ssh_open", 22, "critical", "SSH", "Restrict SSH to bastion or management VLAN CIDR only."),
    ("onprem_fw_rdp_open", 3389, "critical", "RDP", "Block RDP from the internet; use VPN or bastion."),
    ("onprem_fw_postgres_open", 5432, "critical", "PostgreSQL", "Scope PostgreSQL to application subnet CIDR only."),
    ("onprem_fw_mysql_open", 3306, "critical", "MySQL", "Scope MySQL to application subnet CIDR only."),
)


def _rule_matches_port(rule: SGRule, port: int) -> bool:
    if rule.protocol in ("all", "-1", "icmp"):
        return True
    text = str(rule.port)
    if text in ("-1", "*", "all"):
        return True
    if "-" in text:
        start, end = text.split("-", 1)
        try:
            return int(start) <= port <= int(end)
        except ValueError:
            return False
    try:
        return int(text) == port
    except ValueError:
        return False


def _is_public_source(source: str) -> bool:
    return source in ("0.0.0.0/0", "::/0", "all", "0.0.0.0", "*")


def _sg_allows_all_public(sg: SecurityGroup) -> bool:
    for rule in sg.inbound:
        if _is_public_source(rule.source) and rule.protocol in ("all", "-1", "tcp", "udp"):
            if str(rule.port) in ("-1", "*", "all", "0-65535"):
                return True
    return False


def onprem_firewall_findings(security_groups: list[SecurityGroup]) -> list[Finding]:
    findings: list[Finding] = []
    for sg in security_groups:
        if _sg_allows_all_public(sg):
            findings.append(_sg_finding(
                "onprem_fw_all_traffic_open", sg, level="critical",
                title="Firewall: all traffic allowed from internet",
                message=f'Firewall "{sg.name}" allows all inbound traffic from the internet.',
                fix="Replace catch-all allow rules with least-privilege port rules.",
                standards=["CIS", "NIST", "PCI", "SOC2"],
            ))
        for rule_id, port, level, label, fix in ONPREM_FW_PORT_RULES:
            for inbound in sg.inbound:
                if _rule_matches_port(inbound, port) and _is_public_source(inbound.source):
                    findings.append(_sg_finding(
                        rule_id, sg, level=level,
                        title=f"Firewall: {label} ({port}) open to internet",
                        message=f'Firewall "{sg.name}" allows {label} port {port} from the internet.',
                        fix=fix,
                        standards=["CIS", "NIST", "PCI"],
                    ))
                    break
        for inbound in sg.inbound:
            if inbound.protocol == "icmp" and _is_public_source(inbound.source):
                findings.append(_sg_finding(
                    "onprem_fw_icmp_open", sg, level="warning",
                    title="Firewall: ICMP open to internet",
                    message=f'Firewall "{sg.name}" allows ICMP from the internet.',
                    fix="Remove ICMP from public ingress unless required.",
                    standards=["CIS", "NIST"],
                ))
                break
    return findings


def run_onprem_validation(
    nodes: list[Node],
    edges,
    security_groups: list[SecurityGroup],
    iam_roles: list[IAMRole],
) -> list[Finding]:
    del iam_roles  # on-prem rules do not inspect IAM yet
    findings: list[Finding] = []
    findings.extend(onprem_config_findings(nodes))
    findings.extend(onprem_topology_findings(nodes, edges))
    findings.extend(onprem_firewall_findings(security_groups))
    return findings


def onprem_rule_ids() -> set[str]:
    """Return all on-premises rule IDs for parity tests."""
    import re
    from pathlib import Path

    text = Path(__file__).with_name("onprem_validate.py").read_text(encoding="utf-8")
    ids = set(re.findall(r'_finding\(\s*"(onprem_[^"]+)"', text))
    ids |= set(re.findall(r'_finding\(\s*"(hybrid_[^"]+)"', text))
    ids |= set(re.findall(r'_sg_finding\(\s*"(onprem_[^"]+)"', text))
    ids |= set(re.findall(r'\("(onprem_fw_[^"]+)"', text))
    return ids
