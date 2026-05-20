---
title: "Canvas Lab: Multi-Region Route 53 Failover"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: open
---

# Canvas Lab: Multi-Region Route 53 Failover

## Challenge

Your application is deployed in us-east-1 (primary) and eu-west-1 (DR). Design a Route 53 failover configuration that automatically routes all traffic to eu-west-1 if the us-east-1 endpoint becomes unhealthy. The application is behind an Application Load Balancer in each region. The failover should trigger within 30 seconds of a health check failure and recover automatically when the primary region becomes healthy again.

## Learning Objectives

- Configure Route 53 health checks that accurately detect regional endpoint failures
- Use Route 53 Failover routing policy to implement active-passive DR
- Ensure the failover works without manual intervention
- Explain the DNS TTL implications for failover timing

## Steps

1. Drag two ALBs onto the canvas — one in us-east-1, one in eu-west-1
2. Create a Route 53 Hosted Zone for your domain
3. Create a Health Check targeting the us-east-1 ALB on HTTPS port 443 path /health, with a 10-second request interval and failure threshold of 3
4. Create an Alias record (A, Failover: Primary) pointing to the us-east-1 ALB, associate the health check
5. Create an Alias record (A, Failover: Secondary) pointing to the eu-west-1 ALB, no health check needed on secondary
6. Set TTL to 60 seconds on both records
7. Annotate the failover timeline: health check fails at t=0, 3 failures × 10s = 30s to trigger, DNS TTL 60s = worst case 90s total to failover
8. Add a CloudWatch Alarm on the health check metric and an SNS notification for when failover occurs

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.