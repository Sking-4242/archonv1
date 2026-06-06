---
title: "Canvas Lab: Cost Explorer, Budgets, and Anomaly Detection"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "CLF-C02"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: Cost Explorer, Budgets, and Anomaly Detection

## Challenge

A FinOps engineer at a growing startup needs to get control of their AWS spend. The last two months showed unexpected EC2 charges with no clear explanation. They will use Cost Explorer to identify the source of the overruns, set a monthly budget with automated enforcement, and configure Cost Anomaly Detection to catch future spikes early — before they appear on the invoice.

## Learning Objectives

- Navigate Cost Explorer to identify top cost drivers by service, region, and resource tag
- Create a monthly cost budget with SNS alerts at 80% and 100% thresholds
- Configure a Budget Action to automatically stop EC2 instances in a dev account when the budget is exhausted
- Set up a Cost Anomaly Detection monitor with a 20% deviation threshold
- Understand the difference between Budget alerts (threshold-based) and Anomaly Detection (ML-based spike detection)

## Steps

1. Open Cost Explorer → set the date range to the last 3 months → Group by: Service; identify the top 3 cost drivers
2. Change Group by to Region; note which regions are generating the most spend
3. Change Group by to Tag (key: Environment); observe untagged resources that cannot be attributed to a team or environment
4. Apply a tag filter for Environment=dev to isolate development environment costs across the 3-month window
5. Navigate to Budgets → Create budget → Budget type: Cost budget; name it `monthly-total`, period = Monthly, budgeted amount = $500, scope = All AWS services
6. Add an alert threshold at 80% of budgeted amount ($400) → Action: Send notification to a new SNS topic with your email as subscriber
7. Add a second alert threshold at 100% of budgeted amount ($500) → Action: Send notification to the same SNS topic
8. Add a Budget Action triggered at 100% actual spend: apply IAM policy `AWSBudgetsActionsRolePolicyForResourceAdministrationWithSSM` and stop all EC2 instances tagged Environment=dev
9. Review and create the budget; confirm the SNS subscription email and click the confirmation link
10. Navigate to Cost Anomaly Detection → Create monitor: monitor type = AWS service, select EC2
11. Create an alert subscription on the monitor: threshold = 20% deviation or $50 (whichever is greater), delivery = SNS email
12. Open the Anomaly Detection history panel and review any past anomalies surfaced for the account
13. Note the 24–48 hour detection delay for anomaly alerts and contrast this with the near-real-time Budget threshold alerts

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
