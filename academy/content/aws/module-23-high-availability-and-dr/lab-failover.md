---
title: "Canvas Lab: Route 53 Health Checks and DNS Failover"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: Route 53 Health Checks and DNS Failover

## Challenge

A company runs a web application in us-east-1 with a pre-configured standby endpoint in us-west-2. They need to configure Route 53 health checks and DNS failover so that if the primary endpoint becomes unhealthy, traffic automatically shifts to the secondary — without manual intervention. Both ALB endpoints are already deployed; your task is to wire up the Route 53 configuration that makes failover automatic and observable.

## Learning Objectives

- Create a Route 53 HTTPS health check with a 10-second interval and 3-failure threshold
- Configure Failover routing with Primary and Secondary A records each associated with a health check
- Verify failover behavior by simulating a primary endpoint failure
- Understand the role of TTL in controlling failover speed
- Configure a CloudWatch Alarm and SNS notification for health check state changes

## Steps

1. In Route 53 → Health checks → Create health check: type HTTPS, endpoint = primary ALB DNS name, path `/health`, request interval = 10 seconds, failure threshold = 3
2. Create a second health check using the same settings targeting the secondary (us-west-2) ALB DNS name
3. Navigate to Hosted zones and open (or create) the hosted zone for your domain
4. Create a Primary A record: Alias = Yes, route traffic to the us-east-1 ALB, Routing Policy = Failover, Failover record type = Primary, associate the us-east-1 health check
5. Create a Secondary A record: Alias = Yes, route traffic to the us-west-2 ALB, Routing Policy = Failover, Failover record type = Secondary, associate the us-west-2 health check
6. Set TTL = 60 seconds on both records to limit DNS caching during failover
7. Run `dig +short yourdomain.com` from a terminal — confirm the response resolves to the primary ALB IP/DNS
8. Simulate a failure: update the `/health` endpoint on the primary to return HTTP 503
9. Wait approximately 30 seconds (3 consecutive 10-second check intervals) for the health check to mark the primary unhealthy
10. Re-run `dig +short yourdomain.com` — confirm the response now resolves to the secondary ALB
11. Open CloudWatch → Metrics → Route 53 → HealthCheckStatus for the primary health check; confirm the metric has dropped to 0
12. Create a CloudWatch Alarm on the primary HealthCheckStatus metric (threshold: < 1 for 1 datapoint) and connect it to an SNS topic with your email as a subscriber
13. Restore the primary `/health` endpoint to return HTTP 200 and re-run `dig` to confirm automatic failback to the primary

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
