---
title: "Amazon ECR"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon ECR

## Overview

Amazon Elastic Container Registry (ECR) is a fully managed **container image registry** for storing, managing, and deploying Docker/OCI container images (and other OCI artifacts like Helm charts). It is where the images your ECS, EKS, and Lambda workloads run from are stored, secured, and scanned. This *service reference* lesson covers repositories and access, image scanning, lifecycle and replication, and what each certification expects.

ECR matters because containers are only as trustworthy and available as the registry they're pulled from. A registry must be secure (private by default, IAM-controlled), integrated with your orchestrators, and able to scan images for vulnerabilities before they reach production. ECR provides this natively on AWS, avoiding the operational and security gaps of self-hosted registries. The core mental model is a set of **repositories** (one per image/artifact) holding **tagged images**, with access governed by **IAM and repository policies**, vulnerability **scanning** built in, and tight integration with the container services that consume the images.

---

## How It Works

You create a **repository** (private by default, or public via the ECR Public Gallery) and push tagged images to it. Pulls and pushes authenticate with **IAM** (via an authorization token from the ECR API, used by the Docker CLI or the orchestrator's execution role). Images are stored encrypted and served with high availability.

ECR provides **image scanning** for vulnerabilities in two modes:

- **Basic scanning** — on-push scanning against the common vulnerabilities database.
- **Enhanced scanning** — powered by **Amazon Inspector**, continuously re-scanning images for OS and programming-language package CVEs as new vulnerabilities are disclosed, with findings in Inspector/Security Hub.

**Lifecycle policies** automatically expire old or untagged images to control storage cost, and **cross-Region/cross-account replication** copies images where they're needed for multi-Region deployments and DR.

---

## Key Features

- **Private repositories** (default) with IAM and **repository policies** for fine-grained and cross-account access; **ECR Public** for sharing.
- **Vulnerability scanning** — basic (on push) and **enhanced** (continuous, via Amazon Inspector).
- **Lifecycle policies** to expire untagged/old images and control cost.
- **Replication** across Regions and accounts for availability and DR.
- **Encryption** at rest with KMS and **image immutability** (prevent tag overwriting for supply-chain integrity).
- **Pull-through cache** for upstream public registries, and OCI-artifact support (Helm charts, etc.).

---

## Configuration Reference

- **Create private repositories** and grant access via the consuming service's role (e.g., the ECS **execution role** or EKS node/pod role) and repository policies for cross-account pulls.
- **Enable enhanced scanning** (Inspector) for continuous CVE detection, and set **image immutability** for integrity.
- **Add lifecycle policies** to expire stale images, and **replication** for multi-Region/DR.
- **Encrypt with KMS** and use **pull-through cache** to mirror public images privately.

---

## Operations and Troubleshooting

- **ECS/EKS can't pull the image.** Usually the consuming role (ECS execution role, EKS node/IRSA role) lacks ECR permissions, the repository policy denies cross-account access, or there's no network path (private subnets need an **ECR VPC endpoint** or NAT, plus an S3 endpoint for layer storage).
- **Vulnerable images reaching production.** Enable **enhanced scanning** and gate deployments on scan results; use image immutability to prevent tag tampering.
- **Storage cost growth.** Add **lifecycle policies** to expire untagged/old images.
- **Cross-Region deploys pulling slowly.** Use **replication** to keep images local to each Region.

---

## Integrations

ECR stores the images run by **Amazon ECS**, **Amazon EKS**, and **AWS Lambda** (container images); authenticates with **IAM**; scans with **Amazon Inspector** (enhanced) feeding **Security Hub**; encrypts with **KMS**; is reachable privately via **VPC endpoints**; and fits into CI/CD with **CodeBuild/CodePipeline**. It is the registry backbone of the AWS container ecosystem and a key supply-chain security control point.

---

## Pricing and Cost Considerations

ECR charges for **storage** (per GB-month of images stored) and **data transfer** (out to the internet/cross-Region; pulls within the same Region to AWS compute are free). Enhanced scanning (Inspector) bills per image scan. The cost levers are **lifecycle policies** to expire stale images, using **replication** judiciously (it duplicates storage), and keeping image sizes small. Storage is the main driver for large image catalogs with frequent builds. Exact prices vary by Region.

---

## Exam Relevance

**SAA-C03:** Know ECR as the managed private container registry feeding ECS/EKS/Lambda, with IAM access, replication, and lifecycle policies. Design depth.

**SOA-C03:** Operate the registry — lifecycle policies for cost, replication, scanning, and troubleshooting pull failures (permissions/endpoints). Operations depth.

**SCS-C03:** Secure the supply chain — **enhanced scanning** (Inspector) for image CVEs, repository policies/cross-account control, **image immutability**, KMS encryption, and private pulls via VPC endpoints. Security depth (container/supply-chain security).

---

## Summary

Amazon ECR is a fully managed, private-by-default container image registry holding tagged images in repositories, with access governed by IAM and repository policies. It provides basic (on-push) and **enhanced** (continuous, Inspector-powered) vulnerability scanning, **lifecycle policies** to expire stale images, **cross-Region/account replication**, KMS encryption, and **image immutability** for supply-chain integrity. It feeds ECS, EKS, and Lambda, integrates with Inspector/Security Hub and CI/CD, and is reachable privately via VPC endpoints. The recurring exam points are enhanced scanning for image CVEs, the pull-permission/endpoint causes of failed pulls, and lifecycle policies for cost.

---

## Quick Check

1. What does ECR store, and what consumes those images?
2. What is the difference between basic and enhanced image scanning?
3. An ECS task can't pull its image — what permission and network causes would you check?
4. How do lifecycle policies and replication each serve cost and availability?
5. How does image immutability improve supply-chain security?

---

## What's Next

Pair this with **Amazon ECS** and **Amazon EKS** (image consumers), **Amazon Inspector** (enhanced scanning), and **AWS KMS** (encryption). See the SCS-C03 compute-security lesson.
