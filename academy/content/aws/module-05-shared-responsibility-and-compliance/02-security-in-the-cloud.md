---
title: "Security In the Cloud (Your Responsibility)"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp", "aws_saa", "aws_scs"]
---

# Security In the Cloud (Your Responsibility)

## Overview

Understanding your security responsibilities requires mapping every component of your architecture and asking: is this managed by AWS, or do I manage it? This lesson catalogs the most important customer-side security responsibilities and the controls available to fulfill them.

## Data Security

You are always responsible for your data, regardless of where it's stored in AWS. Key data security controls: **Encryption at rest** — enable encryption for EBS volumes, S3 objects, RDS instances, and DynamoDB tables. Most AWS services support server-side encryption (SSE) using AWS-managed keys or your own KMS keys. **Encryption in transit** — use TLS for all connections. For EC2-to-RDS, ensure the DB engine is configured to require SSL. For API calls, use HTTPS (AWS endpoints only accept HTTPS for most services). **Data classification** — know what data you have, how sensitive it is, and apply proportional controls (don't treat log data like customer PII).

## IAM and Access Control

IAM is entirely your responsibility. AWS provides the IAM service, but how you configure it — who gets what permissions, whether MFA is enforced, whether least privilege is maintained — is your responsibility. Common failures: overly permissive IAM roles on EC2 (instance has AdministratorAccess because it was convenient), unused long-term access keys that were never revoked, missing MFA on privileged accounts.

Use IAM Access Analyzer, AWS Trusted Advisor, and AWS Security Hub to continuously audit your IAM configuration against best practices.

## Network Security

You control network security through VPC configuration (which subnets are public vs. private, route table rules), Security Groups (stateful firewall rules), NACLs (stateless firewall at subnet boundary), and VPC Flow Logs (network traffic logging). AWS doesn't configure any of these defaults to restrict your traffic — you must design and implement network segmentation. A default VPC is functional but not secure for production workloads.

## Summary

Customer security responsibilities include: data encryption (at rest and in transit), IAM configuration (least privilege, MFA, access key rotation), network security (VPC design, security groups, NACLs), OS patching (for EC2), and application security (code, dependencies, runtime configuration). Tools like IAM Access Analyzer, Security Hub, and Trusted Advisor help audit these controls continuously.

## Examples

A small SaaS company stores customer contracts in S3. Early on, they created an S3 bucket with public ACLs enabled during a debugging session and forgot to revert the setting. The contracts were exposed for two weeks before a security audit caught it. This illustrates why data security in the cloud is the customer's domain: AWS provided the encryption and access control tools, but applying them correctly — and maintaining that configuration over time — was entirely the company's responsibility.

A mid-size financial services firm onboards a new DevOps engineer who needs temporary access to production logs in CloudWatch. Instead of creating a scoped IAM role with read-only access to the specific log group, a well-meaning senior engineer attaches the AWS-managed PowerUserAccess policy to save time. Six months later, that engineer leaves the company, but the IAM user is never deactivated. This is a least-privilege failure in two acts: overly broad permissions granted for convenience, and no access review process. IAM Access Analyzer would have flagged the unused credentials, but only if someone was watching.

A security-conscious team at a healthcare company designs their VPC with three-tier network segmentation: public subnets for their load balancers, private subnets for application servers, and isolated subnets for RDS with no route to the internet. They attach security groups that allow only the application tier to reach the database on port 5432. They also enable VPC Flow Logs and ship them to CloudWatch for anomaly detection. This is network security done right — not because AWS required it, but because the team understood it was their design problem to solve.

## Think About It

1. Why is IAM considered one of the highest-risk customer responsibilities? What is it about misconfigured IAM that makes it a more common root cause of cloud breaches than misconfigured firewalls?
2. Encryption at rest protects data when storage is physically stolen or improperly decommissioned. Given that customers rarely have access to AWS hardware, what threat model actually justifies enabling encryption at rest in AWS — and does that change your view of how urgently to prioritize it?
3. What would happen if you deployed a production application in a default VPC without any modifications? Walk through the specific security gaps you would inherit and how an attacker might exploit them.
4. How would you decide whether to use AWS-managed KMS keys versus customer-managed KMS keys for encrypting sensitive data? What trade-offs are involved in that decision?
5. Security groups and NACLs both control network traffic, but they behave differently. Why does having both available create an opportunity for confusion, and how would you decide which to use for a given control?

## Quick Check

**Q1.** A company wants to ensure that no IAM user can perform actions in AWS without multi-factor authentication enabled. Which service is best suited to continuously audit and report on whether MFA is enforced?
- A) AWS Shield
- B) AWS Trusted Advisor
- C) AWS WAF
- D) Amazon Inspector

**Answer: B** — AWS Trusted Advisor includes checks for IAM security best practices, including whether MFA is enabled on the root account and IAM users with console access.

**Q2.** Which of the following is a customer responsibility when using Amazon RDS?
- A) Patching the underlying operating system
- B) Updating the database engine version
- C) Configuring security group rules to restrict database access
- D) Managing the physical storage hardware

**Answer: C** — With RDS, AWS handles OS patching and engine maintenance. The customer is responsible for network access controls, including which security groups govern inbound connections to the database.

**Q3.** A developer stores a plaintext database password in an EC2 instance's environment variable. Which customer security responsibility has been neglected?
- A) Physical security of the instance
- B) Hypervisor isolation
- C) Secrets management and application security
- D) Patching the EC2 host hardware

**Answer: C** — Storing credentials in plaintext environment variables is an application security failure. The customer is responsible for how secrets are stored and accessed — the correct approach is AWS Secrets Manager or Parameter Store with encryption.

## What's Next

Next: What AWS specifically handles — the security controls that happen below your visibility and responsibility level.
