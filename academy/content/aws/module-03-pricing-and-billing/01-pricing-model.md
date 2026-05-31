---
title: "AWS Pricing Model"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp"]
---

# AWS Pricing Model

## Overview

AWS pricing is based on three fundamental principles: pay for what you use, pay less when you reserve, and pay less when AWS grows. These principles underpin every pricing model across all AWS services, from the most basic S3 storage to the most complex machine learning services.

Understanding these principles — and the specific pricing dimensions of compute, storage, and data transfer — is a core CCP exam topic and essential for real-world cost management.

## The Three Pricing Fundamentals

**Pay for what you use:** You're billed for exactly the resources you consume, with no minimum fees (for most services). An EC2 instance running for 30 minutes costs exactly half of one hour's rate. An S3 bucket with no objects stored costs nothing for storage (though API calls have minimal fees).

**Pay less when you reserve:** Committing to use a resource for one or three years (Reserved Instances, Savings Plans) yields discounts of 30–72% compared to on-demand pricing. The trade-off is commitment — you pay for the reservation whether you use it or not.

**Pay less as AWS grows:** AWS's economies of scale are passed on to customers through price reductions. AWS has lowered prices over 100 times since 2006. As compute hardware gets cheaper and AWS becomes more efficient, costs decrease over time — a rare arrangement where your costs may drop without any action on your part.

## The Three Pillars of AWS Costs

Most AWS bills can be explained by three cost dimensions:

**Compute:** Priced per hour or per second (EC2, Lambda, Fargate, ECS). The rate depends on instance type, Region, and pricing model. Lambda is priced per request and per GB-second of execution.

**Storage:** Priced per GB per month (S3, EBS, EFS, Glacier). Different storage classes have different rates. EBS is priced by provisioned capacity, not used capacity — you pay for the volume size you requested.

**Data transfer out:** Data transferred from AWS to the internet (or between Regions) is charged per GB. Data transferred into AWS (inbound) is typically free. Data transfer within a Region between AZs has a small per-GB charge. This is why architects keep compute and data in the same Region and minimize cross-Region traffic.

## AWS Pricing Calculator

The AWS Pricing Calculator (calculator.aws) lets you estimate the cost of a specific architecture before building it. You add services, configure them with your expected usage, and get a monthly estimate.

The calculator is useful for: pre-project budgeting, comparing architecture options by cost, producing TCO analyses, and creating cost estimates for stakeholder presentations. It's also a great learning tool — exploring the pricing configuration of each service teaches you what drives cost for that service.

For the CCP exam, you don't need to memorize specific prices (they change). You do need to understand the pricing model (on-demand vs. reserved vs. spot), what dimensions drive cost (compute hours, storage GB, data transfer GB), and what tools are available for cost management.

## Summary

AWS pricing is built on three principles: pay for what you use, pay less when you reserve, and pay less as AWS grows. The three main cost drivers are compute (per hour/second), storage (per GB/month), and data transfer out (per GB). Use the AWS Pricing Calculator to estimate costs before building, and use Cost Explorer to understand costs after building.

## Examples

A small e-commerce startup launches its first online store on AWS. They use S3 for product images, EC2 for the web tier, and RDS for the database — paying only for what they consume each month. In the first month, with minimal traffic, their bill is under $50. This is the pay-for-what-you-use principle in action: no upfront infrastructure purchase, no idle server costs, and no minimum commitment.

A mid-sized SaaS company has a stable customer base and predictable monthly active users. Their application tier runs 10 EC2 instances around the clock. By purchasing Savings Plans for that baseline capacity, they lock in a 40% discount over on-demand pricing. They still use on-demand instances to handle occasional traffic spikes above that baseline — blending models to optimize cost without sacrificing flexibility.

A global media streaming company notices that AWS has quietly reduced data transfer pricing for their primary Region — without any action on their part, their monthly bill dropped by 8%. This is the pay-less-as-AWS-grows principle at work. Unlike traditional data center contracts, customers automatically benefit from AWS's efficiency gains over time. This dynamic rewards long-term customers and raises an interesting architectural question: should you optimize aggressively today, or wait for AWS price reductions to do some of the work for you?

## Think About It

1. AWS says data transfer into the cloud is free, but data transfer out is not. Why might AWS structure pricing this way, and what architectural decisions does this incentivize?
2. EBS charges for provisioned capacity, not used capacity. If a team provisions a 1 TB volume but only uses 50 GB, they pay for 1 TB. What organizational habits or processes could prevent this kind of waste at scale?
3. AWS has reduced prices over 100 times since 2006. If you were signing a 3-year Reserved Instance contract today, how would the possibility of future price reductions affect your decision?
4. The AWS Pricing Calculator estimates cost before you build. What are its limitations — what costs might it underestimate, and why?
5. If compute, storage, and data transfer are the three pillars of AWS cost, which one do you think surprises new AWS users the most, and why?

## Quick Check

**Q1.** Which of the following best describes the "pay less when you reserve" principle?
- A) AWS automatically reduces your bill when you use fewer resources
- B) Committing to 1 or 3 years of usage results in discounts of 30–72% off on-demand rates
- C) AWS charges less per GB as your total storage increases
- D) Inbound data transfer is free

**Answer: B** — Reserving capacity for 1 or 3 years (via Reserved Instances or Savings Plans) earns significant discounts in exchange for the usage commitment.

**Q2.** A company transfers 10 TB of data from their S3 bucket to users on the internet. Which cost dimension does this charge fall under?
- A) Compute
- B) Storage
- C) Data transfer out
- D) API requests

**Answer: C** — Sending data from AWS to the internet is billed as data transfer out, charged per GB, and is one of the most commonly underestimated cost drivers.

**Q3.** What is the primary purpose of the AWS Pricing Calculator?
- A) Analyzing historical spending on your AWS account
- B) Setting alerts when your monthly bill exceeds a threshold
- C) Estimating the expected cost of a planned architecture before you build it
- D) Recommending Reserved Instance purchases based on usage history

**Answer: C** — The AWS Pricing Calculator (calculator.aws) is a pre-build estimation tool; Cost Explorer and AWS Budgets handle post-build cost tracking and alerting.

## What's Next

Next: The AWS Free Tier — what's included, for how long, and how to use it to learn AWS without incurring charges.
