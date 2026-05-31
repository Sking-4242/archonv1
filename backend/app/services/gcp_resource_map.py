"""GCP canvas type → Terraform generation specs (google provider)."""

_GCP_RESOURCE_MAP: dict[str, dict] = {
    # ── Networking ────────────────────────────────────────────────────────────
    "gcp_vpc": {
        "primary": ["google_compute_network"],
        "companions": ["google_compute_subnetwork"],
        "key_vars": ["network_name", "project_id"],
        "outputs": ["network_id", "network_name", "network_self_link"],
        "notes": "Set auto_create_subnetworks = false. Generate at least one google_compute_subnetwork. "
                 "Enable VPC Flow Logs on subnets via log_config.",
    },
    "gcp_subnet": {
        "primary": ["google_compute_subnetwork"],
        "companions": [],
        "key_vars": ["subnet_name", "ip_cidr_range", "region"],
        "outputs": ["subnet_id", "subnet_self_link"],
        "notes": "Set private_ip_google_access = true for private workloads reaching Google APIs. "
                 "Associate with google_compute_network by network self link.",
    },
    "gcp_firewall": {
        "primary": ["google_compute_firewall"],
        "companions": [],
        "key_vars": ["firewall_name"],
        "outputs": ["firewall_id"],
        "notes": "Generate allow/deny rules from security_groups array. Use target_tags or target_service_accounts. "
                 "Never allow 0.0.0.0/0 on admin ports (22, 3389, database ports).",
    },
    "gcp_lb": {
        "primary": ["google_compute_global_forwarding_rule", "google_compute_backend_service"],
        "companions": [
            "google_compute_url_map",
            "google_compute_target_http_proxy",
            "google_compute_target_https_proxy",
            "google_compute_health_check",
        ],
        "key_vars": ["lb_name", "load_balancing_scheme"],
        "outputs": ["forwarding_rule_ip", "backend_service_id"],
        "notes": "External HTTP(S) MUST attach google_compute_security_policy (Cloud Armor). "
                 "Generate health checks and backend services for each target group.",
    },
    "gcp_cdn": {
        "primary": ["google_compute_backend_bucket"],
        "companions": ["google_compute_url_map", "google_compute_target_https_proxy"],
        "key_vars": ["cdn_name"],
        "outputs": ["backend_bucket_id"],
        "notes": "Enable CDN on backend bucket. Pair with Cloud Armor on the HTTPS proxy for public sites.",
    },
    "gcp_dns": {
        "primary": ["google_dns_managed_zone"],
        "companions": ["google_dns_record_set"],
        "key_vars": ["dns_name", "dns_zone_name"],
        "outputs": ["zone_name", "name_servers"],
        "notes": "For private zones use visibility = private and private_visibility_config. "
                 "Generate A/AAAA records pointing to load balancer IPs.",
    },
    "gcp_nat": {
        "primary": ["google_compute_router_nat"],
        "companions": ["google_compute_router"],
        "key_vars": ["router_name", "nat_name", "region"],
        "outputs": ["nat_id"],
        "notes": "Router MUST exist in the VPC region. Set source_subnetwork_ip_ranges_to_nat appropriately. "
                 "Use manual NAT IPs for predictable egress in production.",
    },
    "gcp_vpn": {
        "primary": ["google_compute_ha_vpn_gateway"],
        "companions": [
            "google_compute_external_vpn_gateway",
            "google_compute_vpn_tunnel",
            "google_compute_router",
        ],
        "key_vars": ["vpn_name", "region"],
        "outputs": ["vpn_gateway_id"],
        "notes": "Prefer HA VPN over classic VPN. Generate external VPN gateway and two tunnels for HA.",
    },
    "gcp_interconnect": {
        "primary": ["google_compute_interconnect_attachment"],
        "companions": ["google_compute_router", "google_compute_router_interface"],
        "key_vars": ["interconnect_name", "region", "router"],
        "outputs": ["interconnect_id"],
        "notes": "Dedicated Interconnect requires partner provisioning. Add Cloud Router for BGP. "
                 "Document HA VPN as failover path.",
    },
    "gcp_private_sc": {
        "primary": ["google_compute_service_attachment"],
        "companions": ["google_compute_forwarding_rule"],
        "key_vars": ["psc_name", "region", "target_service"],
        "outputs": ["service_attachment_id"],
        "notes": "Consumer connects via google_compute_forwarding_rule with PSC. "
                 "Set connection_preference and NAT subnets for published services.",
    },
    "gcp_network_endpoint_grp": {
        "primary": ["google_compute_network_endpoint_group"],
        "companions": ["google_compute_network_endpoint"],
        "key_vars": ["neg_name", "zone", "network"],
        "outputs": ["neg_id"],
        "notes": "For serverless NEGs use cloud_run or cloud_function subtype. "
                 "Attach NEG to backend service for load balancing.",
    },
    # ── Compute ───────────────────────────────────────────────────────────────
    "gcp_gce": {
        "primary": ["google_compute_instance"],
        "companions": ["google_compute_disk", "google_compute_firewall"],
        "key_vars": ["instance_name", "machine_type", "zone"],
        "outputs": ["instance_id", "instance_self_link"],
        "notes": "Enable shielded_instance_config and OS Login metadata. "
                 "Avoid access_config (public IP) unless required. Use pd-balanced boot disks.",
    },
    "gcp_mig": {
        "primary": ["google_compute_instance_group_manager"],
        "companions": ["google_compute_instance_template", "google_compute_health_check"],
        "key_vars": ["mig_name", "zone", "target_size"],
        "outputs": ["igm_id", "instance_group"],
        "notes": "Generate instance template with service account and startup script. "
                 "Place behind google_compute_backend_service for HA.",
    },
    "gcp_gke": {
        "primary": ["google_container_cluster"],
        "companions": ["google_container_node_pool"],
        "key_vars": ["cluster_name", "location", "node_count"],
        "outputs": ["cluster_id", "cluster_endpoint"],
        "notes": "Enable private_cluster_config, workload_identity_config, network_policy, "
                 "release_channel, and Binary Authorization. Generate separate node pools.",
    },
    "gcp_cloud_run": {
        "primary": ["google_cloud_run_v2_service"],
        "companions": [],
        "key_vars": ["service_name", "region"],
        "outputs": ["service_uri", "service_id"],
        "notes": "Set ingress = internal-and-cloud-load-balancing unless public LB fronts the service. "
                 "Do not grant allUsers invoker. Use VPC connector for private resource access.",
    },
    "gcp_cloud_functions": {
        "primary": ["google_cloudfunctions2_function"],
        "companions": ["google_storage_bucket"],
        "key_vars": ["function_name", "region", "runtime"],
        "outputs": ["function_uri", "function_id"],
        "notes": "Set ingress_settings = ALLOW_INTERNAL_ONLY for private functions. "
                 "Store source in GCS bucket. Use Secret Manager for env secrets.",
    },
    "gcp_app_engine": {
        "primary": ["google_app_engine_standard_app_version"],
        "companions": ["google_app_engine_application"],
        "key_vars": ["app_id", "version_id", "runtime"],
        "outputs": ["default_hostname"],
        "notes": "Generate google_app_engine_application first. Use dedicated service account, not default.",
    },
    "gcp_cloud_batch": {
        "primary": ["google_cloud_batch_job"],
        "companions": ["google_service_account"],
        "key_vars": ["job_name", "region"],
        "outputs": ["job_uid"],
        "notes": "Batch jobs run on Compute — specify task groups with machine types and service account.",
    },
    "gcp_cloud_composer": {
        "primary": ["google_composer_environment"],
        "companions": ["google_storage_bucket"],
        "key_vars": ["composer_name", "region", "environment_size"],
        "outputs": ["composer_airflow_uri"],
        "notes": "Composer requires GCS bucket for DAGs. Configure Secret Manager backend for connections.",
    },
    # ── Storage ───────────────────────────────────────────────────────────────
    "gcp_gcs": {
        "primary": ["google_storage_bucket"],
        "companions": [],
        "key_vars": ["bucket_name", "location"],
        "outputs": ["bucket_url", "bucket_name"],
        "notes": "Set uniform_bucket_level_access = true and public_access_prevention = enforced. "
                 "Add versioning and lifecycle rules for production buckets.",
    },
    "gcp_filestore": {
        "primary": ["google_filestore_instance"],
        "companions": ["google_compute_network"],
        "key_vars": ["filestore_name", "tier", "capacity_gb"],
        "outputs": ["filestore_id", "ip_addresses"],
        "notes": "Must be in same VPC as clients. Use ENTERPRISE tier for HA in production.",
    },
    "gcp_persistent_disk": {
        "primary": ["google_compute_disk"],
        "companions": [],
        "key_vars": ["disk_name", "size", "type", "zone"],
        "outputs": ["disk_id", "disk_self_link"],
        "notes": "Use pd-balanced or pd-ssd for production. Attach via google_compute_attached_disk.",
    },
    "gcp_backup": {
        "primary": ["google_backup_dr_backup_plan"],
        "companions": ["google_backup_dr_backup_vault"],
        "key_vars": ["backup_plan_name", "location"],
        "outputs": ["backup_plan_id"],
        "notes": "Generate backup vault and plan. Associate with GCE or databases for DR.",
    },
    # ── Database ──────────────────────────────────────────────────────────────
    "gcp_cloudsql": {
        "primary": ["google_sql_database_instance"],
        "companions": ["google_sql_database", "google_sql_user"],
        "key_vars": ["instance_name", "database_version", "tier"],
        "outputs": ["instance_connection_name", "private_ip_address"],
        "notes": "Set ipv4_enabled = false, use private_network. Enable backup_configuration with PITR. "
                 "Set ssl_mode = ENCRYPTED_ONLY and deletion_protection = true.",
    },
    "gcp_alloydb": {
        "primary": ["google_alloydb_cluster"],
        "companions": ["google_alloydb_instance"],
        "key_vars": ["cluster_id", "location", "network"],
        "outputs": ["cluster_name", "primary_instance_ip"],
        "notes": "Cluster requires VPC. Enable automated backup policy on primary clusters.",
    },
    "gcp_spanner": {
        "primary": ["google_spanner_instance"],
        "companions": ["google_spanner_database"],
        "key_vars": ["instance_name", "config", "processing_units"],
        "outputs": ["instance_id"],
        "notes": "Choose regional or multi-region config based on DR needs. "
                 "Set processing_units >= 100 for production.",
    },
    "gcp_firestore": {
        "primary": ["google_firestore_database"],
        "companions": [],
        "key_vars": ["database_id", "location_id", "type"],
        "outputs": ["database_name"],
        "notes": "Enable point_in_time_recovery_enablement and delete_protection_state for production.",
    },
    "gcp_bigtable": {
        "primary": ["google_bigtable_instance"],
        "companions": ["google_bigtable_table"],
        "key_vars": ["instance_name", "cluster_id", "num_nodes"],
        "outputs": ["instance_id"],
        "notes": "Use at least 2 nodes per cluster for redundancy. Set storage_type appropriately.",
    },
    "gcp_memorystore": {
        "primary": ["google_redis_instance"],
        "companions": ["google_compute_network"],
        "key_vars": ["redis_name", "tier", "memory_size_gb"],
        "outputs": ["redis_host", "redis_port"],
        "notes": "Use STANDARD_HA tier with auth_enabled = true and transit_encryption_mode = SERVER_AUTHENTICATION.",
    },
    "gcp_datastore": {
        "primary": ["google_datastore_index"],
        "companions": ["google_firestore_database"],
        "key_vars": ["project_id"],
        "outputs": [],
        "notes": "Datastore mode uses Firestore API. Prefer Firestore native mode for new apps.",
    },
    # ── Security ──────────────────────────────────────────────────────────────
    "gcp_iam": {
        "primary": ["google_project_iam_binding"],
        "companions": ["google_service_account"],
        "key_vars": ["project_id", "role", "members"],
        "outputs": ["service_account_email"],
        "notes": "Never bind roles/owner or roles/editor to allUsers. Use custom roles with least privilege.",
    },
    "gcp_secret_manager": {
        "primary": ["google_secret_manager_secret"],
        "companions": ["google_secret_manager_secret_version"],
        "key_vars": ["secret_id", "replication"],
        "outputs": ["secret_id"],
        "notes": "Prefer automatic replication unless data residency requires user-managed replicas.",
    },
    "gcp_armor": {
        "primary": ["google_compute_security_policy"],
        "companions": ["google_compute_security_policy_rule"],
        "key_vars": ["policy_name"],
        "outputs": ["security_policy_id"],
        "notes": "Attach to backend services behind external load balancers. "
                 "Generate default allow rule plus OWASP/rate-limit rules.",
    },
    "gcp_kms": {
        "primary": ["google_kms_key_ring"],
        "companions": ["google_kms_crypto_key"],
        "key_vars": ["key_ring_name", "location", "rotation_period"],
        "outputs": ["crypto_key_id"],
        "notes": "Set rotation_period (e.g. 7776000s). Use protection_level = HSM for regulated data.",
    },
    "gcp_certificate_manager": {
        "primary": ["google_certificate_manager_certificate"],
        "companions": ["google_certificate_manager_certificate_map"],
        "key_vars": ["certificate_name"],
        "outputs": ["certificate_id"],
        "notes": "Use managed certificates for public HTTPS. Map certificates to target proxies.",
    },
    "gcp_scc": {
        "primary": ["google_scc_source"],
        "companions": [],
        "key_vars": ["organization_id"],
        "outputs": ["source_id"],
        "notes": "Enable Security Command Center at org level. Premium tier for advanced threat detection.",
    },
    # ── Integration ───────────────────────────────────────────────────────────
    "gcp_pubsub": {
        "primary": ["google_pubsub_topic"],
        "companions": ["google_pubsub_subscription"],
        "key_vars": ["topic_name"],
        "outputs": ["topic_id"],
        "notes": "Configure message_retention_duration and dead-letter topics. Use CMEK for sensitive data.",
    },
    "gcp_dataflow": {
        "primary": ["google_dataflow_job"],
        "companions": ["google_storage_bucket"],
        "key_vars": ["job_name", "region", "template_gcs_path"],
        "outputs": ["job_id"],
        "notes": "Staging bucket required. Set max_workers to control cost.",
    },
    "gcp_apigee": {
        "primary": [],
        "companions": [],
        "key_vars": ["apigee_org", "apigee_env"],
        "outputs": [],
        "notes": "Apigee is org-managed — reference existing org/env. Pair with Cloud Armor at ingress.",
    },
    "gcp_tasks": {
        "primary": ["google_cloud_tasks_queue"],
        "companions": [],
        "key_vars": ["queue_name", "location"],
        "outputs": ["queue_id"],
        "notes": "Configure retry_config and rate_limits. Use for async work with dead-letter handling.",
    },
    "gcp_scheduler": {
        "primary": ["google_cloud_scheduler_job"],
        "companions": [],
        "key_vars": ["job_name", "schedule", "region"],
        "outputs": ["job_id"],
        "notes": "Target HTTP, Pub/Sub, or Cloud Functions. Use OIDC auth for HTTP targets.",
    },
    "gcp_workflows": {
        "primary": ["google_workflows_workflow"],
        "companions": [],
        "key_vars": ["workflow_name", "region"],
        "outputs": ["workflow_id"],
        "notes": "Define source_contents YAML. Enable execution logging to Cloud Logging.",
    },
    # ── Analytics ─────────────────────────────────────────────────────────────
    "gcp_bigquery": {
        "primary": ["google_bigquery_dataset"],
        "companions": ["google_bigquery_table"],
        "key_vars": ["dataset_id", "location"],
        "outputs": ["dataset_id"],
        "notes": "Set default_encryption_configuration with KMS for sensitive datasets. "
                 "Partition large tables.",
    },
    "gcp_dataproc": {
        "primary": ["google_dataproc_cluster"],
        "companions": ["google_storage_bucket"],
        "key_vars": ["cluster_name", "region"],
        "outputs": ["cluster_id"],
        "notes": "Staging bucket required. Enable autoscaling and CMEK for cluster disks.",
    },
    "gcp_looker": {
        "primary": ["google_looker_instance"],
        "companions": [],
        "key_vars": ["looker_name", "region", "platform_edition"],
        "outputs": ["looker_uri"],
        "notes": "Looker Core is managed service. Configure OAuth and private connectivity.",
    },
    "gcp_data_catalog": {
        "primary": ["google_data_catalog_entry_group"],
        "companions": ["google_data_catalog_entry"],
        "key_vars": ["entry_group_id", "region"],
        "outputs": ["entry_group_id"],
        "notes": "Tag sensitive data assets. Set region for data residency.",
    },
    "gcp_analytics_hub": {
        "primary": ["google_bigquery_analytics_hub_listing"],
        "companions": ["google_bigquery_dataset"],
        "key_vars": ["listing_id", "dataset_id"],
        "outputs": ["listing_id"],
        "notes": "Listings share BigQuery datasets. Document description and access controls.",
    },
    # ── AI / ML ───────────────────────────────────────────────────────────────
    "gcp_vertex_ai": {
        "primary": ["google_vertex_ai_endpoint"],
        "companions": ["google_vertex_ai_model"],
        "key_vars": ["endpoint_name", "region"],
        "outputs": ["endpoint_id"],
        "notes": "Use Private Service Connect for private endpoints. CMEK for stored artifacts.",
    },
    "gcp_automl": {
        "primary": ["google_vertex_ai_dataset"],
        "companions": [],
        "key_vars": ["dataset_name", "region"],
        "outputs": ["dataset_id"],
        "notes": "AutoML training billed per node-hour. Set budget alerts.",
    },
    "gcp_vision_ai": {
        "primary": [],
        "companions": [],
        "key_vars": ["project_id"],
        "outputs": [],
        "notes": "Vision API is managed — enable API and use client libraries. "
                 "Review privacy for FACE_DETECTION features.",
    },
    "gcp_speech": {
        "primary": [],
        "companions": [],
        "key_vars": ["project_id"],
        "outputs": [],
        "notes": "Speech-to-Text is API-based. Select model matching audio source.",
    },
    "gcp_translation": {
        "primary": [],
        "companions": [],
        "key_vars": ["project_id"],
        "outputs": [],
        "notes": "Translation API — set explicit source_language_code when known.",
    },
    "gcp_natural_lang": {
        "primary": [],
        "companions": [],
        "key_vars": ["project_id"],
        "outputs": [],
        "notes": "Natural Language API — prefer PLAIN_TEXT for untrusted content.",
    },
    # ── Monitoring ────────────────────────────────────────────────────────────
    "gcp_monitoring": {
        "primary": ["google_monitoring_alert_policy"],
        "companions": ["google_monitoring_notification_channel"],
        "key_vars": ["alert_policy_name"],
        "outputs": ["alert_policy_id"],
        "notes": "Generate notification channels and alert policies for critical metrics.",
    },
    "gcp_logging": {
        "primary": ["google_logging_project_sink"],
        "companions": ["google_storage_bucket"],
        "key_vars": ["sink_name", "destination"],
        "outputs": ["sink_writer_identity"],
        "notes": "Export logs to GCS bucket or BigQuery. Set unique_writer_identity = true.",
    },
    "gcp_trace": {
        "primary": [],
        "companions": [],
        "key_vars": ["project_id"],
        "outputs": [],
        "notes": "Cloud Trace is enabled via client libraries — no TF resource required for basic use.",
    },
    "gcp_error_reporting": {
        "primary": [],
        "companions": [],
        "key_vars": ["project_id"],
        "outputs": [],
        "notes": "Error Reporting auto-detects from Cloud Logging — enable API on project.",
    },
    # ── DevOps ────────────────────────────────────────────────────────────────
    "gcp_cloud_build": {
        "primary": ["google_cloudbuild_trigger"],
        "companions": ["google_artifact_registry_repository"],
        "key_vars": ["trigger_name", "repo_name"],
        "outputs": ["trigger_id"],
        "notes": "Push images to Artifact Registry. Set explicit machine_type for builds.",
    },
    "gcp_cloud_deploy": {
        "primary": ["google_clouddeploy_delivery_pipeline"],
        "companions": ["google_clouddeploy_target"],
        "key_vars": ["pipeline_name", "location"],
        "outputs": ["pipeline_id"],
        "notes": "Set location for delivery pipeline. Define targets for GKE or Cloud Run.",
    },
    "gcp_artifact_registry": {
        "primary": ["google_artifact_registry_repository"],
        "companions": [],
        "key_vars": ["repository_id", "location", "format"],
        "outputs": ["repository_id"],
        "notes": "Enable vulnerability scanning. Keep repositories private with IAM-only access.",
    },
    "gcp_source_repo": {
        "primary": ["google_sourcerepo_repository"],
        "companions": [],
        "key_vars": ["repo_name"],
        "outputs": ["repo_url"],
        "notes": "Set repository name. Consider Cloud Build triggers for CI.",
    },
}
