// GCP Component Library — Archon Academy
// Mirrors the shape of awsComponentLibrary.js

export const CATEGORIES = {
  networking: "Networking",
  compute: "Compute",
  storage: "Storage & Database",
  security: "Security & Identity",
  dataAnalytics: "Data & Analytics",
  monitoring: "Monitoring & Ops",
};

export const GCP_COMPONENTS = [
  // ── Networking ──────────────────────────────────────────────────────────────
  {
    id: "google_vpc",
    name: "VPC Network",
    category: "networking",
    icon: "🌐",
    shortDescription: "Virtual Private Cloud network for isolating GCP resources",
    description:
      "Google Cloud VPC provides a global, scalable, and flexible virtual network for your GCP resources. Unlike AWS VPCs, GCP VPCs are global by default — subnets are regional, but a single VPC spans all regions. Resources in the same VPC can communicate privately regardless of region.",
    whenToUse: [
      "Creating any private network boundary in GCP",
      "Isolating workloads across projects using Shared VPC",
      "Connecting to on-premises via Cloud VPN or Cloud Interconnect",
    ],
    commonMistakes: [
      "Forgetting that GCP VPCs are global — subnets must be created per region",
      "Not enabling Private Google Access on subnets that need to reach Google APIs without a public IP",
      "Confusing auto-mode VPCs (subnets in every region) with custom-mode VPCs (subnets you define)",
    ],
    typicalConnections: ["google_subnet", "google_compute_engine", "google_gke", "google_cloud_sql"],
    pricingModel: "Free — you pay for egress traffic and premium networking features",
    freeTier: "VPC itself is free; 1 GB/month free egress within same region",
    docUrl: "https://cloud.google.com/vpc/docs/overview",
  },
  {
    id: "google_subnet",
    name: "Subnet",
    category: "networking",
    icon: "🔲",
    shortDescription: "Regional IP range within a VPC Network",
    description:
      "Subnets in GCP are regional resources that carve IP ranges out of a VPC. Each subnet lives in one region and can span multiple zones. Resources in a subnet share the same IP range and firewall rules apply at the VPC level (not the subnet level, unlike AWS).",
    whenToUse: [
      "Segmenting your VPC into logical regions (us-central1, europe-west1, etc.)",
      "Isolating workloads into private vs public-facing tiers",
      "Enabling VPC Flow Logs for a specific regional segment",
    ],
    commonMistakes: [
      "Creating subnets in auto-mode VPCs without realizing they use pre-defined /20 ranges",
      "Not enabling Private Google Access when Compute instances need to reach Google APIs without external IPs",
      "Overlapping CIDR ranges when connecting multiple VPCs via VPC Peering",
    ],
    typicalConnections: ["google_vpc", "google_compute_engine", "google_gke", "google_cloud_run"],
    pricingModel: "Free",
    freeTier: "Always free",
    docUrl: "https://cloud.google.com/vpc/docs/subnets",
  },
  {
    id: "google_cloud_load_balancing",
    name: "Cloud Load Balancing",
    category: "networking",
    icon: "⚖️",
    shortDescription: "Global, regional, and internal load balancers for any traffic type",
    description:
      "GCP Cloud Load Balancing is a fully distributed, software-defined managed service. It includes multiple products: External HTTP(S) LB (global, Layer 7), Internal HTTP(S) LB, External TCP/UDP Network LB, and Internal TCP/UDP LB. The global external LB is Anycast — a single IP routes to the closest healthy backend worldwide.",
    whenToUse: [
      "Distributing HTTP/S web traffic globally with a single IP address",
      "Balancing internal microservice traffic without an external IP",
      "Terminating SSL at the edge with Google-managed certificates",
    ],
    commonMistakes: [
      "Using a regional LB when you need global Anycast (only the global external LB provides a single global IP)",
      "Not configuring health checks — unhealthy backends will still receive traffic",
      "Forgetting that the global external HTTP LB requires backends in NEGs or managed instance groups",
    ],
    typicalConnections: ["google_compute_engine", "google_gke", "google_cloud_run", "google_cloud_armor"],
    pricingModel: "Per forwarding rule + per GB processed",
    freeTier: "None — billed from first rule",
    docUrl: "https://cloud.google.com/load-balancing/docs/load-balancing-overview",
  },
  {
    id: "google_cloud_dns",
    name: "Cloud DNS",
    category: "networking",
    icon: "🗂️",
    shortDescription: "Managed, authoritative DNS service with 100% SLA",
    description:
      "Cloud DNS is a scalable, reliable, and managed authoritative DNS service running on Google's infrastructure. It supports public zones (globally accessible) and private zones (accessible only within your VPC). Cloud DNS integrates with GKE for automatic service discovery.",
    whenToUse: [
      "Hosting authoritative DNS for your domain on Google's anycast infrastructure",
      "Creating private DNS zones for internal service discovery within a VPC",
      "Forwarding DNS queries from GCP to on-premises resolvers via DNS peering",
    ],
    commonMistakes: [
      "Not delegating NS records at your registrar after creating a Cloud DNS zone",
      "Forgetting that private zones must be associated with a specific VPC to be visible",
      "Confusing Cloud DNS with Cloud Domains (registrar) — Cloud DNS is authoritative only",
    ],
    typicalConnections: ["google_vpc", "google_cloud_load_balancing", "google_compute_engine"],
    pricingModel: "Per managed zone + per million queries",
    freeTier: "None",
    docUrl: "https://cloud.google.com/dns/docs/overview",
  },
  {
    id: "google_cloud_vpn",
    name: "Cloud VPN",
    category: "networking",
    icon: "🔐",
    shortDescription: "IPsec VPN tunnel connecting GCP VPC to on-premises or other clouds",
    description:
      "Cloud VPN securely connects your on-premises network or another cloud provider's VPC to your GCP VPC through an IPsec VPN tunnel. HA VPN is the recommended option — it provides 99.99% SLA with two VPN tunnels to two Google VPN gateways.",
    whenToUse: [
      "Connecting an on-premises data center to GCP without the cost of Cloud Interconnect",
      "Creating a hybrid network during cloud migration",
      "Connecting two GCP VPCs in different projects or regions where VPC Peering isn't appropriate",
    ],
    commonMistakes: [
      "Using Classic VPN (single interface, 99.9% SLA) when HA VPN (99.99%) is required",
      "Not configuring BGP with Cloud Router — static routing doesn't handle failover automatically",
      "Forgetting that VPN throughput is limited (~3 Gbps per tunnel) — use Interconnect for higher bandwidth",
    ],
    typicalConnections: ["google_vpc", "google_cloud_router"],
    pricingModel: "Per tunnel-hour + per GB processed",
    freeTier: "None",
    docUrl: "https://cloud.google.com/network-connectivity/docs/vpn/concepts/overview",
  },

  // ── Compute ──────────────────────────────────────────────────────────────────
  {
    id: "google_compute_engine",
    name: "Compute Engine",
    category: "compute",
    icon: "🖥️",
    shortDescription: "Virtual machines running in Google's data centers",
    description:
      "Google Compute Engine (GCE) provides configurable VMs with a wide range of machine families: general-purpose (E2, N2), compute-optimized (C2, C3), memory-optimized (M1, M2, M3), and GPU/accelerator-optimized. VMs are zonal resources and support live migration between host hardware, minimizing downtime during host maintenance.",
    whenToUse: [
      "Running workloads that require specific OS configuration, custom kernels, or GPU access",
      "Lift-and-shift migration from on-premises servers",
      "Long-running compute that doesn't fit a container or serverless model",
    ],
    commonMistakes: [
      "Using N1 general-purpose VMs when E2 machines are significantly cheaper for the same specs",
      "Not enabling Spot VMs for fault-tolerant batch workloads — up to 91% cheaper",
      "Forgetting that VMs are zonal — place them in multiple zones for high availability using managed instance groups",
    ],
    typicalConnections: ["google_vpc", "google_subnet", "google_cloud_load_balancing", "google_persistent_disk"],
    pricingModel: "Per second billed (1-minute minimum) based on machine type and region; Spot VMs up to 91% cheaper",
    freeTier: "1 e2-micro VM/month in select regions (us-west1, us-central1, us-east1)",
    docUrl: "https://cloud.google.com/compute/docs/overview",
  },
  {
    id: "google_gke",
    name: "Google Kubernetes Engine",
    category: "compute",
    icon: "☸️",
    shortDescription: "Managed Kubernetes cluster service",
    description:
      "GKE is Google's managed Kubernetes service. It runs the most popular open-source container orchestrator with Google handling the control plane, upgrades, and security patching. GKE offers Autopilot mode (Google manages all nodes) and Standard mode (you manage node pools). GKE pioneered many Kubernetes features (horizontal pod autoscaling, cluster autoscaler, etc.) that are now upstream.",
    whenToUse: [
      "Deploying containerized microservices that need auto-scaling, rolling updates, and service discovery",
      "Running stateful workloads using persistent volumes with fine-grained scheduling control",
      "Multi-tenant workloads where namespace isolation and RBAC are required",
    ],
    commonMistakes: [
      "Using Standard mode when Autopilot covers your use case — Autopilot is cheaper and lower-ops",
      "Not enabling Workload Identity — running pods with node SA permissions is a security risk",
      "Creating clusters without release channels, missing automatic security patch upgrades",
    ],
    typicalConnections: ["google_vpc", "google_cloud_load_balancing", "google_cloud_sql", "google_artifact_registry"],
    pricingModel: "Cluster management fee ($0.10/hr for Standard) + node VM costs; Autopilot billed per pod resource",
    freeTier: "One Autopilot or Zonal Standard cluster per month free (cluster fee only)",
    docUrl: "https://cloud.google.com/kubernetes-engine/docs/concepts/kubernetes-engine-overview",
  },
  {
    id: "google_cloud_run",
    name: "Cloud Run",
    category: "compute",
    icon: "🏃",
    shortDescription: "Fully managed serverless container platform",
    description:
      "Cloud Run runs stateless containers on a fully managed serverless platform. It scales from zero to thousands of instances in seconds and bills only for the CPU and memory used during request processing. Cloud Run services handle HTTP requests; Cloud Run Jobs handle batch/one-off tasks. It runs any container — no framework lock-in.",
    whenToUse: [
      "Deploying web APIs, webhooks, or microservices that have variable or unpredictable traffic",
      "Running short-lived batch jobs triggered by Pub/Sub or Cloud Scheduler",
      "Containerized workloads where you want zero infrastructure management",
    ],
    commonMistakes: [
      "Forgetting that Cloud Run services are stateless — use Cloud SQL, Firestore, or GCS for state",
      "Not setting min-instances for latency-sensitive services — cold starts can add hundreds of ms",
      "Sending long-running requests without raising the timeout (default 60s, max 3600s for services)",
    ],
    typicalConnections: ["google_cloud_sql", "google_pub_sub", "google_cloud_load_balancing", "google_secret_manager"],
    pricingModel: "Per vCPU-second + per GB-second + per request; billed only during request handling",
    freeTier: "2M requests/month, 360K vCPU-seconds, 180K GB-seconds, 1 GB egress",
    docUrl: "https://cloud.google.com/run/docs/overview/what-is-cloud-run",
  },
  {
    id: "google_cloud_functions",
    name: "Cloud Functions",
    category: "compute",
    icon: "⚡",
    shortDescription: "Event-driven serverless functions (FaaS)",
    description:
      "Cloud Functions is GCP's function-as-a-service platform. Gen 2 functions (recommended) are built on Cloud Run and support longer timeouts (up to 60 minutes), concurrency, and traffic splitting. Triggers include HTTP, Pub/Sub, Eventarc (Firestore changes, GCS events, Audit Logs), and Cloud Scheduler. Supports Node.js, Python, Go, Java, Ruby, PHP, and .NET.",
    whenToUse: [
      "Reacting to GCP events (file uploaded to GCS, document written to Firestore)",
      "Lightweight HTTP endpoints or webhooks without container overhead",
      "Glue logic between GCP services in an event-driven pipeline",
    ],
    commonMistakes: [
      "Using Gen 1 functions for new projects — Gen 2 has better performance and longer timeouts",
      "Storing state in global variables without understanding instance reuse behavior",
      "Not setting GOOGLE_CLOUD_PROJECT environment variable — some SDKs require it explicitly",
    ],
    typicalConnections: ["google_pub_sub", "google_cloud_storage", "google_firestore", "google_secret_manager"],
    pricingModel: "Per invocation + per GB-second + per GHz-second of compute",
    freeTier: "2M invocations/month, 400K GB-seconds, 200K GHz-seconds, 5 GB egress",
    docUrl: "https://cloud.google.com/functions/docs/concepts/overview",
  },

  // ── Storage & Database ───────────────────────────────────────────────────────
  {
    id: "google_cloud_storage",
    name: "Cloud Storage",
    category: "storage",
    icon: "🪣",
    shortDescription: "Globally unified object storage for any amount of data",
    description:
      "Google Cloud Storage (GCS) is an object store with 11 nines of durability. It offers four storage classes: Standard (frequent access), Nearline (access <1/month), Coldline (access <1/quarter), and Archive (access <1/year). Buckets are globally unique by name; objects are stored regionally, dual-regionally, or multi-regionally. GCS integrates natively with all GCP data services.",
    whenToUse: [
      "Storing static assets, media files, backups, and data exports",
      "Data lake landing zone for BigQuery, Dataflow, and Dataproc",
      "Serving static websites or distributing large files via signed URLs",
    ],
    commonMistakes: [
      "Using Standard class for archival data — Coldline/Archive is up to 90% cheaper",
      "Making buckets public without understanding that all objects become world-readable",
      "Not enabling uniform bucket-level access — object-level ACLs create inconsistent permissions",
    ],
    typicalConnections: ["google_bigquery", "google_cloud_functions", "google_dataflow", "google_compute_engine"],
    pricingModel: "Per GB stored + per operation + per GB egress; storage class affects price",
    freeTier: "5 GB Standard storage, 5K Class A ops, 50K Class B ops, 1 GB egress to North America",
    docUrl: "https://cloud.google.com/storage/docs/introduction",
  },
  {
    id: "google_cloud_sql",
    name: "Cloud SQL",
    category: "storage",
    icon: "🗄️",
    shortDescription: "Fully managed relational database (MySQL, PostgreSQL, SQL Server)",
    description:
      "Cloud SQL is a fully managed relational database service supporting MySQL, PostgreSQL, and SQL Server. It handles patching, backups, replication, and failover automatically. Cloud SQL instances are zonal with optional high-availability (HA) standby in a second zone. The Auth Proxy is the recommended connection method — it handles IAM auth and TLS without managing certificates.",
    whenToUse: [
      "Applications that require a managed relational database without managing infrastructure",
      "Migrating on-premises MySQL or PostgreSQL workloads to GCP",
      "Backend databases for GKE, Cloud Run, or App Engine services",
    ],
    commonMistakes: [
      "Not enabling automated backups and point-in-time recovery (PITR) for production instances",
      "Connecting directly with username/password over the internet instead of using the Auth Proxy",
      "Using a single-zone instance for production — enable HA for automatic failover",
    ],
    typicalConnections: ["google_compute_engine", "google_gke", "google_cloud_run", "google_vpc"],
    pricingModel: "Per vCPU/hour + per GB RAM/hour + per GB storage; HA doubles instance cost",
    freeTier: "None — $0 tier requires Cloud SQL Studio (trial only)",
    docUrl: "https://cloud.google.com/sql/docs/introduction",
  },
  {
    id: "google_bigquery",
    name: "BigQuery",
    category: "storage",
    icon: "📊",
    shortDescription: "Serverless, petabyte-scale data warehouse and analytics engine",
    description:
      "BigQuery is GCP's fully managed, serverless data warehouse. It separates compute from storage — you pay for queries run (on-demand) or reserve slots (flat-rate). BigQuery ML allows training ML models with SQL. BigQuery Omni extends queries to AWS S3 and Azure Blob. The columnar storage engine (Capacitor) enables sub-second queries on trillions of rows.",
    whenToUse: [
      "Analyzing large datasets with SQL without provisioning or managing servers",
      "Building a data warehouse or data lake with ad-hoc query capability",
      "Running ML models on structured data using BigQuery ML",
    ],
    commonMistakes: [
      "Using SELECT * — BigQuery bills by bytes scanned; always select only needed columns",
      "Not partitioning tables by date and clustering by high-cardinality columns for large datasets",
      "Running expensive queries in production without using query cost estimates first",
    ],
    typicalConnections: ["google_cloud_storage", "google_pub_sub", "google_dataflow", "google_looker_studio"],
    pricingModel: "On-demand: $5/TB queried; storage $0.02/GB/month active; flat-rate slots for predictable cost",
    freeTier: "10 GB storage, 1 TB queries/month",
    docUrl: "https://cloud.google.com/bigquery/docs/introduction",
  },
  {
    id: "google_firestore",
    name: "Firestore",
    category: "storage",
    icon: "🔥",
    shortDescription: "Serverless NoSQL document database with real-time sync",
    description:
      "Firestore is GCP's serverless, NoSQL document database. It stores data in collections of documents, supports real-time listeners for live updates, and provides strong consistency for reads after writes. Firestore in Native mode supports mobile/web SDKs; Firestore in Datastore mode provides a Datastore-compatible interface for server workloads.",
    whenToUse: [
      "Mobile or web apps that need real-time data synchronization with offline support",
      "Flexible document storage without a fixed schema",
      "Serverless backends using Cloud Functions with event triggers on document changes",
    ],
    commonMistakes: [
      "Choosing Datastore mode when you need real-time listeners — only Native mode supports them",
      "Designing deeply nested subcollections — queries can't span subcollections without collection group indexes",
      "Performing many small writes in a loop — use batch writes or transactions for atomicity and performance",
    ],
    typicalConnections: ["google_cloud_functions", "google_cloud_run", "google_firebase"],
    pricingModel: "Per document read/write/delete + per GB stored + per GB egress",
    freeTier: "1 GB storage, 50K reads/day, 20K writes/day, 20K deletes/day",
    docUrl: "https://cloud.google.com/firestore/docs/overview",
  },
  {
    id: "google_cloud_spanner",
    name: "Cloud Spanner",
    category: "storage",
    icon: "🌍",
    shortDescription: "Globally distributed, strongly consistent relational database",
    description:
      "Cloud Spanner is GCP's globally distributed relational database. It combines the horizontal scale of NoSQL with the ACID transactions and SQL interface of a relational database. Spanner uses TrueTime (GPS + atomic clocks) for globally consistent timestamps. It's ideal for financial systems, gaming leaderboards, and global inventory.",
    whenToUse: [
      "Applications requiring global consistency across multiple regions with strong ACID guarantees",
      "High-write-throughput workloads that have outgrown a single Cloud SQL instance",
      "Financial, inventory, or booking systems that cannot tolerate stale reads",
    ],
    commonMistakes: [
      "Using Spanner for low-traffic workloads — minimum cost is ~$0.90/node/hour (~$650/month/node)",
      "Choosing hotspot-prone primary keys (sequential IDs) — use UUID or bit-reverse for even distribution",
      "Not using interleaved tables for parent-child relationships — they're a key Spanner performance feature",
    ],
    typicalConnections: ["google_compute_engine", "google_gke", "google_cloud_run"],
    pricingModel: "Per processing unit-hour + per GB storage; minimum 1 node = 1000 processing units",
    freeTier: "None",
    docUrl: "https://cloud.google.com/spanner/docs/whatis",
  },

  // ── Security & Identity ──────────────────────────────────────────────────────
  {
    id: "google_iam",
    name: "Cloud IAM",
    category: "security",
    icon: "🔑",
    shortDescription: "Identity and Access Management for GCP resources",
    description:
      "Cloud IAM controls who (identity) can do what (role) on which resource. GCP uses a resource hierarchy: Organization → Folder → Project → Resource. Permissions granted at a higher level are inherited downward. IAM uses predefined roles (curated sets of permissions), basic roles (Owner/Editor/Viewer — avoid these), and custom roles. Service accounts are the identity for non-human workloads.",
    whenToUse: [
      "Granting a GKE pod or Cloud Run service access to other GCP services via Workload Identity",
      "Enforcing least-privilege access to BigQuery datasets or GCS buckets",
      "Federating corporate identities (Google Workspace, OIDC, SAML) into GCP",
    ],
    commonMistakes: [
      "Binding Editor or Owner roles on projects — these are overly permissive; use predefined roles",
      "Downloading service account keys when Workload Identity or Impersonation is available",
      "Granting permissions at the organization level when project-level scope is sufficient",
    ],
    typicalConnections: ["google_gke", "google_cloud_run", "google_cloud_functions", "google_bigquery"],
    pricingModel: "Free",
    freeTier: "Always free",
    docUrl: "https://cloud.google.com/iam/docs/overview",
  },
  {
    id: "google_secret_manager",
    name: "Secret Manager",
    category: "security",
    icon: "🔒",
    shortDescription: "Managed service for storing API keys, passwords, and certificates",
    description:
      "Secret Manager stores sensitive data as versioned secrets. Secrets are encrypted at rest with AES-256 and can be replicated automatically or to specific regions. Access is controlled via Cloud IAM. Secret versions can be enabled, disabled, or destroyed. It integrates with Cloud Run, Cloud Functions, GKE (via external-secrets or Secret Manager add-on), and the gcloud CLI.",
    whenToUse: [
      "Storing API keys, database credentials, and TLS certificates used by cloud workloads",
      "Rotating credentials without redeploying applications (update secret version, restart service)",
      "Auditing secret access with Cloud Audit Logs",
    ],
    commonMistakes: [
      "Hardcoding secrets in environment variables or source code instead of fetching at runtime",
      "Not destroying old secret versions — stale versions still incur storage cost and remain accessible if IAM isn't tightened",
      "Using the same secret for multiple environments — use separate secrets or namespacing per env",
    ],
    typicalConnections: ["google_cloud_run", "google_cloud_functions", "google_gke", "google_compute_engine"],
    pricingModel: "Per 10K access operations + per active secret version/month",
    freeTier: "6 active secret versions, 10K access operations/month",
    docUrl: "https://cloud.google.com/secret-manager/docs/overview",
  },
  {
    id: "google_cloud_armor",
    name: "Cloud Armor",
    category: "security",
    icon: "🛡️",
    shortDescription: "DDoS protection and WAF for GCP load balancers",
    description:
      "Cloud Armor provides DDoS defense and Web Application Firewall (WAF) rules in front of the Global External HTTP(S) Load Balancer. It offers pre-configured rules for OWASP Top 10, rate limiting, adaptive protection (ML-based DDoS mitigation), and geographic IP allow/deny lists. Rules are evaluated in priority order (lower number = higher priority).",
    whenToUse: [
      "Protecting public-facing APIs and web applications from DDoS and common web exploits",
      "Geo-blocking traffic from specific countries for compliance or business reasons",
      "Rate-limiting requests from specific IPs or CIDRs to prevent abuse",
    ],
    commonMistakes: [
      "Setting default rules to deny without testing — you can lock yourself out of your own application",
      "Not enabling Adaptive Protection (Cloud Armor Managed Protection Plus) for volumetric DDoS defense",
      "Forgetting that Cloud Armor only works with the global external HTTP(S) LB — not internal or regional LBs",
    ],
    typicalConnections: ["google_cloud_load_balancing", "google_compute_engine", "google_gke"],
    pricingModel: "Per security policy + per GB processed + per rule evaluation (Managed Protection adds flat monthly fee)",
    freeTier: "None",
    docUrl: "https://cloud.google.com/armor/docs/cloud-armor-overview",
  },
  {
    id: "google_kms",
    name: "Cloud KMS",
    category: "security",
    icon: "🗝️",
    shortDescription: "Managed encryption key service with FIPS 140-2 Level 3 HSMs",
    description:
      "Cloud Key Management Service (KMS) lets you manage cryptographic keys for your cloud services. It supports AES-256, RSA, and EC key types. Cloud HSM provides hardware security module-backed keys (FIPS 140-2 Level 3). Customer-Managed Encryption Keys (CMEK) integrate KMS with GCS, BigQuery, Cloud SQL, and other services to encrypt data with your own keys.",
    whenToUse: [
      "Meeting compliance requirements that mandate customer-managed encryption keys",
      "Encrypting application data with envelope encryption (DEK encrypted by a KMS KEK)",
      "Signing artifacts, JWTs, or other data with hardware-backed asymmetric keys",
    ],
    commonMistakes: [
      "Not setting a key rotation period — unrotated keys increase risk exposure over time",
      "Confusing CMEK (you manage keys, Google manages HSM) with CSEK (you supply raw key material — not recommended)",
      "Destroying a key version without verifying all data encrypted with it has been re-encrypted",
    ],
    typicalConnections: ["google_cloud_storage", "google_bigquery", "google_cloud_sql", "google_secret_manager"],
    pricingModel: "Per key version active/month + per cryptographic operation",
    freeTier: "None",
    docUrl: "https://cloud.google.com/kms/docs/key-management-overview",
  },

  // ── Data & Analytics ─────────────────────────────────────────────────────────
  {
    id: "google_pub_sub",
    name: "Pub/Sub",
    category: "dataAnalytics",
    icon: "📨",
    shortDescription: "Fully managed real-time messaging service",
    description:
      "Pub/Sub is GCP's globally distributed message bus. Publishers send messages to topics; subscribers receive from subscriptions. It supports both pull (subscriber polls) and push (Pub/Sub delivers to an HTTPS endpoint) delivery. Messages are retained for up to 7 days. Pub/Sub Lite is a cheaper, regional, zonal alternative with lower guarantees. Pub/Sub is the backbone of most GCP event-driven architectures.",
    whenToUse: [
      "Decoupling producers and consumers in an event-driven microservices architecture",
      "Streaming events from IoT devices, logs, or clickstreams into BigQuery or Dataflow",
      "Triggering Cloud Functions or Cloud Run services on asynchronous events",
    ],
    commonMistakes: [
      "Not acknowledging messages — unacked messages are redelivered until message retention expires",
      "Using a single subscription for multiple independent consumers — each consumer needs its own subscription",
      "Ignoring message ordering — Pub/Sub is at-least-once by default; use ordering keys for ordered delivery",
    ],
    typicalConnections: ["google_cloud_functions", "google_dataflow", "google_bigquery", "google_cloud_run"],
    pricingModel: "Per GB of message data published + per GB delivered to subscriptions",
    freeTier: "10 GB/month of data",
    docUrl: "https://cloud.google.com/pubsub/docs/overview",
  },
  {
    id: "google_dataflow",
    name: "Dataflow",
    category: "dataAnalytics",
    icon: "🌊",
    shortDescription: "Fully managed stream and batch data processing (Apache Beam)",
    description:
      "Dataflow is GCP's managed service for executing Apache Beam pipelines. It handles both stream processing (Pub/Sub → BigQuery in real time) and batch processing (GCS → BigQuery). Dataflow auto-scales workers, handles fault tolerance, and integrates with Dataflow Prime for automatic resource optimization. You write pipelines in Python, Java, or Go using the Beam SDK.",
    whenToUse: [
      "Real-time ETL pipelines from Pub/Sub into BigQuery, Bigtable, or GCS",
      "Batch data transformation with autoscaling compute (replacing Spark for many use cases)",
      "Complex windowed aggregations or stream-stream joins",
    ],
    commonMistakes: [
      "Not using templates (Flex Templates) for productionizing pipelines — raw pipelines are hard to re-run",
      "Underestimating the startup time — Dataflow jobs can take 3–5 minutes to start (use min workers for streaming)",
      "Ignoring Dataflow's shuffle service — enable it for batch jobs to reduce inter-worker network cost",
    ],
    typicalConnections: ["google_pub_sub", "google_bigquery", "google_cloud_storage", "google_bigtable"],
    pricingModel: "Per vCPU-hour + per GB RAM-hour + per GB-hour shuffle",
    freeTier: "None",
    docUrl: "https://cloud.google.com/dataflow/docs/overview",
  },
  {
    id: "google_vertex_ai",
    name: "Vertex AI",
    category: "dataAnalytics",
    icon: "🤖",
    shortDescription: "Unified ML platform for training, serving, and managing models",
    description:
      "Vertex AI is GCP's unified machine learning platform. It includes Vertex AI Studio (for Gemini and generative AI), AutoML (no-code training), custom training (bring your own code), Model Registry, Feature Store, Pipelines (MLOps), and Model Monitoring. Gemini models are accessible via the Vertex AI API or Google AI Studio.",
    whenToUse: [
      "Training custom ML models at scale with managed GPUs/TPUs",
      "Building generative AI applications using Gemini, Imagen, or Codey foundation models",
      "Running end-to-end MLOps: training → evaluation → serving → monitoring in one platform",
    ],
    commonMistakes: [
      "Using Google AI Studio for production workloads — Vertex AI provides SLAs and enterprise controls",
      "Not enabling online prediction scaling to zero — idle endpoints run 24/7 and can be expensive",
      "Skipping Feature Store for production models that need consistent training/serving feature computation",
    ],
    typicalConnections: ["google_cloud_storage", "google_bigquery", "google_pub_sub", "google_gke"],
    pricingModel: "Varied: training per node-hour, prediction per node-hour or per request, storage per GB",
    freeTier: "Free tier for Vertex AI Studio API calls (quota limited)",
    docUrl: "https://cloud.google.com/vertex-ai/docs/start/introduction-unified-platform",
  },
  {
    id: "google_bigtable",
    name: "Cloud Bigtable",
    category: "dataAnalytics",
    icon: "🗃️",
    shortDescription: "Petabyte-scale NoSQL database optimized for high-throughput workloads",
    description:
      "Cloud Bigtable is a wide-column NoSQL database designed for low-latency, high-throughput workloads. It's the same database that powers Google Search, Maps, and Analytics. Use cases include time-series data, IoT telemetry, financial data, and ML feature serving. Bigtable scales horizontally by adding nodes — no downtime required.",
    whenToUse: [
      "Storing time-series data with billions of rows and thousands of events per second",
      "Low-latency key-value lookups at massive scale (sub-10ms P99 with SSD storage)",
      "ML feature serving or recommendation system lookup tables",
    ],
    commonMistakes: [
      "Using Bigtable for relational queries or low-traffic workloads — minimum cost is ~$0.65/node/hour",
      "Designing bad row keys (sequential timestamps) causing hotspotting on a single node",
      "Not choosing the right storage type — SSD for latency-sensitive; HDD for analytical/batch at 10x lower cost",
    ],
    typicalConnections: ["google_dataflow", "google_pub_sub", "google_gke", "google_cloud_functions"],
    pricingModel: "Per node-hour + per GB SSD/HDD storage; minimum 1 node",
    freeTier: "None",
    docUrl: "https://cloud.google.com/bigtable/docs/overview",
  },

  // ── Monitoring & Ops ─────────────────────────────────────────────────────────
  {
    id: "google_cloud_monitoring",
    name: "Cloud Monitoring",
    category: "monitoring",
    icon: "📈",
    shortDescription: "Full-stack observability: metrics, dashboards, and alerting",
    description:
      "Cloud Monitoring (part of Google Cloud's operations suite, formerly Stackdriver) collects metrics from GCP services, VMs, GKE, and custom instrumentation. It supports custom dashboards, SLO monitoring, and alert policies with notification channels (PagerDuty, Slack, email, Pub/Sub). The Monitoring agent collects system metrics from Compute Engine VMs.",
    whenToUse: [
      "Setting up alert policies for CPU, memory, error rates, or custom business metrics",
      "Creating SLO dashboards based on latency and availability targets",
      "Monitoring GKE workloads with GKE-native dashboards",
    ],
    commonMistakes: [
      "Not installing the Ops Agent on Compute Engine — GCP only provides hypervisor-level metrics by default",
      "Creating alert policies without notification channels — alerts fire but nobody hears them",
      "Using high-cardinality labels on custom metrics — each unique label combination creates a new time series",
    ],
    typicalConnections: ["google_compute_engine", "google_gke", "google_cloud_run", "google_cloud_logging"],
    pricingModel: "First 150MB of metrics/month free; custom metrics and monitoring data billed per MB",
    freeTier: "150 MB metrics, 50 GB logs ingestion (via Cloud Logging), 1 alerting policy free",
    docUrl: "https://cloud.google.com/monitoring/docs/monitoring-overview",
  },
  {
    id: "google_cloud_logging",
    name: "Cloud Logging",
    category: "monitoring",
    icon: "📋",
    shortDescription: "Managed log management with routing, retention, and analysis",
    description:
      "Cloud Logging ingests logs from GCP services, VMs, GKE, and custom applications. Logs can be routed via log sinks to BigQuery (for SQL analysis), GCS (for long-term retention), Pub/Sub (for streaming), and other destinations. Log-based metrics let you create monitoring metrics from log entries. Log Explorer provides real-time log search with full-text and structured filtering.",
    whenToUse: [
      "Centralizing logs from all GCP services and applications in one place",
      "Creating log-based alerts (e.g., alert when error count exceeds threshold)",
      "Routing logs to BigQuery for long-term retention and analytics",
    ],
    commonMistakes: [
      "Not configuring log exclusion filters — verbose logs (load balancer access logs) can spike costs quickly",
      "Relying solely on default 30-day retention without exporting to GCS for compliance requirements",
      "Not enabling data access audit logs — Admin Activity is on by default, but Data Read/Write are not",
    ],
    typicalConnections: ["google_cloud_monitoring", "google_bigquery", "google_pub_sub", "google_cloud_storage"],
    pricingModel: "First 50 GB/month free; $0.01/GB after",
    freeTier: "50 GB ingestion/month",
    docUrl: "https://cloud.google.com/logging/docs/overview",
  },
  {
    id: "google_cloud_trace",
    name: "Cloud Trace",
    category: "monitoring",
    icon: "🔭",
    shortDescription: "Distributed tracing system for latency analysis",
    description:
      "Cloud Trace collects latency data from GCP services and applications instrumented with OpenTelemetry or the Cloud Trace API. It automatically instruments App Engine, Cloud Run, and Cloud Functions. Trace shows a waterfall of spans across services, helping identify latency bottlenecks in distributed systems.",
    whenToUse: [
      "Diagnosing latency issues in microservices by tracing requests across service boundaries",
      "Understanding which downstream calls (DB queries, API calls) dominate response time",
      "Meeting observability requirements for distributed systems (traces + metrics + logs)",
    ],
    commonMistakes: [
      "Not propagating trace context headers (X-Cloud-Trace-Context) between services — traces will be fragmented",
      "Sampling at 100% in high-traffic production — use 1–10% sampling to control ingestion cost",
      "Not correlating traces with Cloud Logging — use the trace field in log entries for unified observability",
    ],
    typicalConnections: ["google_cloud_monitoring", "google_cloud_logging", "google_cloud_run", "google_gke"],
    pricingModel: "First 2.5M spans/month free; $0.20/million spans after",
    freeTier: "2.5M trace spans/month",
    docUrl: "https://cloud.google.com/trace/docs/overview",
  },
  {
    id: "google_artifact_registry",
    name: "Artifact Registry",
    category: "monitoring",
    icon: "📦",
    shortDescription: "Managed repository for container images and language packages",
    description:
      "Artifact Registry is GCP's universal artifact repository. It hosts Docker container images, npm packages, Maven JARs, Python packages, and more — all in the same service. It integrates with Cloud Build, GKE, and Cloud Run for seamless CI/CD. It replaces Container Registry (now read-only) and supports regional and multi-regional repositories.",
    whenToUse: [
      "Storing and distributing Docker images used by GKE, Cloud Run, or Compute Engine",
      "Hosting private npm, Maven, or PyPI packages for your organization",
      "Scanning container images for vulnerabilities before deployment",
    ],
    commonMistakes: [
      "Still using Container Registry (gcr.io) for new workloads — it's deprecated and being phased out",
      "Not enabling vulnerability scanning — images with critical CVEs can be blocked at deploy time",
      "Forgetting to configure cleanup policies — untagged images accumulate and increase storage cost",
    ],
    typicalConnections: ["google_gke", "google_cloud_run", "google_cloud_build"],
    pricingModel: "Per GB stored + per GB egress",
    freeTier: "0.5 GB storage/month",
    docUrl: "https://cloud.google.com/artifact-registry/docs/overview",
  },
];

export function getComponentInfo(id) {
  return GCP_COMPONENTS.find((c) => c.id === id) ?? null;
}
