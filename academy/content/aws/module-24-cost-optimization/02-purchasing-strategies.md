---
title: "Reserved Instances, Savings Plans, and Spot"
type: content
estimated_minutes: 13
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Reserved Instances, Savings Plans, and Spot

## Overview

On-Demand pricing is AWS's full-price, no-commitment rate. It is appropriate for short-lived workloads, experiments, and capacity you genuinely can't predict. For everything else — the stable production database, the always-on application servers, the nightly batch fleet — On-Demand pricing is significantly more expensive than it needs to be. AWS offers three commitment-based pricing mechanisms that reduce compute costs by 40–90%: Reserved Instances, Savings Plans, and Spot Instances.

These three mechanisms address different scenarios. Reserved Instances and Savings Plans reduce cost through usage commitments — you commit to a minimum level of usage and AWS discounts the rate. Spot Instances reduce cost by using AWS's spare capacity — you accept interruption risk and AWS prices unused capacity at a fraction of On-Demand. Together, they form the toolkit for a cost-optimized compute strategy.

For the SAA and SAP exams, understand the specific commitment models of each option, their applicable use cases, the Convertible vs. Standard RI trade-off, and why Compute Savings Plans are now the preferred commitment vehicle for most workloads. After this lesson, you will be able to design a compute purchasing strategy that optimally blends On-Demand, committed, and Spot capacity.

---

## Core Concepts

### Reserved Instances (RIs)

Reserved Instances provide discounts of up to 72% over On-Demand in exchange for a 1-year or 3-year usage commitment. RIs apply automatically to matching running instances in the same account (or across the organization with consolidated billing) — no code or configuration change is required.

**Standard Reserved Instances**: lock in instance family, size, and region (and optionally AZ). Provide the maximum discount (up to 72% for 3-year All Upfront). Cannot change instance family during the term. Convertible RIs allow exchanging for a different instance family, OS, or tenancy during the term at a lower discount (~54%).

**Payment options**: All Upfront (highest discount, pay 100% at purchase), Partial Upfront (moderate discount, pay ~50% upfront + monthly), No Upfront (lowest discount, pay monthly — but still significantly cheaper than On-Demand). The discount difference between All Upfront and No Upfront is about 5–8 percentage points.

**Scope**: Region-scoped RIs apply to any AZ within the region. AZ-scoped RIs apply to a specific AZ and also reserve capacity in that AZ (useful for compliance workloads requiring specific AZ placement).

**RI Marketplace**: unused Standard RIs can be listed for sale in the RI Marketplace, allowing early exit from an unwanted commitment. Convertible RIs cannot be sold in the Marketplace.

**Use Standard RIs for**: specific, long-lived services with known instance types that will not change — production databases (RDS, ElastiCache), dedicated EC2 workloads with stable profiles.

---

### Savings Plans

Savings Plans commit to a consistent dollar amount of compute spend per hour in exchange for discounts. They are more flexible than RIs and are now the preferred commitment vehicle for most workloads.

**Compute Savings Plans**: apply to any EC2 usage (any family, size, region, OS, tenancy), AWS Fargate usage, and AWS Lambda usage — all from a single hourly commitment. The discount is approximately 66% vs. On-Demand. If you migrate from EC2 to Fargate, or move a workload to a different region, the Savings Plan commitment still applies. This flexibility is the key advantage over Standard RIs.

**EC2 Instance Savings Plans**: apply to a specific EC2 instance family in a specific region (e.g., all `m5` instances in us-east-1). More flexible than Standard RIs (size, AZ, and OS are flexible within the family) with higher discounts (~72%). Less flexible than Compute Savings Plans.

**How Savings Plans apply**: AWS bills your compute usage against On-Demand rates and then calculates the savings from your Savings Plan commitment. The commitment is a dollar-per-hour floor — if your actual hourly compute spend is $15 and your Savings Plan covers $10/hour, the $10/hour receives the plan discount and the remaining $5/hour is billed at On-Demand.

**Coverage vs. utilization**: monitor both metrics in Cost Explorer:
- **Coverage**: what percentage of your compute spend is covered by a commitment (goal: 70–80%)?
- **Utilization**: what percentage of your Savings Plan commitment is being used (goal: > 90%)?

Low coverage = leaving savings on the table. Low utilization = over-committed and paying for unused capacity.

---

### Spot Instances

Spot Instances use AWS's spare EC2 capacity at discounts of up to 90% vs. On-Demand. The trade-off: AWS can interrupt Spot Instances with a 2-minute interruption notice when it needs the capacity back for On-Demand or Reserved Instance customers.

**Spot interruption rate**: most Spot pools have a < 5% interruption rate per month. Individual pool rates vary by instance type, AZ, and time. The rate is dynamic — high-demand periods have higher interruption rates.

**Appropriate workloads**: batch processing, CI/CD build fleets, simulation and rendering, EMR data processing, fault-tolerant stateless web tiers (behind ALB, graceful instance shutdown on interruption notice), genomics analysis, model training with checkpointing.

**Inappropriate workloads**: production databases (interruption = corruption risk), stateful applications that cannot safely resume, any workload where a 2-minute shutdown window is insufficient.

**Spot best practices**:
- Use multiple instance types across multiple AZs (capacity pool diversification)
- Configure `capacity-optimized` Spot allocation strategy (picks the pool with most available capacity → lower interruption risk)
- Handle the interruption notice: poll the EC2 Instance Metadata Service for the `spot/termination-time` endpoint; drain connections and checkpoint state when notice arrives
- Set a baseline of On-Demand instances for stability; use Spot for additional capacity

---

## Configuration Reference

### Example: Purchase a Compute Savings Plan (AWS CLI)

```bash
# Step 1: Get a Savings Plan recommendation from Cost Explorer
aws savingsplans describe-savings-plans-offering-rates \
  --savings-plan-offering-types COMPUTE_SP \
  --products EC2 Fargate Lambda \
  --region us-east-1

# Step 2: Check your current Savings Plan coverage to inform commitment amount
aws ce get-savings-plan-coverage \
  --time-period '{"Start":"2024-11-01","End":"2024-12-01"}' \
  --granularity MONTHLY \
  --query 'SavingsPlansCoverages[0].Coverage.CoverageHoursPercentage' \
  --region us-east-1
# Target: 70-80% coverage. If current coverage is 40%, buy more.
# If current coverage is 95%, you may be over-committed.

# Step 3: Purchase a 1-year Compute Savings Plan (All Upfront)
aws savingsplans create-savings-plan \
  --savings-plan-type COMPUTE_SP \
  --term-duration-in-years 1 \
  --payment-option ALL_UPFRONT \
  --commitment 12.50 \
  --region us-east-1
# commitment 12.50: $12.50 per hour — commits to this spend rate for 12 months
# ALL_UPFRONT: full payment now for maximum discount
# This plan covers ~$110,000 of annual compute at ~66% savings vs On-Demand
```

> **Note:** Start with a 1-year term before committing to 3 years — architectural changes over 3 years (moving to Fargate, changing regions) can make a rigid commitment wasteful. Compute Savings Plans are more resilient to architectural evolution than EC2 Instance Savings Plans or Standard RIs, but a 3-year term still assumes significant stability.

---

### Exam