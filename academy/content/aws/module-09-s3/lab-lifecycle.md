---
title: "Canvas Lab: S3 Lifecycle and Storage Tiers"
type: canvas
estimated_minutes: 20
cert_tags: ["SAA-C03", "CLF-C02"]
canvas_type: open
---

# Canvas Lab: S3 Lifecycle and Storage Tiers

## Challenge

A data engineering team uploads large log files daily. Files are queried frequently for the first 30 days, occasionally for the next 60 days, and then rarely accessed but must be retained for 7 years for compliance. Design the S3 lifecycle policy and storage tier strategy that minimizes cost while meeting these requirements.

## Learning Objectives

- Map access frequency to the appropriate S3 storage class for each time window
- Configure lifecycle rules to automate transitions and final expiration
- Apply versioning and Object Lock settings appropriate for compliance retention

## Steps

1. Create an S3 bucket with versioning enabled
2. Configure Object Lock with Compliance mode and a 7-year retention period
3. Create a lifecycle rule: transition current objects to S3 Standard-IA after 30 days
4. Add a second transition: move to S3 Glacier Flexible Retrieval after 90 days
5. Set expiration for current objects at 2,555 days (7 years)
6. Add a noncurrent version expiration rule to clean up old versions after 30 days
7. Annotate the canvas with the monthly cost difference between keeping everything in Standard vs. this tiered approach

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.