---
title: "Performance Efficiency and Sustainability Pillars"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Performance Efficiency and Sustainability Pillars

## Overview

Performance Efficiency focuses on using the right resource types at the right scale. Sustainability is the newest pillar — focused on minimizing the environmental impact of cloud workloads. Both pillars are increasingly important on the SAP-C02 exam and in real architectural decisions.

## Performance Efficiency: Right Resource Selection

Understand the performance characteristics of your workload: CPU-bound (compute-optimized instances), memory-bound (memory-optimized), I/O-bound (SSD storage, provisioned IOPS), network-bound (enhanced networking, placement groups). Use the latest generation of instances — they deliver better performance per dollar. Graviton3 (ARM) instances offer up to 40% better price/performance than x86 equivalents for most workloads. Test different instance types with representative production load before committing.

## Performance Efficiency: Caching and Global Distribution

Caching moves data closer to consumers: ElastiCache Redis at the application layer, DAX for DynamoDB, CloudFront at the CDN edge, API Gateway caching for API responses. Global distribution: deploy compute in the regions closest to your users (latency-based Route 53 routing, Global Accelerator, CloudFront). For read-heavy workloads, read replicas in multiple regions serve local reads. Performance efficiency is about eliminating unnecessary latency at every layer of the stack.

## Sustainability Design Principles

AWS's Sustainability pillar focuses on minimizing the carbon footprint of cloud workloads. Design principles: understand your impact (use the Customer Carbon Footprint Tool), establish sustainability goals, maximize utilization (right-size, use Auto Scaling, share infrastructure), adopt new more efficient hardware (Graviton chips use 60% less energy per transaction than x86 equivalents), use managed services (more efficient packing than single-tenant), reduce downstream impact (compress data, minimize data transfer, use efficient formats like Parquet).

## Sustainability in Practice

Practical sustainability actions: use Graviton processors, enable Auto Scaling to avoid idle instances, schedule shutdown of dev/test environments overnight and weekends, use Spot Instances (maximizes utilization of existing hardware), store data in S3 Glacier instead of Standard for archival (denser storage, lower energy), use Fargate (no idle EC2 capacity), optimize code to reduce CPU cycles and memory usage. The Customer Carbon Footprint Tool provides estimated CO2e emissions for your AWS usage.

## Summary

Performance Efficiency: select the right resource type, use the latest generation, cache aggressively, distribute globally. Graviton instances deliver better price/performance for most workloads. Sustainability: right-size, use Graviton, scale to zero with serverless, schedule dev shutdowns. Both pillars reward thoughtful architecture over 'add more instances' solutions.

## Examples

A video transcoding startup was running their encoding jobs on m5.4xlarge instances (general purpose) and found that jobs were taking 45 minutes each. After reading that their workload was CPU-bound — encoding is computationally intensive — they tested c6g.4xlarge Graviton3 compute-optimized instances with a representative sample of production jobs. Encoding time dropped to 22 minutes and cost per job fell by 35%. This is right resource selection in practice: understanding the performance characteristic of the workload (CPU-bound) and matching the instance family (compute-optimized Graviton) to it.

An e-commerce platform serving customers across Europe and Southeast Asia was experiencing 600ms API response times for users in Singapore because all application servers were in us-east-1. Their database was read-heavy — product catalog and inventory queries. They added Aurora Read Replicas in ap-southeast-1 and configured Route 53 latency-based routing to direct Singapore users to the regional API fleet backed by the local read replica. Response times for Singapore users dropped to 80ms. This is global distribution plus read replica caching eliminating unnecessary latency at the architecture level.

A large enterprise running analytics workloads reviewed their AWS Customer Carbon Footprint Tool report and found that their biggest emissions source was hundreds of oversized EC2 instances running at under 10% CPU utilization — dev and test environments left running around the clock. They implemented Instance Scheduler to automatically stop non-production instances outside business hours and migrated batch analytics jobs to Spot Instances backed by Graviton2 processors. Their estimated CO2e emissions dropped by 52% in six months with no impact on production performance. This demonstrates that sustainability and cost optimization often point toward the same architectural decisions.

## Think About It

1. Why might choosing the latest generation instance type improve both performance and sustainability simultaneously? What underlying engineering dynamic makes those two goals align rather than conflict?
2. What would happen if a team added ElastiCache Redis caching in front of their database but didn't set appropriate TTLs on cached data? How does cache design affect both performance and correctness, and how would you reason about the right TTL for a product inventory record?
3. How would you decide between placing EC2 instances in a placement group versus distributing them across multiple Availability Zones? What does this choice reveal about the tension between performance efficiency and reliability?
4. The Sustainability pillar recommends using managed services partly because they achieve "more efficient packing than single-tenant." What does this mean, and why does AWS's ability to pack workloads more densely on shared hardware reduce environmental impact compared to dedicated instances?
5. If your workload is I/O-bound and you are currently using gp2 EBS volumes, what data would you collect to evaluate whether switching to gp3 or io2 would improve performance — and what trade-offs would you be making in each direction?

## Quick Check

**Q1.** A company wants to reduce the carbon footprint of their AWS workloads. Which processor family does AWS specifically recommend for its lower energy consumption per transaction compared to x86 equivalents?
- A) Intel Xeon Scalable (Ice Lake)
- B) AMD EPYC (Milan)
- C) AWS Graviton (ARM)
- D) NVIDIA A100 GPU instances

**Answer: C** — AWS Graviton processors use up to 60% less energy per transaction than equivalent x86 instances, making them the primary hardware recommendation under the Sustainability pillar.

**Q2.** A read-heavy application serving global users is experiencing high latency for users far from the primary AWS Region. Which combination of services best addresses this at the data and network layers?
- A) ElastiCache Redis + Direct Connect
- B) Aurora Read Replicas in multiple Regions + Route 53 latency-based routing
- C) RDS Multi-AZ + CloudTrail
- D) DynamoDB Global Tables + AWS Shield

**Answer: B** — Aurora Read Replicas in the user's local Region, combined with Route 53 latency-based routing to direct users to the nearest endpoint, reduces read latency by serving data closer to the consumer.

**Q3.** Which AWS tool allows you to measure the estimated CO2-equivalent emissions associated with your AWS account usage?
- A) AWS Compute Optimizer
- B) AWS Cost Explorer
- C) AWS Customer Carbon Footprint Tool
- D) AWS Trusted Advisor

**Answer: C** — The AWS Customer Carbon Footprint Tool provides estimated CO2e emissions data for your AWS usage, broken down by service and Region, supporting the Sustainability pillar's "understand your impact" design principle.

## What's Next

Next up: the Module 25 Canvas Lab — a full Well-Architected Review exercise.