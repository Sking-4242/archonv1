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

## Examples

A B2B SaaS company notices their AWS bill jumped 40% in a single week with no planned deployments. Because they had previously enabled Cost Anomaly Detection with per-service monitoring, an SNS alert fires within hours of the spike — pointing to an unusual increase in EC2 spend in `us-east-1`. The on-call engineer uses Cost Explorer to drill down by instance type and tag, discovering that a misconfigured Auto Scaling group launched hundreds of on-demand instances and never scaled back down. The anomaly detection alert converted a potential $20,000 monthly surprise into a $3,000 incident caught the same day.

A Series B startup has grown from a single AWS account to seven accounts — dev, staging, prod, security, logging, data science, and sandbox. Their finance team was receiving seven separate invoices and could not see aggregate spend trends or apply Savings Plans purchased in one account to workloads in another. By moving all accounts under AWS Organizations with consolidated billing, the management account now shares a single Compute Savings Plan across all member accounts, and their Athena queries against the consolidated CUR can report cost-per-team across the entire organization in a single query.

A large enterprise uses AWS Budgets Actions as a guardrail in their sandbox accounts. When any sandbox account exceeds $500 in a calendar month, Budgets automatically attaches a Service Control Policy that denies resource creation — effectively freezing the account until a manager manually approves additional spend. Engineers can still read and use existing resources, but cannot launch new ones. This prevents runaway experimentation costs without requiring engineering managers to manually monitor every sandbox account daily.

## Think About It

1. Cost Explorer shows you the past 12 months of spend. Cost Anomaly Detection alerts you to unexpected current-period spikes. Why do you need both, and what gap would remain if you only had one of them?
2. The Cost and Usage Report is the source of truth for all billing data, but Cost Explorer is the tool most engineers use. What are the limits of Cost Explorer that would push a FinOps team to query CUR directly with Athena?
3. AWS Budgets Actions can apply an SCP to deny resource creation when a spend threshold is breached. What could go wrong with this approach in a production account, and how would you design budget governance differently for production versus sandbox environments?
4. When Reserved Instances or Savings Plans are purchased in a management account in AWS Organizations, they automatically apply to matching usage across member accounts. What is the implication for how member account teams should think about their own purchasing decisions?
5. How would you design a tagging and CUR query strategy that lets the CFO of a company see total AWS spend broken down by product line, while simultaneously letting individual engineering team leads see only their own team's costs?

## Quick Check

**Q1.** Which AWS tool uses machine learning to detect unusual spend patterns and send alerts before the end of the billing period?
- A) AWS Budgets with a fixed threshold alert
- B) Cost Explorer rightsizing recommendations
- C) Cost Anomaly Detection
- D) Trusted Advisor cost checks

**Answer: C** — Cost Anomaly Detection uses ML to establish a baseline of normal spending behavior per service and sends alerts when spend deviates significantly from that baseline, catching surprises in near real-time rather than at month-end.

**Q2.** A company wants to automatically stop engineers from launching new resources in a test account if the account exceeds a monthly spend limit. Which AWS feature enables this enforcement?
- A) Cost Explorer budget forecasts
- B) AWS Budgets Actions, which can apply an SCP when a threshold is breached
- C) Trusted Advisor Low Utilization alerts
- D) CUR Athena queries with SNS notifications

**Answer: B** — AWS Budgets Actions can automatically apply Service Control Policies or IAM policies when a budget threshold is hit, enabling programmatic spend governance without manual intervention.

**Q3.** What is the primary advantage of querying the Cost and Usage Report (CUR) with Athena over using the Cost Explorer UI?
- A) CUR data is updated in real time, while Cost Explorer has a 24-hour delay
- B) CUR includes data that Cost Explorer does not, such as resource IDs and raw usage type detail, enabling fully custom FinOps analytics at any granularity
- C) Athena queries are cheaper than Cost Explorer API calls
- D) CUR is the only way to see Reserved Instance utilization

**Answer: B** — CUR contains every line-item billing record including resource IDs, raw usage types, and tag values at a granularity that Cost Explorer's pre-built reports cannot match, making it the foundation for custom cost allocation and FinOps analysis.

## What's Next

Next up: the Module 24 Canvas Lab — identify and fix cost optimization gaps in an existing architecture.