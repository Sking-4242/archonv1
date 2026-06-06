---
title: "CodeCommit and CodeBuild"
type: content
estimated_minutes: 12
cert_tags: ["DVA-C02", "SAA-C03"]
---

# CodeCommit and CodeBuild

## Overview

Modern software delivery on AWS starts with two foundational services: CodeCommit, a fully managed private Git repository, and CodeBuild, a fully managed build and test service. Together they form the first two stages of an AWS-native CI/CD pipeline — source control and build execution — without requiring any servers to manage, patch, or scale.

The problem both services solve is operational overhead. Self-managed Git servers need OS patching, storage management, and backup procedures. Self-managed build servers (Jenkins, TeamCity) sit idle between builds, costing money and requiring maintenance regardless. CodeCommit and CodeBuild eliminate this: CodeCommit scales to any repository size and CodeBuild scales to any build concurrency, with zero idle infrastructure between builds.

For the DVA exam, understand CodeBuild's `buildspec.yml` structure, how to inject secrets at build time, caching strategies, and the IAM integration model for CodeCommit. SAA adds CodeBuild as a pipeline stage within CodePipeline. After this lesson, you will be able to configure a CodeBuild project from scratch, write a correct `buildspec.yml`, and explain why CodeCommit's IAM-native model matters in enterprise AWS environments.

---

## Core Concepts

### AWS CodeCommit

> **⚠️ Exam-relevant legacy content.** AWS deprecated CodeCommit for new customers in July 2024. The concepts below remain tested on DVA-C02 and SAA-C03, but CodeCommit should not be used for new projects. For new source control on AWS, use GitHub, GitLab, or Bitbucket connected via **AWS CodeStar Connections**, which integrates natively with CodePipeline and CodeBuild.

CodeCommit is a fully managed, private Git repository service. It supports all standard Git operations — clone, push, pull, branch, merge, pull requests, tags — and scales to any repository size and number of contributors. There are no repository size limits and no separate user management system: access is controlled entirely through IAM policies and roles.

> **Important (2024 update):** AWS announced in July 2024 that CodeCommit is no longer available to new customers. Existing customers can continue using it, but no new repositories can be created in accounts that did not already have CodeCommit enabled. For new projects, AWS recommends connecting to GitHub, GitLab, or Bitbucket via **CodeStar Connections** (or the newer **AWS Connection** resource), which integrates with CodePipeline just as CodeCommit does. The concepts covered here remain exam-relevant since CodeCommit appears on certification exams, and many existing pipelines continue to use it.

**IAM-native access control** is CodeCommit's defining characteristic. Every developer's Git access is their IAM identity — the same identity that governs their console access, CLI access, and programmatic access to all other AWS services. When an engineer leaves the organization, revoking their IAM access simultaneously revokes their Git access. No separate deprovisioning step, no SSH key spreadsheets. HTTPS and SSH authentication are both supported, both verified against IAM credentials.

**Triggers and notifications**: CodeCommit triggers invoke Lambda or SNS on branch events (push, tag creation, pull request updates), enabling automated workflows like triggering a CodePipeline execution on a main branch push or notifying a Slack channel on pull request activity.

**When to use GitHub or GitLab instead**: for teams already on GitHub or GitLab with existing workflows, integrations, and tooling, CodeCommit offers limited advantage. Its primary value is IAM integration and keeping source code within the AWS security boundary — which matters for regulated industries (finance, healthcare) where data residency and unified access control are requirements.

---

### AWS CodeBuild

CodeBuild is a fully managed build service. When triggered, CodeBuild provisions a clean Docker container, runs your build commands, produces output artifacts, and terminates — you pay only for the build time consumed, with nothing running when builds are not in progress.

**Build environments**: choose a managed image (Amazon Linux 2, Ubuntu 22, Windows Server) for standard runtimes, or specify a custom Docker image from ECR for exact toolchain control. Each build runs in a fresh, isolated container — no state bleeds between builds, no dependency on previous build outcomes.

**Scaling**: CodeBuild scales automatically to run concurrent builds without any configuration. A team of 50 developers pushing simultaneously gets 50 concurrent builds — no queue management, no build agent sizing decisions.

**Integration**: CodeBuild integrates natively with CodePipeline (as a Build or Test stage action), CloudWatch Logs (all build output streamed automatically), ECR (pull and push Docker images with managed credentials), Secrets Manager and Parameter Store (inject secrets at build time), and S3 (artifact storage).

---

### buildspec.yml

The `buildspec.yml` file at the repository root defines all build behavior. It has four sections:

**`env`**: declare environment variables, resolve values from Parameter Store (`parameter-store`) or Secrets Manager (`secrets-manager`). Secrets resolved here are available as environment variables during the build but are never stored in the buildspec or visible in the console.

**`phases`**: four sequential phases:
- `install`: install runtimes and tools (e.g., specific Node version)
- `pre_build`: pre-build preparation (log into ECR, run dependency installs)
- `build`: the actual build commands (compile, test, package)
- `post_build`: post-build actions (push Docker image, tag artifacts)

**`artifacts`**: specify which files to package and upload to S3 as the build output (consumed by downstream CodePipeline stages or available for download).

**`reports`**: send test results in JUnit or Cucumber format to CodeBuild Test Reports for pass/fail trending and flaky test tracking.

**`cache`**: specify paths to cache in S3 (e.g., `node_modules`, Maven `.m2`) or use Docker layer caching — reused on the next build to dramatically reduce dependency download time.

---

### Build Caching and Reports

**S3-backed caching**: specify cache paths in the `buildspec.yml` `cache.paths` section. CodeBuild uploads the cached directories to S3 after the first build and restores them at the start of subsequent builds, before the `install` phase runs. This reduces `npm install` time from minutes to seconds on dependency-heavy projects.

**Docker layer caching**: for builds that produce Docker images, enabling Docker layer caching on the CodeBuild project causes Docker to reuse unchanged image layers from previous builds, dramatically reducing build time for images where only the application layer changes.

**Test reports**: the `reports` section sends JUnit XML or Cucumber JSON test results to CodeBuild. The console shows test trend graphs, pass rates, and individual test failure details across builds, enabling teams to spot flaky tests and track coverage trends over time.

---

## Configuration Reference

### Example: Complete buildspec.yml for a Node.js Application

```yaml
version: 0.2

env:
  parameter-store:
    SONAR_TOKEN: /prod/codebuild/sonar-token   # resolved from SSM Parameter Store at runtime
  secrets-manager:
    DB_PASSWORD: prod/rds/app-password:password  # resolved from Secrets Manager at runtime

phases:
  install:
    runtime-versions:
      nodejs: 18                               # install Node 18 runtime
    commands:
      - npm ci --cache .npm                    # ci is faster than install for clean builds

  pre_build:
    commands:
      - echo "Logging into ECR..."
      - aws ecr get-login-password --region $AWS_DEFAULT_REGION |
          docker login --username AWS --password-stdin $ECR_REGISTRY
      # ECR_REGISTRY is set automatically from the CodeBuild environment variable

  build:
    commands:
      - npm run test -- --reporter=jest-junit   # run tests, output JUnit XML
      - npm run build                            # compile TypeScript / bundle assets
      - docker build -t $ECR_REPO:$CODEBUILD_RESOLVED_SOURCE_VERSION .
      # CODEBUILD_RESOLVED_SOURCE_VERSION is the commit SHA — use for image tagging

  post_build:
    commands:
      - docker push $ECR_REPO:$CODEBUILD_RESOLVED_SOURCE_VERSION
      - docker tag $ECR_REPO:$CODEBUILD_RESOLVED_SOURCE_VERSION $ECR_REPO:latest
      - docker push $ECR_REPO:latest
      - printf '[{"name":"app","imageUri":"%s"}]' "$ECR_REPO:$CODEBUILD_RESOLVED_SOURCE_VERSION" > imagedefinitions.json
      # imagedefinitions.json is consumed by CodeDeploy ECS stages in CodePipeline

artifacts:
  files:
    - imagedefinitions.json       # pass image URI to downstream CodePipeline stages
  discard-paths: yes

reports:
  jest-results:
    files:
      - "test-results/junit.xml"   # must match where jest-junit writes its output
    file-format: JUNITXML

cache:
  paths:
    - ".npm/**/*"                  # cache npm download cache between builds
```

> **Note:** Never hardcode secrets in `buildspec.yml`. The `env.secrets-manager` and `env.parameter-store` blocks resolve values at runtime — the actual secret values never appear in the file, the console, or the build logs. CodeBuild automatically redacts resolved secret values from log output.

---

### Example: Create a CodeBuild Project (AWS CLI)

```bash
aws codebuild create-project \
  --name prod-api-build \
  --source '{
    "type": "CODECOMMIT",
    "location": "https://git-codecommit.us-east-1.amazonaws.com/v1/repos/prod-api",
    "buildspec": "buildspec.yml"
  }' \
  --environment '{
    "type": "LINUX_CONTAINER",
    "image": "aws/codebuild/standard:7.0",    
    "computeType": "BUILD_GENERAL1_MEDIUM",   
    "privilegedMode": true,                   
    "environmentVariables": [
      {"name": "ECR_REGISTRY", "value": "123456789012.dkr.ecr.us-east-1.amazonaws.com", "type": "PLAINTEXT"},
      {"name": "ECR_REPO",     "value": "123456789012.dkr.ecr.us-east-1.amazonaws.com/prod-api", "type": "PLAINTEXT"}
    ]
  }' \
  --artifacts '{"type": "S3", "location": "my-pipeline-artifacts", "packaging": "ZIP"}' \
  --service-role "arn:aws:iam::123456789012:role/codebuild-service-role" \
  --cache '{"type": "S3", "location": "my-build-cache-bucket/prod-api"}' \
  --region us-east-1
# computeType BUILD_GENERAL1_MEDIUM: 4 vCPU, 7 GB RAM — right-size for your build
# privilegedMode true: REQUIRED for Docker builds — allows Docker daemon inside the container
# cache: S3-backed caching — the bucket/prefix stores cached paths between builds
```

> **Common mistake:** Forgetting `privilegedMode: true` when building Docker images causes the build to fail silently with a Docker daemon error. Any build that runs `docker build` requires privileged mode.

---

## How to Decide

**CodeCommit vs. GitHub / GitLab:**

| Factor | CodeCommit | GitHub / GitLab |
|---|---|---|
| Access controlled by IAM | ✅ Native | ❌ Separate identity |
| Existing team tooling | Only if starting fresh | ✅ If team already uses it |
| Regulated environment (HIPAA, PCI) | ✅ Stays within AWS | Depends on region/compliance |
| Third-party integrations (Dependabot, Actions) | ❌ Limited | ✅ Extensive |
| Default choice for new AWS-native projects | ✅ | Use if team prefers |

**CodeBuild compute type sizing:**

- `BUILD_GENERAL1_SMALL` (2 vCPU, 3 GB): simple compile-and-test, no Docker
- `BUILD_GENERAL1_MEDIUM` (4 vCPU, 7 GB): standard application builds, Docker image builds
- `BUILD_GENERAL1_LARGE` (8 vCPU, 15 GB): large monorepos, ML model packaging, multi-stage Docker builds
- `BUILD_GENERAL1_2XLARGE` (72 vCPU, 145 GB): extremely large builds, parallel test execution

Start with Medium. If builds consistently use >80% of available memory or take longer than expected, size up. Monitor CloudWatch `MemoryUtilization` per build project.

**Caching strategy:**

Use S3-backed caching for: npm, pip, Maven, Gradle, Yarn — anything that downloads packages from the internet. Use Docker layer caching for: multi-stage Docker builds where base layers change infrequently. Skip caching if: build is simple (< 30 seconds) or the cache invalidation cost (upload/download) exceeds the save.

---

## How This Connects

- **CodePipeline** — CodeCommit is the standard Source stage provider; CodeBuild is the standard Build stage provider. A push to a CodeCommit branch triggers EventBridge, which starts the pipeline, which invokes CodeBuild with the source artifact from CodeCommit.
- **ECR** — CodeBuild's most common build output for containerized applications is a Docker image pushed to ECR. The built image URI (in `imagedefinitions.json`) flows downstream to CodeDeploy for ECS deployment.
- **Secrets Manager / Parameter Store** — CodeBuild resolves secrets at build time via the `buildspec.yml` `env` section. No secrets are stored in the build configuration or source code.
- **CloudWatch Logs** — All CodeBuild output streams to a CloudWatch Log Group automatically. Build failures are visible in CloudWatch Logs Insights and can trigger CloudWatch Alarms for notification.
- **S3** — Build artifacts (compiled code, Docker image digests, deployment packages) are stored in S3 between pipeline stages. S3 is also the CodeBuild cache backend.
- **CodeArtifact** — CodeBuild projects can pull internal packages from CodeArtifact by configuring the package manager's registry URL in the `pre_build` phase, using a CodeArtifact authorization token resolved at build time.

---

## Exam Traps

- **`appspec.yml` vs. `buildspec.yml`**: `buildspec.yml` is the CodeBuild configuration file (build phases and artifacts). `appspec.yml` is the CodeDeploy configuration file (deployment lifecycle hooks). The exam tests this specifically — a question about defining build commands points to `buildspec.yml`, a question about deployment hooks points to `appspec.yml`.
- **CodeBuild does not run on EC2 instances you manage**: it provisions isolated containers per build. Students sometimes describe CodeBuild as "managed Jenkins" — it is not; there are no persistent build agents and no master/worker topology.
- **`privilegedMode: true` is required for Docker builds**: this is a common configuration omission. CodeBuild cannot run `docker build` without it because the Docker daemon requires elevated kernel capabilities.
- **Secrets in plaintext `environmentVariables` are visible in the console**: using `"type": "PLAINTEXT"` for secrets makes them visible in the CodeBuild console and in CloudTrail logs. Always use `"type": "PARAMETER_STORE"` or `"type": "SECRETS_MANAGER"` for sensitive values — or the `buildspec.yml` `env` block.
- **CodeCommit is region-specific**: repositories exist in one AWS region. Cross-region replication requires an explicit replication setup. A question describing a multi-region DR strategy that needs source code available in a secondary region requires explicit CodeCommit replication or a cross-region Git mirror.

---

## Summary

- CodeCommit is a fully managed private Git service whose access is controlled entirely through IAM — removing the separate identity management layer required by self-hosted Git or third-party SaaS repositories.
- CodeBuild is a fully managed build service that provisions isolated containers per build — no idle build servers, automatic scaling, and pay-per-build-minute pricing.
- The `buildspec.yml` file defines all build behavior: phases, artifact output, test reporting, caching, and secret injection from Parameter Store and Secrets Manager.
- Secrets must never be hardcoded in `buildspec.yml` — always resolve them at runtime via `env.secrets-manager` or `env.parameter-store` blocks.
- Docker builds require `privilegedMode: true` in the CodeBuild project configuration — this is the most common configuration error for container-based build pipelines.
- S3-backed dependency caching and Docker layer caching can reduce build times by 60–90% for dependency-heavy projects.

---

## Examples

A fintech startup building a payment API uses CodeCommit to host their service's source code. Because all their infrastructure runs in AWS, keeping the repository in CodeCommit means every developer's access is controlled through IAM roles — no separate GitHub organization, no SSH key management. When an engineer leaves, revoking their IAM access immediately revokes Git, console, and CLI access simultaneously. The team writes a `buildspec.yml` that resolves database credentials from Secrets Manager during integration tests, runs 1,400 unit and integration tests, and packages a deployment artifact to S3. Build cost: under $8/month for their build volume. They decommissioned their $400/month Jenkins server the week they migrated.

A mid-size e-commerce company uses CodeBuild to build and push Docker images for their microservices fleet. Their `buildspec.yml` defines four phases: `install` downloads Java 17, `pre_build` authenticates to ECR using the managed `aws ecr get-login-password` flow, `build` runs `mvn package` and executes 1,200 tests, and `post_build` pushes the Docker image tagged with the commit SHA. S3-backed Maven `.m2` caching reduced their average build time from 9 minutes to 2.5 minutes — a 70% reduction. They tag every Docker image with the exact commit SHA, giving them a traceable artifact that can be deployed to any environment with full lineage back to the source commit.

A platform engineering team at a healthcare company discovered that a junior developer had accidentally committed an RDS password to a `buildspec.yml` file in CodeCommit six months earlier. After rotating the credential and auditing the blast radius, they implemented a build policy: all CodeBuild projects are scanned by a CodeGuru Reviewer integration that flags any literal string matching credential patterns. They also migrated every secret reference to `env.secrets-manager` blocks, so the actual values never appear in any file committed to source control. The incident cost two weeks of remediation work — a common real-world cost of skipping the secrets management step.

---

## Think About It

1. Why would a company with 50 developers already using GitHub choose NOT to migrate to CodeCommit, even though CodeCommit offers deeper IAM integration? What would make the migration worth it?
2. If you hardcode a database password in your `buildspec.yml` and push it to CodeCommit, the credential is now in Git history even after you delete the file. What steps are required to fully remediate the exposure?
3. How would you decide between using a managed CodeBuild image (e.g., `aws/codebuild/standard:7.0`) versus providing your own custom Docker image stored in ECR for the build environment?
4. Your team's build time jumped from 3 minutes to 12 minutes after adding a new dependency. What CodeBuild features and CloudWatch metrics would you investigate first, and in what order?
5. CodeBuild charges per build minute, while a self-managed Jenkins fleet on EC2 charges for instance uptime. At what build volume and cadence does the cost model flip in favor of each approach?

---

## Quick Check

**Q1.** A CodeBuild project needs to run `docker build` as part of the build process. The build consistently fails with a Docker daemon error. What is the most likely cause and fix?

- A) The CodeBuild service role lacks ECR permissions — add `ecr:GetAuthorizationToken`
- B) The `buildspec.yml` is missing the `artifacts` section — Docker builds require explicit artifact configuration
- C) The CodeBuild environment does not have `privilegedMode: true` enabled — enable it on the project
- D) The managed CodeBuild image does not include Docker — switch to a custom image with Docker installed

**Answer: C** — Docker builds require elevated kernel capabilities unavailable in standard container environments. Enabling `privilegedMode: true` on the CodeBuild project grants the build container the necessary privileges to run the Docker daemon. A is a separate permission issue (for pushing images, not running Docker). B is incorrect — Docker builds work without an `artifacts` section. D is incorrect — all standard CodeBuild managed images include Docker.

---

**Q2.** A `buildspec.yml` references a database password using `env.secrets-manager`. Where does CodeBuild resolve this value, and where does it appear?

- A) CodeBuild resolves it at project creation time and stores it as a plaintext environment variable visible in the console
- B) CodeBuild resolves it from Secrets Manager at build runtime; the value is available as an environment variable during the build and is redacted from logs
- C) CodeBuild fetches it from S3 and injects it via the artifact pipeline
- D) CodeBuild ignores Secrets Manager references — they must be fetched manually in build commands

**Answer: B** — Secrets Manager references in the `env` block are resolved at build start, injected as environment variables for the duration of the build, and automatically redacted from CloudWatch build logs. The value never appears in the buildspec file or the console configuration.

---

**Q3.** Which file defines lifecycle hooks for AWS CodeDeploy deployments, and which file defines build phases for AWS CodeBuild?

- A) Both use `buildspec.yml`
- B) CodeDeploy uses `buildspec.yml`; CodeBuild uses `appspec.yml`
- C) CodeDeploy uses `appspec.yml`; CodeBuild uses `buildspec.yml`
- D) Both use `appspec.yml` with different top-level keys

**Answer: C** — `appspec.yml` is the CodeDeploy configuration file defining lifecycle event hooks (BeforeInstall, AfterInstall, ValidateService). `buildspec.yml` is the CodeBuild file defining build phases, artifacts, and caching. The exam tests this distinction deliberately because both files are YAML and both live in the repository root.

---

## What's Next

The next lesson covers AWS CodeDeploy — the service that takes the artifact produced by CodeBuild and deploys it to EC2, Lambda, or ECS using configurable rollout strategies. Understanding CodeDeploy's deployment configurations and lifecycle hooks is essential for designing safe, zero-downtime deployment pipelines.
