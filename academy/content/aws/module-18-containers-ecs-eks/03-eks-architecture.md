---
title: "EKS Architecture: Nodes, Pods, and Networking"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SAP-C02"]
---

# EKS Architecture: Nodes, Pods, and Networking

## Overview

EKS is managed Kubernetes. AWS runs the control plane (API server, etcd, scheduler, controller manager) across 3 AZs with automatic patching and a 99.95% SLA. You manage worker nodes (EC2 or Fargate). This lesson covers EKS node types, networking (VPC CNI), and key AWS integrations.

## EKS Node Groups

Managed Node Groups are EC2 instances managed by EKS — AWS handles node provisioning, OS updates, and Kubernetes version upgrades with one API call. Self-managed nodes give you full control but require manual management. Fargate Profiles run pods on Fargate — no node management, scales to zero, but with limitations (no DaemonSets, stateful sets require EFS, no privileged containers). Use managed node groups as the default; Fargate for batch jobs and bursty microservices.

## VPC CNI and Pod Networking

EKS uses the AWS VPC CNI plugin. Each pod gets a real VPC IP address from the node's subnet — pods are first-class VPC citizens, reachable via security groups and route tables. This differs from other Kubernetes CNIs where pods use an overlay network. Benefits: no overlay overhead, native VPC security groups on pods (via Security Groups for Pods), easy integration with VPC Flow Logs. Node subnet CIDR must be large enough to hold the maximum number of pods per node (varies by instance type and IP limits).

## EKS Add-ons and Integrations

EKS Add-ons: CoreDNS (cluster DNS), kube-proxy (networking rules), AWS VPC CNI (pod networking), EBS CSI driver (persistent volumes from EBS), EFS CSI driver (persistent volumes from EFS). AWS Load Balancer Controller provisions ALB for Kubernetes Ingress resources and NLB for LoadBalancer Service types — enabling native ALB integration without manual configuration. Cluster Autoscaler or Karpenter (preferred, faster) automatically adds and removes nodes based on pending pod demand.

## EKS IAM Integration: IRSA

IAM Roles for Service Accounts (IRSA) allows Kubernetes pods to assume IAM roles. A Kubernetes service account is annotated with an IAM role ARN. The pod's OIDC token is exchanged for AWS credentials via STS. This gives pods the minimal IAM permissions they need without giving node-level credentials to all pods on the instance. Always use IRSA for pod AWS access — never use node instance role credentials directly.

## Summary

EKS provides managed Kubernetes control plane. Use managed node groups or Fargate. AWS VPC CNI gives pods real VPC IPs. Use IRSA for pod-level IAM — never rely on node instance credentials. The AWS Load Balancer Controller connects Kubernetes Ingress to ALB. Karpenter automates efficient node scaling. EKS is Kubernetes with deep AWS integration — the expertise barrier is the main consideration.

## Examples

A logistics company migrates a microservices platform from on-premises Kubernetes to EKS. Their ten backend services already have Helm charts, custom admission webhooks, and a Prometheus-based monitoring stack. With EKS and managed node groups, the control plane migration is transparent — AWS runs the API server and etcd. The team keeps their Helm deployments, adds the AWS Load Balancer Controller to replace their on-premises ingress controller, and now has an SLA-backed control plane without running a single etcd pod themselves. This is the canonical EKS migration story: Kubernetes investment preserved, undifferentiated heavy lifting removed.

A machine-learning platform team runs training jobs that are highly bursty — dozens of GPU-hungry pods queue up at 2am, then nothing runs for hours. They adopt Karpenter for node autoscaling. When pending pods request GPU nodes, Karpenter reads the pod spec, selects the cheapest appropriate instance type (often spot), and provisions it in under 60 seconds. When jobs finish, Karpenter consolidates the cluster and terminates unused nodes. Compared to Cluster Autoscaler, Karpenter's awareness of actual pod requirements (not just node utilization) leads to significantly lower average cluster cost.

A platform team operates a multi-tenant EKS cluster serving several internal product teams. Each product team runs pods that need to write to their own S3 bucket and read from their own DynamoDB table. Using IRSA, the team creates a separate IAM role per product team and annotates each product team's Kubernetes service account with its respective role ARN. Pods from Team A automatically receive credentials scoped only to Team A's resources — even though all pods run on the same EC2 worker nodes sharing the same instance profile. Without IRSA, any pod on the node could escalate to full node-level permissions via IMDS.

## Think About It

1. Why does the AWS VPC CNI plugin assign real VPC IP addresses to pods rather than using an overlay network? What operational and security benefits does this create, and what new constraint does it introduce?
2. What would happen if the subnets backing your EKS managed node group ran out of available IP addresses? How would you detect this before it caused pod scheduling failures?
3. How would you decide between Fargate Profiles and managed node groups for a given workload in EKS? What specific characteristics of a workload make Fargate the wrong choice?
4. IRSA exchanges a Kubernetes OIDC token for AWS credentials via STS. What is the security principle this enforces, and how does it differ from the alternative of granting broad permissions on the EC2 node instance role?
5. Karpenter and Cluster Autoscaler both scale EKS nodes, but their scaling logic differs fundamentally. Under what conditions would Cluster Autoscaler over-provision nodes that Karpenter would not, and why?

## Quick Check

**Q1.** What does IRSA (IAM Roles for Service Accounts) allow in an EKS cluster?
- A) EC2 worker nodes to assume IAM roles for cluster operations
- B) Individual Kubernetes pods to assume scoped IAM roles via OIDC token exchange
- C) Kubernetes Ingress resources to invoke ALB APIs directly
- D) The EKS control plane to write to CloudTrail on your behalf

**Answer: B** — IRSA annotates a Kubernetes service account with an IAM role ARN; pods using that service account exchange an OIDC token for temporary AWS credentials scoped to that specific role.

**Q2.** Which EKS node option requires the least operational management and can scale to zero when no workloads are running?
- A) Self-managed EC2 node groups
- B) Managed node groups with On-Demand instances
- C) Fargate Profiles
- D) Managed node groups with Spot instances

**Answer: C** — Fargate Profiles run pods on AWS-managed serverless compute with no node provisioning, patching, or minimum capacity requirements; unused pods incur no cost.

**Q3.** What is the primary role of the AWS Load Balancer Controller in an EKS cluster?
- A) It provides internal DNS resolution for Kubernetes Services
- B) It provisions EBS volumes for StatefulSet pods
- C) It translates Kubernetes Ingress and LoadBalancer Service resources into ALB and NLB configurations
- D) It enforces pod security policies at admission time

**Answer: C** — The AWS Load Balancer Controller watches Kubernetes Ingress and Service resources and automatically creates and configures ALBs and NLBs in your account to match.

## What's Next

Next up: Container security — image scanning, runtime security, and network policies.