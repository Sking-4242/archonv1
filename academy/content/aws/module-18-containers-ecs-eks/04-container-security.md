---
title: "Container Security on AWS"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Container Security on AWS

## Overview

Containers change the security threat model in two important ways. First, the unit of deployment is an image — a layered artifact built outside the production environment, potentially containing hundreds of OS packages and third-party libraries with unknown vulnerabilities. Unlike EC2 where you patch a running instance, container security starts at image build time. Second, in a container orchestration cluster, many workloads share compute and network infrastructure — a compromised container can potentially reach other containers' data if access controls at the network and IAM layer are not enforced.

A secure container architecture applies controls at every layer of the lifecycle: image security (what is in the image before it runs), IAM (what AWS services the container can access), secrets management (how credentials reach the container), runtime security (what the running process can do), and network policy (which containers can reach which other containers). No single control is sufficient; each layer protects against the failures of the others.

For the SAA exam, understand ECR image scanning, ECS task roles, secrets injection via task definition, and the basic container security posture. SAP adds Kubernetes NetworkPolicies, IRSA vs. node instance role risks, the Secrets Store CSI Driver for EKS, and runtime security tools like GuardDuty container threat detection. After this lesson, you will be able to design a defense-in-depth container security architecture for both ECS and EKS workloads.

---

## Core Concepts

### Image Security

**The attack surface starts with the base image.** A full Ubuntu base image for a Python API contains 400+ packages — each is a potential vulnerability. Switching to a minimal base (Alpine Linux, Amazon Linux 2 Minimal, distroless images) reduces the package count to under 20. Fewer packages means fewer CVEs, and CVE scan results that are actionable rather than overwhelming.

**ECR image scanning** (powered by Amazon Inspector) scans images on push for OS package vulnerabilities and language-level package vulnerabilities (Python pip, npm, etc.). Findings appear in the ECR console with CVE severity and a fixed-in-version. Critical and high findings can trigger EventBridge events to block image promotion in a CI/CD pipeline — preventing vulnerable images from reaching production.

**Image tag best practices**:
- Never use `latest` in production — it is non-reproducible and mutable
- Tag images with the git commit SHA for exact reproducibility
- Enable **ECR image tag immutability** — prevents overwriting an existing tag with a different image, ensuring the image you tested is the image you deployed
- Reference images by digest (`sha256:abc123...`) in the highest-security environments for complete immutability

---

### IAM: Task Roles and IRSA

**ECS**: every task definition should specify a **task role** — an IAM role assumed by the container code, granting only the permissions that code needs (specific DynamoDB table, specific S3 bucket prefix). This is separate from the **task execution role** (used by ECS infrastructure). Never rely on the EC2 node's instance profile for application-level AWS access.

**EKS**: use **IRSA (IAM Roles for Service Accounts)** to bind Kubernetes service accounts to IAM roles with pod-level scoping (covered in the previous lesson). The critical security concern without IRSA: all pods on an EC2 node share the node's instance profile. Any pod — including low-privilege or compromised pods — can call the EC2 Instance Metadata Service (IMDS) at `169.254.169.254` and retrieve the node's IAM credentials.

**Block IMDS access for EKS pods**: configure pods to not access the instance metadata service, or use IMDSv2 with hop-limit 1 (Fargate enforces this automatically). With hop-limit 1, requests from inside a container (which traverse one network hop from the container to the host) are blocked; the kubelet on the host can still reach IMDS.

---

### Secrets in Containers

**Never bake secrets into images.** Secrets hardcoded in Dockerfiles or application code become part of every image layer — readable from the image, from the container filesystem, and from any registry that stores the image.

**Never pass secrets as plain environment variables** in task definitions or pod specs. Environment variables are visible in `docker inspect`, ECS task metadata, Kubernetes pod descriptions, and CloudTrail API logs.

**Correct patterns:**

For **ECS**: use the `secrets` field in the task definition. ECS fetches the secret from Secrets Manager or Parameter Store at task launch time and injects it as an environment variable or a mounted file. The task execution role must have permission to retrieve the referenced secret.

For **EKS**: use the **Secrets Store CSI Driver** with the **AWS Secrets and Configuration Provider (ASCP)**. This mounts Secrets Manager or Parameter Store values as files in the pod filesystem via a volume, with automatic rotation synchronization. The pod service account (with IRSA) must have permission to retrieve the secret.

Avoid storing secrets in Kubernetes Secrets objects without encryption — by default, Kubernetes Secrets are base64-encoded (not encrypted) in etcd. Enable **KMS envelope encryption** for Kubernetes Secrets at rest if you use them.

---

### Runtime Security

**Run containers as non-root.** By default, many containers run as root (UID 0). A process running as root inside a container can, under certain conditions, escape to the host. Configure containers with a specific non-root UID in the Dockerfile (`USER 1000`) and enforce it with pod security context.

**Disable privilege escalation.** Set `allowPrivilegeEscalation: false` in the Kubernetes security context or use `readonlyRootFilesystem: true` where the application doesn't need to write to the filesystem.

**Amazon GuardDuty for containers** detects runtime threats in EKS (EKS Runtime Monitoring) and ECS. It monitors system calls and container behavior for suspicious patterns — unexpected network connections, credential exfiltration via IMDS, cryptocurrency mining activity. GuardDuty findings appear in Security Hub and can trigger EventBridge automated response.

---

### Network Policies

By default in Kubernetes, all pods can communicate with all other pods across all namespaces — a flat, open network. **Kubernetes NetworkPolicies** restrict this. A NetworkPolicy specifies which pods can send traffic to which other pods on which ports.

The AWS VPC CNI alone does not enforce NetworkPolicies. You need a CNI that supports them — **Calico**, **Cilium**, or the **VPC CNI's own network policy support** (available on EKS 1.25+, using eBPF-based enforcement). Define policies that:
- Allow the frontend namespace to reach the API namespace on port 8080 only
- Allow the API namespace to reach the database namespace on port 5432 only
- Deny all other ingress by default

For ECS, network segmentation is enforced at the security group level — ECS tasks in awsvpc mode each get their own ENI with a security group. Configure security groups to allow only the specific service-to-service traffic your architecture requires.

---

## Configuration Reference

### ECR Lifecycle Policy and Image Scanning

```bash
# Enable image scanning on push for a repository
aws ecr put-image-scanning-configuration \
  --repository-name my-api \
  --image-scanning-configuration scanOnPush=true \
  --region us-east-1

# Create a lifecycl