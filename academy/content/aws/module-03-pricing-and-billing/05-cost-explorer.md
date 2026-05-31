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

## Examples

A SaaS startup notices their AWS bill jumped 30% in March compared to February. They open Cost Explorer, group by service, and immediately see that data transfer costs tripled. Drilling down by usage type, they discover that an engineer had changed a configuration to route internal API calls between two Regions rather than within a single Region, adding per-GB cross-Region transfer charges on every request. Without Cost Explorer's service-level and usage-type breakdown, this would have been nearly impossible to identify from the billing summary alone. Cost Explorer turned a mystery into a five-minute diagnosis.

A cloud operations team at a retail company sets up four AWS Budgets: a monthly cost budget at $20,000 with alerts at 80% (forecasted) and 100% (actual), a Savings Plans utilization budget that alerts when coverage drops below 80%, and a per-service usage budget on EC2 that catches runaway instances. When a developer accidentally leaves a cluster of GPU instances running over a holiday weekend, the cost budget's 80% forecasted alert fires on Friday afternoon — giving the ops team time to investigate and shut down the instances before the weekend ends, saving thousands of dollars. Budgets caught the problem before it became the bill.

A data analytics company needs to understand exactly what AWS costs are attributable to each customer they serve. They enable detailed tagging — every resource is tagged with customer_id, environment, and team — then configure the Cost and Usage Report to land hourly data in S3. A data engineering team uses Amazon Athena to query this data with SQL, producing per-customer cost breakdowns that feed directly into their billing system. No other AWS tool provides the granularity to do this: the CUR is the only source that exposes line-item resource-level data with custom tag dimensions. Cost Explorer gives them the summary; CUR gives them the truth.

## Think About It

1. Cost Explorer retains 13 months of historical data and includes forecasting based on trends. What are the limitations of that forecast — what real-world events or decisions could make the forecast significantly wrong, and how should you account for that uncertainty?
2. AWS Budgets can trigger SNS topics, which can invoke Lambda functions that automatically stop non-essential instances when a budget threshold is crossed. What are the risks of automated cost remediation, and what safeguards would you put in place before enabling it in a production account?
3. Cost Explorer's rightsizing recommendations identify over-provisioned EC2 instances. Why might an engineering team resist downsizing an instance even when the data clearly shows it is under-utilized — and how would you address those objections?
4. The Cost and Usage Report is described as the "source of truth" for billing data. If Cost Explorer shows $12,340 for a month and a custom Athena query on the CUR shows $12,298, which number would you trust and why?
5. Many organizations only look at their AWS bill after it arrives. How would a proactive cost management strategy using Budgets, tagging, and Cost Explorer change the organizational dynamics around cloud spending — and who in the organization would need to change their behavior?

## Quick Check

**Q1.** Which AWS tool provides proactive alerts when forecasted spending is on track to exceed a defined threshold before the end of the billing period?
- A) AWS Cost Explorer
- B) AWS Cost and Usage Report
- C) AWS Budgets
- D) AWS Trusted Advisor

**Answer: C** — AWS Budgets is the proactive tool: it monitors both actual and forecasted costs and sends alerts via email or SNS when thresholds are crossed, even before charges are finalized.

**Q2.** A company wants line-item billing data for every resource, tagged by team and project, loaded into Amazon Athena for SQL analysis. Which AWS feature should they configure?
- A) Cost Explorer with resource-level granularity
- B) AWS Cost and Usage Report (CUR) delivered to S3
- C) AWS Budgets with usage alerts
- D) AWS Trusted Advisor cost optimization checks

**Answer: B** — The Cost and Usage Report (CUR) is the only source of complete, line-item billing data with tag dimensions, and it is delivered to S3 for querying with Athena, Redshift, or similar tools.

**Q3.** How long does AWS Cost Explorer retain historical cost and usage data?
- A) 3 months
- B) 6 months
- C) 13 months
- D) Indefinitely

**Answer: C** — Cost Explorer retains up to 13 months of historical data, enabling year-over-year comparisons and trend analysis across a full fiscal year plus one additional month.

## What's Next

This completes the theory for Module 3. The lab will walk you through setting up a billing alarm in CloudWatch and exploring Cost Explorer to understand AWS spending patterns.
