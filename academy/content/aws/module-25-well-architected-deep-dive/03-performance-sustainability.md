---
title: "Performance Efficiency and Sustainability Pillars"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Performance Efficiency and Sustainability Pillars

## Overview

Performance Efficiency and Sustainability are two pillars that are often treated as afterthoughts — addressed only when the system is already slow or when environmental reporting becomes a compliance requirement. Both deserve architectural attention from the start, and both reward the same underlying discipline: using the right resources at the right scale rather than defaulting to over-provisioning.

Performance Efficiency is about ensuring a workload uses computing resources efficiently to meet requirements, and maintaining that efficiency as demand changes and technology evolves. The key failure mode is resource mismatch — using a general-purpose instance for a workload that is inherently CPU-bound, or serving global users from a single region — where the waste is measured in latency that customers experience rather than dollars that appear on a bill. Sustainability is the newest pillar, added in 2021, and focuses on minimizing the environmental impact of cloud workloads. Its design principles push toward maximizing utilization, using energy-efficient hardware, and scaling to zero when workloads are idle — changes that overlap significantly with Cost Optimization.

For the SAA-C03 exam, understand the Performance Efficiency design principles, the role of caching (ElastiCache, DAX, CloudFront), instance selection (Graviton, compute-optimized, memory-optimized), and global distribution patterns (read replicas, Global Accelerator, Route 53 latency routing). SAP adds deeper treatment of the Sustainability pillar, the Customer Carbon Footprint Tool, and the trade-off analysis between performance and sustainability. After this lesson, you will be able to identify performance bottlenecks at each layer of an architecture and recommend the AWS service or configuration that addresses each one.

---

## Core Concepts

### Performance Efficiency: Right Resource Selection

The first step in Performance Efficiency is choosing the right resource type for the workload's actual performance characteristic. AWS provides instance families optimized for distinct bottlenecks:

- **Compute-optimized (C family)**: high CPU clock speed per core. Use for CPU-bound workloads: video encoding, batch data processing, scientific simulations, web servers under high request throughput.
- **Memory-optimized (R, X, U families)**: high memory-to-CPU ratio. Use for memory-bound workloads: in-memory databases (Redis), real-time big data analytics, SAP HANA, large caches.
- **Storage-optimized (I, D, H families)**: high local SSD throughput and IOPS. Use for I/O-bound workloads: NoSQL databases, data warehousing, Elasticsearch.
- **GPU instances (P, G, Inf families)**: parallel floating-point operations. Use for machine learning training and inference, graphics rendering, genomics.
- **AWS Graviton (ARM)**: up to 40% better price/performance than equivalent x86 instances for most workloads. Graviton3 instances use significantly less energy per transaction. Applicable to C, M, R, and other families.

The correct selection process: profile the workload first (CPU saturation? Memory pressure? I/O wait?), then match the instance family to the bottleneck. Defaulting to general-purpose `m` instances is not wrong — but it leaves performance per dollar on the table when the workload has a clear characteristic.

---

### Performance Efficiency: Caching and Global Distribution

Caching eliminates redundant computation and data retrieval by serving repeated requests from a fast, nearby data store. Applied at each layer:

- **CDN layer (CloudFront)**: caches static content (images, CSS, JS) and cacheable API responses at 400+ edge locations. Eliminates round-trips to the origin for cached content. Also reduces egress costs from EC2/ALB.
- **API layer (API Gateway caching)**: caches API responses at the API Gateway level for defined TTLs. Useful for API endpoints whose responses are expensive to compute but change infrequently.
- **Application layer (ElastiCache Redis or Memcached)**: caches database query results, user sessions, computed values. Reduces load on the primary database and latency for repeated queries.
- **Database layer (DAX for DynamoDB)**: DynamoDB Accelerator is an in-memory cache that sits in front of DynamoDB, providing microsecond read latency for frequently accessed items. Reduces DynamoDB read capacity consumption.

Global distribution addresses a different performance problem: latency from geographic distance between users and resources. Strategies:

- **Route 53 latency-based routing**: route users to the AWS Region with the lowest measured latency to that user's location.
- **CloudFront**: serves cached content from the nearest edge location, independent of where the origin is.
- **Aurora Global Database**: maintains a primary Region writer and up to 5 secondary Region readers with replication lag < 1 second. Read-heavy applications serve local reads from the nearest Region.
- **DynamoDB Global Tables**: multi-region, multi-active replication with eventual consistency. Writes accepted in any Region, replicated globally.
- **AWS Global Accelerator**: routes user traffic over AWS's private global network to the nearest healthy application endpoint, bypassing the public internet's variable routing.

---

### Sustainability: Design Principles and Goals

The Sustainability pillar defines six design principles that minimize the environmental impact of cloud workloads:

**Understand your impact**: measure what your workload consumes. Use the AWS Customer Carbon Footprint Tool to see estimated CO2-equivalent emissions by service and Region.

**Establish sustainability goals**: set specific targets for reducing emissions over time. Treat sustainability as a measurable engineering objective, not just a policy statement.

**Maximize utilization**: right-size workloads, use Auto Scaling to avoid idle resources, and share infrastructure where safe. An EC2 instance running at 8% CPU for most of the day is consuming energy to do almost nothing.

**Anticipate and adopt new, more efficient hardware**: AWS continuously releases new-generation instances with better performance per watt. Migrating from previous-generation to current-generation instances reduces energy consumption without sacrificing performance — often while improving it.

**Use managed services**: AWS's managed services achieve higher server utilization through multi-tenant packing. An RDS Multi-AZ instance shares physical infrastructure with other customers' workloads; a self-managed single-tenant EC2 database does not. Higher density = lower emissions per unit of work.

**Reduce the downstream impact of your cloud workloads**: compress data before transmission, use efficient data formats (Parquet instead of CSV for analytics), minimize client-side processing, and cache aggressively to reduce repeat computation.

---

### Sustainability in Practice

Concrete architectural decisions that improve sustainability (and frequently cost simultaneously):

- **Use Graviton processors**: Graviton3 instances deliver up to 60% lower energy consumption per transaction than equivalent x86 instances. This applies to any Graviton-supported instance family.
- **Enable Auto Scaling**: instances that scale to minimum capacity during off-peak hours avoid running at 5% utilization overnight.
- **Schedule dev/test environment shutdowns**: use AWS Instance Scheduler to stop non-production EC2 and RDS instances outside business hours. A dev environment running 24/7 at 10% utilization wastes ~67% of its energy footprint.
- **Use Spot Instances**: Spot uses existing spare capacity, maximizing hardware utilization across AWS's fleet — better from an energy perspective than dedicated On-Demand capacity.
- **Use serverless (Lambda, Fargate)**: serverless architectures scale 