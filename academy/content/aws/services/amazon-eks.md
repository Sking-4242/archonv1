---
title: "Amazon EKS"
type: content
estimated_minutes: 20
cert_tags: ["SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon EKS

## Overview

Amazon Elastic Kubernetes Service (EKS) is a managed Kubernetes service that runs the Kubernetes control plane for you and integrates Kubernetes with AWS networking, identity, and storage. If your organization has standardized on Kubernetes — for portability, an existing ecosystem of tooling, or multi-cloud consistency — EKS lets you run conformant Kubernetes without operating the control plane yourself. This *service reference* lesson covers the EKS architecture, compute options, the identity and networking integrations, security, and what each certification expects.

EKS matters because Kubernetes is the de facto open standard for container orchestration, but running a production-grade, highly available control plane (API server, etcd, scheduler, controllers) is operationally heavy. EKS removes that burden: AWS runs and scales the control plane across multiple Availability Zones, patches it, and exposes a standard Kubernetes API. The key contrast with ECS is philosophical and practical: **ECS is AWS-native and simpler; EKS is standard, portable Kubernetes but with more moving parts and a steeper learning curve.** Choose EKS when you specifically need Kubernetes and its ecosystem.

---

## How It Works

An EKS cluster has two parts:

- **Control plane** — fully managed by AWS, run and replicated across multiple AZs, hosting the Kubernetes API server and etcd. You never manage these nodes; AWS handles availability and patching.
- **Data plane (worker nodes)** — where your pods run. Options: **managed node groups** (EC2 instances EKS provisions, lifecycles, and gracefully drains for updates), **self-managed nodes** (your own EC2 fleet for maximum control), or **Fargate** (serverless pods with no nodes to manage).

You interact with the cluster using standard Kubernetes tooling (`kubectl`, manifests, Helm). EKS layers in AWS integrations:

- **VPC CNI** gives each pod a real **VPC IP address** (and optionally a pod-level security group), so pods are first-class VPC citizens.
- **IAM Roles for Service Accounts (IRSA)** and the newer **EKS Pod Identity** map a Kubernetes service account to an IAM role, giving each workload **least-privilege** AWS permissions instead of inheriting the node's role.
- **CSI drivers** connect **EBS** and **EFS** as persistent volumes, and the **AWS Load Balancer Controller** provisions ALBs/NLBs from Kubernetes Ingress/Service objects.

---

## Key Features

- **Managed, multi-AZ control plane** with automated patching and high availability.
- **Compute flexibility** — managed node groups, self-managed nodes, or Fargate, mixable in one cluster.
- **IRSA / Pod Identity** for fine-grained, per-pod IAM permissions.
- **VPC CNI networking** with optional pod security groups and prefix delegation to increase pod density per node.
- **Managed add-ons** (VPC CNI, CoreDNS, kube-proxy, EBS CSI) maintained and upgraded by EKS.
- **Access management** combining IAM authentication (cluster **access entries** / the legacy `aws-auth` ConfigMap) with **Kubernetes RBAC** for in-cluster authorization.
- **Control-plane logging** (API, audit, authenticator, controller, scheduler) to CloudWatch.

---

## Configuration Reference

- **Authentication + authorization are two layers**: IAM decides *who can reach the cluster API* (via access entries), and Kubernetes **RBAC** decides *what they can do inside*. Both must be configured.
- **Use IRSA or Pod Identity** so each workload gets least-privilege AWS permissions rather than the broad node instance role.
- **Enable control-plane audit logging** to CloudWatch for security and troubleshooting.
- **Private cluster endpoints** restrict API access to within the VPC; public access can be CIDR-restricted.
- **Right-size node groups** and consider Fargate for isolation or bursty workloads.

---

## Operations and Troubleshooting

- **Pods stuck `Pending` / can't get IPs.** The VPC CNI assigns pods VPC IPs, so **subnet IP exhaustion** is a classic cause; use larger subnets, prefix delegation, or secondary CIDRs. Insufficient node capacity is the other common cause (add nodes / enable Cluster Autoscaler or Karpenter).
- **Workload lacks AWS permissions.** Confirm IRSA/Pod Identity is configured for the service account rather than relying on the node role.
- **Access denied to the cluster.** Check the IAM principal's **access entry** (or `aws-auth` mapping) and the matching Kubernetes RBAC RoleBinding.
- **Monitoring.** Enable control-plane logs to CloudWatch and use Container Insights / Prometheus; **GuardDuty EKS Protection** analyzes audit logs and **Runtime Monitoring** watches pod behavior.

---

## Integrations

EKS integrates Kubernetes with **VPC** (CNI networking, pod security groups), **IAM** (cluster auth, IRSA/Pod Identity), **Elastic Load Balancing** (via the AWS Load Balancer Controller), **EBS/EFS** (CSI persistent volumes), **ECR** (images), **CloudWatch** (logs and Container Insights), and **GuardDuty** (EKS Protection and Runtime Monitoring). It is the Kubernetes counterpart to **ECS**, and node autoscaling commonly uses the **Cluster Autoscaler** or **Karpenter**.

---

## Pricing and Cost Considerations

EKS charges a **per-cluster hourly fee** for the managed control plane, plus the cost of the data plane — EC2 instances for node groups (with Spot/Savings Plans available) or per-pod vCPU/memory for Fargate. Compared to ECS, EKS adds the control-plane fee and generally higher operational complexity, so it is most cost-justified when Kubernetes itself is a requirement. Data-plane cost levers mirror EC2/Fargate: right-size nodes, bin-pack pods (Karpenter improves utilization), and use Spot for tolerant workloads. Extended-support for older Kubernetes versions costs more, so staying current matters. Exact prices vary by Region.

---

## Exam Relevance

**SAA-C03:** Know EKS as managed Kubernetes, the control-plane vs. data-plane split, compute options (managed node groups / self-managed / Fargate), and ECS-vs-EKS selection. Design depth.

**SOA-C03:** Operate clusters — node management and autoscaling, control-plane logging, add-on upgrades, and troubleshooting networking/IP exhaustion and access. Operations depth.

**SCS-C03:** Secure clusters — the IAM + RBAC dual-authorization model, IRSA/Pod Identity least privilege, private endpoints, control-plane audit logging, and GuardDuty EKS Protection/Runtime Monitoring. Security depth.

---

## Summary

Amazon EKS runs a managed, multi-AZ Kubernetes control plane and connects Kubernetes to AWS via the VPC CNI (pods get VPC IPs), IRSA/Pod Identity (per-pod IAM), and CSI drivers (EBS/EFS volumes). Worker compute comes from managed node groups, self-managed nodes, or Fargate. Security combines IAM authentication (access entries) with Kubernetes RBAC, per-pod least-privilege IAM, private endpoints, audit logging to CloudWatch, and GuardDuty EKS protections. The recurring exam points are the two-layer auth model, IRSA over node roles, and VPC-IP/subnet exhaustion as a scheduling failure. EKS is the choice when you specifically need standard, portable Kubernetes; ECS is the simpler AWS-native alternative.

---

## Quick Check

1. Which part of an EKS cluster does AWS manage, and which do you provide?
2. What are the three options for EKS worker compute, and which removes node management entirely?
3. Why use IRSA or Pod Identity instead of the node instance role for workload permissions?
4. Pods are stuck Pending with no IPs — what two causes are most likely?
5. Explain the two-layer authentication-and-authorization model for accessing an EKS cluster.

---

## What's Next

Pair this with **Amazon ECS** (the AWS-native alternative), **Amazon VPC** (CNI networking), **AWS IAM**, and **Amazon GuardDuty** (runtime/audit-log detection).
