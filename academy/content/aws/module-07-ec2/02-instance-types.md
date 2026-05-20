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

## What's Next

Next: AMIs and Launch Templates — the blueprints for standardizing how EC2 instances are configured and launched.
