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

## What's Next

Next: On-Demand, Reserved, and Spot pricing models — the three ways to pay for EC2 compute, and how to choose the right model for different workload types.
