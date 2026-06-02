---
title: "Pillar: Performance Efficiency"
type: content
estimated_minutes: 18
cert_tags: ["aws_ccp", "aws_clf-c02"]
---

# Pillar: Performance Efficiency

## Overview

The Performance Efficiency pillar focuses on using computing resources efficiently to meet system requirements, and maintaining that efficiency as demand changes and technologies evolve. The central question is not just "does it work?" but "is this the right tool for this job, at the right size, and are we getting the most value out of what we are running?" Inefficient resource selection causes two problems simultaneously: over-provisioned resources waste money, while under-provisioned resources cause user-visible performance degradation. The Performance Efficiency pillar provides a systematic framework for avoiding both, covering everything from initial architecture decisions to continuous monitoring and adjustment over time.

What distinguishes Performance Efficiency from Cost Optimization — which also cares about resource sizing — is the emphasis on matching resource characteristics to workload characteristics. AWS calls this mechanical sympathy. A memory-bound database query benefits from a memory-optimized instance. A compute-intensive batch job benefits from a compute-optimized instance. A machine learning training run requires GPU instances. Choosing the wrong resource type, even at the right size, is a performance and cost failure that neither rightsizing alone nor spending more money can fix. Getting the type right first, then getting the size right, is the Performance Efficiency sequence.

For the CLF-C02 exam, know the five Performance Efficiency design principles and the names of the services that implement them: Compute Optimizer, ElastiCache, CloudFront, Lambda, Fargate, and the major managed database services. Understand why each managed service represents a performance improvement over a self-managed alternative, and be able to identify which design principle a given scenario is illustrating. The exam will present workload descriptions and ask you to select the most efficient service or architecture — understanding the WHY behind each principle is more useful than memorizing a list.

## Core Concepts

### Democratize Advanced Technologies

Many sophisticated capabilities — in-memory caching, machine learning inference, full-text search, graph database queries, time-series data management — are complex and expensive to build and maintain at the infrastructure level. The Performance Efficiency pillar calls for using AWS managed services to access these capabilities without needing to become the team that maintains the underlying infrastructure. Instead of building and operating a Redis cluster yourself, use Amazon ElastiCache. Instead of running an Elasticsearch cluster, use Amazon OpenSearch Service. Instead of training ML models on self-managed GPU servers, use Amazon SageMaker.

Why does this improve performance specifically — not just reduce operational burden? Because managed services are operated by engineering teams whose full-time job is making that specific service performant at scale. ElastiCache is tuned for caching workload patterns. Aurora is tuned for relational database performance at high concurrency. SageMaker abstracts away GPU provisioning, distributed training coordination, and hyperparameter tuning. These services incorporate optimizations — connection pooling, query caching, replication topologies — that a self-managed deployment would require significant engineering investment to match. The democratization principle means a small team can access enterprise-grade performance without enterprise-grade operations headcount. The WHY: you get better performance while spending less engineering time maintaining infrastructure.

### Go Global in Minutes

AWS's global infrastructure — Regions, Availability Zones, Edge Locations — enables workloads to be physically close to their users anywhere in the world. Deploying to multiple Regions and using Amazon CloudFront (a content delivery network with over 450 edge locations globally) reduces the physical distance between users and the resources they are accessing, directly reducing network latency. A user in Singapore accessing an application hosted in us-east-1 experiences 200+ ms of raw network latency due to physical distance alone. The same user accessing content cached at a CloudFront edge location in Singapore experiences single-digit millisecond cache hits — a 20x to 200x improvement.

Why is geographic distribution a performance lever and not just a reliability lever? Because network latency has a floor — the speed of light in fiber is fixed, and physical distance is the primary determinant of baseline latency. No amount of instance rightsizing, caching optimization, or code tuning can overcome 200 ms of geographic latency if the user is physically far from the servers. Deploying globally is the only solution to geographic latency, and AWS's multi-region infrastructure makes it achievable in hours rather than months of data center procurement. This principle applies to both static content (use CloudFront) and application logic (deploy to regional endpoints with Route 53 latency-based routing).

### Use Serverless Architectures

Serverless compute — AWS Lambda, AWS Fargate, Amazon API Gateway — removes capacity planning from the performance equation entirely. Traditional compute requires choosing an instance size and living with that choice until you actively resize. Under-provisioned instances throttle at peak; over-provisioned instances waste money at normal load. Serverless architectures scale automatically from zero to peak demand in milliseconds (Lambda) or seconds (Fargate), matching compute resources to actual demand at any given moment without any manual intervention.

Why is serverless a Performance Efficiency principle rather than just a Cost Optimization one? Because serverless eliminates the performance failure mode of under-provisioning. A Lambda function behind an API Gateway can handle 10,000 concurrent requests just as easily as 10 — the platform scales the execution environment, not the team. The key insight: serverless makes peak performance and efficient utilization simultaneously achievable. You never have to predict capacity in advance in order to perform well. For the CLF-C02 exam, know that Lambda and Fargate are the primary serverless compute services, that they scale automatically, and that they are recommended when workloads are stateless, event-driven, or have highly variable traffic patterns.

### Experiment More Often

In on-premises environments, experimenting with different resource configurations is expensive and slow — hardware procurement, provisioning, and decommissioning take weeks or months and cost thousands of dollars. In AWS, launching a test environment with a different instance type, database engine, or caching strategy takes minutes and costs pennies per hour. This dramatically lowers the cost of benchmarking and experimentation, enabling teams to validate performance hypotheses empirically rather than relying on vendor specifications or intuition.

Why is this principle important beyond mere convenience? Because performance assumptions are frequently wrong. A workload that appears CPU-bound based on architectural intuition may be I/O-bound in practice. A caching layer that seems like it would improve response times may not improve hit rates for an access pattern with high cardinality. The only way to know is to measure, and the cloud makes measurement cheap. Infrastructure as Code tools (CloudFormation, CDK) amplify this benefit — you can spin up an identically configured test environment in minutes, run your benchmark, measure results, and tear it down for minimal cost. Then reproduce the experiment with a different configuration and compare. The experiment principle turns AWS into a performance laboratory.

### Consider Mechanical Sympathy

The term "mechanical sympathy" comes from motorsport: a driver who understands how their car works mechanically can push it to its limits without damaging it. In computing, it means choosing instance families, storage types, database engines, and networking configurations that match the actual resource consumption patterns of the workload — not defaulting to general-purpose resources because they are familiar.

Why does the choice of resource type matter independently of size? Because different dimensions of a resource — CPU clock speed versus CPU core count, memory capacity versus memory bandwidth, disk IOPS versus disk throughput — are traded off differently across instance and service types. A compute-optimized instance (c-family) has more CPU cores relative to memory than a general-purpose instance (m-family). A memory-optimized instance (r-family) has far more memory relative to CPU. A GPU instance (p or g-family) provides specialized floating-point hardware that general-purpose CPUs cannot match for parallelizable workloads. Choosing the wrong type means paying for resources you do not use while being constrained by resources you need more of. Mechanical sympathy is the principle that reminds you to understand what your workload actually needs before choosing where to run it — not just picking the same type as last time.

## Configuration Reference

### Workload-to-Service Selection Table

| Workload Pattern | Recommended Service | Why It's Efficient | Alternative and When to Use It Instead |
|---|---|---|---|
| Stateless API / variable web traffic | Lambda + API Gateway or Fargate | Scales from zero; no idle capacity; no capacity planning | EC2 Auto Scaling — use when cold start latency is unacceptable or runtime exceeds 15 minutes |
| Relational database (OLTP, high concurrency) | Amazon Aurora (MySQL or PostgreSQL-compatible) | Up to 5x MySQL throughput; built-in read replicas; RDS Proxy for connection pooling | Amazon RDS — use when you need a specific database engine Aurora doesn't support (e.g., Oracle, SQL Server) |
| Relational database read scaling | Aurora Read Replicas | Up to 15 replicas; sub-second replica lag; separate reader endpoint | RDS Read Replicas — use with non-Aurora RDS engines; up to 5 replicas |
| Key-value caching (session data, query results) | Amazon ElastiCache for Redis | Sub-millisecond latency; persistence; pub/sub; complex data structures | ElastiCache for Memcached — use when you only need simple caching with no persistence or replication |
| NoSQL high-volume low-latency | Amazon DynamoDB | Single-digit millisecond at any scale; serverless on-demand mode; global tables | MongoDB on EC2 — only if you need document query features DynamoDB does not support |
| Full-text and log search | Amazon OpenSearch Service | Managed Elasticsearch/OpenSearch; auto-sharding; Kibana dashboards included | Self-managed OpenSearch — only when you need custom plugins or configurations AWS does not expose |
| Batch compute (CPU-bound) | EC2 Spot Instances (c-family) | Compute-optimized family plus Spot pricing delivers highest batch efficiency | EC2 On-Demand (c-family) — use when interruption tolerance is not possible |
| ML training (deep learning) | EC2 P-family (GPU) or AWS Trainium | Purpose-built for parallel floating-point operations; 10x–100x faster than CPU for training | SageMaker — use when you want a managed training environment without managing EC2 directly |
| ML inference at scale | EC2 Inf family (Inferentia) or SageMaker endpoints | Inferentia offers up to 70% lower cost per inference versus GPU for production inference | Lambda — use for very low-volume inference where managed serving overhead is not warranted |
| Static content and media delivery | Amazon CloudFront | 450+ edge locations; cache at the edge; reduces origin requests by 90%+ in typical deployments | S3 Transfer Acceleration — use when users are uploading large objects rather than downloading content |
| Time-series data (IoT, monitoring metrics) | Amazon Timestream | Purpose-built for time-series; automatic data tiering; native time-based query functions | DynamoDB with a time-based sort key — use when time-series is a minor access pattern alongside other queries |
| In-memory analytics / large dataset processing | EC2 R-family (memory-optimized) | High memory-to-CPU ratio; suitable for SAP HANA, large in-memory joins, Spark executors | M-family (general purpose) — use when the memory-to-CPU ratio of R-family exceeds what the workload needs |

### AWS Compute Optimizer: What It Analyzes and How to Read a Recommendation

Compute Optimizer is a free AWS service that analyzes Amazon CloudWatch utilization metrics from your running resources over a 14-day lookback period (extendable to 93 days) and uses machine learning to generate rightsizing recommendations. It supports EC2 instances, EC2 Auto Scaling groups, Amazon EBS volumes, AWS Lambda functions, and Amazon ECS services on Fargate.

**Enabling Compute Optimizer:**
1. Navigate to AWS Compute Optimizer in the console (search "Compute Optimizer" in the services bar)
2. Click "Get started" — opt in at the account level or, if you use AWS Organizations, at the organization level to analyze all member accounts centrally
3. Compute Optimizer begins analyzing resources automatically; initial recommendations appear within 12–24 hours as CloudWatch metric history is processed
4. For enhanced recommendations that include memory utilization, install the Amazon CloudWatch agent on EC2 instances — CloudWatch does not collect memory metrics by default, so without the agent, recommendations are based only on CPU and network

**Reading a recommendation — what each field means:**

| Recommendation Field | What It Tells You | How to Use It |
|---|---|---|
| Finding type | Over-provisioned, Under-provisioned, Optimized, or Not enough data | Start with Over-provisioned — these are direct cost and efficiency wins |
| Current instance | The running instance type and its on-demand hourly cost | Your baseline to compare against |
| Recommended instance | The suggested instance type with projected cost and projected performance change | Evaluate both the type change and the size change — they may be different families |
| CPU utilization percentiles | p99, p95, p50 of observed CPU over the lookback period | If p99 < 40%, the instance is a strong over-provision candidate; if p99 is near 100%, consider upgrading |
| Memory utilization (if CloudWatch agent installed) | p99, p95, p50 of memory utilization | Required to detect memory-bound workloads accurately |
| Risk level | Low / Medium / High — likelihood that the recommendation causes a performance regression | Start with Low risk recommendations; test Medium risk in staging before applying to production |

**Common recommendation patterns to know for the exam:**
- Instances consistently under 20% CPU utilization → Compute Optimizer recommends a smaller instance or a Graviton-based equivalent
- Instances with high CPU but low memory → Compute Optimizer may recommend switching from m-family (general purpose) to c-family (compute-optimized)
- Lambda functions hitting maximum configured memory with high duration → Compute Optimizer recommends increasing memory allocation (Lambda CPU scales proportionally with memory setting)

### CloudFront Cache Behavior Configuration Overview

CloudFront serves cached copies of content from edge locations physically close to users, reducing both origin load and geographic latency. A CloudFront distribution has one origin (or multiple origins) and one or more cache behaviors that define how requests to specific URL path patterns are handled.

**Key cache behavior settings:**

| Setting | Options | Performance Impact |
|---|---|---|
| Cache policy | CachingOptimized (AWS managed) or custom | CachingOptimized maximizes hit rate for static content; use custom when headers or query strings must be forwarded to the origin |
| TTL (Time to Live) | Minimum / Default / Maximum (seconds) | Longer TTL = higher cache hit rate = less origin load = lower latency for repeat requests; use versioned file names (e.g., app-v2.js) for static assets to allow long TTLs without serving stale content |
| Compress objects automatically | Enabled / Disabled | Enable for all text-based content (HTML, CSS, JS, JSON, XML); Gzip/Brotli compression reduces transfer size 60–80%, improving time-to-first-byte |
| Origin request policy | Controls which headers, cookies, and query strings are forwarded to the origin | Forward only what the origin actually needs to generate a response; every additional forwarded value creates more unique cache keys and reduces hit rate |
| Cache key components | URL path only (default) or URL + selected headers/cookies/query strings | Narrower cache key = higher hit rate; wider cache key = more cache entries, lower hit rate, more origin requests |

**Configuring cache behaviors in the console:**
1. Navigate to CloudFront → Distributions → select your distribution → Behaviors tab
2. Click "Create behavior" — specify the path pattern (e.g., `/static/*` for static assets, `*` for default)
3. Assign an origin, a cache policy, and an origin request policy
4. For static assets, attach the "CachingOptimized" managed cache policy
5. For dynamic API paths, attach a cache policy with a TTL of 0 (bypasses cache) or a short TTL appropriate to how often the content changes

## How to Decide

Use this framework when evaluating performance architecture decisions:

| Step | Question to Ask | Decision |
|---|---|---|
| 1 | Is the workload stateless, event-driven, and variable in traffic? | Yes → evaluate Lambda or Fargate before considering EC2 to eliminate capacity planning |
| 2 | What is the primary bottleneck — CPU, memory, I/O, or specialized compute (GPU)? | CPU → c-family; Memory → r-family; GPU/ML → p or g-family; Fast local NVMe I/O → i-family |
| 3 | What is the data access pattern — key-value, relational, or search? | Key-value → DynamoDB or ElastiCache; Relational → Aurora or RDS; Full-text search → OpenSearch Service |
| 4 | Is there a repeated-read caching opportunity (same data read many times)? | Yes → add ElastiCache (Redis for complex data types and persistence, Memcached for simple key-value) |
| 5 | Are users geographically distributed, or is latency a stated requirement? | Yes → add CloudFront; consider multi-region deployment with Route 53 latency-based routing |
| 6 | Is there 14+ days of CloudWatch metric history on running instances? | Yes → run Compute Optimizer to identify over- and under-provisioned resources with ML-backed evidence |
| 7 | Is this a new workload or an established one? | New → start with general purpose (m-family) and iterate; Established → use Compute Optimizer data to tune |

## How This Connects

- **Amazon CloudFront** implements "go global in minutes" by caching content at 450+ edge locations worldwide; it reduces both geographic latency and origin load simultaneously, and integrates with AWS WAF and Shield for security without sacrificing performance
- **Amazon ElastiCache** is the primary implementation of "democratize advanced technologies" for caching; it delivers Redis and Memcached as fully managed services, eliminating the operational burden of in-memory infrastructure while providing sub-millisecond response times
- **AWS Compute Optimizer** is the primary tool for identifying Performance Efficiency gaps in running workloads; it surfaces over-provisioned and under-provisioned resources with ML-based recommendations backed by actual CloudWatch utilization data, covering EC2, Auto Scaling groups, EBS, Lambda, and ECS on Fargate
- **AWS Lambda and AWS Fargate** implement "use serverless architectures" by eliminating capacity planning entirely and scaling automatically from zero to peak demand; they enable the highest possible utilization because you pay only for actual execution, not provisioned idle capacity
- **Amazon Aurora** demonstrates "democratize advanced technologies" for relational databases; it delivers up to 5x MySQL performance through a purpose-built distributed storage architecture — a result that a self-managed MySQL cluster would require substantial engineering investment to approach

## Exam Traps

**Trap 1: Confusing Performance Efficiency with Cost Optimization.** Both pillars care about resource sizing, but from different angles. Cost Optimization asks "am I spending too much?" Performance Efficiency asks "am I using the right type of resource for this job?" A workload running on the wrong instance family (for example, memory-optimized when it is actually CPU-bound) can be both expensive and underperforming simultaneously — a problem that rightsizing alone cannot fix without also changing the instance family. If an exam question describes poor performance alongside wasted resources, think Performance Efficiency first.

**Trap 2: Thinking CloudFront is only for static content.** CloudFront can serve dynamic content, API responses, and streaming media — not just static assets. Cache behaviors with a TTL of zero enable CloudFront to proxy dynamic content while still providing DDoS protection, SSL termination, and geographic routing benefits. The "go global in minutes" principle applies to dynamic applications as well as static ones. Don't eliminate CloudFront as an answer just because the question mentions dynamic or personalized content.

**Trap 3: Assuming Compute Optimizer recommendations are always correct.** Compute Optimizer analyzes CPU and memory metrics from CloudWatch. If your application has performance-relevant constraints not captured in CloudWatch — connection pool saturation, GC pause frequency, lock contention, specific database query patterns — the recommendation may be technically justified by its metrics while missing the actual performance bottleneck. Always validate recommendations with application-level testing before applying to production workloads.

**Trap 4: Treating serverless as always more performant than containers or EC2.** Lambda has cold start latency (50–500ms for JVM-based runtimes, 1–10ms for lightweight runtimes like Node.js or Python). For latency-sensitive workloads with consistently high traffic, provisioned concurrency (which pre-warms Lambda execution environments) or a container-based approach may provide more consistent sub-10ms response times. Serverless eliminates capacity planning but introduces cold start characteristics that must be accounted for in latency-sensitive applications.

**Trap 5: Confusing ElastiCache Redis with ElastiCache Memcached.** Redis supports complex data structures (sorted sets, lists, pub/sub messaging, streams), data persistence, and replication — making it suitable for session storage, real-time leaderboards, and pub/sub messaging in addition to caching. Memcached is a simple, multithreaded key-value cache with no persistence and no built-in replication — appropriate only for pure caching scenarios without high availability requirements. Exam questions mentioning "session management," "leaderboards," or "pub/sub" point to Redis; questions about a simple, disposable cache may accept either.

## Summary

- Performance Efficiency requires choosing the right resource type for each workload's characteristics — mechanical sympathy — and then continuously re-evaluating those choices as workloads and AWS service offerings evolve over time.
- "Democratize advanced technologies" means using managed services like ElastiCache, Aurora, and SageMaker to access sophisticated capabilities without maintaining the underlying infrastructure; the performance benefit comes from services optimized by dedicated AWS engineering teams.
- "Go global in minutes" using Amazon CloudFront and multi-region deployments is the only way to address geographic latency — no amount of instance sizing or code optimization can compensate for physical distance between users and servers.
- Serverless architectures (Lambda, Fargate) eliminate the capacity planning failure mode by scaling automatically from zero to peak demand, making it impossible to be simultaneously over-provisioned at normal load and under-provisioned at peak.
- AWS Compute Optimizer provides ML-based rightsizing recommendations backed by actual CloudWatch utilization data and requires the CloudWatch agent on EC2 to accurately assess memory utilization alongside CPU; it is the primary tool for identifying Performance Efficiency gaps in running workloads.
- Caching with ElastiCache is often the highest-ROI performance improvement for read-heavy workloads: a cache hit delivers sub-millisecond response and eliminates a database query entirely, compounding throughput and latency improvements across all layers of the stack.

## Examples

**Beginner:** A startup building a product recommendation engine for their online marketplace initially ran a self-managed Redis cluster on EC2 to cache recommendations. After evaluating the operational burden — managing replication, failover, patching, capacity planning, and monitoring — against the alternative, they migrated to Amazon ElastiCache for Redis. The managed service handled all of that complexity automatically. The team redirected the engineering hours they had been spending on Redis operations toward improving the recommendation algorithm itself. This is the "democratize advanced technologies" principle in practice: consume sophisticated capabilities without becoming the expert who maintains the underlying infrastructure. Performance stayed the same or improved; operational load dropped significantly.

**Intermediate:** A gaming company launched their new multiplayer title in a single AWS region (us-east-1) and found that players in Europe and Asia reported latency of 180–250ms, causing poor gameplay experiences in a latency-sensitive application. By deploying application servers to eu-west-1 and ap-southeast-1 and using Amazon Route 53 latency-based routing to direct players to their nearest region, they reduced median latency for international players to under 60ms. For static game assets — maps, textures, audio files — they placed Amazon CloudFront in front of S3, bringing asset delivery latency below 10ms for most players via edge cache hits. The workload didn't change; only its geographic distribution changed. This is "go global in minutes" as a concrete performance improvement, not just an architectural preference.

**Advanced:** A data analytics company ran nightly batch jobs on r5.4xlarge instances because that was the instance type originally provisioned years earlier. After enabling AWS Compute Optimizer and installing the CloudWatch agent to capture memory metrics, they discovered their jobs were consistently CPU-bound, not memory-bound — peak CPU utilization hit 95% while memory peaked at only 30% of available capacity. Compute Optimizer recommended switching to c5.4xlarge instances (compute-optimized, similar cost, significantly less memory but more CPU-optimized architecture). After the switch, jobs completed 22% faster at the same cost — a direct result of mechanical sympathy. They then evaluated AWS Graviton3-based c7g.4xlarge instances (ARM-based, 10% cheaper than c5, 15–20% faster for their Go-based processing code) and adopted them after a two-day recompilation effort. This two-step optimization — first correcting the instance family using Compute Optimizer evidence, then adopting the latest generation hardware — is the Performance Efficiency pillar's continuous review principle applied in practice.

## Think About It

1. The pillar recommends using managed services to "democratize advanced technologies." What is the hidden cost of this approach — what does your team give up when AWS manages the service, and in what situations might that trade-off be the wrong one?
2. Compute Optimizer can recommend a more cost-efficient instance type based on CloudWatch metrics. Why might following that recommendation mechanically, without understanding what the metrics actually represent, lead to a worse outcome than your current configuration?
3. "Experiment more often" is easier in the cloud than on-premises because experiments are cheap and fast. What organizational habits or incentive structures might still prevent teams from actually experimenting, even when the technical barriers are removed?
4. A web application experiences 10x traffic spikes every Friday evening. How would you decide between reactive Auto Scaling (scaling in response to CloudWatch metrics), scheduled scaling (proactive), and over-provisioning to handle this specific pattern?
5. AWS introduces new, more efficient instance types every 12–18 months. What would a responsible process for evaluating and adopting newer instance generations look like for a production workload — balancing the performance and cost benefits against the operational risk of change?

## Quick Check

**Q1.** Which AWS service analyzes your EC2 instance CloudWatch metrics and recommends rightsized instance types to improve performance or reduce cost?

- A) AWS Trusted Advisor
- B) AWS Cost Explorer
- C) AWS Compute Optimizer
- D) AWS Systems Manager

**Answer: C** — Compute Optimizer uses machine learning to analyze actual utilization patterns from CloudWatch and recommends optimal instance types for EC2 instances, Auto Scaling groups, EBS volumes, Lambda functions, and ECS on Fargate. Trusted Advisor provides broader checks but less granular rightsizing analysis than Compute Optimizer.

**Q2.** The "mechanical sympathy" principle says to choose resources that match the workload's characteristics. A machine learning training job is heavily parallelizable and requires fast floating-point math at scale. Which instance family is the best match?

- A) Memory-optimized (r-family)
- B) Storage-optimized (i-family)
- C) GPU-accelerated (p or g-family)
- D) Compute-optimized (c-family)

**Answer: C** — ML training is the canonical GPU workload. P-family instances (training) and g-family instances (training and inference) provide GPU accelerators specifically designed for parallel floating-point operations at the scale deep learning requires. General-purpose compute (c or m-family) would be orders of magnitude slower for equivalent cost on this type of workload.

**Q3.** A company wants to reduce the latency experienced by users in Asia Pacific who are accessing an application hosted in us-east-1. The application serves mostly static assets and API responses that can be cached. Which service most directly addresses the geographic latency problem?

- A) Amazon ElastiCache
- B) AWS Lambda
- C) Amazon CloudFront
- D) AWS Compute Optimizer

**Answer: C** — CloudFront caches content at over 450 edge locations globally, including locations in Asia Pacific. Users receive content from the nearest edge location rather than traveling all the way to us-east-1, directly reducing the geographic latency caused by physical distance. ElastiCache reduces database query latency but does not address geographic distance from the user to AWS infrastructure.

## What's Next

Next lesson: the Cost Optimization pillar — spending efficiently through FinOps practices, consumption-based pricing, commitment-based discounts, and systematic attribution of cloud expenditure to business value.

---
