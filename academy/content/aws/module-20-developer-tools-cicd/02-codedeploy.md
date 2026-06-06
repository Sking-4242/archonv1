---
title: "AWS CodeDeploy: Automated Deployments"
type: content
estimated_minutes: 12
cert_tags: ["DVA-C02", "SAA-C03"]
---

# AWS CodeDeploy: Automated Deployments

## Overview

AWS CodeDeploy is a fully managed deployment service that automates application rollouts to EC2 instances, on-premises servers, AWS Lambda functions, and Amazon ECS services. It handles the mechanics of safe deployment: rolling out to a percentage of targets at a time, running validation hooks at each phase, monitoring deployment health, and rolling back automatically when something goes wrong.

The problem CodeDeploy solves is deployment risk. Without a managed deployment service, teams SSH into instances, stop the application, copy new files, and restart — manually, one server at a time, with no automated rollback if the new version is broken. At ten instances this is inconvenient. At a thousand instances it is unmanageable. CodeDeploy codifies the deployment process into a repeatable, auditable workflow with automatic rollback built in.

For the DVA and SAA exams, understand CodeDeploy's three compute platforms (EC2/on-premises, Lambda, ECS), the deployment configuration types (rolling, blue/green), lifecycle hooks and `appspec.yml`, and automatic rollback via CloudWatch alarms. After this lesson, you will be able to design a safe deployment strategy for each compute platform and configure automatic rollback for production environments.

---

## Core Concepts

### Compute Platforms and appspec.yml

CodeDeploy operates across three compute platforms, each with distinct deployment mechanics:

**EC2/On-Premises**: The CodeDeploy agent runs on each instance and receives deployment instructions. An `appspec.yml` file in the application bundle defines which files to copy where, and lifecycle hook scripts to run at each deployment phase. This is the most feature-rich platform — hooks give you precise control over every step.

**Lambda**: CodeDeploy shifts traffic between Lambda function aliases using weighted alias routing. No agent needed. The `appspec.yml` specifies the Lambda function name, the current version (the stable alias target), and the new version to shift traffic to. Pre- and post-traffic validation hooks can run Lambda functions before and after the traffic shift to validate the new version.

**ECS**: CodeDeploy orchestrates a blue/green deployment between two ECS task definition revisions using two ALB target groups. The `appspec.yml` specifies the ECS service, the new task definition ARN, the target groups, and optional pre/post-traffic hook Lambda functions. CodeDeploy manages the ALB listener rule update to shift traffic.

---

### Deployment Configurations

**All-at-once (in-place)**: deploys to all targets simultaneously. Fastest, but if anything fails, all capacity is down simultaneously. Reserved for development and staging environments.

**Rolling (EC2)**: deploys to a configurable percentage or count of instances at a time. During rollout, some instances serve the old version and some serve the new version — not appropriate for deployments where old and new versions are incompatible. The fleet continues serving traffic throughout.

**Blue/Green (EC2, ECS)**: provisions new instances or tasks with the new version, shifts load balancer traffic when the new targets pass health checks, then waits a configurable termination window before decommissioning the old environment. If anything is wrong after the traffic shift, rollback is instantaneous — the old environment still exists. Blue/green is the recommended strategy for production EC2 and all ECS deployments.

**Lambda traffic-shifting**: three sub-types:
- `Canary`: e.g., `CodeDeployDefault.LambdaCanary10Percent5Minutes` — 10% to new version for 5 minutes, then 100% if no alarms breach
- `Linear`: e.g., `CodeDeployDefault.LambdaLinear10PercentEvery1Minute` — shift 10% more every minute until 100%
- `AllAtOnce`: shift 100% immediately — used with pre/post-traffic validation hooks for atomic deployments with rollback capability

---

### Lifecycle Hooks

Lifecycle hooks are shell scripts or Lambda functions that execute at defined points during an EC2/on-premises deployment. The hook sequence for an in-place deployment:

```
ApplicationStop → DownloadBundle → BeforeInstall → Install → AfterInstall
→ ApplicationStart → ValidateService
```

For blue/green deployments, additional hooks run on the new instances (`BeforeInstall` through `ValidateService`) before traffic is shifted.

**ValidateService** is the most important hook. It runs after the application starts on the new instances and before traffic is shifted (in blue/green) or after installation (in-place). Use it to run a smoke test — call a health-check endpoint, run a lightweight integration test — and exit with a non-zero code if the application is not healthy. A non-zero exit triggers automatic rollback.

Hook scripts must complete within the configured timeout (default: 3,600 seconds per hook). A hung script (e.g., waiting for a connection that never comes) will eventually fail the deployment via timeout, triggering rollback — but it's better to set realistic timeouts per hook.

---

### Automatic Rollback

CodeDeploy supports two automatic rollback triggers:

**Hook failure**: any lifecycle hook script that exits with a non-zero exit code immediately triggers rollback of the current deployment group. All instances that received the new version are rolled back to the previous revision.

**CloudWatch alarm rollback**: attach one or more CloudWatch alarms to the deployment group. If any alarm enters ALARM state during a deployment (monitoring error rates, latency, or any custom metric), CodeDeploy rolls back. This is the recommended production pattern because it catches failures that lifecycle hooks miss — for example, a gradual increase in error rates that only becomes apparent after the rolling deployment finishes.

For Lambda deployments, pre-traffic and post-traffic Lambda hook functions can run arbitrary validation before and after the traffic shift. If either hook returns a failure status, CodeDeploy shifts traffic back to the original version automatically.

---

## Configuration Reference

### Example: appspec.yml for EC2 Deployment

```yaml
version: 0.0                        # always 0.0 for EC2/on-premises
os: linux

files:                              # copy these files from the bundle to the instance
  - source: /app                    # source path within the deployment bundle (S3 zip)
    destination: /opt/myapp         # destination path on the EC2 instance

hooks:
  ApplicationStop:                  # runs BEFORE the new version is installed
    - location: scripts/stop_server.sh
      timeout: 30
      runas: root

  BeforeInstall:                    # runs after stopping, before copying files
    - location: scripts/install_dependencies.sh
      timeout: 300
      runas: root

  AfterInstall:                     # runs after files are copied, before app starts
    - location: scripts/configure_app.sh
      timeout: 60
      runas: ec2-user

  ApplicationStart:                 # starts the application
    - location: scripts/start_server.sh
      timeout: 30
      runas: root

  ValidateService:                  # runs after start — exit non-zero to trigger rollback
    - location: scripts/validate_health.sh
      timeout: 60
      runas: ec2-user
```

**validate_health.sh example:**
```bash
#!/bin/bash
# Poll the health check endpoint until success or timeout
for i in {1..10}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
  if [ "$STATUS" -eq 200 ]; then
    echo "Health check passed"
    exit 0
  fi
  echo "Health check returned $STATUS, retrying ($i/10)..."
  sleep 3
done
echo "Health check failed after 10 attempts"
exit 1   # non-zero exit triggers automatic CodeDeploy rollback
```

---

### Example: Lambda Deployment appspec.yml with Traffic Shifting

```yaml
version: 0.0
Resources:
  - myLambdaFunction:
      Type: AWS::Lambda::Function
      Properties:
        Name: "payment-processor"           # Lambda function name
        Alias: "prod"                        # the alias being shifted (e.g., LIVE)
        CurrentVersion: "5"                  # current stable version number
        TargetVersion: "6"                   # new version receiving traffic

Hooks:
  - BeforeAllowTraffic: "arn:aws:lambda:us-east-1:123456789012:function:pre-traffic-check"
    # runs before ANY traffic shifts to the new version
    # if this Lambda returns failure, the deployment stops — no traffic ever hits v6
  - AfterAllowTraffic: "arn:aws:lambda:us-east-1:123456789012:function:post-traffic-check"
    # runs after all traffic has shifted to the new version
    # if this Lambda returns failure, CodeDeploy shifts all traffic back to v5
```

```bash
# Create a CodeDeploy deployment for Lambda using Canary10Percent5Minutes
aws deploy create-deployment \
  --application-name payment-processor-app \
  --deployment-group-name prod-deployment-group \
  --deployment-config-name CodeDeployDefault.LambdaCanary10Percent5Minutes \
  --revision '{
    "revisionType": "S3",
    "s3Location": {
      "bucket": "my-deployment-artifacts",
      "key": "payment-processor/appspec.yml",
      "bundleType": "YAML"
    }
  }' \
  --region us-east-1
```

> **Note:** For Lambda deployments, CodeDeploy manages the alias weighted routing automatically. You do not call `UpdateAlias` — CodeDeploy handles the gradual traffic shift according to the deployment configuration.

---

## How to Decide

**Deployment strategy by compute platform:**

| Platform | Recommended Strategy | Why |
|---|---|---|
| EC2 production | Blue/Green | Instant rollback, old environment preserved |
| EC2 dev/staging | Rolling or All-at-once | Speed; rollback risk acceptable |
| ECS | Blue/Green (required) | CodeDeploy ECS only supports blue/green |
| Lambda (high risk) | Canary (e.g., 10% / 5 min) | Detect failures before full traffic shift |
| Lambda (internal/low risk) | AllAtOnce with hooks | Simple with automated rollback via hooks |

**Choosing Lambda traffic-shifting configuration:**

1. **Canary**: best for customer-facing Lambda (payment processing, order APIs). A limited traffic shift exposes failures before they affect all users. Pair with a CloudWatch alarm on error rate for the new version.
2. **Linear**: best for gradual confidence-building on functions with complex behavior — useful when you want to observe at each traffic increment.
3. **AllAtOnce**: best when the pre/post-traffic hooks provide sufficient validation and you want atomic deployments. Suitable for internal or low-risk functions.

**When to configure CloudWatch alarm rollback:**

Always configure it for production deployment groups. At minimum, alarm on:
- HTTP 5xx error rate from ALB (target group error rate > 1%)
- Lambda error rate (> 0.5% over 1 minute)
- Custom business metric (successful transactions per minute drops below baseline)

---

## How This Connects

- **CodePipeline** — CodeDeploy is the standard Deploy stage provider. CodePipeline passes the artifact from CodeBuild to CodeDeploy, which handles the rollout to the target compute platform.
- **CodeBuild** — CodeBuild produces the deployment artifact (zip bundle or Docker image + `imagedefinitions.json`). For EC2 deployments, the zip bundle must include the `appspec.yml`. For ECS, the `imagedefinitions.json` contains the new image URI.
- **EC2 Auto Scaling** — For EC2 blue/green deployments, CodeDeploy provisions a new Auto Scaling Group with the new version, performs health checks, shifts load balancer traffic, and terminates the old ASG after the wait period.
- **Lambda Aliases** — Lambda aliases are the CodeDeploy mechanism for traffic shifting. The alias (e.g., `prod`) starts pointing 100% at version 5; CodeDeploy shifts it to version 6 according to the deployment configuration. Without aliases, CodeDeploy cannot shift Lambda traffic.
- **CloudWatch Alarms** — Alarm-based rollback connects deployment health to operational metrics. A CloudWatch alarm on your application's error rate, attached to the CodeDeploy deployment group, provides an automatic circuit breaker for bad deployments.
- **ECS + ALB** — ECS blue/green deployments use two ALB target groups — one for the blue (current) task set and one for the green (new) task set. CodeDeploy updates the ALB listener rule to shift traffic between them.

---

## Exam Traps

- **`appspec.yml` is CodeDeploy, `buildspec.yml` is CodeBuild**: this is the most commonly tested confusion in this module. The exam will describe a scenario involving deployment lifecycle hooks and ask which file — the answer is always `appspec.yml`.
- **ECS CodeDeploy only supports blue/green**: unlike EC2 (which supports in-place and blue/green), CodeDeploy for ECS exclusively uses blue/green deployment with two target groups. Describing an in-place rolling deployment for ECS via CodeDeploy is incorrect.
- **Lambda traffic shifting requires aliases**: CodeDeploy shifts traffic by adjusting alias routing weights. If your Lambda function has no alias configured, CodeDeploy cannot perform gradual traffic shifting. The exam tests whether you know the alias is the required prerequisite.
- **Blue/green costs more because two environments run simultaneously**: during a blue/green deployment, both the old environment (blue) and new environment (green) consume resources until the termination wait period expires. This is worth it in production but students sometimes choose blue/green for cost optimization scenarios — it is the safer, not cheaper, option.
- **Non-zero hook exit code = automatic rollback**: a hook script that exits with 0 is success; any non-zero code (1, 2, 127, etc.) is failure. A ValidateService script that says "health check failed" but exits with 0 does NOT trigger rollback — the exit code is what CodeDeploy evaluates, not the output.

---

## Summary

- CodeDeploy automates application deployments to EC2, Lambda, and ECS with configurable rollout strategies, lifecycle hooks, and automatic rollback.
- The `appspec.yml` file in the deployment bundle defines which files to install and which hook scripts to run at each lifecycle phase for EC2 deployments; for Lambda and ECS it specifies the resource and traffic shift configuration.
- Blue/green is the recommended EC2 production strategy — the old environment is preserved until the termination wait expires, enabling instantaneous rollback by shifting traffic back.
- Lambda traffic shifting (Canary, Linear, AllAtOnce) uses Lambda aliases to incrementally route traffic to the new function version; pre- and post-traffic hook functions validate before and after the shift.
- Automatic rollback is triggered by lifecycle hook failures (non-zero exit code) or CloudWatch alarm breaches during the deployment window — always configure alarm-based rollback for production deployment groups.
- ValidateService is the critical hook — it runs after the application starts and before the old environment is decommissioned; its exit code determines whether the deployment succeeds or rolls back.

---

## Examples

A retail company runs its product catalog service on a fleet of 40 EC2 instances. They use CodeDeploy with a rolling deployment — 25% of instances at a time — and an `appspec.yml` `ValidateService` hook that calls the service's `/health` endpoint and exits non-zero if it returns anything but 200. When a bad release caused the health check to fail on the first batch of 10 instances, CodeDeploy automatically halted the deployment and rolled back those 10 instances before any customers were affected. The remaining 30 instances kept serving the old version throughout. The incident was caught by the hook before the broken version reached half the fleet.

A streaming media company deploys a new recommendation Lambda function using `CodeDeployDefault.LambdaCanary10Percent5Minutes`. For the first five minutes, 10% of invocations hit the new version while 90% continue using the stable alias target. A CloudWatch alarm monitors the new version's error rate; when a bug caused the error rate to spike to 8% (above the 2% threshold) during a canary deployment, CodeDeploy detected the alarm breach and shifted all traffic back to the old version in seconds — before the on-call engineer even received an alert. The canary deployment strategy, combined with CloudWatch alarm-based rollback, contained the blast radius to 10% of traffic for under five minutes.