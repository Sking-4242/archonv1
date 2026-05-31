---
title: "CodeArtifact, CodeStar, and Cloud9"
type: content
estimated_minutes: 8
cert_tags: ["DVA-C02", "SAA-C03"]
---

# CodeArtifact, CodeStar, and Cloud9

## Overview

Rounding out the AWS developer tools: CodeArtifact provides managed artifact repository management for npm, Maven, PyPI, and NuGet. CodeStar provides a unified project management view. Cloud9 is a browser-based IDE. This lesson covers each and their role in a complete developer workflow.

## AWS CodeArtifact

CodeArtifact is a fully managed artifact repository for package managers: npm, yarn, pip, Maven, Gradle, NuGet, Swift. It proxies public registries (npmjs.com, PyPI) — your builds pull dependencies from CodeArtifact, which caches them internally. Benefits: dependency caching (builds don't fail when npmjs.com is slow), audit trail (track which packages were used in each build), private package publishing (share internal libraries across teams), and package approval workflows (allow only vetted versions). Upstream repositories proxy multiple public sources through a single domain.

## Domain and Repository Structure

CodeArtifact organizes repositories in a domain (an organization-wide namespace). A domain can contain multiple repositories: a public proxy repo (for npmjs.com packages), a private repo (for internal packages), and a shared team repo. Upstream repository chaining lets developers pull from a single endpoint that automatically searches internal repos first, then falls back to public proxies. IAM controls who can publish to and consume from each repository.

## AWS Cloud9

Cloud9 is a browser-based IDE with: a code editor, terminal, debugger, and AWS Toolkit integration. Runs on an EC2 instance in your account (billed for EC2 time). Useful for: remote pair programming (shared environments), isolated development without local setup, and quick AWS CLI experiments. Cloud9 environments automatically stop after inactivity to reduce cost. For most experienced developers, VS Code with the AWS Toolkit extension is more practical — Cloud9 is valuable for onboarding, pair programming, and sandboxed environments.

## AWS CodeGuru

CodeGuru is an ML-powered code review service. CodeGuru Reviewer analyzes pull requests (CodeCommit, GitHub, Bitbucket) and identifies issues: inefficient code, concurrency bugs, resource leaks, AWS API misuse (e.g., inefficient S3 calls). CodeGuru Profiler identifies the most expensive lines of code in production applications by continuous sampling — helps optimize CPU-bound workloads and reduce Lambda cold start time. Both integrate into the development and CI/CD workflow without changing application code.

## Summary

CodeArtifact manages internal and cached external package dependencies across npm, pip, Maven, and NuGet — eliminating public registry dependency in builds. Cloud9 provides browser-based IDE access for pair programming and onboarding. CodeGuru adds ML-powered code review and runtime profiling. These tools complete the AWS developer toolchain from code to production.

## Examples

A development team at a healthcare company has a strict policy against pulling dependencies directly from public internet registries during CI/CD builds — both for security audit reasons and to avoid build failures caused by upstream outages. They set up a CodeArtifact domain with an npm proxy repository connected to npmjs.com. All CodeBuild projects are configured to point their npm registry to this CodeArtifact endpoint. The first time each package is requested, CodeArtifact fetches and caches it; subsequent builds resolve entirely from the internal cache. When npmjs.com had a brief outage one afternoon, their builds kept running without interruption. This maps directly to CodeArtifact's dependency caching use case: decoupling build reliability from public registry availability.

A platform team at a software consultancy maintains a shared React component library used by six product teams. Instead of copy-pasting components or using relative file paths across repositories, they publish versioned packages to a private CodeArtifact repository. Each product team's `package.json` declares the component library as a dependency with a specific version. When the platform team releases v2.3.1 with a security fix, each product team can upgrade at their own pace by bumping the version number and running `npm install`. IAM policies ensure only the platform team's CI service role can publish new versions; all other teams have read-only access. This is the private package publishing pattern: centralized versioned distribution without a public registry.

A large enterprise's security team implements a package approval workflow in CodeArtifact. New open-source packages must pass a vulnerability scan (using CodeGuru or a third-party tool) and receive explicit approval before being added to the approved package list in CodeArtifact. Developer builds can only pull from the approved repository, which acts as a curated allowlist. When a developer tries to add a library with a known CVE, it simply isn't available in CodeArtifact — the build fails before any vulnerable code can reach production. This is a more sophisticated use case showing how CodeArtifact functions as a software supply chain control point, not just a cache.

## Think About It

1. Why would a company choose to proxy public registries (npmjs.com, PyPI) through CodeArtifact rather than simply allowing CodeBuild instances to reach the internet directly?
2. What are the trade-offs of enforcing a strict package approval workflow in CodeArtifact? Who bears the cost, and who benefits?
3. How would upstream repository chaining in CodeArtifact change your troubleshooting process when a build fails to resolve a dependency — compared to a setup where builds pull directly from npmjs.com?
4. CodeGuru Profiler continuously samples a running production application to identify expensive code paths. What are the privacy and performance implications of running a profiler in production, and how does AWS mitigate them?
5. Cloud9 runs on an EC2 instance in your account. How does that change the security model compared to a developer running VS Code on their local laptop with the AWS CLI configured?

## Quick Check

**Q1.** What does CodeArtifact do when a developer requests an npm package that exists in a connected upstream (public npmjs.com) repository but not yet in the internal CodeArtifact repository?

- A) It rejects the request and requires manual approval first
- B) It fetches the package from the upstream registry, caches it internally, and returns it to the developer
- C) It redirects the developer's package manager directly to npmjs.com
- D) It creates an empty placeholder package that must be filled manually

**Answer: B** — CodeArtifact proxies the upstream registry on demand, caching the fetched package internally so that future requests are served from CodeArtifact without re-fetching from the public registry.

**Q2.** Which CodeGuru capability helps identify the most CPU-intensive lines of code in a running production application?

- A) CodeGuru Reviewer
- B) CodeGuru Security
- C) CodeGuru Profiler
- D) CodeGuru Inspector

**Answer: C** — CodeGuru Profiler continuously samples running applications to build a flame graph identifying the most expensive code paths, helping teams optimize performance and reduce compute costs.

**Q3.** In CodeArtifact's domain and repository model, what is the purpose of upstream repository chaining?

- A) To replicate packages across AWS regions for high availability
- B) To allow developers to pull from a single endpoint that searches internal repositories first and falls back to public proxies automatically
- C) To enforce sequential package version approvals across repositories
- D) To synchronize package versions between development and production repositories

**Answer: B** — Upstream chaining means a developer configures one CodeArtifact endpoint; if the package isn't in the private repo, CodeArtifact automatically checks the chained upstream (e.g., the public npmjs.com proxy) without the developer needing to configure multiple registries.

## What's Next

Next up: the Module 20 Canvas Labs — design a full CI/CD pipeline.