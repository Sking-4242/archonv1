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

## What's Next

Next up: CodeArtifact, CodeStar, and Cloud9 — artifact management and developer environments.