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

## What's Next

Next up: the Module 20 Canvas Labs — design a full CI/CD pipeline.