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

## Examples

A startup building a recommendation engine for their online marketplace initially ran a self-managed Redis cluster on EC2 to cache product recommendations. When they evaluated the operational burden — managing replication, failover, patching, and capacity planning — against the alternative, they migrated to Amazon ElastiCache. The managed service handled all of that complexity, and the team redirected the engineering hours they had been spending on Redis operations toward improving their recommendation algorithm. This is the "democratize advanced technologies" principle: consume sophisticated capabilities without becoming the expert who maintains the underlying infrastructure.

A gaming company launched their new multiplayer title in one AWS region and initially served all players from US-East-1. Players in Europe and Asia reported latency of 180–250ms, which was causing poor gameplay experiences. By deploying application servers to eu-west-1 and ap-southeast-1 and using Amazon Route 53 latency-based routing to direct players to their nearest region, they reduced median latency for international players to under 60ms. The workload didn't change — only its geographic distribution. This is "go global in minutes" as a performance lever, not just a business one.

A data analytics company ran nightly batch jobs on r5.4xlarge instances because that was the instance type they had originally provisioned. After enabling AWS Compute Optimizer, they discovered that their jobs were consistently CPU-bound, not memory-bound — peak CPU utilization hit 95% while memory peaked at 30%. Compute Optimizer recommended switching to c5.4xlarge instances (compute-optimized, similar cost, less memory). After the switch, jobs completed 22% faster at the same cost. This is "mechanical sympathy" — matching the resource type to the workload's actual resource consumption pattern.

## Think About It

1. The pillar recommends using managed services to "democratize advanced technologies." What is the hidden cost of this approach — what does your team give up when AWS manages the service for you?
2. Compute Optimizer can recommend a more cost-efficient instance type based on CloudWatch metrics. Why might following that recommendation mechanically, without understanding what the metrics represent, lead to a worse outcome?
3. "Experiment more often" is easier in the cloud than on-premises because experiments are cheap and fast to spin up. What organizational habits or incentive structures might still prevent teams from actually experimenting, even when the technical barriers are removed?
4. A web application experiences 10x traffic spikes every Friday evening. How would you decide between using Auto Scaling (reactive scaling) versus scheduled scaling (proactive) versus over-provisioning to handle this pattern?
5. AWS introduces new, more efficient instance types every 12–18 months. What would a responsible process for evaluating and adopting newer instance generations look like for a production workload?

## Quick Check

**Q1.** Which AWS service analyzes your EC2 instance CloudWatch metrics and recommends rightsized instance types to improve performance or reduce cost?
- A) AWS Trusted Advisor
- B) AWS Cost Explorer
- C) AWS Compute Optimizer
- D) AWS Systems Manager

**Answer: C** — Compute Optimizer uses ML to analyze actual utilization patterns from CloudWatch and recommends optimal instance types for EC2 instances, Auto Scaling groups, EBS volumes, and Lambda functions.

**Q2.** The "mechanical sympathy" principle says to choose resources that match the workload's characteristics. A machine learning training job is heavily parallelizable and requires fast floating-point math. Which instance family is the best match?
- A) Memory-optimized (r-family)
- B) Storage-optimized (i-family)
- C) GPU-accelerated (p or g-family)
- D) Compute-optimized (c-family)

**Answer: C** — ML training is the canonical GPU workload; p-family instances (training) and g-family (training/inference) provide GPU accelerators specifically designed for parallel floating-point operations at the scale ML requires.

**Q3.** Which AWS service would you use to identify bottlenecks in a distributed web application's request path — for example, to find that 80% of latency comes from a single downstream microservice call?
- A) Amazon CloudWatch Metrics
- B) AWS X-Ray
- C) AWS Config
- D) Amazon Inspector

**Answer: B** — X-Ray traces requests as they travel through distributed application components, producing a service map and latency breakdown that identifies exactly where time is being spent in the request path.

## What's Next

Next: Cost Optimization — spending efficiently without over-provisioning or leaving idle resources running.
