---
title: "Instance Types and Families"
type: content
estimated_minutes: 10
cert_tags: ["aws_ccp", "aws_saa", "aws_soa"]
---

# Instance Types and Families

## Overview

AWS offers hundreds of EC2 instance types organized into families, each optimized for a specific workload profile. Choosing the right instance type is the first performance and cost decision for any EC2-based architecture. A mismatch — using a general-purpose instance for a memory-intensive workload, for example — wastes money and degrades performance.

## Instance Family Overview

EC2 instance families are identified by a letter prefix: **General Purpose (M, T)** — balanced CPU/memory ratio for web servers, development environments, small databases. T-family instances have burstable CPU (baseline CPU with credits for bursting). **Compute Optimized (C)** — high CPU-to-memory ratio for batch processing, scientific modeling, gaming servers, video encoding. **Memory Optimized (R, X, High Memory)** — high memory-to-CPU ratio for in-memory databases (Redis at scale, SAP HANA), real-time big data analytics. **Storage Optimized (I, D, H)** — high sequential read/write and high IOPS for data warehousing, Hadoop, distributed file systems. **Accelerated Computing (P, G, Inf, Trn)** — GPU or custom chip instances for ML training, inference, graphics rendering. **HPC Optimized (Hpc)** — for HPC workloads with high-performance networking.

## Instance Type Naming Convention

EC2 instance type names encode key characteristics: `m7g.2xlarge` breaks down as: **m** = family (general purpose), **7** = generation (7th), **g** = additional attribute (Graviton/ARM processor), **.2xlarge** = size (2x larger than xlarge in the same family).

Additional attributes in the naming: **a** = AMD EPYC processor, **g** = AWS Graviton (ARM-based, ~40% better price-performance), **i** = high I/O NVMe storage, **n** = enhanced networking, **d** = NVMe local SSD storage, **e** = extra storage or memory, **z** = high frequency CPU.

Newer generations within a family offer better performance at the same or lower price. When choosing between generations, newer is almost always better unless you have a specific compatibility reason for an older generation.

## Graviton Instances

AWS Graviton processors are AWS-designed ARM-based CPUs. Graviton 3 (current generation, used in m7g, c7g, r7g, etc.) delivers up to 40% better price-performance than comparable x86 instances. Graviton instances also use up to 60% less energy per equivalent workload — important for sustainability goals.

Most modern software runs on ARM without modification (Linux distributions, containerized applications, Java, Python, Node.js, Go). Applications compiled specifically for x86 may need recompilation. Most open-source software has ARM builds; AWS SDKs support ARM natively. If your workload isn't on Graviton yet, evaluate migrating — the cost savings are significant, especially with Reserved Instances.

## Summary

EC2 instance families optimize for different workload profiles: General Purpose (M/T) for balanced workloads, Compute Optimized (C) for CPU-intensive jobs, Memory Optimized (R/X) for large in-memory workloads, Storage Optimized (I/D) for high I/O, Accelerated (P/G/Inf) for ML and graphics. Instance names encode family, generation, processor, and size. Graviton (ARM) instances offer ~40% better price-performance than x86 equivalents.

## Examples

A startup runs a Node.js API backed by a PostgreSQL database. They initially pick a `t3.medium` (General Purpose, burstable) for both the app and DB tiers. The app works fine — it has irregular traffic and the T-family's credit model handles bursts well. But the database begins dropping queries under load because it has exhausted its CPU credits and falls back to the low baseline. Switching the DB to an `r7g.large` (Memory Optimized, Graviton) stabilizes performance and costs less per hour — a direct demonstration of why matching instance family to workload profile matters.

A video encoding company processes 10,000 uploaded videos per night, converting them to multiple resolutions. They benchmark `c7g.4xlarge` (Compute Optimized, Graviton) against `m7i.4xlarge` (General Purpose, Intel) for their ffmpeg workload. The C-family delivers 35% faster encode times at a lower hourly rate, because the high CPU-to-memory ratio of the C family aligns exactly with ffmpeg's compute-heavy, memory-light profile. The instance type naming — `c` for compute, `7` for 7th generation, `g` for Graviton — told them where to look before even running a benchmark.

A quant trading firm runs a real-time risk calculation engine that must process a 900 GB in-memory dataset in under 30 seconds. They evaluate `x2idn.32xlarge` (Memory Optimized, high I/O) from the X family, which provides 4 TB of RAM — far beyond what any R-family instance offers. Understanding that the X family exists specifically for workloads that have exhausted R-family options (SAP HANA, large in-memory analytics) is the kind of instance-family depth that separates architects from operators.

## Think About It

1. Why does AWS offer burstable T-family instances instead of simply giving all instances consistent CPU? What workload pattern makes burstable CPU a cost advantage rather than a liability?
2. If you're running a Java application on x86 today, what steps would you take before committing to Graviton (ARM) instances — and what would "done" look like for that evaluation?
3. How would you decide between a Compute Optimized (C) and a General Purpose (M) instance for a workload you've never run before? What data would you collect after the first week?
4. The instance name `m7g.2xlarge` encodes family, generation, processor, and size. What trade-off are you accepting when you choose a 6th-generation instance type over the equivalent 7th-generation one?
5. What trade-offs exist between running one large instance versus many smaller instances of the same total compute capacity (e.g., one `m7i.8xlarge` vs. four `m7i.2xlarge`)?

## Quick Check

**Q1.** A company needs to run an in-memory Redis cluster at very large scale. Which EC2 instance family is most appropriate?
- A) C (Compute Optimized)
- B) T (Burstable General Purpose)
- C) R (Memory Optimized)
- D) I (Storage Optimized)

**Answer: C** — Memory Optimized (R/X) instances provide a high memory-to-CPU ratio, making them ideal for large in-memory databases and caches like Redis.

**Q2.** What does the "g" attribute mean in the instance name `c7g.xlarge`?
- A) GPU-accelerated
- B) High I/O NVMe storage
- C) AWS Graviton (ARM-based) processor
- D) 7th generation graphics

**Answer: C** — In EC2 naming, "g" as a processor attribute denotes AWS Graviton (ARM-based), not GPU; GPU instances use the P or G family prefix instead.

**Q3.** Which EC2 instance family is best suited for a Hadoop distributed file system workload that requires high sequential read/write throughput?
- A) M (General Purpose)
- B) D or H (Storage Optimized, HDD-backed)
- C) P (Accelerated Computing, GPU)
- D) T (Burstable)

**Answer: B** — Storage Optimized families like D and H are designed for high sequential throughput workloads such as Hadoop and data warehousing, with dense HDD or high-throughput storage.

## What's Next

Next: AMIs and Launch Templates — the blueprints for standardizing how EC2 instances are configured and launched.
