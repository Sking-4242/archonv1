---
title: "Pillar: Security"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp", "aws_saa", "aws_sap"]
---

# Pillar: Security

## Overview

The Security pillar encompasses the ability to protect data, systems, and assets to take advantage of cloud technologies to improve your security posture. It applies throughout the architecture — from IAM to encryption to network controls to incident response.

## Security Pillar Design Principles

**Implement a strong identity foundation:** Use IAM with least privilege, centralize identity management with IAM Identity Center, eliminate long-term credentials where possible. **Enable traceability:** Log and monitor all actions (CloudTrail, VPC Flow Logs, CloudWatch). Automatically detect and respond to security events. **Apply security at all layers:** Not just the perimeter (WAF, Shield) but also within the VPC (security groups, NACLs), on the instance (OS hardening), and at the application layer (input validation). **Automate security best practices:** Security checks and responses should be automated, not manual. **Protect data in transit and at rest:** Encrypt everything by default.

## Key AWS Security Services

**IAM and Organizations** for identity and access control. **KMS** for encryption key management. **Shield and WAF** for DDoS and web application protection. **GuardDuty** for threat detection. **Security Hub** for centralized security posture. **Config** for configuration compliance. **CloudTrail** for audit logging. **Inspector** for vulnerability assessment. **Macie** for sensitive data discovery in S3. We cover all of these in Module 15.

## Summary

The Security pillar calls for strong identity (least privilege, MFA), full traceability (logging everything), defense in depth (security at every layer), automated responses to security events, and encryption of all data. AWS provides a suite of security services — GuardDuty, Security Hub, WAF, KMS — that implement these principles at scale.

## What's Next

Next: The Reliability pillar — designing systems that recover automatically from failure and scale to meet demand.
