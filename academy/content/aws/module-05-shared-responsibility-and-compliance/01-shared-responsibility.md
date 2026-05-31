---
title: "The Shared Responsibility Model"
type: content
estimated_minutes: 8
cert_tags: ["aws_ccp", "aws_saa"]
---

# The Shared Responsibility Model

## Overview

The AWS Shared Responsibility Model defines the boundary between what AWS secures and what you are responsible for securing. It's one of the most important conceptual frameworks in AWS, appearing on every certification exam and informing every security decision.

The model can be summarized in one sentence: AWS is responsible for security OF the cloud; you are responsible for security IN the cloud. The line between "of" and "in" moves depending on the service model (IaaS vs. PaaS vs. SaaS).

## Security OF the Cloud (AWS's Responsibility)

AWS is responsible for the security of the underlying infrastructure: the physical hardware (servers, networking equipment, storage devices), the physical facilities (data centers with guards, cameras, access controls, power), the global network infrastructure (fiber, peering points, edge locations), and the software that provides virtualization (the hypervisor).

AWS also manages the security of its managed services — the software that powers RDS, Lambda, DynamoDB, and other services where you consume an API rather than managing servers. When you use RDS, AWS is responsible for the underlying database engine's security patching, the OS underneath it, and the hardware it runs on.

## Security IN the Cloud (Your Responsibility)

You are responsible for everything you deploy and configure on top of AWS's infrastructure. For EC2 (IaaS), this means: the guest operating system (patching, hardening), any application software installed on the OS, data encryption (at rest and in transit), network configuration (security groups, NACLs), and IAM (who can access your resources).

As you move to higher-level services, your scope narrows. For RDS (PaaS), AWS handles the OS and database engine; you handle: data encryption configuration, database user management, network access (security groups, parameter groups), and backup configuration. For Lambda, you handle only: the function code, function-level IAM roles, and data in the function's environment.

## Why the Model Matters

The Shared Responsibility Model matters because misunderstanding it leads to security gaps. A common misconception: "It's in the cloud, so AWS takes care of security." This is dangerously incomplete. S3 buckets are not encrypted by default (though S3 now enables server-side encryption by default — know the current state). Security groups don't restrict egress by default. IAM users have no permissions by default — but you must ensure you don't give them too many.

AWS's responsibility ends at the infrastructure level. Your data, your application code, your IAM configuration, and your network controls are always your responsibility, regardless of which AWS services you use.

## Summary

AWS is responsible for security OF the cloud (hardware, physical facilities, hypervisor, managed service software). You are responsible for security IN the cloud (IAM, data encryption, OS patching on EC2, application code, network configuration). The boundary moves with the service model — managed services like Lambda shift more responsibility to AWS than IaaS like EC2.

## Examples

A retail startup launches an e-commerce site on EC2. They assume that because the servers are on AWS, security is "handled." Three months later, a misconfigured security group exposes their database to the internet. This is a textbook Shared Responsibility failure — AWS secured the physical host and hypervisor perfectly, but the customer owned network configuration and left a door open. The boundary between "of" and "in" bit them directly.

A healthcare company migrates from self-hosted SQL Server to Amazon RDS. Under the shared model, AWS takes over OS patching, database engine updates, and hardware maintenance — responsibilities the company previously managed with a dedicated DBA team. The company now focuses its security effort on what remains theirs: encrypting the database at rest with KMS, restricting security group ingress to only application servers, and auditing database user privileges. The model doesn't eliminate their security work; it reshapes where that work lives.

A platform engineering team at a fintech firm is deciding whether to run their queue system on self-managed Kafka on EC2 or switch to Amazon SQS. Part of their analysis is explicitly about the shared responsibility boundary: SQS shifts the broker software, OS, and hardware entirely to AWS, leaving the team responsible only for message-level access controls and encryption. They choose SQS not just for operational simplicity, but because their security team's bandwidth is limited and reducing their responsibility surface is a strategic advantage.

## Think About It

1. Why does the responsibility boundary shift when you move from EC2 to Lambda? What specific responsibilities does AWS absorb, and what concrete risks does that shift introduce — if any?
2. A developer tells you: "We use S3, so our data is stored securely by AWS." What is incomplete about that statement, and what questions would you ask to understand the actual security posture of that data?
3. What would happen if every organization using AWS assumed AWS was responsible for IAM configuration? Describe the realistic consequences in terms of actual attack vectors.
4. How would you decide where to draw your own security investment boundary when using a mix of IaaS (EC2), PaaS (RDS), and SaaS-like (Lambda) services in the same architecture?
5. The shared responsibility model is often compared to renting an apartment versus owning a house. Where does that analogy break down, and what does the breakdown reveal about unique risks in the cloud model?

## Quick Check

**Q1.** Under the AWS Shared Responsibility Model, who is responsible for patching the operating system on an EC2 instance?
- A) AWS, because EC2 runs on AWS infrastructure
- B) The customer, because EC2 is an IaaS service
- C) AWS for the kernel, the customer for user-space packages
- D) It depends on the EC2 instance type

**Answer: B** — EC2 is Infrastructure as a Service; the customer controls and is responsible for the guest OS, including all patching and hardening.

**Q2.** When a customer uses Amazon RDS, which of the following is AWS responsible for?
- A) Database user permissions
- B) Enabling encryption at rest
- C) Patching the underlying database engine
- D) Configuring security group ingress rules

**Answer: C** — With RDS, AWS manages the database engine software, including patches and updates, as part of the managed service. User permissions, encryption configuration, and security groups remain the customer's responsibility.

**Q3.** Which one-sentence summary best captures the Shared Responsibility Model?
- A) AWS secures all data; customers secure the application code.
- B) AWS is responsible for security OF the cloud; customers are responsible for security IN the cloud.
- C) Customers are responsible for physical security; AWS is responsible for logical security.
- D) AWS and customers share equal responsibility for every security control.

**Answer: B** — This is the official AWS framing: AWS handles the underlying infrastructure ("of the cloud"), while customers handle what they deploy and configure on top of it ("in the cloud").

## What's Next

Next: A detailed look at what's specifically in your security perimeter — the controls you own and must configure correctly.
