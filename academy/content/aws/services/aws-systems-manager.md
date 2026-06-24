---
title: "AWS Systems Manager"
type: content
estimated_minutes: 20
cert_tags: ["SAA-C03", "SOA-C03", "SCS-C03"]
---

# AWS Systems Manager

## Overview

AWS Systems Manager (SSM) is a suite of operational-management capabilities for AWS and hybrid resources — patching, remote access, automation, configuration, and parameter/secret storage — accessed through a single service. It is the operations toolbox that lets you manage fleets of instances securely and at scale without SSH keys, bastion hosts, or manual logins. This *service reference* lesson covers the managed-node model, the key capabilities (Session Manager, Patch Manager, Run Command, Automation, Parameter Store), the security model, and what each certification expects.

Systems Manager matters because operating servers the traditional way — opening inbound SSH, distributing keys, logging in by hand to patch and configure — is insecure and unscalable. SSM replaces that with **agent-based, API-driven, auditable** operations. The core mental model is that the **SSM Agent** (preinstalled on most AWS AMIs) plus an **instance role** with SSM permissions makes a node "managed," after which a family of capabilities operates on those managed nodes through IAM-controlled, CloudTrail-logged APIs.

---

## How It Works

Managed nodes run the **SSM Agent** and have an instance profile (commonly `AmazonSSMManagedInstanceCore`) granting SSM access. Once managed, you use capabilities including:

- **Session Manager** — browser/CLI shell access to instances **with no inbound ports, no SSH keys, and no bastion**, fully logged to CloudWatch/S3 and optionally KMS-encrypted. The modern, auditable way to get a shell, with IAM controlling who can start sessions and on which instances.
- **Patch Manager** — automate OS and application patching across fleets on a schedule, using **patch baselines** (approval rules) and **maintenance windows**, with compliance reporting.
- **Run Command** — execute commands or documents across many instances at once without logging in.
- **Automation** — **runbooks** (SSM documents) that automate multi-step operational and remediation tasks (create an AMI, restart a service, remediate a noncompliant Config rule) with approvals and branching.
- **Parameter Store** — hierarchical storage for configuration data and secrets; **SecureString** values are KMS-encrypted. Referenced by applications, Lambda, ECS, and CloudFormation; a free, lighter-weight alternative to Secrets Manager (no built-in rotation).
- **State Manager / Inventory / Fleet Manager** — enforce desired configuration, collect software inventory, and manage fleets; **Maintenance Windows** schedule disruptive operations.

---

## Key Features

- **Keyless, portless, logged shell** via Session Manager — eliminating bastions and inbound SSH.
- **Fleet-wide patching** with baselines, maintenance windows, and compliance reporting.
- **Automation runbooks** powering self-healing and Config remediation.
- **Parameter Store** for config and SecureString secrets (KMS-encrypted), with hierarchy and versioning.
- **Hybrid management** of on-premises and other-cloud servers as managed nodes (activations).

---

## Configuration Reference

- **Attach an instance role** (e.g., `AmazonSSMManagedInstanceCore`, scoped further as needed) and ensure the SSM Agent is running and updated.
- **Use VPC interface endpoints** for SSM/EC2Messages/SSMMessages so management traffic stays **private** (no internet/NAT needed).
- **Replace inbound SSH with Session Manager**, restrict who can start sessions via IAM, and enable session logging/encryption.
- **Define patch baselines and maintenance windows** for predictable patching; store secrets as SecureString with a chosen KMS key.

---

## Operations and Troubleshooting

- **Instance not "managed."** Check the SSM Agent status, the instance role/permissions, and the network path to SSM endpoints (internet, NAT, or — preferred — VPC endpoints). All three (ssm, ssmmessages, ec2messages) are needed for full functionality.
- **Session Manager won't connect.** Verify IAM permissions to start sessions, the instance role, agent health, and KMS permissions if session encryption is enabled.
- **Patch compliance gaps.** Review patch baselines (approval rules), maintenance-window scheduling, and Run Command/Automation results.
- **Parameter access denied.** SecureString parameters require the caller to have **KMS decrypt** permission on the key, in addition to SSM read permission.

---

## Integrations

Systems Manager underpins operations across AWS: it manages **EC2** and hybrid nodes, executes **Automation** runbooks that **AWS Config** uses for remediation, stores config/secrets in **Parameter Store** (KMS-encrypted, consumed by **Lambda/ECS/CloudFormation**), logs **Session Manager** activity to **CloudWatch/S3/CloudTrail**, reaches services privately via **VPC endpoints**, and responds to **EventBridge** events. It is the connective tissue between security findings and automated response, and the secure alternative to SSH-based administration.

---

## Pricing and Cost Considerations

Most core capabilities — **Session Manager, Run Command, Patch Manager, State Manager, and standard Parameter Store** — are **free**, with charges for **advanced parameters** and higher Parameter Store throughput, **Automation** steps beyond a free tier, on-premises **advanced-tier** managed instances, and features like **OpsCenter**/Explorer. Because Session Manager removes bastion hosts and Patch Manager automates patching, SSM often *reduces* cost and risk. The levers are using standard parameters where possible and scoping advanced/hybrid features. Exact prices vary by Region and capability.

---

## Exam Relevance

**SAA-C03:** Know SSM for Session Manager (no bastion/SSH), Parameter Store for config/secrets, and automated operations in architectures. Design depth.

**SOA-C03:** Deepest operationally — Patch Manager, Run Command, Automation runbooks, Maintenance Windows, State Manager/Inventory, and Session Manager. Operations depth; heavily weighted.

**SCS-C03:** Secure operations — Session Manager instead of inbound SSH (with logging), least-privilege session IAM, Parameter Store SecureString with KMS (and the decrypt-permission requirement), VPC endpoints for private management, and Automation for remediation. Security depth.

---

## Summary

AWS Systems Manager is the operations suite for AWS and hybrid fleets: the SSM Agent plus an instance role makes a node manageable, after which capabilities like Session Manager (keyless, portless, logged shell), Patch Manager (fleet patching with baselines/maintenance windows), Run Command, Automation runbooks (remediation/self-healing), and Parameter Store (KMS-encrypted config/secrets) operate on it through IAM-controlled, audited APIs. Using the three VPC endpoints keeps management private, and SecureString reads require KMS decrypt. SSM replaces insecure SSH/bastion administration with auditable, scalable, API-driven operations and is the bridge from detection to automated response. The recurring exam points are Session Manager (no SSH/bastion), the agent+role+endpoints requirement, and Parameter Store vs. Secrets Manager.

---

## Quick Check

1. How does Session Manager give you a shell on an instance without SSH keys, inbound ports, or a bastion host?
2. What three things must be in place for an instance to become a managed node, and which endpoints keep management private?
3. Which capability automates fleet-wide OS patching with compliance reporting, and what defines which patches are approved?
4. What are Automation runbooks used for, and how do they relate to AWS Config remediation?
5. Beyond SSM read permission, what does reading a SecureString parameter require?

---

## What's Next

Pair this with **Amazon EC2** (managed nodes), **AWS Config** (remediation via Automation), **AWS Secrets Manager** (vs. Parameter Store for secrets), and the SOA-C03 automation/remediation lessons.
