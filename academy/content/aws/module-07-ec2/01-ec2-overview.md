---
title: "EC2 Overview"
type: content
estimated_minutes: 8
cert_tags: ["aws_ccp", "aws_saa", "aws_soa", "aws_dva"]
---

# EC2 Overview

## Overview

Amazon Elastic Compute Cloud (EC2) is the foundational compute service of AWS — virtual machines you can provision in minutes, configure precisely, and scale elastically. Launched in 2006 as one of AWS's original services, EC2 remains the most versatile compute option and the service most AWS certifications test most deeply.

EC2 instances are virtual machines running on AWS-managed hypervisors (currently AWS's custom Nitro hypervisor). You choose the operating system (via AMI), the hardware configuration (via instance type), the network placement (via VPC/subnet), and the storage (via EBS or instance store).

## The EC2 Launch Process

Launching an EC2 instance requires six key decisions: **AMI** (Amazon Machine Image — the template for the OS and software stack), **Instance type** (hardware: CPU, memory, storage, networking), **Network settings** (VPC, subnet, public IP assignment), **IAM role** (what AWS permissions the instance needs), **Storage** (EBS volumes — their size, type, and encryption), and **Security group** (firewall rules for network access).

Once launched, an EC2 instance runs continuously until stopped or terminated. Stopped instances don't incur compute charges (but EBS volumes attached to them do). Terminated instances are permanently deleted — their EBS volumes can be optionally deleted or retained.

## Nitro Hypervisor

AWS's Nitro System is a collection of purpose-built hardware and software that forms the foundation of EC2. Nitro offloads virtualization functions to dedicated hardware (the Nitro Card and Nitro Security Chip), enabling bare-metal-like performance for EC2 instances. Most modern instance types run on Nitro.

Nitro provides three key benefits: near bare-metal performance (virtualization overhead is minimal), enhanced security (the Nitro Security Chip cryptographically verifies firmware and the hypervisor, preventing tampering), and new instance capabilities (faster networking, higher IOPS EBS attachments, instance store NVMe drives).

## Instance Lifecycle

EC2 instances have five states: **Pending** (booting), **Running** (active, billing for compute), **Stopping** (transitioning to stopped), **Stopped** (powered off, not billed for compute but EBS volumes still charged), **Terminated** (permanently deleted). A crucial distinction: you can restart a stopped instance; you cannot restart a terminated one.

**Hibernate** is an additional feature that saves instance memory state to the root EBS volume, enabling fast restarts that resume from exactly where you left off. Useful for instances with long startup times (large in-memory applications, ML models that take minutes to load).

## Summary

EC2 provides virtual machines on AWS's Nitro hypervisor with nearly bare-metal performance. Launching an instance requires choosing an AMI, instance type, VPC/subnet, IAM role, storage, and security group. Instances have five lifecycle states; stopped instances don't incur compute charges but EBS volumes do. Nitro provides performance, security, and networking enhancements beyond traditional hypervisors.

## Examples

A small e-commerce startup wants to run a WordPress store on AWS. They launch a single `t3.micro` EC2 instance, selecting the Amazon Linux 2023 AMI, placing it in a public subnet, and attaching a 20 GB gp3 EBS volume. They stop the instance overnight to save money, then restart it each morning. This is the most basic expression of the EC2 launch process — every decision (AMI, instance type, network, storage) is made explicitly at launch, and the stopped/running lifecycle directly affects their bill.

A fintech company runs a payment-processing API that handles millions of transactions per day. They configure their EC2 fleet with IAM roles (rather than hard-coded credentials) so instances can call DynamoDB and KMS without storing secrets. They use the Nitro-based `m7i` family and observe that their CPU steal time — common on older hypervisors — is effectively zero. The Nitro System's hardware offload for networking and storage means their instances behave predictably under load, which is critical when latency spikes translate directly into failed transactions.

A machine learning team loads a large language model into memory at startup — a process that takes 8 minutes. During a routine OS patching window, they enable EC2 Hibernate on their GPU instances instead of terminating them. When the instance resumes, the model is already warm in memory and the application responds within seconds. This illustrates how the instance lifecycle states (and Hibernate in particular) are not just operational details but architectural decisions with real performance and cost consequences.

## Think About It

1. Why does AWS charge for EBS volumes when an instance is stopped, but not for compute? What does this reveal about the underlying infrastructure model?
2. What would happen if you terminated an EC2 instance instead of stopping it — and had set the root EBS volume to "Delete on Termination"? How would your recovery strategy differ if that flag were disabled?
3. The Nitro hypervisor offloads networking and storage to dedicated hardware. How might this change the way you benchmark an EC2 instance compared to a traditional virtualized environment?
4. If an application takes 8 minutes to initialize (loading models, warming caches), how would you weigh the trade-offs between Hibernate, pre-warming instances in an Auto Scaling group, and using a different caching layer entirely?
5. An EC2 instance has an IAM role attached. Why is this preferable to placing AWS credentials in environment variables or configuration files on the instance?

## Quick Check

**Q1.** Which EC2 instance state still incurs EBS storage charges but does NOT incur compute charges?
- A) Running
- B) Terminated
- C) Stopped
- D) Pending

**Answer: C** — Stopped instances are powered off so compute billing halts, but attached EBS volumes continue to be charged for the storage they occupy.

**Q2.** What is the primary security benefit of AWS's Nitro hypervisor compared to traditional hypervisors?
- A) It supports more operating systems
- B) The Nitro Security Chip cryptographically verifies firmware, preventing tampering
- C) It eliminates the need for security groups
- D) It encrypts all EBS volumes automatically

**Answer: B** — The Nitro Security Chip provides hardware-rooted trust by cryptographically verifying the hypervisor and firmware at boot, significantly reducing the attack surface.

**Q3.** Which six decisions are required to launch an EC2 instance?
- A) AMI, instance type, VPC/subnet, IAM role, storage, security group
- B) AMI, key pair, region, Availability Zone, tenancy, billing model
- C) OS, CPU count, RAM size, disk size, IP address, firewall rules
- D) Instance type, region, S3 bucket, Lambda function, RDS, VPC

**Answer: A** — The six required launch decisions are AMI (OS template), instance type (hardware), VPC/subnet (network placement), IAM role (AWS permissions), EBS storage, and security group (firewall).

## What's Next

Next: Instance types and families — how to choose the right hardware configuration for your workload.
