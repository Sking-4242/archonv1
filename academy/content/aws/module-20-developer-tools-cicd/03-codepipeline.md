---
title: "AWS CodePipeline: CI/CD Orchestration"
type: content
estimated_minutes: 10
cert_tags: ["DVA-C02", "SAA-C03"]
---

# AWS CodePipeline: CI/CD Orchestration

## Overview

CodePipeline orchestrates the full software delivery workflow — from source commit to production deployment — as a series of stages and actions. It integrates CodeCommit, CodeBuild, CodeDeploy, manual approval gates, and third-party tools (GitHub, Jenkins, etc.) into a repeatable automated pipeline.

## Pipeline Structure

A pipeline consists of stages. Each stage contains actions that run in sequence or parallel. Common pipeline stages: Source (CodeCommit, GitHub, S3, ECR image change), Build (CodeBuild — build and test), Staging Deploy (CodeDeploy to staging environment), Manual Approval (require a human to approve before production), Production Deploy (CodeDeploy to production). Stages are connected by artifacts — each action produces output artifacts (S3 objects) consumed by subsequent actions.

## Source Integrations

CodePipeline triggers on: CodeCommit branch pushes (via CloudWatch Events), GitHub/GitHub Enterprise (via webhook or polling), Bitbucket (via connections), S3 object changes (e.g., a CloudFormation template uploaded by another system), ECR image pushes (trigger deployment on new image). This covers every common source type for AWS-hosted or external code repositories and container image registries.

## Manual Approval Actions

Insert a Manual Approval action between staging and production stages. Pipeline pauses; CodePipeline sends an SNS notification (email to approver). The approver logs into the CodePipeline console and approves or rejects. Rejected: pipeline stops, deployment doesn't proceed. Approved: next stage begins. Use for: change management requirements, final QA sign-off, compliance gates. Approval comments and timestamps appear in the pipeline execution history.

## Pipeline Notifications and Monitoring

CodePipeline sends events to EventBridge: pipeline started, stage entered, action succeeded/failed. Use these events to send Slack notifications (EventBridge → Lambda → Slack webhook), trigger additional testing, or update deployment tracking systems. Pipeline execution history shows every run with timestamps, duration, and failure details. CodePipeline integrates with CodeStar Notifications for pre-configured notification rules across CodeCommit, CodeBuild, CodeDeploy, and CodePipeline.

## Summary

CodePipeline orchestrates the full delivery workflow: Source → Build → Test → Approve → Deploy. Each stage produces artifacts consumed by the next. Manual approval gates enforce change management. EventBridge events enable notifications and downstream automation. CodePipeline glues together all the other developer tools into an automated, auditable pipeline.

## Examples

A small startup building a SaaS analytics product sets up a CodePipeline with four stages: Source (CodeCommit), Build (CodeBuild running `npm test && npm run build`), Deploy to Staging (CodeDeploy to a single EC2 instance), and Deploy to Production (CodeDeploy to their three-instance production fleet). Every commit to the `main` branch automatically flows through all four stages — the whole delivery from commit to production takes about eight minutes with no human involvement. This is the textbook straight-line pipeline: it illustrates how CodePipeline stitches the other developer tools together into a repeatable, auditable delivery process.

A healthcare software company must comply with change management policies that require a named approver to sign off on every production release. They insert a Manual Approval action between their staging deploy stage and their production deploy stage. CodePipeline pauses and fires an SNS notification to the release manager's email. The manager logs in, reviews the staged version, and clicks Approve. The pipeline then proceeds to production. The approval timestamp and comment ("Verified smoke tests pass — approved for prod") are permanently recorded in the pipeline execution history, satisfying the audit trail requirement. Without this gate, an automated pipeline would violate their change control policy.

A platform engineering team at a large e-commerce company uses EventBridge events emitted by CodePipeline to power their deployment observability system. When an action in the pipeline fails, an EventBridge rule routes the event to a Lambda function that posts a formatted message to their Slack `#deployments` channel with the pipeline name, stage, action, and a direct link to the failure logs. When a deployment succeeds, a separate rule updates a deployment tracking database with the commit SHA, timestamp, and deploying engineer's identity. This goes beyond basic pipeline usage — it shows how CodePipeline's event model integrates with the broader AWS event-driven ecosystem to build a production-grade delivery observability layer.

## Think About It

1. Why does CodePipeline use S3 artifacts to pass outputs between stages rather than passing data directly between actions in memory?
2. What would happen if your CodeBuild test stage produces a zero-exit-code success even when tests fail — how does this break the pipeline's safety guarantees, and how would you fix it?
3. How would you decide whether to add a Manual Approval gate before production for a team practicing continuous deployment versus one with formal change management requirements?
4. A pipeline stage has three parallel actions (integration tests, security scan, performance test). One action takes 45 minutes and the others take 5. What are the trade-offs of keeping them parallel versus splitting the slow action into a separate sequential stage?
5. CodePipeline stores execution history and artifacts in S3. What are the security and cost implications of that design, and how would you manage them over time?

## Quick Check

**Q1.** In CodePipeline, what connects the output of one stage to the input of the next?

- A) Direct Lambda invocations between stages
- B) S3 artifacts produced and consumed by each action
- C) SQS messages passed between stage workers
- D) Environment variables propagated through the pipeline

**Answer: B** — Each action in CodePipeline produces output artifacts stored in S3, which subsequent actions consume as input artifacts — this is how data (built code, test results) flows through the pipeline.

**Q2.** What service does CodePipeline use to detect changes in a CodeCommit repository and automatically trigger a new pipeline execution?

- A) CloudTrail
- B) S3 event notifications
- C) CloudWatch Events / EventBridge
- D) SNS subscriptions

**Answer: C** — CodePipeline uses CloudWatch Events (EventBridge) to detect CodeCommit branch push events and trigger pipeline executions automatically.

**Q3.** What happens to a CodePipeline execution when an approver rejects a Manual Approval action?

- A) The pipeline retries the previous stage automatically
- B) The pipeline stops and the subsequent stages do not execute
- C) The pipeline skips the approval stage and continues to the next stage
- D) CodeDeploy rolls back the staging deployment

**Answer: B** — A rejection on a Manual Approval action stops the pipeline execution entirely; downstream stages, including the production deployment, do not run.

## What's Next

Next up: CodeArtifact, CodeStar, and Cloud9 — artifact management and developer environments.