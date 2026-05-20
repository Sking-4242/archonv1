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

## What's Next

Next: A detailed look at what's specifically in your security perimeter — the controls you own and must configure correctly.
