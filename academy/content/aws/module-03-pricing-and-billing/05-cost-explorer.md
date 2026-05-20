---
title: "Cost Explorer and AWS Budgets"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp", "aws_soa"]
---

# Cost Explorer and AWS Budgets

## Overview

After understanding how AWS charges you, the next step is understanding what you're actually being charged. AWS provides a suite of cost management tools that range from historical analysis to proactive alerting. Cost Explorer and AWS Budgets are the two most important for day-to-day cost management and appear on multiple AWS exams.

## AWS Cost Explorer

Cost Explorer provides a visual interface for analyzing your historical AWS costs and usage. You can view spending by service, by linked account, by tag, by Region, or by usage type. You can filter, group, and drill down to understand exactly what's driving your bill.

Key Cost Explorer features: **Cost and usage charts** (daily, monthly, quarterly views), **Resource-level granularity** (see spending per EC2 instance ID), **Rightsizing recommendations** (identifies over-provisioned EC2 instances), **Savings Plans and RI recommendations** (recommends purchase quantities and types based on your usage history), and **Forecasting** (projects future spend based on historical trends).

Cost Explorer is enabled via the Billing console and may take 24 hours to populate initial data. Once enabled, it retains up to 13 months of historical data.

## AWS Budgets

AWS Budgets lets you set cost, usage, and reservation thresholds and receive alerts when actual or forecasted spending crosses those thresholds. Unlike Cost Explorer (which is retrospective), Budgets is proactive — it warns you before your spending gets out of hand.

Budget types: **Cost budgets** (alert when spending exceeds $X), **Usage budgets** (alert when you consume more than X hours of a service), **RI utilization budgets** (alert if your Reserved Instances fall below a usage percentage), and **Savings Plans utilization budgets** (track Savings Plans coverage and utilization).

Alerts can be sent to email addresses or SNS topics, which can trigger Lambda functions for automated remediation (e.g., stopping non-essential instances when budget is exceeded).

## Cost and Usage Report (CUR)

For the most granular cost data, the AWS Cost and Usage Report (CUR) delivers hourly or daily CSV files to an S3 bucket. CUR includes line-item data for every resource across every service — more detail than Cost Explorer's UI can display.

CUR is the source of truth for advanced cost analysis. Organizations typically load CUR data into Athena for SQL-based queries or into a data warehouse like Redshift for dashboard reporting. AWS Cost Intelligence Dashboard (CID) provides pre-built QuickSight dashboards built on top of CUR data.

For the exam: CUR provides the most detailed billing data; Cost Explorer provides visual analysis; Budgets provides proactive alerts.

## Summary

Cost Explorer provides historical cost analysis with visual charts, rightsizing recommendations, and forecasting — up to 13 months of data. AWS Budgets sets cost or usage thresholds and sends alerts via email or SNS when forecasted or actual spending crosses limits. Cost and Usage Report delivers the most granular line-item billing data to S3 for advanced analysis. Use all three together for comprehensive cost management.

## What's Next

This completes the theory for Module 3. The lab will walk you through setting up a billing alarm in CloudWatch and exploring Cost Explorer to understand AWS spending patterns.
