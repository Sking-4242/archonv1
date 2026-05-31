---
title: "Pillar: Cost Optimization"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp", "aws_saa", "aws_sap"]
---

# Pillar: Cost Optimization

## Overview

The Cost Optimization pillar focuses on avoiding unnecessary costs and getting the best value from cloud spending. It's not about spending as little as possible — it's about understanding where every dollar goes and ensuring it delivers proportional value.

## Cost Optimization Principles

**Implement Cloud Financial Management:** Establish cost ownership across teams. Use tagging to attribute costs. Create budgets and enforce them. Treat cost optimization as an ongoing practice, not a one-time project. **Adopt a consumption model:** Pay only for what you use. Turn off development environments on weekends. Use Lambda and Fargate to eliminate idle compute. **Measure overall efficiency:** Track cost per unit of value delivered (cost per request, cost per user, cost per transaction) — not just total spend. **Stop spending money on undifferentiated heavy lifting:** Every hour spent managing infrastructure is an hour not spent on your product. Managed services shift that work to AWS. **Analyze and attribute expenditure:** Use Cost Explorer, CUR, and tagging to understand spending at team, environment, and service granularity.

## Cost Optimization Levers

The most impactful cost levers: **Rightsizing** (match instance size to actual utilization — Compute Optimizer helps here), **Reserved Instances / Savings Plans** (30–72% discount for 1-3 year commitments on predictable workloads), **Spot Instances** (60–90% savings for fault-tolerant workloads), **Storage optimization** (lifecycle policies to move data to cheaper S3 storage classes, delete unattached EBS volumes, clean up old snapshots), **Data transfer optimization** (keep compute and data in the same AZ/Region, use CloudFront to reduce origin egress, use VPC endpoints for AWS service traffic).

## Summary

Cost Optimization requires understanding every dollar (tagging, CUR, Cost Explorer), matching spend to value (consumption model, serverless), and systematically applying savings mechanisms (Savings Plans, Spot, rightsizing, storage lifecycle). It's an ongoing practice — cloud costs without active management tend to grow unchecked.

## Examples

A software company running a large development and testing environment discovered they were spending $18,000 per month on EC2 instances that sat idle every night and weekend. Their developers worked standard business hours, but the instances ran 24/7. By implementing an AWS Lambda function triggered by a CloudWatch Events schedule to stop instances at 7pm and start them at 8am Monday through Friday, they reduced their dev/test compute bill by 65% with a one-time engineering effort of about four hours. This is the consumption model principle: pay only for what you actually use.

A media company doing a cost review found that their S3 storage bill had grown from $4,000 to $19,000 per month over two years. Investigation revealed that raw video upload files — kept for post-processing — were never being cleaned up after processing completed. Worse, all objects were stored in S3 Standard regardless of access frequency. They implemented S3 Lifecycle policies to transition objects older than 30 days to S3 Standard-IA and delete raw uploads 90 days after processing confirmation. Within three billing cycles, the bill dropped to $6,000 per month. Tagging and Cost Explorer made the problem visible; Lifecycle policies fixed it.

A financial technology company had a predictable baseline workload running on EC2 and RDS that consumed roughly consistent capacity 24/7. Their on-demand bill was $120,000 per month. After analyzing 12 months of Cost Explorer data to establish their steady-state baseline, they purchased a mix of Savings Plans (covering 70% of EC2 usage at a 40% discount) and Reserved Instances (covering their RDS instances at a 38% discount), while keeping 30% of EC2 on-demand for variable capacity. The result was a $47,000 monthly reduction with no architectural changes. The lesson: commitment-based discounts deliver the highest ROI for stable, predictable workloads — but require understanding your actual usage pattern first.

## Think About It

1. The pillar says to measure "cost per unit of value" (cost per transaction, cost per user) rather than just total spend. Why is this a more useful metric, and what does it reveal that absolute spend figures hide?
2. Savings Plans and Reserved Instances offer 30–72% discounts in exchange for 1–3 year commitments. What information would you need before making a commitment, and what is the risk of over-committing?
3. Tagging is the foundation of cost attribution — without tags, you can't tell which team or product is generating which costs. What organizational challenges make consistent tagging hard to enforce, and how would you address them?
4. An engineering team argues that the time spent optimizing cloud costs is itself a cost — engineer time is expensive. How would you build a framework for deciding when cost optimization work has positive ROI versus when it's not worth the effort?
5. Spot Instances can be reclaimed by AWS with two minutes' notice. What architectural patterns make a workload suitable for Spot, and what makes it unsuitable?

## Quick Check

**Q1.** Which purchasing model offers the largest discounts (up to 90%) on EC2 compute but requires the workload to tolerate interruption?
- A) Reserved Instances
- B) Savings Plans
- C) Spot Instances
- D) Dedicated Hosts

**Answer: C** — Spot Instances use spare EC2 capacity and can be reclaimed by AWS with a 2-minute warning; in exchange, they offer 60–90% discounts — making them ideal for fault-tolerant workloads like batch processing, CI/CD, and stateless web tiers.

**Q2.** A team wants to understand exactly which of their five product lines is generating the most AWS spend. Which AWS capability is the prerequisite for this analysis?
- A) Enabling AWS Cost Explorer
- B) Consistent resource tagging by product line
- C) Purchasing a Business Support plan
- D) Enabling AWS Trusted Advisor

**Answer: B** — Cost Explorer can filter and group costs by tag, but only if resources have been consistently tagged. Without tagging, costs appear as an undifferentiated total that cannot be attributed to specific teams, products, or environments.

**Q3.** AWS Savings Plans differ from Reserved Instances in which key way?
- A) Savings Plans are more expensive than Reserved Instances
- B) Savings Plans apply only to RDS, whereas Reserved Instances apply to EC2
- C) Savings Plans commit to a dollar-per-hour spend level and apply flexibly across instance families, sizes, and regions, rather than to a specific instance configuration
- D) Savings Plans require a 3-year minimum commitment while Reserved Instances offer 1-year terms

**Answer: C** — Savings Plans offer flexibility by committing to a spend rate (e.g., $10/hr) that applies across any EC2 instance family, size, OS, or region within the plan scope — unlike Reserved Instances, which are tied to a specific instance type and region.

## What's Next

Next: Sustainability — the sixth pillar, added in 2021, focusing on environmental impact of cloud workloads.
