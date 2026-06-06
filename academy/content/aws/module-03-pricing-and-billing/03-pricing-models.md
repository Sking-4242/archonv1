---
title: "EC2 Pricing Models: On-Demand, Reserved, Spot, and Savings Plans"
type: content
estimated_minutes: 18
cert_tags: ["CLF-C02", "SAA-C03"]
---

# EC2 Pricing Models: On-Demand, Reserved, Spot, and Savings Plans

## Overview

AWS offers four distinct pricing models for EC2 compute — On-Demand, Reserved Instances, Spot Instances, and Savings Plans — plus two specialized tenancy options (Dedicated Hosts and Dedicated Instances) for compliance and licensing requirements. Each model exists to serve a different workload profile, and the cost difference between the most expensive (On-Demand) and the cheapest (Spot) can exceed 90%. Choosing the right model, or the right combination of models, is among the highest-impact cost optimization decisions in AWS, and it is one of the most heavily tested topics on the CLF-C02 exam.

These pricing models exist because AWS manages a massive, continuously shifting pool of compute capacity. Some capacity is committed in advance by customers who agreed to one- or three-year terms (Reserved Instances). Some is being used right now on short-term on-demand requests. Some is temporarily idle between those two categories. Rather than leave idle capacity wasted, AWS offers it at steep discounts as Spot Instances to workloads that can tolerate being interrupted when AWS needs the capacity back. This architecture benefits everyone: customers with predictable workloads get discounted rates in exchange for commitment, customers with interruptible jobs get extreme discounts, and AWS maximizes the utilization of its physical hardware.

Understanding not just what each model is but why it exists and what trade-offs it imposes is essential for answering CLF-C02 scenario questions. A typical exam question describes a workload — a nightly batch job, a 24/7 production database, a web tier with unpredictable traffic peaks — and asks which pricing model is most appropriate. Getting these right requires knowing the trade-offs clearly: On-Demand trades cost for flexibility, Reserved Instances trade flexibility for discounts, Spot Instances trade availability guarantees for extreme discounts, and Savings Plans provide RI-comparable discounts with significantly greater flexibility.

## Core Concepts

### On-Demand Instances

On-Demand is the default EC2 pricing model. You start an instance, use it, and pay only for the seconds it runs, at a published per-second rate with a 60-second minimum. There is no upfront cost, no commitment, and no penalty for stopping or terminating at any time. Billing begins the moment an instance enters the running state and stops the moment it is stopped or terminated.

On-Demand exists to serve workloads with unpredictable timing, variable duration, or uncertain scale. When you don't yet know how much compute you need — a new application with no traffic history, a short-lived project measured in days or weeks, a development environment that runs only during business hours — On-Demand gives you compute on your terms. The trade-off is that On-Demand is the most expensive EC2 pricing option in steady-state. You pay a premium for the flexibility of no commitment, and that premium is the baseline against which all other model discounts are calculated.

The correct use cases for On-Demand are: first-time deployments where usage patterns are unknown, workloads with sudden unpredictable spikes that exceed what reserved capacity covers, short-term projects that don't justify locking in a one-year commitment, development and test environments where instances run only intermittently, and the overflow capacity above your Savings Plan or Reserved Instance commitment level. On-Demand handles the unpredictable portion of workloads; commitment-based models handle the predictable baseline.

### Reserved Instances

Reserved Instances (RIs) commit you to a specific EC2 instance configuration — instance type, Region, tenancy — for either one or three years. In exchange, you receive a discount of 30–60% compared to equivalent On-Demand rates. The discount is earned because your multi-year commitment gives AWS the capacity planning certainty to optimize procurement, power contracts, and data center expansion.

**Standard vs. Convertible Reserved Instances.** Standard Reserved Instances lock in a specific instance type (family, size, and generation) for the entire term. A Standard RI for an m5.large cannot be changed to an m5.xlarge or an m6i.large — the exact instance type is fixed at purchase. Standard RIs provide the deepest discounts (up to ~60% off On-Demand for 3-year All Upfront) but impose inflexibility. If your workload evolves and you need a different instance type, the RI either sits unused (you still pay for it) or must be sold on the Reserved Instance Marketplace. Convertible Reserved Instances allow you to exchange the RI for a different instance type, operating system, or tenancy during the term. The discount is slightly lower (up to ~54% off On-Demand for 3-year All Upfront), but the ability to upgrade to newer instance generations — for example, exchanging M4 instances for M6i instances when the newer generation offers better price/performance — makes Convertible RIs the practical choice for most three-year commitments.

**Payment options and their effect on discount depth.** All Upfront (you pay the full reservation cost at purchase) provides the deepest discount. Partial Upfront (a portion paid now, the remainder billed monthly) provides a slightly smaller discount. No Upfront (no cash payment at purchase, full cost spread across monthly bills over the term) provides the smallest discount of the three payment options — but still significant savings compared to On-Demand. For the exam: All Upfront = maximum discount; No Upfront = minimum discount (within the RI category); the commitment is real in all cases regardless of payment timing.

**Important: RIs are billing discounts, not capacity reservations.** Purchasing a Reserved Instance does not guarantee that EC2 capacity will be available in a specific Availability Zone at any moment. It is a billing discount applied automatically when your running instances match the RI's specifications. For a true capacity guarantee, you need an On-Demand Capacity Reservation (a separate, distinct feature). This distinction is specifically tested on the exam.

### Savings Plans

Savings Plans are the modern, flexible successor to Reserved Instances for most use cases. Instead of committing to a specific instance type in a specific Region, you commit to spending a minimum dollar amount per hour on eligible compute for one or three years. AWS then automatically applies Savings Plan discounts to your qualifying usage, up to the committed hourly amount.

**Compute Savings Plans** offer maximum flexibility. The discount applies to EC2 instances regardless of instance family, size, Region, operating system, or tenancy — and also applies to AWS Lambda and AWS Fargate usage. If your architecture evolves from M5 instances in us-east-1 to C6g (Graviton) instances in eu-west-1 during the commitment term, your Compute Savings Plan continues to apply. Discounts are approximately 66% off On-Demand for a 3-year All Upfront Compute Savings Plan — roughly comparable to a Convertible RI. AWS recommends Compute Savings Plans for most organizations making new commitment-based purchase decisions.

**EC2 Instance Savings Plans** are more restrictive: the discount is tied to a specific EC2 instance family in a specific Region (e.g., the "M" family in us-east-1). The plan applies across all instance sizes within that family — m5.large, m5.xlarge, m5.2xlarge, m6i.large, m6i.xlarge all benefit from an M-family us-east-1 EC2 Instance Savings Plan. The discount is slightly deeper than Compute Savings Plans (approaching Standard RI levels) at the cost of reduced cross-Region and cross-family flexibility. Use EC2 Instance Savings Plans when you have high confidence your instance family and Region will remain stable.

Savings Plans are purchased through the Cost Management console using historical usage data to right-size the commitment. Cost Explorer's Savings Plans Recommendations screen analyzes your last 7, 14, or 30 days of On-Demand usage and recommends a specific hourly commitment amount and term. This data-driven recommendation process — buying based on demonstrated usage history rather than guesses — is the correct approach to sizing any Savings Plan.

### Spot Instances

Spot Instances give you access to AWS's unused EC2 capacity at discounts of 60–90% off On-Demand rates. The mechanism: AWS maintains pools of compute capacity across all instance types, sizes, AZs, and Regions. When On-Demand and Reserved customers are not fully utilizing a pool, AWS makes that excess capacity available as Spot at a deeply discounted Spot price. When AWS needs the capacity back — because On-Demand demand increases, or the pool is requested for other uses — your Spot Instance receives a two-minute interruption notice and is then terminated (or stopped or hibernated, depending on your interruption handling configuration).

The two-minute interruption window is the defining constraint of the Spot model. Your workload must either complete its work within two minutes of receiving the interruption notice, or save enough state (checkpoint) that when a new Spot Instance is provisioned later, work can resume from where it left off without losing meaningful progress. This requirement immediately segments workloads into Spot-appropriate and Spot-inappropriate:

- **Spot-appropriate workloads**: batch data processing, machine learning model training, genomics analysis, video transcoding, rendering, CI/CD pipeline jobs, web crawlers, simulation runs — any task that is stateless, checkpointable, or inherently short-lived.
- **Spot-inappropriate workloads**: production databases, web servers handling live user traffic, any workload with a defined uptime SLA, applications whose shutdown causes data corruption or transaction loss.

To reduce interruption risk, use Spot Fleets or EC2 Auto Scaling mixed-instance policies. Request capacity across multiple instance types and multiple Availability Zones simultaneously. If AWS reclaims capacity from one Spot pool, your fleet can acquire replacement capacity from a different pool. Diversification across instance types and AZs is the primary strategy for maximizing Spot reliability in practice.

Spot Instances are billed per second at the current Spot price for the instance type and AZ. You can view historical Spot prices for any instance type, Region, and AZ in the EC2 console to assess price volatility and interruption frequency before designing a Spot-based architecture.

### Dedicated Hosts and Dedicated Instances

Dedicated Hosts and Dedicated Instances both provide single-tenant hardware — your EC2 instances run on physical servers dedicated to your account and not shared with any other AWS customer. This is distinct from the shared-tenancy model where multiple customers' virtual machines run on the same physical host.

**Dedicated Hosts** give you full visibility into and control over the physical host: the number of physical CPU sockets, the number of cores, and the number of instances you place on it. This level of visibility is required for BYOL (Bring Your Own License) software like Oracle Database or Windows Server that is licensed per physical CPU core. On standard shared tenancy, AWS does not expose physical core counts because the underlying hardware is abstracted — your vCPUs come from a pool. On a Dedicated Host, you know the exact physical server you're running on, which satisfies per-core license audit requirements. Dedicated Hosts are billed per host per hour, regardless of how many instances are placed on the host.

**Dedicated Instances** run on single-tenant hardware but do not give you visibility into or control over the physical host's attributes. You cannot see core counts, cannot control instance placement, and cannot satisfy per-core license terms. Dedicated Instances are appropriate for compliance requirements mandating single-tenant hardware (no co-tenancy with other AWS customers) but without specific physical-host visibility requirements. They carry a per-instance-per-hour charge plus a per-Region per-account fee.

Both options are significantly more expensive than shared tenancy. Use them only when required by licensing contracts or compliance mandates — not for performance reasons, since the underlying hardware performance is comparable to shared tenancy.

## Configuration Reference

### Purchasing Reserved Instances in the EC2 Console

**Step 1: Open the EC2 console.** From the AWS Management Console, type "EC2" in the search bar and select it. In the left navigation panel, scroll down to the "Instances" section and click "Reserved Instances."

**Step 2: Review existing reservations.** The Reserved Instances page lists any RIs currently active on your account with their expiration dates, utilization rates, and configuration details. For a new account, this list is empty.

**Step 3: Begin a new purchase.** Click the orange "Purchase Reserved Instances" button. The purchase configuration screen opens.

**Step 4: Set your filters.** Use the top filter fields to narrow results to matching RIs. Set the following: Platform (e.g., "Linux/UNIX"), Instance Type (search for "m5.large"), and Term (1 year or 3 years). Optionally set Offering Class (Standard or Convertible) and Tenancy (Shared).

**Step 5: Read the price comparison table.** After filtering, the results table displays available RIs meeting your criteria. Each row shows the payment option (All Upfront, Partial Upfront, No Upfront), upfront cost, monthly cost, effective hourly rate, and savings percentage compared to On-Demand. Compare the rows side by side to see exactly how much the discount improves with All Upfront vs. No Upfront for the same term.

Example for an m5.large Standard RI in us-east-1 (1-year term, approximate 2024 pricing):
- **All Upfront**: ~$548 upfront, $0/month, effective hourly rate ~$0.063/hr — about 39% savings vs. On-Demand at $0.096/hr
- **No Upfront**: $0 upfront, ~$50/month, effective hourly rate ~$0.068/hr — about 29% savings vs. On-Demand

Example for an m5.large Standard RI in us-east-1 (3-year term):
- **All Upfront**: ~$913 upfront, $0/month, effective hourly rate ~$0.035/hr — about 63% savings vs. On-Demand
- **No Upfront**: $0 upfront, ~$30/month, effective hourly rate ~$0.041/hr — about 57% savings vs. On-Demand

**Step 6: Set quantity and purchase.** In the "Quantity" column, enter the number of RIs to purchase (e.g., if you run 4 m5.large instances continuously, buy 4 RIs to fully cover them). Click "Add to cart." Review the cart summary. Click "Order" to confirm. The RI is active within minutes.

**Step 7: Monitor utilization.** Return to the Reserved Instances page to see your active reservations and their utilization percentages. A utilization below 80% means you are paying for committed capacity that isn't matched to running instances — investigate whether the matching instances are running with the correct type and Region.

### Purchasing Savings Plans in the Cost Management Console

**Step 1: Open Cost Management.** In the AWS console search bar, type "Savings Plans" and select the result. Alternatively, navigate from the Billing and Cost Management Dashboard, click "Savings Plans" in the left navigation.

**Step 2: View Recommendations.** Click "Recommendations" in the left panel. Configure the recommendation parameters: Savings Plans type (Compute or EC2 Instance), term (1 or 3 years), payment option (All Upfront, Partial Upfront, No Upfront), and lookback period (7, 14, or 30 days of historical usage). For your first purchase, use a 30-day lookback to capture the most representative usage pattern. Click "Generate recommendations."

**Step 3: Review the recommendation output.** AWS displays the recommended hourly commitment (e.g., "$0.94/hr"), estimated annual savings in dollars (e.g., "$2,800/year"), estimated savings percentage, and a breakdown of which services (EC2, Lambda, Fargate) would be covered. The "Coverage" tab shows what percentage of your current On-Demand compute usage would be covered by the recommended plan.

**Step 4: Purchase the Savings Plan.** Click "Add to cart" next to the recommended plan. In the purchase cart, confirm: Savings Plan type, hourly commitment amount, term, and payment option. For All Upfront, the total upfront cost is displayed. Review and click "Submit order."

**Step 5: Track utilization.** After purchase, click "Utilization report" in the left navigation. This report shows the percentage of your Savings Plan hourly commitment that is matched by actual compute usage each day. 100% = fully utilized. Below 80% = over-committed (you are paying for Savings Plan coverage that exceeds your actual usage). Review this weekly for the first month after purchase.

### Viewing Spot Instance Pricing History

**Step 1: Navigate to Spot in EC2.** In the EC2 console, click "Spot Requests" in the left navigation panel. At the top of the Spot Requests page, click "Pricing history."

**Step 2: Filter the chart.** Select your Region, instance type (e.g., "r5.xlarge"), operating system, and date range (last 7 days is a practical starting point). The chart renders a line for each Availability Zone in the selected Region showing the Spot price over time.

**Step 3: Interpret the chart.** A flat, stable price line indicates low demand volatility for that capacity pool — your instance is less likely to be interrupted because AWS is not frequently replenishing or reclaiming it. A volatile price line with sharp spikes indicates high demand variability — higher interruption risk. Compare AZs: in many cases, us-east-1a and us-east-1b will show different volatility profiles for the same instance type.

**Step 4: Request Spot Instances.** Click "Request Spot Instances." Configure a Spot Fleet: set request type to "Fleet request," add multiple instance types using "Add instance type" (e.g., r5.xlarge, r5a.xlarge, r5n.xlarge), select the AZs to include, and set the allocation strategy to "Capacity Optimized." Capacity Optimized directs each new instance launch to the Spot pool with the most available capacity, statistically reducing interruption probability compared to the Lowest Price strategy.

## How to Decide

Use this framework when choosing a pricing model for any EC2 workload:

| Workload Characteristic | Best Model | Reason |
|---|---|---|
| New application, no usage history, uncertain scale | On-Demand | No commitment until you understand demand patterns |
| Short-term project (days to weeks) | On-Demand | Commitment doesn't make sense for workloads shorter than a few months |
| Development or test environment (runs intermittently) | On-Demand | Stop instances when not in use; commitment assumes continuous use |
| Steady-state production workload running 24/7 for 1+ years | Compute Savings Plan or RI | Commitment discount applies to predictable continuous usage |
| Workload where instance type and Region are locked for 3 years | Standard RI or EC2 Instance Savings Plan | Deepest discounts for maximum commitment specificity |
| Workload that may change instance family or Region over 3 years | Compute Savings Plan or Convertible RI | Flexibility to adapt without losing the discount |
| Batch jobs, ML training, rendering — stateless and checkpointable | Spot Instances | 60–90% discount for interruption-tolerant workloads |
| Oracle/Windows BYOL requiring per-physical-core licensing | Dedicated Hosts | Physical host visibility required for license audit compliance |
| Compliance requires single-tenant hardware (no per-core licensing) | Dedicated Instances | Single-tenant isolation without Dedicated Host cost or visibility |
| Mixed production workload needing reliability + cost control | On-Demand baseline + Savings Plan for steady state + Spot for bursts | Layered model that balances reliability, commitment savings, and variable-load cost |

**Savings comparison table (approximate, us-east-1, Linux, 2024):**

| Pricing Model | Approximate Discount vs. On-Demand |
|---|---|
| On-Demand | Baseline (0% discount) |
| 1-year No Upfront (Savings Plan / Standard RI) | ~30–35% |
| 1-year All Upfront (Savings Plan / Standard RI) | ~38–42% |
| 3-year No Upfront (Convertible RI) | ~50–54% |
| 3-year All Upfront (Standard RI) | ~55–63% |
| Spot Instances | ~60–90% (varies by instance type, AZ, and time) |

## How This Connects

- **AWS Cost Explorer's Savings Plans Recommendations** analyze your On-Demand usage history and recommend the precise hourly commitment amount and term that would maximize your savings — this is the correct data-driven starting point before purchasing any Savings Plan.
- **EC2 Auto Scaling with mixed-instance policies** blends On-Demand and Spot in a single Auto Scaling group — you define a baseline of On-Demand or Reserved capacity and configure Spot to handle scale-out events, combining guaranteed availability for the baseline with dramatic cost savings for variable demand.
- **AWS Budgets RI/Savings Plan utilization alerts** notify you when your RI coverage or Savings Plan utilization drops below a defined threshold (e.g., 80%) — essential for detecting when committed capacity is no longer being matched by running instances.
- **AWS Trusted Advisor** (Business Support and above) includes cost optimization checks that flag idle Reserved Instances, underutilized EC2 instances running at low CPU, and Savings Plan purchase opportunities — applying the pricing model decision framework automatically to your actual account data.
- **AWS Compute Optimizer** analyzes EC2 utilization metrics and recommends rightsizing to smaller or more cost-effective instance types — informing which instance type to target with a Savings Plan or RI commitment, and identifying instances that are over-provisioned even before any commitment is made.

## Exam Traps

**Trap 1: Thinking Reserved Instances physically reserve capacity.** Standard Reserved Instances are billing discounts applied to matching running instances — they are not capacity guarantees. Purchasing an RI does not guarantee that EC2 capacity will be available in a specific AZ. For actual capacity guarantees, use On-Demand Capacity Reservations (a separate feature). If an exam question asks about guaranteeing EC2 capacity availability, the answer is not "purchase a Reserved Instance."

**Trap 2: Misremembering Spot interruption timing.** Spot Instances receive a two-minute warning before interruption — not instant termination, not a five-minute warning. This specific duration is tested. Two minutes is enough time to save state and gracefully shut down, but not enough to complete multi-hour work. The correct design response is frequent checkpointing (every 10–15 minutes) so any interruption loses at most one checkpoint interval of progress.

**Trap 3: Assuming Savings Plans apply only to EC2.** Compute Savings Plans apply to EC2, AWS Lambda, and AWS Fargate. EC2 Instance Savings Plans apply only to EC2 within a specific instance family and Region. A question describing a company that uses both EC2 and Lambda and wants a commitment-based discount should lead to Compute Savings Plans — EC2 Instance Savings Plans do not cover Lambda.

**Trap 4: Thinking Convertible RIs have no advantage over Standard RIs.** Standard RIs provide a slightly deeper discount, but Convertible RIs allow instance type exchanges during the term. For three-year commitments, the ability to move to a newer, more cost-efficient instance generation (e.g., from M5 to M7g Graviton) during the commitment period can easily offset the marginally lower Convertible discount. Exam scenarios emphasizing flexibility during a long commitment term point toward Convertible RI or Compute Savings Plan.

**Trap 5: Believing Spot Instances are inherently unreliable for any real workload.** Spot Instances are unreliable only for workloads not designed with interruption tolerance in mind. Workloads specifically engineered for Spot — checkpointed batch jobs, stateless task queues, distributed training with frequent model saves — experience very few interruptions in practice, particularly when using Spot Fleets across multiple instance types and AZs. The exam tests whether you can identify workloads suitable for Spot, not whether Spot is always a bad idea.

## Summary

- On-Demand instances are the default and most expensive model: billed per second, no commitment, full flexibility — use for unpredictable workloads, new applications without usage history, or short-term projects.
- Reserved Instances commit to a specific instance type and Region for 1 or 3 years for 30–63% discounts; Standard RIs are inflexible but deepest-discounted, Convertible RIs allow type changes during the term at slightly lower discount.
- Savings Plans commit to a per-hour spend rate on compute: Compute Savings Plans (most flexible — covers EC2, Lambda, Fargate across any Region or instance family) and EC2 Instance Savings Plans (limited to one instance family in one Region, deeper discount).
- Spot Instances access AWS spare capacity at 60–90% off On-Demand with a two-minute interruption warning — only appropriate for fault-tolerant, checkpointable workloads like batch processing, ML training, and rendering.
- Dedicated Hosts provide single-tenant hardware with physical core visibility for BYOL licensing (Oracle, Windows Server per-core); Dedicated Instances provide single-tenant hardware without host-level visibility for compliance-only requirements.
- The optimal cost strategy for production systems is layered: On-Demand for unpredictable overflow, Savings Plans or RIs for committed steady-state baseline, and Spot for interruptible batch or scale-out jobs.

## Examples

A startup launches a B2B analytics SaaS product and deploys everything on On-Demand instances because they have no usage history. After five months, traffic has stabilized: two m5.large instances serving the API tier run continuously 24/7. The nightly report generation job runs for 4 hours each night. The team opens Cost Explorer's Savings Plans Recommendations, sets a 30-day lookback, and generates a recommendation. AWS recommends a Compute Savings Plan commitment of $0.21/hour for a 1-year No Upfront term, covering the two m5.large instances running continuously. The recommendation shows estimated annual savings of $1,090 — a 30% reduction on that portion of their bill. They purchase the plan. The report generation instances remain On-Demand because they run intermittently and don't benefit from continuous-use commitments. Total decision time: under 30 minutes using Cost Explorer's recommendation as the starting point.

A bioinformatics research team processes raw DNA sequencing data in large parallel batches. Each batch consists of 200 independent tasks that each read a genomic data segment, run a computation, and write results to Amazon S3. Tasks run 2–5 hours each and save intermediate results to S3 every 15 minutes. The team submits work to an EC2 Spot Fleet configured across three instance types (r5.2xlarge, r5a.2xlarge, r5n.2xlarge) spanning three Availability Zones — nine Spot pools in total. Over an eight-month study, they process 150 batches totaling approximately 80,000 task-hours of compute. Their average Spot discount is 71% below On-Demand rates. Estimated On-Demand cost for the same work: $14,800. Actual Spot cost: approximately $4,300. Four interruptions occurred across 150 batches, each causing at most 15 minutes of rework per interrupted task — less than 0.01% of total compute time lost. For this team, Spot interruption risk was never a real-world problem because the workload was designed from the start to be Spot-compatible: stateless tasks, frequent S3 checkpoints, and a diversified fleet across nine Spot pools.

An enterprise software company migrates its Oracle Database production workload to AWS. Their Oracle license agreement specifies per-physical-core licensing: the license is tied to the number of physical CPU cores on the host, not to the vCPUs that AWS's hypervisor exposes to virtual machines. On standard shared EC2 tenancy, the physical core count is abstracted — an m5.8xlarge with 32 vCPUs may be backed by physical hardware with a different core topology, and AWS does not expose this information. Oracle's licensing auditors require proof of which physical cores the database touches. The company deploys Oracle on Dedicated Hosts: they allocate specific host types with documented socket and core counts, enable affinity settings that bind their Oracle instances to specific hosts, and export the host-to-instance mapping for audit records. AWS provides a persistent Host ID for each Dedicated Host that remains constant over its lifetime and appears in billing records. The Oracle licensing team accepts this as compliant documentation. The Dedicated Host adds approximately 65% to their compute cost compared to a shared-tenancy deployment of the same instance sizes — but the alternative, running Oracle on shared tenancy and risking a licensing audit failure, carries far greater financial and legal exposure. This is the only scenario where Dedicated Hosts are the architecturally correct answer; no performance benefit justifies the premium independently of a licensing or compliance requirement.

## Think About It

1. Compute Savings Plans apply across EC2, Lambda, and Fargate regardless of instance type or Region. If your architecture shifts significantly during a 3-year term — moving from an EC2-heavy microservices design to a more Lambda-based serverless approach — does your Compute Savings Plan commitment still protect you, or does the unused portion become a stranded cost?
2. Spot Instances can be interrupted with two minutes of notice. If you were designing a CI/CD pipeline that builds and tests application code on Spot Instances, what specific design changes would you make to handle mid-build interruptions without corrupting build artifacts or producing misleading test results?
3. Standard Reserved Instances lock you into a specific instance type for 1 or 3 years. AWS regularly releases new instance generations with better price/performance ratios (M7i over M5, Graviton over x86 at similar performance for 10–20% lower cost). How should this technology refresh cycle factor into your choice between Standard RI and Convertible RI for a three-year commitment?
4. AWS now recommends Savings Plans over Standard Reserved Instances for most new purchases. If Savings Plans are generally more flexible and provide comparable discounts, why does AWS still sell Standard RIs? Are there scenarios where Standard RIs remain the superior choice over a Compute Savings Plan?
5. On-Demand pricing is described as a "flexibility premium." For a small company with no dedicated cloud finance team, is the operational overhead of managing Savings Plan commitments and utilization reports worth the 30–40% savings — or is On-Demand simplicity a legitimate long-term cost strategy? At what monthly EC2 spend does the math clearly favor making the commitment?

## Quick Check

**Q1.** A company runs 15 EC2 r5.xlarge instances continuously, 24/7, as part of a production data processing platform. The workload has operated at this scale for nine months with no signs of changing. Which pricing model provides the most savings while matching this workload's characteristics?

- A) Spot Instances — they provide the deepest available discount
- B) On-Demand — maximum flexibility for a critical production workload
- C) Compute Savings Plans or Reserved Instances — steady-state workload benefits from commitment-based discounts
- D) Dedicated Hosts — best for high-throughput production workloads

**Answer: C** — A steady-state production workload running 24/7 for nine months without change is exactly the profile Savings Plans and Reserved Instances are designed for. The 30–63% discount applies to committed, predictable usage. Spot Instances (A) would be interrupted, disqualifying them for a production workload with uptime requirements. On-Demand (B) is unnecessarily expensive for a workload this predictable. Dedicated Hosts (D) are for licensing and compliance requirements, not general cost optimization.

**Q2.** Which Savings Plan type provides the most flexibility by automatically applying discounts across EC2 instances of any type or Region, as well as to AWS Lambda and AWS Fargate usage?

- A) EC2 Instance Savings Plans
- B) Standard Reserved Instances
- C) Compute Savings Plans
- D) Convertible Reserved Instances

**Answer: C** — Compute Savings Plans apply across EC2 (any instance family, size, Region, OS, and tenancy), Lambda, and Fargate — the broadest coverage of any commitment product. EC2 Instance Savings Plans (A) are limited to a specific instance family in a specific Region. Standard RIs (B) are locked to a specific instance type and Region. Convertible RIs (D) allow instance type changes but are EC2-only and Region-specific.

**Q3.** A media company runs large-scale video encoding jobs that process raw footage in parallel, save output to S3 every 12 minutes, and can restart from the last checkpoint if interrupted. Each job runs 4–7 hours. Which EC2 pricing model should they use for the encoding instances?

- A) Reserved Instances — best for long-running jobs with consistent resource usage
- B) Spot Instances — fault-tolerant, checkpointed batch workloads are the ideal Spot use case
- C) On-Demand — encoding jobs are business-critical and should not risk interruption
- D) Dedicated Hosts — video encoding benefits from physical hardware control

**Answer: B** — Spot Instances are the correct choice for interruptible, checkpointable batch workloads. The 12-minute checkpoint interval means at most 12 minutes of work is lost on any interruption — acceptable overhead for a 4–7 hour job. The savings (60–90% off On-Demand) substantially reduce encoding costs at scale. Reserved Instances (A) are designed for continuously running instances, not intermittent batch jobs. On-Demand (C) works but is unnecessarily expensive for workloads that are explicitly designed to be interruptible. Dedicated Hosts (D) have no relevance here — this is not a licensing or compliance scenario.

## What's Next

Next: AWS Support Plans — the five tiers from Basic to Enterprise, critical response time SLAs for different incident severities, what a Technical Account Manager actually does and when you need one, and how Trusted Advisor's check coverage differs dramatically across support tiers.
