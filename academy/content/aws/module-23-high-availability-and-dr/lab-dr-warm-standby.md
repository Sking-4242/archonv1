---
title: "Canvas Lab: Warm Standby DR Architecture"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: open
---

# Canvas Lab: Warm Standby DR Architecture

## Challenge

Design a warm standby disaster recovery architecture for a three-tier web application currently running in us-east-1. The business has an RTO target of 30 minutes and an RPO target of 5 minutes. The primary region serves all production traffic; the DR region (us-west-2) must be warm and ready to receive traffic within 30 minutes of a regional failure.

## Learning Objectives

- Achieve RPO ≤ 5 minutes using appropriate data replication
- Design the DR region as a scaled-down but fully functional application tier
- Configure automated failover triggering (Route 53 health check)
- Document the recovery runbook steps with time estimates summing to ≤ 30 minutes RTO

## Steps

1. Primary Region (us-east-1): ALB → ECS Fargate (desired 4) → Aurora Multi-AZ cluster
2. DR Region (us-west-2): ALB (pre-provisioned) → ECS Fargate (desired 1 — warm but minimal) → Aurora Global Database secondary cluster
3. Data Replication: Aurora Global Database with <1 second replication lag between us-east-1 and us-west-2 (achieves RPO < 5 min)
4. Add an S3 CRR rule for any static assets in the us-east-1 S3 bucket to us-west-2
5. Create Route 53 Health Check: HTTPS /health on the us-east-1 ALB, 10-second interval, failure threshold=3 (30 seconds to fail)
6. Create Route 53 Failover routing: Primary → us-east-1 ALB, Secondary → us-west-2 ALB (TTL=60s)
7. Annotate the recovery runbook: Health check fails (0-30s) → Route 53 switches to secondary (30s + TTL 60s = ~90s for DNS) → Promote Aurora Global DB secondary to standalone writer in us-west-2 (manual, ~1 min) → Scale ECS desired count from 1 to 4 (auto scaling, ~2 min) → Total RTO from detection: ~5 minutes, well under 30-minute target
8. Add EventBridge rule triggering an SNS alert when Route 53 health check fails — notifies operations team to begin DR procedure
9. Note the cost: DR region runs minimal ECS capacity (~1/4 production cost) + Aurora Global Database secondary (same storage cost, no compute charge when not serving traffic)

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.