---
title: "Canvas Lab: Full Well-Architected Review"
type: canvas
estimated_minutes: 45
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: review
---

# Canvas Lab: Full Well-Architected Review

## Challenge

A production three-tier web application architecture has been pre-loaded on the canvas. It represents a real-world deployment that has evolved organically over 2 years without formal architectural review. Your task: conduct a Well-Architected Review across all six pillars, document every finding as an annotation on the canvas, classify each finding by severity (high/medium/low), and propose specific remediation for each high-severity finding.

## Learning Objectives

- Identify high-risk issues (HRIs) across all 6 WAF pillars
- Prioritize findings by business impact
- Propose specific, implementable remediations for each HRI
- Calculate estimated effort and business impact of fixing each HRI

## Steps

1. Operational Excellence Review: check for manual deployment processes, missing runbooks, no deployment pipeline, no observability stack — annotate each gap
2. Security Review: check for public S3 buckets, unencrypted storage, overly broad IAM roles, missing GuardDuty/CloudTrail, EC2 instances with public IPs in private subnets — annotate each gap
3. Reliability Review: check for single-AZ deployments, no Auto Scaling, no health checks, no Multi-AZ database, no DR plan, no backup policies — annotate each gap
4. Performance Efficiency Review: check for old EC2 instance types, no caching layer, no CDN for static content, synchronous calls where async would improve latency — annotate each gap
5. Cost Optimization Review: check for On-Demand instances that should have Savings Plans, idle resources, over-provisioned storage, missing S3 lifecycle policies, data transfer costs — annotate each gap
6. Sustainability Review: check for Graviton adoption opportunity, non-zero-scaling compute, unneeded always-on dev environments — annotate each gap
7. Classify each finding: HRI (immediate risk to availability, security, or significant waste) vs MRI (should be addressed in next sprint) vs LRI (best practice, low urgency)
8. For each HRI: add a remediation card with: specific AWS service change, estimated implementation time, estimated business impact (risk reduction or cost savings)
9. Create a summary panel: total HRIs, MRIs, LRIs by pillar; top 3 HRIs to fix first; estimated cost savings if all cost findings are fixed

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.