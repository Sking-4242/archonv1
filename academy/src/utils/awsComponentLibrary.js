/**
 * Comprehensive AWS component reference data.
 * Used by the Library tab and canvas learning-mode tooltips.
 *
 * Each entry:
 *   id                — unique key, matches canvas component type where applicable
 *   name              — display name
 *   category          — one of the CATEGORIES keys
 *   icon              — emoji shorthand (swapped for SVG icons when canvas is built)
 *   shortDescription  — one sentence summary shown on library cards
 *   description       — 3-4 sentence educational explanation
 *   whenToUse         — string[] of concrete use cases
 *   commonMistakes    — string[] of mistakes students commonly make
 *   typicalConnections— string[] of component ids this typically connects to
 *   pricingModel      — human-readable pricing summary
 *   freeTier          — whether AWS Free Tier includes this service
 *   docUrl            — AWS documentation link
 */

export const CATEGORIES = {
  networking: "Networking",
  compute: "Compute",
  storage: "Storage & Database",
  security: "Security & Identity",
  appServices: "App Services",
  monitoring: "Monitoring & Ops",
};

export const AWS_COMPONENTS = [
  // ─────────────────────────────────────────────
  // NETWORKING
  // ─────────────────────────────────────────────
  {
    id: "vpc",
    name: "VPC",
    category: "networking",
    icon: "🌐",
    shortDescription: "Your private, isolated section of the AWS cloud with its own IP address range.",
    description:
      "A Virtual Private Cloud (VPC) is a logically isolated network you define within AWS. You choose the IP address range (CIDR block), create subnets, configure route tables, and control all inbound and outbound traffic. Every resource you launch — EC2, RDS, Lambda in a VPC — lives inside one. Think of it as your own private data center within AWS, where you control the networking layer completely.",
    whenToUse: [
      "Every production AWS architecture — a VPC is the mandatory starting point",
      "When you need network isolation between environments (dev, staging, prod)",
      "When you need to peer networks between AWS accounts",
      "When compliance requirements mandate private networking",
    ],
    commonMistakes: [
      "Using the default VPC for production workloads (no control over its CIDR or subnet layout)",
      "Choosing a CIDR block that overlaps with on-premises networks, breaking future VPN/Direct Connect",
      "Forgetting that a VPC spans all AZs in a region — subnets are what get pinned to a specific AZ",
      "Creating one giant subnet instead of separating public, private, and data tiers",
    ],
    typicalConnections: ["subnet", "internet_gateway", "nat_gateway", "route_table", "security_group"],
    pricingModel: "Free — VPCs themselves have no hourly charge. You pay for NAT Gateways, VPN connections, and data transfer.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/vpc/latest/userguide/what-is-amazon-vpc.html",
  },
  {
    id: "subnet",
    name: "Subnet",
    category: "networking",
    icon: "🔲",
    shortDescription: "A range of IP addresses within a VPC, tied to a single Availability Zone.",
    description:
      "Subnets partition your VPC's IP space into smaller segments, each locked to one Availability Zone. A public subnet has a route to an Internet Gateway, making resources reachable from (or able to reach) the internet. A private subnet routes outbound traffic through a NAT Gateway but is unreachable directly from the internet. Data-tier subnets often have no internet route at all. Good subnet design is the foundation of a secure, resilient architecture.",
    whenToUse: [
      "Public subnets: for load balancers, bastion hosts, NAT Gateways",
      "Private subnets: for application servers and backend services",
      "Data subnets (isolated): for databases and caches with no internet route",
      "Span at least two AZs for any production architecture requiring high availability",
    ],
    commonMistakes: [
      "Putting databases or app servers in public subnets — they should never be directly internet-accessible",
      "Only creating subnets in one AZ, eliminating fault tolerance",
      "Making all subnets the same size — reserve large CIDR blocks for scaling resources like EC2 and ECS",
      "Confusing 'public subnet' with 'has a public IP' — the subnet is public only if its route table has a 0.0.0.0/0 → IGW route",
    ],
    typicalConnections: ["vpc", "ec2_instance", "rds_instance", "nat_gateway", "load_balancer"],
    pricingModel: "Free — no charge for subnets themselves.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html",
  },
  {
    id: "internet_gateway",
    name: "Internet Gateway",
    category: "networking",
    icon: "🚪",
    shortDescription: "The on-ramp between your VPC and the public internet.",
    description:
      "An Internet Gateway (IGW) is a horizontally scaled, redundant, highly available VPC component that enables communication between your VPC and the internet. Without one, nothing inside your VPC can send or receive public internet traffic. You attach it to the VPC and then add a route (0.0.0.0/0 → IGW) to the subnet's route table to make that subnet public. The IGW itself performs no NAT — resources need a public IP or Elastic IP to be reachable.",
    whenToUse: [
      "Any subnet that needs to send or receive internet traffic (public subnets)",
      "Load balancers that serve public web traffic",
      "Bastion hosts for SSH/RDP access",
      "Resources that need to call external APIs directly",
    ],
    commonMistakes: [
      "Attaching an IGW but forgetting to add the 0.0.0.0/0 route in the route table — the IGW alone does nothing",
      "Adding an IGW route to private subnet route tables, accidentally making them public",
      "Confusing IGW (two-way internet) with NAT Gateway (outbound-only from private subnets)",
      "Creating multiple IGWs — you only need one per VPC",
    ],
    typicalConnections: ["vpc", "route_table", "subnet"],
    pricingModel: "Free to attach. You pay for data transfer out to the internet.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html",
  },
  {
    id: "nat_gateway",
    name: "NAT Gateway",
    category: "networking",
    icon: "🔀",
    shortDescription: "Lets private subnet resources reach the internet without being reachable from it.",
    description:
      "A NAT (Network Address Translation) Gateway sits in a public subnet and allows EC2 instances, containers, or Lambda functions in private subnets to initiate outbound connections to the internet — like downloading software updates or calling external APIs — without exposing them to inbound connections. It's managed by AWS, highly available within an AZ, and requires an Elastic IP. For cross-AZ resilience, deploy one NAT Gateway per AZ.",
    whenToUse: [
      "App servers in private subnets that need to download packages or call external APIs",
      "Lambda functions inside a VPC that need outbound internet access",
      "ECS tasks or EKS pods in private subnets that pull images from the internet",
      "Any private resource that needs one-way internet egress",
    ],
    commonMistakes: [
      "Deploying only one NAT Gateway for multi-AZ architectures — if that AZ goes down, all private subnets lose internet",
      "Putting the NAT Gateway in a private subnet (it must be in a public subnet to reach the IGW)",
      "Using NAT Gateways when AWS PrivateLink or VPC endpoints would be cheaper for AWS service traffic",
      "Forgetting the route table update: private subnet needs 0.0.0.0/0 → NAT Gateway",
    ],
    typicalConnections: ["subnet", "internet_gateway", "elastic_ip"],
    pricingModel: "$0.045/hour per NAT Gateway + $0.045/GB of data processed. Can add up fast.",
    freeTier: false,
    docUrl: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html",
  },
  {
    id: "route_table",
    name: "Route Table",
    category: "networking",
    icon: "🗺️",
    shortDescription: "Rules that determine where network traffic from your subnets is directed.",
    description:
      "Every subnet in a VPC must be associated with a route table, which contains a set of rules (routes) that determine where traffic is sent. The local route (e.g. 10.0.0.0/16 → local) is always present and allows communication within the VPC. You add routes to send traffic to the internet (via IGW), to private resources (via NAT Gateway), or to other VPCs (via VPC peering). Public and private subnets have different route tables — this is what makes them functionally different.",
    whenToUse: [
      "Separating public and private subnet routing (different route tables per tier)",
      "Directing private subnet traffic to a NAT Gateway for internet egress",
      "Routing VPC peering or Transit Gateway traffic",
      "Implementing network segmentation by restricting routes between subnets",
    ],
    commonMistakes: [
      "Using the main route table for all subnets instead of creating explicit tables per tier",
      "Forgetting that modifying the main route table affects all subnets not explicitly associated with another table",
      "Adding internet routes to a private subnet's table by accident",
      "Not understanding that routes are evaluated by most-specific prefix match, not top-down",
    ],
    typicalConnections: ["vpc", "subnet", "internet_gateway", "nat_gateway"],
    pricingModel: "Free.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html",
  },
  {
    id: "route53",
    name: "Route 53",
    category: "networking",
    icon: "🌍",
    shortDescription: "AWS's scalable DNS service with health checking and traffic routing policies.",
    description:
      "Route 53 is AWS's authoritative DNS service. Beyond basic domain registration and DNS record management (A, CNAME, MX, etc.), it offers traffic routing policies — weighted routing for A/B deployments, latency-based routing to serve users from the nearest region, failover routing to redirect traffic when a primary endpoint becomes unhealthy, and geolocation routing. Health checks integrate with routing to automatically remove unhealthy endpoints from DNS responses.",
    whenToUse: [
      "Pointing a domain name to an ALB, CloudFront distribution, or EC2 instance",
      "Implementing active-passive failover between regions",
      "Blue/green deployments using weighted routing policies",
      "Serving users from the AWS region closest to them (latency routing)",
    ],
    commonMistakes: [
      "Using CNAME records for zone apex (root domain) — use Alias records instead, which are free and support the apex",
      "Setting TTLs too high during a migration — changes take time to propagate if TTL is 24 hours",
      "Forgetting health check costs — each health check has a per-month charge",
      "Mixing up public and private hosted zones — private zones only resolve within a VPC",
    ],
    typicalConnections: ["load_balancer", "cloudfront", "ec2_instance"],
    pricingModel: "$0.50/hosted zone/month + $0.40–$0.60 per million queries. Health checks from $0.50/month each.",
    freeTier: false,
    docUrl: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/Welcome.html",
  },
  {
    id: "vpc_peering",
    name: "VPC Peering",
    category: "networking",
    icon: "🔗",
    shortDescription: "A direct, private network connection between two VPCs.",
    description:
      "VPC Peering creates a networking connection between two VPCs that routes traffic using private IP addresses, as if they were on the same network. Traffic stays on the AWS backbone and never traverses the public internet. Peering can connect VPCs in the same account, different accounts, and even different regions (inter-region peering). It is non-transitive — if VPC A peers with B and B peers with C, A cannot reach C through B without a direct peering or a Transit Gateway.",
    whenToUse: [
      "Connecting a shared services VPC (monitoring, logging) to application VPCs",
      "Allowing separate AWS accounts (e.g., dev and prod) to share resources privately",
      "Connecting a corporate AWS account to a vendor's AWS account",
    ],
    commonMistakes: [
      "Overlapping CIDR blocks between peered VPCs — peering requires non-overlapping IP ranges",
      "Assuming peering is transitive — it is not, each pair needs its own peering connection",
      "Forgetting to update route tables in both VPCs to add routes for the peer's CIDR",
      "Using VPC Peering at scale (10+ VPCs) — Transit Gateway is a better fit",
    ],
    typicalConnections: ["vpc", "route_table"],
    pricingModel: "No hourly charge. Data transfer within the same AZ is free; cross-AZ and cross-region transfers are charged.",
    freeTier: false,
    docUrl: "https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html",
  },

  // ─────────────────────────────────────────────
  // COMPUTE
  // ─────────────────────────────────────────────
  {
    id: "ec2_instance",
    name: "EC2 Instance",
    category: "compute",
    icon: "🖥️",
    shortDescription: "A resizable virtual server in the cloud — the most fundamental compute building block.",
    description:
      "Amazon EC2 (Elastic Compute Cloud) provides virtual machines — instances — in a wide variety of sizes and configurations. You choose the OS, instance type (CPU/RAM/GPU profile), storage, and networking. Instances run inside your VPC, can be assigned security groups, and can be given IAM instance roles to access other AWS services without credentials. EC2 underpins many higher-level AWS services under the hood.",
    whenToUse: [
      "Long-running workloads that need persistent state on disk",
      "Applications that require a specific OS, kernel configuration, or licensed software",
      "Situations where you need full control over the execution environment",
      "As web/app servers behind a load balancer in a traditional 3-tier architecture",
    ],
    commonMistakes: [
      "Storing application state on instance local storage — it disappears when the instance stops",
      "Not using an IAM instance role — hardcoding credentials in the app instead",
      "Over-provisioning instance size then forgetting to right-size after load testing",
      "Treating EC2 as pets (manual, irreplaceable) instead of cattle (automated, replaceable)",
    ],
    typicalConnections: ["subnet", "security_group", "load_balancer", "rds_instance", "iam_role", "ebs"],
    pricingModel: "Per second (minimum 60s) for most instance types. On-Demand, Reserved, Spot, and Savings Plans available.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html",
  },
  {
    id: "auto_scaling_group",
    name: "Auto Scaling Group",
    category: "compute",
    icon: "📈",
    shortDescription: "Automatically adjusts the number of EC2 instances based on demand.",
    description:
      "An Auto Scaling Group (ASG) maintains a fleet of EC2 instances, launching new ones when load increases and terminating them when demand drops. You define a launch template (or launch configuration) describing the AMI, instance type, and user data. Scaling policies can be target tracking (keep CPU at 50%), step scaling (add 2 at 70%, add 4 at 90%), or scheduled (scale up at 8am weekdays). ASGs also replace unhealthy instances automatically, making them essential for resilient architectures.",
    whenToUse: [
      "Web or app tier servers where traffic is variable or unpredictable",
      "Any EC2-based workload that should survive instance failures",
      "Batch processing where you want to scale workers up for a job and back down after",
      "Paired with an ALB to distribute traffic across dynamically scaled instances",
    ],
    commonMistakes: [
      "Not enabling health check replacement — the ASG won't terminate failed instances if it doesn't know they're unhealthy",
      "Setting min capacity to 1 — a single instance is still a single point of failure",
      "Forgetting that scaling out takes time; set cooldown periods appropriately to avoid flapping",
      "Using scaling policies alone without a load balancer — new instances won't receive traffic",
    ],
    typicalConnections: ["ec2_instance", "load_balancer", "subnet", "launch_template"],
    pricingModel: "No charge for ASG itself. You pay for the EC2 instances it manages.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/autoscaling/ec2/userguide/what-is-amazon-ec2-auto-scaling.html",
  },
  {
    id: "lambda_function",
    name: "Lambda",
    category: "compute",
    icon: "⚡",
    shortDescription: "Run code without provisioning servers — pay only for the compute time you consume.",
    description:
      "AWS Lambda lets you run code in response to events without managing any servers. You upload your function code (Node.js, Python, Java, Go, etc.), define a trigger (API Gateway request, S3 upload, SQS message, schedule), and Lambda handles provisioning, scaling, and fault tolerance automatically. Functions run for up to 15 minutes per invocation. For architectures that need internet access, Lambda must be inside a VPC with a NAT Gateway, or use VPC endpoints for AWS services.",
    whenToUse: [
      "Event-driven processing: image resizing on S3 upload, stream processing from Kinesis/SQS",
      "REST API backends when combined with API Gateway (serverless API pattern)",
      "Scheduled tasks (cron jobs) using EventBridge Scheduler",
      "Short-lived data transformation and glue code between services",
    ],
    commonMistakes: [
      "Putting Lambda in a VPC unnecessarily — it adds cold start latency and requires NAT for internet access",
      "Storing state in the Lambda execution environment — it is ephemeral and shared across invocations unpredictably",
      "Not setting concurrency limits — one noisy function can consume the entire account's Lambda concurrency",
      "Ignoring cold starts for latency-sensitive workloads — provisioned concurrency exists for this reason",
    ],
    typicalConnections: ["api_gateway", "s3_bucket", "sqs", "dynamodb", "rds_instance", "iam_role"],
    pricingModel: "1M requests/month free, then $0.20/million. Plus $0.0000166667 per GB-second of compute.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html",
  },
  {
    id: "ecs_fargate",
    name: "ECS / Fargate",
    category: "compute",
    icon: "🐳",
    shortDescription: "Run containerized applications without managing the underlying servers.",
    description:
      "Amazon ECS (Elastic Container Service) is a container orchestration service. With the Fargate launch type, AWS manages the underlying EC2 infrastructure entirely — you just define your container image, CPU/memory, and networking. ECS uses task definitions to describe containers, and services to maintain a desired count of running tasks. Fargate is ideal for teams that want the benefits of containers (consistency, isolation) without managing a cluster of EC2 nodes.",
    whenToUse: [
      "Microservices architectures where each service runs in its own container",
      "Applications already containerized with Docker that need to run on AWS",
      "When you want container benefits without managing EC2 instances (use Fargate)",
      "Long-running services paired with an ALB for HTTP/HTTPS traffic routing",
    ],
    commonMistakes: [
      "Sizing Fargate task CPU/memory too small and seeing OOM kills or throttling under load",
      "Not using Service Auto Scaling — fixed task count means no elasticity",
      "Storing container secrets in environment variables in plaintext — use Secrets Manager or Parameter Store",
      "Forgetting that Fargate tasks in a private subnet need a NAT Gateway to pull images from Docker Hub",
    ],
    typicalConnections: ["load_balancer", "subnet", "security_group", "iam_role", "ecr"],
    pricingModel: "Per vCPU/hour ($0.04048) and per GB memory/hour ($0.004445). No cluster management fee.",
    freeTier: false,
    docUrl: "https://docs.aws.amazon.com/AmazonECS/latest/developerguide/what-is-fargate.html",
  },

  // ─────────────────────────────────────────────
  // STORAGE & DATABASE
  // ─────────────────────────────────────────────
  {
    id: "s3_bucket",
    name: "S3 Bucket",
    category: "storage",
    icon: "🪣",
    shortDescription: "Object storage for any amount of data — the backbone of AWS storage.",
    description:
      "Amazon S3 (Simple Storage Service) stores objects (files) in buckets. Objects can be any size up to 5TB, and buckets can hold an unlimited number of objects. S3 is 11 nines durable by design, making it suitable for backups, static website hosting, data lakes, log archives, and application assets. Versioning, lifecycle rules, cross-region replication, and event notifications (triggering Lambda on upload) are built-in. Access is controlled via bucket policies and IAM.",
    whenToUse: [
      "Storing user-uploaded files, images, videos, and documents",
      "Hosting a static website or serving frontend assets via CloudFront",
      "Data lake storage for analytics pipelines (Athena, EMR, Redshift Spectrum)",
      "Backup and disaster recovery target for databases and EBS snapshots",
    ],
    commonMistakes: [
      "Making buckets or objects public by default — S3 Block Public Access should be on unless you have a specific reason",
      "Not enabling versioning on buckets that store critical data (accidental deletes are unrecoverable without it)",
      "Using S3 as a shared file system — it's object storage, not a file system. Use EFS for shared file access",
      "Not setting lifecycle rules — old objects and old versions accumulate and cost money",
    ],
    typicalConnections: ["cloudfront", "lambda_function", "iam_role", "cloudtrail"],
    pricingModel: "~$0.023/GB-month (Standard). Requests and data retrieval charged separately. 5GB free tier.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html",
  },
  {
    id: "rds_instance",
    name: "RDS",
    category: "storage",
    icon: "🗄️",
    shortDescription: "Managed relational databases — MySQL, PostgreSQL, Aurora, SQL Server, and more.",
    description:
      "Amazon RDS (Relational Database Service) manages the undifferentiated heavy lifting of running a relational database: hardware provisioning, OS patching, backups, failover, and monitoring. You choose the engine (MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, or Amazon Aurora), instance size, and storage type. Multi-AZ deployments provide automatic failover to a standby replica in another AZ. Read replicas reduce load on the primary for read-heavy workloads.",
    whenToUse: [
      "Any application needing a relational database with ACID compliance",
      "When you want managed backups, patching, and failover without operational overhead",
      "Multi-AZ for production systems that need high availability (< 1–2 min failover RTO)",
      "Read replicas for reporting workloads, analytics queries, or geographic read distribution",
    ],
    commonMistakes: [
      "Deploying RDS in a public subnet — it should always be in a private or data subnet",
      "Not enabling Multi-AZ for production (single-AZ means downtime during patching or AZ failure)",
      "Under-provisioning storage and not enabling storage auto-scaling (locked out when storage fills)",
      "Using the master DB user for application credentials — create a limited-permission app user",
    ],
    typicalConnections: ["ec2_instance", "subnet", "security_group", "lambda_function"],
    pricingModel: "Per instance-hour based on class + storage (gp2/gp3/io1) + I/O. Multi-AZ roughly doubles the cost.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Welcome.html",
  },
  {
    id: "dynamodb",
    name: "DynamoDB",
    category: "storage",
    icon: "⚡🗄️",
    shortDescription: "Fully managed NoSQL database with single-digit millisecond performance at any scale.",
    description:
      "DynamoDB is a serverless, key-value and document NoSQL database designed for applications that need consistent, single-digit millisecond response times at any scale. Tables have a partition key (and optionally a sort key) — all other attributes are schemaless. DynamoDB automatically partitions data across multiple servers as your table grows. On-demand capacity mode charges per read/write, while provisioned mode offers lower cost for predictable workloads. Global Tables provide multi-region active-active replication.",
    whenToUse: [
      "High-throughput, low-latency applications: gaming leaderboards, session stores, IoT data",
      "Serverless backends where you want zero database administration",
      "Applications with simple access patterns (lookup by key, range queries on sort key)",
      "Global applications needing multi-region, low-latency access (Global Tables)",
    ],
    commonMistakes: [
      "Choosing a poor partition key that causes hot partitions (e.g., using a status field with only 3 values)",
      "Trying to do complex relational queries — DynamoDB is not a SQL replacement for relational data",
      "Not using on-demand mode for unpredictable traffic (provisioned mode throttles when you exceed capacity)",
      "Forgetting that DynamoDB Streams must be enabled explicitly if you want Lambda triggers",
    ],
    typicalConnections: ["lambda_function", "api_gateway", "iam_role"],
    pricingModel: "On-demand: $1.25/million writes, $0.25/million reads. Storage: $0.25/GB-month. 25GB free tier.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html",
  },
  {
    id: "elasticache",
    name: "ElastiCache",
    category: "storage",
    icon: "🚀",
    shortDescription: "In-memory caching (Redis or Memcached) to speed up database-backed applications.",
    description:
      "ElastiCache is a managed in-memory data store supporting Redis and Memcached. It is most commonly used to cache the results of expensive database queries so subsequent requests are served from memory (microseconds) instead of hitting the database (milliseconds). Redis additionally supports pub/sub messaging, sorted sets for leaderboards, and persistent storage. ElastiCache lives inside your VPC and is only reachable from resources within it.",
    whenToUse: [
      "Caching database query results to reduce RDS/DynamoDB load",
      "Session storage for stateless application servers (store sessions in Redis instead of on-disk)",
      "Real-time leaderboards, rate limiting, or pub/sub messaging (Redis-specific)",
      "When your database is the bottleneck and a read-through cache would reduce load",
    ],
    commonMistakes: [
      "Caching everything — only cache data that is expensive to compute and safe to serve slightly stale",
      "Not setting TTLs on cache entries — the cache fills up and evicts unpredictably",
      "Treating the Redis primary as highly available — enable Multi-AZ with automatic failover for production",
      "Forgetting ElastiCache is VPC-only — Lambda functions outside a VPC cannot reach it",
    ],
    typicalConnections: ["ec2_instance", "lambda_function", "subnet", "security_group"],
    pricingModel: "Per node-hour based on node type. No free tier.",
    freeTier: false,
    docUrl: "https://docs.aws.amazon.com/AmazonElastiCache/latest/red-ug/WhatIs.html",
  },
  {
    id: "ebs",
    name: "EBS Volume",
    category: "storage",
    icon: "💾",
    shortDescription: "Block storage volumes that attach to a single EC2 instance, like a virtual hard drive.",
    description:
      "Amazon EBS (Elastic Block Store) provides persistent block storage for EC2 instances. Unlike instance store volumes that disappear when an instance stops, EBS volumes persist independently. Volume types include gp3 (general purpose SSD — the default), io2 Block Express (high-IOPS for databases), st1 (throughput-optimized HDD for sequential reads), and sc1 (cold HDD for infrequent access). EBS volumes can be snapshotted to S3 for backup and disaster recovery.",
    whenToUse: [
      "Root volumes for all EC2 instances (OS, application binaries)",
      "Database storage for self-managed databases on EC2 (use io2 for high IOPS needs)",
      "Application volumes requiring consistent low-latency block I/O",
      "When you need to snapshot and restore disk state for backup purposes",
    ],
    commonMistakes: [
      "Using gp2 instead of gp3 — gp3 is cheaper and allows independent IOPS/throughput tuning",
      "Forgetting that one EBS volume attaches to one EC2 instance at a time (not shared storage — use EFS for that)",
      "Not taking regular snapshots — there is no automated backup unless you set it up",
      "Over-provisioning IOPS on io2 when gp3 would be sufficient at a fraction of the cost",
    ],
    typicalConnections: ["ec2_instance"],
    pricingModel: "gp3: $0.08/GB-month. io2: $0.125/GB-month + $0.065/provisioned IOPS. Snapshots: $0.05/GB-month.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AmazonEBS.html",
  },
  {
    id: "efs",
    name: "EFS",
    category: "storage",
    icon: "📁",
    shortDescription: "Managed NFS file system that can be mounted by multiple EC2 instances simultaneously.",
    description:
      "Amazon EFS (Elastic File System) provides a managed Network File System (NFS) that can be mounted concurrently by thousands of EC2 instances across multiple AZs. Unlike EBS (one-to-one attachment), EFS is a shared file system — all instances see the same files. It scales automatically and charges for only the storage you use. Ideal for shared content, home directories, and CMS workloads where multiple servers need read/write access to the same files.",
    whenToUse: [
      "Web servers in an Auto Scaling Group that need access to the same uploaded files",
      "CMS platforms (WordPress, Drupal) running on multiple EC2 instances",
      "Home directory storage for users accessing multiple instances",
      "Machine learning training workloads accessing shared datasets",
    ],
    commonMistakes: [
      "Using EFS when only one instance needs the storage — EBS is simpler and cheaper for single-instance use",
      "Not considering EFS's higher latency vs EBS for I/O-intensive workloads (databases should use EBS)",
      "Forgetting to configure security groups to allow NFS port 2049 between EC2 and EFS mount targets",
      "Ignoring EFS storage classes — Infrequent Access (IA) storage is ~92% cheaper for files not accessed daily",
    ],
    typicalConnections: ["ec2_instance", "ecs_fargate", "subnet", "security_group"],
    pricingModel: "$0.30/GB-month (Standard). $0.025/GB-month (Infrequent Access). No minimum charge.",
    freeTier: false,
    docUrl: "https://docs.aws.amazon.com/efs/latest/ug/whatisefs.html",
  },

  // ─────────────────────────────────────────────
  // SECURITY & IDENTITY
  // ─────────────────────────────────────────────
  {
    id: "security_group",
    name: "Security Group",
    category: "security",
    icon: "🛡️",
    shortDescription: "A stateful virtual firewall controlling inbound and outbound traffic for AWS resources.",
    description:
      "Security Groups act as virtual firewalls attached to EC2 instances, RDS databases, Lambda functions in a VPC, and other resources. They are stateful — if you allow an inbound connection, the response traffic is automatically allowed out without an explicit outbound rule. Rules specify protocol (TCP/UDP/ICMP), port range, and source/destination (CIDR block or another security group ID). Best practice is to reference security group IDs as sources rather than IP ranges for dynamic environments.",
    whenToUse: [
      "Every networked resource in AWS — all EC2, RDS, ECS tasks, ALBs, etc. need security groups",
      "Allow only your ALB's security group to reach app servers (no direct internet access)",
      "Allow only app server security group to reach your RDS database",
      "Restrict SSH (port 22) to a bastion host security group or a known IP range",
    ],
    commonMistakes: [
      "Using 0.0.0.0/0 as the source for inbound rules on databases or app servers",
      "Adding all rules to a single security group instead of using layered, purpose-specific groups",
      "Confusing security groups with NACLs — security groups are stateful and resource-level; NACLs are stateless and subnet-level",
      "Forgetting that security group rules are allow-only — there is no explicit deny rule",
    ],
    typicalConnections: ["ec2_instance", "rds_instance", "load_balancer", "lambda_function", "ecs_fargate"],
    pricingModel: "Free.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html",
  },
  {
    id: "iam_role",
    name: "IAM Role",
    category: "security",
    icon: "🔑",
    shortDescription: "An identity with permissions that AWS services or users can assume — no long-term credentials.",
    description:
      "An IAM Role is an AWS identity with a set of permissions policies attached. Unlike IAM Users (which have long-term access keys), roles are assumed temporarily and issue short-lived credentials. EC2 instance profiles, Lambda execution roles, ECS task roles, and cross-account access all use IAM Roles. The principle of least privilege says each role should have only the permissions it needs to do its job — nothing more. Roles eliminate the need to hardcode AWS credentials in application code.",
    whenToUse: [
      "EC2 instance profiles — give an EC2 instance permission to call S3, DynamoDB, etc. without credentials",
      "Lambda execution roles — every Lambda function needs a role to log to CloudWatch and access resources",
      "ECS task roles — container-level credentials for accessing AWS services",
      "Cross-account access — allow a role in Account A to be assumed by resources in Account B",
    ],
    commonMistakes: [
      "Attaching AdministratorAccess or wildcard (*) policies to application roles — violates least privilege",
      "Hardcoding AWS access keys in application code or environment variables instead of using a role",
      "Using a single shared role for all Lambda functions — each function should have its own minimal role",
      "Not reviewing and auditing role permissions over time as applications evolve",
    ],
    typicalConnections: ["ec2_instance", "lambda_function", "ecs_fargate", "s3_bucket"],
    pricingModel: "Free.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles.html",
  },
  {
    id: "waf",
    name: "WAF",
    category: "security",
    icon: "🧱",
    shortDescription: "Web Application Firewall that filters malicious HTTP/HTTPS traffic before it hits your app.",
    description:
      "AWS WAF (Web Application Firewall) monitors web requests to CloudFront distributions, ALBs, and API Gateways and allows you to block or allow requests based on rules. Managed rule groups (maintained by AWS and vendors) protect against common threats: SQL injection, cross-site scripting (XSS), OWASP Top 10 attacks, bot traffic, and known bad IPs. Custom rules can block traffic from specific countries, rate-limit IPs, or inspect headers and body content.",
    whenToUse: [
      "Any public-facing web application that needs protection against common web exploits",
      "APIs exposed via API Gateway or ALB that need rate limiting or bot protection",
      "Compliance requirements (PCI DSS, HIPAA) that mandate web application firewall controls",
      "Protecting against credential stuffing and scraping attacks",
    ],
    commonMistakes: [
      "Running WAF in Count mode indefinitely — it logs but does not block until switched to Block mode",
      "Only using WAF at the CloudFront layer and leaving the ALB origin unprotected via direct IP access",
      "Not monitoring WAF metrics and logs — WAF is only useful if you review what it catches",
      "Overlooking the cost: WAF charges per web ACL, per rule, and per million requests evaluated",
    ],
    typicalConnections: ["load_balancer", "cloudfront", "api_gateway"],
    pricingModel: "$5/month per Web ACL + $1/month per rule + $0.60/million requests. Managed rule groups extra.",
    freeTier: false,
    docUrl: "https://docs.aws.amazon.com/waf/latest/developerguide/what-is-aws-waf.html",
  },
  {
    id: "kms",
    name: "KMS",
    category: "security",
    icon: "🔐",
    shortDescription: "Managed encryption key service — create, control, and audit the keys that protect your data.",
    description:
      "AWS Key Management Service (KMS) creates and manages cryptographic keys for encrypting data. It integrates with nearly every AWS service: S3 server-side encryption, RDS encryption at rest, EBS volume encryption, Secrets Manager, and more. Customer-managed keys (CMKs) give you control over key policies (who can use and manage the key) and full audit logs in CloudTrail. Automatic key rotation is available for symmetric keys.",
    whenToUse: [
      "Enabling encryption at rest for S3, RDS, EBS, DynamoDB (nearly always recommended)",
      "When regulatory requirements mandate customer-managed encryption keys with audit trails",
      "Signing and verifying data using asymmetric key pairs",
      "Envelope encryption — encrypting data keys used by your application",
    ],
    commonMistakes: [
      "Using AWS-managed keys when you need key policy control and independent rotation — use CMKs instead",
      "Not including the key's KMS key ARN in IAM policies for services that use it — leads to cryptic access denied errors",
      "Deleting a KMS key without ensuring all encrypted data is decrypted first — data is permanently unrecoverable",
      "Ignoring KMS costs — each API call (Encrypt, Decrypt, GenerateDataKey) is $0.03/10,000 requests",
    ],
    typicalConnections: ["s3_bucket", "rds_instance", "ebs", "secrets_manager"],
    pricingModel: "$1/month per CMK + $0.03/10,000 API requests. AWS-managed keys are free.",
    freeTier: false,
    docUrl: "https://docs.aws.amazon.com/kms/latest/developerguide/overview.html",
  },
  {
    id: "secrets_manager",
    name: "Secrets Manager",
    category: "security",
    icon: "🤫",
    shortDescription: "Securely store, rotate, and retrieve database credentials, API keys, and other secrets.",
    description:
      "AWS Secrets Manager stores sensitive configuration values — database passwords, API keys, OAuth tokens — and makes them available to your applications via API calls. The key advantage over environment variables or config files is automatic rotation: Secrets Manager can rotate RDS passwords on a schedule, updating the database and notifying your application, all without downtime. All secrets are encrypted with KMS. Access is controlled via IAM and resource-based policies.",
    whenToUse: [
      "Storing database credentials used by EC2, ECS, or Lambda — never hardcode passwords",
      "Rotating RDS master passwords automatically (built-in rotation Lambda for supported engines)",
      "Storing third-party API keys that your application needs at runtime",
      "Sharing secrets across multiple applications or AWS accounts securely",
    ],
    commonMistakes: [
      "Putting secrets in environment variables or SSM Parameter Store (standard tier) when rotation is needed — use Secrets Manager",
      "Not caching secrets in application memory — calling Secrets Manager on every request adds latency and cost",
      "Forgetting to grant the executing role (EC2 instance profile, Lambda role) secretsmanager:GetSecretValue permission",
      "Storing secrets that don't need rotation in Secrets Manager — SSM Parameter Store SecureString is cheaper",
    ],
    typicalConnections: ["rds_instance", "lambda_function", "ec2_instance", "kms"],
    pricingModel: "$0.40/secret/month + $0.05/10,000 API calls. 30-day free trial per secret.",
    freeTier: false,
    docUrl: "https://docs.aws.amazon.com/secretsmanager/latest/userguide/intro.html",
  },
  {
    id: "acm",
    name: "ACM (SSL/TLS)",
    category: "security",
    icon: "📜",
    shortDescription: "Free SSL/TLS certificates for your AWS resources — no manual renewal required.",
    description:
      "AWS Certificate Manager (ACM) provisions, manages, and deploys public and private SSL/TLS certificates. Public certificates are free and auto-renew before expiration. They can be attached to ALBs, CloudFront distributions, and API Gateways to enable HTTPS. ACM handles the full certificate lifecycle, eliminating the operational burden of certificate management. Note: ACM certificates cannot be exported to non-AWS services — for that, use Let's Encrypt or a traditional CA.",
    whenToUse: [
      "Enabling HTTPS on any ALB, CloudFront distribution, or API Gateway (always recommended)",
      "Wildcard certificates covering all subdomains (*.example.com) for multi-tenant apps",
      "Private certificates for internal services communicating over mTLS",
    ],
    commonMistakes: [
      "Requesting a certificate in the wrong region — ALB certificates must be in the same region; CloudFront requires us-east-1",
      "Not validating domain ownership via DNS CNAME record — certificate stays pending indefinitely",
      "Using HTTP instead of HTTPS because it 'works' in dev — always enforce HTTPS via ALB redirect rules",
    ],
    typicalConnections: ["load_balancer", "cloudfront", "api_gateway"],
    pricingModel: "Public certificates: free. Private CA: $400/month + $0.75/certificate issued.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html",
  },

  // ─────────────────────────────────────────────
  // APP SERVICES
  // ─────────────────────────────────────────────
  {
    id: "load_balancer",
    name: "Application Load Balancer",
    category: "appServices",
    icon: "⚖️",
    shortDescription: "Distributes HTTP/HTTPS traffic across multiple targets with content-based routing.",
    description:
      "The Application Load Balancer (ALB) operates at Layer 7 (HTTP/HTTPS) and routes traffic based on URL path, hostname, HTTP headers, or query parameters. It distributes requests across EC2 instances, ECS tasks, Lambda functions, or IP addresses in multiple AZs. ALBs support SSL termination (TLS offloading), WebSocket connections, HTTP/2, sticky sessions, and authentication via Cognito or OIDC. They integrate with WAF for security and ACM for certificate management.",
    whenToUse: [
      "Front-ending any auto-scaled group of EC2 or ECS tasks serving HTTP traffic",
      "Routing /api/* requests to one target group and /* to another (microservices routing)",
      "Terminating SSL at the load balancer and communicating with backends over HTTP internally",
      "Blue/green and canary deployments using weighted target groups",
    ],
    commonMistakes: [
      "Putting the ALB in private subnets when it needs to receive public internet traffic — ALBs serving public traffic go in public subnets",
      "Not enabling deletion protection for production ALBs — a misclick can delete it",
      "Using ALB for non-HTTP workloads (TCP/UDP) — use a Network Load Balancer instead",
      "Forgetting to configure health check paths — if / returns a redirect (301), health checks fail",
    ],
    typicalConnections: ["ec2_instance", "ecs_fargate", "auto_scaling_group", "waf", "acm", "security_group"],
    pricingModel: "$0.008/hour + $0.008/LCU-hour. LCUs cover connections, requests, bandwidth, and rules.",
    freeTier: false,
    docUrl: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/introduction.html",
  },
  {
    id: "api_gateway",
    name: "API Gateway",
    category: "appServices",
    icon: "🚦",
    shortDescription: "Create, publish, and secure REST, HTTP, and WebSocket APIs at any scale.",
    description:
      "API Gateway is a fully managed service for building and deploying APIs. HTTP API is the newer, lower-cost option for simple proxy APIs and JWT authorization. REST API offers advanced features: request/response transformation, API keys, usage plans, and per-stage deployment. WebSocket API supports two-way stateful connections. API Gateway integrates natively with Lambda (the serverless API pattern), HTTP backends, and AWS services directly. It handles throttling, caching, and authorization.",
    whenToUse: [
      "Building serverless REST APIs backed by Lambda functions",
      "Exposing internal HTTP services or AWS service actions as a managed API",
      "Enforcing rate limiting, API keys, and usage plans for third-party API consumers",
      "Real-time apps using WebSocket API (chat, live dashboards)",
    ],
    commonMistakes: [
      "Using REST API when HTTP API would suffice — HTTP API is ~70% cheaper for simple proxy use cases",
      "Not enabling caching for latency-sensitive, read-heavy APIs — each backend call has Lambda cold start risk",
      "Forgetting CORS configuration when a browser frontend calls the API — the 'No Access-Control-Allow-Origin' error is frustrating",
      "Exposing Lambda function ARNs as stage variables without proper authorization",
    ],
    typicalConnections: ["lambda_function", "waf", "acm", "cognito"],
    pricingModel: "HTTP API: $1.00/million requests. REST API: $3.50/million requests. WebSocket: $1.00/million messages.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/apigateway/latest/developerguide/welcome.html",
  },
  {
    id: "cloudfront",
    name: "CloudFront",
    category: "appServices",
    icon: "🌩️",
    shortDescription: "Global CDN that caches and delivers content from 450+ edge locations worldwide.",
    description:
      "CloudFront is AWS's Content Delivery Network (CDN). It caches your content at edge locations globally so users get responses from a location geographically close to them rather than your origin. Origins can be S3 buckets (for static sites), ALBs, API Gateways, or custom HTTP servers. CloudFront also provides DDoS protection via AWS Shield Standard (free), integrates with WAF, and enforces HTTPS. Origin Access Control (OAC) locks S3 buckets so only CloudFront can access them directly.",
    whenToUse: [
      "Serving static website assets (HTML, CSS, JS) globally from S3",
      "Reducing latency for dynamic API responses with short cache TTLs",
      "Terminating HTTPS at the edge and reducing SSL handshake latency",
      "Absorbing DDoS traffic at the edge before it reaches your origin",
    ],
    commonMistakes: [
      "Forgetting to invalidate the CloudFront cache after deploying new static assets — users see old content",
      "Setting long TTLs on dynamic content — responses get cached and users see stale data",
      "Not using OAC to restrict direct S3 access — users can bypass CloudFront and access S3 directly",
      "Requesting ACM certificates in the wrong region — CloudFront requires certificates in us-east-1 regardless of origin region",
    ],
    typicalConnections: ["s3_bucket", "load_balancer", "waf", "acm", "route53"],
    pricingModel: "First 1TB/month free. Then ~$0.0085–$0.12/GB depending on region. $0.0075–$0.0200/10,000 requests.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Introduction.html",
  },
  {
    id: "sqs",
    name: "SQS",
    category: "appServices",
    icon: "📬",
    shortDescription: "Fully managed message queue for decoupling and scaling distributed systems.",
    description:
      "Amazon SQS (Simple Queue Service) is a managed message queuing service that enables asynchronous communication between microservices. Producers send messages to a queue; consumers poll for and process them. Standard queues offer maximum throughput with at-least-once delivery and best-effort ordering. FIFO queues guarantee exactly-once processing and strict ordering at lower throughput. SQS decouples the rate of work production from consumption, acting as a buffer during traffic spikes.",
    whenToUse: [
      "Decoupling a web frontend from a slow backend process (image processing, email sending, report generation)",
      "Buffering writes to protect a database from traffic spikes",
      "Fan-out architecture: SNS → multiple SQS queues → different processing pipelines",
      "Dead-letter queues to capture and investigate messages that fail processing repeatedly",
    ],
    commonMistakes: [
      "Not setting a visibility timeout long enough — messages reappear in the queue before processing completes, causing duplicate work",
      "Not configuring a dead-letter queue (DLQ) — failed messages loop forever and are never investigated",
      "Using Standard queues when order matters — use FIFO queues for ordered processing",
      "Polling too aggressively with short poll — use long polling (WaitTimeSeconds=20) to reduce cost and empty receives",
    ],
    typicalConnections: ["lambda_function", "ec2_instance", "sns", "ecs_fargate"],
    pricingModel: "First 1 million requests/month free. Then $0.40/million (Standard) or $0.50/million (FIFO).",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html",
  },
  {
    id: "sns",
    name: "SNS",
    category: "appServices",
    icon: "📢",
    shortDescription: "Pub/sub messaging service for fan-out notifications to multiple subscribers.",
    description:
      "Amazon SNS (Simple Notification Service) is a publish/subscribe messaging service. Publishers send a message to a topic; SNS fans it out to all subscribers simultaneously. Subscribers can be SQS queues, Lambda functions, HTTP/S endpoints, email addresses, or SMS. SNS is the standard way to implement the fan-out pattern — one event triggers multiple parallel downstream processes. FIFO topics paired with FIFO SQS queues provide ordered, deduplicated fan-out.",
    whenToUse: [
      "Fan-out: one S3 upload event needs to trigger image resizing, virus scanning, and metadata indexing in parallel",
      "Operational alerts: CloudWatch Alarm → SNS → email/SMS/PagerDuty",
      "Broadcasting events to multiple microservices without tight coupling",
      "Mobile push notifications (SNS Mobile Push for iOS/Android)",
    ],
    commonMistakes: [
      "Using SNS as a replacement for SQS when a queue (not broadcast) is needed — SNS has no persistence",
      "Not adding a dead-letter queue to SQS subscribers — failed Lambda processing loses the message",
      "Assuming subscribers receive messages in order — standard topics don't guarantee ordering (use FIFO topics for that)",
      "Forgetting to confirm HTTP/S subscriptions — SNS sends a confirmation request that the endpoint must respond to",
    ],
    typicalConnections: ["sqs", "lambda_function", "cloudwatch"],
    pricingModel: "First 1 million SNS requests free. Then $0.50/million. Email $2/100,000. SMS varies by country.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/sns/latest/dg/welcome.html",
  },
  {
    id: "eventbridge",
    name: "EventBridge",
    category: "appServices",
    icon: "🔁",
    shortDescription: "Serverless event bus for connecting AWS services, SaaS apps, and custom events.",
    description:
      "EventBridge (formerly CloudWatch Events) is a serverless event bus that routes events from AWS services, your own applications, and SaaS partners to targets like Lambda, SQS, SNS, ECS tasks, and Step Functions. Rules define event patterns or schedules that trigger targets. It decouples event producers from consumers — producers emit events to a bus without knowing who is listening. The default bus receives all AWS service events automatically.",
    whenToUse: [
      "Scheduling cron jobs (Lambda, ECS tasks) using schedule expressions",
      "Reacting to AWS service events: EC2 state changes, S3 uploads, CodePipeline state changes",
      "Building event-driven microservices that react to cross-service events",
      "Integrating SaaS event sources (Shopify, Stripe, Zendesk) directly into AWS workflows",
    ],
    commonMistakes: [
      "Using EventBridge for high-throughput, low-latency messaging — use SQS or SNS; EventBridge has higher latency",
      "Writing overly broad event patterns that match unintended events",
      "Not enabling EventBridge archive and replay for debugging — without it you can't replay missed events",
    ],
    typicalConnections: ["lambda_function", "sqs", "sns", "ecs_fargate"],
    pricingModel: "First 1 million events/month free per bus. Then $1.00/million events.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/eventbridge/latest/userguide/what-is-amazon-eventbridge.html",
  },
  {
    id: "step_functions",
    name: "Step Functions",
    category: "appServices",
    icon: "🪜",
    shortDescription: "Coordinate multi-step workflows using visual state machines with error handling.",
    description:
      "AWS Step Functions lets you coordinate distributed components into serverless workflows using state machines. Each state can invoke a Lambda function, run an ECS task, call an API, or wait for a human approval. Express Workflows handle high-volume, short-duration event processing; Standard Workflows are for long-running (up to 1 year) workflows with exactly-once execution and full audit history. Step Functions handles retries, error catching, parallel execution, and branching logic that would otherwise be messy in code.",
    whenToUse: [
      "Order processing, fulfillment, and multi-step approval workflows",
      "Orchestrating ETL pipelines with branching logic and error recovery",
      "Any workflow where you want visibility into state, retries, and execution history",
      "Replacing complex Lambda functions chaining other Lambda functions via code",
    ],
    commonMistakes: [
      "Encoding workflow logic in Lambda functions instead of state machine transitions — defeats the purpose",
      "Using Standard Workflows for high-volume event processing — Express Workflows are cheaper and faster for that",
      "Not using .waitForTaskToken for asynchronous human approval tasks",
    ],
    typicalConnections: ["lambda_function", "ecs_fargate", "sqs", "sns", "dynamodb"],
    pricingModel: "Standard: $0.025/1,000 state transitions. Express: $1.00/million + $0.00001/GB-second.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html",
  },

  // ─────────────────────────────────────────────
  // MONITORING & OPS
  // ─────────────────────────────────────────────
  {
    id: "cloudwatch",
    name: "CloudWatch",
    category: "monitoring",
    icon: "📊",
    shortDescription: "AWS's observability service for metrics, logs, dashboards, and alarms.",
    description:
      "CloudWatch collects metrics from every AWS service automatically — CPU utilization, request counts, error rates, latency, and hundreds more. You can publish custom metrics from your application code. Logs Insights queries structured log data across all your Lambda functions, ECS tasks, and EC2 instances. Alarms trigger SNS notifications or Auto Scaling actions when metrics breach thresholds. CloudWatch is the first place to look when something in your AWS architecture isn't behaving correctly.",
    whenToUse: [
      "Setting CPU alarms on EC2 instances and RDS to alert before saturation",
      "Querying Lambda function logs to debug errors in production",
      "Building operational dashboards showing key service health metrics",
      "Triggering Auto Scaling policies based on custom application metrics",
    ],
    commonMistakes: [
      "Not setting alarms on any metrics until something breaks — alarms should be configured before go-live",
      "Using Basic monitoring (5-minute intervals) instead of Detailed monitoring (1-minute) for production EC2",
      "Not enabling VPC Flow Logs to CloudWatch — you lose network-level debugging visibility",
      "Letting CloudWatch Logs accumulate indefinitely — set retention policies to avoid unbounded storage costs",
    ],
    typicalConnections: ["ec2_instance", "rds_instance", "lambda_function", "sns", "auto_scaling_group"],
    pricingModel: "10 metrics, 10 alarms, 5GB logs free/month. Then $0.30/metric/month, $0.10/alarm, $0.50/GB ingested.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html",
  },
  {
    id: "cloudtrail",
    name: "CloudTrail",
    category: "monitoring",
    icon: "🔍",
    shortDescription: "Audit log of every API call made in your AWS account — who did what, when, and from where.",
    description:
      "CloudTrail records every AWS API call: who made the call, from which IP, at what time, and what the request and response were. This covers console logins, CLI commands, SDK calls, and service-to-service calls. CloudTrail is the authoritative audit trail for compliance and security investigations. Management events (control plane — creating/deleting resources) are free for the first copy. Data events (S3 object reads/writes, Lambda invocations) have additional costs but are essential for data governance.",
    whenToUse: [
      "Security investigations: 'Who deleted that S3 bucket?' or 'Who changed that security group?'",
      "Compliance audits (SOC 2, PCI DSS, HIPAA) requiring a complete API audit log",
      "Detecting unauthorized or anomalous activity via CloudWatch alerts on CloudTrail events",
      "Change management: tracking when and by whom infrastructure changes were made",
    ],
    commonMistakes: [
      "Not enabling CloudTrail in every region — threats can operate in regions you're not actively using",
      "Storing CloudTrail logs in a bucket in the same account — a compromised account can delete the evidence",
      "Not enabling log file validation — without it, you can't prove logs weren't tampered with",
      "Confusing CloudTrail (API audit logs) with CloudWatch Logs (application/service logs) — they serve different purposes",
    ],
    typicalConnections: ["s3_bucket", "cloudwatch", "kms"],
    pricingModel: "One free management event trail per region. Additional trails: $2/100,000 management events. Data events: $0.10/100,000.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-user-guide.html",
  },
  {
    id: "xray",
    name: "X-Ray",
    category: "monitoring",
    icon: "🩻",
    shortDescription: "Distributed tracing to debug and analyze requests as they flow through your application.",
    description:
      "AWS X-Ray traces requests as they travel through your application — from the API Gateway call, through Lambda functions, to DynamoDB queries and external HTTP calls. It produces a visual service map showing each hop, latency at each step, error rates, and throttling. X-Ray is invaluable for diagnosing performance bottlenecks in distributed or microservices architectures where a single request touches many services. Annotations and metadata let you filter traces by user ID, order ID, or other business context.",
    whenToUse: [
      "Finding which service in a multi-Lambda or microservices chain is causing high latency",
      "Identifying slow database queries or external API calls within a transaction",
      "Debugging intermittent errors that are hard to reproduce locally",
      "Building a service dependency map to understand the full topology of a distributed app",
    ],
    commonMistakes: [
      "Not enabling X-Ray on every Lambda function and service in the chain — gaps break the trace",
      "Using sampling rates too low in production to save cost, then missing the traces you need to debug an incident",
      "Forgetting to pass the X-Ray trace header (X-Amzn-Trace-Id) through HTTP calls between services",
    ],
    typicalConnections: ["lambda_function", "api_gateway", "ecs_fargate", "dynamodb"],
    pricingModel: "First 100,000 traces/month free. Then $5.00/million traces recorded, $0.50/million scanned.",
    freeTier: true,
    docUrl: "https://docs.aws.amazon.com/xray/latest/devguide/aws-xray.html",
  },
];

/**
 * Returns the component entry matching the given canvas component id.
 * Used by canvas learning-mode tooltips.
 */
export function getComponentInfo(id) {
  return AWS_COMPONENTS.find((c) => c.id === id) ?? null;
}
