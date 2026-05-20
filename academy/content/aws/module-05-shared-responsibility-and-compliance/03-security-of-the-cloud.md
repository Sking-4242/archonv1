---
title: "Security Of the Cloud (AWS Responsibility)"
type: content
estimated_minutes: 6
cert_tags: ["aws_ccp"]
---

# Security Of the Cloud (AWS Responsibility)

## Overview

AWS's security responsibilities are extensive and expensive — they're a core part of the value proposition of cloud. AWS invests billions in security annually, employing thousands of security engineers and operating physical data centers with multiple layers of physical and logical security controls.

## Physical and Environmental Security

AWS data centers are purpose-built facilities with perimeter security (fencing, guards, cameras), multiple physical access controls (badge access, biometrics, man-traps), environmental controls (redundant power, cooling, fire suppression), and geographic distribution (multiple AZs and Regions to survive disasters). The locations of AWS data centers are confidential — AWS doesn't publicize which cities house its facilities, as a physical security measure.

AWS undergoes regular third-party audits (SOC 1, SOC 2, SOC 3, ISO 27001, PCI DSS) to verify its physical and logical security controls. These audit reports are available through AWS Artifact.

## Infrastructure Security

AWS is responsible for the security of the global network (fiber, peering, DDoS mitigation at the infrastructure level), the hypervisor that provides isolation between customer workloads on shared hardware, the firmware and hardware of servers, and the managed service software stacks (the RDS database engine, the Lambda runtime, etc.).

Importantly, AWS is responsible for ensuring that your EC2 instances are isolated from other customers' instances running on the same physical host. The hypervisor enforces this boundary — a bug in the hypervisor would be an AWS responsibility, not yours.

## Summary

AWS is responsible for: physical data center security (facilities, guards, access controls), hardware security (servers, networking, storage), the hypervisor and virtualization layer (isolation between customer workloads), global network security, and the software stacks for managed services. These controls are verified by third-party auditors and documented in compliance reports available through AWS Artifact.

## What's Next

Next: Compliance programs — how AWS helps you meet regulatory requirements and the tools available for compliance verification.
