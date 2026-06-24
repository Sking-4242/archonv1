---
title: "Amazon EC2"
type: content
estimated_minutes: 24
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon EC2

## Overview

Amazon Elastic Compute Cloud (EC2) provides resizable virtual servers — called **instances** — in the AWS cloud. It is the foundational compute service on which a large fraction of AWS workloads run, and understanding it underpins nearly every other topic: networking, storage, scaling, security, and cost. This *service reference* lesson explains what an instance is, the choices you make when launching one (instance type, AMI, storage, networking, purchasing option), how the instance lifecycle and metadata work, how EC2 connects to the rest of AWS, and what each certification expects.

EC2 matters because it is the most direct expression of the cloud value proposition: instead of buying and racking physical servers, you launch capacity on demand in minutes, pay only while it runs, and release it when you are done. But that flexibility comes with many decisions — what size, what operating system, where in the network, how to pay, how to secure it — and getting those decisions right is what the exams test. The mental model to hold is that an instance is the *combination* of an instance type (hardware profile), an Amazon Machine Image (software), one or more storage volumes, a network placement, and a set of identity and security controls. Change any of those and you have a meaningfully different server.

---

## How It Works

When you launch an instance you assemble several components, and each is an exam-relevant decision:

- **Amazon Machine Image (AMI)** — a template containing the operating system, the root-volume snapshot, and any preinstalled software. AMIs can be AWS-provided, from the AWS Marketplace, community-shared, or your own custom **golden images** built for consistent, pre-hardened, fast-launching instances. An AMI is Region-scoped; to use it elsewhere you copy it to another Region. AMIs underpin Auto Scaling (the launch template references an AMI) and immutable deployments (bake a new AMI, roll it out).
- **Instance type** — the hardware profile: vCPUs, memory, network and EBS bandwidth, and sometimes local NVMe storage or GPUs/accelerators. Types are organized into **families** by workload: **general purpose** (M, T — T types are *burstable*, accumulating CPU credits when idle and spending them under load), **compute optimized** (C), **memory optimized** (R, X — databases, in-memory caches), **storage optimized** (I, D — high local IOPS/throughput), and **accelerated** (P, G, Inf, Trn — GPU/ML). The family-and-size choice is the core right-sizing decision.
- **Storage** — most instances boot from an **Amazon EBS** root volume (network-attached, durable, persists independently of the instance). Many types also offer **instance store** — physically attached, very fast, but **ephemeral**: data is lost when the instance stops, hibernates, or is terminated (it survives a reboot). Use instance store only for caches, scratch, or replicated data.
- **Network placement** — the instance launches into a **subnet** of a VPC in a specific Availability Zone, receives a private IP (and optionally a public IP or Elastic IP), attaches one or more **elastic network interfaces (ENIs)**, and is governed by **security groups**.
- **Key pair and access** — a key pair provides initial SSH/RDP credentials, though **Session Manager** is the modern, keyless, auditable alternative that needs no inbound access at all.

The instance **lifecycle**: `pending → running → stopping → stopped → terminated`, plus `rebooting` and (for supported types) `hibernate`. Stopping an EBS-backed instance releases the underlying host but keeps the EBS volumes (you stop paying for compute but keep paying for storage); on restart it may land on different hardware and gets new public IP unless an Elastic IP is attached. Terminating deletes the instance and, by default, its root volume. A reboot keeps the same host and instance-store data.

---

## Key Features

- **Instance metadata and credentials.** The **Instance Metadata Service (IMDS)** at a link-local address exposes instance facts and, crucially, the **temporary credentials of any attached IAM role**. Because a server-side request forgery (SSRF) bug can trick an app into reading those credentials, you should **require IMDSv2** (a session-token, header-bound protocol) and disable IMDSv1.
- **Instance roles.** Attaching an IAM role via an **instance profile** lets applications obtain rotating temporary credentials with no embedded keys — the correct way to grant EC2 access to AWS APIs.
- **User data** runs a script at first boot for bootstrapping (install packages, register with a config system); combined with golden AMIs it defines how an instance configures itself.
- **Placement groups** control physical placement: **cluster** (pack instances close for low-latency, high-throughput networking), **spread** (separate instances on distinct hardware for fault isolation), and **partition** (group instances into fault-isolated partitions for large distributed systems like HDFS/Cassandra).
- **Elastic IPs and ENIs** provide stable public addressing and flexible, movable network interfaces (e.g., a secondary ENI you can detach and reattach to another instance for failover).
- **Auto recovery and hibernation** restart impaired instances on healthy hardware and preserve RAM state across stops.

---

## Configuration Reference

- **Purchasing options** dramatically affect cost: **On-Demand** (pay per second, no commitment — flexible, most expensive); **Savings Plans / Reserved Instances** (1- or 3-year commitment for up to ~72% savings on steady usage — Savings Plans are the more flexible modern form); **Spot Instances** (spare capacity at up to ~90% off, but reclaimable with a two-minute warning — ideal for fault-tolerant, stateless, or batch work); **Dedicated Instances/Hosts** (isolated hardware for licensing or compliance, with Dedicated Hosts exposing the physical socket/core for BYOL); and **Capacity Reservations** to guarantee capacity in an AZ.
- **Security groups** — stateful instance-level virtual firewalls (allow rules only; return traffic is automatically permitted), evaluated at the ENI.
- **EBS optimization** dedicates bandwidth to EBS so storage I/O doesn't contend with network traffic (default on modern types).
- **Tenancy** (shared/dedicated/host) and **nitro-based** features (enhanced networking, encrypted EBS by default options) round out placement and performance.
- **Tags** drive cost allocation, automation targeting (SSM), and attribute-based access control (ABAC).

---

## Operations and Troubleshooting

- **Monitoring.** EC2 publishes CloudWatch metrics for CPU, network, disk I/O (for instance-store), and EBS throughput, plus two **status checks**: the **system status check** (host/AWS infrastructure) and the **instance status check** (the instance's own networking/OS reachability). A failed system check is AWS-side (often resolved by stop/start to move hosts); a failed instance check is usually OS/config. Critically, **memory utilization and disk-space usage are NOT published by default** — the **CloudWatch agent** is required to collect them.
- **Patching and access.** Use **AWS Systems Manager** — **Patch Manager** to patch fleets on a schedule with compliance reporting, and **Session Manager** for keyless, portless, fully logged shell access — instead of bastions and inbound SSH.
- **Cannot connect.** Walk the chain methodically: security group inbound rule for the port/source, network ACL (stateless, both directions), route table (IGW for public, NAT for private outbound), public IP/Elastic IP assignment, subnet type, and finally the OS-level firewall and service. For Session Manager, check the SSM agent health and the instance role permissions.
- **T-family performance cliffs.** A burstable instance running low on CPU credits throttles; watch the `CPUCreditBalance` metric and consider unlimited mode or a non-burstable family.
- **Right-sizing and cost.** Idle and oversized instances are the most common waste; use CloudWatch metrics and **Compute Optimizer** to right-size, Spot/Savings Plans to cut rate, and stop/terminate idle capacity. Released-but-unattached Elastic IPs also incur charges.

---

## Integrations

EC2 sits at the center of AWS: it launches into a **VPC** with **security groups**, uses **EBS** and **EFS** for storage, sits behind **Elastic Load Balancing**, scales with **EC2 Auto Scaling**, is monitored by **CloudWatch**, managed and patched by **Systems Manager**, secured with **IAM** roles and **KMS**-encrypted volumes, audited by **CloudTrail**, and provisioned by **CloudFormation**. Threats to instances are detected by **GuardDuty** (including agentless EBS malware scanning and Runtime Monitoring) and vulnerabilities by **Amazon Inspector**. Almost every other service lesson connects back to EC2.

---

## Pricing and Cost Considerations

EC2 cost is driven primarily by instance type and the seconds/hours it runs, multiplied by your purchasing option, plus attached **EBS** storage and **data transfer** (cross-AZ traffic and internet egress are the usual surprises; same-AZ private traffic is free). The big levers, in order of impact: choose the right family and size (right-sizing), pick the purchasing option matching the workload's commitment profile (Savings Plans for steady baselines, Spot for interruption-tolerant work, On-Demand for spiky/unknown), shut down non-production instances off-hours, and clean up idle volumes and unattached Elastic IPs. Reserved capacity and Savings Plans can also be shared across an organization's accounts via consolidated billing. Exact prices vary by Region, type, and over time.

---

## Exam Relevance

**CLF-C02:** Know EC2 as resizable virtual-server compute, the purchasing options (On-Demand, Reserved/Savings Plans, Spot, Dedicated) and when each is cost-effective, and the shared-responsibility split (AWS manages the host/hypervisor; you manage the guest OS, patches, and applications). Foundational.

**SAA-C03:** Know instance-family selection, Auto Scaling + ELB architectures, Spot for cost, placement groups, instance roles, burstable T behavior, and EBS vs. instance store. Design depth — pervasive on the exam.

**SOA-C03:** Operate fleets — status checks and what each failure implies, the CloudWatch agent for memory/disk, Systems Manager patching and Session Manager, auto recovery, and right-sizing. Operations depth.

**SCS-C03:** Secure instances — IMDSv2 enforcement, instance roles over embedded keys, Session Manager over inbound SSH, Inspector for CVEs, hardened golden AMIs, EBS encryption with KMS, and detecting compromise with GuardDuty. Security depth.

---

## Summary

Amazon EC2 provides on-demand virtual servers assembled from an AMI, an instance type, storage (durable EBS or ephemeral instance store), a VPC network placement, and identity/security controls. Instance families map to workloads (general/compute/memory/storage/accelerated, with T types burstable on CPU credits), and purchasing options — On-Demand, Savings Plans/Reserved, Spot, and Dedicated — match cost to commitment. Instances are secured with IAM roles, IMDSv2, security groups, and KMS-encrypted volumes; operated with CloudWatch (plus the agent for memory/disk) and Systems Manager; scaled with Auto Scaling behind load balancers; and audited with CloudTrail. The lifecycle (stop keeps EBS, terminate deletes it, reboot keeps instance store) and the status-check distinction are frequent exam points, and EC2 is the compute foundation most other AWS services connect to.

---

## Quick Check

1. What five components do you combine when launching an EC2 instance, and why does changing any one matter?
2. Which purchasing option fits a steady 24/7 baseline, which fits a fault-tolerant interruptible batch job, and which guarantees isolated hardware for licensing?
3. Why should an application on EC2 use an instance role rather than embedded keys, and why enforce IMDSv2?
4. A system status check fails versus an instance status check fails — what does each imply and how do you respond?
5. Which two utilization metrics does EC2 not publish by default, and how do you collect them?

---

## What's Next

Pair this with the **Amazon EBS**, **Elastic Load Balancing**, **EC2 Auto Scaling**, and **Amazon VPC** lessons to complete the core compute architecture, and with **Systems Manager**, **Amazon Inspector**, and **Amazon GuardDuty** for operations and security.
