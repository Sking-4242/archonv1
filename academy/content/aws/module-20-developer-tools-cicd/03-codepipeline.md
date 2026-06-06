---
title: "AWS CodePipeline: CI/CD Orchestration"
type: content
estimated_minutes: 12
cert_tags: ["DVA-C02", "SAA-C03"]
---

# AWS CodePipeline: CI/CD Orchestration

## Overview

AWS CodePipeline is the orchestration layer that connects source control, build, test, and deployment into a single automated delivery workflow. It integrates CodeCommit, CodeBuild, CodeDeploy, manual approval gates, and third-party tools (GitHub, Jenkins, Slack) into a repeatable pipeline that runs automatically on every qualifying source change.

The problem CodePipeline solves is delivery friction and inconsistency. Without orchestration, deploying to production involves a sequence of manual steps: trigger a build, wait, download the artifact, run tests, SSH to a staging server, deploy, validate, then repeat for production. Each step is a potential human error, a delay, or a step someone skips under pressure. CodePipeline encodes this process as a versioned, auditable artifact — the pipeline itself — that executes identically every time, with full execution history.

For the DVA and SAA exams, understand pipeline structure (stages, actions, artifacts), source integrations, manual approval gates, and EventBridge-based notification patterns. SAA adds cross-account pipeline deployments. After this lesson, you will be able to design a complete CI/CD pipeline for a standard web application and know exactly how each service connects within it.

---

## Core Concepts

### Pipeline Structure: Stages, Actions, and Artifacts

A CodePipeline pipeline is a sequence of **stages**. Each stage contains one or more **actions** that run sequentially or in parallel. Actions within the same stage can run in parallel; stages always run sequentially — a stage cannot begin until all actions in the previous stage succeed.

**Artifact flow**: each action produces **output artifacts** stored in an S3 bucket. Subsequent actions declare those artifacts as their **input artifacts**. This S3-mediated handoff is how data flows through the pipeline — the built application package from CodeBuild becomes the deployment package for CodeDeploy. Each pipeline has a dedicated S3 artifacts bucket that CodePipeline manages automatically.

**Typical pipeline stages:**
1. **Source** — detect a change and pull the latest revision (CodeCommit, GitHub, S3, ECR)
2. **Build** — compile, test, package (CodeBuild)
3. **Test** — additional test suites, security scans (CodeBuild or third-party actions)
4. **Deploy to Staging** — deploy to a non-production environment (CodeDeploy, CloudFormation, ECS)
5. **Manual Approval** — human sign-off before production
6. **Deploy to Production** — deploy to production (CodeDeploy, CloudFormation, ECS)

---

### Source Integrations

CodePipeline detects source changes from multiple providers and triggers a new execution:

- **CodeCommit**: detected via EventBridge (branch push event). Near-instantaneous trigger.
- **GitHub / GitHub Enterprise**: detected via GitHub webhook (V2 connections, recommended) or periodic polling (V1, legacy). Webhooks trigger in seconds.
- **Bitbucket Cloud**: same V2 connection model as GitHub.
- **S3**: triggered when an object in a specified S3 key changes — useful for pipelines triggered by an uploaded CloudFormation template or a deployment package produced by an external system.
- **ECR**: triggered when a new image is pushed to a specified ECR repository and tag — enables GitOps-style pipelines where a new container image automatically triggers a deployment.

**V2 connections** (CodeStar Connections) are the modern way to connect GitHub, Bitbucket, and GitHub Enterprise to CodePipeline. They use OAuth-based connections managed in the AWS console rather than personal access tokens, and are shared across CodePipeline, CodeBuild, and CodeDeploy.

---

### Manual Approval Actions

A Manual Approval action pauses the pipeline execution and sends an SNS notification. The pipeline waits indefinitely (up to 7 days) until an approver logs in and approves or rejects.

**Configuration options**:
- SNS topic for the notification (typically sends email to the approver or posts to a Slack channel via Lambda)
- A URL to embed in the notification (link to the staging deployment, test results, or change log)
- A comment field where the approver records their reasoning

**Approved**: the pipeline immediately continues to the next stage. **Rejected**: the pipeline stops; downstream stages do not run. The approval decision, timestamp, approver identity (IAM), and comment are permanently recorded in the pipeline execution history.

Use Manual Approval for: change management compliance requirements, final QA sign-off before production releases, regulated industries where a named human must authorize each deployment.

---

### Pipeline Notifications and Monitoring

CodePipeline emits events to **EventBridge** at every state transition: pipeline started, stage entered, action succeeded, action failed, approval needed, pipeline succeeded, pipeline failed. These events are the integration point for notification and automation.

**Common patterns**:
- EventBridge rule → Lambda → Slack webhook: post deployment status to a team channel in real time
- EventBridge rule → SNS → email: notify the team on pipeline failure
- EventBridge rule → Lambda → JIRA API: update deployment tracking tickets

**CodeStar Notifications** provides a simpler pre-built notification model — configure notification rules on a pipeline to send to SNS or AWS Chatbot (Slack/Chime) with pre-formatted messages for common events (succeeded, failed, approval needed).

**Pipeline execution history** in the console shows every run: start time, duration, triggering event (commit SHA, S3 version, manual start), status of each stage, and failure details including CloudWatch Logs links for failed CodeBuild actions.

---

## Configuration Reference

### Example: Complete Pipeline with Source, Build, Approval, and Deploy (AWS CLI)

```bash
# Create a CodePipeline pipeline with four stages
aws codepipeline create-pipeline \
  --pipeline '{
    "name": "prod-api-pipeline",
    "roleArn": "arn:aws:iam::123456789012:role/codepipeline-service-role",
    "artifactStore": {
      "type": "S3",
      "location": "my-pipeline-artifacts-us-east-1"
    },
    "stages": [
      {
        "name": "Source",
        "actions": [{
          "name": "CodeCommitSource",
          "actionTypeId": {
            "category": "Source",
            "owner": "AWS",
            "provider": "CodeCommit",
            "version": "1"
          },
          "configuration": {
            "RepositoryName": "prod-api",
            "BranchName": "main",
            "PollForSourceChanges": "false"
          },
          "outputArtifacts": [{"name": "SourceOutput"}]
        }]
      },
      {
        "name": "Build",
        "actions": [{
          "name": "BuildAndTest",
          "actionTypeId": {
            "category": "Build",
            "owner": "AWS",
            "provider": "CodeBuild",
            "version": "1"
          },
          "configuration": {
            "ProjectName": "prod-api-build"
          },
          "inputArtifacts": [{"name": "SourceOutput"}],
          "outputArtifacts": [{"name": "BuildOutput"}]
        }]
      },
      {
        "name": "ApproveForProduction",
        "actions": [{
          "name": "ManualApproval",
          "actionTypeId": {
            "category": "Approval",
            "owner": "AWS",
            "provider": "Manual",
            "version": "1"
          },
          "configuration": {
            "NotificationArn": "arn:aws:sns:us-east-1:123456789012:deployment-approvals",
            "ExternalEntityLink": "https://staging.myapp.com",
            "CustomData": "Review staging at the link before approving for production"
          }
        }]
      },
      {
        "name": "DeployToProduction",
        "actions": [{
          "name": "CodeDeployProd",
          "actionTypeId": {
            "category": "Deploy",
            "owner": "AWS",
            "provider": "CodeDeploy",
            "version": "1"
          },
          "configuration": {
            "ApplicationName": "prod-api-app",
            "DeploymentGroupName": "prod-deployment-group"
          },
          "inputArtifacts": [{"name": "BuildOutput"}]
        }]
      }
    ]
  }' \
  --region us-east-1
# PollForSourceChanges: false — use EventBridge instead (more reliable, immediate trigger)
# artifactStore: the S3 bucket CodePipeline uses to pass artifacts between stages
```

> **Note:** Set `PollForSourceChanges: false` on CodeCommit sources and create an EventBridge rule to trigger the pipeline on branch push events. EventBridge triggers are near-instantaneous; polling checks every minute and adds unnecessary API calls.

---

### Example: EventBridge Rule to Trigger Pipeline on CodeCommit Push

```bash
# Create EventBridge rule to trigger pipeline on main branch push
aws events put-rule \
  --name "trigger-prod-api-pipeline-on-main-push" \
  --event-pattern '{
    "source": ["aws.codecommit"],
    "detail-type": ["CodeCommit Repository State Change"],
    "resources": ["arn:aws:codecommit:us-east-1:123456789012:prod-api"],
    "detail": {
      "event": ["referenceUpdated"],
      "referenceType": ["branch"],
      "referenceName": ["main"]
    }
  }' \
  --state ENABLED \
  --region us-east-1

# Add CodePipeline as the target
aws events put-targets \
  --rule "trigger-prod-api-pipeline-on-main-push" \
  --targets '[{
    "Id": "StartPipeline",
    "Arn": "arn:aws:codepipeline:us-east-1:123456789012:prod-api-pipeline",
    "RoleArn": "arn:aws:iam::123456789012:role/eventbridge-codepipeline-trigger-role"
  }]' \
  --region us-east-1
```

> **Note:** The EventBridge rule needs an IAM role with `codepipeline:StartPipelineExecution` permission. The CodeCommit source action still requires `PollForSourceChanges: false` — otherwise both EventBridge and polling would trigger executions.

---

## How to Decide

**When to add a Manual Approval gate:**

| Requirement | Add Manual Approval? |
|---|---|
| Formal change management / CAB approval | ✅ Required |
| Regulated industry (PCI, HIPAA, SOX) | ✅ Required for audit trail |
| Small team practicing continuous deployment | ❌ Adds friction with no safety benefit |
| Deployment to production environment | ✅ Recommended |
| Deployment to staging/test environment | ❌ Should be fully automated |

**Parallel vs. sequential stage actions:**

Put test actions (unit tests, security scans, integration tests) in the same stage as parallel actions when they are all required and can run simultaneously — this reduces total pipeline duration. Put them in separate sequential stages when one must pass before another starts (e.g., don't run integration tests if unit tests fail).

**Artifact bucket encryption:**

CodePipeline's S3 artifact bucket should use SSE-KMS (not SSE-S3) for customer-managed key control in regulated environments. The CodePipeline service role and all action provider roles need `kms:GenerateDataKey` and `kms:Decrypt` on the KMS key.

---

## How This Connects

- **CodeCommit** — The standard Source stage provider. CodePipeline detects branch pushes via EventBridge and retrieves the source revision as the pipeline's first input artifact.
- **CodeBuild** — The standard Build stage provider. CodePipeline passes the source artifact as CodeBuild's input, and CodeBuild's output artifact (the built package, Docker image digest, etc.) flows to the Deploy stage.
- **CodeDeploy** — The standard Deploy stage provider. CodePipeline passes the build artifact to CodeDeploy, which handles the rollout strategy and lifecycle hooks to the target compute platform.
- **CloudFormation** — CodePipeline can deploy CloudFormation stacks as a Deploy stage action — standard for infrastructure pipelines. Pipeline can create or update stacks, create change sets for review, or execute change sets.
- **EventBridge** — Two roles: (1) EventBridge triggers the pipeline on source events (CodeCommit push, ECR image push, S3 object update); (2) CodePipeline emits events to EventBridge at every state transition, enabling notification and automation.
- **SNS** — The delivery channel for Manual Approval notifications and pipeline failure alerts. Approval requests are sent to an SNS topic; team members subscribe via email or via a Lambda function that formats the message for Slack.

---

## Exam Traps

- **S3 artifacts are how data moves between stages**: students sometimes assume CodePipeline passes data directly between actions in memory. It does not — every action writes output to S3, every subsequent action reads from S3. This matters for cross-account pipelines (the artifact bucket must be accessible to the target account's roles).
- **`PollForSourceChanges: false` is required for EventBridge triggers**: if you create an EventBridge rule to trigger the pipeline but leave `PollForSourceChanges: true` on the source action, both mechanisms fire and you get duplicate executions — one from polling and one from EventBridge.
- **Manual Approval requires the approver to have CodePipeline permissions**: the approver must have `codepipeline:PutApprovalResult` permission on the pipeline. Using a shared email address that multiple people check but none have the right IAM permissions is a common misconfiguration.
- **A pipeline stage failure stops that execution, not future executions**: a failed pipeline execution does not prevent the next commit from starting a new execution. The broken execution stays failed while new executions proceed normally.
- **Parallel actions in a stage all need to succeed**: if a stage has three parallel actions and one fails, the entire stage fails. The pipeline does not proceed to the next stage even if the other two actions succeeded. Design test parallelism accordingly.

---

## Summary

- CodePipeline orchestrates source → build → test → approve → deploy as a sequence of stages, with S3 artifacts passing outputs between each stage's actions.
- Source integrations include CodeCommit, GitHub (via CodeStar Connections), Bitbucket, S3, and ECR — each triggering a pipeline execution on qualifying changes.
- Manual Approval actions pause the pipeline indefinitely until an authorized approver approves or rejects, with the decision timestamped and recorded in the execution history.
- CodePipeline emits EventBridge events at every state transition, enabling real-time Slack notifications, automated ticketing, and audit integrations without polling.
- `PollForSourceChanges: false` with an EventBridge trigger is the recommended CodeCommit source configuration — faster, more reliable, and avoids duplicate executions.
- Cross-account deployments require the S3 artifact bucket and any KMS keys to be accessible to the target account's deployment roles, with explicit cross-account IAM policies.

---

## Examples

A small startup building a SaaS analytics product sets up a four-stage CodePipeline: Source (CodeCommit, `main` branch), Build (CodeBuild running `npm test && npm run build`), Deploy to Staging (CodeDeploy to a single EC2 instance), and Deploy to Production (CodeDeploy to their three-instance fleet with a rolling strategy). Every commit to `main` automatically flows through all four stages — the whole delivery from commit to production takes about eight minutes with zero human involvement. When a developer pushes a broken commit that fails CodeBuild tests, the pipeline stops at Stage 2, production is never touched, and the developer gets an email from the EventBridge → SNS → email notification chain within 30 seconds of the failure.

A healthcare software company must comply with SOX change management policies requiring a named person to authorize every production release. They insert a Manual Approval action between their staging deploy stage and their production deploy stage. CodePipeline pauses and sends an SNS notification with a link to the staging deployment. The release manager reviews the staging environment, then logs into the CodePipeline console and clicks Approve with a comment ("Verified smoke tests pass, stakeholder sign-off received"). The pipeline proceeds to production. The approval timestamp, IAM identity, and comment are permanently recorded in the execution history — satisfying the auditor's traceability requirement without a separate change management system.

A platform engineering team uses EventBridge events from CodePipeline to build a deployment observability system. When any pipeline action fails, an EventBridge rule routes the event to a Lambda function that posts a formatted message to `#deployments` in Slack: pipeline name, stage, action, failure reason, and a deep link to the CodeBuild log for that execution. When a deployment succeeds, a separate rule calls the team's internal deployment tracking API with the commit SHA, pipeline name, and timestamp. The platform team can see every deployment across 30 microservice pipelines in a single Slack channel and a central dashboard — all powered by EventBridge events, with no polling or manual status checks.

---

## Think About It

1. Why does CodePipeline use S3 artifacts to pass outputs between stages rather than passing data directly in memory? What does this design enable for cross-account and cross-region pipelines?
2. A CodeBuild test stage exits with a zero exit code even when all tests fail, because the test runner configuration doesn't propagate failure exit codes. How does this break CodePipeline's safety model, and how would you fix it?
3. You have three parallel actions in a test stage: integration tests (45 minutes), security scan (5 minutes), and performance test (20 minutes). What are the trade-offs of keeping them parallel versus moving the 45-minute integration test to a separate sequential stage?
4. Your team is debating whether to add a Manual Approval gate before production for a service that deploys 15 times per day. What criteria would determine whether the gate adds safety or just friction?
5. CodePipeline stores execution history and artifacts in S3 for 90 days. What lifecycle policy would you configure on the artifacts bucket, and what security controls would you apply to it?

---

## Quick Check

**Q1.** In CodePipeline, what connects the output of one stage to the input of the next stage?

- A) Direct Lambda invocations between stage action providers
- B) S3 artifacts produced by each action and consumed by downstream actions
- C) SQS messages passed between CodePipeline's internal workers
- D) Environment variables propagated through the pipeline execution context

**Answer: B** — Every action in CodePipeline writes its outputs as artifacts to an S3 bucket; subsequent actions declare those artifacts as inputs and retrieve them from S3. This S3-mediated handoff is how built code, test reports, and deployment packages flow through the pipeline. A, C, and D do not describe how CodePipeline passes data — there is no direct in-memory or message-queue handoff between actions.

---

**Q2.** You create an EventBridge rule to trigger a CodePipeline execution when a CodeCommit branch is pushed. The pipeline has a CodeCommit source action with `PollForSourceChanges: true`. What is the likely outcome?

- A) EventBridge overrides the polling configuration — only one execution starts per push
- B) The pipeline starts twice per push — once from the EventBridge trigger and once from polling
- C) The EventBridge trigger is ignored because polling takes precedence
- D) CodePipeline automatically deduplicates executions from the same commit

**Answer: B** — Both mechanisms are active simultaneously. EventBridge triggers the pipeline immediately on push; polling also detects the same change within its next check interval (up to 1 minute), triggering a second execution. Set `PollForSourceChanges: false` when using an EventBridge trigger to prevent duplicate executions. CodePipeline does not automatically deduplicate trigger sources.

---

**Q3.** An approver rejects a Manual Approval action in a CodePipeline execution. What happens to the deployment stages that follow the approval?

- A) The rejected stages are marked as skipped and the pipeline completes
- B) The pipeline rolls back the previous deployment stages automatically
- C) The pipeline execution stops; downstream stages including the production deployment do not run
- D) CodePipeline waits 24 hours and re-presents the approval request

**Answer: C** — Rejection stops the pipeline execution at the approval action. No downstream stages — including the production deployment — run. The rejection, approver identity, timestamp, and comment are recorded in the execution history. CodePipeline does not roll back previous stages on approval rejection; rollback is a CodeDeploy concern, not a pipeline concern.

---

## What's Next

The next lesson covers CodeArtifact and Infrastructure as Code (CloudFormation and CDK) — the services that manage package dependencies and provision the infrastructure that CodePipeline deploys to. Understanding these completes the full AWS developer tools picture.
tegory": "Approval",
            "owner": "AWS",
            "provider": "Manual",
            "version": "1"
          },
          "configuration": {
            "NotificationArn": "arn:aws:sns:us-east-1:123456789012:pipeline-approvals",
            "ExternalEntityLink": "https://staging.example.com/healthcheck",
            "CustomData": "Review staging deployment before approving production release."
          }
        }]
      },
      {
        "name": "DeployToProduction",
        "actions": [{
          "name": "CodeDeployProd",
          "actionTypeId": {
            "category": "Deploy",
            "owner": "AWS",
            "provider": "CodeDeploy",
            "version": "1"
          },
          "configuration": {
            "ApplicationName": "prod-api",
            "DeploymentGroupName": "prod-deployment-group"
          },
          "inputArtifacts": [{"name": "BuildOutput"}],
          "runOrder": 1
        }]
      }
    ]
  }'
```

> **Note:** `PollForSourceChanges: "false"` disables CodePipeline's legacy polling and relies on an EventBridge rule to trigger the pipeline on CodeCommit branch pushes. AWS recommends EventBridge-based triggers for all new pipelines — they are faster (seconds vs. up to 1 minute) and reduce unnecessary API calls.

---

### Example: EventBridge Rule to Trigger Pipeline on CodeCommit Push

```bash
aws events put-rule \
  --name "trigger-prod-api-pipeline-on-main-push" \
  --event-pattern '{
    "source": ["aws.codecommit"],
    "detail-type": ["CodeCommit Repository State Change"],
    "resources": ["arn:aws:codecommit:us-east-1:123456789012:prod-api"],
    "detail": {
      "event": ["referenceUpdated"],
      "referenceType": ["branch"],
      "referenceName": ["main"]
    }
  }' \
  --state ENABLED

aws events put-targets \
  --rule "trigger-prod-api-pipeline-on-main-push" \
  --targets '[{
    "Id": "codepipeline-target",
    "Arn": "arn:aws:codepipeline:us-east-1:123456789012:prod-api-pipeline",
    "RoleArn": "arn:aws:iam::123456789012:role/events-codepipeline-trigger-role"
  }]'
```

---

## Exam Traps

- **"Pipeline doesn't trigger on CodeCommit push"** → check that `PollForSourceChanges` is `false` and an EventBridge rule exists; or that `PollForSourceChanges` is `true` (legacy polling, up to 1-minute delay).
- **"Manual approval gate"** → pauses up to 7 days; pipeline resumes only on explicit Approve; Reject stops the pipeline with no downstream execution.
- **"Cross-account pipeline deployment"** → the pipeline in account A uses an IAM role that assumes a cross-account role in account B to deploy. The S3 artifact bucket and KMS key must grant cross-account access.
- **"Artifact storage"** → all inter-stage artifacts are stored in S3. The pipeline's S3 artifact bucket is created automatically and must remain accessible throughout pipeline execution.
- **"Parallel actions within a stage"** → set `runOrder` to the same value for actions that should run in parallel; different `runOrder` values make them sequential within the stage.

---

## What's Next

The next lesson covers CodeArtifact for managed package dependency management, Cloud9 for browser-based development, and CodeGuru for ML-powered code review and production profiling.
 pipeline execution time. Use sequential `runOrder` values within a stage only when one action genuinely depends on the output of another within the same stage.

---

## How This Connects

- **CodeCommit / GitHub** — the Source stage. EventBridge delivers the push event to CodePipeline within seconds; pipeline polling (legacy) introduces up to 1-minute latency. Always use EventBridge-based triggers for new pipelines.
- **CodeBuild** — the Build and Test stages. Each CodeBuild action runs a `buildspec.yml` in an isolated environment. The build output artifact is stored in S3 and passed to downstream stages.
- **CodeDeploy** — the Deploy stages. CodePipeline passes the S3 artifact location to CodeDeploy, which manages the actual rollout strategy (rolling, blue/green, Lambda traffic-shifting).
- **CloudFormation** — an alternative Deploy action for infrastructure pipelines. CodePipeline can create stacks, create change sets, or execute change sets — enabling IaC pipelines with the same approval gates as application pipelines.
- **SNS / Chatbot** — notification targets for pipeline events via EventBridge rules or CodeStar Notifications. Post pipeline status to Slack, email, or PagerDuty without writing custom Lambda functions.
- **IAM** — CodePipeline requires a service role with permissions to read from the source, invoke CodeBuild, pass artifacts through S3, and trigger CodeDeploy or CloudFormation. Cross-account deployments require the pipeline role to assume a deployment role in the target account.
 automation (post deployment status to Slack, update JIRA tickets, trigger downstream pipelines).
- **S3** — All inter-stage artifacts are stored in an S3 bucket that CodePipeline manages. The bucket must remain accessible for the duration of pipeline execution. For cross-account pipelines, the S3 bucket and its KMS encryption key must grant cross-account access to the deployment role in the target account.
- **IAM** — The CodePipeline service role needs permissions for every action type in the pipeline: `codecommit:GetBranch`, `codebuild:StartBuild`, `codedeploy:CreateDeployment`, `cloudformation:CreateChangeSet`, `s3:PutObject`/`GetObject` on the artifact bucket, and `iam:PassRole` to pass the CloudFormation service role. Least-privilege scoping of the pipeline role is a common exam scenario.
 polling and the EventBridge rule will trigger the pipeline, causing double executions. Set `PollForSourceChanges: false` on the source action when using EventBridge.
- **"Manual Approval times out after 7 days"** → the pipeline execution stops with a `Rejected` status. It does not resume automatically — a new pipeline execution must be triggered after the approval window lapses.
- **"Pipeline stage vs. action parallelism"** → actions within a stage with the same `runOrder` run in parallel; stages always run sequentially. You cannot run two stages in parallel — only actions within a stage.
- **"Cross-account deployment"** → the pipeline's artifact S3 bucket and KMS key must grant cross-account access to the deployment role in the target account. The pipeline service role must have `sts:AssumeRole` permission to assume the cross-account deployment role.
- **"V1 vs. V2 GitHub connection"** → V1 uses a personal OAuth token (deprecated, less secure). V2 uses AWS CodeStar Connections (OAuth app, shared across CodeBuild/CodePipeline/CodeDeploy). Always use V2 connections for new pipelines.

---

## What's Next

The next lesson covers CodeArtifact for managed package dependency management, Cloud9 for browser-based development, and CodeGuru for ML-powered code review and production profiling.
- Manual Approval actions pause the pipeline indefinitely (up to 7 days) for human sign-off; approval decisions are permanently recorded with approver identity, timestamp, and comment.
- All inter-stage data passes through S3 artifacts — CodePipeline never passes data directly between actions in memory.
- EventBridge triggers pipelines on source changes (sub-second) and receives pipeline state-change events for notifications and automation.

## What's Next

The next lesson covers CodeArtifact for managed package dependency management, Cloud9 for browser-based development, and CodeGuru for ML-powered code review and production profiling.
A small startup with a three-person engineering team deploys a Node.js API to ECS Fargate. Their CodePipeline has four stages: Source (GitHub via CodeStar Connection), Build (CodeBuild runs `npm test && docker build && docker push` to ECR), Approve (Manual Approval notifies the team Slack channel via SNS → Lambda), and Deploy (CodeDeploy ECS blue/green to the production cluster). Every push to `main` triggers the pipeline automatically; no engineer SSHes to any server. The entire pipeline definition is stored as a CloudFormation template in the same repository — the pipeline itself is infrastructure as code.

## What's Next

The next lesson covers CodeArtifact for managed package dependency management, Cloud9 for browser-based development, and CodeGuru for ML-powered code review and production profiling.
amed approver to sign off on every production change. They add a Manual Approval stage between their staging and production Deploy stages. The approval notification goes to an SNS topic that emails the change advisory board. Each deployment to production is permanently recorded in CodePipeline execution history with the approver's IAM identity, timestamp, and comment — satisfying the SOX audit requirement with no additional tooling.
 approval decision — with approver IAM identity, timestamp, and justification comment — is permanently recorded in the pipeline execution history, satisfying the SOX audit trail requirement without any additional tooling or manual logging.
 engineering team at a company with 50 microservices sets up a standard pipeline template in CloudFormation. Every new microservice gets an identical four-stage pipeline by deploying the template with a different service name parameter. All pipelines share the same pattern: Source (GitHub), Build (CodeBuild), Deploy to Staging (CodeDeploy), Manual Approval, Deploy to Production (CodeDeploy). The pipeline definition itself is reviewed in pull requests just like application code — so pipeline changes go through the same review process as the services they deploy.
elines in one Slack channel — something that would require a dedicated monitoring tool without CodePipeline's EventBridge integration.
