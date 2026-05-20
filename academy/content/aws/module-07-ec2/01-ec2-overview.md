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

## What's Next

Next: Instance types and families — how to choose the right hardware configuration for your workload.
