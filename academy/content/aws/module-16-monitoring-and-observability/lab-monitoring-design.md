---
title: "Canvas Lab: Design a CloudWatch Observability Stack"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: open
---

# Canvas Lab: Design a CloudWatch Observability Stack

## Challenge

Design a complete observability architecture for a three-tier web application. The architecture must include: metrics collection and alarming for the compute, database, and application layers; centralized log management with a retention policy; distributed tracing for the API tier; a synthetic canary for external uptime monitoring; and automated alerting to the on-call team via PagerDuty (represented as an SNS topic).

## Learning Objectives

- Design CloudWatch metric alarms for key health indicators at each tier
- Configure log groups with appropriate retention and subscription filters
- Enable X-Ray tracing for the API and Lambda tiers
- Set up a Synthetics canary for external availability monitoring
- Route all alerts through a central SNS topic

## Steps

1. Add a CloudWatch Dashboard with widgets for: EC2 CPU/network, RDS connections/latency, ALB 5xx rate, Lambda error rate and duration
2. Create metric alarms: ALB 5xx > 1% for 5 minutes → SNS; RDS CPU > 80% for 10 minutes → SNS; Lambda errors > 5 in 1 minute → SNS
3. Create log groups: /app/api (7-day retention), /app/worker (30-day retention), /aws/lambda/function-name (14-day retention)
4. Add a subscription filter on /app/api to send ERROR logs to a Lambda alerting function
5. Enable X-Ray on the API Gateway and Lambda function; connect them with X-Ray segment visualization
6. Add a CloudWatch Synthetics Canary that checks /health endpoint every 5 minutes
7. Connect the Canary to a CloudWatch Alarm → SNS Topic → (PagerDuty webhook / email subscribers)
8. Add ServiceLens connecting the X-Ray service map to the CloudWatch metrics and logs
9. Annotate estimated monthly cost: CloudWatch metrics, logs ingestion/retention, X-Ray traces, Synthetics canary runs

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.