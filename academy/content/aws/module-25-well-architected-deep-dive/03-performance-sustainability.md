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

## What's Next

Next up: the Module 25 Canvas Lab — a full Well-Architected Review exercise.