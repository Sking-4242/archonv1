---
title: "EKS Architecture: Nodes, Pods, and Networking"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# EKS Architecture: Nodes, Pods, and Networking

## Overview

Amazon EKS is managed Kubernetes — AWS runs the control plane so that you do not have to. This includes the Kubernetes API server, etcd (the cluster state store), the controller manager, and the scheduler, deployed across three Availability Zones with a 99.95% SLA and automatic version patches. What you manage (or offload to Fargate) is the data plane: the worker nodes that run your pods.

EKS is Kubernetes with deep AWS integration. The networking model assigns real VPC IP addresses to pods via the AWS VPC CNI plugin, making pods first-class VPC citizens reachable by security groups and route tables. IAM integration via IRSA (IAM Roles for Service Accounts) gives individual pods scoped AWS credentials without sharing the node's instance profile. The AWS Load Balancer Controller provisions ALBs directly from Kubernetes Ingress resources. These integrations make EKS feel native to AWS while preserving full Kubernetes API compatibility.

For the SAA exam, understand the EKS control-plane/data-plane split, node group types, VPC CNI pod networking, and IRSA. SAP adds Karpenter vs. Cluster Autoscaler, EKS add-on management, Kubernetes RBAC integration with IAM, and multi-cluster networking. After this lesson, you will be able to explain EKS's networking model, configure IAM for pods using IRSA, and choose between node group types for different workload characteristics.

---

## Core Concepts

### Control Plane and Data Plane

**The control plane** is what EKS manages: the Kubernetes API server (where `kubectl` connects), etcd (the distributed key-value store for all cluster state), the scheduler (assigns pods to nodes), and the controller manager (runs reconciliation loops for deployments, replica sets, etc.). These run in AWS-managed accounts across three AZs. You interact with the control plane via `kubectl` and the EKS API but never manage the underlying infrastructure.

**The data plane** is what you manage (or delegate to Fargate): the worker nodes where your pods actually run. Worker nodes are EC2 instances that join the cluster using bootstrap scripts, run the `kubelet` (the Kubernetes node agent), and report their capacity to the control plane.

---

### Node Group Types

**Managed Node Groups** are EC2 instances managed by EKS. AWS handles: OS selection (Amazon Linux 2, Bottlerocket), node provisioning (using an Auto Scaling Group), Kubernetes version upgrades (cordoning, draining, and replacing nodes with one API call), and node health monitoring. You choose the instance type, scaling limits, and whether to use On-Demand or Spot instances. Managed node groups are the default choice for most EKS workloads.

**Self-managed nodes** give you complete control — you manage the ASG, bootstrap scripts, OS patches, and Kubernetes version upgrades manually. Use self-managed nodes only when you need customizations not supported by managed node groups (custom AMIs with specific kernel patches, GPU configurations not yet supported by managed groups, etc.).

**Fargate Profiles** run pods on AWS Fargate — no nodes to manage. A Fargate Profile specifies which pods (by namespace and label selector) run on Fargate; matching pods are scheduled onto Fargate compute automatically. Limitations: no DaemonSets (Fargate doesn't support node-level agents), no privileged containers, stateful workloads require EFS (not EBS — EBS volumes cannot be shared across Fargate hosts), and cold starts are longer than on EC2 nodes. Use Fargate for batch jobs, bursty microservices, and workloads where zero-to-scale is important.

---

### VPC CNI and Pod Networking

EKS uses the **AWS VPC CNI plugin** (Container Network Interface). Unlike most CNI plugins that create an overlay network (pods get internal IPs invisible to the VPC), the AWS VPC CNI gives each pod a **real VPC IP address** from the node's subnet CIDR.

This has significant implications:
- **Pods are VPC citizens**: they can be targeted by security groups, appear in VPC Flow Logs, and are reachable from other VPC resources without NAT or overlay routing.
- **Security Groups for Pods**: individual pods can have dedicated security groups (separate from the node's security group), enabling fine-grained network access control at the pod level.
- **IP exhaustion risk**: each pod consumes one IP from the node's subnet. The maximum pods per node is limited by the node's ENI capacity and the number of IPs per ENI (instance-type dependent). If subnets are too small, IP exhaustion causes pod scheduling failures.
- **Subnet planning matters**: size node subnets generously (/24 or larger) to accommodate pod IP allocation headroom.

---

### IAM Roles for Service Accounts (IRSA)

In standard Kubernetes, all pods on a node share the node's EC2 instance profile — all pods can assume the node's IAM role and access whatever it can access. This violates least privilege: a compromised payment pod can access the same S3 buckets as an analytics pod.

**IRSA** solves this by binding a Kubernetes service account to an IAM role. The process:
1. The EKS cluster has an OIDC identity provider URL.
2. An IAM role's trust policy allows the OIDC provider to assume the role for a specific Kubernetes service account.
3. The Kubernetes service account is annotated with the IAM role ARN.
4. Pods using that service account receive an OIDC token injected as a projected volume.
5. The AWS SDK in the pod exchanges the OIDC token for temporary AWS credentials via STS.

The result: each pod (or group of pods sharing a service account) gets its own scoped AWS credentials. A payment pod gets credentials for the payments DynamoDB table only. An analytics pod gets credentials for the analytics S3 bucket only. A compromised pod cannot escalate to other pods' resources.

IRSA is the required pattern for pod AWS access in EKS. Node instance role credentials should never be broad enough for application pods to use directly.

---

### EKS Add-ons and Karpenter

EKS **add-ons** are cluster components managed by EKS: CoreDNS (cluster DNS resolution), kube-proxy (network rules on nodes), VPC CNI (pod networking), the EBS CSI driver (EBS persistent volumes), and the EFS CSI driver (EFS persistent volumes). Add-ons can be updated via the EKS API without manually applying YAML manifests.

**AWS Load Balancer Controller**: a Kubernetes controller (deployed as a pod) that watches Kubernetes Ingress and Service resources and provisions ALBs and NLBs automatically. When you create a Kubernetes Ingress with the annotation `kubernetes.io/ingress.class: alb`, the controller creates an ALB, registers pod IPs as targets, and manages path-based routing — all without manual ALB configuration.

**Karpenter** is the recommended node autoscaler for EKS. Unlike the older Cluster Autoscaler (which scales existing node groups), Karpenter provisions nodes directly — selecting the right instance type, size, and purchase option (On-Demand vs. Spot) to satisfy pending pod requirements in under 60 seconds. Karpenter's consolidation feature continuously right-sizes the cluster, terminating underutilized nodes and rescheduling pods more efficiently. For ML and GPU workloads, Karpenter's ability to directly select GPU instances with the right GPU count reduces provisioning time significantly.

---

## Configu