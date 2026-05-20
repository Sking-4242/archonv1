---
title: "Canvas Lab: Cost Optimization Review"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: open
---

# Canvas Lab: Cost Optimization Review

## Challenge

An architecture has been pre-loaded on the canvas representing a web application that has grown organically over 2 years without deliberate cost optimization. Monthly cost is $15,000. Your task: review the architecture for cost optimization opportunities, annotate each finding with the estimated savings, and redesign the components with the highest cost savings potential.

## Learning Objectives

- Identify underutilized EC2 instances that should be right-sized or replaced with Fargate
- Identify missing S3 lifecycle policies and Intelligent-Tiering opportunities
- Identify On-Demand usage that should be covered by Savings Plans
- Identify data transfer costs that can be reduced
- Calculate estimated monthly savings for each finding

## Steps

1. Review the EC2 fleet: identify any instance types larger than needed (look for m5.4xlarge instances running at 20% CPU — recommend m5.large or Graviton m7g.medium)
2. Review the RDS instance: check if Multi-AZ is enabled on a dev environment (wasteful — disable for non-prod)
3. Review S3 buckets: identify buckets without lifecycle rules storing data >90 days in Standard class
4. Review NAT Gateway usage: check if EC2 instances are calling S3 through NAT GW (add S3 Gateway Endpoint to eliminate this cost)
5. Review data transfer: check if ALB is serving large files directly (should use CloudFront)
6. Check for unattached EBS volumes and old snapshots older than 90 days
7. Check On-Demand compute spend: recommend a Compute Savings Plan covering 70% of steady-state EC2 usage
8. Check for stopped EC2 instances that are still paying for EBS storage (delete or snapshot + terminate)
9. For each finding: annotate with (a) current estimated monthly cost, (b) optimized monthly cost, (c) implementation steps
10. Summarize total estimated monthly savings at the bottom of the canvas

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.