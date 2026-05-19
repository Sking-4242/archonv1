// On-Premises Component Library — Archon Academy
// Mirrors the shape of awsComponentLibrary.js

export const CATEGORIES = {
  datacenter: "Data Center & Facilities",
  networking: "Networking",
  compute: "Compute & Virtualization",
  storage: "Storage",
  security: "Security",
  monitoring: "Monitoring & Management",
};

export const ONPREM_COMPONENTS = [
  // ── Data Center & Facilities ─────────────────────────────────────────────────
  {
    id: "onprem_datacenter",
    name: "Data Center",
    category: "datacenter",
    icon: "🏢",
    shortDescription: "Physical facility housing servers, networking, and storage infrastructure",
    description:
      "A data center is the physical location where an organization's IT infrastructure lives. It includes the building, power infrastructure (UPS, generators, PDUs), cooling systems (CRAC/CRAH units, hot/cold aisle containment), physical security (badge access, CCTV, mantraps), and network demarcation points. Tier ratings (I–IV) define availability: Tier IV guarantees 99.995% uptime with fully redundant, fault-tolerant systems.",
    whenToUse: [
      "Hosting workloads where data sovereignty, latency, or compliance prevents cloud migration",
      "Running hardware-accelerated workloads (GPUs, FPGAs) not economically viable in the cloud",
      "Colocation: renting space and power in a managed facility for your own equipment",
    ],
    commonMistakes: [
      "Under-provisioning power capacity — always plan for future growth (2N or N+1 redundancy at minimum)",
      "Not implementing hot/cold aisle containment — mixing airflow increases cooling energy costs by 20–30%",
      "Ignoring blast radius — a single PDU or CRAC failure should never take down the entire row",
    ],
    typicalConnections: ["onprem_network_zone", "onprem_core_switch", "onprem_firewall", "onprem_ups"],
    pricingModel: "CapEx: building/space + CapEx: power infrastructure + OpEx: power/cooling/staff",
    freeTier: "N/A — capital-intensive; colocation starts ~$100–300/rack unit/month",
    docUrl: "https://uptimeinstitute.com/tiers",
  },
  {
    id: "onprem_network_zone",
    name: "Network Zone",
    category: "datacenter",
    icon: "🔲",
    shortDescription: "Logical network segment (DMZ, internal LAN, management network, etc.)",
    description:
      "A network zone is a logical grouping of systems with common security and connectivity requirements. Standard zones include: DMZ (public-facing services with limited inbound from internet), Internal LAN (user workstations and apps), Server LAN (backend servers), Management/OOB network (IPMI/iDRAC/iLO access), and Storage network (iSCSI/NFS/Fibre Channel). Zones are enforced by firewall rules and VLAN segmentation.",
    whenToUse: [
      "Isolating internet-facing services from internal systems via a DMZ",
      "Segmenting storage traffic onto a dedicated high-bandwidth, low-latency network",
      "Creating an out-of-band management network so servers can be accessed even when the main network is down",
    ],
    commonMistakes: [
      "Flattening the network into a single VLAN — lateral movement during a breach becomes trivial",
      "Not separating management traffic — admin interfaces exposed on the same network as user traffic",
      "Under-sizing inter-zone firewall capacity — DMZ firewalls often become throughput bottlenecks",
    ],
    typicalConnections: ["onprem_datacenter", "onprem_firewall", "onprem_core_switch", "onprem_server"],
    pricingModel: "No direct cost — implemented via VLAN tagging on existing switch infrastructure",
    freeTier: "N/A",
    docUrl: "https://www.sans.org/reading-room/whitepapers/firewalls/",
  },

  // ── Networking ───────────────────────────────────────────────────────────────
  {
    id: "onprem_firewall",
    name: "Firewall",
    category: "networking",
    icon: "🔥",
    shortDescription: "Next-generation firewall for network perimeter and zone enforcement",
    description:
      "An on-premises firewall enforces traffic policies between network zones and between the internal network and the internet. Next-generation firewalls (NGFWs) add application-layer inspection (Layer 7), intrusion prevention (IPS), SSL/TLS decryption, user-based policies, and threat intelligence feeds beyond basic stateful packet filtering. Common vendors: Palo Alto Networks, Fortinet, Cisco Firepower, Check Point.",
    whenToUse: [
      "Enforcing DMZ policies: allow only HTTP/HTTPS inbound, block all other traffic",
      "Deep packet inspection for detecting C2 traffic and application-layer exploits",
      "VPN termination for remote access (SSL/TLS VPN) or site-to-site IPsec tunnels to cloud",
    ],
    commonMistakes: [
      "Allowing 'any/any' rules as a troubleshooting shortcut that never gets cleaned up",
      "Not enabling IPS in blocking mode — detection-only mode logs threats but doesn't stop them",
      "Using a single firewall with no high-availability pair — the firewall is a single point of failure",
    ],
    typicalConnections: ["onprem_network_zone", "onprem_core_switch", "onprem_load_balancer", "onprem_vpn_gateway"],
    pricingModel: "CapEx: appliance hardware + OpEx: annual software/subscription license",
    freeTier: "N/A — enterprise NGFWs start at $5K–20K+ for the appliance",
    docUrl: "https://www.paloaltonetworks.com/cyberpedia/what-is-a-next-generation-firewall",
  },
  {
    id: "onprem_core_switch",
    name: "Core Switch",
    category: "networking",
    icon: "🔀",
    shortDescription: "High-bandwidth Layer 3 switch providing the data center network backbone",
    description:
      "The core switch is the central aggregation point of the data center network. In a three-tier architecture (access → distribution → core), the core handles high-speed routing between distribution switches and provides connectivity to the WAN/internet edge. Modern data centers often use a two-tier spine-leaf topology where spine switches replace both core and distribution. Core switches run at 40G/100G/400G port speeds.",
    whenToUse: [
      "Aggregating traffic from multiple distribution or leaf switches in a three-tier network",
      "Spine layer in a spine-leaf topology for east-west traffic between server racks",
      "Inter-VLAN routing for traffic flowing between network zones",
    ],
    commonMistakes: [
      "Single core switch deployment — a redundant pair (with MLAG or VSS) is the minimum for production",
      "Oversubscribing uplinks — ensure bandwidth from access to distribution to core scales proportionally",
      "Not enabling Rapid PVST+/MSTP — default STP can take 30–50 seconds to converge on a link failure",
    ],
    typicalConnections: ["onprem_network_zone", "onprem_firewall", "onprem_load_balancer", "onprem_server"],
    pricingModel: "CapEx: $20K–200K per switch depending on port density and speed",
    freeTier: "N/A",
    docUrl: "https://www.cisco.com/c/en/us/solutions/enterprise-networks/what-is-core-layer-network.html",
  },
  {
    id: "onprem_load_balancer",
    name: "Load Balancer",
    category: "networking",
    icon: "⚖️",
    shortDescription: "Hardware or software appliance distributing traffic across servers",
    description:
      "An on-premises load balancer distributes incoming connections across a pool of backend servers. Hardware appliances (F5 BIG-IP, Citrix ADC) provide the highest throughput and feature richness: SSL offload, content switching, health checks, persistence (session stickiness), and WAF. Software options (HAProxy, NGINX, Keepalived) run on commodity hardware for lower cost. ADC (Application Delivery Controller) is the modern term for advanced hardware load balancers.",
    whenToUse: [
      "Horizontally scaling web servers, application servers, or API backends behind a VIP",
      "SSL/TLS termination at the load balancer to offload crypto work from application servers",
      "Blue-green or canary deployments by shifting traffic percentages between server pools",
    ],
    commonMistakes: [
      "Single load balancer without HA pair — one appliance failure takes down all services it fronts",
      "Not configuring health checks — dead backend servers continue to receive traffic",
      "Source-IP persistence without considering NAT — many clients behind a corporate NAT share one IP",
    ],
    typicalConnections: ["onprem_firewall", "onprem_server", "onprem_virtual_machine", "onprem_core_switch"],
    pricingModel: "CapEx: $20K–200K+ for hardware ADC; or OpEx: licensing for software LB",
    freeTier: "HAProxy is open source; NGINX Open Source is free",
    docUrl: "https://www.f5.com/solutions/application-delivery",
  },
  {
    id: "onprem_vpn_gateway",
    name: "VPN Gateway",
    category: "networking",
    icon: "🔐",
    shortDescription: "IPsec/SSL VPN appliance for secure remote access and site-to-site connectivity",
    description:
      "An on-premises VPN gateway terminates IPsec tunnels for site-to-site connectivity (to branch offices or cloud providers) and SSL/TLS VPN tunnels for remote access by employees. Most NGFW vendors include VPN functionality on the same appliance. Dedicated VPN concentrators (Cisco ASA, Pulse Secure) are used when volume of VPN sessions is high.",
    whenToUse: [
      "Extending the corporate network to AWS, Azure, or GCP via a site-to-site IPsec VPN",
      "Providing employees with remote access to internal resources via client VPN (SSL/TLS)",
      "Connecting branch offices to the main data center over encrypted tunnels",
    ],
    commonMistakes: [
      "Using IKEv1 instead of IKEv2 — IKEv2 is more efficient and supports MOBIKE for mobile clients",
      "Not implementing split tunneling for remote access VPN — forcing all traffic through HQ creates a bottleneck",
      "Weak PSKs or reused PSKs across multiple tunnels — use PKI certificates for production site-to-site VPNs",
    ],
    typicalConnections: ["onprem_firewall", "onprem_core_switch", "onprem_network_zone"],
    pricingModel: "CapEx: dedicated appliance or bundled with NGFW; OpEx: annual license",
    freeTier: "OpenVPN Community is open source for SSL VPN",
    docUrl: "https://www.cisco.com/c/en/us/products/security/vpn-endpoint-security-clients/what-is-vpn.html",
  },

  // ── Compute & Virtualization ─────────────────────────────────────────────────
  {
    id: "onprem_server",
    name: "Bare Metal Server",
    category: "compute",
    icon: "🖥️",
    shortDescription: "Physical server running workloads directly on hardware without a hypervisor",
    description:
      "A bare metal server is a physical machine dedicated to a single workload, with no virtualization overhead. Common form factors: rack-mounted (1U, 2U) and blade servers in a blade chassis. Modern servers feature dual CPUs (AMD EPYC or Intel Xeon), dozens to hundreds of cores, terabytes of RAM, NVMe/SAS storage, and dual 25G/100G NICs. Use for high-performance databases, HPC, or latency-sensitive applications that can't share hardware.",
    whenToUse: [
      "Databases requiring dedicated I/O and CPU (Oracle, SAP HANA) that perform poorly under virtualization",
      "High-performance computing (HPC) workloads or GPU inference servers",
      "Applications with hardware licensing tied to physical CPU socket counts",
    ],
    commonMistakes: [
      "No redundant power supplies or dual NICs — any single hardware failure causes a full outage",
      "Overprovisioning CPU/RAM for modest workloads where a VM would be more resource-efficient",
      "Not documenting BIOS settings, RAID configurations, and firmware versions for disaster recovery",
    ],
    typicalConnections: ["onprem_network_zone", "onprem_core_switch", "onprem_san_storage", "onprem_load_balancer"],
    pricingModel: "CapEx: $5K–100K per server; OpEx: power (~$1,000–3,000/yr), rack space, maintenance",
    freeTier: "N/A",
    docUrl: "https://www.dell.com/en-us/dt/servers/index.htm",
  },
  {
    id: "onprem_virtual_machine",
    name: "Virtual Machine",
    category: "compute",
    icon: "💻",
    shortDescription: "Software-defined VM running on a hypervisor (VMware, Hyper-V, KVM)",
    description:
      "On-premises VMs run on a hypervisor layer that abstracts physical hardware. VMware vSphere/ESXi is the dominant enterprise hypervisor; Microsoft Hyper-V and KVM are common alternatives. VMs share physical CPU, RAM, and storage with other VMs on the same host, enabling higher hardware utilization. vMotion (VMware) allows live migration of running VMs between hosts without downtime.",
    whenToUse: [
      "Consolidating many workloads onto fewer physical servers (server consolidation)",
      "Rapid provisioning of new environments without physical hardware procurement",
      "Test/dev environments that can be snapshotted, cloned, and rolled back easily",
    ],
    commonMistakes: [
      "VM sprawl — unmanaged VMs proliferate, consuming licenses and resources without visibility",
      "CPU ready time — overcommitting vCPUs causes VMs to wait for physical CPU cycles, degrading performance",
      "Not configuring VM anti-affinity rules — two copies of the same app landing on the same host defeats HA",
    ],
    typicalConnections: ["onprem_hypervisor_cluster", "onprem_san_storage", "onprem_load_balancer", "onprem_network_zone"],
    pricingModel: "CapEx: VMware license per host or per vCPU + underlying server CapEx",
    freeTier: "KVM is open source; VMware ESXi has a free tier (limited features)",
    docUrl: "https://www.vmware.com/topics/glossary/content/virtual-machine.html",
  },
  {
    id: "onprem_hypervisor_cluster",
    name: "Hypervisor Cluster",
    category: "compute",
    icon: "🗂️",
    shortDescription: "Cluster of hypervisor hosts sharing compute resources for HA and load balancing",
    description:
      "A hypervisor cluster groups multiple physical ESXi or Hyper-V hosts so VMs can move between them for load balancing (DRS) and restart automatically on another host if one fails (HA). VMware vSphere DRS uses vMotion to live-migrate VMs; VMware HA restarts VMs within seconds of host failure. Clusters share a datastore (SAN/NFS) so all hosts can access all VM disk files.",
    whenToUse: [
      "Production workloads requiring automatic failover if a host fails",
      "Environments where workloads fluctuate and VMs should be balanced across hosts",
      "Maintenance: hosts can be placed in maintenance mode to migrate VMs before hardware work",
    ],
    commonMistakes: [
      "Not having enough spare capacity (N+1 minimum) — a host failure must not overcommit remaining hosts",
      "Storing VMs on local storage instead of shared datastore — vMotion and HA require shared storage",
      "Not setting VM restart priorities in HA — all VMs restart simultaneously, potentially overwhelming the remaining hosts",
    ],
    typicalConnections: ["onprem_virtual_machine", "onprem_san_storage", "onprem_core_switch"],
    pricingModel: "CapEx: vSphere + vCenter license (per socket or per core) + underlying server CapEx",
    freeTier: "Proxmox VE is open source; oVirt/RHEV has community version",
    docUrl: "https://docs.vmware.com/en/VMware-vSphere/8.0/vsphere-vcenter-esxi-management/GUID-F7818000-26E3-4E2A-93D2-FCDCE7114508.html",
  },

  // ── Storage ──────────────────────────────────────────────────────────────────
  {
    id: "onprem_san_storage",
    name: "SAN / Block Storage",
    category: "storage",
    icon: "💾",
    shortDescription: "Storage Area Network providing shared block storage to servers",
    description:
      "A SAN provides block-level storage to servers over a dedicated storage network. Fibre Channel (FC) SANs use HBAs and FC switches for high-performance, low-latency storage (sub-0.5ms). iSCSI SANs run over standard Ethernet, lowering cost. All-flash arrays (NetApp AFF, Pure Storage, Dell PowerStore) deliver consistent sub-millisecond latency and high IOPS. Use for shared datastores in VMware clusters, databases, and boot-from-SAN.",
    whenToUse: [
      "Shared storage for hypervisor clusters where VMs must be accessible from any host",
      "Databases requiring consistent low-latency block I/O (Oracle, SQL Server, PostgreSQL)",
      "Boot-from-SAN for stateless servers that boot a fresh OS image each restart",
    ],
    commonMistakes: [
      "Single SAN controller — AFA and SAN controllers should be in active-active or active-passive pairs",
      "Not zoning the FC fabric — any initiator can see any target without zoning, creating security and stability risks",
      "Under-provisioning SAN network bandwidth — 32G/64G FC or 25G/100G iSCSI NICs for heavy workloads",
    ],
    typicalConnections: ["onprem_server", "onprem_hypervisor_cluster", "onprem_backup_system"],
    pricingModel: "CapEx: $20K–1M+ for mid-range/enterprise AFA arrays + OpEx: maintenance contracts",
    freeTier: "N/A — TrueNAS (ZFS) is open source for iSCSI if budget is a constraint",
    docUrl: "https://www.netapp.com/data-storage/what-is-a-san/",
  },
  {
    id: "onprem_nas_storage",
    name: "NAS / File Storage",
    category: "storage",
    icon: "🗄️",
    shortDescription: "Network-attached storage providing shared file systems (NFS, SMB/CIFS)",
    description:
      "Network Attached Storage provides shared file systems over NFS (Linux/Unix clients) or SMB/CIFS (Windows clients). NAS is used for home directories, file shares, application data that must be accessed concurrently by multiple servers, and VMware NFS datastores. Enterprise NAS systems (NetApp ONTAP, Dell Isilon/PowerScale) support deduplication, compression, snapshots, and replication. Scale-out NAS (Isilon) adds nodes to grow capacity and throughput.",
    whenToUse: [
      "Shared file systems for multiple application servers reading the same data",
      "Home directories and department file shares for end users",
      "VMware NFS datastores as an alternative to FC SAN",
    ],
    commonMistakes: [
      "NFS without Kerberos authentication — anonymous access or AUTH_SYS provides no identity verification",
      "Exporting the root NFS share — use specific subdirectory exports with per-client access controls",
      "Not monitoring NFS connection counts — NFS servers have maximum concurrent connection limits",
    ],
    typicalConnections: ["onprem_server", "onprem_virtual_machine", "onprem_backup_system", "onprem_core_switch"],
    pricingModel: "CapEx: $5K–500K depending on capacity and features",
    freeTier: "TrueNAS CORE (ZFS-based) is open source",
    docUrl: "https://www.netapp.com/data-storage/what-is-nas/",
  },
  {
    id: "onprem_backup_system",
    name: "Backup System",
    category: "storage",
    icon: "💿",
    shortDescription: "Data protection system for backup, recovery, and replication",
    description:
      "An on-premises backup system protects data against accidental deletion, corruption, and ransomware. Enterprise backup software (Veeam, Commvault, Veritas NetBackup) manages backup jobs, schedules, retention policies, and recovery. The 3-2-1 rule: 3 copies of data, on 2 different media types, with 1 offsite (tape in a vault or cloud). Backup targets include deduplication appliances (Dell EMC Data Domain, HPE StoreOnce) and tape libraries.",
    whenToUse: [
      "Daily/weekly full and incremental backups of all VMs, databases, and file servers",
      "Immutable backups (WORM storage) to protect against ransomware encryption",
      "Replicating backups to a secondary site or cloud storage for disaster recovery",
    ],
    commonMistakes: [
      "Not testing restores — untested backups are assumptions, not guarantees; run quarterly restore drills",
      "Backup target on the same network as production — ransomware that encrypts prod will also reach the backup",
      "Not monitoring backup job success — silently failing jobs leave gaps in your data protection",
    ],
    typicalConnections: ["onprem_san_storage", "onprem_nas_storage", "onprem_server", "onprem_virtual_machine"],
    pricingModel: "CapEx: dedup appliance + OpEx: backup software licensing (per-TB or per-socket)",
    freeTier: "Veeam Community Edition free up to 10 workloads",
    docUrl: "https://www.veeam.com/products/veeam-data-platform.html",
  },

  // ── Security ─────────────────────────────────────────────────────────────────
  {
    id: "onprem_ids_ips",
    name: "IDS / IPS",
    category: "security",
    icon: "🚨",
    shortDescription: "Intrusion Detection and Prevention System for network threat detection",
    description:
      "An Intrusion Detection System (IDS) monitors network traffic for known attack signatures and anomalies, generating alerts. An Intrusion Prevention System (IPS) operates inline and can block or drop malicious traffic in real time. Modern NGFWs typically include IPS as a feature. Dedicated IDS/IPS appliances (Cisco FirePOWER, Snort/Suricata-based) provide deeper analysis. Network TAPs or SPAN ports feed traffic to out-of-band IDS sensors.",
    whenToUse: [
      "Detecting lateral movement, port scans, and exploit attempts within the internal network",
      "Compliance requirements (PCI DSS, HIPAA) mandating IDS/IPS deployment",
      "Monitoring east-west traffic between VLANs that doesn't traverse the perimeter firewall",
    ],
    commonMistakes: [
      "Running IPS in detect-only mode indefinitely — plan a timeline to move to blocking mode",
      "Not tuning rules — default signatures generate massive false-positive alert volumes",
      "Not monitoring IDS alerts — unreviewed alerts provide no security value",
    ],
    typicalConnections: ["onprem_firewall", "onprem_core_switch", "onprem_siem"],
    pricingModel: "CapEx: dedicated appliance or NGFW license; OpEx: annual signature subscription",
    freeTier: "Suricata and Snort are open source",
    docUrl: "https://www.cisco.com/c/en/us/products/security/intrusion-detection-system/what-is-intrusion-detection-system.html",
  },
  {
    id: "onprem_siem",
    name: "SIEM",
    category: "security",
    icon: "📡",
    shortDescription: "Security Information and Event Management for log collection and threat detection",
    description:
      "A SIEM aggregates logs from firewalls, servers, endpoints, and applications, correlates events across sources, and generates alerts based on rules or ML-detected anomalies. Common products: Splunk, IBM QRadar, Microsoft Sentinel, Elastic SIEM. SIEMs provide a centralized audit trail for incident response and compliance reporting. They ingest syslog, SNMP traps, Windows Event Logs, and structured log formats via agents.",
    whenToUse: [
      "Centralizing security event monitoring across all infrastructure components",
      "Meeting compliance mandates (PCI DSS, SOC 2, HIPAA) requiring log retention and monitoring",
      "Incident response: correlating events across systems to reconstruct an attack timeline",
    ],
    commonMistakes: [
      "Ingesting all logs without filtering — SIEM licensing is often per-GB; verbose logs spike costs",
      "No SOC or on-call process — a SIEM generating alerts nobody reviews is security theater",
      "Not testing alert rules with simulated attacks — untested rules have unknown false-negative rates",
    ],
    typicalConnections: ["onprem_firewall", "onprem_ids_ips", "onprem_server", "onprem_directory_services"],
    pricingModel: "OpEx: per-GB ingestion or per-asset licensing; Splunk starts at ~$150/GB/day",
    freeTier: "Elastic SIEM open source; Splunk free tier 500 MB/day",
    docUrl: "https://www.splunk.com/en_us/blog/learn/what-is-siem.html",
  },
  {
    id: "onprem_directory_services",
    name: "Directory Services",
    category: "security",
    icon: "📂",
    shortDescription: "Identity and authentication directory (Active Directory, LDAP)",
    description:
      "Directory services store user accounts, computer accounts, groups, and authentication policies for the organization. Microsoft Active Directory (AD) is the dominant enterprise solution — it provides LDAP, Kerberos authentication, DNS, Group Policy, and certificate services. OpenLDAP is the common open-source alternative. AD Domain Controllers are critical infrastructure — at least two DCs per site is the minimum for resilience.",
    whenToUse: [
      "Centralized authentication and authorization for Windows servers, workstations, and applications",
      "Single sign-on (SSO) across on-premises applications via Kerberos or NTLM",
      "LDAP integration for non-Windows applications, network devices, and VPN authentication",
    ],
    commonMistakes: [
      "Single Domain Controller — a DC failure means no logins; deploy at least two DCs per site",
      "Not protecting the AD replication account — compromised replication credentials allow DCSync attacks",
      "Domain Admin accounts used for day-to-day tasks — least privilege requires separate admin and user accounts",
    ],
    typicalConnections: ["onprem_server", "onprem_vpn_gateway", "onprem_siem", "onprem_network_zone"],
    pricingModel: "Included with Windows Server license; CapEx: server hardware for DCs",
    freeTier: "Samba 4 provides AD-compatible directory services on Linux (open source)",
    docUrl: "https://docs.microsoft.com/en-us/windows-server/identity/ad-ds/active-directory-domain-services",
  },

  // ── Monitoring & Management ───────────────────────────────────────────────────
  {
    id: "onprem_monitoring",
    name: "Infrastructure Monitoring",
    category: "monitoring",
    icon: "📈",
    shortDescription: "Network and server monitoring system (Nagios, Zabbix, PRTG, Prometheus)",
    description:
      "On-premises monitoring systems collect metrics, check service availability, and generate alerts when thresholds are breached. Legacy tools (Nagios, Zabbix, PRTG) use agents or SNMP polling. Modern stacks (Prometheus + Grafana) use a pull model with exporters. They monitor CPU, memory, disk, network utilization, process health, service port checks, and hardware sensor data (temperature, fan speed, PSU status).",
    whenToUse: [
      "Real-time visibility into server and network device health across the data center",
      "Alerting on-call staff when services, network links, or hardware show degraded health",
      "Capacity planning: trending resource utilization over weeks and months",
    ],
    commonMistakes: [
      "Alert fatigue — too many low-priority alerts cause staff to ignore the monitoring system entirely",
      "Monitoring the monitoring system on the same infrastructure — use a separate monitoring host",
      "Not testing alerts — a misconfigured SMTP relay means alerts never reach on-call staff",
    ],
    typicalConnections: ["onprem_server", "onprem_core_switch", "onprem_firewall", "onprem_hypervisor_cluster"],
    pricingModel: "OpEx: PRTG sensor-based licensing; Zabbix/Prometheus/Nagios Core are open source",
    freeTier: "Zabbix, Nagios Core, and Prometheus are open source and free",
    docUrl: "https://www.zabbix.com/documentation/current/en/manual",
  },
  {
    id: "onprem_cmdb",
    name: "CMDB / Asset Management",
    category: "monitoring",
    icon: "🗂️",
    shortDescription: "Configuration Management Database tracking all IT assets and their relationships",
    description:
      "A CMDB is the authoritative source of truth for all IT assets (Configuration Items or CIs): servers, VMs, network devices, software licenses, and their relationships. It underpins ITIL processes: change management (what does this change affect?), incident management (what is the blast radius?), and problem management (which assets share this failure pattern?). Common tools: ServiceNow, iTop, NetBox (open source, network-focused).",
    whenToUse: [
      "Tracking hardware lifecycle: purchase date, warranty expiration, end-of-life schedule",
      "Change management: identifying affected systems before a planned change window",
      "Software license compliance: tracking installed licenses vs entitlements",
    ],
    commonMistakes: [
      "Manual-only data entry — stale CMDBs are worse than no CMDB because decisions are made on bad data",
      "Tracking every attribute vs the key ones — over-engineering the CI schema makes updates painful",
      "No change process to keep the CMDB current after each installation, decommission, or modification",
    ],
    typicalConnections: ["onprem_server", "onprem_monitoring", "onprem_hypervisor_cluster"],
    pricingModel: "OpEx: ServiceNow per-user licensing; NetBox is open source",
    freeTier: "NetBox (open source); iTop Community Edition",
    docUrl: "https://netbox.dev/",
  },
  {
    id: "onprem_ups",
    name: "UPS / Power Infrastructure",
    category: "monitoring",
    icon: "🔋",
    shortDescription: "Uninterruptible Power Supply and power distribution for the data center",
    description:
      "Power infrastructure in a data center includes UPS (battery backup for bridge power during utility outages), generators (long-duration backup power), and PDUs (Power Distribution Units) that distribute power to equipment racks. Dual-corded servers plugged into two independent PDUs and UPS circuits (A+B power) eliminate single-point-of-failure power paths. The UPS sends SNMP traps to monitoring systems when on battery power.",
    whenToUse: [
      "Ensuring all production servers have dual-corded, redundant power paths (A+B circuits)",
      "Monitoring UPS battery health, load percentage, and estimated runtime via SNMP",
      "Generator testing: regular scheduled tests ensure the generator starts under load",
    ],
    commonMistakes: [
      "Single-corded servers plugged into one PDU — one PDU failure or UPS failure causes a server outage",
      "Not tracking UPS battery age — lead-acid batteries degrade after 3–5 years regardless of use",
      "Generator fuel not monitored — a generator that runs out of diesel during a long outage provides no protection",
    ],
    typicalConnections: ["onprem_datacenter", "onprem_server", "onprem_monitoring"],
    pricingModel: "CapEx: $500–50K per UPS depending on kVA rating; OpEx: battery replacement every 3–5 years",
    freeTier: "N/A — NUT (Network UPS Tools) is open source for SNMP monitoring",
    docUrl: "https://networkupstools.org/",
  },
];

export function getComponentInfo(id) {
  return ONPREM_COMPONENTS.find((c) => c.id === id) ?? null;
}
