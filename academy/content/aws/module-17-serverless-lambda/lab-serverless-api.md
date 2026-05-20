---
title: "Canvas Lab: Serverless API Architecture"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: open
---

# Canvas Lab: Serverless API Architecture

## Challenge

Design a complete serverless API backend for a task management application. The API needs: user authentication, CRUD operations on tasks (stored in DynamoDB), an async notification system (email when a task is assigned), and an admin-only reporting endpoint. The architecture must scale from 0 to 10,000 requests/minute without any manual scaling intervention, with per-invocation billing.

## Learning Objectives

- Design the API layer with appropriate authentication for user vs. admin endpoints
- Use DynamoDB with appropriate table design for task operations
- Implement async email notification without blocking the API response
- Keep the architecture stateless and horizontally scalable

## Steps

1. Drag an Amazon Cognito User Pool (with admin group) onto the canvas for authentication
2. Add an API Gateway HTTP API with Cognito JWT authorizer
3. Create Lambda functions: GetTasks, CreateTask, UpdateTask, DeleteTask, AdminReport
4. Connect each Lambda to API Gateway with appropriate routes (GET /tasks, POST /tasks, etc.)
5. Add a DynamoDB table with userId as partition key, taskId as sort key; add a GSI on assignedTo for lookup by assignee
6. Connect each CRUD Lambda to DynamoDB with an IAM role using least-privilege permissions (specific table ARN only)
7. For AdminReport Lambda: configure Cognito authorizer to require admin group membership
8. Add an SNS topic 'task-notifications'; when CreateTask/UpdateTask Lambda assigns a task, publish to SNS
9. Add an SES or Lambda subscriber to SNS to send the email
10. Add RDS Proxy (optional if using relational backend) or annotate why DynamoDB is preferable here
11. Annotate the scaling model: API Gateway → Lambda scales to concurrency limit, DynamoDB On-Demand scales automatically

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.