---
title: "AWS Pricing Fundamentals"
type: content
estimated_minutes: 18
cert_tags: ["aws_ccp", "aws_clf_c02"]
---

# AWS Pricing Fundamentals

## Overview

AWS pricing is built on a single foundational idea: you pay for exactly what you use, measured down to the second or the byte, with no upfront infrastructure cost and no penalty for stopping. Run an EC2 instance for 47 minutes and you pay for 47 minutes. Store 3.2 GB in S3 for a month and you pay for 3.2 GB. This consumption-based model is fundamentally different from the traditional data center model, where buying or leasing hardware means paying for capacity whether it runs at 100% utilization or sits completely idle. AWS has inverted that equation: every dollar you spend corresponds to a unit of resource you actually consumed. This shift is not just a billing convenience — it is the mechanism that allows organizations of any size to experiment, fail cheaply, and scale without financial risk.

AWS pricing rests on three core principles that appear directly on the CLF-C02 exam. First, pay for what you use — no idle waste, no setup fees, billing starts when a resource starts and stops when it stops. Second, pay less when you use more — volume discounts that kick in automatically as monthly usage grows past defined thresholds. Third, pay less when you reserve — commitment-based discounts of 30–72% when you agree to use a specific amount of compute for one or three years. Understanding why each principle exists, not just that it exists, is what lets you answer exam scenario questions confidently. AWS designed these principles to align its incentives with customer outcomes: it wants you to grow your usage, and it rewards you for predictability.

Most AWS costs fall into three billing dimensions: compute (the processing power you use, billed per second for EC2 and per request and execution-time for Lambda), storage (the data you persist, billed per GB per month with important differences between services), and data transfer out (the data you send from AWS to the internet or to other Regions, billed per GB while inbound transfer is always free). The asymmetry in data transfer pricing — free in, charged out — is one of the most tested facts on the CLF-C02 exam. This lesson explains each dimension in depth, covers the logic behind that asymmetric model, and walks you through the AWS Billing and Cost Management console so you can read your charges and configure billing alerts with confidence.

## Core Concepts

### Pay for What You Use

The "pay for what you use" principle means that AWS measures actual resource consumption and charges you only for that consumption. There are no setup fees for most services, no idle server costs, and no required minimum spend. An EC2 instance that runs for 45 minutes is billed for 45 minutes. An S3 bucket with zero objects stored has zero storage cost (though API calls for PUT and GET requests carry minimal per-request fees). A Lambda function that never receives a request incurs no charge at all.

Why does this model exist? Because it removes the largest financial barrier to experimentation and innovation. In a traditional on-premises data center, deploying a new application means purchasing hardware — a capital expenditure that takes months to procure and represents a sunk cost regardless of whether the project succeeds. Mistakes are expensive. On AWS, you can launch a proof of concept in five minutes, evaluate it for a week, and either keep it or terminate it. If you terminate it, billing stops immediately. There is no sunk cost. This is one of the core reasons the pay-for-what-you-use model accelerated the pace of software innovation across the industry — the cost of a failed experiment dropped from tens of thousands of dollars to near zero.

For exam purposes: most AWS services have no minimum commitment requirement. The exceptions — Reserved Instances and Savings Plans — are discount mechanisms you opt into voluntarily, not required payments. You are never forced to prepay. A question describing a company that deployed a service for two weeks and then shut it down should always lead to "pay for exactly what was consumed."

### Pay Less When You Use More

For many AWS services, the per-unit price decreases automatically as your total usage within a billing period crosses defined volume thresholds. Amazon S3 charges a lower per-GB storage rate as your total stored data grows past specific tiers. Amazon CloudFront charges lower per-GB transfer rates at higher monthly traffic volumes. This is volume-based tiered pricing, and it applies without any negotiation or opt-in — AWS calculates your tier automatically based on your monthly consumption.

This principle exists because AWS's unit costs genuinely decrease at scale. Storing one petabyte of customer data across hundreds of hard drives in a highly engineered facility generates very different economics than storing one gigabyte. As AWS's infrastructure density increases and operational efficiency improves, it passes those gains to high-volume customers through lower per-unit rates. The discount is structural, not promotional.

Critically, this principle applies at the AWS Organization level, not per-account. When multiple accounts are linked under AWS Organizations with consolidated billing enabled, AWS aggregates usage across all accounts when calculating volume discount thresholds. A company with 20 separate AWS accounts — each individually below the S3 discount threshold — may collectively exceed that threshold when billing is consolidated. This means consolidating accounts under an Organization can capture volume discounts that no single account could reach independently.

### Pay Less When You Reserve

Committing to use a specific amount of AWS compute for one or three years earns discounts of 30–72% compared to on-demand rates. This is the "pay less when you reserve" principle, implemented through Reserved Instances and Savings Plans. These are optional purchase decisions, not requirements — they make sense only for stable, predictable workloads where you are confident the commitment will be fully utilized.

The discount exists because of an economic exchange: your long-term commitment gives AWS capacity planning certainty. When AWS knows that thousands of specific instance types in a given Region are committed for three years, it can plan procurement, data center expansion, and power contracts around that baseline. That planning certainty reduces AWS's operational risk, and the resulting efficiency savings are passed back as the reservation discount. You give up flexibility — you've committed to the cost regardless of actual use — and AWS gives you a cheaper effective rate in return.

For exam purposes: know that Reserved Instances and Savings Plans are the mechanism for this principle. Both require a 1- or 3-year commitment and deliver 30–72% savings off on-demand rates. Never purchase a commitment before you have usage history showing that the workload is stable and predictable. The detailed mechanics of each commitment product are covered in Lesson 3.

### The Three Cost Dimensions: Compute

Compute cost is the price of processing power. Amazon EC2 instances are billed per second with a 60-second minimum, and the rate depends on three variables: instance type (the specific CPU and memory configuration, such as t3.micro versus m5.xlarge), the AWS Region where the instance runs (prices vary meaningfully by Region — us-east-1 is consistently among the cheapest), and the pricing model (on-demand, Reserved, or Spot). AWS Lambda uses a completely different billing model: per number of requests and per GB-second of execution time, which is how long your function ran multiplied by the memory you allocated to it.

Understanding compute pricing matters practically because it is typically the largest cost category for companies running production workloads. It is also the most controllable: you can right-size instance types based on actual CPU and memory utilization data from CloudWatch, use auto-scaling so instances only run when traffic demands them, use Spot Instances for interruptible batch jobs at 60–90% discount, and apply Savings Plans to reduce steady-state on-demand costs by 30–40%. Compute cost is where the largest optimization opportunities live — it is where you should spend the most time if you are trying to reduce an AWS bill.

For the exam: EC2 is billed per second with a 60-second minimum. Lambda is billed per request and per GB-second of execution time. Pricing varies by Region and instance type. You do not need to memorize specific prices — AWS publishes them at aws.amazon.com/ec2/pricing and they change over time.

### The Three Cost Dimensions: Storage

Storage cost is the price of persisting data. Amazon S3 charges per GB per month for actual data stored — AWS measures your stored data daily and averages it across the month. Amazon EBS (the block storage volumes attached to EC2 instances) is billed per GB of provisioned capacity per month — the size of the volume you created, not the amount of data actually written to it. If you provision a 500 GB EBS volume and only store 50 GB of actual data, you are charged for the full 500 GB every month.

This provisioned-capacity billing model for EBS surprises many new AWS users. In contrast, S3 charges only for actual bytes stored. This difference should directly influence architectural decisions: for large datasets where the final size is uncertain, S3's pay-for-what-you-store model is more cost-predictable than pre-allocating an EBS volume that may end up half-empty. Amazon S3 Glacier storage classes (Instant Retrieval, Flexible Retrieval, and Deep Archive) provide long-term archival at dramatically lower per-GB rates, with the trade-off being retrieval latency and a per-GB retrieval fee. Choosing the right storage service and the right storage class is one of the most impactful cost decisions you make at design time.

For the exam: EBS is billed by provisioned size. S3 is billed by actual data stored. Different S3 storage classes (Standard, Intelligent-Tiering, Glacier Instant Retrieval, Glacier Deep Archive) have different per-GB storage rates, with lower storage costs trading off against higher retrieval costs and longer retrieval times.

### The Three Cost Dimensions: Data Transfer

Data transfer pricing follows a rule that is critical for architects and exam takers alike: data transferred into AWS from the internet — inbound — is free for virtually all services. Data transferred out of AWS to the internet is charged per GB. Data transferred between services in different AWS Regions is also charged per GB. Data transferred between services within the same Region is generally free, with one important exception: traffic crossing Availability Zone boundaries within a Region carries a small per-GB charge (typically $0.01/GB), which can become significant at high volumes and is worth designing around.

Why is inbound transfer free but outbound transfer costs money? Because AWS's cost structure is asymmetric. Getting data into AWS supports AWS adoption and customer migration — it is economically beneficial for AWS to remove that friction entirely. Outbound bandwidth, by contrast, represents real infrastructure cost: AWS pays for internet interconnects (peering agreements with ISPs worldwide) to carry data from its data centers to end users, and that cost is passed to customers as data transfer out charges.

Architecturally, this pricing model shapes how you design content delivery systems. Media-heavy applications that serve large files to users — video streaming, large downloads, software distribution — must account for data transfer out costs or route traffic through Amazon CloudFront, which has lower per-GB transfer rates than direct S3-to-internet egress and caches content at edge locations to reduce origin transfer volume. The principle: minimize the data that travels from an AWS Region to the public internet.

## Configuration Reference

### Navigating the AWS Billing and Cost Management Console

The AWS Billing and Cost Management console is where you see what you owe, understand what is driving charges, and configure alerts before bills grow. Here is a complete walkthrough.

**Step 1: Open the Billing console.** Sign in to the AWS Management Console at console.aws.amazon.com. Click your account name in the upper-right corner of the navigation bar — it shows your account alias or 12-digit account ID. In the dropdown, click "Billing and Cost Management." Alternatively, type "Billing" in the top search bar and select "Billing and Cost Management Dashboard" from the results.

**Step 2: Read the dashboard summary cards.** The landing page shows large summary cards at the top. The most prominent displays your current month-to-date charges: the total amount billed so far in this billing period. Directly beside or below it is a forecast card projecting end-of-month total based on your current daily spending rate. These two numbers — what you have spent and what you are on track to spend — are the first check any practitioner runs when reviewing an account's financial health.

**Step 3: Navigate to the Bills page.** In the left navigation panel, under the "Billing" section, click "Bills." The Bills page shows your full itemized bill for the current month, organized by AWS service and then by Region. At the top of the page, a month selector dropdown lets you switch between the current month and previous months. Within each service row, click the expand arrow to drill down into usage types. For example, expanding "Amazon EC2" reveals sub-line items like "BoxUsage:t3.micro" (instance-hours), "EBS:VolumeUsage.gp3" (attached block storage), and "DataTransfer-Out-Bytes" (outbound internet transfer). This drill-down is the most direct way to diagnose an unexpected charge — find the service with the spike, expand it, and identify the specific usage type responsible.

**Step 4: Set up the Cost and Usage Report.** The Cost and Usage Report (CUR) delivers hourly or daily line-item billing data to an S3 bucket you specify, providing the highest granularity available — down to individual resource IDs and hour-by-hour usage. To configure it: in the left navigation under "Billing," click "Cost and Usage Reports." Click "Create report." Name your report (for example, "hourly-detail-report"). Check the box labeled "Include resource IDs" — this adds a column to the report identifying which specific resource, such as an instance ID or bucket name, incurred each charge. Click "Next." On the delivery options screen, select an existing S3 bucket or click "Configure" to create a new one. Set a report path prefix, such as "cur/". Choose "Hourly" for maximum granularity or "Daily" for smaller file sizes that are easier to query manually. Click "Review and Complete." The first report file arrives in your S3 bucket within 24 hours and is delivered as a gzip-compressed CSV. New files are delivered daily after that, making this the foundation for any automated cost analysis pipeline using Amazon Athena or a BI tool.

**Step 5: Configure invoice delivery preferences.** In the left navigation, click "Billing preferences." This page controls how AWS communicates billing information to you. Under "Invoice delivery preferences," you can enable PDF invoice delivery to your email address — when enabled, AWS emails your monthly PDF invoice to the address on file within a few days of the billing period closing. You can also enable "Receive AWS Free Tier usage alerts" here, which sends proactive emails when your current usage rate is on track to exceed any free tier limit. Under "Alert preferences," look for the option to receive billing alerts — this enables the data feed that Amazon CloudWatch Billing Alarms rely on, and it must be enabled before a CloudWatch billing alarm will function. Click "Save preferences" after making changes.

### Using the AWS Pricing Calculator at calculator.aws

The AWS Pricing Calculator estimates costs for planned architectures before you deploy. It is a public tool — no AWS account required, and no connection to any account's actual billing data. Use it to build cost estimates for new architectures, compare architectural options, or produce budget justifications for stakeholders.

**Step 1: Open the calculator.** Navigate to calculator.aws in any browser. Click "Create estimate."

**Step 2: Add your first service.** The "Add service" screen displays AWS services organized by category. Type "EC2" in the search field and click "Configure" next to "Amazon EC2."

**Step 3: Configure the EC2 service.** Set your Region at the top (for example, "US East (N. Virginia)"). Under "EC2 instance specifications," select your OS (Linux) and instance type — type "t3.medium" to find it. Under "Payment options," select "On-Demand" for a baseline. Set the number of instances to 1 and utilization to 100% (730 hours per month). The monthly estimate updates in real time in the right-hand summary panel. A t3.medium on-demand in us-east-1 is approximately $30/month.

**Step 4: Add storage, data transfer, and additional services.** Within the EC2 configuration, scroll to "Amazon EBS volumes," click "Add new volume," and configure a gp3 volume. Scroll to "Data transfer" and enter an estimate for data transferred out to the internet per month. Each configured element is added to the running total. Click "Add service" at the top to add an S3 bucket, an RDS database, or a CloudFront distribution to the same estimate.

**Step 5: Save and share.** Click "Save and share" in the top-right corner. The calculator generates a unique URL that preserves your full configuration. Copy and share this URL with a manager or teammate for budget review. You can also export the estimate as a CSV for inclusion in a spreadsheet or budget document.

## How to Decide

When evaluating AWS costs or planning a new deployment, apply this framework across the three pricing dimensions:

| Decision Point | Guidance |
|---|---|
| Which Region to deploy in? | Choose the Region geographically closest to your users to minimize latency. Check the EC2 pricing page — Regions vary 10–30% for the same instance type. us-east-1 (N. Virginia) is consistently among the least expensive. |
| How much compute to provision? | Start with the smallest instance that meets initial performance requirements. Monitor CPU and memory in CloudWatch. Right-size after 2–4 weeks of utilization data rather than over-provisioning for theoretical peaks. |
| How to manage storage growth? | Use S3 for data that does not need to be attached to a running instance. Set S3 Lifecycle policies to transition aging data to cheaper classes (S3-IA after 30 days, Glacier after 90 days). Avoid over-provisioning EBS volumes — you can increase a gp3 volume with zero downtime, but you cannot decrease it without data migration. |
| How to minimize data transfer costs? | Keep compute and data in the same Region. Serve content through CloudFront rather than directly from S3 or EC2. Avoid routing data unnecessarily between Regions. |
| Should I commit to Reserved Instances or Savings Plans? | Only after 2–3 months of usage history showing stable, predictable demand. Never commit to capacity you are uncertain you will fully use. Use Cost Explorer's Savings Plans Recommendations as the data-driven starting point. |
| How do I catch unexpected costs early? | Create an AWS Budget with an alert at 80% of expected monthly spend and a second alert at 100%. Review the Billing Dashboard service breakdown weekly during initial deployment, monthly thereafter. |

## How This Connects

- The **AWS Billing Dashboard** puts the three cost dimensions in practice — it breaks monthly charges down by service, Region, and usage type, making it straightforward to identify whether your bill is driven by compute, storage, or data transfer, and which specific service is responsible.
- **AWS Cost Explorer** builds on the same billing data to visualize spending trends over time, filter costs by service or resource tag, generate 12-month forecasts, and surface rightsizing recommendations — covered in detail in a later lesson.
- **Amazon CloudFront** directly addresses data transfer out costs — it caches content at edge locations near users, reducing the volume of data that travels from AWS origin servers to the internet and applying lower per-GB transfer rates than direct S3 or EC2 egress.
- **AWS Savings Plans and Reserved Instances** are the mechanism for the "pay less when you reserve" principle — these commitment products require analyzing compute usage history before purchasing, which is why Cost Explorer's Savings Plans recommendations analyze your last 7–30 days of on-demand usage before generating a recommendation.
- **AWS Organizations with consolidated billing** allows the "pay less when you use more" volume discounts to aggregate across all linked accounts — a company with 20 separate AWS accounts may achieve S3 or data transfer tier thresholds faster as an Organization than any individual account could reach on its own.

## Exam Traps

**Trap 1: Confusing volume discounts with reservation discounts.** The "pay less when you use more" principle (tiered pricing) and the "pay less when you reserve" principle (Savings Plans and Reserved Instances) are two separate mechanisms. Volume discounts apply automatically based on how much you use in a billing period. Reservation discounts require an explicit 1- or 3-year purchase commitment. Exam questions may present answer choices that mix these up — understand they are distinct concepts with different triggers and mechanics.

**Trap 2: Assuming data transfer into AWS costs money.** Data transferred INTO AWS from the internet is free for virtually all services. Data transfer OUT to the internet is what carries a per-GB charge. This asymmetry is specifically tested — a question describing a company uploading 10 TB to S3 and asking whether there is a transfer charge has one answer: the upload is free, and downloads served to users are charged.

**Trap 3: Thinking EBS bills for actual data written.** Amazon EBS bills for provisioned capacity — the total size of the volume you created — regardless of how much data is actually written to it. A 1 TB EBS volume with 50 GB of data costs the same monthly as a 1 TB volume filled to capacity. Students who confuse this with S3 (which bills only for actual bytes stored) will answer cost estimation questions incorrectly.

**Trap 4: Believing AWS pricing is uniform across all Regions.** Pricing varies by Region. Some Regions (particularly newer or geographically isolated ones) charge 15–30% more for the same EC2 instance type than us-east-1. The exam does not require memorizing specific price differences, but you must know that Region selection affects cost — not just latency.

**Trap 5: Thinking the AWS Pricing Calculator shows your actual account charges.** The Pricing Calculator at calculator.aws is a public, pre-deployment estimation tool. It has zero connection to any AWS account and cannot see existing resources, current spending, or historical bills. For analyzing actual past spending, use Cost Explorer or the Billing Dashboard. For estimating the cost of a planned architecture, use the Pricing Calculator.

## Summary

- AWS pricing rests on three principles: pay for what you use (no idle waste, billing stops when resources stop), pay less when you use more (automatic volume discounts at higher usage tiers), and pay less when you reserve (30–72% discounts via Savings Plans or Reserved Instances for 1- or 3-year commitments).
- The three main cost dimensions are compute (EC2 billed per second with a 60-second minimum, Lambda billed per request and per GB-second of execution), storage (EBS billed by provisioned size, S3 billed by actual bytes stored), and data transfer (inbound to AWS is free, outbound to the internet is charged per GB).
- Data transfer into AWS is free; data transfer out to the internet is charged — this asymmetry is one of the most important billing facts for both architects and exam takers and appears repeatedly on CLF-C02.
- EBS charges for the provisioned volume size, not the amount of data written — a 500 GB volume with 20 GB of data costs the same each month as a 500 GB volume that is completely full.
- The AWS Billing Dashboard Bills page shows current-month charges itemized by service, Region, and usage type — it is the first place to investigate when a charge appears that you do not recognize.
- The AWS Pricing Calculator at calculator.aws estimates the cost of planned architectures before deployment — no account needed, and results can be saved and shared as a unique URL for budget reviews and architectural trade-off comparisons.

## Examples

A university student creates their first AWS account to host a personal portfolio website. They store static HTML, CSS, and image files in an S3 bucket, enable S3 Static Website Hosting, and the site goes live. In the first month, they store 180 MB of files and receive roughly 600 page visits. Their bill: approximately $0.004 for storage plus fractions of a cent for GET requests. Data transfer out for 600 small page loads totals less than 100 MB — negligible cost. There was no server to provision, no capacity to reserve, no idle cost between visits. This is the pay-for-what-you-use principle at its most literal: the student paid for exactly the bytes they stored and served, nothing more.

A mid-sized SaaS company runs a customer analytics platform where users export large CSV files — sometimes 400–600 MB — on demand. After two months, the team notices that data transfer charges are growing three times faster than their user count. They open the Billing Dashboard, click "Bills," expand "Amazon EC2," and find "DataTransfer-Out-Bytes" as the third-largest line item. Investigation reveals that every export request pulls raw data directly from S3 and streams it to the user's browser — full 500 MB per download, every time, even for the same file downloaded repeatedly. The fix: implement Amazon CloudFront in front of S3. CloudFront caches frequently-downloaded exports at edge locations. The first download incurs origin transfer; subsequent downloads are served from cache at lower per-GB egress rates. Before making the change, the team builds a comparison estimate in the Pricing Calculator, modeling current S3-direct costs against projected CloudFront costs at the same traffic volume. The calculator confirms a 38% reduction in transfer costs. The change is approved in a budget review meeting based on the calculator output, before a single line of code is written.

A global media company stores 2.4 petabytes of video content and serves tens of millions of concurrent streams worldwide. Their data transfer out bill is the single largest line item on their monthly AWS invoice. The cloud finance team builds an Amazon Athena environment over their Cost and Usage Report, writing SQL queries that group transfer charges by CloudFront distribution, origin S3 bucket, and geography. The analysis reveals that 28% of their total data transfer cost comes from a single geography where viewership is high but subscription revenue is low — meaning the cost-to-revenue ratio for that market is significantly worse than others. This data becomes the foundation of a negotiation with their AWS enterprise account team for a custom pricing agreement on data transfer in that Region. Without the CUR-based analysis, they would have had no quantitative basis for the negotiation. The "pay less when you use more" principle applies to them in its most direct form: as one of AWS's largest media customers, their committed volume earns reduced per-GB rates that reflect exactly the underlying logic AWS built into its pricing model from the start.

## Think About It

1. AWS charges for data transfer out but not data transfer in. If you were designing a global content distribution strategy for a streaming media service, how would this pricing asymmetry influence your decisions about where to store original content, where to cache it, and how to route delivery to users in different countries?
2. EBS bills for provisioned volume size while S3 bills for actual data stored. If you were writing an AWS cost governance policy for a 60-person engineering team, what specific rules would you establish around EBS volume provisioning to prevent waste at scale — and how would you enforce those rules automatically?
3. Volume discounts for S3 apply automatically as usage grows within a billing period. AWS Organizations can pool usage across accounts to reach discount thresholds faster. What governance trade-offs come with consolidating many independent teams under a single AWS Organization just to capture volume discounts — and is cost savings always worth the consolidation?
4. The AWS Pricing Calculator allows you to model costs before building. But what types of costs does it systematically underestimate — what usage behaviors do engineers commonly forget to account for when building a pre-deployment estimate?
5. AWS has reduced prices more than 100 times since 2006. If you were signing a 3-year Savings Plan commitment today, how would the possibility of future price reductions factor into your decision — and what would make you choose a 1-year term over a 3-year term?

## Quick Check

**Q1.** Which of the following best describes the AWS "pay less when you reserve" pricing principle?

- A) AWS automatically charges you less as your data transfer volume increases each month
- B) Committing to 1 or 3 years of compute usage through Reserved Instances or Savings Plans earns 30–72% discounts off on-demand rates
- C) AWS reduces your bill after 12 months as a loyalty reward
- D) Storing data in S3 for longer than 30 days triggers a lower per-GB rate automatically

**Answer: B** — The "pay less when you reserve" principle is specifically about upfront time commitment to capacity in exchange for discounts. Volume discounts (option A) represent the separate "pay less when you use more" principle. Options C and D describe features that do not exist in AWS billing.

**Q2.** A company copies 50 TB of data from their on-premises data center into Amazon S3 over the internet, then serves 8 TB of that data to end users as file downloads from S3. Which portion of this scenario incurs a data transfer charge?

- A) The 50 TB upload from on-premises to S3
- B) The 8 TB download from S3 to end users on the internet
- C) Both the upload and the download
- D) Neither — all S3 data transfer is free

**Answer: B** — Data transfer into AWS (inbound) is free. Data transfer out from AWS to internet users is charged per GB. The 50 TB upload incurs no transfer fee. The 8 TB served to end users does incur an outbound transfer charge.

**Q3.** A team provisions a 2 TB Amazon EBS volume for a database server. After six months, the database contains 180 GB of actual data. How much EBS storage has the team been billed for each month?

- A) 180 GB — EBS bills for actual data stored on the volume
- B) 2,048 GB — EBS bills for the provisioned volume size regardless of occupancy
- C) 1,114 GB — EBS bills for the average of provisioned and used capacity
- D) Nothing — EBS storage is included free with any running EC2 instance

**Answer: B** — Amazon EBS bills for provisioned capacity, not used capacity. The team has paid for 2,048 GB (2 TB) of EBS storage every month from the moment the volume was created, regardless of how much data is actually written to it.

## What's Next

Next up: the AWS Free Tier — three distinct offer types, how the 750-hour EC2 monthly limit actually works when you run more than one instance simultaneously, and the specific behaviors that generate unexpected charges for new accounts even within the free tier window.
