---
title: "EC2 Pricing Models"
type: content
estimated_minutes: 14
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C02"]
---

# EC2 Pricing Models

## Overview

EC2 offers five distinct pricing models, each designed for a different workload profile. The right model for a given workload can reduce compute costs by 60–90% without changing a single line of application code. The wrong model costs real money — companies routinely over-pay for EC2 because they default to On-Demand for everything, or lock themselves into Reserved Instance commitments before they understand their actual usage patterns.

Understanding EC2 pricing models is not purely a cost management exercise. The pricing models shape architectural decisions: Spot Instance pricing makes fault-tolerant design economically rewarding, Savings Plans encourage workload stability, and Dedicated Hosts address compliance requirements that no other model can satisfy. The CCP exam tests which model fits which workload; the SAA exam tests how to combine models in a cost-optimized layered architecture.

The five EC2 pricing models are: **On-Demand** (pay per second, no commitment), **Savings Plans** (commit to an hourly spend, get a discount), **Reserved Instances** (commit to a specific instance configuration, get a larger discount), **Spot Instances** (bid on spare capacity at up to 90% discount, accept interruption risk), and **Dedicated Hosts** (physical server reserved for your exclusive use, primarily for compliance and BYOL licensing).

---

## Core Concepts

### On-Demand: Maximum Flexibility, Highest Cost

On-Demand instances bill per second (minimum 60 seconds) with no upfront commitment and no minimum usage period. You pay only for the compute time you use, and you can start and stop instances whenever you want.

On-Demand is the right choice when:
- The workload is new and you don't know its steady-state capacity requirements
- Traffic is genuinely unpredictable and peaks can't be forecasted
- The workload runs for short durations (hours, not months)
- You're in a development or testing environment where instances start and stop frequently

On-Demand is the wrong choice when a workload has been running in production for several months at a consistent baseline. At that point, you have enough data to commit to a Savings Plan or Reserved Instance and capture significant savings.

On-Demand is also used as the **burst tier** in a layered pricing architecture: buy commitments for your predictable baseline, let On-Demand handle unexpected demand spikes.

---

### Savings Plans: Flexible Commitments

Savings Plans commit you to a minimum hourly spend on EC2 (and optionally Lambda and Fargate) for 1 or 3 years in exchange for a discount of 20–66% compared to On-Demand. You choose:

- **Term**: 1 year (lower discount) or 3 years (higher discount)
- **Payment**: All Upfront (highest discount), Partial Upfront, or No Upfront (lowest discount)
- **Plan type**: Compute Savings Plans vs. EC2 Instance Savings Plans

**Compute Savings Plans** apply to any EC2 usage across any Region, any instance family, any OS, and any tenancy — plus Lambda and Fargate. If you switch from m5 in us-east-1 to m7g in eu-west-1, your Compute Savings Plan automatically applies. Maximum flexibility, ~20–66% discount depending on term and payment.

**EC2 Instance Savings Plans** commit to a specific instance family in a specific Region (e.g., the M family in us-east-1). Within that commitment, you can freely change size (large, xlarge, 2xlarge), OS (Linux, Windows), and tenancy (shared, dedicated). Higher discount than Compute Savings Plans — up to 72% for a 3-year all-upfront EC2 Instance Savings Plan.

**When to purchase**: After a workload has run in production for at least 4–8 weeks and you have reliable data on its steady-state resource consumption. Use the **Cost Explorer Savings Plans Recommendations** page — it analyzes your past usage and recommends exactly how much to commit, with a projected savings summary. Never commit before you understand actual usage.

---

### Reserved Instances: The Highest Discount with the Least Flexibility

Reserved Instances (RIs) are the older predecessor to Savings Plans. They offer the highest potential discounts — up to 72% for Standard RIs on a 3-year all-upfront term — but with much less flexibility.

**Standard RIs** lock you into a specific instance type (family, generation, size), Region, and OS. They cannot be changed. If your workload moves from `m5.large` to `m6i.large`, your Standard RI for `m5.large` no longer applies. Standard RIs can be sold on the AWS Reserved Instance Marketplace if you no longer need them.

**Convertible RIs** allow you to exchange the RI for a different instance type, Region, or OS during the term. Lower discount than Standard RIs (~54% for 3-year all-upfront) but significantly more flexibility. Cannot be sold on the Marketplace.

In practice, most teams should use **Savings Plans** rather than Reserved Instances for new commitments — Savings Plans offer similar or equivalent discounts with far better flexibility. Reserved Instances remain relevant for specific compliance scenarios (some AWS services require RIs) and for teams with very stable, unchanging workloads where the higher discount of a Standard RI justifies the inflexibility.

---

### Spot Instances: Maximum Savings for Fault-Tolerant Workloads

Spot Instances access AWS's spare EC2 capacity at discounts of 60–90% below On-Demand pricing. The critical trade-off: AWS can reclaim Spot Instances when the capacity is needed for On-Demand customers or when the Spot price rises above your maximum bid (which by default equals the On-Demand price).

AWS provides two signals before reclaiming a Spot Instance:
- **EC2 Instance Rebalance Recommendation**: an early signal (can arrive minutes before interruption) indicating the instance is at elevated interruption risk. Applications should use this signal to proactively drain and checkpoint before the 2-minute notice arrives.
- **Spot Instance Interruption Notice**: a definitive 2-minute warning delivered via EC2 instance metadata and EventBridge. After this notice, the instance will be interrupted within 2 minutes.

Designing applications to respond to the Rebalance Recommendation — not just the 2-minute notice — allows significantly more graceful draining time. This interruption risk sounds severe, but many workloads are genuinely tolerant of it. AWS Batch automatically retries interrupted Batch jobs. Amazon EMR handles Spot interruptions by migrating tasks to other nodes. Kubernetes with Karpenter or Spot-aware node groups drains pods gracefully on the Rebalance Recommendation and reschedules them on other nodes.

**Designing for Spot:**
- **Diversify across instance types and AZs**: Use 5+ instance types in 3 AZs. When one type's Spot price rises, capacity remains available in others. Use an EC2 Fleet or Auto Scaling group mixed-instances policy to implement this.
- **Use Spot-aware tools**: AWS Batch, EMR, EKS with Karpenter, Spot.io, or similar tools that handle the 2-minute warning gracefully.
- **Make work checkpointable**: For long-running jobs, checkpoint progress frequently so an interruption loses at most a few minutes of work, not hours.
- **Set interruption behavior**: Configure instances to `terminate`, `stop`, or `hibernate` on interruption based on your application's needs.

**Workloads suited for Spot**: CI/CD build runners, ML training jobs, genomics pipelines, video transcoding, data analytics with AWS Batch or EMR, web crawler infrastructure, load testing.

**Workloads NOT suited for Spot**: production databases, stateful applications that can't checkpoint, customer-facing APIs with latency SLAs, anything with a "must complete" requirement.

---

### Dedicated Hosts: Physical Server Exclusivity

A Dedicated Host is a physical EC2 server allocated exclusively to your account. You are not sharing the physical host with any other AWS customer. Key use cases:

**BYOL (Bring Your Own License)**: Some enterprise software licenses (Oracle, Microsoft SQL Server, Microsoft Windows Server with Software Assurance) are tied to physical cores or physical sockets. Running on shared EC2 infrastructure makes license compliance difficult because you don't control which physical hardware you run on. A Dedicated Host gives you visibility into the physical socket/core count, enabling license compliance.

**Compliance**: Some regulatory frameworks require dedicated physical infrastructure to ensure true isolation. Dedicated Hosts provide documented physical separation.

**Dedicated Instances** (different from Dedicated Hosts) run on hardware dedicated to your account but you don't have visibility into the specific physical host and can't control placement. They cost less than Dedicated Hosts but provide less control.

Dedicated Hosts are significantly more expensive than shared tenancy. The decision to use them should be driven by a genuine licensing or compliance requirement, not a vague security concern — AWS's shared tenancy is highly secure due to the Nitro hypervisor's isolation guarantees.

---

## Configuration Reference

### Purchasing a Savings Plan

Navigate to **AWS Cost Management → Savings Plans** in the console:

1. Click **Purchase Savings Plans**
2. Choose the **Savings Plan type**:
   - **Compute Savings Plans** — most flexible, applies to EC2 + Lambda + Fargate across all Regions
   - **EC2 Instance Savings Plans** — higher discount, specific to one instance family in one Region
3. Choose the **Term**: 1 year or 3 years
4. Choose the **Payment option**: All Upfront / Partial Upfront / No Upfront
5. Set the **Hourly commitment** in dollars (e.g., $1.00/hour = $730/month commitment)
6. Review the **Estimated savings** panel — this shows your projected savings at the entered commitment level
7. Click **Add to cart**, review, and confirm purchase

**How to determine the right commitment amount**: Navigate to **Cost Management → Savings Plans → Recommendations**. AWS analyzes your past 7, 30, or 60 days of usage and recommends a commitment amount with projected annual savings and return on investment. Start with the recommended amount rather than guessing.

---

### Requesting Spot Instances via the CLI

```bash
# Request a single Spot Instance (simple, not recommended for production)
aws ec2 request-spot-instances \
  --instance-count 1 \
  --type "one-time" \                      # or "persistent" for a standing request
  --launch-specification '{
    "ImageId": "ami-0abc1234567890def",
    "InstanceType": "m7g.large",
    "KeyName": "my-key-pair",
    "SecurityGroupIds": ["sg-0abc12345"],
    "SubnetId": "subnet-0def67890"
  }'

# Better: Use an Auto Scaling Group with mixed instances policy for production Spot
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name "my-spot-asg" \
  --min-size 2 \
  --max-size 20 \
  --desired-capacity 5 \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {
        "LaunchTemplateName": "my-launch-template",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "m7g.large"},
        {"InstanceType": "m7i.large"},
        {"InstanceType": "m6g.large"},
        {"InstanceType": "m6i.large"},
        {"InstanceType": "c7g.large"}
      ]
    },
    "InstancesDistribution": {
      "OnDemandBaseCapacity": 2,             # Always keep 2 On-Demand instances for stability
      "OnDemandPercentageAboveBaseCapacity": 20,  # Above the base, 20% On-Demand, 80% Spot
      "SpotAllocationStrategy": "capacity-optimized"  # Choose the pool with most available capacity
    }
  }' \
  --availability-zones "us-east-1a" "us-east-1b" "us-east-1c"

# Check current Spot price history for an instance type
aws ec2 describe-spot-price-history \
  --instance-types m7g.large m7i.large \
  --product-descriptions "Linux/UNIX" \
  --start-time 2024-01-01T00:00:00Z \
  --query 'SpotPriceHistory[*].{Type:InstanceType,AZ:AvailabilityZone,Price:SpotPrice,Time:Timestamp}' \
  --output table \
  --region us-east-1
```

---

### EC2 Pricing Comparison Table

| Model | Discount vs. On-Demand | Commitment | Interruption Risk | Best For |
|---|---|---|---|---|
| On-Demand | 0% (baseline) | None | None | New workloads, unpredictable traffic, short jobs |
| Compute Savings Plan (1yr, no upfront) | ~20–40% | Hourly spend, 1yr | None | Flexible baseline with EC2/Lambda/Fargate mix |
| EC2 Instance Savings Plan (1yr, all upfront) | Up to 60% | Hourly spend, 1yr, one family | None | Stable single-family workloads |
| Standard RI (3yr, all upfront) | Up to 72% | Specific instance type, 3yr | None | Very stable, unchanging workloads |
| Spot | 60–90% | None | 2-min warning | Fault-tolerant batch, CI/CD, ML training |
| Dedicated Host | Higher than On-Demand | Per-host billing | None | BYOL licensing, physical compliance requirements |

---

## How to Decide

Work through these questions for every workload:

**1. Can this workload tolerate a 2-minute interruption?**
- Yes → Spot Instances are a candidate (60–90% savings)
- No → Spot is off the table; evaluate On-Demand, Savings Plans, or RIs

**2. How long has this workload been running in production?**
- Less than 4 weeks → On-Demand only; no commitment yet
- 4–8 weeks → Use Cost Explorer Savings Plans Recommendations; consider purchasing
- 3+ months of stable data → Strong candidate for EC2 Instance Savings Plan or Standard RI

**3. How stable is the instance family/Region combination?**
- Might change family or Region → Compute Savings Plan
- Stable on one family in one Region → EC2 Instance Savings Plan (higher discount)
- Very stable, same instance type for years → Standard Reserved Instance

**4. Are there licensing or compliance constraints?**
- BYOL Oracle/SQL Server per-core licensing → Dedicated Host required
- Regulatory physical isolation requirement → Dedicated Host
- No special licensing → Shared tenancy (standard EC2)

**5. What term length makes sense?**
- Uncertain business trajectory → 1-year term
- High confidence in workload stability → 3-year term for maximum discount
- Never commit 3 years to a workload that might disappear in 12 months

---

## How This Connects

- **Auto Scaling Groups** — ASGs with mixed-instances policies implement the production-grade Spot architecture: On-Demand base capacity for stability, Spot for the majority of capacity to capture savings. When Spot is interrupted, the ASG automatically replaces instances.
- **AWS Batch** — The canonical Spot-native service. Batch manages job queues, handles Spot interruptions by retrying jobs, and can run jobs on Spot without any application-level changes to handle interruptions.
- **Cost Explorer** — The primary tool for analyzing past usage and generating Savings Plans recommendations. The "Savings Plans → Recommendations" page does the math for you: how much to commit and what the expected return is.
- **AWS Budgets** — Set a budget alert specifically for EC2 Spot spend. If Spot prices spike in a Region (rare but possible), a budget alert warns you before your bill exceeds expectations.
- **Amazon EMR** — EMR clusters can use Spot for task nodes (fault-tolerant) and On-Demand for master and core nodes (must not be interrupted). This is the standard cost-optimized EMR architecture.

---

## Exam Traps

- **Spot Instances can be interrupted — not all workloads qualify.** A database, a customer-facing API, or any "must complete" job is not Spot-appropriate regardless of the cost savings. The exam will present scenarios where Spot seems tempting; the correct answer is On-Demand or Savings Plans when reliability is required.
- **Savings Plans and Reserved Instances are not the same thing.** Savings Plans commit to an hourly dollar amount and offer flexibility across instance types. Reserved Instances commit to a specific instance configuration and offer the highest discounts but least flexibility. Know which is which.
- **The 2-minute Spot interruption notice is not a guarantee of that much time.** In practice you usually get 2 minutes, but the Spot instance could be interrupted faster. Workloads should checkpoint at intervals well under 2 minutes if they need to recover gracefully.
- **Committed Savings Plans don't reduce to zero if not fully used.** If you commit $1.00/hour in Savings Plans but only use $0.50/hour of eligible compute, you still pay the full $1.00/hour commitment. Over-purchasing is a real cost risk — use the Recommendations page rather than guessing.
- **On-Demand is billed per second (minimum 60 seconds), not per hour.** A common misconception is that stopping an instance after 5 minutes incurs a full hour of charges. The minimum is 60 seconds, then per-second billing applies.

---

## Summary

- EC2 has five pricing models: On-Demand (per-second, no commitment), Savings Plans (hourly spend commitment, 1–3yr), Reserved Instances (specific instance commitment, highest discount), Spot (spare capacity at 60–90% discount with interruption risk), and Dedicated Hosts (physical server for BYOL/compliance).
- Use On-Demand for new workloads and unpredictable traffic; after 4–8 weeks of stable production data, use Cost Explorer Savings Plans Recommendations to determine the right commitment amount.
- Compute Savings Plans are more flexible (any EC2/Lambda/Fargate, any Region) but offer slightly lower discounts than EC2 Instance Savings Plans (one family, one Region).
- Spot Instances save 60–90% but require fault-tolerant workload design — the 2-minute interruption warning must be handled gracefully by the application or framework (AWS Batch, EMR, Karpenter).
- Dedicated Hosts are for BYOL licensing compliance (Oracle, SQL Server per-core) and regulatory physical isolation requirements — not a general security measure.
- Production architectures layer pricing models: Reserved/Savings Plan baseline + On-Demand for bursts + Spot for batch/background work.

---

## Examples

A bootstrapped startup launches their first production API on a single `t3.small` On-Demand instance. At approximately $0.021/hour, the monthly cost is about $15 — a reasonable price for the flexibility to resize or shut down anytime. Three months in, traffic has stabilized at a consistent baseline. They open Cost Explorer's Savings Plans Recommendations page, which shows that committing $0.40/hour with a 1-year Compute Savings Plan would save them $312/year. They purchase the plan and their monthly bill drops 34% with zero changes to their infrastructure. This is the correct sequence: observe in production, let data guide the commitment, then buy.

A genomics research company runs massively parallel DNA sequencing jobs using AWS Batch. Each Batch job processes one genomic sample through a pipeline of analytical steps, with each step checkpointing its output to S3 before starting the next. If a Spot Instance is interrupted mid-step, Batch retries that step automatically from the last checkpoint — the total job loses at most a few minutes of work. They configure their Batch compute environment with Spot Instances across five instance types (`m7g.large`, `m7i.large`, `m6g.large`, `c7g.xlarge`, `c6i.xlarge`) spread across three Availability Zones. Their average compute cost is 74% below On-Demand. The critical design decision: they built checkpointing and retries before choosing Spot, not after.

A financial services firm runs a trading risk platform that generates end-of-day regulatory reports from 6 PM to 10 PM every weekday — a predictable, non-interruptible 4-hour workload. They use On-Demand for this window rather than Spot because a Spot interruption mid-report would trigger a compliance incident. Their always-on intraday analytics cluster (running 24/7) is covered by a 3-year EC2 Instance Savings Plan for the M family in us-east-1, capturing a 64% discount. And their overnight reconciliation jobs — which can retry on failure — run on Spot, saving 78% on batch compute. Three pricing models, three different workloads, each paying the right rate for its risk tolerance.

---

## Think About It

1. Why is it a mistake to purchase Savings Plans or Reserved Instances before a workload has been running in production for several weeks? What specific financial risk does early commitment create, and how does the Savings Plans Recommendations tool help mitigate it?
2. Spot Instances can be interrupted with 2 minutes notice, but many teams avoid them out of fear rather than genuine workload incompatibility. For what types of workloads is Spot genuinely inappropriate, and for what types is the fear unwarranted?
3. Compute Savings Plans are more flexible than EC2 Instance Savings Plans but offer a slightly lower discount. How would you decide which to purchase for a team that runs a mix of EC2 and Lambda workloads, and expects to migrate some EC2 to Fargate in the next year?
4. A colleague proposes purchasing 3-year all-upfront Standard Reserved Instances for your entire EC2 fleet to maximize savings. What questions would you ask before agreeing, and what risks does this approach introduce that Savings Plans would avoid?
5. Your company runs Spot Instances for CI/CD build runners and occasionally experiences builds being interrupted mid-compilation. The team complains this wastes time. What architectural changes would you make to the build system to handle Spot interruptions gracefully without switching to On-Demand?

---

## Quick Check

**Q1.** A company runs a stateless image-processing job that reads from S3, processes images, and writes results back to S3. Each job takes 20–40 minutes. The job can be restarted from the beginning if interrupted. Which pricing model offers the best cost-to-performance ratio?
- A) On-Demand, because the job must complete reliably
- B) Reserved Instances (1-year Standard), because the job runs daily
- C) Spot Instances, because the workload is fault-tolerant and can restart on interruption
- D) Dedicated Host, to ensure physical isolation for the image data

**Answer: C** — The job is stateless (reads from S3, writes to S3), restartable, and can tolerate a 2-minute Spot interruption followed by an automatic retry. This is the ideal Spot workload profile, delivering 60–90% savings.

**Q2.** Which Savings Plan type provides the highest flexibility, automatically applying discounts to EC2, Lambda, and Fargate usage across all Regions and instance families?
- A) EC2 Instance Savings Plans
- B) Standard Reserved Instances
- C) Compute Savings Plans
- D) Convertible Reserved Instances

**Answer: C** — Compute Savings Plans apply to any EC2 usage (any Region, any family, any OS), plus Lambda and Fargate, making them the most flexible commitment option — at the cost of a slightly lower discount than EC2 Instance Savings Plans.

**Q3.** An enterprise software vendor requires Oracle Database licenses to be counted per physical core on the host. Which EC2 pricing/tenancy model satisfies this licensing requirement?
- A) On-Demand with dedicated tenancy
- B) Dedicated Instances
- C) Reserved Instances (Standard)
- D) Dedicated Hosts

**Answer: D** — Dedicated Hosts provide visibility into the specific physical server's socket and core count, which is required for Oracle per-core BYOL licensing compliance. Dedicated Instances run on dedicated hardware but don't provide the physical host visibility needed for BYOL license compliance.

---

## What's Next

Next: Security Groups and Key Pairs — the primary mechanisms for controlling who can connect to your EC2 instances and how traffic flows to and from them.
