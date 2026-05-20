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

## What's Next

Next up: Container security — image scanning, runtime security, and network policies.