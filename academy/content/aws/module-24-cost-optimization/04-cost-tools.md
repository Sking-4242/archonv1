---
title: "AWS Cost Management Tools in Depth"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "CLF-C02"]
---

# AWS Cost Management Tools in Depth

## Overview

Effective cost management requires the right tooling. This lesson covers the full suite of AWS cost management tools and how to use them together for visibility, alerting, optimization, and governance.

## Cost Explorer and Cost Anomaly Detection

Cost Explorer visualizes 12 months of historical spend and 12 months of forecast. Granularity from hourly to monthly. Filter by service, region, account, usage type, tag. Rightsizing Recommendations tab identifies EC2 instances with low average CPU (< 40%) and recommends a smaller instance type. Cost Anomaly Detection uses ML to detect unusual spend spikes (compared to historical baseline) and sends SNS alerts. Enable anomaly detection for each service separately — RDS, EC2, Lambda, S3 — to catch cost surprises before month-end.

## AWS Budgets

Create budgets for: total monthly spend (alert at 80% of budget), per-service spend, Savings Plan utilization (alert when you're underusing a commitment), RI utilization. Budget alerts go to SNS and email. Budgets Actions can automatically apply SCPs or IAM policies when a budget threshold is breached — for example, deny all resource creation if the account exceeds a spend limit. Use Budgets at the account level and as part of your AWS Organizations multi-account strategy.

## Cost and Usage Report (CUR)

CUR is the most granular billing data — every line item for every AWS service, delivered daily to S3 in CSV or Parquet format, queryable with Athena. CUR includes resource IDs, usage types, pricing, and tag values. Use Athena queries to: calculate cost per team (by tag), identify the top 10 most expensive S3 buckets by storage, compare actual RI usage vs. committed capacity. CUR is the source of truth for FinOps analysis — everything Cost Explorer shows is derived from CUR.

## AWS Organizations and Consolidated Billing

Organizations consolidates billing across multiple accounts — one bill, one payment. Savings Plans and Reserved Instances purchased in the management account apply to all member accounts' matching usage (sharing discounts). Volume discounts (for S3, data transfer) aggregate across all accounts. Enable cost allocation tags at the organization level so tags from member accounts appear in the consolidated CUR. Use Service Control Policies to prevent member accounts from disabling billing features like Cost Explorer or tag policies.

## Summary

Cost Explorer for visualization and rightsizing. Cost Anomaly Detection for unexpected spikes. Budgets for proactive thresholds and spend governance. CUR for granular FinOps analysis with Athena. Organizations for consolidated billing with shared RI/SP discounts. Together these tools provide full-stack cost visibility from real-time anomaly detection to monthly executive reporting.

## What's Next

Next up: the Module 24 Canvas Lab — identify and fix cost optimization gaps in an existing architecture.