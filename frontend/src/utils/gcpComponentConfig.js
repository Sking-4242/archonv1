export const GCP_COMPONENT_CONFIGS = {
  // ── Networking ─────────────────────────────────────────────────────────────
  gcp_vpc: [
    { key: "auto_create_subnetworks", label: "Auto Subnets", type: "boolean", default: false, basic: true },
    { key: "routing_mode", label: "Routing Mode", type: "select", options: ["REGIONAL", "GLOBAL"], default: "REGIONAL", basic: true },
    { key: "enable_flow_logs", label: "VPC Flow Logs", type: "boolean", default: false, basic: true },
  ],
  gcp_subnet: [
    { key: "ip_cidr_range", label: "IP CIDR Range", type: "text", default: "10.0.0.0/24", basic: true },
    { key: "region", label: "Region", type: "text", default: "us-central1", basic: true },
    { key: "private_ip_google_access", label: "Private Google Access", type: "boolean", default: true },
  ],
  gcp_firewall: [
    { key: "direction", label: "Direction", type: "select", options: ["INGRESS", "EGRESS"], default: "INGRESS", basic: true },
    { key: "priority", label: "Priority", type: "number", default: 1000, basic: true },
  ],
  gcp_lb: [
    { key: "load_balancing_scheme", label: "Scheme", type: "select", options: ["EXTERNAL", "INTERNAL", "EXTERNAL_MANAGED"], default: "EXTERNAL", basic: true },
    { key: "cloud_armor_enabled", label: "Cloud Armor Attached", type: "boolean", default: false, basic: true },
  ],
  gcp_cdn: [],
  gcp_dns: [
    { key: "dns_name", label: "DNS Name", type: "text", default: "example.com.", basic: true },
    { key: "visibility", label: "Visibility", type: "select", options: ["public", "private"], default: "public", basic: true },
  ],
  gcp_nat: [
    { key: "nat_ip_allocate_option", label: "IP Allocate Option", type: "select", options: ["AUTO_ONLY", "MANUAL_ONLY"], default: "AUTO_ONLY", basic: true },
  ],
  gcp_vpn: [
    { key: "vpn_type", label: "VPN Type", type: "select", options: ["Classic VPN", "HA VPN"], default: "HA VPN", basic: true },
    { key: "router_asn", label: "Router ASN", type: "number", default: 64512, basic: true },
  ],
  gcp_interconnect: [
    { key: "type", label: "Type", type: "select", options: ["DEDICATED", "PARTNER"], default: "DEDICATED", basic: true },
    { key: "requested_link_count", label: "Link Count", type: "number", default: 1, basic: true },
    { key: "link_type", label: "Link Type", type: "select", options: ["LINK_TYPE_ETHERNET_10G_LR", "LINK_TYPE_ETHERNET_100G_LR"], default: "LINK_TYPE_ETHERNET_10G_LR" },
  ],
  gcp_private_sc: [
    { key: "target_service", label: "Target Service", type: "text", default: "", basic: true },
  ],
  gcp_network_endpoint_grp: [
    { key: "neg_type", label: "NEG Type", type: "select", options: ["GCE_VM_IP_PORT", "INTERNET_IP_PORT", "SERVERLESS"], default: "GCE_VM_IP_PORT", basic: true },
    { key: "zone", label: "Zone", type: "text", default: "us-central1-a", basic: true },
  ],

  // ── Compute ────────────────────────────────────────────────────────────────
  gcp_gce: [
    { key: "machine_type", label: "Machine Type", type: "select", options: ["e2-micro", "e2-small", "e2-medium", "n2-standard-2", "n2-standard-4", "c2-standard-4", "n2-highmem-4"], default: "e2-medium", basic: true },
    { key: "zone", label: "Zone", type: "text", default: "us-central1-a", basic: true },
    { key: "boot_disk_size", label: "Boot Disk (GB)", type: "number", default: 50, basic: true },
    { key: "boot_disk_type", label: "Disk Type", type: "select", options: ["pd-standard", "pd-balanced", "pd-ssd"], default: "pd-balanced" },
    { key: "public_ip", label: "Public IP", type: "boolean", default: false, basic: true },
    { key: "shielded_vm_enabled", label: "Shielded VM", type: "boolean", default: true, basic: true },
    { key: "os_login_enabled", label: "OS Login", type: "boolean", default: true, basic: true },
  ],
  gcp_mig: [
    { key: "base_instance_name", label: "Base Instance Name", type: "text", default: "instance", basic: true },
    { key: "target_size", label: "Target Size", type: "number", default: 2, basic: true },
    { key: "zone", label: "Zone", type: "text", default: "us-central1-a", basic: true },
  ],
  gcp_gke: [
    { key: "initial_node_count", label: "Node Count", type: "number", default: 3, basic: true },
    { key: "machine_type", label: "Node Machine Type", type: "text", default: "e2-standard-2", basic: true },
    { key: "location", label: "Location", type: "text", default: "us-central1", basic: true },
    { key: "autopilot", label: "Autopilot", type: "boolean", default: false, basic: true },
    { key: "private_cluster", label: "Private Cluster", type: "boolean", default: true, basic: true },
    { key: "workload_identity_enabled", label: "Workload Identity", type: "boolean", default: true, basic: true },
    { key: "network_policy", label: "Network Policy", type: "boolean", default: true, basic: true },
  ],
  gcp_cloud_run: [
    { key: "location", label: "Location", type: "text", default: "us-central1", basic: true },
    { key: "max_instance_count", label: "Max Instances", type: "number", default: 10, basic: true },
    { key: "ingress", label: "Ingress", type: "select", options: ["all", "internal", "internal-and-cloud-load-balancing"], default: "internal-and-cloud-load-balancing", basic: true },
    { key: "allow_unauthenticated", label: "Allow Unauthenticated", type: "boolean", default: false, basic: true },
  ],
  gcp_cloud_functions: [
    { key: "runtime", label: "Runtime", type: "select", options: ["python311", "nodejs20", "go122", "java21"], default: "python311", basic: true },
    { key: "available_memory", label: "Memory", type: "select", options: ["128Mi", "256Mi", "512Mi", "1Gi", "2Gi"], default: "256Mi", basic: true },
    { key: "location", label: "Region", type: "text", default: "us-central1", basic: true },
  ],
  gcp_app_engine: [
    { key: "runtime", label: "Runtime", type: "text", default: "python311", basic: true },
    { key: "scaling_type", label: "Scaling", type: "select", options: ["automatic", "manual", "basic"], default: "automatic", basic: true },
  ],
  gcp_cloud_batch: [
    { key: "machine_type", label: "Machine Type", type: "text", default: "e2-standard-4", basic: true },
    { key: "provisioning_model", label: "Provisioning", type: "select", options: ["STANDARD", "SPOT"], default: "STANDARD", basic: true },
    { key: "parallelism", label: "Parallelism", type: "number", default: 10, basic: true },
  ],
  gcp_cloud_composer: [
    { key: "image_version", label: "Image Version", type: "text", default: "composer-3-airflow-2", basic: true },
    { key: "environment_size", label: "Environment Size", type: "select", options: ["ENVIRONMENT_SIZE_SMALL", "ENVIRONMENT_SIZE_MEDIUM", "ENVIRONMENT_SIZE_LARGE"], default: "ENVIRONMENT_SIZE_SMALL", basic: true },
  ],

  // ── Storage ────────────────────────────────────────────────────────────────
  gcp_gcs: [
    { key: "location", label: "Location", type: "text", default: "US", basic: true },
    { key: "storage_class", label: "Storage Class", type: "select", options: ["STANDARD", "NEARLINE", "COLDLINE", "ARCHIVE"], default: "STANDARD", basic: true },
    { key: "uniform_bucket_level_access", label: "Uniform Access", type: "boolean", default: true, basic: true },
    { key: "public_access_prevention", label: "Public Access Prevention", type: "select", options: ["enforced", "inherited", "unspecified"], default: "enforced", basic: true },
  ],
  gcp_filestore: [
    { key: "tier", label: "Tier", type: "select", options: ["BASIC_HDD", "BASIC_SSD", "PREMIUM", "ENTERPRISE"], default: "BASIC_HDD", basic: true },
    { key: "capacity_gb", label: "Capacity (GB)", type: "number", default: 1024, basic: true },
  ],
  gcp_persistent_disk: [
    { key: "type", label: "Disk Type", type: "select", options: ["pd-standard", "pd-balanced", "pd-ssd", "pd-extreme"], default: "pd-balanced", basic: true },
    { key: "size", label: "Size (GB)", type: "number", default: 100, basic: true },
    { key: "zone", label: "Zone", type: "text", default: "us-central1-a", basic: true },
  ],
  gcp_backup: [
    { key: "resource_type", label: "Resource Type", type: "select", options: ["compute", "gke", "cloudsql", "spanner"], default: "compute", basic: true },
    { key: "retention_days", label: "Retention (days)", type: "number", default: 30, basic: true },
  ],

  // ── Database ───────────────────────────────────────────────────────────────
  gcp_cloudsql: [
    { key: "database_version", label: "DB Version", type: "select", options: ["POSTGRES_15", "POSTGRES_14", "MYSQL_8_0", "SQLSERVER_2019_STANDARD"], default: "POSTGRES_15", basic: true },
    { key: "tier", label: "Tier", type: "text", default: "db-f1-micro", basic: true },
    { key: "disk_size", label: "Disk (GB)", type: "number", default: 20, basic: true },
    { key: "availability_type", label: "Availability", type: "select", options: ["ZONAL", "REGIONAL"], default: "ZONAL", basic: true },
    { key: "ipv4_enabled", label: "Public IPv4", type: "boolean", default: false, basic: true },
    { key: "ssl_mode", label: "SSL Mode", type: "select", options: ["ENCRYPTED_ONLY", "ALLOW_UNENCRYPTED_AND_ENCRYPTED"], default: "ENCRYPTED_ONLY", basic: true },
    { key: "backup_enabled", label: "Automated Backups", type: "boolean", default: true, basic: true },
    { key: "deletion_protection", label: "Deletion Protection", type: "boolean", default: true, basic: true },
  ],
  gcp_alloydb: [
    { key: "cluster_type", label: "Cluster Type", type: "select", options: ["PRIMARY", "SECONDARY"], default: "PRIMARY", basic: true },
    { key: "cpu_count", label: "vCPU Count", type: "number", default: 2, basic: true },
    { key: "read_pool_node_count", label: "Read Pool Nodes", type: "number", default: 0 },
  ],
  gcp_spanner: [
    { key: "config", label: "Instance Config", type: "text", default: "regional-us-central1", basic: true },
    { key: "processing_units", label: "Processing Units", type: "number", default: 100, basic: true },
  ],
  gcp_firestore: [
    { key: "location_id", label: "Location", type: "text", default: "us-east1", basic: true },
    { key: "type", label: "Type", type: "select", options: ["FIRESTORE_NATIVE", "DATASTORE_MODE"], default: "FIRESTORE_NATIVE", basic: true },
  ],
  gcp_bigtable: [
    { key: "num_nodes", label: "Nodes", type: "number", default: 1, basic: true },
    { key: "storage_type", label: "Storage Type", type: "select", options: ["SSD", "HDD"], default: "SSD", basic: true },
    { key: "zone", label: "Zone", type: "text", default: "us-central1-b", basic: true },
  ],
  gcp_memorystore: [
    { key: "tier", label: "Tier", type: "select", options: ["BASIC", "STANDARD_HA"], default: "STANDARD_HA", basic: true },
    { key: "memory_size_gb", label: "Memory (GB)", type: "number", default: 5, basic: true },
    { key: "redis_version", label: "Redis Version", type: "select", options: ["REDIS_7_0", "REDIS_6_X"], default: "REDIS_7_0", basic: true },
  ],
  gcp_datastore: [
    { key: "location_id", label: "Location", type: "text", default: "us-east1", basic: true },
  ],

  // ── Security ───────────────────────────────────────────────────────────────
  gcp_iam: [],
  gcp_secret_manager: [
    { key: "replication_type", label: "Replication", type: "select", options: ["automatic", "user_managed"], default: "automatic", basic: true },
  ],
  gcp_armor: [
    { key: "type", label: "Policy Type", type: "select", options: ["CLOUD_ARMOR", "CLOUD_ARMOR_EDGE"], default: "CLOUD_ARMOR", basic: true },
  ],
  gcp_kms: [
    { key: "key_ring_location", label: "Key Ring Location", type: "text", default: "us-central1", basic: true },
    { key: "algorithm", label: "Algorithm", type: "select", options: ["GOOGLE_SYMMETRIC_ENCRYPTION", "RSA_SIGN_PSS_2048_SHA256", "EC_SIGN_P256_SHA256"], default: "GOOGLE_SYMMETRIC_ENCRYPTION", basic: true },
    { key: "protection_level", label: "Protection Level", type: "select", options: ["SOFTWARE", "HSM"], default: "SOFTWARE" },
  ],
  gcp_certificate_manager: [
    { key: "scope", label: "Scope", type: "select", options: ["DEFAULT", "EDGE_CACHE"], default: "DEFAULT", basic: true },
  ],
  gcp_scc: [
    { key: "tier", label: "Tier", type: "select", options: ["STANDARD", "PREMIUM"], default: "STANDARD", basic: true },
  ],

  // ── Integration ────────────────────────────────────────────────────────────
  gcp_pubsub: [
    { key: "message_retention_duration", label: "Retention (s)", type: "text", default: "604800s", basic: true },
  ],
  gcp_dataflow: [
    { key: "machine_type", label: "Machine Type", type: "text", default: "n1-standard-4", basic: true },
    { key: "max_workers", label: "Max Workers", type: "number", default: 10, basic: true },
    { key: "region", label: "Region", type: "text", default: "us-central1", basic: true },
  ],
  gcp_apigee: [
    { key: "billing_type", label: "Billing Type", type: "select", options: ["EVALUATION", "PAYG", "SUBSCRIPTION"], default: "EVALUATION", basic: true },
  ],
  gcp_tasks: [
    { key: "max_dispatches_per_second", label: "Max Dispatches/s", type: "number", default: 500, basic: true },
    { key: "max_concurrent_dispatches", label: "Max Concurrent", type: "number", default: 100 },
  ],
  gcp_scheduler: [
    { key: "schedule", label: "Cron Schedule", type: "text", default: "0 * * * *", basic: true },
    { key: "time_zone", label: "Timezone", type: "text", default: "UTC", basic: true },
  ],
  gcp_workflows: [
    { key: "region", label: "Region", type: "text", default: "us-central1", basic: true },
  ],

  // ── Analytics ──────────────────────────────────────────────────────────────
  gcp_bigquery: [
    { key: "location", label: "Location", type: "text", default: "US", basic: true },
    { key: "delete_contents_on_destroy", label: "Delete on Destroy", type: "boolean", default: false },
  ],
  gcp_dataproc: [
    { key: "cluster_type", label: "Cluster Type", type: "select", options: ["STANDARD", "SINGLE_NODE", "HIGH_AVAILABILITY"], default: "STANDARD", basic: true },
    { key: "master_machine_type", label: "Master VM", type: "text", default: "n1-standard-4", basic: true },
    { key: "worker_count", label: "Worker Count", type: "number", default: 2, basic: true },
    { key: "worker_machine_type", label: "Worker VM", type: "text", default: "n1-standard-4", basic: true },
  ],
  gcp_looker: [
    { key: "platform_edition", label: "Edition", type: "select", options: ["LOOKER_CORE_TRIAL", "LOOKER_CORE_STANDARD", "LOOKER_CORE_ENTERPRISE"], default: "LOOKER_CORE_STANDARD", basic: true },
  ],
  gcp_data_catalog: [
    { key: "region", label: "Region", type: "text", default: "us-central1", basic: true },
  ],
  gcp_analytics_hub: [
    { key: "location", label: "Location", type: "text", default: "US", basic: true },
    { key: "description", label: "Description", type: "text", default: "", basic: true },
  ],

  // ── AI / ML ────────────────────────────────────────────────────────────────
  gcp_vertex_ai: [
    { key: "location", label: "Location", type: "text", default: "us-central1", basic: true },
    { key: "machine_type", label: "Training VM", type: "text", default: "n1-standard-4", basic: true },
    { key: "accelerator_type", label: "Accelerator", type: "select", options: ["ACCELERATOR_TYPE_UNSPECIFIED", "NVIDIA_TESLA_T4", "NVIDIA_TESLA_V100", "NVIDIA_TESLA_A100"], default: "ACCELERATOR_TYPE_UNSPECIFIED", basic: true },
  ],
  gcp_automl: [
    { key: "dataset_type", label: "Dataset Type", type: "select", options: ["IMAGE_CLASSIFICATION", "TEXT_CLASSIFICATION", "TABULAR", "VIDEO_CLASSIFICATION"], default: "TABULAR", basic: true },
    { key: "budget_milli_node_hours", label: "Budget (milli node-hours)", type: "number", default: 1000, basic: true },
  ],
  gcp_vision_ai: [
    { key: "feature_type", label: "Feature Type", type: "select", options: ["LABEL_DETECTION", "FACE_DETECTION", "OBJECT_LOCALIZATION", "TEXT_DETECTION"], default: "LABEL_DETECTION", basic: true },
  ],
  gcp_speech: [
    { key: "language_code", label: "Language", type: "text", default: "en-US", basic: true },
    { key: "model", label: "Model", type: "select", options: ["latest_long", "latest_short", "phone_call", "video"], default: "latest_long", basic: true },
  ],
  gcp_translation: [
    { key: "source_language_code", label: "Source Language", type: "text", default: "auto", basic: true },
    { key: "target_language_code", label: "Target Language", type: "text", default: "en", basic: true },
  ],
  gcp_natural_lang: [
    { key: "document_type", label: "Document Type", type: "select", options: ["PLAIN_TEXT", "HTML"], default: "PLAIN_TEXT", basic: true },
    { key: "encodingType", label: "Encoding", type: "select", options: ["UTF8", "UTF16", "UTF32"], default: "UTF8" },
  ],

  // ── Monitoring ─────────────────────────────────────────────────────────────
  gcp_monitoring: [
    { key: "retention_days", label: "Custom Metric Retention (days)", type: "number", default: 6 * 7, basic: true },
  ],
  gcp_logging: [
    { key: "retention_days", label: "Log Retention (days)", type: "number", default: 30, basic: true },
    { key: "storage_location", label: "Storage Location", type: "text", default: "global" },
  ],
  gcp_trace: [],
  gcp_error_reporting: [],

  // ── DevOps ─────────────────────────────────────────────────────────────────
  gcp_cloud_build: [
    { key: "location", label: "Region", type: "text", default: "global", basic: true },
    { key: "machine_type", label: "Machine Type", type: "select", options: ["UNSPECIFIED", "N1_HIGHCPU_8", "N1_HIGHCPU_32", "E2_HIGHCPU_8", "E2_HIGHCPU_32"], default: "UNSPECIFIED", basic: true },
  ],
  gcp_cloud_deploy: [
    { key: "location", label: "Location", type: "text", default: "us-central1", basic: true },
  ],
  gcp_artifact_registry: [
    { key: "format", label: "Format", type: "select", options: ["DOCKER", "MAVEN", "NPM", "PYTHON", "APT", "YUM", "HELM"], default: "DOCKER", basic: true },
    { key: "location", label: "Location", type: "text", default: "us-central1", basic: true },
  ],
  gcp_source_repo: [
    { key: "name", label: "Repo Name", type: "text", default: "my-repo", basic: true },
  ],
};

export function getGcpDefaultConfig(componentType) {
  const fields = GCP_COMPONENT_CONFIGS[componentType] ?? [];
  return Object.fromEntries(fields.map((f) => [f.key, f.default ?? ""]));
}
