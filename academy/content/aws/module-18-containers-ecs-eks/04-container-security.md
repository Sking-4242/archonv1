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

## What's Next

Next up: the Module 18 Canvas Lab — ECS Fargate microservices architecture.