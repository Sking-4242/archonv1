export const ONPREM_COMPONENT_CONFIGS = {
  // ── Networking ─────────────────────────────────────────────────────────────
  onprem_network_zone: [
    { key: "cidr", label: "CIDR", type: "text", default: "10.0.0.0/8", basic: true },
    { key: "zone_type", label: "Zone Type", type: "select", options: ["DMZ", "Internal", "Management", "Production"], default: "Internal", basic: true },
  ],
  onprem_vlan: [
    { key: "vlan_id", label: "VLAN ID", type: "number", default: 100, basic: true },
    { key: "cidr", label: "CIDR", type: "text", default: "192.168.1.0/24", basic: true },
  ],
  onprem_firewall: [
    { key: "vendor", label: "Vendor", type: "select", options: ["Palo Alto", "Fortinet", "Cisco ASA", "pfSense", "iptables"], default: "iptables", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "boolean", default: false, basic: true },
  ],
  onprem_load_balancer: [
    { key: "type", label: "Type", type: "select", options: ["HAProxy", "NGINX", "F5", "Keepalived"], default: "HAProxy", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "boolean", default: true, basic: true },
    { key: "algorithm", label: "Algorithm", type: "select", options: ["round_robin", "least_conn", "ip_hash"], default: "round_robin", basic: true },
  ],
  onprem_router: [
    { key: "vendor", label: "Vendor", type: "text", default: "Cisco", basic: true },
    { key: "routing_protocol", label: "Routing Protocol", type: "select", options: ["static", "OSPF", "BGP"], default: "static", basic: true },
  ],
  onprem_switch: [
    { key: "vendor", label: "Vendor", type: "text", default: "Cisco", basic: true },
    { key: "port_count", label: "Ports", type: "number", default: 48, basic: true },
    { key: "layer", label: "Layer", type: "select", options: ["L2", "L3"], default: "L2", basic: true },
  ],
  onprem_dns: [
    { key: "software", label: "Software", type: "select", options: ["BIND", "Unbound", "Windows DNS", "CoreDNS"], default: "BIND", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "boolean", default: true, basic: true },
  ],
  onprem_proxy: [
    { key: "software", label: "Software", type: "select", options: ["NGINX", "HAProxy", "Squid", "Traefik"], default: "NGINX", basic: true },
    { key: "mode", label: "Mode", type: "select", options: ["forward", "reverse", "transparent"], default: "reverse", basic: true },
    { key: "tls_termination", label: "TLS Termination", type: "boolean", default: true, basic: true },
  ],
  onprem_vpn: [
    { key: "software", label: "Software", type: "select", options: ["WireGuard", "OpenVPN", "IPsec (StrongSwan)", "Cisco AnyConnect"], default: "WireGuard", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "boolean", default: false, basic: true },
    { key: "split_tunnel", label: "Split Tunnel", type: "boolean", default: true },
  ],
  onprem_ids_ips: [
    { key: "software", label: "Software", type: "select", options: ["Snort", "Suricata", "Zeek", "OSSEC"], default: "Suricata", basic: true },
    { key: "mode", label: "Mode", type: "select", options: ["IDS", "IPS", "Hybrid"], default: "IPS", basic: true },
  ],

  // ── Compute ────────────────────────────────────────────────────────────────
  onprem_bare_metal: [
    { key: "cpu_cores", label: "CPU Cores", type: "number", default: 16, basic: true },
    { key: "ram_gb", label: "RAM (GB)", type: "number", default: 64, basic: true },
    { key: "os", label: "OS", type: "text", default: "Ubuntu 22.04 LTS", basic: true },
  ],
  onprem_vm: [
    { key: "hypervisor", label: "Hypervisor", type: "select", options: ["VMware vSphere", "KVM", "Hyper-V", "Proxmox"], default: "VMware vSphere", basic: true },
    { key: "vcpus", label: "vCPUs", type: "number", default: 4, basic: true },
    { key: "ram_gb", label: "RAM (GB)", type: "number", default: 8, basic: true },
    { key: "os", label: "OS", type: "text", default: "Ubuntu 22.04 LTS", basic: true },
  ],
  onprem_k8s: [
    { key: "distribution", label: "Distribution", type: "select", options: ["kubeadm", "k3s", "RKE2", "OpenShift"], default: "kubeadm", basic: true },
    { key: "control_plane_nodes", label: "Control Plane Nodes", type: "number", default: 3, basic: true },
    { key: "worker_nodes", label: "Worker Nodes", type: "number", default: 5, basic: true },
  ],
  onprem_container: [
    { key: "runtime", label: "Container Runtime", type: "select", options: ["Docker", "containerd", "Podman"], default: "containerd", basic: true },
    { key: "vcpus", label: "vCPUs", type: "number", default: 4, basic: true },
    { key: "ram_gb", label: "RAM (GB)", type: "number", default: 8, basic: true },
  ],
  onprem_hyperconverged: [
    { key: "software", label: "Software", type: "select", options: ["Nutanix AOS", "VMware vSAN", "StarWind HCI", "Proxmox VE"], default: "Nutanix AOS", basic: true },
    { key: "node_count", label: "Node Count", type: "number", default: 4, basic: true },
    { key: "cpu_per_node", label: "CPUs per Node", type: "number", default: 16, basic: true },
    { key: "ram_per_node_gb", label: "RAM per Node (GB)", type: "number", default: 128, basic: true },
    { key: "storage_per_node_tb", label: "Storage per Node (TB)", type: "number", default: 4 },
  ],
  onprem_gpu_server: [
    { key: "gpu_model", label: "GPU Model", type: "select", options: ["NVIDIA H100", "NVIDIA A100", "NVIDIA A10", "NVIDIA RTX 4090", "AMD MI300X"], default: "NVIDIA A100", basic: true },
    { key: "gpu_count", label: "GPU Count", type: "number", default: 4, basic: true },
    { key: "cpu_cores", label: "CPU Cores", type: "number", default: 64, basic: true },
    { key: "ram_gb", label: "RAM (GB)", type: "number", default: 512, basic: true },
  ],

  // ── Storage ────────────────────────────────────────────────────────────────
  onprem_san: [
    { key: "vendor", label: "Vendor", type: "text", default: "NetApp", basic: true },
    { key: "protocol", label: "Protocol", type: "select", options: ["iSCSI", "FC", "NVMe-oF"], default: "iSCSI", basic: true },
    { key: "capacity_tb", label: "Capacity (TB)", type: "number", default: 10, basic: true },
    { key: "raid_level", label: "RAID Level", type: "select", options: ["RAID-1", "RAID-5", "RAID-6", "RAID-10"], default: "RAID-6" },
  ],
  onprem_nas: [
    { key: "vendor", label: "Vendor", type: "text", default: "Synology", basic: true },
    { key: "protocol", label: "Protocol", type: "select", options: ["NFS", "SMB/CIFS", "NFS+SMB"], default: "NFS", basic: true },
    { key: "capacity_tb", label: "Capacity (TB)", type: "number", default: 5, basic: true },
  ],
  onprem_object_store: [
    { key: "software", label: "Software", type: "select", options: ["MinIO", "Ceph", "OpenStack Swift"], default: "MinIO", basic: true },
    { key: "capacity_tb", label: "Capacity (TB)", type: "number", default: 10, basic: true },
    { key: "replication", label: "Replication Factor", type: "number", default: 3 },
  ],
  onprem_backup_server: [
    { key: "software", label: "Software", type: "select", options: ["Veeam", "Bacula", "Amanda", "Duplicati", "Restic"], default: "Veeam", basic: true },
    { key: "retention_days", label: "Retention (days)", type: "number", default: 30, basic: true },
    { key: "capacity_tb", label: "Capacity (TB)", type: "number", default: 20, basic: true },
  ],
  onprem_tape_library: [
    { key: "vendor", label: "Vendor", type: "text", default: "IBM", basic: true },
    { key: "slots", label: "Tape Slots", type: "number", default: 40, basic: true },
    { key: "tape_format", label: "Tape Format", type: "select", options: ["LTO-8", "LTO-9", "LTO-Ultrium 7"], default: "LTO-9" },
  ],

  // ── Database ───────────────────────────────────────────────────────────────
  onprem_postgres: [
    { key: "version", label: "Version", type: "select", options: ["16", "15", "14", "13"], default: "15", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "select", options: ["standalone", "streaming_replication", "patroni"], default: "streaming_replication", basic: true },
    { key: "port", label: "Port", type: "number", default: 5432, basic: true },
  ],
  onprem_mysql: [
    { key: "version", label: "Version", type: "text", default: "8.0", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "select", options: ["standalone", "replication", "galera_cluster"], default: "replication", basic: true },
    { key: "port", label: "Port", type: "number", default: 3306, basic: true },
  ],
  onprem_mssql: [
    { key: "version", label: "Version", type: "select", options: ["SQL Server 2022", "SQL Server 2019", "SQL Server 2017"], default: "SQL Server 2022", basic: true },
    { key: "edition", label: "Edition", type: "select", options: ["Express", "Developer", "Standard", "Enterprise"], default: "Standard", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "select", options: ["standalone", "AlwaysOn AG", "Failover Cluster"], default: "standalone", basic: true },
    { key: "port", label: "Port", type: "number", default: 1433, basic: true },
  ],
  onprem_redis: [
    { key: "version", label: "Version", type: "text", default: "7.0", basic: true },
    { key: "mode", label: "Mode", type: "select", options: ["standalone", "sentinel", "cluster"], default: "sentinel", basic: true },
    { key: "port", label: "Port", type: "number", default: 6379, basic: true },
  ],
  onprem_elasticsearch: [
    { key: "version", label: "Version", type: "text", default: "8.x", basic: true },
    { key: "node_count", label: "Nodes", type: "number", default: 3, basic: true },
    { key: "port", label: "Port", type: "number", default: 9200, basic: true },
  ],
  onprem_mongodb: [
    { key: "version", label: "Version", type: "text", default: "7.0", basic: true },
    { key: "mode", label: "Mode", type: "select", options: ["standalone", "replica_set", "sharded"], default: "replica_set", basic: true },
    { key: "replica_set_members", label: "Replica Set Members", type: "number", default: 3, basic: true },
    { key: "port", label: "Port", type: "number", default: 27017, basic: true },
  ],
  onprem_cassandra: [
    { key: "version", label: "Version", type: "text", default: "4.1", basic: true },
    { key: "node_count", label: "Nodes", type: "number", default: 3, basic: true },
    { key: "replication_factor", label: "Replication Factor", type: "number", default: 3, basic: true },
    { key: "port", label: "Port", type: "number", default: 9042, basic: true },
  ],

  // ── Security ───────────────────────────────────────────────────────────────
  onprem_idp: [
    { key: "type", label: "Type", type: "select", options: ["Active Directory", "OpenLDAP", "Keycloak", "FreeIPA"], default: "Active Directory", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "boolean", default: true, basic: true },
  ],
  onprem_vault: [
    { key: "software", label: "Software", type: "select", options: ["HashiCorp Vault", "Hardware HSM", "CyberArk"], default: "HashiCorp Vault", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "boolean", default: true, basic: true },
  ],
  onprem_waf: [
    { key: "software", label: "Software", type: "select", options: ["ModSecurity", "Nginx WAF", "F5 ASM"], default: "ModSecurity", basic: true },
  ],
  onprem_siem: [
    { key: "software", label: "Software", type: "select", options: ["Splunk", "IBM QRadar", "Elastic SIEM", "Wazuh", "Microsoft Sentinel On-Prem"], default: "Elastic SIEM", basic: true },
    { key: "retention_days", label: "Log Retention (days)", type: "number", default: 90, basic: true },
  ],
  onprem_pam: [
    { key: "software", label: "Software", type: "select", options: ["CyberArk", "BeyondTrust", "HashiCorp Vault", "Thycotic"], default: "CyberArk", basic: true },
    { key: "session_recording", label: "Session Recording", type: "boolean", default: true, basic: true },
  ],
  onprem_ca: [
    { key: "software", label: "Software", type: "select", options: ["CFSSL", "OpenSSL", "HashiCorp Vault PKI", "Windows CA", "EJBCA"], default: "HashiCorp Vault PKI", basic: true },
    { key: "key_algorithm", label: "Key Algorithm", type: "select", options: ["RSA-2048", "RSA-4096", "ECDSA-P256", "ECDSA-P384"], default: "RSA-2048", basic: true },
  ],

  // ── Integration ────────────────────────────────────────────────────────────
  onprem_message_broker: [
    { key: "software", label: "Software", type: "select", options: ["Apache Kafka", "RabbitMQ", "ActiveMQ"], default: "Apache Kafka", basic: true },
    { key: "node_count", label: "Nodes", type: "number", default: 3, basic: true },
  ],
  onprem_api_gateway: [
    { key: "software", label: "Software", type: "select", options: ["Kong", "NGINX", "Traefik", "Ambassador"], default: "Kong", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "boolean", default: true, basic: true },
  ],
  onprem_service_mesh: [
    { key: "software", label: "Software", type: "select", options: ["Istio", "Linkerd", "Consul Connect", "Kuma"], default: "Istio", basic: true },
    { key: "mtls_enabled", label: "mTLS Enabled", type: "boolean", default: true, basic: true },
  ],
  onprem_etl: [
    { key: "software", label: "Software", type: "select", options: ["Apache Airflow", "Apache Spark", "Luigi", "Prefect"], default: "Apache Airflow", basic: true },
    { key: "worker_count", label: "Worker Count", type: "number", default: 3, basic: true },
  ],

  // ── Observability ──────────────────────────────────────────────────────────
  onprem_monitoring: [
    { key: "stack", label: "Stack", type: "select", options: ["Prometheus + Grafana", "ELK Stack", "Zabbix", "Nagios"], default: "Prometheus + Grafana", basic: true },
  ],
  onprem_log_aggregator: [
    { key: "software", label: "Software", type: "select", options: ["ELK Stack", "Loki + Grafana", "Fluentd", "Graylog"], default: "ELK Stack", basic: true },
    { key: "retention_days", label: "Retention (days)", type: "number", default: 30, basic: true },
  ],
  onprem_tracing: [
    { key: "software", label: "Software", type: "select", options: ["Jaeger", "Zipkin", "Tempo", "SkyWalking"], default: "Jaeger", basic: true },
    { key: "sampling_rate", label: "Sampling Rate (%)", type: "number", default: 5 },
  ],

  // ── DevOps ─────────────────────────────────────────────────────────────────
  onprem_ci_cd: [
    { key: "software", label: "Software", type: "select", options: ["Jenkins", "GitLab CI", "Tekton", "Drone"], default: "Jenkins", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "boolean", default: false, basic: true },
  ],
  onprem_artifact_repo: [
    { key: "software", label: "Software", type: "select", options: ["Nexus Repository", "JFrog Artifactory", "Gitea Packages", "Harbor"], default: "Nexus Repository", basic: true },
    { key: "capacity_tb", label: "Storage (TB)", type: "number", default: 2, basic: true },
  ],
  onprem_git_server: [
    { key: "software", label: "Software", type: "select", options: ["Gitea", "Gogs", "GitLab CE", "Gitolite"], default: "Gitea", basic: true },
    { key: "ha_mode", label: "HA Mode", type: "boolean", default: false, basic: true },
  ],
  onprem_config_mgmt: [
    { key: "software", label: "Software", type: "select", options: ["Ansible", "Puppet", "Chef", "SaltStack"], default: "Ansible", basic: true },
    { key: "managed_node_count", label: "Managed Nodes", type: "number", default: 50, basic: true },
  ],
};
