---
title: "CodeArtifact, CodeStar, and Cloud9"
type: content
estimated_minutes: 10
cert_tags: ["DVA-C02", "SAA-C03"]
---

# CodeArtifact, CodeStar, and Cloud9

## Overview

Three services complete the AWS developer toolchain: CodeArtifact manages software package dependencies (npm, Maven, PyPI, NuGet), acting as an internal proxy for public registries and a private repository for internal packages. Cloud9 is a browser-based IDE that runs on EC2 — useful for remote pair programming, sandboxed development, and onboarding. CodeGuru provides ML-powered code review and production profiling, integrating into the development and CI/CD workflow automatically.

The problem CodeArtifact solves is dependency risk. When CodeBuild instances pull packages directly from npmjs.com or PyPI, builds fail when those registries are unavailable. Attackers can also inject malicious packages via typosquatting or dependency confusion attacks — poisoning packages that match your internal library names on public registries. CodeArtifact eliminates both risks: builds pull from an internal cache (resilient to public registry outages) and a controlled allowlist (resilient to supply chain attacks).

For the DVA exam, understand CodeArtifact domains, repositories, upstream chaining, and the authorization token model. Know when Cloud9 is appropriate. Understand CodeGuru Reviewer and Profiler at a conceptual level. After this lesson, you will be able to design a dependency management architecture that decouples build reliability from public registry availability.

---

## Core Concepts

### AWS CodeArtifact — Domains and Repositories

CodeArtifact organizes artifacts in a two-level hierarchy:

**Domains** are an organization-level namespace. A domain groups repositories across an organization and provides a single administrative boundary for permissions, storage, and encryption. All repositories in a domain share the same KMS key for encryption.

**Repositories** within a domain serve packages to specific package managers. Repository types:
- **Private internal repository**: your team publishes versioned packages here (internal libraries, shared components)
- **Upstream proxy repository**: a pass-through proxy for a public registry (npmjs.com, PyPI, Maven Central, NuGet Gallery). Packages fetched from the upstream are cached automatically on first access.

**Supported package formats**: npm/yarn, pip/twine, Maven/Gradle, NuGet, Swift, generic (any file type via the generic package format).

---

### Upstream Repository Chaining

**Upstream chaining** is CodeArtifact's mechanism for searching multiple repositories transparently from a single endpoint. A developer or CI system configures one CodeArtifact repository URL in their package manager. When a package is requested:

1. CodeArtifact searches the primary repository first (your private packages)
2. If not found, searches each configured upstream repository in order
3. If found in an upstream (e.g., the npmjs.com proxy), fetches and caches it locally, then serves it

The developer receives the package from their local CodeArtifact endpoint regardless of where it ultimately came from. This is transparent — the package manager never directly contacts npmjs.com.

**Dependency confusion defense**: upstream chaining combined with internal package name reservation prevents dependency confusion attacks. If your internal package `@company/auth` is in the private repository, CodeArtifact serves it from there and never falls through to a public registry where a malicious `@company/auth` might exist.

---

### Package Approval Workflows and Retention

**Package origin controls** (set per repository) define whether packages can be published directly (`internal`) or only via upstream fetch (`upstream`). This enforces that packages entering the repository come from approved sources.

**Retention**: once a package version is cached from an upstream, CodeArtifact retains it until you explicitly delete it or it is evicted by retention policy. This means your builds remain reproducible even if the upstream version is later unpublished — a critical property for regulated builds that must be reproducible years later.

**IAM integration**: publish and consume permissions are separate. An IAM role for CI/CD might have `codeartifact:PublishPackageVersion` and `codeartifact:GetPackageVersionAsset`. Developer roles might have only consume permissions. `codeartifact:GetAuthorizationToken` is required to generate the short-lived (12-hour) bearer token that package managers use to authenticate.

---

### AWS Cloud9

Cloud9 is a browser-based IDE that runs inside a managed EC2 instance in your account. It provides a code editor, integrated terminal, and an AWS Toolkit with pre-configured AWS CLI credentials from the EC2 instance's IAM role. You pay EC2 instance rates while the environment is running; Cloud9 automatically stops the EC2 instance after a configurable inactivity period.

**Primary use cases:**
- **Pair programming**: Cloud9 environments support real-time collaboration — multiple IAM users can connect to the same environment simultaneously, share the terminal, and edit the same files
- **Onboarding**: new team members get a fully configured development environment with no local setup — no "it works on my machine" issues
- **Sandboxed experimentation**: run AWS CLI experiments or test deployment scripts in a controlled environment without touching a local workstation

**For day-to-day development**, most experienced engineers prefer VS Code (or another local IDE) with the AWS Toolkit extension — more productive, no EC2 cost. Cloud9 fills specific collaborative and onboarding niches.

---

### AWS CodeGuru

CodeGuru is an ML-powered service with two capabilities:

**CodeGuru Reviewer** analyzes code in pull requests (CodeCommit, GitHub, Bitbucket, S3 archives) and flags: security vulnerabilities (hardcoded secrets, injection flaws, insecure API usage), resource leaks (unclosed database connections, file handles), concurrency bugs, inefficient AWS SDK usage (excessive API calls, pagination antipatterns), and code quality issues. Findings appear inline on the pull request, like comments from a senior reviewer.

**CodeGuru Profiler** continuously samples a running application (Lambda, EC2, ECS, on-premises) to build a flame graph showing where CPU time is spent. It identifies the most expensive code paths and surfaces actionable recommendations ("this function is responsible for 30% of CPU time; consider caching this result"). Profiling is done via an agent or SDK — no code changes are needed for most runtimes.

---

## Configuration Reference

### Example: Configure npm to Use CodeArtifact (in buildspec.yml)

```yaml
phases:
  pre_build:
    commands:
      # Get a short-lived CodeArtifact auth token (valid 12 hours)
      - export CODEARTIFACT_TOKEN=$(aws codeartifact get-authorization-token \
          --domain mycompany \
          --domain-owner 123456789012 \
          --query authorizationToken \
          --output text \
          --region us-east-1)

      # Configure npm to use CodeArtifact as the registry
      - npm config set registry https://mycompany-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/npm-internal/
      - npm config set //mycompany-123456789012.d.codeartifact.us-east-1.amazonaws.com/npm/npm-internal/:_authToken $CODEARTIFACT_TOKEN

  build:
    commands:
      - npm ci             # now pulls from CodeArtifact (cache + upstream proxy) instead of npmjs.com
      - npm run test
      - npm run build
```

> **Note:** The CodeBuild service role must have `codeartifact:GetAuthorizationToken` and `sts:GetServiceBearerToken` permissions. The authorization token expires in 12 hours — generate it fresh at the start of each build in the `pre_build` phase. Do not hardcode it as a static credential.

---

### Example: Create a CodeArtifact Domain and Repository with npm Upstream

```bash
# Step 1: Create the domain (organization namespace)
aws codeartifact create-domain \
  --domain mycompany \
  --region us-east-1

# Step 2: Create the npmjs.com upstream proxy repository
aws codeartifact create-repository \
  --domain mycompany \
  --domain-owner 123456789012 \
  --repository npm-upstream-proxy \
  --description "Proxy for npmjs.com" \
  --upstreams '[{"repositoryName": "npm-public"}]' \
  --region us-east-1
# npm-public is CodeArtifact's built-in connection to npmjs.com

# Step 3: Create the internal repository with upstream pointing to the proxy
aws codeartifact create-repository \
  --domain mycompany \
  --domain-owner 123456789012 \
  --repository npm-internal \
  --description "Internal npm packages + npmjs.com cache" \
  --upstreams '[{"repositoryName": "npm-upstream-proxy"}]' \
  --region us-east-1
# Result: builds use npm-internal → falls through to npm-upstream-proxy → npmjs.com
# Internal packages are served first; public packages are cached on first fetch
```

---

## How to Decide

**CodeArtifact vs. pulling directly from public registries:**

| Factor | CodeArtifact | Direct from npmjs.com / PyPI |
|---|---|---|
| Build resilience to registry outages | ✅ Cached locally | ❌ Fails if registry is down |
| Dependency confusion attack surface | ✅ Controlled upstream | ❌ Public registry can be poisoned |
| Audit trail of packages in production builds | ✅ Per-package version history | ❌ No centralized record |
| Private internal package sharing | ✅ Native | ❌ Requires external hosting |
| Compliance (HIPAA, PCI, SOC2) | ✅ Air-gapped builds possible | ❌ External traffic required |
| Additional cost and configuration | Higher | Lower |

Use CodeArtifact when any of the following apply: regulated environment, internal packages to share, need for reproducible builds over years, or security policy prohibits direct public registry access from CI/CD.

**Cloud9 vs. local IDE:**

Use Cloud9 for: pair programming sessions, onboarding new team members to a complex environment, running experiments that require AWS IAM permissions without configuring local credentials, or sandboxed work on shared infrastructure. Use VS Code + AWS Toolkit for day-to-day development — more performant and no EC2 cost during idle time.

---

## How This Connects

- **CodeBuild** — CodeBuild is the primary consumer of CodeArtifact packages. The `pre_build` phase generates an authorization token and configures the package manager to point to CodeArtifact. All package downloads during `npm ci`, `pip install`, or `mvn package` resolve through CodeArtifact.
- **IAM** — CodeArtifact permissions are IAM-native. Publish and consume rights are separate IAM actions. CodeBuild service roles need consume-only access; CI/CD roles for publishing internal packages need publish access. Authorization tokens are generated via `codeartifact:GetAuthorizationToken` and expire in 12 hours.
- **CodePipeline** — CodeArtifact packages published by one team can trigger CodePipeline executions in other teams' pipelines via EventBridge, enabling automated downstream testing when a shared library is updated.
- **CodeGuru Reviewer** — Integrates with CodeCommit pull requests and GitHub via connection. When a PR is opened, Reviewer automatically posts findings as inline comments. In CodePipeline, a CodeGuru Reviewer action in the Build stage can fail the build on high-severity findings.
- **CloudWatch** — CodeArtifact logs package operations to CloudWatch; CodeGuru Profiler publishes profiling data to CloudWatch and displays it in the CodeGuru console as a flame graph.

---

## Exam Traps

- **Authorization token is short-lived (12 hours max)**: the `GetAuthorizationToken` API returns a bearer token valid for 12 hours by default (configurable down to 900 seconds). Never cache or hardcode this token. Generate it fresh at the start of each build in `pre_build`.
- **CodeArtifact does not build packages — it stores and proxies them**: CodeArtifact is a repository service, not a build service. Students sometimes confuse it with CodeBuild. CodeBuild builds; CodeArtifact stores the outputs and proxies external dependencies.
- **Cloud9 incurs EC2 costs**: Cloud9 is not serverless. It runs on an EC2 instance in your account billed at standard EC2 rates. The auto-stop feature reduces cost but does not eliminate it. A question about cost for a development environment — especially for students — may be testing whether you know Cloud9 is not free.
- **Upstream repository chaining order matters**: if your private repository and the public proxy both have a package named `auth-utils`, CodeArtifact serves the private version first (searched before the upstream). This is the intended behavior for internal packages — but a misconfigured chain where the public proxy is searched first could serve a malicious public version instead of your internal one.
- **CodeGuru Reviewer finds issues in pull requests, not at runtime**: Reviewer analyzes static code at PR time. CodeGuru Profiler analyzes live running applications. The exam tests whether you know which tool applies to which problem (static analysis vs. production performance).

---

## Summary

- CodeArtifact provides a managed artifact repository with domain/repository hierarchy, upstream proxy caching of public registries (npm, PyPI, Maven, NuGet), and IAM-native access control.
- Upstream repository chaining lets package managers resolve from a single endpoint that searches private packages first and falls through to public registry caches automatically.
- CodeArtifact authorization tokens are short-lived (max 12 hours) and must be generated fresh at build time — never stored as static credentials.
- Cloud9 is a browser-based IDE on EC2 — primary use cases are pair programming, onboarding, and sandboxed AWS experimentation; not recommended for daily development where local IDEs are more productive.
- CodeGuru Reviewer analyzes code at pull request time for security, resource leak, and quality issues; CodeGuru Profiler continuously samples running production applications to identify expensive code paths.
- CodeArtifact's dependency retention guarantees that cached package versions remain available for reproducible builds even if the upstream registry removes the version.

---

## Examples

A development team at a healthcare company has a strict security policy prohibiting CodeBuild from accessing the public internet. All package dependencies must flow through CodeArtifact. They set up a CodeArtifact domain with npm, pip, and Maven proxy repositories. CodeBuild's VPC configuration uses a NAT gateway with outbound filtering to allow only CodeArtifact endpoints. The first run of each build fetches packages through CodeArtifact's upstream proxy (which has public internet access via an internal CodeArtifact mechanism), caching them locally. Subsequent builds are fully resolved within the AWS network. When npmjs.com experienced an outage one afternoon, their builds kept running from the cache without interruption.

A platform team at a software consultancy maintains a shared React component library used by six product teams. They publish versioned packages to a private CodeArtifact repository. Each product team's `package.json` declares the component library as `@company/ui-components: "^2.3.1"`. When the platform team publishes v2.4.0 with a security fix, an EventBridge event from CodeArtifact triggers a notification to all downstream teams. Each team upgrades at their own pace. IAM policies ensure only the platform team's CI role has `codeartifact:PublishPackageVersion` — all other roles have read-only access. No team can accidentally overwrite the shared library with a bad version.

A senior engineer at a logistics company noticed that their main service's Lambda function had a 300ms cold start even after optimization. They enabled CodeGuru Profiler on the function. Within 24 hours, the flame graph revealed that 40% of each cold start was spent loading and deserializing a large configuration JSON file from S3 on every invocation. The Profiler recommendation suggested caching the configuration in a module-level variable so it persisted across warm invocations. After implementing the change, cold start dropped to 90ms and warm invocations were 35% faster. The finding came from automated profiling — no one had to manually profile the function or analyze raw traces.

---

## Think About It

1. Why would a company choose to proxy public registries through CodeArtifact rather than allowing CodeBuild instances to reach the internet directly — even if the public registries are reliable?
2. What is a dependency confusion attack, and how does CodeArtifact's upstream chaining model defend against it when configured correctly?
3. The CodeArtifact authorization token expires in 12 hours. What would happen in a build that takes longer than 12 hours — and how would you design the build to handle this?
4. CodeGuru Profiler continuously samples a running production Lambda function. What are the performance and cost implications of profiling, and how does AWS mitigate them?
5. Cloud9 runs on an EC2 instance in your account. How does this change the security model for a developer compared to using VS Code on their local laptop with long-lived IAM access keys? (Cloud9 uses the EC2 instance's IAM role for temporary credentials automatically — no long-lived access keys on the developer's machine. This eliminates a common credential leak vector. The trade-off is that the EC2 instance itself must have appropriately scoped IAM permissions, and access to the Cloud9 environment must be controlled via IAM.)