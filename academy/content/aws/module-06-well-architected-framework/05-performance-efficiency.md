---
title: "Pillar: Performance Efficiency"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp", "aws_saa", "aws_sap"]
---

# Pillar: Performance Efficiency

## Overview

The Performance Efficiency pillar focuses on using computing resources efficiently to meet requirements and to maintain that efficiency as demand changes and technologies evolve. It asks: are you using the right type and size of resource for each job?

## Performance Efficiency Principles

**Democratize advanced technologies:** Use managed services (RDS, ElastiCache, SageMaker) so your team can leverage sophisticated technology without becoming experts in it. AWS manages the complexity; you consume the capability. **Go global in minutes:** Deploy to multiple Regions to reduce latency for global users. **Use serverless architectures:** Eliminate the overhead of running and maintaining servers — Lambda and Fargate let you focus on code. **Experiment more often:** The cloud makes it cheap to benchmark different instance types, storage configurations, or architectures. Run A/B tests on infrastructure choices. **Consider mechanical sympathy:** Choose compute resources that match the workload's characteristics — memory-optimized for in-memory databases, compute-optimized for batch processing, GPU instances for ML training.

## Selection and Review

Selecting the right resource type is an ongoing process, not a one-time decision. What's optimal today may not be optimal as your workload evolves or as AWS introduces better instance types. AWS Compute Optimizer analyzes CloudWatch metrics and recommends right-sized instance types. AWS Trusted Advisor flags over-provisioned resources.

Performance benchmarking on AWS: use CloudWatch metrics (CPU, network, disk I/O) as the foundation. For databases, use RDS Performance Insights. For web applications, use AWS X-Ray to find bottlenecks. For infrastructure, the Load Testing tools in AWS Marketplace enable realistic traffic simulation.

## Summary

Performance Efficiency means choosing the right resource for each job (mechanical sympathy), leveraging managed services to access advanced technology, experimenting freely in the cloud, and continuously reviewing resource choices as workloads and AWS offerings evolve. Tools: Compute Optimizer (rightsizing), Trusted Advisor (performance alerts), X-Ray (application tracing).

## What's Next

Next: Cost Optimization — spending efficiently without over-provisioning or leaving idle resources running.
