---
title: "Container Security on AWS"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02", "SCS-C02"]
---

# Container Security on AWS

## Overview

Containers introduce unique security considerations compared to EC2: image vulnerabilities, runtime privileges, inter-pod communication, and secrets management. This lesson covers the layered security model for containerized workloads on AWS.

## Image Security

The first line of defense is a clean container image. Use ECR image scanning (powered by Inspector) to automatically scan images on push and receive CVE findings. Use distroless or minimal base images (Alpine, Amazon Linux 2 Minimal) to reduce attack surface — fewer packages means fewer vulnerabilities. Pin image versions (never use `latest` in production) and verify image digests. ECR Lifecycle Policies automatically clean up untagged and old images to reduce the attack surface of your registry.

## Task and Pod IAM

For ECS: assign a Task IAM Role with least-privilege permissions — the role is assumed by the containers in the task, not the entire EC2 instance. For EKS: use IRSA (IAM Roles for Service Accounts) for pod-level IAM. Never pass AWS credentials via environment variables — use the metadata service or IRSA token exchange. For EKS, block pod access to the EC2 instance metadata service (IMDS) using a NetworkPolicy or pod security context to prevent privilege escalation to node-level credentials.

## Secrets in Containers

Use AWS Secrets Manager or SSM Parameter Store — never bake secrets into images or pass them as plain environment variables. For ECS: reference secrets via `secrets` in the task definition — ECS fetches the secret value at task start and injects it as an environment variable or mounted file. For EKS: use the AWS Secrets and Configuration Provider (ASCP) as a CSI driver to mount secrets as files in pods. The Secrets Store CSI Driver integrates with Secrets Manager and Parameter Store natively.

## Network Policies and Service Mesh

By default in Kubernetes, all pods can communicate with all other pods in the cluster — a flat network. Kubernetes NetworkPolicies (requires a CNI that supports them, like Calico or Cilium) restrict pod-to-pod traffic. Define policies: allow the frontend pods to reach only the API pods on port 8080; deny all other ingress. For more advanced traffic management, mTLS, and observability, consider AWS App Mesh (Envoy-based service mesh) or open-source Istio.

## Summary

Container security: clean minimal images with ECR scanning, task/pod-level IAM with least privilege, secrets from Secrets Manager via native integrations, and network policies for east-west traffic control. Add distroless base images, pin versions, and use IRSA over instance credentials. Layer these controls for defense in depth across the container lifecycle.

## Examples

A healthcare startup builds a containerized patient-data API on ECS Fargate. During a security review, they realize their Docker image is based on a full Ubuntu base image containing 400+ packages — most irrelevant to a Node.js API. They switch to an Alpine-based image, reducing the package count to under 20. The next ECR scan returns zero critical CVEs instead of fourteen. This is the simplest and highest-leverage container security win: minimize the attack surface by minimizing what is in the image before any vulnerability ever ships.

A financial services company runs an EKS cluster where all pods share a flat network — any pod can reach any other pod on any port. A compromise of their low-privilege marketing analytics pod could, in theory, probe internal payment-processing pods. They implement Kubernetes NetworkPolicies using Calico: payment pods accept inbound only from the API gateway namespace on port 8443, and deny all other ingress. Marketing pods have no access to payment subnets. Defense in depth now means that even a compromised pod has a sharply limited blast radius.

A platform team discovers that several developer-deployed pods in EKS are implicitly using the EC2 node's instance role to access AWS services — because no IRSA annotation exists on their service accounts. The node's instance role has broad S3 and DynamoDB permissions intended for logging. Any pod on the node can read that metadata endpoint and obtain those credentials. After auditing, the team blocks IMDS access at the pod level via a NetworkPolicy and migrates all service accounts to IRSA with per-service least-privilege roles. This illustrates the privilege-escalation risk that makes IRSA a requirement, not a nice-to-have.

## Think About It

1. Why is using the `latest` image tag in production a security risk beyond just deployment unpredictability? How does pinning to a specific digest improve both security posture and incident response?
2. What would happen if an ECS task's IAM Task Role had `s3:*` on `*` instead of a scoped policy? Trace through how an application-level vulnerability in the container could be exploited to reach data it should never touch.
3. Kubernetes NetworkPolicies require a CNI that supports them (such as Calico or Cilium), but the AWS VPC CNI does not enforce them alone. How would you decide which CNI to use in production, and what trade-offs does switching CNIs introduce in an existing EKS cluster?
4. Secrets Manager and SSM Parameter Store both integrate with ECS task definitions via `valueFrom`. How would you decide which one to use for a database password that is rotated automatically every 30 days?
5. A container is discovered to be running as root inside a Fargate task. What specific capabilities does this grant the process, and what mitigations are available at the task definition level to reduce the risk?

## Quick Check

**Q1.** What is the recommended way to provide AWS credentials to an EKS pod so that each pod has only the permissions it needs?
- A) Pass credentials as environment variables in the pod spec
- B) Attach a broad IAM policy to the EC2 node instance role
- C) Use IAM Roles for Service Accounts (IRSA) with per-service-account role annotations
- D) Store credentials in a Kubernetes Secret and mount them as a volume

**Answer: C** — IRSA allows each pod to assume a scoped IAM role via OIDC token exchange, providing least-privilege credentials without sharing node-level permissions across all pods.

**Q2.** Which approach reduces a container image's vulnerability exposure most directly at build time?
- A) Enabling ECR image scanning after deployment
- B) Using a minimal or distroless base image with only required packages
- C) Running the container as a non-root user
- D) Restricting container egress with a security group

**Answer: B** — Fewer packages in the base image means fewer possible CVEs; a distroless or Alpine image can reduce the attack surface from hundreds of packages to a handful before scanning even runs.

**Q3.** For an ECS task definition, how are secrets from AWS Secrets Manager injected into the running container?
- A) The application code must call the Secrets Manager API at startup
- B) They are baked into the container image during the build process
- C) They are referenced via the `secrets` field in the task definition and injected by ECS at task launch
- D) They must be stored as EC2 instance tags and read via the metadata service

**Answer: C** — ECS natively supports the `secrets` field in task definitions, fetching the secret value from Secrets Manager or Parameter Store at task start and making it available as an environment variable or mounted file.

## What's Next

Next up: the Module 18 Canvas Lab — ECS Fargate microservices architecture.