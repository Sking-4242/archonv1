---
title: "Canvas Lab: AI-Powered Document Processing Pipeline"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "MLS-C01"]
canvas_type: open
---

# Canvas Lab: AI-Powered Document Processing Pipeline

## Challenge

Design a serverless document processing pipeline for an insurance company. When a customer uploads a claim form PDF to S3, the pipeline must: (1) extract key fields (policy number, claim amount, incident date) using Textract, (2) detect the sentiment of the customer's written description using Comprehend, (3) classify the claim priority (low/medium/high) using a custom Comprehend classifier trained on historical claims, (4) store results in DynamoDB, and (5) route high-priority claims immediately to an SNS topic for urgent review.

## Learning Objectives

- Use AWS AI services for extraction and analysis without custom ML model training (except the custom classifier)
- Build an event-driven, serverless pipeline that processes claims as they arrive
- Route urgent claims through a separate high-priority path

## Steps

1. Create an S3 bucket: claim-uploads/ prefix with EventBridge notifications enabled
2. EventBridge rule: S3 ObjectCreated in claim-uploads/ → trigger Step Functions workflow
3. Step Functions state machine with these states:
4.   State 1: TextractAnalysis — Task using Textract AnalyzeDocument (Queries mode) to extract: policy_number, claim_amount, incident_date, customer_description
5.   State 2: SentimentAnalysis — Task invoking Lambda which calls Comprehend DetectSentiment on customer_description
6.   State 3: PriorityClassification — Task invoking Lambda which calls Comprehend custom classifier to get priority label
7.   State 4: StoreResults — Task calling DynamoDB PutItem with all extracted fields, sentiment, and priority
8.   State 5: PriorityRouter — Choice state: if priority=HIGH → SNS Publish to urgent-claims topic; else → Succeed
9. Add SNS topic: urgent-claims with email subscription to claims team
10. Add DynamoDB table: ClaimsProcessed with policyNumber as partition key, claimId as sort key
11. Annotate the IAM roles: Step Functions execution role needs permissions for all service calls; Lambda roles need Comprehend and Textract only

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.