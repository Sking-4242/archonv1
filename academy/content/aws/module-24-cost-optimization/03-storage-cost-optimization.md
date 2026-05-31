---
title: "Storage Cost Optimization"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Storage Cost Optimization

## Overview

Storage costs are often the second-largest AWS cost after compute. S3 lifecycle policies, EBS right-sizing, and eliminating data transfer costs are the key levers for storage cost optimization.

## S3 Cost Optimization

S3 storage cost is dominated by storage class choice and data volume. Use S3 Intelligent-Tiering for objects where access patterns are unknown — automatically moves data to cheaper tiers after 30 days of no access. Use S3 Analytics to study access patterns and identify which prefixes should have lifecycle policies. Set lifecycle rules: transition to Standard-IA after 30 days, Glacier after 90 days, delete after your retention requirement. Delete incomplete multipart uploads with a lifecycle rule — they accumulate invisibly and cost the same as full objects.

## EBS Cost Optimization

EBS costs include: storage per GB, IOPS (for io1/io2), and snapshots. Right-size: use gp3 instead of gp2 (same performance, 20% cheaper). Enable Storage Auto Scaling on RDS to avoid over-provisioning. Delete unattached EBS volumes (volumes that exist without an EC2 attachment are common waste — identify with Cost Explorer or Trusted Advisor). Implement snapshot lifecycle policies with DLM to delete old snapshots. Snapshots are incremental, but 50 snapshots of a database that was modified frequently accumulates significant cost.

## Data Transfer Cost Optimization

AWS charges for data egress (leaving AWS to the internet), cross-region data transfer, and cross-AZ data transfer. Minimize egress: use CloudFront CDN to cache and serve content from edge locations (CloudFront prices are lower than direct EC2/ALB egress at scale). Use S3 Gateway Endpoints to eliminate NAT Gateway charges for S3 traffic from VPC. Architect services in the same AZ to avoid cross-AZ transfer charges within the same region (though cross-AZ redundancy is worth the cost for HA). Analyze data transfer costs in the Cost and Usage Report by filtering for `DataTransfer-Out-Bytes` usage type.

## Database Cost Optimization

RDS: use Aurora Serverless v2 for variable workloads (scales to zero during idle). Rightsize DB instance class — most databases are CPU-underutilized. Use RDS storage auto-scaling to avoid over-provisioning. Delete dev/test databases outside business hours with Lambda + EventBridge scheduled actions (stop/start RDS). DynamoDB: use On-Demand capacity for spiky workloads, Provisioned + Auto Scaling for predictable workloads. Set TTL on DynamoDB items to auto-expire data and reduce storage cost.

## Summary

S3: Intelligent-Tiering + lifecycle rules + delete incomplete multipart uploads. EBS: gp3, right-size, delete unattached volumes, snapshot lifecycle. Data transfer: CloudFront for egress, S3 Gateway Endpoints for VPC-to-S3. Database: Aurora Serverless for variable load, stop dev/test databases overnight, DynamoDB TTL for auto-expiration. Storage cost optimization is primarily lifecycle discipline — build lifecycle policies into your architecture from day one.

## Examples

A digital marketing agency stores client campaign assets — images, videos, PDFs — in S3 Standard. Most assets are accessed heavily in the first two weeks after upload, then almost never again. By enabling S3 Intelligent-Tiering on their assets bucket, objects that go 30 days without access automatically move to a cheaper tier with no manual lifecycle rule authoring required. Within three months, 80% of their stored data has moved to lower-cost tiers, cutting their S3 storage bill nearly in half with no change to how applications retrieve files.

A software company has been running EBS gp2 volumes on their EC2 application fleet for three years. A platform engineer reviews the Cost and Usage Report and notices they are paying for provisioned IOPS they are not using — gp2 volumes are sized for performance headroom that never materializes. By migrating to gp3 volumes (which separate storage capacity from IOPS provisioning and cost 20% less per GB), they save $3,200/month. They also run a Trusted Advisor scan that surfaces 14 unattached EBS volumes — remnants of terminated instances — and delete them for an additional $800/month in savings.

A global SaaS company streams application logs from EC2 instances inside a VPC to an S3 bucket for long-term analysis. Initially this traffic flows through a NAT Gateway, incurring NAT Gateway processing charges on top of data transfer costs. An architect adds an S3 Gateway Endpoint to the VPC — a free resource that routes S3 traffic directly from the VPC to S3 without transiting the NAT Gateway. The change eliminates approximately $1,200/month in NAT Gateway charges with a single Terraform resource addition. This is a classic hidden cost that only surfaces when you read the CUR `DataTransfer` usage type lines carefully.

## Think About It

1. S3 Intelligent-Tiering charges a small monthly monitoring fee per object. At what object size or access pattern does Intelligent-Tiering stop being cost-effective compared to a manually configured lifecycle policy? How would you calculate the break-even point?
2. Your team is told to "delete old EBS snapshots to save money." What information would you need before you could safely delete a snapshot, and what could go wrong if you deleted the wrong one?
3. Why does AWS charge for cross-AZ data transfer but not for traffic within the same AZ? What architectural tension does this create when you are designing for both high availability and cost efficiency?
4. A development team wants to run their RDS test database 24/7 so they are "always ready to test." What is the cost argument against this, and what alternative approach achieves the same goal at a fraction of the cost?
5. What trade-offs would you consider when deciding whether to use DynamoDB On-Demand capacity mode versus Provisioned capacity with Auto Scaling for a workload that has sharp but predictable daily traffic spikes?

## Quick Check

**Q1.** A company stores millions of objects in S3 but does not know which objects are accessed frequently and which are rarely accessed. Which S3 feature best handles automatic cost optimization for this scenario?
- A) S3 Standard-IA with a manual lifecycle rule after 30 days
- B) S3 Intelligent-Tiering, which automatically moves objects based on observed access patterns
- C) S3 Glacier Instant Retrieval for all objects
- D) S3 Replication to a cheaper region

**Answer: B** — S3 Intelligent-Tiering is purpose-built for unknown or unpredictable access patterns, automatically moving objects between access tiers based on actual usage without requiring manual lifecycle rules or retrieval fees within the tiering system.

**Q2.** Which EBS volume type should replace gp2 volumes in most cases to achieve the same performance at lower cost?
- A) io2 Block Express
- B) st1 (Throughput Optimized HDD)
- C) gp3
- D) sc1 (Cold HDD)

**Answer: C** — gp3 volumes offer the same baseline performance as gp2 at approximately 20% lower cost per GB, and allow IOPS and throughput to be configured independently of storage size, eliminating the need to over-provision storage just to get more IOPS.

**Q3.** What is the most cost-effective way to eliminate NAT Gateway charges for EC2 instances in a private subnet that need to read and write objects in S3?
- A) Move all EC2 instances to public subnets
- B) Use a Transit Gateway to route S3 traffic
- C) Add an S3 Gateway Endpoint to the VPC
- D) Enable S3 Transfer Acceleration

**Answer: C** — An S3 Gateway Endpoint routes traffic from the VPC directly to S3 over the AWS network at no cost, bypassing the NAT Gateway entirely and eliminating NAT Gateway data processing charges for S3-bound traffic.

## What's Next

Next up: the Module 24 Canvas Lab — cost optimization review of an existing architecture.