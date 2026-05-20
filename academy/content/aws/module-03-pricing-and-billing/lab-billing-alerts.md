---
title: "Lab: Set Up Billing Alerts and Explore Cost Explorer"
type: canvas
estimated_minutes: 20
cert_tags: ["aws_ccp"]
---

# Lab: Set Up Billing Alerts and Explore Cost Explorer

## Challenge

In this lab you'll set up the billing safety net every AWS account should have: a billing alarm and a budget. You'll also activate Cost Explorer and explore your account's cost breakdown. These controls protect you from unexpected charges during labs and in production.

## Learning Objectives

- Enable billing alerts and create a CloudWatch billing alarm
- Create an AWS Budget with an email alert
- Activate Cost Explorer and explore the cost breakdown dashboard
- Understand the difference between a billing alarm and a budget

## Steps

1. Log in as your IAM admin user (not root) and navigate to the Billing console
2. Go to Billing Preferences → enable 'Receive Billing Alerts' and 'Receive Free Tier Usage Alerts'
3. Navigate to CloudWatch → Alarms → Create Alarm → select metric 'Billing / Total Estimated Charge'
4. Set the threshold to $10 (or your comfort level) and configure an SNS topic to send email to your address
5. Return to the Billing console → AWS Budgets → Create Budget → choose 'Cost Budget'
6. Set the budgeted amount to $20/month and add an alert at 80% actual and 100% forecasted
7. Navigate to Cost Explorer (may need to enable it first) and click 'Launch Cost Explorer'
8. Explore the default view: cost by service over the past month. Note which services, if any, have costs
9. Change the grouping to 'Region' and then to 'Usage Type' to understand the dimensions
10. Open the Archon canvas and diagram the billing monitoring setup: billing alarm → CloudWatch → SNS → email

## Archon Canvas Lab

Open the Archon canvas to diagram the architecture you built or will build in this lab. Use the Archon component library to place and connect AWS services. Label each resource with its configuration details.
