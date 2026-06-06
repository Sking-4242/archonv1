---
title: "Pillar: Sustainability"
type: content
estimated_minutes: 10
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Pillar: Sustainability

## Overview

The Sustainability pillar, added to the AWS Well-Architected Framework in 2021, addresses the environmental impact of the workloads you build and operate in the cloud. Every compute cycle, every gigabyte stored, every byte transferred consumes energy. The pillar gives you a structured way to understand, measure, and reduce that consumption — not as a secondary concern, but as a first-class architectural goal alongside cost, security, and reliability.

The core insight behind the pillar is that cloud infrastructure is inherently more sustainable than equivalent on-premises infrastructure, but only if you use it well. AWS data centers run at much higher utilization rates than typical enterprise data centers (often 65%+ vs. 15%), are rapidly transitioning to renewable energy, and use custom silicon designed for efficiency. But those advantages are partly negated if your workloads are oversized, idle most of the time, or running in regions powered by less renewable energy than alternatives. Architecture choices matter.

For the CCP exam, you need to understand the six sustainability design principles, the Customer Carbon Footprint Tool, and the types of changes that reduce environmental impact. For SAA and SAP, you need to be able to reason about trade-offs between the Sustainability pillar and other pillars — particularly Reliability (spare capacity vs. utilization) and Cost Optimization (they usually align but sometimes diverge).

---

## Core Concepts

### The Six Sustainability Design Principles

The Well-Architected Sustainability pillar is built on six design principles, each of which points toward a specific type of action:

**Understand your impact.** You cannot improve what you cannot measure. AWS provides the Customer Carbon Footprint Tool, which estimates your CO2 emissions from AWS usage, broken down by service and region. Before making changes, establish a baseline.

**Establish sustainability goals.** Set reduction targets as a ratio — for example, CO2 per transaction or CO2 per active user — rather than absolute totals. This way, growth in usage doesn't automatically mean growth in environmental impact.

**Maximize utilization.** Idle resources waste energy. An EC2 instance running at 5% CPU is consuming electricity proportional to its size regardless of the work it does. Rightsizing, Auto Scaling, and serverless architectures all improve utilization and reduce waste.

**Anticipate and adopt efficient hardware and software.** AWS continuously releases more energy-efficient instance types, particularly its Graviton processor family (ARM-based, AWS-designed). When new, more efficient options become available, migrate to them. The same applies to software — use efficient algorithms, avoid unnecessary computation, and compress data appropriately.

**Use managed and serverless services.** Shared managed services achieve higher utilization than single-tenant dedicated deployments. Lambda, Fargate, DynamoDB, and RDS achieve sustainability through scale that individual customers cannot replicate on their own.

**Reduce downstream impact.** Design for the efficiency of your users too — minimize the data your application transfers to end users, implement client-side caching to avoid redundant requests, and use content delivery networks to serve content from the closest edge location rather than routing everything to a central region.

---

### AWS Graviton: The Fastest Sustainability Win

AWS Graviton processors are ARM-based chips designed by AWS specifically for cloud workloads. Graviton3-based instances (c7g, m7g, r7g, etc.) deliver up to 60% better energy efficiency per unit of compute compared to equivalent x86 instances — meaning you get the same work done using 60% less electricity.

The performance story is equally strong: Graviton3 typically matches or exceeds x86 performance for most general-purpose workloads. The catch is that your application must be compiled for the ARM64 architecture. For interpreted languages (Python, Ruby, Node.js, Java) and compiled Go or Rust applications, this is usually a recompilation step — a few hours of work. For older C/C++ applications with x86 assembly or architecture-specific libraries, migration can require more effort.

The implication: for any compute-heavy workload running on current-generation Intel or AMD instances, evaluating a Graviton migration should be a standard part of your sustainability and cost optimization reviews. The two goals almost always align — Graviton is cheaper AND greener.

---

### Maximizing Utilization: Serverless and Rightsizing

The single most impactful sustainability improvement most teams can make is eliminating idle compute. A persistently-running EC2 instance consumes electricity even when doing no useful work. Serverless architectures like AWS Lambda and AWS Fargate only consume resources when requests are actively being processed — the moment a Lambda function finishes, those resources return to the pool and consume no energy.

For workloads that aren't serverless-compatible, rightsizing is the next lever. AWS Compute Optimizer analyzes CloudWatch metrics and recommends instance types that match actual utilization. An m5.2xlarge running at 8% CPU average is likely a candidate for an m5.large or a Graviton-based equivalent. Compute Optimizer provides these recommendations automatically and quantifies the expected energy impact alongside the cost impact.

Auto Scaling is the dynamic version of rightsizing — instead of choosing the right average size, you scale the fleet to match demand in real time. For bursty workloads, this means running fewer instances during off-peak hours, which directly reduces energy consumption.

---

### Region Selection and Renewable Energy

Not all AWS regions run on the same energy mix. Some regions — particularly in Europe (eu-west-1 in Ireland, eu-north-1 in Stockholm, eu-central-1 in Frankfurt) and North America (us-west-2 in Oregon) — have high proportions of renewable energy. Others rely more heavily on grid power that includes fossil fuels.

For workloads where latency is not a binding constraint — batch analytics, model training, data processing — region selection based on renewable energy availability is a legitimate sustainability optimization. The Customer Carbon Footprint Tool breaks down emissions by region, making this comparison concrete.

AWS has committed to matching 100% of its electricity consumption with renewable energy (a goal it exceeded ahead of schedule) and to achieving net-zero carbon across its operations by 2040 as part of The Climate Pledge. When you run on AWS, you benefit from these commitments — but the workload efficiency choices you make still determine your actual environmental footprint.

---

### Sustainability vs. Cost Optimization: Alignment and Divergence

A common exam question and a genuine practitioner debate: Is the Sustainability pillar just Cost Optimization rebranded? The answer is mostly no, but partially yes.

The two pillars align in most cases: reducing idle compute, rightsizing instances, using serverless, and choosing efficient hardware are good for both cost and sustainability simultaneously. Graviton instances are cheaper and greener. Lambda costs nothing at idle and consumes no energy at idle.

Where they diverge: the Reliability pillar recommends maintaining spare capacity for redundancy and failover — a warm standby database replica, an Auto Scaling group minimum of 2, a hot DR environment. All of that spare capacity consumes electricity even when not needed. From a Sustainability perspective, you should minimize this overhead. From a Reliability perspective, it's necessary. The right answer is to be deliberate about the trade-off — match redundancy to your actual RTO/RPO requirements rather than over-provisioning defensively.

Another divergence: Sustainability might favor running a non-latency-sensitive workload in a greener region even if that region costs slightly more. Cost Optimization would push toward the cheapest region. These goals genuinely conflict, and architects need to make a deliberate choice.

---

## Configuration Reference

### Finding the Customer Carbon Footprint Tool

The Customer Carbon Footprint Tool is in the AWS Billing and Cost Management console. Navigate there as follows:

1. Sign in to the AWS Management Console with an account that has billing access (or root account)
2. In the top navigation bar, click your account name → **Billing and Cost Management** (or search for "Billing" in the Services search bar)
3. In the left sidebar, scroll down to **Cost Analysis Tools** and click **Carbon footprint**
4. The dashboard loads with:
   - **Monthly estimated emissions** — a bar chart showing metric tons of CO2 equivalent (MTCO2e) per month
   - **Emissions by service** — a breakdown showing which services contribute most to your footprint
   - **Emissions by geography** — showing which regions contribute most
   - **Emissions intensity** — your carbon per unit of usage, useful for tracking efficiency over time

The tool uses a methodology based on actual energy consumption data from AWS data centers combined with regional energy grid emissions factors. The numbers are estimates, not precise measurements, but they are useful for trend analysis and relative comparisons.

> **Note:** The Carbon Footprint Tool requires at least 3 months of usage data before it shows meaningful results. New accounts will see limited or no data.

---

### Compute Optimizer for Sustainability Rightsizing

AWS Compute Optimizer provides rightsizing recommendations that include estimated energy impact alongside cost savings. To use it:

1. Navigate to **Compute Optimizer** (search in Services)
2. Click **Get started** if it's your first visit — Compute Optimizer needs to analyze 14 days of CloudWatch metrics before generating recommendations
3. Once active, go to **EC2 instances** in the left sidebar
4. Each recommendation shows:
   - **Current instance**: type, utilization (CPU, memory, network)
   - **Recommended instance**: the suggested type, why it's recommended
   - **Estimated savings**: monthly cost difference
   - **Performance risk**: low/medium/high — how likely the recommendation is to be sufficient for peak load

Look for recommendations that suggest Graviton-based instance types (ending in `g` — m7g, c7g, r7g). These are both the cost and sustainability optimal choices for most general-purpose workloads.

---

### Sustainability Impact Reference Table

| Action | AWS Implementation | Estimated Sustainability Impact |
|---|---|---|
| Migrate x86 to Graviton3 | Change instance family (e.g., m5 → m7g), recompile | Up to 60% less energy per compute unit |
| Replace always-on EC2 worker with Lambda | Refactor to event-driven function | Near-zero energy when idle (vs. 100% energy always) |
| Enable Auto Scaling on idle fleet | Add ASG with target tracking policy | Proportional reduction during off-peak hours |
| Enable S3 Intelligent-Tiering | Apply storage class to infrequently accessed objects | Reduces storage capacity used for cold data |
| Migrate batch jobs to Spot Instances | Change launch template to Spot | Runs on otherwise-idle capacity — highest efficiency |
| Select greener region for batch workloads | Change region in deployment config | Varies by region energy mix — can be 20–40% lower |
| Enable CloudFront caching | Add distribution in front of origin | Reduces origin compute per request |
| Compress data before storage/transfer | Application-level change (gzip, Parquet) | Directly proportional reduction in storage + transfer |

---

## How to Decide

When prioritizing sustainability improvements, work through these questions in order:

**1. What is my biggest source of emissions?**
Open the Customer Carbon Footprint Tool and identify which services and regions drive the most emissions. Focus there first — a 10% improvement on your biggest source beats a 50% improvement on something small.

**2. Are my compute resources actively utilized?**
Check Compute Optimizer recommendations. Any instance flagged as over-provisioned (utilization consistently below 40%) is a rightsizing candidate. Any always-on workload that processes discrete events is a Lambda/Fargate candidate.

**3. Am I running on Graviton where I can?**
If you have Python, Node.js, Java, or Go workloads on Intel/AMD instances, Graviton migration is almost always worth evaluating. It is both cheaper and greener with minimal migration risk.

**4. Are my workloads in the most efficient region for their latency requirements?**
For latency-sensitive user-facing workloads: region selection is driven by proximity. For batch, analytics, and ML training: evaluate greener regions if the latency is acceptable.

**5. Am I trading sustainability against other pillars deliberately?**
Every warm standby, every extra AZ, every DR replica costs energy. That cost is justified by your reliability requirements — but be explicit about the trade-off rather than defaulting to maximum redundancy everywhere.

| Scenario | Best Action | Why |
|---|---|---|
| Always-on EC2 worker with bursty traffic | Migrate to Lambda or Fargate | Eliminates idle energy consumption |
| CPU-heavy batch job on c5 instances | Migrate to c7g (Graviton3) | 60% better energy efficiency |
| Data warehouse running 24/7 at low utilization | Schedule shutdown during off-hours | Direct proportional savings |
| Non-latency-sensitive analytics | Evaluate eu-north-1 or eu-west-1 | Higher renewable energy coverage |
| Over-provisioned fleet | Use Compute Optimizer recommendations | Match capacity to actual utilization |
| Interpreted language (Python/Node) on EC2 | Graviton migration (recompile) | Low-risk, high-impact improvement |

---

## How This Connects

- **AWS Compute Optimizer** — provides specific instance rightsizing and Graviton migration recommendations with estimated cost and energy impact, making sustainability analysis concrete rather than theoretical.
- **AWS Lambda and AWS Fargate** — serverless compute services that eliminate idle resource consumption, directly implementing the "maximize utilization" design principle at the architectural level.
- **Amazon EC2 Graviton instances** — the primary hardware-level sustainability improvement available to customers; accessed by choosing instance families ending in `g` (m7g, c7g, r7g, x2g, etc.) in the EC2 launch wizard.
- **AWS Cost Explorer and Billing** — the Customer Carbon Footprint Tool lives in the Billing console alongside Cost Explorer; sustainability and cost analysis are intentionally co-located because the two goals most often align.
- **Amazon CloudFront** — reduces the compute and transfer work done at origins by serving cached responses from edge locations; directly implements the "reduce downstream impact" principle by minimizing unnecessary origin requests.

---

## Exam Traps

- **"Moving to AWS makes your workload sustainable."** Moving to AWS helps — AWS infrastructure is far more efficient than typical on-premises data centers — but architectural choices still matter. An oversized, idle, always-on workload in AWS is still wasteful, just less so than on-premises.
- **"The Customer Carbon Footprint Tool is in CloudWatch."** It is in the **Billing and Cost Management** console, under Cost Analysis Tools. It is not a CloudWatch metric or a Cost Explorer report — it is a separate tool.
- **"Sustainability and Cost Optimization always align."** They usually do, but not always. Running in a greener region might cost slightly more. Maintaining reliability spare capacity costs energy. Exam questions may test your ability to identify where the pillars genuinely conflict.
- **"Graviton instances require no code changes."** For interpreted languages (Python, Node.js) and managed runtimes (Java on Amazon Corretto), migration is usually a configuration change. For compiled C/C++ applications with x86-specific code, migration requires recompilation and potentially code changes. The exam may ask about the trade-off.
- **"The Sustainability pillar has been part of the framework since launch."** It was added in **November 2021** — six years after the original five pillars. Questions about "the five pillars" vs. "the six pillars" are a known exam trap.

---

## Summary

- The Sustainability pillar, added in 2021, focuses on minimizing the environmental impact of AWS workloads through six design principles: understand impact, set goals, maximize utilization, adopt efficient hardware, use managed services, and reduce downstream impact.
- The Customer Carbon Footprint Tool in the Billing console shows estimated CO2 emissions by service and region; it is the primary measurement tool for this pillar.
- AWS Graviton3-based instances deliver up to 60% better energy efficiency than equivalent x86 instances and are the most impactful single hardware change most teams can make.
- Serverless architectures (Lambda, Fargate) implement the "maximize utilization" principle by consuming resources only during active processing, eliminating idle energy waste.
- Sustainability and Cost Optimization usually align — rightsizing, Graviton, and serverless are good for both — but they diverge when reliability spare capacity or greener (potentially costlier) regions are involved.
- AWS has committed to net-zero carbon by 2040 and 100% renewable energy matching through The Climate Pledge; customers benefit from these infrastructure investments but must also make efficient architectural choices.

---

## Examples

A streaming analytics company migrated their data processing fleet from Intel-based c5 instances to AWS Graviton3-based c7g instances. Benchmarking showed equivalent throughput with 20% better price-performance and approximately 60% lower energy use per unit of work — matching AWS's published Graviton efficiency claims. The migration required recompiling their Go-based application for the ARM64 architecture, which took two days. The result was lower cost, lower carbon footprint, and no change to end users — a rare case where sustainability and cost optimization pointed in exactly the same direction. They used the Customer Carbon Footprint Tool before and after to confirm the emissions reduction was reflected in their reported footprint.

A large SaaS platform ran a sustainability audit using the Customer Carbon Footprint Tool and discovered that one legacy batch job — a nightly report generation process — accounted for 18% of their estimated CO2 emissions despite representing only 4% of their compute spend. The job was running on large, persistently-running EC2 instances with utilization averaging 8%. Refactoring it to run on AWS Lambda, triggered by an EventBridge scheduled rule, reduced both the cost and the estimated emissions for that workload by 70%. The Lambda function ran for 4 minutes per night; the EC2 instances had been running 24 hours a day, 7 days a week. The principle at work: idle resources waste energy, and serverless eliminates idle.

A global retail company with AWS workloads across six regions used the Customer Carbon Footprint Tool to compare emissions across their footprint and found that their eu-north-1 (Stockholm) workloads had the lowest emissions intensity — Stockholm runs on nearly 100% renewable hydroelectric power. Their non-latency-sensitive nightly inventory reconciliation job was running in us-east-1 purely by default. Migrating it to eu-north-1 reduced that workload's estimated emissions by approximately 30% with no performance impact, since the job ran overnight and the 80ms additional latency to a European region was irrelevant. This kind of intentional region selection for appropriate workloads is an increasingly important aspect of the Sustainability pillar that goes beyond compute rightsizing.

---

## Think About It

1. The Sustainability pillar was added to the Well-Architected Framework in 2021 — six years after the original five pillars. What does that timing suggest about how the cloud industry's priorities have evolved, and what external pressures likely drove its addition?
2. The Reliability pillar recommends maintaining spare capacity — a warm standby database, a minimum fleet size for failover, a hot DR environment in a second region. All of this spare capacity consumes electricity when idle. How do you reconcile the Reliability and Sustainability pillars? Is there a principled way to decide how much redundancy is "enough" from both perspectives simultaneously?
3. Graviton instances are cheaper and more energy-efficient than equivalent x86 instances for most workloads. Given that, why aren't all new workloads deployed on Graviton by default? What legitimate engineering reasons might cause a team to stay on x86 even when they're aware of the benefits?
4. The Customer Carbon Footprint Tool provides estimated emissions, not measured ones. The methodology involves approximations and the data has a 3-month lag. How should architects weigh this data when making decisions? What are the risks of treating the estimates as precise measurements?
5. A critic argues that the Sustainability pillar is redundant — "use less compute" reduces both cost and carbon, so Cost Optimization already covers it. Construct the strongest possible rebuttal to this argument. Where does pursuing sustainability require different thinking or different trade-offs than pure cost optimization?

---

## Quick Check

**Q1.** Where in the AWS Management Console would you find the Customer Carbon Footprint Tool?
- A) Amazon CloudWatch → Metrics
- B) AWS Cost Explorer → Reports
- C) AWS Billing and Cost Management → Carbon footprint
- D) AWS Trusted Advisor → Sustainability checks

**Answer: C** — The Customer Carbon Footprint Tool is located in the Billing and Cost Management console under Cost Analysis Tools, not in CloudWatch, Cost Explorer, or Trusted Advisor.

**Q2.** A team has a Python-based data processing worker running on an m5.2xlarge instance at 12% average CPU utilization. Which pair of changes best addresses the Sustainability pillar?
- A) Enable detailed CloudWatch monitoring and set a CPU alarm
- B) Migrate to an m7g.large (Graviton3) and convert the job to run on AWS Lambda
- C) Add a second m5.2xlarge for redundancy to improve reliability
- D) Move the workload to Amazon RDS for managed database sustainability

**Answer: B** — Migrating to Graviton3 (m7g) reduces energy per compute unit by up to 60%, and converting the persistently-running worker to Lambda eliminates idle energy consumption — together these address both the "adopt efficient hardware" and "maximize utilization" design principles.

**Q3.** Which statement about the relationship between the Sustainability and Cost Optimization pillars is most accurate?
- A) They are identical — every sustainability improvement also reduces cost
- B) They always conflict — sustainable choices always cost more
- C) They usually align but can diverge, for example when reliability requires spare capacity or when a greener region costs more
- D) Sustainability supersedes Cost Optimization when the two pillars conflict

**Answer: C** — While rightsizing, Graviton, and serverless improve both sustainability and cost simultaneously, the pillars genuinely diverge in cases like reliability spare capacity (which wastes energy but is necessary) or greener regions that may have higher pricing. Architects must make deliberate trade-offs.

---

## What's Next

This completes the Well-Architected Framework survey. The lab for this module walks you through the AWS Well-Architected Tool — a guided review that scores your workload against all six pillars and generates a prioritized improvement plan. After that, Module 7 begins the hands-on compute track with Amazon EC2.
