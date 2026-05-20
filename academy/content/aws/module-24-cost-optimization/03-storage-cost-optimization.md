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

## What's Next

Next up: the Module 24 Canvas Lab — cost optimization review of an existing architecture.