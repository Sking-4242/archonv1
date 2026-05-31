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

## Examples

A small fintech startup building a payment API uses CodeCommit to host their service's source code. Because all of their other infrastructure already runs in AWS, keeping the repository in CodeCommit means every developer's access is controlled purely through IAM roles — no separate GitHub organization, no SSH key spreadsheet. When an engineer leaves, revoking their IAM access immediately cuts off repository access too. This maps directly to CodeCommit's core value proposition: tight IAM integration rather than a separate identity layer.

A mid-size e-commerce company uses CodeBuild to compile and test their Java checkout service. Their `buildspec.yml` defines four phases: `install` downloads Java 17, `pre_build` logs into ECR, `build` runs `mvn package` and executes 1,200 unit tests, and `post_build` pushes the Docker image to ECR. They use S3-backed dependency caching to store their Maven `.m2` repository — this alone cut their average build time from 9 minutes to 2.5 minutes. Because CodeBuild is fully managed, they pay only for those 2.5 minutes per build rather than running dedicated Jenkins agents around the clock.

A SaaS platform engineering team stores database migration secrets (DB username, password) in AWS Secrets Manager and references them in the `buildspec.yml` via the `env.secrets-manager` block rather than hardcoding them. During the `pre_build` phase, CodeBuild resolves the secret values at runtime and injects them as environment variables — the values never appear in the buildspec file itself, which is committed to the repository. This pattern illustrates why CodeBuild's native secrets integration matters: it closes the accidental-credential-commit vulnerability that plagues teams who store secrets inline.

## Think About It

1. Why would a company with 50 developers already using GitHub choose NOT to migrate to CodeCommit, even though it offers deeper IAM integration?
2. What would happen if you hardcoded a database password in your `buildspec.yml` and committed it to CodeCommit? How would you remediate it after the fact?
3. How would you decide between using a managed CodeBuild image (e.g., `aws/codebuild/standard:7.0`) versus providing your own custom Docker image for the build environment?
4. Your team's build time jumped from 3 minutes to 12 minutes after adding a new dependency. What CodeBuild features would you investigate first, and in what order?
5. CodeBuild charges per build minute. What are the cost trade-offs compared to running a self-managed Jenkins controller and agent fleet on EC2?

## Quick Check

**Q1.** What file does CodeBuild look for at the root of your repository to define build phases and artifact output?

- A) Dockerfile
- B) buildspec.yml
- C) buildconfig.json
- D) appspec.yml

**Answer: B** — `buildspec.yml` is the CodeBuild-specific file that defines `phases`, `artifacts`, `cache`, and `reports` for a build project.

**Q2.** Which statement best describes CodeCommit's primary advantage over GitHub when used in an AWS environment?

- A) It supports more Git operations than GitHub
- B) It provides unlimited free private repositories
- C) Access control is handled natively through IAM with no separate user management
- D) It supports larger file sizes than any other Git service

**Answer: C** — CodeCommit's key differentiator is that repository access is governed entirely by IAM policies and roles, eliminating a separate identity system.

**Q3.** Where should build-time secrets (API keys, database passwords) be stored when using CodeBuild?

- A) Directly in the `buildspec.yml` file as plaintext
- B) In environment variables set in the CodeBuild project console
- C) In AWS Secrets Manager or Parameter Store, referenced via `env.secrets-manager` or `env.parameter-store` in the buildspec
- D) In a `.env` file committed to CodeCommit

**Answer: C** — CodeBuild resolves Secrets Manager and Parameter Store references at runtime, so sensitive values never appear in source-controlled files or the console UI.

## What's Next

Next up: CodeDeploy — automated application deployment to EC2, Lambda, and ECS.