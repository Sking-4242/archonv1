---
title: "The AWS Free Tier"
type: content
estimated_minutes: 5
cert_tags: ["aws_ccp"]
---

# The AWS Free Tier

## Overview

The AWS Free Tier lets new and existing AWS customers use many services at no charge, within defined limits. It's designed to let you explore AWS services, run small experiments, and develop applications without incurring costs during the learning and development phase.

The Free Tier is not a blanket free offering — it has specific limits per service and per account, and exceeding those limits results in charges billed to your payment method.

## Three Types of Free Tier Offers

**Always Free:** Some offers don't expire and are available to all AWS customers. Examples: AWS Lambda (1 million free requests per month), DynamoDB (25 GB of storage and 25 WCU/RCU), and CloudWatch (10 custom metrics and dashboards).

**12 Months Free:** New accounts get 12 months of free usage for specific services, starting from account creation. The most useful for learners: EC2 (750 hours/month of t2.micro or t3.micro instances), S3 (5 GB of standard storage), RDS (750 hours/month of db.t2.micro or db.t3.micro), and CloudFront (1 TB of data transfer out).

**Trials:** Short-term free trials for newer or premium services. Examples: Amazon Inspector (90 days), Amazon GuardDuty (30 days), Amazon Macie (30 days). Trials typically start when you first enable the service.

## Common Free Tier Pitfalls

Several services look free but can generate unexpected charges:

**EC2:** The free tier covers 750 hours of t2.micro/t3.micro per month across all running instances. If you run two t2.micro instances simultaneously, you consume 2 hours of free tier per hour — exhausting your 750-hour allotment in 15 days. Stop instances when not in use.

**Data transfer:** Free tier doesn't cover data transfer out in most cases. Streaming video, serving large files, or running high-traffic applications will incur transfer charges even within the 12-month window.

**RDS:** Free tier covers the instance hours but not storage snapshots beyond 20 GB. Multi-AZ RDS deployments are not free tier eligible.

**EBS:** Unattached EBS volumes still incur storage charges. Delete volumes you're not using.

## Monitoring Free Tier Usage

AWS provides free tier usage tracking in the Billing console. Go to Billing → Free Tier to see your current month's usage against limits for each service, updated daily. Set up a billing alarm (covered in the lab) to catch unexpected charges before they accumulate.

You can also enable AWS Budgets with a $0 budget threshold — it will alert you the moment any charge appears on your account, giving you time to investigate and shut down whatever caused it.

## Summary

The AWS Free Tier has three offer types: Always Free (permanent), 12 Months Free (new accounts), and Trials (service-specific). Common pitfalls include running multiple EC2 instances simultaneously, data transfer charges, and forgetting to delete EBS volumes and snapshots. Monitor free tier usage in the Billing console and set a billing alarm to catch unexpected charges.

## Examples

A university student wants to learn AWS before their cloud computing course begins. They create a new AWS account and spin up a t2.micro EC2 instance to run a personal project. Under the 12-month free tier, they get 750 hours per month — enough to run the instance continuously for the whole month. As long as they stay within the limits and remember to stop the instance when done, they pay nothing. This is the free tier functioning exactly as designed: a consequence-free learning sandbox.

A startup builds their MVP on AWS during the 12-month free tier window. They run one t2.micro EC2 instance and one db.t3.micro RDS instance simultaneously. Halfway through the month, a founder spins up a second EC2 instance for testing and forgets to stop it overnight. The next day, the billing console shows unexpected EC2 charges — because two simultaneous t2.micro instances double the hourly consumption rate, exhausting the 750-hour allotment in about 15 days. This is the most common free tier surprise: free hours are per account, not per instance.

An AWS solutions architect at a consulting firm deliberately uses the Always Free tier — specifically Lambda's 1 million free requests per month and DynamoDB's 25 GB of free storage — to prototype and demo lightweight applications for clients. Unlike the 12-month EC2 free tier, these always-free limits don't expire, making them a permanent foundation for lightweight internal tooling and proof-of-concept workloads that never graduate to production scale.

## Think About It

1. The free tier gives 750 hours of EC2 per month. A month has roughly 744 hours. What is the implicit design intention behind this — and what does it tell you about how AWS wants you to use the free tier?
2. Data transfer charges apply even within the free tier period for most services. Why do you think AWS chose not to include data transfer in the free tier, and how should this affect the types of projects you build while learning?
3. If you were designing an onboarding experience for a new AWS customer, which free tier pitfalls would you warn them about first, and how would you help them avoid unexpected charges before they happen?
4. The Always Free tier includes Lambda at 1 million requests per month and DynamoDB at 25 GB. What kinds of real production workloads could run entirely within these limits, and what would their architectural constraints be?
5. AWS Budgets lets you set a $0 alert so you're notified the instant any charge appears. Why might some developers prefer this approach over relying on the billing console's free tier usage tracker?

## Quick Check

**Q1.** Which type of AWS Free Tier offer never expires and is available to all AWS customers, not just new accounts?
- A) 12 Months Free
- B) Trials
- C) Always Free
- D) Spot Free

**Answer: C** — Always Free offers (like Lambda's 1 million requests/month and DynamoDB's 25 GB) are permanent and apply to any AWS account, not just new ones.

**Q2.** A new AWS account runs two t2.micro EC2 instances simultaneously for 20 days in a month. What happens to their free tier?
- A) They are fully covered because t2.micro is always free
- B) They consume 2 hours of free tier per hour, exhausting the 750-hour limit in about 15 days
- C) One instance is free and one is billed at full on-demand rates from day one
- D) Free tier covers unlimited t2.micro instances for 12 months

**Answer: B** — The 750 free hours per month are shared across all running instances, so two simultaneous instances burn through the allotment twice as fast.

**Q3.** Which AWS tool can alert you the moment any charge appears on a free-tier account?
- A) AWS Trusted Advisor
- B) AWS Cost Explorer
- C) AWS Budgets with a $0 threshold
- D) AWS Health Dashboard

**Answer: C** — AWS Budgets can be configured with a $0 cost threshold, triggering an email or SNS notification immediately when any billable charge appears on the account.

## What's Next

Next: On-Demand, Reserved, and Spot pricing models — the three ways to pay for EC2 compute, and how to choose the right model for different workload types.
