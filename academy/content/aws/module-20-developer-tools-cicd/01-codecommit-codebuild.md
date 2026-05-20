---
title: "CodeCommit and CodeBuild"
type: content
estimated_minutes: 8
cert_tags: ["DVA-C02", "SAA-C03"]
---

# CodeCommit and CodeBuild

## Overview

AWS provides a fully integrated set of developer tools for source control, build, test, and deployment. This lesson covers CodeCommit (managed Git) and CodeBuild (managed build service) — the first two stages of an AWS-native CI/CD pipeline.

## AWS CodeCommit

CodeCommit is a fully managed, private Git repository service. It integrates with IAM for access control (no separate user management, no SSH key distribution beyond what IAM handles), supports all standard Git operations, and scales to any repository size. Triggers can invoke Lambda or SNS on branch pushes, tags, or pull request events. CodeCommit is regional — repositories live in one region. For teams already on GitHub or GitLab, CodeCommit offers little advantage; use the native service. CodeCommit's value is deep IAM integration and keeping code within the AWS boundary.

## AWS CodeBuild

CodeBuild is a fully managed build service that compiles source code, runs tests, and produces deployable artifacts. Build environments run in isolated Docker containers — you specify a managed image (Amazon Linux 2, Ubuntu, Windows Server) or a custom Docker image with your exact toolchain. The build specification (`buildspec.yml`) defines phases: install, pre_build, build, post_build. CodeBuild scales automatically — no idle build servers. Cost: per minute of build time. Integrated with ECR (pull/push images), S3 (artifact storage), Secrets Manager (build-time secrets), and CloudWatch Logs.

## buildspec.yml Structure

A `buildspec.yml` at the repo root defines build commands per phase. The `phases.build.commands` section runs your actual build (e.g., `npm run build`, `mvn package`, `docker build`). The `artifacts` section specifies files to publish to S3. The `reports` section sends test results (JUnit XML) to CodeBuild test reports. Environment variables from Parameter Store and Secrets Manager are resolved automatically via `env.parameter-store` and `env.secrets-manager` sections — no secrets in the buildspec.

## CodeBuild Reports and Caching

CodeBuild test reports visualize pass/fail and trends across builds — critical for tracking test coverage and flaky test rates. Build caching (S3-backed) stores dependency downloads (npm node_modules, Maven .m2) and reuses them across builds, significantly reducing build time for dependency-heavy projects. Local caching (Docker layer cache) speeds up container image builds.

## Summary

CodeCommit is managed Git with IAM-native access control. CodeBuild is managed build compute with no idle servers. buildspec.yml defines all build phases and artifact output. Use Parameter Store and Secrets Manager for build-time secrets — never hardcode them in buildspec. CodeBuild reports provide visibility into test trends. Together they form the first two stages of an AWS-native pipeline.

## What's Next

Next up: CodeDeploy — automated application deployment to EC2, Lambda, and ECS.