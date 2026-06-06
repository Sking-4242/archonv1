---
title: "High Availability Fundamentals"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# High Availability Fundamentals

## Overview

High Availability (HA) means designing systems that continue operating during failures without requiring human intervention. The mechanism is redundancy: every critical component has at least one equally capable peer, and automated health detection redirects traffic away from failures within seconds. Without HA, every hardware failure, software crash, or AZ-level disruption is a customer-visible outage. With it, failures are invisible events that the system handles on its own.

The problem HA solves is the single point of failure (SPOF). Every component that, if it failed, would take down the entire application is a SPOF — a single EC2 instance, a single RDS instance, a single NAT Gateway, a single Availability Zone. Eliminating SPOFs requires distributing across failure domains (AZs, regions) and automating the failure response at every layer. Adding redundant hardware without automated detection and failover is not HA — it is expensive decoration.

For the SAA exam, understand availability math (series vs. parallel calculations), SPOF identification and elimination, Multi-AZ patterns for each service tier, and health check types and their roles. SAP adds cross-region HA patterns (Global Accelerator, Aurora Global Database, Route 53 failover), active-active vs. active-passive design, and the operational requirements of maintaining HA over time. After this lesson, you will be able to calculate the availability of a multi-component system and identify and eliminate every SPOF in a described architecture.

---

## Core Concepts

### Availability Math

Availability is expressed as the percentage of time a system is operational over a given period.

| Availability | Max downtime/year | Common name |
|---|---|---|
| 99% | 87.6 hours | Two nines |
| 99.9% | 8.76 hours | Three nines |
| 99.99% | 52.6 minutes | Four nines |
| 99.999% | 5.26 minutes | Five nines |

**Components in series (all must work)**: availability = product of each component's individual availability. Three components each at 99.9% in series: 0.999 × 0.999 × 0.999 = **99.7%** — worse than any single component. Every component you add to a series reduces overall availability.

**Components in parallel (either can work)**: availability = 1 − (1 − each component's availability)^N. Two components each at 99% in parallel: 1 − (1 − 0.99)² = 1 − 0.0001 = **99.99%** — dramatically better than either component alone. This is why deploying across two AZs dramatically improves availability even when each AZ is only 99.9% reliable.

**Implication**: in a real system, the component with the lowest individual availability becomes the ceiling for the entire system. Improving a 99% component to 99.9% while leaving a 99.5% component unchanged barely moves the needle for the system's combined series availability.

---

### Eliminating Single Points of Failure

Every SPOF fits one of four categories — and has a corresponding elimination pattern:

**Single instance**: eliminate with multiple instances behind a load balancer. ALB health checks remove unhealthy instances automatically. Auto Scaling Group replaces terminated instances.

**Single AZ**: eliminate by distributing across 2+ AZs. ALB spans AZs; ASG places instances across AZs proportionally; RDS Multi-AZ keeps a standby in a second AZ with automatic failover.

**Single managed service without HA mode**: eliminate by choosing the HA configuration. Aurora Multi-AZ is on by default. RDS requires Multi-AZ to be explicitly enabled. ElastiCache Redis requires cluster mode or multi-AZ replication group.

**Single NAT Gateway**: a single NAT Gateway in one AZ is a SPOF for all private-subnet resources in other AZs. Eliminate by deploying one NAT Gateway per AZ, each handling traffic for instances in its AZ only.

---

### Health Checks as the HA Mechanism

Redundancy without automated health detection is not HA — it is unused capacity. Every layer of the stack needs a health check that detects failure and triggers remediation within seconds:

**ALB health checks**: poll registered targets (EC2 instances, ECS tasks, Lambda) on a configurable path, port, and interval. Unhealthy targets are removed from the rotation within seconds (healthy threshold × interval). New targets must pass health checks before receiving traffic.

**Route 53 health checks**: poll endpoints (HTTP/S, TCP) globally from multiple AWS health-check locations. When a health check fails, Route 53 DNS responses change — failover routing sends traffic to a healthy endpoint, and latency-based routing excludes unhealthy endpoints. DNS TTL determines how quickly client resolution updates (keep production DNS TTLs short: 60 seconds).

**Auto Scaling health checks**: EC2 status checks (hardware failure) and optional ELB health checks (application-level failure). A failed health check marks the instance for termination and replacement.

**RDS Multi-AZ**: continuous replication to a standby in a second AZ. On primary failure, RDS automatically promotes the standby — no manual intervention. DNS endpoint (`*.rds.amazonaws.com`) updates to point to the new primary; applications reconnect automatically.

---

### AWS Global Infrastructure for HA

**AZs within a region**: 2–6 AZs per region connected by high-bandwidth, low-latency (sub-millisecond) private fiber. Cross-AZ data transfer is inexpensive. The right granularity for most HA workloads — deploy across 2+ AZs for availability within a region.

**Regions**: geographically separated, independent control planes. Regional failures are rare but finite. Cross-region data transfer is more expensive than cross-AZ. Use for: disaster recovery, global latency reduction, regulatory data residency. Services for cross-region HA: Route 53 failover routing, AWS Global Accelerator, Aurora Global Database, DynamoDB Global Tables, S3 Cross-Region Replication.

**Global services** (by design, not needing explicit HA configuration): IAM, Route 53, CloudFront, WAF, Shield — these services have built-in global redundancy.

---

## Configuration Reference

### Example: Multi-AZ ALB + ASG Configuration (AWS CLI)

```bash
# Create an ALB spanning 3 AZs with health checks
aws elbv2 create-load-balancer \
  --name prod-api-alb \
  --subnets subnet-pub-1a subnet-pub-1b subnet-pub-1c \
  --security-groups sg-alb \
  --scheme internet-facing \
  --type application \
  --region us-east-1

# Create a target group with health checks
aws elbv2 create-target-group \
  --name prod-api-targets \
  --protocol HTTP \
  --port 8080 \
  --vpc-id vpc-prod \
  --health-check-protocol HTTP \
  --health-check-path /health \
  --health-check-interval-seconds 10 \      # check every 10 seconds
  --health-check-timeout-seconds 5 \        # wait up to 5s for response
  --healthy-threshold-count 2 \             # 2 consecutive successes = healthy
  --unhealthy-threshold-count 3 \           # 3 consecutive failures = unhealthy (30s total)
  --region us-east-1

# Create an ASG with minimum 2 instances across 3 AZs
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name prod-api-asg \
  --launch-template LaunchTemplateId=lt-abc123,Version='$Latest' \
  --min-size 2 \                            # never fewer than 2 — HA floor
  --max-size 20 \
  --desired-capacity 4 \
  --availability-zones us-east-1a us-east-1b us-east-1c \
  --target-group-arns arn:aws:elasticloadbalancing:...:targetgroup/prod-api-targets/... \
  --health-check-type ELB \                 # use ALB health checks, not just EC2 status checks
  --health-check-grace-period 120 \         # wait 120s for new instances before health checking
  --region us-east-1
```

> **Note:** Set `--health-check-type ELB` (not `EC2`) on the ASG. EC2 health checks only detect hardware/OS failures; ELB health checks detect application-level failures (the app is running but returning 500 errors). Without ELB health checks, a broken application on a healthy-looking EC2 instance stays in rotation and serves errors.

---

### Example: Multi-AZ NAT Gateway Setup

```bash
# Deploy one NAT Gateway per AZ — each AZ's private subnet routes to its own NAT GW
# This eliminates the NAT Gateway as a single point of failure

# AZ-a: NAT GW in public subnet of AZ-a
EIP_A=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
NATGW_A=$(aws ec2 create-nat-gateway \
  --subnet-id subnet-pub-1a \
  --allocation-id $EIP_A \
  --query NatGateway.NatGatewayId --output text \
  --region us-east-1)

# AZ-b: NAT GW in public subnet of AZ-b
EIP_B=$(aws ec2 allocate-address --domain vpc --query AllocationId --output text)
NATGW_B=$(aws ec2 create-nat-gateway \
  --subnet-id subnet-pub-1b \
  --allocation-id $EIP_B \
  --query NatGateway.NatGatewayId --output text \
  --region us-east-1)

# Private subnet in AZ-a routes through AZ-a's NAT GW
aws ec2 create-route \
  --route-table-id rtb-private-1a \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NATGW_A

# Private subnet in AZ-b routes through AZ-b's NAT GW
aws ec2 create-route \
  --route-table-id rtb-private-1b \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id $NATGW_B
# If AZ-b fails, only AZ-b's private instances lose internet — AZ-a is unaffected
```

---

## How to Decide

**Minimum HA configuration per tier:**

| Tier | Minimum HA configuration |
|---|---|
| Web / App (EC2) | ASG min=2, across 2+ AZs, behind ALB |
| Web / App (Fargate/ECS) | desired=2, across 2+ AZs, behind ALB |
| Database (RDS) | Multi-AZ enabled |
| Database (Aurora) | Multi-AZ (default), at least 1 read replica |
| Cache (ElastiCache Redis) | Multi-AZ replication group |
| Storage (S3, DynamoDB, EFS) | Managed HA by default |
| NAT Gateway | One per AZ |
| DNS | Route 53 health checks for critical endpoints |

**Selecting the right number of AZs:**

Two AZs meet most production HA requirements cost-effectively. Three AZs provide better fault isolation — if an AZ fails, the remaining two share load (33% reduction each vs. 100% on one AZ with only two). Use three AZs for critical services where N+1 redundancy across AZs is required.

**Cross-AZ vs. cross-region HA:**

Use cross-AZ (Multi-AZ) for: protection against single AZ hardware failure, networking issues, or power events. Use cross-region for: full regional outages (rare), compliance requirements for geographic separation, latency reduction for geographically distributed users, or regulatory data residency with active-active serving.

---

## How This Connects

- **Auto Scaling Groups** — The primary mechanism for eliminating single-instance SPOFs in the application tier. ASG maintains desired capacity, distributes across AZs, and replaces failed instances automatically — the operational complement to ALB health checks.
- **RDS Multi-AZ** — Eliminates the database SPOF. Synchronous replication to a standby in a second AZ; automatic failover promotes the standby and updates the DNS endpoint within 1–2 minutes. Applications reconnect at their next retry.
- **Route 53** — Provides DNS-level failover between regions (failover routing), traffic distribution (weighted, latency-based), and health-check-driven routing. The DNS layer is where cross-region HA is implemented.
- **AWS Global Accelerator** — Provides anycast IP addresses that route traffic to the nearest healthy regional endpoint via the AWS global network. Sub-minute failover, no DNS TTL delay, and improved latency via the AWS backbone — the high-performance alternative to Route 53 failover for latency-sensitive cross-region HA.
- **CloudWatch** — Monitors the health metrics that drive HA responses: ASG instance health, ALB healthy host count, RDS failover events. CloudWatch Alarms trigger SNS notifications when HA systems are degraded.
- **AWS Resilience Hub** — Analyzes deployed architectures for HA gaps (missing Multi-AZ, missing health checks, single NAT Gateways) and generates prioritized recommendations against your RTO/RPO targets.

---

## Exam Traps

- **Redundancy without health checks is not HA**: two EC2 instances in different AZs with no load balancer and no health checks is not HA — traffic still goes to the failed instance because nothing detects the failure. The exam tests this by describing redundant infrastructure without a routing or health-check layer and asking whether the architecture is highly available.
- **Single NAT Gateway is a SPOF even with multi-AZ instances**: this is one of the most commonly missed SPOFs. If all private-subnet instances in multiple AZs route through one NAT Gateway in AZ-a, and AZ-a fails, all instances lose internet/API access regardless of which AZ they are in. One NAT Gateway per AZ is the correct HA configuration.
- **`--health-check-type EC2` on an ASG will not catch application failures**: EC2 health checks detect hardware-level and OS-level failures only. An application process that crashes or starts returning 500 errors passes EC2 health checks. Set `--health-check-type ELB` to use the ALB's application-level health check results.
- **RDS Multi-AZ standby cannot serve read traffic**: the standby instance in an RDS Multi-AZ deployment is for failover only — it is not addressable and does not serve queries. This is frequently confused with a read replica. Use Read Replicas for read scaling; use Multi-AZ for HA/failover.
- **Series vs. parallel availability math direction**: adding components in series always reduces availability (multiply). Adding components in parallel always increases availability (1 − product of failure probabilities). The exam tests whether students apply the correct formula for a described architecture.

---

## Summary

- Availability is quantified as percentage uptime; each additional nine reduces annual downtime by ~10x. System availability equals the product of series component availabilities — every SPOF reduces the total.
- Parallel redundancy (1 − (1 − p)^N) dramatically increases availability — two 99% components in parallel yield 99.99%.
- Eliminate SPOFs at every tier: ASG + ALB for compute, Multi-AZ for databases, one NAT Gateway per AZ, Route 53 or Global Accelerator for cross-region DNS failover.
- Health checks are the operational mechanism that makes redundancy work — automated detection and traffic redirection must happen without human intervention for a system to be truly highly available.
- RDS Multi-AZ standby is for failover only (not read scaling); its failover promotes the standby and updates the DNS endpoint automatically within 1–2 minutes.
- Cross-AZ redundancy handles most production HA requirements; cross-region is for full regional outages, compliance, or global latency reduction.

---

## Examples

A regional online retailer ran their product catalog API on a single EC2 instance behind no load balancer. When a disk failure took the instance down at 11 PM on a Friday, the engineering team spent four hours manually launching a replacement, restoring the configuration from memory, and re-pointing the DNS record. After redesigning the architecture with an ASG (minimum 2, across two AZs) behind an ALB with ELB health checks, the next hardware failure was invisible to customers. The ALB removed the unhealthy instance within 30 seconds; the ASG launched a replacement within 3 minutes. Total customer impact: zero. This is SPOF elimination in its clearest form.

A mid-size SaaS company calculated that their payment service needed four-nines availability (52.6 minutes downtime/year). They had Multi-AZ RDS (each AZ at 99.95%), which in parallel gave approximately 99.9998% availability at the data tier — well above the target. But their application tier ran on a single EC2 instance. Applying the series formula, the combined availability dropped to about 99.95% × 99% ≈ 99%. Adding a second EC2 instance and an ALB brought the application tier parallel availability to 99.99%, and the full stack series calculation now exceeded four nines. This example shows why availability math forces architects to quantify every tier — not just the one they think is the weakest link.

A global fintech company serving 40 countries used Route 53 latency-based routing with health checks to split traffic between us-east-1 and eu-west-1. Each region had its own ALB, ASG, and Aurora cluster. They configured Route 53 health checks polling each region's ALB every 10 seconds with a failure threshold of 3 consecutive failures — meaning DNS failover occurs within 30 seconds of a regional failure. When us-east-1 was partially disrupted during a planned fire drill, Route 53 detected the failing health checks within 18 seconds and shifted all global DNS resolution to eu-west-1. Engineers confirmed the failover from a dashboard alert — no manual action was required.

---

## Think About It

1. Why is a single NAT Gateway a SPOF even if your EC2 instances are distributed across three AZs? Walk through the exact failure scenario, and then describe the corrected architecture.
2. A system has three components in series, each at 99.9% availability. Calculate the combined availability. Now improve one component to 99.99%. How much does that change the combined availability, and what does that reveal about where to invest in HA improvements?
3. Your team argues that because RDS Multi-AZ handles automatic failover, the database is no longer a concern for the overall HA calculation. Why is this reasoning incomplete, and what other database-adjacent SPOFs might remain?
4. How would you decide between Route 53 failover routing and AWS Global Accelerator for cross-region HA? What specific characteristics of your workload or traffic pattern would tip the decision in each direction?
5. What trade-offs do you accept when you rely entirely on AWS managed services (Aurora, DynamoDB, S3) for HA rather than designing your own redundancy with EC2-based components?

---

## Quick Check

**Q1.** An application tier consists of two EC2 instances, each with 99% availability, running in parallel behind an ALB. What is the combined availability of the application tier?

- A) 99%
- B) 98%
- C) 99.99%
- D) 100%

**Answer: C** — Parallel availability = 1 − (1 − 0.99)² = 1 − 0.0001 = 99.99%. Two 99% components in parallel are dramatically more available than either alone, because both would need to fail simultaneously to cause an outage.

---

**Q2.** An Auto Scaling Group has `--health-check-type EC2` configured. The application running on instances starts returning HTTP 500 errors due to a bug, but the EC2 instances themselves are healthy at the OS level. What happens?

- A) The ASG terminates the instances because the HTTP errors indicate failure
- B) The ALB continues routing traffic to the instances, and customers receive errors
- C) CloudWatch automatically switches the health check type to ELB
- D) The ASG scales out to additional instances to absorb the errors

**Answer: B** — EC2 health checks only evaluate OS-level and hardware health. A running EC2 instance with a broken application passes EC2 health checks — the ASG takes no action and the ALB continues routing traffic to it. Setting `--health-check-type ELB` enables the ASG to act on ALB health check failures (application-level), replacing broken instances automatically.

---

**Q3.** A production VPC has private subnets in three AZs, all routing through a single NAT Gateway in AZ-a. What is the failure impact if AZ-a becomes unavailable?

- A) Only instances in AZ-a's private subnet lose internet access; AZs b and c are unaffected
- B) All private-subnet instances in all three AZs lose internet access because all outbound traffic routes through the single NAT Gateway in AZ-a
- C) NAT Gateways automatically failover to another AZ when their host AZ fails
- D) Only the NAT Gateway is affected; EC2 instances in other AZs use their instance's public IP for outbound traffic

**Answer: B** — A single NAT Gateway is a SPOF for all private instances whose route tables point to it, regardless of which AZ those instances are in. When AZ-a fails, all routes to that NAT Gateway become unreachable, cutting off internet access for private subnets in all AZs. Deploy one NAT Gateway per AZ with each AZ's private route table pointing to its local NAT Gateway.

---

## What's Next

The next lesson covers Disaster Recovery strategies — how to design and choose between Backup-Restore, Pilot Light, Warm Standby, and Multi-Site Active-Active based on your RTO and RPO requirements. While HA handles component-level and AZ-level failures within a region, DR prepares for complete regional outages.
