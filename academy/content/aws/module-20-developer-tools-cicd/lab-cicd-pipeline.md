---
title: "Canvas Lab: Full CI/CD Pipeline for ECS"
type: canvas
estimated_minutes: 30
cert_tags: ["DVA-C02", "SAA-C03"]
canvas_type: open
---

# Canvas Lab: Full CI/CD Pipeline for ECS

## Challenge

Design a complete CI/CD pipeline that automatically builds and deploys a containerized application to ECS Fargate when code is pushed to the main branch. The pipeline must: trigger on GitHub push, build and test the application, push the container image to ECR, deploy to a staging ECS service, require a manual approval before production, and deploy to production ECS using blue/green deployment.

## Learning Objectives

- Automate the full path from code push to production deployment
- Include a build validation stage with test reporting
- Use blue/green deployment for production to enable instant rollback
- Require human approval before production deployment

## Steps

1. Create a CodePipeline with 5 stages: Source, Build, Deploy-Staging, Approve, Deploy-Production
2. Stage 1 - Source: GitHub connection trigger on main branch push
3. Stage 2 - Build: CodeBuild project — runs tests, builds Docker image, pushes to ECR, outputs imagedefinitions.json artifact
4. Configure CodeBuild with ECR push permissions in the service role; use Secrets Manager for any API keys
5. Stage 3 - Deploy-Staging: CodeDeploy action deploying to ECS staging service using the ECR image digest from the Build artifact
6. Add a post-staging CodeBuild action running integration tests against the staging URL
7. Stage 4 - Approve: Manual approval action with SNS email notification to the release team
8. Stage 5 - Deploy-Production: CodeDeploy blue/green deployment to ECS production service with a 10-minute canary (10% traffic) before full switch
9. Add a CloudWatch Alarm on production 5xx rate; attach to the CodeDeploy deployment group for automatic rollback
10. Add EventBridge rule: pipeline failure → Lambda → Slack notification
11. Annotate the rollback mechanism: if CloudWatch alarm fires within 10 minutes, CodeDeploy automatically reverts to blue target group

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.