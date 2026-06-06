---
title: "Cost Optimization Pillar Deep Dive"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Cost Optimization Pillar Deep Dive

## Overview

The Well-Architected Cost Optimization pillar defines how to run workloads at the lowest price point that meets functional and non-functional requirements. Cost optimization in AWS is not about cutting corners — it is about eliminating waste while maintaining the reliability, performance, and security requirements of the workload. The unique characteristic of cloud economics is that cost is directly proportional to consumption: every over-provisioned instance, every idle EBS volume, every gigabyte crossing AZ boundaries represents money paid for capacity that delivers no business value.

The problem this pillar addresses is that cloud spending is easy to grow and hard to shrink. Teams provision resources for peak load and never right-size them. Developers spin up EC2 instances for testing and forget them. S3 data accumulates without lifecycle policies. Data transfer costs appear as a surprise at month-end. Unlike on-premises where capital expenditure is a forcing function for frugality, cloud spending is metered and billed quietly, making it easy to miss until the invoice arrives. Cloud financial management (FinOps) is the practice of making cloud costs visible, attributable, and actionable so that engineering and finance teams can make informed trade-off decisions.

For SAA-C03, expect questions on the difference between Reserved Instances and Savings Plans, when to use Spot Instances, S3 storage class selection, and the role of Cost Explorer and Budgets. SAP-C02 adds FinOps governance (SCPs for cost control, tagging strategy, chargeback vs. showback), Lambda power tuning, Graviton adoption, and data transfer cost optimization patterns. After this lesson, you will be able to build a comprehensive cost optimization strategy, select the right EC2 purchasing model for a given workload, and architect to minimize data transfer costs.

---

## Core Concepts

### The 5 Cost Optimization Design Principles

Each design principle addresses a specific category of cloud cost waste.

**1. Implement cloud financial management.** Treat cost as a first-class engineering concern. This means dedicated FinOps practices, named ownership of cost per service and per team, and a cadence for reviewing and acting on cost data. Without organizational ownership, cost optimization happens reactively (after a large invoice) rather than proactively. In practice, this means: tagging resources for attribution, reviewing Cost Explorer weekly, setting Budget alerts, and including cost impact in architecture review. SAP scenarios often describe a company with no tagging strategy and ask for the corrective architecture.

**2. Adopt a consumption model.** Only pay for what you use. Use Lambda instead of idle EC2 for intermittent workloads. Use Aurora Serverless v2 instead of a fixed-size RDS instance for variable workloads. Use DynamoDB on-demand capacity for unpredictable traffic. The consumption model shifts cost from a fixed operational expense to a variable expense proportional to actual load — eliminating the stranded capacity cost of over-provisioning.

**3. Measure overall efficiency.** Track the business output per dollar spent — unit economics. If your cost per API request was $0.001 in January and $0.0015 in February with the same revenue, efficiency degraded by 50%. Cost per transaction, cost per user, cost per processed GB — these metrics expose efficiency trends that aggregate spending reports hide. Unit economics also enable cost-per-feature analysis: is this feature generating revenue that exceeds its infrastructure cost?

**4. Stop spending on undifferentiated heavy lifting.** AWS offers managed services that replace infrastructure you would otherwise operate: RDS instead of self-managed MySQL, EKS instead of self-managed Kubernetes, SQS instead of self-managed message queues. The cost of managed services includes AWS's operational overhead; the saving is your team's time to operate that infrastructure. When the total cost of ownership of a self-managed system (engineer time + infrastructure) exceeds the managed service cost, the managed service is the economical choice.

**5. Analyze and attribute expenditure.** Every dollar of AWS spend must be attributable to a team, application, environment, and cost center. Unattributed spend cannot be optimized because you don't know who to ask or where to look. The mechanism is tagging: every resource tagged with `Project`, `Environment`, `Team`, and `CostCenter` enables Cost Explorer and cost allocation reports to break down spending by any dimension. Enforce tagging via SCPs (deny resource creation without required tags) or AWS Config rules (detect untagged resources).

---

### EC2 Purchasing Models: The Right Instrument for Each Workload

EC2 offers four pricing models. Each matches a different workload characteristic. Using the wrong model wastes money; using no strategy (all On-Demand) overpays by 30–70%.

**On-Demand**: pay per hour or second with no commitment. Correct use: variable workloads with unpredictable demand, new applications whose usage is unknown, short-term workloads (< 1 year). On-Demand is your baseline — everything else is a discount off On-Demand.

**Savings Plans**: a commitment to a consistent amount of compute spend ($/hour) for a 1- or 3-year term, in exchange for a discount of up to 66% off On-Demand. There are three types:
- **Compute Savings Plans**: the most flexible — apply automatically to any EC2 instance (any region, any family, any OS), Lambda, and Fargate. Discount up to 66%. Recommended as the default commitment vehicle.
- **EC2 Instance Savings Plans**: apply only to a specific instance family in a specific region (e.g., m5 in us-east-1), any size and OS. Higher discount (up to 72%) but less flexibility. Use when you have stable, predictable capacity in a specific family.
- **SageMaker Savings Plans**: apply to SageMaker instance usage.

**Reserved Instances (RIs)**: a commitment to a specific instance type (family, size, OS, tenancy) for 1 or 3 years. Standard RIs offer up to 72% discount but cannot be modified between families. Convertible RIs can be exchanged for different instance types (same or higher value) but offer a lower discount (~54%). RIs are purchased at the account level and can be shared across an Organization via RI sharing. Key distinction from Savings Plans: RIs are per-instance-type; Savings Plans are per-dollar-of-compute. Savings Plans are generally preferred because they cover more workload variation with comparable discounts.

**Spot Instances**: access unused EC2 capacity at up to 90% discount off On-Demand. Spot instances can be interrupted with a 2-minute warning when EC2 needs the capacity back. Correct use: fault-tolerant, stateless, or checkpointable workloads — batch processing, rendering, ML training, genomics. Anti-pattern: any workload that cannot tolerate interruption (web servers without a load balancer and retry logic, databases without Multi-AZ, any component where interruption causes data loss or customer impact).

**Spot interruption handling patterns**:
- **Checkpointing**: save progress periodically so that when an instance is interrupted, the work resumes from the last checkpoint rather than restarting from zero. Use S3 for checkpoint storage (survives instance termination).
- **Diversification across pools**: request Spot capacity from multiple instance families and sizes across multiple AZs. A Spot pool is a specific instance type in a specific AZ; diversifying across pools reduces the probability that all your instances are interrupted simultaneously.
- **Spot Fleet / EC2 Auto Scaling Group with mixed instances policy**: maintain a target capacity by mixing Spot and On-Demand (e.g., 60% Spot, 40% On-Demand as baseline), automatically replenishing from On-Demand when Spot pools are interrupted.
- **EC2 Instance Metadata interrupt notice**: poll `http://169.254.169.254/latest/meta-data/spot/termination-time` (or use EventBridge Spot interruption warning event) to detect the 2-minute warning and initiate graceful shutdown.

**Graviton instances** (ARM-based, AWS-designed): 10–40% better price-performance than equivalent x86 instances for most workloads. Graviton3 (M7g, C7g, R7g) offers the best current generation performance. Graviton is not a separate purchasing model — you still choose On-Demand, Spot, or Savings Plans for Graviton instances. The price-performance gain comes from more compute per dollar. Use Graviton for Java, Python, Go, and containerized workloads. Anti-pattern: Windows workloads that require x86 DLLs, specialized x86-only software.

---

### Savings Plans vs. Reserved Instances: Decision Framework

The exam frequently presents scenarios where you must choose between Savings Plans and RIs.

**Use Compute Savings Plans when**:
- Workloads span multiple EC2 instance families or regions
- You expect to change instance types over the commitment period (migration to newer generation, move to Graviton)
- You also run Lambda or Fargate and want a single commitment to cover all compute
- You want simplicity — one commitment type to manage

**Use EC2 Instance Savings Plans when**:
- A specific instance family in a specific region is stable and won't change for 1–3 years (e.g., your database fleet is all r6i in us-east-1)
- You want the maximum discount (up to 72%) and can accept the inflexibility

**Use Convertible RIs when**:
- You need specific tenancy (Dedicated Host) or specific OS licensing that Savings Plans don't support
- Your RI portfolio is already large and you need the exchange option

**Use Standard RIs when**:
- Long-lived stable workloads where the instance type will not change
- You want maximum discount and have high confidence in stability
- You need to sell unused capacity (Standard RIs are sellable on the AWS Marketplace; Convertible RIs and Savings Plans are not)

---

### Lambda Cost Optimization: Power Tuning and Consumption Model

Lambda pricing has two components: invocation count ($0.20 per 1M invocations) and compute duration (GB-seconds). Compute cost = memory (GB) × duration (seconds) × price rate. The key insight is that more memory = faster execution = fewer GB-seconds total. The relationship between memory and duration is not linear: doubling memory might reduce duration by 60%, reducing total cost.

**AWS Lambda Power Tuning** is an open-source Step Functions state machine (available in the AWS Serverless Application Repository) that runs your function at multiple memory settings, measures duration, and calculates cost and performance at each setting. It produces a chart of cost vs. performance trade-off. Use it for any Lambda function that runs frequently (> 100,000 invocations/day) where the optimal memory setting is unknown.

**Provisioned Concurrency** keeps Lambda execution environments initialized and ready, eliminating cold start latency. It is billed continuously at a higher rate than on-demand Lambda even if no invocations occur. Use provisioned concurrency only for latency-sensitive paths (interactive APIs, synchronous user-facing operations) where cold start latency is measurable and unacceptable. Anti-pattern: applying provisioned concurrency to all Lambda functions to "avoid cold starts" — most Lambda functions are async or batch-processed where cold start adds a few hundred milliseconds that no user experiences.

**Lambda compute duration rounding**: Lambda rounds duration up to the nearest 1ms. Functions that complete in 1.2ms are billed for 2ms. Optimize for duration reduction more than memory reduction for very short functions.

---

### Storage Cost Optimization

Storage costs accumulate silently. Without lifecycle policies, S3 buckets grow indefinitely — data that was accessed daily in 2022 is still in S3 Standard in 2025 paying the same price.

**S3 Storage Classes** (ordered by cost, highest to lowest for active data):
- **S3 Standard**: high-frequency access, low latency. ~$0.023/GB/month.
- **S3 Intelligent-Tiering**: automatically moves objects between tiers (Frequent Access, Infrequent Access, Archive Instant Access, Archive) based on access patterns. No retrieval fee; monitoring fee per object. Best when access patterns are unpredictable.
- **S3 Standard-IA** (Infrequent Access): cheaper storage (~$0.0125/GB) but $0.01/GB retrieval fee. Use for data accessed less than once per month.
- **S3 One Zone-IA**: same as Standard-IA but stored in a single AZ (~$0.01/GB). Use only for data that can be recreated if an AZ fails (e.g., thumbnail cache, processed output files).
- **S3 Glacier Instant Retrieval**: archival storage (~$0.004/GB) with millisecond retrieval. Use for data accessed once per quarter.
- **S3 Glacier Flexible Retrieval**: cheaper (~$0.0036/GB) with retrieval times of minutes to hours.
- **S3 Glacier Deep Archive**: cheapest (~$0.00099/GB) with 12-hour retrieval. Use for 7+ year compliance retention.

**S3 Lifecycle policies** automate the transition between storage classes and deletion of objects past a defined age. Every S3 bucket with long-lived data should have a lifecycle policy.

**EBS cost optimization**: gp3 volumes are 20% cheaper than gp2 volumes and allow independent configuration of IOPS and throughput (you don't have to over-provision size just to get more IOPS). Migrate all gp2 volumes to gp3. Use EBS snapshot lifecycle policies (Amazon Data Lifecycle Manager) to expire old snapshots automatically. Delete unattached EBS volumes (use AWS Config rule `ec2-volume-inuse-check` to detect them).

---

### Data Transfer Cost Optimization

Data transfer is the most commonly underestimated cost in AWS architectures. Understanding the billing rules is essential for both cost optimization and exam questions.

**What is free**:
- Inbound data transfer to AWS (from internet to EC2, S3, etc.)
- Traffic within the same AZ between EC2 instances using private IP addresses
- S3 to CloudFront (origin fetch)
- S3 Gateway Endpoint traffic (S3 accessed via VPC endpoint, not internet)
- Traffic between EC2 and S3 in the same region via VPC endpoint

**What costs money**:
- Outbound from EC2 to the internet: ~$0.09/GB (first 10TB/month)
- Cross-AZ traffic: $0.01/GB each way ($0.02/GB round-trip). This is significant — an application that passes data between an EC2 instance and an RDS replica in a different AZ pays per-GB on every query result.
- Cross-region traffic: $0.02/GB (varies by region pair)
- NAT Gateway processing: $0.045/GB + $0.045/hour

**Key optimization patterns**:
- Use **VPC Gateway Endpoints for S3 and DynamoDB** — zero cost, traffic stays on AWS backbone
- Use **CloudFront** to cache content at the edge, reducing the number of origin fetches and their associated egress cost
- Keep EC2 instances and their RDS/ElastiCache in the **same AZ** to eliminate cross-AZ data transfer fees (accept that this reduces availability for the purpose of cost reduction — a deliberate trade-off, not an accident)
- Use **Direct Connect** for large-volume on-premises to AWS data transfer — Direct Connect per-GB rates ($0.02/GB) are typically lower than internet egress ($0.09/GB)
- Avoid NAT Gateway for S3 access — use the S3 Gateway Endpoint instead; NAT Gateway charges $0.045/GB for traffic you could route for free

---

### Expenditure Awareness Tools

**AWS Cost Explorer** provides historical cost visualization, trend analysis, and forecasting. The RI/SP coverage and utilization reports show whether your commitments are being consumed (utilization) and what percentage of your eligible spend is covered (coverage). Use Cost Explorer to identify the highest-spend services, the fastest-growing services, and to generate Savings Plans purchase recommendations.

**AWS Budgets** lets you set cost and usage thresholds with email/SNS alerts when thresholds are breached. Budget types: Cost budget, Usage budget, RI utilization, RI coverage, Savings Plans utilization, Savings Plans coverage. Budget Actions allow automated responses: apply IAM policies, apply SCPs, or stop EC2/RDS instances when a budget threshold is reached.

**Cost Anomaly Detection** uses ML to establish a spending baseline for each service and sends alerts when spending deviates significantly from the baseline. It identifies anomalies that would not be caught by static Budget alerts — e.g., an EC2 instance fleet that doubled due to an Auto Scaling misconfiguration at 2 AM.

**AWS Compute Optimizer** analyzes CloudWatch metrics for EC2 instances, Lambda functions, EBS volumes, ECS Fargate tasks, and Auto Scaling groups and produces right-sizing recommendations. It identifies over-provisioned resources (where CPU/memory utilization is consistently low) and under-provisioned resources (where utilization is high, suggesting a more powerful instance type might be cheaper overall due to fewer instances needed).

**AWS Trusted Advisor** provides cost optimization checks including idle EC2 instances (< 10% CPU utilization), underutilized EBS volumes, unassociated Elastic IP addresses, idle RDS instances, and low-utilization RI recommendations. Trusted Advisor cost checks are available at the Business and Enterprise support tiers.

---

## Configuration Reference

### AWS Budgets + Actions: Automatically Stop EC2 Instances When Budget Is Exceeded

This configuration creates a monthly cost budget for a specific project, sends an SNS alert at 80% threshold, and automatically applies an SCP to restrict EC2 instance launches when spend reaches 100% of the budget.

```bash
# Step 1: create the budget with alert and action configuration
# CLI: aws budgets create-budget

aws budgets create-budget \
  --account-id "123456789012" \
  --budget '{
    "BudgetName": "ProjectAlpha-Monthly-EC2",
    "BudgetLimit": {
      "Amount": "5000",
      "Unit": "USD"
    },
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostFilters": {
      "TagKeyValue": [
        "user:Project$ProjectAlpha"
      ],
      "Service": [
        "Amazon Elastic Compute Cloud - Compute"
      ]
    },
    "CostTypes": {
      "IncludeTax": true,
      "IncludeSubscription": true,
      "UseBlended": false,
      "IncludeRefund": false,
      "IncludeCredit": false,
      "IncludeUpfront": true,
      "IncludeRecurring": true,
      "IncludeOtherSubscription": true,
      "IncludeSupport": false,
      "IncludeDiscount": true,
      "UseAmortized": false
    }
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80,
        "ThresholdType": "PERCENTAGE",
        "NotificationState": "ALARM"
      },
      "Subscribers": [
        {
          "SubscriptionType": "SNS",
          "Address": "arn:aws:sns:us-east-1:123456789012:BudgetAlerts"
        },
        {
          "SubscriptionType": "EMAIL",
          "Address": "platform-team@example.com"
        }
      ]
    }
  ]'
```

```json
// budget-action-scp.json
// The SCP that Budget Actions will apply to the target OU/account
// when spend reaches 100% of budget.
// This policy denies RunInstances (launching new EC2 instances)
// but preserves existing running instances so production is not disrupted.
// Effect: new EC2 capacity cannot be added until the next budget period.
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DenyEC2RunInstances",
      "Effect": "Deny",
      "Action": [
        "ec2:RunInstances"
      ],
      "Resource": [
        // Deny launching any EC2 instance type
        "arn:aws:ec2:*:*:instance/*"
      ],
      "Condition": {
        // Only apply this restriction to non-exempt IAM principals.
        // The FinOps and platform teams are excluded so they can investigate
        // and manually approve exceptions.
        "StringNotLike": {
          "aws:PrincipalARN": [
            "arn:aws:iam::123456789012:role/FinOpsAdmin",
            "arn:aws:iam::123456789012:role/PlatformTeamAdmin"
          ]
        }
      }
    }
  ]
}
```

```bash
# Step 2: create the Budget Action that applies the SCP when 100% threshold is hit
# Budget Actions require an IAM role that Budgets can assume to apply the action.
# First, create the IAM role:

aws iam create-role \
  --role-name BudgetsActionRole \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "budgets.amazonaws.com"
        },
        "Action": "sts:AssumeRole",
        "Condition": {
          "StringEquals": {
            "sts:ExternalId": "arn:aws:budgets::123456789012:budget/ProjectAlpha-Monthly-EC2"
          }
        }
      }
    ]
  }'

# Attach permissions allowing Budgets to apply SCPs and stop EC2/RDS instances
aws iam attach-role-policy \
  --role-name BudgetsActionRole \
  --policy-arn arn:aws:iam::aws:policy/AWSBudgetsActionsWithAWSResourceControlAccess
```

```bash
# Step 3: create the Budget Action itself
# This action applies an SCP to a specific OU when actual spend reaches 100% of budget.
# The action type is APPLY_SCP_TO_OU.
# Note: SCP_ACTION_DEFINITION targets an OU, not individual accounts.

aws budgets create-budget-action \
  --account-id "123456789012" \
  --budget-name "ProjectAlpha-Monthly-EC2" \
  --notification-type "ACTUAL" \
  --action-type "APPLY_SCP_TO_OU" \
  --action-threshold '{
    "ActionThresholdValue": 100,
    "ActionThresholdType": "PERCENTAGE"
  }' \
  --definition '{
    "ScpActionDefinition": {
      "PolicyId": "p-examplepolicyid111",
      "TargetIds": [
        "ou-exampleroot111-exampleou111"
      ]
    }
  }' \
  --execution-role-arn "arn:aws:iam::123456789012:role/BudgetsActionRole" \
  --approval-model "AUTOMATIC" \
  --subscribers '[
    {
      "SubscriptionType": "SNS",
      "Address": "arn:aws:sns:us-east-1:123456789012:BudgetAlerts"
    }
  ]'

# APPROVAL_MODEL: AUTOMATIC applies the action immediately when threshold is reached.
# Use MANUAL if you want human approval before the SCP is applied.
# MANUAL is appropriate for production accounts where applying an SCP
# could disrupt running workloads; AUTOMATIC is appropriate for
# development/test accounts where hard stops are acceptable.
```

```bash
# Step 4: verify the budget and action are configured correctly
aws budgets describe-budget \
  --account-id "123456789012" \
  --budget-name "ProjectAlpha-Monthly-EC2"

aws budgets describe-budget-actions-for-budget \
  --account-id "123456789012" \
  --budget-name "ProjectAlpha-Monthly-EC2"

# Bonus: S3 lifecycle policy to move logs to cheaper storage tiers
# This CloudFormation snippet adds a lifecycle policy to an existing bucket.
# It transitions access logs to IA after 30 days, Glacier after 90 days,
# and deletes them after 365 days.
```

```yaml
# cloudformation/s3-lifecycle.yaml
# Add cost-optimizing lifecycle rules to an S3 bucket
AWSTemplateFormatVersion: "2010-09-09"
Description: "S3 bucket with cost-optimizing lifecycle policy for log data"

Resources:
  LogsBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "projectalpha-logs-${AWS::AccountId}"
      LifecycleConfiguration:
        Rules:
          - Id: LogsLifecycle
            Status: Enabled
            # Apply to all objects with the prefix 'logs/'
            Prefix: "logs/"
            Transitions:
              # After 30 days: move to Standard-IA (60% cost reduction vs Standard)
              # Only effective if objects are > 128KB; small objects are more expensive
              # in IA due to the minimum storage charge (128KB per object).
              - TransitionInDays: 30
                StorageClass: STANDARD_IA
              # After 90 days: move to Glacier Instant Retrieval (85% reduction vs Standard)
              # Appropriate for logs that might need investigation but rarely do.
              - TransitionInDays: 90
                StorageClass: GLACIER_IR
              # After 365 days: move to Glacier Deep Archive (95% reduction vs Standard)
              # Compliance retention — no one accesses these, 12-hour retrieval is acceptable.
              - TransitionInDays: 365
                StorageClass: DEEP_ARCHIVE
            # Delete objects after 7 years (2555 days) — meets most compliance requirements.
            # Adjust to your specific retention policy.
            ExpirationInDays: 2555

          - Id: DeleteIncompleteMultipartUploads
            Status: Enabled
            # Incomplete multipart uploads accumulate and are charged for storage.
            # This rule cleans them up after 7 days — a common hidden cost source.
            AbortIncompleteMultipartUpload:
              DaysAfterInitiation: 7

          - Id: DeleteOldVersions
            Status: Enabled
            # If versioning is enabled, old versions accumulate.
            # Keep the 3 most recent versions by expiring non-current versions after 30 days.
            NoncurrentVersionExpirationInDays: 30
            NoncurrentVersionTransitions:
              - TransitionInDays: 7
                StorageClass: STANDARD_IA
```

---

## How to Decide

### EC2 Purchasing Model Decision Framework

Use this ordered decision process when selecting an EC2 purchasing model for a workload:

1. **Can the workload tolerate interruption?** (stateless, checkpointable, batch, non-interactive)
   - Yes → **Spot Instances** (up to 90% discount). Implement interruption handling. Mix with On-Demand via mixed instances policy for minimum viable capacity.
   - No → continue to step 2.

2. **Is the baseline capacity commitment stable for 1–3 years?** (predictable load, not likely to change instance family)
   - Yes + multiple families/regions/Lambda/Fargate → **Compute Savings Plans** (up to 66% discount, most flexible)
   - Yes + single family, single region, stable → **EC2 Instance Savings Plans** (up to 72%) or **Standard RIs** (same discount, RI Marketplace resale option)
   - No → continue to step 3.

3. **Is the workload variable or short-lived?** (< 1 year, unpredictable peak, dev/test, new application)
   - Yes → **On-Demand**. After 30–60 days of CloudWatch data, run Compute Optimizer and Cost Explorer for Savings Plans recommendations.

4. **Can Graviton be used?** (Java, Python, Go, containerized, Linux)
   - Yes → apply Graviton to Spot, Savings Plans, and On-Demand instances for additional 10–40% price-performance improvement at no additional commitment.

### Choosing the Right S3 Storage Class

| Access pattern | Storage class | Key consideration |
|---|---|---|
| Frequent access, latency-sensitive | S3 Standard | No retrieval fee; highest durability |
| Unknown/variable access pattern | S3 Intelligent-Tiering | Monitoring fee per object; only cost-effective for objects > 128KB |
| Infrequent access, < once/month, recreatable if lost | S3 One Zone-IA | Single AZ; 20% cheaper than Standard-IA |
| Infrequent access, must survive AZ failure | S3 Standard-IA | Retrieval fee applies; minimum 30-day charge |
| Archival, millisecond retrieval needed | S3 Glacier Instant Retrieval | ~83% cheaper than Standard; minimum 90-day charge |
| Archival, minutes to hours retrieval acceptable | S3 Glacier Flexible Retrieval | Expedited (1–5 min), Standard (3–5 hr), Bulk (5–12 hr) |
| Compliance retention, 12-hr retrieval acceptable | S3 Glacier Deep Archive | Cheapest option; minimum 180-day charge |

---

## How This Connects

- **AWS Organizations and SCPs** connect cost governance to infrastructure policy. Budget Actions can automatically apply SCPs to restrict resource provisioning when budgets are exceeded, creating hard guardrails that prevent runaway spend. The combination of Budgets + SCPs enforces cost governance without manual intervention.
- **AWS Compute Optimizer** connects directly to Cost Explorer recommendations: Compute Optimizer right-sizing recommendations for EC2 and Lambda surface actionable changes, while Cost Explorer shows the monetary impact of those changes. The workflow is: Compute Optimizer identifies over-provisioned resources → Cost Explorer quantifies the savings → Engineering implements the change → Cost Explorer measures the result.
- **CloudFront** connects to both cost optimization and performance. For cost: origin-pull traffic from CloudFront to S3 is free; CloudFront egress to the internet is cheaper than direct S3/EC2 egress for high-volume scenarios (CloudFront pricing: ~$0.0085/GB vs S3 direct ~$0.09/GB). For performance: caching at edge reduces origin load and latency simultaneously, making CloudFront one of the few AWS services that improves both cost and performance together.
- **Auto Scaling** connects to the consumption model principle. Target tracking scaling policies ensure that capacity is provisioned only when needed and deprovisioned when demand drops. A correctly tuned ASG with Spot integration captures the cost benefit of Spot pricing while maintaining availability — computing at a 60–70% discount during off-peak hours with seamless scale-up during peaks.

---

## Exam Traps

**Trap 1: "Compute Savings Plans are less flexible than Reserved Instances."**
The opposite is true. Compute Savings Plans are the most flexible commitment type: they apply automatically to any EC2 instance family, size, OS, region, and also to Lambda and Fargate. Standard Reserved Instances are the least flexible — they apply only to a specific instance type in a specific region. The exam may present a scenario where a company is migrating to Graviton and asks which commitment type allows the transition without losing the discount — the answer is Compute Savings Plans.

**Trap 2: "Spot Instances are appropriate for any EC2 workload to save money."**
Spot instances are appropriate only for fault-tolerant workloads. Using Spot for a primary web server without robust interruption handling, for a database (data loss risk), or for any stateful workload without checkpointing introduces reliability risk that exceeds the cost savings. The correct answer for "reduce cost without impacting availability for a stateless web tier" is a mixed instances ASG with Spot + On-Demand, not pure Spot.

**Trap 3: "Cost Explorer Savings Plans recommendations tell you exactly how much to purchase."**
Cost Explorer recommendations are based on historical usage and a lookback period (7, 30, or 60 days). They optimize for the lookback period, not for future growth. If your usage is growing, the recommendation may be conservative. Also, Cost Explorer recommends Savings Plans in the payer account, not individual member accounts — if you apply the commitment at the member account level, the coverage may be different from the recommendation.

**Trap 4: "Data transfer within a region is always free."**
Data transfer between EC2 instances (or EC2 and other services) in different AZs within the same region is NOT free. Cross-AZ traffic costs $0.01/GB in each direction ($0.02/GB round-trip). This is a significant cost for architectures that do high-throughput cross-AZ reads (e.g., an application in us-east-1a reading from an RDS read replica in us-east-1b). The exam may ask how to reduce data transfer costs — placing the application and its data in the same AZ (accepting reduced HA) or using VPC Gateway Endpoints are correct answers.

**Trap 5: "Reserved Instances are always more cost-effective than Savings Plans."**
Standard RIs for a specific instance family/region can provide a slightly higher discount than Compute Savings Plans (up to 72% vs. 66%), but the rigidity of RIs means that unused RIs provide no benefit. An organization that has a mix of instance families, is migrating to newer generations, or plans to adopt Graviton will likely see better realized savings with Compute Savings Plans due to the automatic, flexible coverage — even if the nominal discount rate is 6 percentage points lower.

---

## Summary

- Cost optimization requires organizational ownership (FinOps practices, tagging, unit economics) and engineering implementation — neither alone is sufficient.
- EC2 purchasing model selection follows a decision process: Spot for interruptible workloads, Compute Savings Plans for flexible baseline commitments, EC2 Instance Savings Plans or Standard RIs for stable single-family workloads, On-Demand for variable or unknown workloads.
- Compute Savings Plans are the most flexible commitment vehicle and should be the default unless workloads are stable enough to justify the deeper discount of EC2 Instance Savings Plans.
- Storage cost reduction requires explicit lifecycle policies — S3 data does not move to cheaper tiers automatically unless Intelligent-Tiering or lifecycle rules are configured.
- Data transfer costs are frequently underestimated; cross-AZ traffic, NAT Gateway processing, and internet egress are the most common hidden costs. S3 Gateway Endpoints, CloudFront, and same-AZ placement eliminate large categories of data transfer cost.
- Budget Actions with SCPs provide automated, hard-stop cost governance that works even when manual alerting is missed or ignored.

---

## Examples

**Beginner:** A small startup runs their application on three On-Demand m5.large instances 24/7 in us-east-1. After reviewing Cost Explorer, they see that this has been consistent for six months. They purchase a 1-year Compute Savings Plan at the $0.096/hour commitment level (covering their baseline three-instance equivalent), reducing their EC2 cost by 44%. They also add an S3 lifecycle policy to move objects older than 30 days to Standard-IA and older than 90 days to Glacier Instant Retrieval, reducing their S3 bill by 70%. Finally, they switch their gp2 EBS volumes to gp3, saving 20% on storage with better baseline performance. Total first-year savings: approximately $4,000 on a $10,000 annual bill.

**Intermediate:** A media company runs a video transcoding pipeline on EC2. Transcoding is CPU-intensive, stateless, and can tolerate interruption (each job checkpoints to S3 every 60 seconds). They migrate from On-Demand c5.4xlarge instances to a mixed instances Auto Scaling Group: 20% On-Demand Spot-compatible instances (minimum viable capacity to handle current jobs if Spot is fully reclaimed), 80% Spot across five instance types (c5.4xlarge, c5a.4xlarge, c6i.4xlarge, m5.4xlarge, m6i.4xlarge) and three AZs. The diversification across pools reduces the probability of simultaneous interruption to near zero. Spot interruption warnings are handled by a script that checkpoints the current job and gracefully terminates. Combined with Graviton3 instances (c7g) added to the Spot pool, their compute cost drops by 72% compared to the original On-Demand c5 fleet.

**Advanced:** A large enterprise with 200 AWS accounts needs a comprehensive FinOps program. They implement a tagging standard enforced by AWS Config rules and a "deny resource creation without required tags" SCP applied to all accounts. Cost allocation reports in the management account show spending by `Project`, `Environment`, and `Team` tags. Monthly FinOps reviews use Cost Explorer to identify: (1) Savings Plans coverage below 80% in any account triggers a purchase analysis, (2) Compute Optimizer findings with estimated savings > $500/month are assigned to the owning team as engineering tickets, (3) Cost Anomaly Detection alerts are routed to a Slack channel for same-day response. Budget Actions in development accounts automatically stop all EC2 and RDS instances at 100% of monthly budget, preventing runaway spend during developer experiments. The program reduces total AWS spend by 31% in the first year while growing infrastructure capacity by 20%.

---

## Think About It

1. Your company has purchased $100,000 in 3-year Standard Reserved Instances for r5.4xlarge in us-east-1. Six months later, AWS releases Graviton3 r7g instances with 40% better price-performance. What options do you have with your existing RIs, and what is the trade-off of each option?

2. Your data team's S3 bucket costs have grown from $2,000/month to $8,000/month in 18 months. Before implementing lifecycle policies, what information do you need to gather, and what risk does implementing lifecycle policies without that information introduce?

3. A developer argues that NAT Gateway is necessary for their Lambda functions to call external APIs. You notice the NAT Gateway is processing 2TB/month at $0.045/GB = $90/month. What questions would you ask to determine whether the NAT Gateway is actually necessary for each Lambda function's use case?

4. Your FinOps review shows that Compute Optimizer recommends downsizing 40 EC2 instances, projecting $15,000/month in savings. When you investigate, half the instances show high CPU utilization on Monday mornings but low utilization the rest of the week. Why should you not blindly apply Compute Optimizer's recommendation, and what information should Compute Optimizer show you to make a better recommendation?

5. A startup is trying to decide between a 1-year Compute Savings Plan and purchasing Reserved Instances. They have three EC2 instance types running continuously and plan to migrate to Graviton instances within the next 6 months. Which commitment type would you recommend, and what is the specific mechanism that makes it the right choice for their migration plan?

---

## Quick Check

**Question 1:** A company runs a fleet of EC2 instances for a batch data processing workload that runs nightly for 6 hours. The workload is stateless and can restart from a checkpoint stored in S3 if interrupted. Which purchasing model minimizes cost while meeting these requirements?

A. 1-year Reserved Instances (Standard)  
B. On-Demand Instances  
C. Spot Instances with a mixed instances policy and S3 checkpointing  
D. Compute Savings Plans  

**Answer: C.** Spot Instances provide up to 90% discount off On-Demand and are appropriate for fault-tolerant, stateless workloads with checkpointing. The S3 checkpointing satisfies the recoverability requirement from an interruption. A mixed instances policy (diversifying across instance families and AZs) reduces the probability of simultaneous interruption across the fleet. Reserved Instances (A) and Savings Plans (D) provide discounts on On-Demand pricing but cannot match Spot's potential 90% discount for a fully interruptible workload. On-Demand (B) is the most expensive option with no commitment discount.

---

**Question 2:** A company wants to reduce their S3 costs. Their access logs bucket contains 50TB of logs. Analysis shows that 90% of the data is never accessed after 30 days, 8% is accessed between 30 and 90 days, and only 2% is ever accessed after 90 days (for compliance investigations). Which S3 configuration best reduces cost?

A. Enable S3 Intelligent-Tiering on the entire bucket  
B. Configure a lifecycle policy: transition to Standard-IA after 30 days, transition to Glacier Instant Retrieval after 90 days  
C. Copy all objects to S3 Glacier Deep Archive immediately and delete the originals  
D. Enable S3 Versioning to allow recovery of accidentally deleted logs  

**Answer: B.** A lifecycle policy correctly matches the access pattern: Standard storage for the first 30 days (frequent access), Standard-IA for 30–90 days (occasional access at lower cost), and Glacier Instant Retrieval for 90+ days (rare compliance access with millisecond retrieval). Intelligent-Tiering (A) adds a per-object monitoring fee ($0.0025 per 1,000 objects) that may exceed the savings for consistently cold access log data where the pattern is well-understood. Glacier Deep Archive (C) would prevent timely access during the 2–8% of compliance investigations that need quick retrieval. Versioning (D) increases storage costs rather than reducing them.

---

**Question 3:** A company has three years of historical EC2 usage showing consistent baseline capacity of 100 m5.large instances in us-east-1. They also run 10 Lambda functions and 20 Fargate tasks. They plan to migrate to Graviton3 (m7g) instances within the next year. Which commitment purchase best covers this workload?

A. 100 Standard Reserved Instances for m5.large in us-east-1  
B. 100 Convertible Reserved Instances for m5.large in us-east-1  
C. A Compute Savings Plan sized to cover the equivalent of 100 m5.large instances  
D. An EC2 Instance Savings Plan for the m5 family in us-east-1  

**Answer: C.** A Compute Savings Plan automatically applies to any EC2 instance family (including m7g Graviton3), any size, any OS, and also to Lambda and Fargate — covering the entire compute footprint with one commitment. When the team migrates to m7g, the Savings Plan continues to apply to the new instance type with no action required. Standard RIs (A) are locked to m5.large and provide no benefit after migration to m7g. Convertible RIs (B) can be exchanged, but the exchange process is manual and the discount is lower than Compute Savings Plans. EC2 Instance Savings Plans (D) apply only to the m5 family in us-east-1 and would not cover Lambda, Fargate, or the new m7g instances after migration.

---

## What's Next

This completes Module 25: Well-Architected Deep Dive. The pillars covered across this module — Operational Excellence, Performance and Sustainability, Security, Reliability, and Cost Optimization — form the structured evaluation framework used by AWS Solutions Architects and tested across both the SAA-C03 and SAP-C02 exams. The next module applies these frameworks to domain-specific architecture patterns in preparation for the final exam strategy review.
