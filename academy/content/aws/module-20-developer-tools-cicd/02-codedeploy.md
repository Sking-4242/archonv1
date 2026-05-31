---
title: "AWS CodeDeploy: Automated Deployments"
type: content
estimated_minutes: 10
cert_tags: ["DVA-C02", "SAA-C03"]
---

# AWS CodeDeploy: Automated Deployments

## Overview

CodeDeploy automates application deployments to EC2, on-premises servers, Lambda, and ECS. It handles the rollout strategy — rolling, blue/green, canary — validates deployment health, and rolls back automatically on failure.

## CodeDeploy Compute Platforms

EC2/On-Premises: CodeDeploy agent runs on instances. An AppSpec.yml defines deployment lifecycle hooks (BeforeInstall, AfterInstall, ApplicationStart, ValidateService). CodeDeploy installs the new application version and runs the hooks in order. Lambda: CodeDeploy shifts traffic from the current Lambda alias to the new version using a configurable deployment preference (all-at-once, canary, linear). ECS: CodeDeploy orchestrates blue/green deployments between ECS task definition revisions using two ALB target groups.

## Deployment Configurations

All-at-once: deploys to all instances/targets simultaneously. Fast but if something fails, all capacity is down. Rolling: deploys to a percentage of instances at a time. In-Place: replaces the current version on running instances. Blue/Green: provisions new instances with the new version, shifts load balancer traffic, and decommissions old instances after a specified wait time. For Lambda, traffic-shifting configurations: Canary (e.g., 10% for 10 minutes, then 100%), Linear (e.g., 10% more every minute until 100%), AllAtOnce.

## Lifecycle Hooks

EC2/on-premises deployments support lifecycle hooks — shell scripts or Lambda functions executed at each phase. Use hooks for: stopping the application before install (ApplicationStop), running smoke tests after install (ValidateService), sending deployment notifications. Hooks must complete within the allotted timeout (default 1 hour, configurable). A hook exit code of 1 (or non-zero) marks the deployment as failed and triggers automatic rollback.

## Rollback

CodeDeploy monitors deployment health and rolls back automatically when: a deployment fails (a lifecycle hook fails), a CloudWatch alarm threshold is breached during deployment, or manually triggered. For EC2 in-place, rollback redeploys the previous version to all failed instances. For blue/green and Lambda, rollback shifts traffic back to the original targets. Automatic rollback with CloudWatch alarms is the recommended pattern — define an error rate alarm and attach it to the deployment group.

## Summary

CodeDeploy automates deployments with configurable rollout strategies: rolling for EC2, blue/green for ECS, traffic-shifting for Lambda. Lifecycle hooks enable validation at each deployment phase. Configure CloudWatch alarm-based automatic rollback for production deployments. CodeDeploy is the standard deployment engine for the AWS CI/CD pipeline.

## Examples

A mid-size retail company runs its product catalog service on a fleet of 40 EC2 instances. They use CodeDeploy with a rolling deployment configuration — 25% of instances at a time — and an `appspec.yml` that runs a `ValidateService` hook calling a health-check endpoint after each batch. When a bad release caused the health check to return 500 errors on the first batch of 10 instances, CodeDeploy automatically halted and rolled back all 10 before any customers were affected. The remaining 30 instances kept serving traffic throughout. This is the classic EC2/on-premises rolling deployment pattern: gradual rollout with hook-based validation limits blast radius.

A streaming media company deploys a new recommendation Lambda function using CodeDeploy's Canary10Percent5Minutes traffic-shifting configuration. For the first five minutes, 10% of invocations hit the new function version while 90% continue using the stable alias. A CloudWatch alarm monitors the new version's error rate; when the error rate spiked to 8% (above the 2% threshold) during a canary deployment last quarter, CodeDeploy detected the alarm breach and shifted all traffic back to the old version within seconds — before the engineering team even received the alert. This illustrates why Lambda canary deployments paired with CloudWatch alarm-based rollback are so powerful: the safeguard is automatic, not dependent on a human watching a dashboard.

A fintech platform runs its trading API on ECS Fargate. Their CodeDeploy blue/green ECS deployment provisions a completely new task set (green) alongside the existing one (blue), then uses two ALB target groups to shift traffic. Their deployment group is configured with a 10-minute wait before terminating the blue task set — long enough for their operations team to run smoke tests against production but short enough to keep costs manageable. If anything looks wrong after the traffic shift, the team can use the CodeDeploy console to immediately re-route traffic back to blue without a redeployment. This highlights the key blue/green advantage: rollback is instantaneous because the old environment still exists.

## Think About It

1. Why is blue/green deployment more expensive than an in-place rolling deployment, and when is that cost justified?
2. What would happen if a `ValidateService` lifecycle hook script exits with code 0 even though the application is actually broken — how would you catch this failure mode?
3. How would you decide between Canary, Linear, and AllAtOnce Lambda traffic-shifting configurations for a payment processing function versus an internal reporting function?
4. CloudWatch alarm-based automatic rollback is described as the recommended production pattern. What specific metric(s) would you alarm on for an EC2 web service, and why?
5. In a blue/green ECS deployment, what are the trade-offs of setting a very short termination wait time (e.g., 1 minute) versus a very long one (e.g., 60 minutes)?

## Quick Check

**Q1.** Which CodeDeploy deployment strategy provisions entirely new infrastructure with the new version, shifts load balancer traffic, and decommissions the old environment after a wait period?

- A) Rolling
- B) In-place
- C) All-at-once
- D) Blue/green

**Answer: D** — Blue/green deploys the new version to a fresh set of instances or tasks, shifts traffic via the load balancer, and only then decommissions the original environment.

**Q2.** What causes CodeDeploy to automatically roll back a deployment?

- A) Any failed unit test in the preceding CodeBuild stage
- B) A lifecycle hook exiting with a non-zero exit code, or a CloudWatch alarm breaching during deployment
- C) A manual approval rejection in CodePipeline
- D) The deployment taking longer than 30 minutes

**Answer: B** — CodeDeploy triggers automatic rollback when a hook script returns a non-zero exit code or when an attached CloudWatch alarm enters ALARM state during the deployment.

**Q3.** Which file defines lifecycle hooks and deployment instructions for EC2/on-premises CodeDeploy deployments?

- A) buildspec.yml
- B) Dockerfile
- C) appspec.yml
- D) taskdef.json

**Answer: C** — The `appspec.yml` file specifies the deployment lifecycle hooks (BeforeInstall, AfterInstall, ValidateService, etc.) and the files to install for EC2 and on-premises deployments.

## What's Next

Next up: CodePipeline — orchestrating the full CI/CD pipeline from source to production.