---
title: "Instance Types and Families"
type: content
estimated_minutes: 12
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C02"]
---

# Instance Types and Families

## Overview

AWS offers hundreds of EC2 instance types organized into families, each optimized for a specific workload profile. The instance type you choose determines how much CPU, memory, network bandwidth, and local storage your instance gets — and directly determines how much you pay per hour. Choosing wrong is expensive in two directions: too small and your application performs poorly; too large and you waste money on capacity you never use.

Instance types are not arbitrary — each family exists because real workloads have distinct resource profiles. A web server handles many concurrent requests but uses modest memory per request. A machine learning training job burns through CPU or GPU cycles continuously. An in-memory database loads an entire dataset into RAM and needs memory far beyond what compute requires. AWS designed separate instance families for each of these profiles so you pay for exactly the resource mix your workload actually needs, rather than over-provisioning one dimension to get enough of another.

For the CCP exam, you need to know the major instance families and which workload each fits. For the SAA and SOA exams, you need to be able to select the right family and reason about the trade-offs — including burstable CPU behavior, Graviton migration, and the naming convention that encodes generation, processor, and attributes.

---

## Core Concepts

### Instance Families and Their Workload Profiles

EC2 instance families are grouped by their dominant resource characteristic. Here are the major families:

**General Purpose (M and T families)** — Balanced ratio of CPU to memory. M-family instances (m5, m6i, m7g, etc.) deliver consistent, non-burstable CPU suitable for web servers, application servers, development environments, and small-to-medium databases. T-family instances (t3, t3a, t4g) are burstable — they run at a lower CPU baseline and earn credits over time that can be spent on CPU bursts. This makes T-family excellent for workloads with intermittent CPU demand and costly for workloads with sustained high CPU.

**Compute Optimized (C family)** — High CPU-to-memory ratio. C-family instances (c5, c6i, c7g, etc.) deliver more vCPUs per dollar than M-family but less memory per vCPU. Best for CPU-intensive workloads where memory requirements are modest: batch processing, scientific modeling, video transcoding, high-performance web servers, gaming servers.

**Memory Optimized (R, X, and High Memory families)** — High memory-to-CPU ratio. R-family (r5, r6i, r7g) provides large amounts of RAM relative to CPU — ideal for in-memory databases (Redis, Memcached at scale), real-time big data analytics, and memory-intensive enterprise applications. X-family goes further — x2idn.32xlarge provides 4 TB of RAM — for workloads like SAP HANA that require massive in-memory datasets well beyond what R-family can accommodate.

**Storage Optimized (I, D, Im, Is families)** — High local storage throughput. I-family instances include NVMe SSD instance store for very high random IOPS (databases that need local storage: Cassandra, MongoDB). D and H families provide dense HDD storage for high sequential throughput (Hadoop, data warehousing, distributed file systems).

**Accelerated Computing (P, G, Inf, Trn families)** — GPU or custom silicon. P-family (p3, p4, p5) uses NVIDIA GPUs for ML training and HPC. G-family (g4, g5) uses NVIDIA GPUs for ML inference and graphics rendering. Inf-family uses AWS Inferentia chips (custom silicon) for cost-efficient ML inference. Trn-family uses AWS Trainium chips for ML training.

**HPC Optimized (Hpc family)** — High-performance computing with tightly coupled MPI workloads requiring Elastic Fabric Adapter (EFA) networking for ultra-low latency between instances.

---

### Reading the Instance Type Naming Convention

EC2 instance type names are structured and readable once you know the pattern. Take `m7g.2xlarge`:

- **`m`** — Family: General Purpose
- **`7`** — Generation: 7th (higher is newer and generally better price-performance)
- **`g`** — Processor attribute: AWS Graviton (ARM-based)
- **`.2xlarge`** — Size: 2× the vCPU/memory of `.xlarge` in this family

Common processor and feature attributes that appear between the generation number and the dot:

| Attribute | Meaning |
|---|---|
| `g` | AWS Graviton (ARM-based) processor |
| `a` | AMD EPYC processor |
| `i` | Intel processor (explicit) |
| `n` | Enhanced networking (higher bandwidth) |
| `d` | NVMe local SSD instance store included |
| `e` | Extra storage or memory within the family |
| `z` | High-frequency Intel Xeon CPU |
| `b` | Block storage optimized |
| `s` | Small (reduced memory in some families) |

Multiple attributes can combine: `r6idn.2xlarge` = Memory Optimized, 6th gen, Intel, local NVMe, enhanced networking.

The **size** suffix follows a consistent doubling pattern within a family. Going from `.large` to `.xlarge` doubles the vCPU and memory. Going from `.xlarge` to `.2xlarge` doubles again. This makes vertical scaling (sizing up or down) predictable — you always know exactly what you're getting.

---

### Burstable Instances: The T Family

T-family instances work differently from all other families. Rather than providing consistent CPU at a fixed level, they provide a CPU *baseline* (e.g., 20% of a vCPU for t3.micro) and earn CPU credits over time when running below that baseline. Credits are spent when CPU usage exceeds the baseline, enabling short bursts above the normal ceiling.

The credit model is powerful for workloads with genuinely spiky patterns — a development server that sits idle most of the day, a lightly-trafficked website, a scheduled batch job that runs briefly. In these cases, you pay for a small baseline and burst when needed, paying far less than an equivalent non-burstable M-family instance would cost.

The danger: if a T-family instance runs at high CPU continuously, it depletes its credit balance and throttles to the baseline — often dramatically degrading performance without an obvious cause. A database that "suddenly got slow" on a T-family instance is frequently a credit exhaustion problem, not a query problem.

**T Unlimited mode** allows the instance to continue bursting even after credits are depleted, charging a small overage fee per additional vCPU-hour. This eliminates throttling but removes the cost guarantee.

For workloads that need sustained CPU — production databases, CPU-intensive application servers, anything running above baseline most of the time — use M or C family, not T family.

---

### AWS Graviton: ARM in the Cloud

AWS Graviton processors are ARM-based chips designed by AWS specifically for cloud workloads. The current generation, Graviton3, delivers up to 40% better price-performance than comparable x86 instances for many workloads, and uses up to 60% less energy per unit of compute.

Graviton instances are identified by the `g` attribute in the instance name: `m7g`, `c7g`, `r7g`, `t4g`, etc. They run the ARM64 instruction set, which means:

- **Interpreted languages** (Python, Ruby, Node.js) and **managed runtimes** (Java on Corretto, .NET on .NET 6+) generally work without any code changes — just redeploy to a Graviton instance
- **Go and Rust** applications need to be compiled for `linux/arm64` but this is typically a one-line change in build scripts
- **Containerized workloads** need ARM64 container images — build with `--platform linux/arm64` or use multi-arch images
- **C/C++ applications** with x86-specific assembly or intrinsics may require code changes

For most modern cloud-native workloads, Graviton migration is low-risk and straightforwardly saves money. AWS Compute Optimizer will flag Graviton as a recommended alternative when your instance is over-provisioned.

---

### Choosing Instance Size: Right-Sizing

Within a family, size selection determines how much of the family's resource profile you get. The discipline of matching instance size to actual workload demand is called *right-sizing*.

The most common mistake is over-provisioning: launching an `m5.4xlarge` for an application that uses 25% CPU and 30% memory, because "bigger is safer." The correct approach is to start conservatively, measure actual utilization via CloudWatch, and resize — or use Auto Scaling to add more instances when demand grows rather than launching one permanently oversized instance.

**AWS Compute Optimizer** analyzes 14 days of CloudWatch metrics and provides specific resize recommendations with estimated cost savings. It surfaces both over-provisioned (pay less) and under-provisioned (improve performance) recommendations.

---

## Configuration Reference

### Finding the Right Instance Type in the Console

When launching an EC2 instance, click **Browse instance types** in the Instance type selection panel. The Instance Type Explorer opens with:

- **Filter by family**: check General Purpose, Compute Optimized, etc.
- **Filter by vCPUs and memory**: set minimum/maximum sliders
- **Filter by processor**: filter for Graviton (ARM) or x86
- **Columns**: vCPUs, Memory (GiB), Network bandwidth, EBS bandwidth, On-Demand price

Sort by **On-Demand price** ascending to find the cheapest option meeting your requirements. Sort by **vCPU** or **Memory** to compare within a family.

---

### Using the AWS CLI to Explore Instance Types

```bash
# List all instance types in a region with vCPU and memory info
aws ec2 describe-instance-types \
  --region us-east-1 \
  --query 'InstanceTypes[*].{Type:InstanceType,vCPUs:VCpuInfo.DefaultVCpus,MemoryGiB:MemoryInfo.SizeInMiB}' \
  --output table | head -50

# Filter for only Graviton (arm64) instance types
aws ec2 describe-instance-types \
  --region us-east-1 \
  --filters "Name=processor-info.supported-architecture,Values=arm64" \
  --query 'InstanceTypes[*].{Type:InstanceType,vCPUs:VCpuInfo.DefaultVCpus,MemGB:MemoryInfo.SizeInMiB}' \
  --output table

# Filter for memory-optimized family (r-family) instances
aws ec2 describe-instance-types \
  --region us-east-1 \
  --filters "Name=instance-type,Values=r*" \
  --query 'InstanceTypes[*].{Type:InstanceType,vCPUs:VCpuInfo.DefaultVCpus,MemGB:MemoryInfo.SizeInMiB}' \
  --output table

# Get Compute Optimizer recommendations for EC2 instances in your account
aws compute-optimizer get-ec2-instance-recommendations \
  --region us-east-1 \
  --query 'instanceRecommendations[*].{Instance:instanceArn,CurrentType:currentInstanceType,Recommended:recommendationOptions[0].instanceType,Savings:recommendationOptions[0].estimatedMonthlySavings.value}' \
  --output table
```

---

### Instance Family Quick Reference Table

| Family | Best For | Memory:vCPU | Example Types |
|---|---|---|---|
| T (burstable) | Dev/test, low-traffic websites, intermittent workloads | Moderate | t3.micro, t4g.small |
| M (general purpose) | Web servers, app servers, small DBs | Balanced (~4 GiB/vCPU) | m7i.large, m7g.xlarge |
| C (compute optimized) | Batch, video encoding, HPC, gaming | Low (~2 GiB/vCPU) | c7g.2xlarge, c6i.4xlarge |
| R (memory optimized) | In-memory DBs, Redis at scale, analytics | High (~8 GiB/vCPU) | r7g.xlarge, r6i.2xlarge |
| X (memory optimized) | SAP HANA, massive in-memory datasets | Very high (up to 4 TB RAM) | x2idn.32xlarge |
| I (storage optimized) | High random IOPS DBs (Cassandra, Mongo) | Moderate + NVMe | i4i.xlarge |
| D/H (storage optimized) | Hadoop, sequential throughput | Moderate + dense HDD | d3.xlarge, h1.2xlarge |
| P (accelerated) | ML training (NVIDIA GPU) | Varies | p4d.24xlarge |
| G (accelerated) | ML inference, graphics | Varies | g5.xlarge |
| Inf (accelerated) | Cost-efficient ML inference (Inferentia) | Varies | inf2.xlarge |

---

## How to Decide

Work through these questions in order when selecting an instance type:

**1. What is my workload's bottleneck — CPU, memory, I/O, or network?**
- CPU-bound (encoding, batch, modeling) → C family
- Memory-bound (large in-memory dataset) → R or X family
- I/O-bound (random IOPS) → I family
- Balanced/unknown → M family to start, right-size after measuring

**2. Is my CPU usage sustained or intermittent?**
- Sustained high CPU → M or C family (non-burstable)
- Intermittent / spiky → T family (burstable, cheaper for low average usage)

**3. Can my application run on ARM64?**
- Interpreted language (Python, Node, Java) or container → Yes, try Graviton (`g` suffix)
- x86-only dependency or native binary → Stay on x86 until evaluated

**4. What generation should I use?**
- Always prefer the latest generation unless a specific compatibility issue requires older
- Each new generation typically offers 10–20% better price-performance than the previous

**5. What size should I start with?**
- If migrating from on-premises: match current CPU/RAM and right-size after 2 weeks of CloudWatch data
- New workload: start one size smaller than you think you need, measure, and scale up

| Scenario | Recommended Family | Notes |
|---|---|---|
| WordPress blog, low traffic | t4g.small | Burstable, Graviton, cheapest option |
| Production PostgreSQL DB | r7g.large | Memory-optimized, Graviton |
| ffmpeg video transcoding | c7g.4xlarge | Compute-optimized, Graviton |
| Redis at 200 GB dataset | r7g.4xlarge | Memory-optimized |
| SAP HANA in-memory | x2idn.32xlarge | Only family with enough RAM |
| PyTorch ML training | p4d.24xlarge | NVIDIA A100 GPU |
| Hadoop cluster nodes | d3.2xlarge | Dense HDD, high sequential throughput |
| Dev/test environment | t3.micro or t3.small | Free tier eligible, burstable |

---

## How This Connects

- **Auto Scaling Groups** — Instance type selection is baked into the Launch Template that an Auto Scaling Group uses. You can specify multiple instance types in a mixed-instances policy, allowing the ASG to use whichever instance type is available (important for Spot Instances).
- **AWS Compute Optimizer** — Analyzes CloudWatch metrics from your running instances and recommends right-sized alternatives, including Graviton migration options, with estimated monthly savings.
- **EC2 Pricing Models** — The per-hour price of an instance type is the baseline; Reserved Instances and Savings Plans apply discounts on top. Graviton instances are cheaper at On-Demand rates AND receive the same percentage discounts from commitments.
- **EBS Volumes** — Instance type determines the maximum EBS bandwidth and IOPS an instance can sustain. A large gp3 volume attached to a small instance may not be able to use all the IOPS the volume is provisioned for — the instance becomes the bottleneck.
- **Placement Groups** — Some workloads using HPC or tightly-coupled distributed computing need to run on specific instance types (typically C, R, or P families) that support the high-bandwidth networking required for Cluster Placement Groups.

---

## Exam Traps

- **`g` in the name means Graviton, not GPU.** GPU instances use the `P` or `G` *family prefix*. The `g` *attribute* in a name like `m7g` means Graviton (ARM). This is one of the most-tested naming convention gotchas on the SAA exam.
- **T-family CPU credits can be exhausted.** A burstable instance running at high CPU continuously will throttle to its baseline, causing unexpected performance degradation. Databases are a common victim. If a T-family instance is "suddenly slow," check CPU credit balance in CloudWatch before investigating the application.
- **Bigger is not always better.** An oversized instance wastes money. An undersized instance creates performance problems. The right answer is right-sizing based on measured utilization, not intuition or "safe" over-provisioning.
- **Graviton requires ARM64 binaries.** You cannot run an x86-compiled binary on a Graviton instance without recompilation. Container images must also be built for `linux/arm64`. The exam may present Graviton as a straightforward swap — understand that binary compatibility must be verified first.
- **Generation matters more than you think.** Choosing a 5th-generation instance over a 7th-generation equivalent to save a few cents per hour is usually a false economy — the newer generation is faster and often cheaper. Always evaluate current-generation instances first.

---

## Summary

- EC2 instance families each optimize for a specific resource profile: General Purpose (M/T) for balanced workloads, Compute Optimized (C) for CPU-intensive jobs, Memory Optimized (R/X) for large in-memory workloads, Storage Optimized (I/D/H) for high I/O, and Accelerated Computing (P/G/Inf) for ML and graphics.
- Instance type names encode family, generation, processor attribute, and size — `m7g.2xlarge` means 7th-gen, Graviton, general purpose, 2× xlarge.
- The `g` attribute in a name like `c7g` means Graviton (ARM), not GPU; GPU instances use the `P` or `G` family prefix.
- T-family burstable instances earn CPU credits when idle and spend them during bursts — excellent for intermittent workloads, dangerous for sustained high CPU where credit exhaustion causes throttling.
- Graviton3-based instances offer up to 40% better price-performance and 60% lower energy consumption than comparable x86 instances; most interpreted languages and containers can migrate without code changes.
- Use AWS Compute Optimizer to get data-driven right-sizing and Graviton migration recommendations based on actual CloudWatch utilization metrics.

---

## Examples

A startup runs a Node.js API backed by a PostgreSQL database on identical `t3.medium` instances for both tiers. The API works well — traffic is irregular, the T-family credit model handles bursts, and utilization is low on average. But the database begins throttling queries under load. CloudWatch shows the CPU credit balance hitting zero and the CPU dropping to the 20% baseline. The fix: move the database to an `r7g.large` (Memory Optimized, Graviton) — more RAM for the database buffer pool, consistent non-burstable CPU, and actually cheaper per month than the `t3.medium` for sustained workloads. The lesson: match the instance family to the workload's actual resource profile, not to what seemed convenient at launch.

A video encoding company processes uploaded videos through ffmpeg, converting each to five resolution variants. Their initial fleet uses `m6i.4xlarge` (General Purpose, Intel 6th gen). Benchmarking shows CPU runs at 95–100% but memory never exceeds 15% of available RAM — the workload is strongly CPU-bound and memory-light. Switching to `c7g.4xlarge` (Compute Optimized, Graviton 3rd gen) provides 35% faster encode times at a lower hourly rate. The C family's higher CPU-to-memory ratio maps directly to what ffmpeg needs, and Graviton's per-core performance advantage in compute-heavy workloads compounds the savings. The instance naming convention told the architects exactly which family to evaluate first.

A quant trading firm runs a real-time risk calculation engine that loads a 900 GB historical dataset into memory at startup. The largest R-family instance (r6i.32xlarge) provides 1,024 GB of RAM — enough, but with little headroom. After six months, the dataset grows to 1.8 TB. The firm evaluates the X family: `x2idn.32xlarge` provides 4,096 GB of RAM (4 TB) with NVMe local SSD for staging data. No other EC2 family can accommodate this workload without sharding the dataset across multiple nodes, which would fundamentally change the application architecture. Understanding that the X family exists specifically for requirements that exhaust R-family capacity is the kind of instance-family depth that architects need for large-scale systems design.

---

## Think About It

1. Why does AWS offer burstable T-family instances instead of simply giving all general-purpose instances consistent CPU? What workload pattern makes burstable CPU a genuine cost advantage, and what pattern makes it a trap?
2. The `g` attribute in `m7g` means Graviton, but the `G` family prefix (as in `g5.xlarge`) means GPU. Why might AWS have created this naming ambiguity, and what's the safest way to avoid confusion when selecting instance types in the console or CLI?
3. You're migrating a Java application from an on-premises server to EC2. The server has 8 cores and 32 GB of RAM. What information would you gather before choosing an instance type, and why wouldn't you just pick the closest match to the existing hardware?
4. A team argues that they should always use `t3.large` instances because they're cheap and "can burst when needed." Under what specific conditions is this argument correct, and under what conditions is it dangerously wrong?
5. AWS Compute Optimizer recommends downsizing your fleet from `m5.2xlarge` to `m7g.large` — a different generation, different processor architecture, and a smaller size. What concerns would you want to address before implementing this recommendation in production?

---

## Quick Check

**Q1.** A company needs to run an in-memory Redis cluster at very large scale, holding a 500 GB dataset entirely in RAM. Which EC2 instance family is most appropriate?
- A) C (Compute Optimized)
- B) T (Burstable General Purpose)
- C) R (Memory Optimized)
- D) I (Storage Optimized)

**Answer: C** — Memory Optimized (R family) instances provide a high memory-to-CPU ratio designed specifically for large in-memory datasets like Redis caches and in-memory databases.

**Q2.** What does the `g` attribute mean in the EC2 instance name `c7g.xlarge`?
- A) The instance includes a dedicated GPU
- B) The instance uses an AWS Graviton (ARM-based) processor
- C) The instance is 7th generation with GPU capabilities
- D) The instance has high I/O NVMe local storage

**Answer: B** — In EC2 naming, `g` as a processor attribute (between the generation number and the dot) denotes AWS Graviton ARM-based processors. GPU instances use the `P` or `G` family prefix, not the `g` attribute.

**Q3.** A developer notices their `t3.large` application server is responding slowly and sees this CloudWatch metric at zero: `CPUSurplusCreditsCharged`. What is the most likely cause and the correct fix?
- A) The instance is out of memory — upgrade to an R-family instance
- B) The instance has exhausted its CPU credits and is throttled to baseline — move to an M-family instance for sustained CPU
- C) The EBS volume is the bottleneck — switch to io2
- D) Network bandwidth is saturated — enable Enhanced Networking

**Answer: B** — When a T-family instance exhausts its CPU credit balance, it throttles to the baseline CPU percentage (e.g., 20%), causing performance degradation. For workloads with sustained high CPU, a non-burstable M-family instance is the correct choice.

---

## What's Next

Next: AMIs and Launch Templates — the blueprints that define what software an EC2 instance starts with and how to standardize instance configuration for repeatable, automated deployments.
