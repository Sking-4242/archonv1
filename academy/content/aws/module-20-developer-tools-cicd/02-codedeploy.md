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

## What's Next

Next up: CodePipeline — orchestrating the full CI/CD pipeline from source to production.