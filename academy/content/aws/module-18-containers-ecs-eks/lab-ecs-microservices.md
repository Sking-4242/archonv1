---
title: "Canvas Lab: ECS Fargate Microservices Architecture"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: starter
---

# Canvas Lab: ECS Fargate Microservices Architecture

## Challenge

A pre-configured VPC with public and private subnets, an ECR repository, and an Application Load Balancer have been placed on the canvas. Design an ECS Fargate microservices architecture with two services: a frontend service (React app served by nginx) and an API service (Node.js backend). Route frontend traffic directly, and route /api/* traffic to the API service. Both services pull images from ECR and use Secrets Manager for their configurations.

## Learning Objectives

- Configure ECS services for each container with appropriate IAM task roles
- Set up ALB listener rules to route traffic to the correct target group
- Use Secrets Manager references in task definitions for database credentials
- Configure CloudWatch Logs for container output

## Steps

1. Create an ECS Cluster (Fargate capacity provider only)
2. Create a Task Definition for Frontend: image=ECR/frontend:latest, CPU=256, Memory=512, port 80, CloudWatch Logs to /ecs/frontend
3. Create a Task Definition for API: image=ECR/api:latest, CPU=512, Memory=1024, port 8080, secret=db-password from Secrets Manager, CloudWatch Logs to /ecs/api
4. Create an IAM Task Role for API with permissions: secretsmanager:GetSecretValue (specific secret ARN), dynamodb:GetItem/PutItem/Query (specific table ARN)
5. Create ECS Service: Frontend — desired count 2, Fargate, attach to ALB Target Group on port 80
6. Create ECS Service: API — desired count 2, Fargate, attach to ALB Target Group on port 8080
7. Configure ALB Listener Rules: / (default) → Frontend TG; /api/* → API TG
8. Create Security Group for ECS tasks: allow inbound from ALB-SG on task ports; deny all else
9. Add Auto Scaling on both services: CPU > 70% → scale out, CPU < 30% → scale in
10. Connect both task definitions to ECR with a note about the pull-through cache or IAM permissions for ECR access

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.