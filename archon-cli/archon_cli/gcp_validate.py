"""GCP validation rules — config, topology, firewall, and IAM."""

from __future__ import annotations

from archon_cli.gcp_helpers import (
    cfg,
    cfg_nested,
    has_neighbor_type,
    has_public_ip,
    is_truthy,
    metadata_flag,
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
        node_type="gcp_firewall",
        level=level,
        title=title,
        message=message,
        fix=fix,
        suggestion=suggestion,
        standards=standards or [],
        sg_id=sg.id,
    )


def _iam_finding(rule_id: str, role: IAMRole, **kwargs) -> Finding:
    return Finding(
        id=f"{rule_id}::{role.id}",
        rule_id=rule_id,
        node_id=role.id,
        node_label=role.name,
        node_type="gcp_iam",
        standards=kwargs.pop("standards", []) or [],
        **kwargs,
    )


# ─── Config rules (~92) ───────────────────────────────────────────────────────


def gcp_config_findings(nodes: list[Node]) -> list[Finding]:
    findings: list[Finding] = []
    for n in nodes:
        t = n.type
        c = n.config or {}

        if t == "gcp_vpc" and is_truthy(cfg(c, "auto_create_subnetworks")):
            findings.append(_finding(
                "gcp_vpc_auto_subnets", n, level="warning",
                title="VPC: auto-created subnets enabled",
                message=f"{n.label} uses auto-created subnets, reducing network segmentation control.",
                fix="Disable auto_create_subnetworks and define explicit subnetworks.",
                suggestion="Set `auto_create_subnetworks = false` on `google_compute_network`.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_subnet" and cfg(c, "private_ip_google_access") is False:
            findings.append(_finding(
                "gcp_subnet_no_private_google_access", n, level="warning",
                title="Subnet: Private Google Access disabled",
                message=f"{n.label} cannot reach Google APIs without public IPs.",
                fix="Enable Private Google Access on the subnetwork.",
                suggestion="Set `private_ip_google_access = true` on `google_compute_subnetwork`.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_gce":
            if not is_truthy(cfg(c, "shielded_vm_enabled")) and not is_truthy(
                cfg_nested(c, "shielded_instance_config", "enable_integrity_monitoring")
            ):
                findings.append(_finding(
                    "gcp_gce_no_shielded_vm", n, level="warning",
                    title="GCE: Shielded VM not enabled",
                    message=f"{n.label} does not use Shielded VM features.",
                    fix="Enable Shielded VM integrity monitoring and secure boot.",
                    suggestion="Add `shielded_instance_config { enable_integrity_monitoring = true enable_secure_boot = true }`.",
                    standards=["CIS", "NIST"],
                ))
            if metadata_flag(c, "serial-port-enable"):
                findings.append(_finding(
                    "gcp_gce_serial_port_enabled", n, level="critical",
                    title="GCE: serial port enabled",
                    message=f"{n.label} exposes the serial port, increasing attack surface.",
                    fix="Disable serial port access in instance metadata.",
                    suggestion='Set metadata `serial-port-enable = "FALSE"`.',
                    standards=["CIS", "NIST", "PCI"],
                ))
            if not metadata_flag(c, "enable-oslogin") and not is_truthy(cfg(c, "os_login_enabled")):
                findings.append(_finding(
                    "gcp_gce_os_login_disabled", n, level="warning",
                    title="GCE: OS Login not enabled",
                    message=f"{n.label} does not enforce OS Login for SSH access.",
                    fix="Enable OS Login on the instance or project.",
                    suggestion='Set metadata `enable-oslogin = "TRUE"` or `enable_oslogin = true`.',
                    standards=["CIS", "NIST"],
                ))
            if has_public_ip(c):
                findings.append(_finding(
                    "gcp_gce_public_ip", n, level="warning",
                    title="GCE: instance has a public IP",
                    message=f"{n.label} is directly reachable from the internet.",
                    fix="Remove external access config or place the VM behind a load balancer.",
                    suggestion="Remove `access_config` from `network_interface` and use IAP or a bastion.",
                    standards=["CIS", "NIST", "PCI"],
                ))
            if str(cfg(c, "machine_type", "")).startswith("f1-") or str(cfg(c, "machine_type", "")).startswith("g1-"):
                findings.append(_finding(
                    "gcp_gce_legacy_machine_type", n, level="info",
                    title="GCE: legacy machine type",
                    message=f"{n.label} uses a deprecated shared-core machine family.",
                    fix="Migrate to E2 or N2 machine types.",
                    suggestion="Use `e2-medium`, `n2-standard-2`, or newer machine types.",
                    standards=["NIST"],
                ))
            if cfg(c, "boot_disk_type") == "pd-standard" or cfg_nested(c, "boot_disk", "initialize_params", "type") == "pd-standard":
                findings.append(_finding(
                    "gcp_gce_pd_standard_boot", n, level="info",
                    title="GCE: pd-standard boot disk",
                    message=f"{n.label} uses standard persistent disks with lower performance.",
                    fix="Use pd-balanced or pd-ssd for production boot disks.",
                    suggestion="Set boot disk type to `pd-balanced` or `pd-ssd`.",
                    standards=["NIST"],
                ))

        if t == "gcp_gke":
            if not is_truthy(cfg(c, "private_cluster")) and not is_truthy(cfg_nested(c, "private_cluster_config", "enable_private_nodes")):
                findings.append(_finding(
                    "gcp_gke_no_private_cluster", n, level="warning",
                    title="GKE: private cluster not enabled",
                    message=f"{n.label} nodes or control plane may be publicly reachable.",
                    fix="Enable private cluster configuration.",
                    suggestion="Set `private_cluster_config { enable_private_nodes = true enable_private_endpoint = true }`.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if not cfg(c, "master_authorized_networks") and not cfg_nested(c, "master_authorized_networks_config", "cidr_blocks"):
                findings.append(_finding(
                    "gcp_gke_no_master_authorized_networks", n, level="warning",
                    title="GKE: no master authorized networks",
                    message=f"{n.label} control plane accepts connections from any IP.",
                    fix="Configure master authorized networks.",
                    suggestion="Add `master_authorized_networks_config { cidr_blocks { cidr_block = \"10.0.0.0/8\" } }`.",
                    standards=["CIS", "NIST"],
                ))
            if not is_truthy(cfg(c, "workload_identity_enabled")) and not cfg(c, "workload_pool"):
                findings.append(_finding(
                    "gcp_gke_no_workload_identity", n, level="warning",
                    title="GKE: Workload Identity not enabled",
                    message=f"{n.label} pods may use overly broad node service account permissions.",
                    fix="Enable Workload Identity on the cluster.",
                    suggestion="Set `workload_identity_config { workload_pool = \"PROJECT.svc.id.goog\" }`.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if not cfg(c, "network_policy") and not cfg_nested(c, "network_policy_config", "enabled"):
                findings.append(_finding(
                    "gcp_gke_no_network_policy", n, level="warning",
                    title="GKE: network policy disabled",
                    message=f"{n.label} allows unrestricted pod-to-pod traffic.",
                    fix="Enable Calico or Dataplane V2 network policy.",
                    suggestion="Set `network_policy { enabled = true provider = \"CALICO\" }`.",
                    standards=["NIST", "SOC2"],
                ))
            if is_truthy(cfg(c, "binary_authorization_enabled")) is False:
                findings.append(_finding(
                    "gcp_gke_binary_authorization_disabled", n, level="warning",
                    title="GKE: Binary Authorization disabled",
                    message=f"{n.label} can deploy unverified container images.",
                    fix="Enable Binary Authorization.",
                    suggestion="Configure `google_binary_authorization_policy` and enable on the cluster.",
                    standards=["CIS", "NIST"],
                ))
            if cfg(c, "release_channel") in (None, "", "UNSPECIFIED"):
                findings.append(_finding(
                    "gcp_gke_no_release_channel", n, level="info",
                    title="GKE: no release channel configured",
                    message=f"{n.label} is not on a managed release channel.",
                    fix="Set a release channel (REGULAR or STABLE).",
                    suggestion="Add `release_channel { channel = \"REGULAR\" }`.",
                    standards=["NIST"],
                ))

        if t == "gcp_cloudsql":
            settings = cfg(c, "settings")
            if isinstance(settings, list) and settings:
                settings = settings[0]
            ip_conf = (settings or {}).get("ip_configuration") if isinstance(settings, dict) else cfg(c, "ip_configuration")
            if isinstance(ip_conf, list) and ip_conf:
                ip_conf = ip_conf[0]
            ipv4_enabled = cfg(c, "ipv4_enabled")
            if ipv4_enabled is None and isinstance(ip_conf, dict):
                ipv4_enabled = ip_conf.get("ipv4_enabled")
            if is_truthy(ipv4_enabled):
                findings.append(_finding(
                    "gcp_cloudsql_public_ip", n, level="critical",
                    title="Cloud SQL: public IPv4 enabled",
                    message=f"{n.label} is reachable from the public internet.",
                    fix="Disable public IPv4 and use private IP with VPC peering.",
                    suggestion="Set `ip_configuration { ipv4_enabled = false private_network = google_compute_network.main.id }`.",
                    standards=["CIS", "PCI", "HIPAA", "NIST"],
                ))
            ssl_mode = cfg(c, "ssl_mode") or cfg_nested(c, "settings", "ip_configuration", "ssl_mode")
            if ssl_mode in (None, "", "ALLOW_UNENCRYPTED_AND_ENCRYPTED"):
                findings.append(_finding(
                    "gcp_cloudsql_weak_ssl", n, level="warning",
                    title="Cloud SQL: weak SSL mode",
                    message=f"{n.label} allows unencrypted database connections.",
                    fix="Require SSL/TLS for all Cloud SQL connections.",
                    suggestion="Set `ssl_mode = \"ENCRYPTED_ONLY\"` or `require_ssl = true`.",
                    standards=["CIS", "PCI", "HIPAA"],
                ))
            if not is_truthy(cfg(c, "backup_enabled")) and not cfg(c, "backup_configuration"):
                findings.append(_finding(
                    "gcp_cloudsql_no_backup", n, level="warning",
                    title="Cloud SQL: automated backups disabled",
                    message=f"{n.label} has no automated backup configuration.",
                    fix="Enable automated backups with point-in-time recovery.",
                    suggestion="Add `backup_configuration { enabled = true point_in_time_recovery_enabled = true }`.",
                    standards=["CIS", "SOC2", "NIST"],
                ))
            if cfg(c, "availability_type", "ZONAL") == "ZONAL":
                findings.append(_finding(
                    "gcp_cloudsql_zonal_only", n, level="warning",
                    title="Cloud SQL: single-zone availability",
                    message=f"{n.label} is not configured for regional high availability.",
                    fix="Set availability type to REGIONAL for production databases.",
                    suggestion="Set `availability_type = \"REGIONAL\"` on `google_sql_database_instance`.",
                    standards=["NIST", "SOC2"],
                ))
            if not is_truthy(cfg(c, "deletion_protection")):
                findings.append(_finding(
                    "gcp_cloudsql_no_deletion_protection", n, level="warning",
                    title="Cloud SQL: deletion protection disabled",
                    message=f"{n.label} can be accidentally deleted.",
                    fix="Enable deletion protection.",
                    suggestion="Set `deletion_protection = true`.",
                    standards=["NIST", "SOC2"],
                ))

        if t == "gcp_gcs":
            if not is_truthy(cfg(c, "uniform_bucket_level_access")):
                findings.append(_finding(
                    "gcp_gcs_no_uniform_access", n, level="warning",
                    title="GCS: uniform bucket-level access disabled",
                    message=f"{n.label} uses legacy ACLs that are harder to audit.",
                    fix="Enable uniform bucket-level access.",
                    suggestion="Set `uniform_bucket_level_access = true` on `google_storage_bucket`.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if cfg(c, "public_access_prevention") != "enforced":
                findings.append(_finding(
                    "gcp_gcs_no_public_access_prevention", n, level="critical",
                    title="GCS: public access prevention not enforced",
                    message=f"{n.label} may allow public object or bucket access.",
                    fix="Enforce public access prevention.",
                    suggestion="Set `public_access_prevention = \"enforced\"`.",
                    standards=["CIS", "NIST", "PCI", "SOC2"],
                ))
            if not is_truthy(cfg(c, "versioning_enabled")) and not cfg(c, "versioning"):
                findings.append(_finding(
                    "gcp_gcs_no_versioning", n, level="info",
                    title="GCS: object versioning disabled",
                    message=f"{n.label} cannot recover from accidental overwrites.",
                    fix="Enable object versioning.",
                    suggestion="Add `versioning { enabled = true }` to the bucket.",
                    standards=["NIST", "SOC2"],
                ))
            if not cfg(c, "encryption") and not cfg_nested(c, "encryption", "default_kms_key_name"):
                findings.append(_finding(
                    "gcp_gcs_no_cmek", n, level="info",
                    title="GCS: no customer-managed encryption key",
                    message=f"{n.label} uses Google-managed encryption only.",
                    fix="Configure CMEK for sensitive data buckets.",
                    suggestion="Add `encryption { default_kms_key_name = google_kms_crypto_key.key.id }`.",
                    standards=["HIPAA", "PCI", "NIST"],
                ))

        if t == "gcp_cloud_run":
            if cfg(c, "ingress", "all") == "all":
                findings.append(_finding(
                    "gcp_cloud_run_ingress_all", n, level="warning",
                    title="Cloud Run: ingress open to all",
                    message=f"{n.label} accepts traffic from the entire internet.",
                    fix="Restrict ingress to internal and load balancer traffic.",
                    suggestion="Set `ingress = \"internal-and-cloud-load-balancing\"`.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "allow_unauthenticated")):
                findings.append(_finding(
                    "gcp_cloud_run_unauthenticated", n, level="warning",
                    title="Cloud Run: unauthenticated access allowed",
                    message=f"{n.label} allows unauthenticated invoke access.",
                    fix="Require authentication for service invocation.",
                    suggestion="Remove `allUsers` invoker binding; use IAM-authenticated callers.",
                    standards=["CIS", "NIST", "SOC2"],
                ))

        if t == "gcp_cloud_functions":
            if cfg(c, "ingress_settings", "ALLOW_ALL") == "ALLOW_ALL":
                findings.append(_finding(
                    "gcp_cloud_functions_ingress_all", n, level="warning",
                    title="Cloud Functions: ingress allow all",
                    message=f"{n.label} accepts traffic from any source.",
                    fix="Restrict ingress settings to internal traffic.",
                    suggestion="Set `ingress_settings = \"ALLOW_INTERNAL_ONLY\"`.",
                    standards=["CIS", "NIST"],
                ))
            if is_truthy(cfg(c, "allow_unauthenticated")):
                findings.append(_finding(
                    "gcp_cloud_functions_unauthenticated", n, level="warning",
                    title="Cloud Functions: unauthenticated access",
                    message=f"{n.label} allows unauthenticated HTTP triggers.",
                    fix="Require authentication on the function.",
                    suggestion="Remove public invoker IAM bindings.",
                    standards=["CIS", "NIST", "SOC2"],
                ))

        if t == "gcp_memorystore":
            if cfg(c, "tier", "STANDARD_HA") == "BASIC":
                findings.append(_finding(
                    "gcp_memorystore_basic_tier", n, level="warning",
                    title="Memorystore: BASIC tier in use",
                    message=f"{n.label} lacks automatic failover.",
                    fix="Use STANDARD_HA tier for production Redis.",
                    suggestion="Set `tier = \"STANDARD_HA\"` on `google_redis_instance`.",
                    standards=["NIST", "SOC2"],
                ))
            if cfg(c, "auth_enabled") is False:
                findings.append(_finding(
                    "gcp_memorystore_auth_disabled", n, level="warning",
                    title="Memorystore: AUTH disabled",
                    message=f"{n.label} does not require Redis AUTH.",
                    fix="Enable Redis AUTH.",
                    suggestion="Set `auth_enabled = true` on `google_redis_instance`.",
                    standards=["CIS", "PCI", "NIST"],
                ))

        if t == "gcp_kms" and cfg(c, "protection_level", "SOFTWARE") == "SOFTWARE" and cfg(c, "rotation_period") in (None, "", "0s"):
            findings.append(_finding(
                "gcp_kms_no_rotation", n, level="warning",
                title="Cloud KMS: key rotation not configured",
                message=f"{n.label} does not rotate automatically.",
                fix="Configure a rotation period on the crypto key.",
                suggestion="Set `rotation_period = \"7776000s\"` (90 days) on `google_kms_crypto_key`.",
                standards=["CIS", "PCI", "HIPAA", "NIST"],
            ))

        if t == "gcp_secret_manager" and cfg(c, "replication_type") == "user_managed":
            findings.append(_finding(
                "gcp_secret_manager_user_managed_replication", n, level="info",
                title="Secret Manager: user-managed replication",
                message=f"{n.label} uses user-managed replication — verify multi-region coverage.",
                fix="Use automatic replication or multiple user-managed replicas.",
                suggestion="Prefer `replication { automatic = true }` unless data residency requires otherwise.",
                standards=["NIST"],
            ))

        if t == "gcp_bigquery" and not cfg(c, "default_encryption_configuration"):
            findings.append(_finding(
                "gcp_bigquery_no_cmek", n, level="info",
                title="BigQuery: no default CMEK configured",
                message=f"{n.label} uses Google-managed encryption only.",
                fix="Configure default encryption with Cloud KMS.",
                suggestion="Add `default_encryption_configuration { kms_key_name = ... }`.",
                standards=["HIPAA", "PCI", "NIST"],
            ))

        if t == "gcp_spanner" and str(cfg(c, "config", "")).startswith("regional-"):
            findings.append(_finding(
                "gcp_spanner_regional_only", n, level="info",
                title="Cloud Spanner: regional instance config",
                message=f"{n.label} is not multi-region — plan for DR requirements.",
                fix="Use dual-region or multi-region configs for critical workloads.",
                suggestion="Choose `nam-eur-asia` multi-region configs when RPO/RTO requires it.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_artifact_registry" and not is_truthy(cfg(c, "vulnerability_scanning_enabled")):
            findings.append(_finding(
                "gcp_artifact_registry_no_scanning", n, level="warning",
                title="Artifact Registry: vulnerability scanning disabled",
                message=f"{n.label} does not scan images for CVEs.",
                fix="Enable vulnerability scanning on the repository.",
                suggestion="Use Artifact Analysis / enable scanning in `google_artifact_registry_repository`.",
                standards=["CIS", "NIST", "SOC2"],
            ))

        if t == "gcp_lb" and cfg(c, "load_balancing_scheme", "EXTERNAL") == "EXTERNAL" and not is_truthy(cfg(c, "cloud_armor_enabled")):
            findings.append(_finding(
                "gcp_lb_external_no_armor", n, level="warning",
                title="External load balancer without Cloud Armor",
                message=f"{n.label} exposes web traffic without WAF protection.",
                fix="Attach a Cloud Armor security policy.",
                suggestion="Set `security_policy = google_compute_security_policy.policy.id` on backend service.",
                standards=["CIS", "PCI", "SOC2"],
            ))

        if t == "gcp_persistent_disk" and cfg(c, "type", "pd-balanced") == "pd-standard":
            findings.append(_finding(
                "gcp_disk_pd_standard", n, level="info",
                title="Persistent Disk: pd-standard type",
                message=f"{n.label} uses standard PD with lower IOPS.",
                fix="Use pd-balanced or pd-ssd for production disks.",
                standards=["NIST"],
            ))

        if t == "gcp_filestore" and cfg(c, "tier", "BASIC_HDD") == "BASIC_HDD":
            findings.append(_finding(
                "gcp_filestore_basic_tier", n, level="info",
                title="Filestore: BASIC_HDD tier",
                message=f"{n.label} lacks enterprise HA features.",
                fix="Use ENTERPRISE tier for production file shares.",
                standards=["NIST"],
            ))

        if t == "gcp_alloydb" and cfg(c, "cluster_type", "PRIMARY") == "PRIMARY" and not is_truthy(cfg(c, "automated_backup_enabled")):
            findings.append(_finding(
                "gcp_alloydb_no_backup", n, level="warning",
                title="AlloyDB: automated backup not enabled",
                message=f"{n.label} has no continuous backup configuration.",
                fix="Enable automated backup policy.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_bigtable" and int(cfg(c, "num_nodes", 1) or 1) < 2:
            findings.append(_finding(
                "gcp_bigtable_single_node", n, level="info",
                title="Bigtable: single-node cluster",
                message=f"{n.label} has no intra-cluster redundancy.",
                fix="Use at least 2 nodes for production.",
                standards=["NIST"],
            ))

        if t == "gcp_app_engine" and is_truthy(cfg(c, "default_service_account")):
            findings.append(_finding(
                "gcp_app_engine_default_sa", n, level="warning",
                title="App Engine: default service account",
                message=f"{n.label} uses the default App Engine service account.",
                fix="Use a dedicated least-privilege service account.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_pubsub" and not cfg(c, "kms_key_name"):
            findings.append(_finding(
                "gcp_pubsub_no_cmek", n, level="info",
                title="Pub/Sub: no CMEK configured",
                message=f"{n.label} uses Google-managed encryption only.",
                fix="Configure a customer-managed encryption key.",
                standards=["HIPAA", "PCI", "NIST"],
            ))

        if t == "gcp_apigee" and cfg(c, "billing_type") == "EVALUATION":
            findings.append(_finding(
                "gcp_apigee_evaluation", n, level="info",
                title="Apigee: evaluation billing type",
                message=f"{n.label} uses evaluation tier — not for production.",
                fix="Move to PAYG or subscription billing for production.",
                standards=["NIST"],
            ))

        if t == "gcp_cloud_composer" and cfg(c, "environment_size") == "ENVIRONMENT_SIZE_SMALL":
            findings.append(_finding(
                "gcp_composer_small_env", n, level="info",
                title="Cloud Composer: small environment size",
                message=f"{n.label} may lack capacity for production Airflow workloads.",
                fix="Size Composer for expected DAG load.",
                standards=["NIST"],
            ))

        if t == "gcp_dataproc" and cfg(c, "cluster_type") == "SINGLE_NODE":
            findings.append(_finding(
                "gcp_dataproc_single_node", n, level="warning",
                title="Dataproc: single-node cluster",
                message=f"{n.label} has no worker redundancy.",
                fix="Use STANDARD or HIGH_AVAILABILITY cluster types.",
                standards=["NIST"],
            ))

        if t == "gcp_logging" and int(cfg(c, "retention_days", 30) or 0) < 30:
            findings.append(_finding(
                "gcp_logging_short_retention", n, level="info",
                title="Cloud Logging: retention below 30 days",
                message=f"{n.label} may not meet audit retention requirements.",
                fix="Increase log bucket retention to at least 30 days.",
                standards=["SOC2", "NIST", "PCI"],
            ))

        if t == "gcp_scc" and cfg(c, "tier") == "STANDARD":
            findings.append(_finding(
                "gcp_scc_standard_tier", n, level="info",
                title="Security Command Center: Standard tier",
                message=f"{n.label} lacks premium threat detection features.",
                fix="Evaluate Premium tier for advanced threat detection.",
                standards=["NIST"],
            ))

        if t == "gcp_backup" and int(cfg(c, "retention_days", 30) or 0) < 7:
            findings.append(_finding(
                "gcp_backup_short_retention", n, level="warning",
                title="Backup and DR: retention too short",
                message=f"{n.label} retains backups for less than 7 days.",
                fix="Increase backup retention for recovery requirements.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_cloud_batch" and cfg(c, "provisioning_model") == "SPOT":
            findings.append(_finding(
                "gcp_batch_spot", n, level="info",
                title="Cloud Batch: SPOT provisioning",
                message=f"{n.label} uses preemptible capacity — jobs may be interrupted.",
                fix="Use STANDARD provisioning for critical batch jobs.",
                standards=["NIST"],
            ))

        if t == "gcp_vpn" and cfg(c, "vpn_type") == "Classic VPN":
            findings.append(_finding(
                "gcp_vpn_classic", n, level="info",
                title="Cloud VPN: Classic VPN in use",
                message=f"{n.label} uses Classic VPN instead of HA VPN.",
                fix="Migrate to HA VPN for production hybrid connectivity.",
                standards=["NIST"],
            ))

        if t == "gcp_interconnect" and int(cfg(c, "requested_link_count", 1) or 1) < 2:
            findings.append(_finding(
                "gcp_interconnect_single_link", n, level="warning",
                title="Cloud Interconnect: single link",
                message=f"{n.label} has no link redundancy.",
                fix="Request at least two links for HA interconnect.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_dns" and cfg(c, "visibility") == "public" and str(cfg(c, "dns_name", "")).endswith(".internal."):
            findings.append(_finding(
                "gcp_dns_public_internal_name", n, level="warning",
                title="Cloud DNS: public zone with internal-style name",
                message=f"{n.label} may expose internal naming publicly.",
                fix="Use private visibility for internal DNS zones.",
                standards=["NIST"],
            ))

        if t == "gcp_vertex_ai" and is_truthy(cfg(c, "public_endpoint_enabled")):
            findings.append(_finding(
                "gcp_vertex_public_endpoint", n, level="warning",
                title="Vertex AI: public endpoint enabled",
                message=f"{n.label} exposes a public prediction endpoint.",
                fix="Use private endpoints or IAM-restricted access.",
                standards=["NIST", "HIPAA"],
            ))

        if t == "gcp_firestore" and not is_truthy(cfg(c, "delete_protection_state")) and not is_truthy(cfg(c, "deletion_protection")):
            findings.append(_finding(
                "gcp_firestore_no_delete_protection", n, level="info",
                title="Firestore: deletion protection disabled",
                message=f"{n.label} can be deleted without protection.",
                fix="Enable delete protection on the database.",
                standards=["NIST"],
            ))

        if t == "gcp_datastore" and not cfg(c, "location_id"):
            findings.append(_finding(
                "gcp_datastore_no_location", n, level="info",
                title="Datastore: location not specified",
                message=f"{n.label} may not meet data residency requirements.",
                fix="Set an explicit location for the Datastore instance.",
                standards=["NIST", "HIPAA"],
            ))

        if t == "gcp_mig" and int(cfg(c, "target_size", 1) or 1) < 2:
            findings.append(_finding(
                "gcp_mig_single_instance", n, level="warning",
                title="MIG: target size below 2",
                message=f"{n.label} is not horizontally redundant.",
                fix="Set target size to at least 2 for HA.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_nat" and cfg(c, "nat_ip_allocate_option") == "MANUAL_ONLY" and not cfg(c, "nat_ips"):
            findings.append(_finding(
                "gcp_nat_manual_no_ips", n, level="warning",
                title="Cloud NAT: manual IPs not configured",
                message=f"{n.label} uses MANUAL_ONLY without allocated NAT IPs.",
                fix="Allocate static NAT IPs or use AUTO_ONLY.",
                standards=["NIST"],
            ))

        if t == "gcp_private_sc" and not cfg(c, "target_service"):
            findings.append(_finding(
                "gcp_private_sc_no_target", n, level="info",
                title="Private Service Connect: no target service",
                message=f"{n.label} is missing a target service attachment.",
                fix="Configure the target service for PSC.",
                standards=["NIST"],
            ))

        if t == "gcp_network_endpoint_grp" and cfg(c, "neg_type") == "INTERNET_IP_PORT":
            findings.append(_finding(
                "gcp_neg_internet", n, level="warning",
                title="NEG: internet IP endpoint group",
                message=f"{n.label} exposes internet-routable endpoints directly.",
                fix="Prefer GCE_VM_IP_PORT or SERVERLESS NEG types.",
                standards=["NIST", "PCI"],
            ))

        if t == "gcp_cdn" and not is_truthy(cfg(c, "signed_url_cache_enabled")) and not is_truthy(cfg(c, "cache_mode")):
            findings.append(_finding(
                "gcp_cdn_no_cache_policy", n, level="info",
                title="Cloud CDN: cache policy not configured",
                message=f"{n.label} may serve stale or unauthenticated content.",
                fix="Configure cache mode and signed URL keys if needed.",
                standards=["NIST"],
            ))

        if t == "gcp_workflows" and not cfg(c, "region"):
            findings.append(_finding(
                "gcp_workflows_no_region", n, level="info",
                title="Workflows: region not set",
                message=f"{n.label} region is unspecified.",
                fix="Set an explicit region for the workflow.",
                standards=["NIST"],
            ))

        if t == "gcp_scheduler" and cfg(c, "schedule") == "* * * * *":
            findings.append(_finding(
                "gcp_scheduler_every_minute", n, level="info",
                title="Cloud Scheduler: runs every minute",
                message=f"{n.label} triggers every minute — verify this is intentional.",
                fix="Use a less aggressive schedule unless required.",
                standards=["NIST"],
            ))

        if t == "gcp_tasks" and int(cfg(c, "max_dispatches_per_second", 500) or 0) > 500:
            findings.append(_finding(
                "gcp_tasks_high_dispatch_rate", n, level="info",
                title="Cloud Tasks: high dispatch rate",
                message=f"{n.label} allows very high dispatch throughput.",
                fix="Tune dispatch limits to protect downstream services.",
                standards=["NIST"],
            ))

        if t == "gcp_dataflow" and int(cfg(c, "max_workers", 10) or 0) > 100:
            findings.append(_finding(
                "gcp_dataflow_high_max_workers", n, level="info",
                title="Dataflow: high max worker count",
                message=f"{n.label} can scale to a large worker fleet — review cost controls.",
                fix="Set autoscaling caps appropriate for workload.",
                standards=["NIST"],
            ))

        if t == "gcp_automl" and int(cfg(c, "budget_milli_node_hours", 1000) or 0) > 10000:
            findings.append(_finding(
                "gcp_automl_high_budget", n, level="info",
                title="AutoML: high training budget",
                message=f"{n.label} has a large AutoML training budget.",
                fix="Set budget limits to control training spend.",
                standards=["NIST"],
            ))

        if t == "gcp_certificate_manager" and cfg(c, "scope") == "EDGE_CACHE":
            findings.append(_finding(
                "gcp_cert_manager_edge_scope", n, level="info",
                title="Certificate Manager: edge cache scope",
                message=f"{n.label} uses EDGE_CACHE scope — verify CDN attachment.",
                fix="Ensure certificates are attached to the correct load balancer/CDN.",
                standards=["NIST"],
            ))

        if t == "gcp_looker" and cfg(c, "platform_edition") == "LOOKER_CORE_TRIAL":
            findings.append(_finding(
                "gcp_looker_trial", n, level="info",
                title="Looker: trial edition",
                message=f"{n.label} uses trial edition — not for production.",
                fix="Upgrade to Standard or Enterprise edition.",
                standards=["NIST"],
            ))

        if t == "gcp_analytics_hub" and not cfg(c, "description"):
            findings.append(_finding(
                "gcp_analytics_hub_no_description", n, level="info",
                title="Analytics Hub: missing description",
                message=f"{n.label} listing has no description for data consumers.",
                fix="Add a description documenting shared datasets.",
                standards=["NIST"],
            ))

        if t == "gcp_data_catalog" and not cfg(c, "region"):
            findings.append(_finding(
                "gcp_data_catalog_no_region", n, level="info",
                title="Data Catalog: region not set",
                message=f"{n.label} region is unspecified.",
                fix="Set region for catalog resources.",
                standards=["NIST"],
            ))

        if t == "gcp_cloud_deploy" and not cfg(c, "location"):
            findings.append(_finding(
                "gcp_cloud_deploy_no_location", n, level="info",
                title="Cloud Deploy: location not set",
                message=f"{n.label} delivery pipeline location is unspecified.",
                fix="Set a delivery pipeline region.",
                standards=["NIST"],
            ))

        if t == "gcp_cloud_build" and cfg(c, "machine_type") == "UNSPECIFIED":
            findings.append(_finding(
                "gcp_cloud_build_default_machine", n, level="info",
                title="Cloud Build: default machine type",
                message=f"{n.label} uses unspecified machine type — may be slow or costly.",
                fix="Set an explicit machine type for builds.",
                standards=["NIST"],
            ))

        if t == "gcp_source_repo" and not cfg(c, "name"):
            findings.append(_finding(
                "gcp_source_repo_no_name", n, level="info",
                title="Source Repository: name not set",
                message=f"{n.label} repository name is missing.",
                fix="Set a repository name.",
                standards=["NIST"],
            ))

        if t == "gcp_monitoring" and int(cfg(c, "retention_days", 42) or 0) < 14:
            findings.append(_finding(
                "gcp_monitoring_short_retention", n, level="info",
                title="Cloud Monitoring: short metric retention",
                message=f"{n.label} retains custom metrics for less than 14 days.",
                fix="Increase retention for operational history.",
                standards=["NIST"],
            ))

        if t == "gcp_trace" and not is_truthy(cfg(c, "enabled")):
            findings.append(_finding(
                "gcp_trace_disabled", n, level="info",
                title="Cloud Trace: tracing not enabled",
                message=f"{n.label} distributed tracing is not configured.",
                fix="Enable Cloud Trace for microservices observability.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_error_reporting" and not is_truthy(cfg(c, "enabled")):
            findings.append(_finding(
                "gcp_error_reporting_disabled", n, level="info",
                title="Error Reporting: not enabled",
                message=f"{n.label} application errors may go unnoticed.",
                fix="Enable Error Reporting for application stacks.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_natural_lang" and cfg(c, "document_type") == "HTML":
            findings.append(_finding(
                "gcp_natural_lang_html", n, level="info",
                title="Natural Language: HTML document type",
                message=f"{n.label} analyzes HTML — sanitize input to avoid injection in downstream systems.",
                fix="Prefer PLAIN_TEXT for untrusted content.",
                standards=["NIST"],
            ))

        if t == "gcp_speech" and cfg(c, "model") == "phone_call":
            findings.append(_finding(
                "gcp_speech_phone_model", n, level="info",
                title="Speech-to-Text: phone_call model",
                message=f"{n.label} uses telephony-tuned model — verify accuracy for your audio source.",
                fix="Select the model matching your audio characteristics.",
                standards=["NIST"],
            ))

        if t == "gcp_translation" and cfg(c, "source_language_code") == "auto":
            findings.append(_finding(
                "gcp_translation_auto_detect", n, level="info",
                title="Translation: auto language detection",
                message=f"{n.label} auto-detects source language — may misclassify short strings.",
                fix="Set explicit source language when known.",
                standards=["NIST"],
            ))

        if t == "gcp_vision_ai" and cfg(c, "feature_type") == "FACE_DETECTION":
            findings.append(_finding(
                "gcp_vision_face_detection", n, level="info",
                title="Vision AI: face detection enabled",
                message=f"{n.label} processes biometric data — review privacy requirements.",
                fix="Ensure consent and data handling policies for biometric processing.",
                standards=["HIPAA", "NIST"],
            ))

        if t == "gcp_gce" and is_truthy(cfg(c, "preemptible")):
            findings.append(_finding(
                "gcp_gce_preemptible", n, level="info",
                title="GCE: preemptible instance",
                message=f"{n.label} uses preemptible VMs — not suitable for stateful production.",
                fix="Use standard instances for production workloads.",
                standards=["NIST"],
            ))

        if t == "gcp_gke" and is_truthy(cfg(c, "enable_legacy_abac")):
            findings.append(_finding(
                "gcp_gke_legacy_abac", n, level="warning",
                title="GKE: legacy ABAC enabled",
                message=f"{n.label} uses legacy ABAC instead of RBAC.",
                fix="Disable legacy ABAC and use RBAC.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_gke" and cfg(c, "maintenance_window") in (None, ""):
            findings.append(_finding(
                "gcp_gke_no_maintenance_window", n, level="info",
                title="GKE: no maintenance window",
                message=f"{n.label} has no configured maintenance window.",
                fix="Configure a recurring maintenance window.",
                standards=["NIST"],
            ))

        if t == "gcp_cloudsql" and not is_truthy(cfg(c, "point_in_time_recovery_enabled")):
            findings.append(_finding(
                "gcp_cloudsql_no_pitr", n, level="warning",
                title="Cloud SQL: point-in-time recovery disabled",
                message=f"{n.label} cannot restore to arbitrary timestamps.",
                fix="Enable point-in-time recovery in backup configuration.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_gcs" and not is_truthy(cfg(c, "log_bucket")):
            findings.append(_finding(
                "gcp_gcs_no_access_logging", n, level="info",
                title="GCS: access logging not configured",
                message=f"{n.label} has no access log sink.",
                fix="Configure bucket access logging.",
                standards=["CIS", "SOC2", "NIST"],
            ))

        if t == "gcp_cloud_run" and is_truthy(cfg(c, "cpu_throttling")) is False:
            findings.append(_finding(
                "gcp_cloud_run_cpu_always_allocated", n, level="info",
                title="Cloud Run: CPU always allocated",
                message=f"{n.label} keeps CPU allocated when idle — higher cost.",
                fix="Enable CPU throttling unless always-on processing is required.",
                standards=["NIST"],
            ))

        if t == "gcp_cloud_functions" and int(cfg(c, "min_instance_count", 0) or 0) == 0 and cfg(c, "trigger_type") == "http":
            findings.append(_finding(
                "gcp_functions_cold_start_http", n, level="info",
                title="Cloud Functions: HTTP with min instances 0",
                message=f"{n.label} may incur cold start latency.",
                fix="Set min_instance_count > 0 for latency-sensitive HTTP functions.",
                standards=["NIST"],
            ))

        if t == "gcp_spanner" and int(cfg(c, "processing_units", 100) or 0) < 100:
            findings.append(_finding(
                "gcp_spanner_low_capacity", n, level="info",
                title="Cloud Spanner: low processing units",
                message=f"{n.label} may be under-provisioned for production load.",
                fix="Increase processing units based on load testing.",
                standards=["NIST"],
            ))

        if t == "gcp_memorystore" and cfg(c, "transit_encryption_mode") == "DISABLED":
            findings.append(_finding(
                "gcp_memorystore_no_transit_encryption", n, level="warning",
                title="Memorystore: transit encryption disabled",
                message=f"{n.label} does not encrypt data in transit.",
                fix="Set transit_encryption_mode = SERVER_AUTHENTICATION.",
                standards=["CIS", "PCI", "NIST"],
            ))

        if t == "gcp_kms" and cfg(c, "protection_level") != "HSM" and is_truthy(cfg(c, "requires_hsm")):
            findings.append(_finding(
                "gcp_kms_software_for_hsm_required", n, level="warning",
                title="Cloud KMS: software key where HSM required",
                message=f"{n.label} uses software protection for HSM-required data.",
                fix="Set protection_level = HSM.",
                standards=["HIPAA", "PCI", "NIST"],
            ))

        if t == "gcp_lb" and cfg(c, "load_balancing_scheme") == "INTERNAL" and is_truthy(cfg(c, "allow_global_access")):
            findings.append(_finding(
                "gcp_lb_internal_global_access", n, level="warning",
                title="Internal LB: global access enabled",
                message=f"{n.label} allows cross-region client access to internal LB.",
                fix="Disable global access unless multi-region clients are required.",
                standards=["NIST"],
            ))

        if t == "gcp_gce" and is_truthy(cfg(c, "use_default_service_account")):
            findings.append(_finding(
                "gcp_gce_default_service_account", n, level="warning",
                title="GCE: default compute service account",
                message=f"{n.label} uses the default compute service account.",
                fix="Attach a dedicated least-privilege service account.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_artifact_registry" and is_truthy(cfg(c, "public_repository")):
            findings.append(_finding(
                "gcp_artifact_registry_public", n, level="critical",
                title="Artifact Registry: public repository",
                message=f"{n.label} allows public pull access to container images.",
                fix="Make the repository private and use IAM for access.",
                standards=["CIS", "NIST", "SOC2"],
            ))

        if t == "gcp_pubsub" and cfg(c, "message_retention_duration") in (None, "", "86400s"):
            findings.append(_finding(
                "gcp_pubsub_short_retention", n, level="info",
                title="Pub/Sub: short message retention",
                message=f"{n.label} retains undelivered messages for less than 7 days.",
                fix="Increase message_retention_duration for recovery scenarios.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_bigquery" and not is_truthy(cfg(c, "partitioned_tables")):
            findings.append(_finding(
                "gcp_bigquery_no_partitioning", n, level="info",
                title="BigQuery: partitioning strategy not documented",
                message=f"{n.label} lacks partitioned table configuration.",
                fix="Partition large tables to reduce query cost.",
                standards=["NIST"],
            ))

        if t == "gcp_dataproc" and not is_truthy(cfg(c, "autoscaling_enabled")):
            findings.append(_finding(
                "gcp_dataproc_no_autoscaling", n, level="info",
                title="Dataproc: autoscaling disabled",
                message=f"{n.label} cannot scale workers with demand.",
                fix="Enable autoscaling policy on the cluster.",
                standards=["NIST"],
            ))

        if t == "gcp_vertex_ai" and not is_truthy(cfg(c, "private_service_connect")):
            findings.append(_finding(
                "gcp_vertex_no_private_connect", n, level="info",
                title="Vertex AI: no private connectivity",
                message=f"{n.label} lacks private service connect configuration.",
                fix="Use VPC peering or Private Service Connect for Vertex endpoints.",
                standards=["NIST", "HIPAA"],
            ))

        if t == "gcp_firestore" and not is_truthy(cfg(c, "point_in_time_recovery_enablement")):
            findings.append(_finding(
                "gcp_firestore_no_pitr", n, level="info",
                title="Firestore: PITR not enabled",
                message=f"{n.label} lacks point-in-time recovery.",
                fix="Enable PITR on Firestore database.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_vpc" and not is_truthy(cfg(c, "enable_flow_logs")):
            findings.append(_finding(
                "gcp_vpc_no_flow_logs", n, level="warning",
                title="VPC: VPC Flow Logs not enabled",
                message=f"{n.label} has no VPC Flow Logs for network visibility.",
                fix="Enable VPC Flow Logs on subnets.",
                suggestion="Configure `log_config { flow_sampling = 0.5 }` on subnetworks.",
                standards=["CIS", "NIST", "SOC2"],
            ))

        if t == "gcp_gcs" and not cfg(c, "lifecycle_rules"):
            findings.append(_finding(
                "gcp_gcs_no_lifecycle", n, level="info",
                title="GCS: no lifecycle rules",
                message=f"{n.label} has no lifecycle transitions for cost/retention.",
                fix="Add lifecycle rules for infrequent access or deletion.",
                standards=["NIST"],
            ))

        if t == "gcp_cloudsql" and not cfg(c, "user_labels"):
            findings.append(_finding(
                "gcp_cloudsql_no_labels", n, level="info",
                title="Cloud SQL: no resource labels",
                message=f"{n.label} lacks labels for cost and ownership tracking.",
                fix="Add user_labels for environment, team, and cost center.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_gke" and cfg(c, "node_auto_upgrade") is False:
            findings.append(_finding(
                "gcp_gke_node_auto_upgrade_off", n, level="warning",
                title="GKE: node auto-upgrade disabled",
                message=f"{n.label} nodes may miss security patches.",
                fix="Enable node auto-upgrade on node pools.",
                standards=["CIS", "NIST"],
            ))

    return findings


# ─── Topology rules (~33) ─────────────────────────────────────────────────────


def gcp_topology_findings(nodes: list[Node], edges) -> list[Finding]:
    findings: list[Finding] = []
    types = node_types(nodes)
    _DB_TYPES = {"gcp_cloudsql", "gcp_alloydb", "gcp_spanner", "gcp_firestore", "gcp_bigtable", "gcp_memorystore"}
    _COMPUTE_TYPES = {"gcp_gce", "gcp_gke", "gcp_cloud_run", "gcp_cloud_functions", "gcp_mig", "gcp_app_engine"}
    _PUBLIC_EDGE_TYPES = {"gcp_lb", "gcp_cdn", "gcp_dns"}
    _STATEFUL = {"gcp_gce", "gcp_cloudsql", "gcp_filestore"}

    for n in nodes:
        t = n.type

        if t in _DB_TYPES and "gcp_secret_manager" not in types:
            findings.append(_finding(
                "gcp_no_secret_manager", n, level="warning",
                title="No Secret Manager for data services",
                message=f"{n.label} exists without Secret Manager for credentials.",
                fix="Add Secret Manager for database credentials.",
                suggestion="Store DB passwords in `google_secret_manager_secret` versions.",
                standards=["CIS", "NIST", "SOC2"],
            ))

        if t in _DB_TYPES and "gcp_kms" not in types:
            findings.append(_finding(
                "gcp_no_kms", n, level="info",
                title="No Cloud KMS for encryption keys",
                message=f"{n.label} architecture has no customer-managed keys.",
                fix="Add Cloud KMS for CMEK.",
                standards=["HIPAA", "PCI", "NIST"],
            ))

        if t in _COMPUTE_TYPES and "gcp_logging" not in types:
            findings.append(_finding(
                "gcp_no_logging", n, level="warning",
                title="No Cloud Logging configured",
                message=f"{n.label} has no centralized logging component.",
                fix="Add Cloud Logging for audit and troubleshooting.",
                standards=["CIS", "SOC2", "NIST"],
            ))

        if t in _COMPUTE_TYPES and "gcp_monitoring" not in types:
            findings.append(_finding(
                "gcp_no_monitoring", n, level="info",
                title="No Cloud Monitoring configured",
                message=f"{n.label} has no monitoring/alerting component.",
                fix="Add Cloud Monitoring dashboards and alerts.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_lb" and cfg(n.config, "load_balancing_scheme") == "EXTERNAL" and "gcp_armor" not in types:
            findings.append(_finding(
                "gcp_topology_lb_no_armor", n, level="warning",
                title="Public load balancer without Cloud Armor",
                message=f"{n.label} serves public traffic without WAF.",
                fix="Add Cloud Armor policy to the architecture.",
                standards=["CIS", "PCI", "SOC2"],
            ))

        if t in _COMPUTE_TYPES and "gcp_vpc" not in types:
            findings.append(_finding(
                "gcp_compute_no_vpc", n, level="warning",
                title="Compute resource without VPC",
                message=f"{n.label} is not in a VPC-scoped architecture.",
                fix="Add a VPC network and subnetworks.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_gce" and not has_neighbor_type(n.id, {"gcp_firewall"}, nodes, edges):
            findings.append(_finding(
                "gcp_gce_no_firewall", n, level="warning",
                title="GCE instance without firewall rules",
                message=f"{n.label} has no associated firewall rule component.",
                fix="Add firewall rules restricting instance traffic.",
                standards=["CIS", "NIST", "PCI"],
            ))

        if t == "gcp_cloudsql" and has_public_ip(n.config):
            findings.append(_finding(
                "gcp_topology_sql_public", n, level="critical",
                title="Cloud SQL publicly accessible",
                message=f"{n.label} is configured with public IP access.",
                fix="Disable public IP; use private services access.",
                standards=["CIS", "PCI", "HIPAA", "NIST"],
            ))

        if t == "gcp_gke" and "gcp_artifact_registry" not in types:
            findings.append(_finding(
                "gcp_gke_no_artifact_registry", n, level="info",
                title="GKE without Artifact Registry",
                message=f"{n.label} has no container image registry.",
                fix="Add Artifact Registry for trusted images.",
                standards=["CIS", "NIST"],
            ))

        if t in _STATEFUL and "gcp_backup" not in types:
            findings.append(_finding(
                "gcp_no_backup", n, level="warning",
                title="No backup service for stateful resources",
                message=f"{n.label} exists without Backup and DR.",
                fix="Add Backup and DR or native backup configs.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_vpc" and "gcp_nat" not in types and any(x.type in _COMPUTE_TYPES for x in nodes):
            private_compute = any(
                x.type in _COMPUTE_TYPES and not has_public_ip(x.config)
                for x in nodes
            )
            if private_compute:
                findings.append(_finding(
                    "gcp_private_compute_no_nat", n, level="warning",
                    title="Private compute without Cloud NAT",
                    message=f"{n.label} has private compute but no NAT for outbound internet.",
                    fix="Add Cloud NAT for private instance egress.",
                    standards=["NIST"],
                ))

        if t in _PUBLIC_EDGE_TYPES and "gcp_scc" not in types:
            findings.append(_finding(
                "gcp_no_scc", n, level="info",
                title="No Security Command Center",
                message="Public-facing architecture lacks SCC for threat detection.",
                fix="Enable Security Command Center.",
                standards=["NIST", "SOC2"],
            ))

        if len(nodes) > 1 and not edges:
            findings.append(_finding(
                "gcp_orphaned_nodes", n, level="info",
                title="Resources not connected on canvas",
                message=f"{n.label} is not connected to other resources.",
                fix="Draw edges to document relationships.",
                standards=["NIST"],
            ))

        if t == "gcp_cloud_run":
            db_neighbors = reachable_types(n.id, edges, nodes).intersection(_DB_TYPES)
            if db_neighbors and "gcp_private_sc" not in types and "gcp_vpc" not in types:
                findings.append(_finding(
                    "gcp_cloud_run_sql_no_psc", n, level="warning",
                    title="Cloud Run to database without Private Service Connect",
                    message=f"{n.label} connects to databases without PSC/VPC egress path.",
                    fix="Add VPC connector or Private Service Connect.",
                    standards=["NIST", "PCI"],
                ))

        if t == "gcp_cloud_functions" and "gcp_pubsub" in reachable_types(n.id, edges, nodes) and "gcp_tasks" not in types:
            findings.append(_finding(
                "gcp_functions_pubsub_no_dlq", n, level="info",
                title="Event-driven functions without dead-letter handling",
                message=f"{n.label} uses Pub/Sub without dead-letter queue pattern.",
                fix="Configure dead-letter topics or Cloud Tasks retry policies.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_lb" and "gcp_cdn" not in types and cfg(n.config, "load_balancing_scheme") == "EXTERNAL":
            findings.append(_finding(
                "gcp_public_lb_no_cdn", n, level="info",
                title="Public load balancer without Cloud CDN",
                message=f"{n.label} serves static content without CDN caching.",
                fix="Add Cloud CDN for cacheable assets.",
                standards=["NIST"],
            ))

        if t == "gcp_gcs" and has_neighbor_type(n.id, _PUBLIC_EDGE_TYPES, nodes, edges) and "gcp_armor" not in types:
            findings.append(_finding(
                "gcp_public_gcs_no_armor", n, level="warning",
                title="Public bucket path without Cloud Armor",
                message=f"{n.label} is on a public path without edge protection.",
                fix="Place Cloud Armor in front of public bucket access paths.",
                standards=["PCI", "NIST"],
            ))

        if t == "gcp_iam" and len(nodes) > 3:
            findings.append(_finding(
                "gcp_iam_present_review", n, level="info",
                title="Review IAM bindings",
                message=f"{n.label} — verify least-privilege IAM bindings.",
                fix="Audit IAM roles and remove primitive roles.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_apigee" and "gcp_armor" not in types:
            findings.append(_finding(
                "gcp_apigee_no_armor", n, level="warning",
                title="Apigee without Cloud Armor",
                message=f"{n.label} exposes APIs without edge WAF.",
                fix="Attach Cloud Armor to Apigee ingress.",
                standards=["PCI", "NIST"],
            ))

        if t == "gcp_spanner" and "gcp_backup" not in types:
            findings.append(_finding(
                "gcp_spanner_no_backup", n, level="info",
                title="Spanner without backup policy",
                message=f"{n.label} has no backup/export policy documented.",
                fix="Configure backup schedules or export pipelines.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_alloydb" and cfg(n.config, "cluster_type") == "PRIMARY" and "gcp_backup" not in types:
            findings.append(_finding(
                "gcp_alloydb_no_backup_topology", n, level="warning",
                title="AlloyDB without backup service",
                message=f"{n.label} primary cluster has no backup component.",
                fix="Configure AlloyDB backup or Backup and DR.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_bigquery" and "gcp_kms" not in types:
            findings.append(_finding(
                "gcp_bigquery_no_kms_topology", n, level="info",
                title="BigQuery without KMS in architecture",
                message=f"{n.label} sensitive analytics without CMEK path.",
                fix="Add Cloud KMS and default encryption config.",
                standards=["HIPAA", "PCI"],
            ))

        if t == "gcp_dataproc" and "gcp_kms" not in types:
            findings.append(_finding(
                "gcp_dataproc_no_kms", n, level="info",
                title="Dataproc without Cloud KMS",
                message=f"{n.label} cluster lacks CMEK configuration in architecture.",
                fix="Use CMEK for Dataproc cluster disks.",
                standards=["HIPAA", "NIST"],
            ))

        if t == "gcp_cloud_composer" and "gcp_secret_manager" not in types:
            findings.append(_finding(
                "gcp_composer_no_secrets", n, level="warning",
                title="Composer without Secret Manager",
                message=f"{n.label} Airflow may store connections insecurely.",
                fix="Use Secret Manager backend for Airflow connections.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_gke" and not is_truthy(cfg(n.config, "private_cluster")) and has_neighbor_type(n.id, {"gcp_lb"}, nodes, edges):
            findings.append(_finding(
                "gcp_public_gke_behind_lb", n, level="warning",
                title="GKE: non-private cluster on public path",
                message=f"{n.label} is reachable via public load balancer without private cluster.",
                fix="Enable private GKE nodes and authorized networks.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_interconnect" and "gcp_vpn" not in types and "gcp_interconnect" in types:
            if t == "gcp_interconnect" and len([x for x in nodes if x.type == "gcp_interconnect"]) == 1:
                findings.append(_finding(
                    "gcp_hybrid_no_vpn_fallback", n, level="info",
                    title="Hybrid connectivity without VPN fallback",
                    message=f"{n.label} has no VPN backup path documented.",
                    fix="Add HA VPN as failover to Interconnect.",
                    standards=["NIST", "SOC2"],
                ))

        if t == "gcp_dns" and cfg(n.config, "visibility") == "public":
            findings.append(_finding(
                "gcp_public_dns_zone", n, level="info",
                title="Public DNS zone in architecture",
                message=f"{n.label} is a public DNS zone — verify record exposure.",
                fix="Use DNSSEC and restrict zone admin access.",
                standards=["NIST"],
            ))

        if t == "gcp_mig" and not has_neighbor_type(n.id, {"gcp_lb"}, nodes, edges):
            findings.append(_finding(
                "gcp_mig_no_lb", n, level="info",
                title="MIG not behind load balancer",
                message=f"{n.label} is not connected to a load balancer.",
                fix="Place MIG behind Cloud Load Balancing for HA.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_pubsub" and "gcp_monitoring" not in types:
            findings.append(_finding(
                "gcp_pubsub_no_monitoring", n, level="info",
                title="Pub/Sub without monitoring",
                message=f"{n.label} lacks monitoring for backlog/latency alerts.",
                fix="Add subscription monitoring alerts.",
                standards=["NIST", "SOC2"],
            ))

        if t == "gcp_workflows" and "gcp_logging" not in types:
            findings.append(_finding(
                "gcp_workflows_no_logging", n, level="info",
                title="Workflows without logging",
                message=f"{n.label} executions may lack centralized audit logs.",
                fix="Enable workflow execution logging.",
                standards=["SOC2", "NIST"],
            ))

        if t == "gcp_cloud_build" and "gcp_artifact_registry" not in types:
            findings.append(_finding(
                "gcp_build_no_registry", n, level="info",
                title="Cloud Build without Artifact Registry",
                message=f"{n.label} has no destination registry in architecture.",
                fix="Push images to Artifact Registry.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_vertex_ai" and "gcp_kms" not in types:
            findings.append(_finding(
                "gcp_vertex_no_kms", n, level="info",
                title="Vertex AI without Cloud KMS",
                message=f"{n.label} ML workloads lack CMEK in architecture.",
                fix="Use CMEK for Vertex AI stored artifacts.",
                standards=["HIPAA", "NIST"],
            ))

        if t == "gcp_gce" and has_neighbor_type(n.id, {"gcp_lb"}, nodes, edges) and has_public_ip(n.config):
            findings.append(_finding(
                "gcp_gce_lb_and_public_ip", n, level="warning",
                title="GCE behind LB still has public IP",
                message=f"{n.label} uses a load balancer but retains a public IP.",
                fix="Remove external IP when using load balancer ingress only.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_cloudsql" and has_neighbor_type(n.id, _PUBLIC_EDGE_TYPES, nodes, edges):
            findings.append(_finding(
                "gcp_sql_on_public_path", n, level="critical",
                title="Database on public edge path",
                message=f"{n.label} is connected to a public-facing edge component.",
                fix="Remove public paths to databases; use private connectivity.",
                standards=["CIS", "PCI", "HIPAA", "NIST"],
            ))

        if t == "gcp_gke" and "gcp_scc" not in types:
            findings.append(_finding(
                "gcp_gke_no_scc", n, level="info",
                title="GKE without Security Command Center",
                message=f"{n.label} lacks container threat detection in architecture.",
                fix="Enable SCC container threat detection.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_cloud_functions" and "gcp_secret_manager" not in types:
            findings.append(_finding(
                "gcp_functions_no_secrets", n, level="info",
                title="Cloud Functions without Secret Manager",
                message=f"{n.label} may embed secrets in environment variables.",
                fix="Store secrets in Secret Manager.",
                standards=["CIS", "NIST"],
            ))

        if t == "gcp_vpc" and "gcp_dns" not in types and any(x.type in _PUBLIC_EDGE_TYPES for x in nodes):
            findings.append(_finding(
                "gcp_public_edge_no_dns", n, level="info",
                title="Public edge without Cloud DNS",
                message=f"{n.label} public architecture lacks DNS management component.",
                fix="Add Cloud DNS for managed record lifecycle.",
                standards=["NIST"],
            ))

        if t in {"gcp_cloud_run", "gcp_cloud_functions"} and "gcp_vpc" in types and not has_neighbor_type(n.id, {"gcp_private_sc"}, nodes, edges):
            findings.append(_finding(
                "gcp_serverless_no_vpc_connector", n, level="info",
                title="Serverless workload without VPC connector path",
                message=f"{n.label} may not reach private VPC resources.",
                fix="Add VPC connector or Private Service Connect.",
                standards=["NIST"],
            ))

        if t == "gcp_interconnect" and "gcp_nat" not in types:
            findings.append(_finding(
                "gcp_hybrid_no_cloud_router", n, level="info",
                title="Interconnect without Cloud Router",
                message=f"{n.label} hybrid setup lacks Cloud Router for dynamic routing.",
                fix="Add Cloud Router for BGP sessions.",
                standards=["NIST"],
            ))

    return findings


# ─── Firewall rules (~15) ─────────────────────────────────────────────────────


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
    return source in ("0.0.0.0/0", "::/0", "all", "0.0.0.0")


def _sg_allows_all_public(sg: SecurityGroup) -> bool:
    for rule in sg.inbound:
        if _is_public_source(rule.source) and rule.protocol in ("all", "-1", "tcp", "udp"):
            if str(rule.port) in ("-1", "*", "all", "0-65535"):
                return True
    return False


def gcp_firewall_findings(security_groups: list[SecurityGroup]) -> list[Finding]:
    findings: list[Finding] = []
    port_checks = [
        ("gcp_fw_ssh_open", 22, "critical", "SSH", "Restrict SSH to IAP or bastion CIDR ranges."),
        ("gcp_fw_rdp_open", 3389, "critical", "RDP", "Block RDP from the internet; use IAP TCP forwarding."),
        ("gcp_fw_postgres_open", 5432, "critical", "PostgreSQL", "Scope PostgreSQL to application subnet CIDR only."),
        ("gcp_fw_mysql_open", 3306, "critical", "MySQL", "Scope MySQL to application subnet CIDR only."),
        ("gcp_fw_redis_open", 6379, "critical", "Redis", "Never expose Redis to the internet."),
        ("gcp_fw_mongodb_open", 27017, "critical", "MongoDB", "Restrict MongoDB to private CIDR ranges."),
        ("gcp_fw_memcached_open", 11211, "critical", "Memcached", "Memcached must not be internet-facing."),
        ("gcp_fw_elasticsearch_open", 9200, "critical", "Elasticsearch", "Restrict search APIs to private networks."),
        ("gcp_fw_kafka_open", 9092, "critical", "Kafka", "Scope Kafka broker ports to client subnets."),
        ("gcp_fw_sqlserver_open", 1433, "critical", "SQL Server", "Do not expose SQL Server to the internet."),
        ("gcp_fw_http_open", 80, "warning", "HTTP", "Prefer HTTPS-only ingress from trusted sources."),
        ("gcp_fw_https_open", 443, "info", "HTTPS", "Verify Cloud Armor protects public HTTPS ingress."),
    ]
    for sg in security_groups:
        if _sg_allows_all_public(sg):
            findings.append(_sg_finding(
                "gcp_fw_all_traffic_open", sg, level="critical",
                title="Firewall: all traffic allowed from internet",
                message=f'Firewall "{sg.name}" allows all inbound traffic from the internet.',
                fix="Replace catch-all allow rules with least-privilege port rules.",
                suggestion="Use target tags/service accounts and specific source ranges.",
                standards=["CIS", "NIST", "PCI", "SOC2"],
            ))
        for rule_id, port, level, label, fix in port_checks:
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
                    "gcp_fw_icmp_open", sg, level="warning",
                    title="Firewall: ICMP open to internet",
                    message=f'Firewall "{sg.name}" allows ICMP from the internet.',
                    fix="Remove ICMP from public ingress unless required.",
                    standards=["CIS", "NIST"],
                ))
                break
    return findings


# ─── IAM rules (~10) ──────────────────────────────────────────────────────────


def gcp_iam_findings(iam_roles: list[IAMRole]) -> list[Finding]:
    findings: list[Finding] = []
    for role in iam_roles:
        for stmt in role.policies:
            if stmt.effect != "Allow":
                continue
            actions = [str(a) for a in stmt.actions]
            resources = [str(r) for r in stmt.resources]
            if any(a in ("*", "roles/owner", "roles/editor") for a in actions):
                findings.append(_iam_finding(
                    "gcp_iam_primitive_role", role,
                    level="critical",
                    title="IAM: primitive role binding",
                    message=f'IAM binding "{role.name}" grants primitive Owner/Editor-equivalent access.',
                    fix="Replace primitive roles with least-privilege custom roles.",
                    suggestion="Use predefined roles scoped to required permissions only.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if any("allUsers" in r or "allAuthenticatedUsers" in r for r in resources):
                findings.append(_iam_finding(
                    "gcp_iam_public_binding", role,
                    level="critical",
                    title="IAM: public principal binding",
                    message=f'IAM binding "{role.name}" grants access to allUsers or allAuthenticatedUsers.',
                    fix="Remove public IAM bindings.",
                    standards=["CIS", "NIST", "PCI", "SOC2"],
                ))
            if any("storage.objects" in a and a.endswith("*") for a in actions):
                findings.append(_iam_finding(
                    "gcp_iam_storage_wildcard", role,
                    level="warning",
                    title="IAM: broad Storage Object permissions",
                    message=f'IAM binding "{role.name}" grants wildcard Storage Object access.',
                    fix="Scope storage permissions to required buckets/objects.",
                    standards=["CIS", "NIST"],
                ))
            if any(a.startswith("cloudsql") and "admin" in a for a in actions):
                findings.append(_iam_finding(
                    "gcp_iam_cloudsql_admin", role,
                    level="warning",
                    title="IAM: Cloud SQL admin role",
                    message=f'IAM binding "{role.name}" grants Cloud SQL admin privileges.',
                    fix="Use cloudsql.client or instanceUser for applications.",
                    standards=["CIS", "NIST", "HIPAA"],
                ))
            if any("iam.serviceAccountKeys.create" in a for a in actions):
                findings.append(_iam_finding(
                    "gcp_iam_sa_key_create", role,
                    level="warning",
                    title="IAM: service account key creation allowed",
                    message=f'IAM binding "{role.name}" can create long-lived service account keys.',
                    fix="Prefer workload identity federation over SA keys.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if any("compute.instances.setServiceAccount" in a for a in actions):
                findings.append(_iam_finding(
                    "gcp_iam_set_service_account", role,
                    level="info",
                    title="IAM: can change instance service accounts",
                    message=f'IAM binding "{role.name}" can attach service accounts to VMs.',
                    fix="Restrict setServiceAccount to admin roles only.",
                    standards=["NIST"],
                ))
            if any("resourcemanager.projects.setIamPolicy" in a for a in actions):
                findings.append(_iam_finding(
                    "gcp_iam_set_iam_policy", role,
                    level="warning",
                    title="IAM: project IAM admin",
                    message=f'IAM binding "{role.name}" can modify project IAM policies.',
                    fix="Limit setIamPolicy to break-glass admin accounts.",
                    standards=["CIS", "NIST", "SOC2"],
                ))
            if any("run.services.setIamPolicy" in a or "cloudfunctions.functions.setIamPolicy" in a for a in actions):
                findings.append(_iam_finding(
                    "gcp_iam_serverless_set_policy", role,
                    level="warning",
                    title="IAM: can make serverless services public",
                    message=f'IAM binding "{role.name}" can change Cloud Run/Functions IAM policies.',
                    fix="Restrict invoker/admin changes to trusted principals.",
                    standards=["CIS", "NIST"],
                ))
            if any("bigquery.dataOwner" in a or a == "roles/bigquery.dataOwner" for a in actions):
                findings.append(_iam_finding(
                    "gcp_iam_bigquery_owner", role,
                    level="info",
                    title="IAM: BigQuery data owner privileges",
                    message=f'IAM binding "{role.name}" has BigQuery data owner access.',
                    fix="Use dataViewer/dataEditor roles instead of dataOwner where possible.",
                    standards=["NIST", "HIPAA"],
                ))
            if any("secretmanager.versions.access" in a for a in actions) and any(r == "*" for r in resources):
                findings.append(_iam_finding(
                    "gcp_iam_secrets_wildcard", role,
                    level="warning",
                    title="IAM: Secret Manager wildcard access",
                    message=f'IAM binding "{role.name}" can access all secrets.',
                    fix="Scope secretmanager.versions.access to specific secrets.",
                    standards=["CIS", "NIST", "HIPAA"],
                ))
    return findings


def run_gcp_validation(
    nodes: list[Node],
    edges,
    security_groups: list[SecurityGroup],
    iam_roles: list[IAMRole],
) -> list[Finding]:
    findings: list[Finding] = []
    findings.extend(gcp_config_findings(nodes))
    findings.extend(gcp_topology_findings(nodes, edges))
    findings.extend(gcp_firewall_findings(security_groups))
    findings.extend(gcp_iam_findings(iam_roles))
    return findings


def gcp_rule_ids() -> set[str]:
    """Return all GCP rule IDs for parity tests."""
    import re
    from pathlib import Path
    text = Path(__file__).with_name("gcp_validate.py").read_text(encoding="utf-8")
    ids = set(re.findall(r'_finding\(\s*"(gcp_[^"]+)"', text))
    ids |= set(re.findall(r'_sg_finding\(\s*"(gcp_[^"]+)"', text))
    ids |= set(re.findall(r'_iam_finding\(\s*"(gcp_[^"]+)"', text))
    # Port-check rules use rule_id variable in _sg_finding loop
    ids |= set(re.findall(r'\("(gcp_fw_[^"]+)"', text))
    return ids
