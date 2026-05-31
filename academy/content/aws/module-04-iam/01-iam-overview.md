---
title: "IAM Overview"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp", "aws_saa", "aws_dva", "aws_soa"]
---

# IAM Overview

## Overview

AWS Identity and Access Management (IAM) is the service that controls who can authenticate to AWS and what they're authorized to do. Every API call to AWS — whether from the console, CLI, or SDK — passes through IAM for authentication and authorization. IAM is the security backbone of every AWS account.

IAM is a global service: users, groups, roles, and policies you create in IAM are available across all AWS Regions. There's no Region selector for IAM. Understanding IAM deeply is foundational to every AWS certification beyond CCP.

## IAM Is Free

IAM has no additional charge. You pay for the AWS resources that IAM-authenticated principals access, not for IAM itself. This makes it economical to create as many users, groups, roles, and policies as your security model requires — there's no incentive to share credentials for cost reasons.

IAM is also not subject to the 12-month free tier limitation — it's permanently free as a service. The cost consideration with IAM is operational: managing a large number of identities requires governance processes.

## Authentication vs. Authorization

These two concepts are often confused but are distinct: **Authentication** answers "Who are you?" — verifying that you are who you claim to be (username/password, access keys, MFA token). **Authorization** answers "What can you do?" — determining which actions you're permitted to perform based on your IAM policies.

In AWS, authentication happens when you provide credentials (username+password for console; access key+secret for API). Authorization happens when IAM evaluates your policies against the requested action. Both must succeed for an API call to proceed.

## IAM Identity Types

IAM has four principal (identity) types: **IAM Users** are long-term identities for humans or applications that access AWS using a username/password or access keys. **IAM Groups** are collections of users that share the same permissions — policies attached to a group apply to all members. **IAM Roles** are temporary identities assumed by users, services, or applications — they have no long-term credentials, only temporary tokens. **IAM Policies** are JSON documents that define permissions — they attach to users, groups, or roles to grant or deny specific API actions.

## Summary

IAM is the free, global service that controls authentication and authorization for every AWS API call. The four IAM identity types are Users (long-term, human or machine), Groups (collections of users), Roles (temporary, assumed by services or humans), and Policies (JSON permission documents attached to identities). Every interaction with AWS goes through IAM.

## Examples

A healthcare startup launches its first AWS account. The engineering lead logs in with the root account to set up S3 buckets, creates a single shared IAM user called "dev-team" with AdministratorAccess, and hands the credentials to everyone on the team. This violates almost every IAM principle in this lesson — no individual accountability, no separation of identity, and root is used for day-to-day work. The right move is to create individual IAM Users for each engineer, attach them to a group, and lock the root account behind MFA and a hardware key.

A mid-sized e-commerce company deploys a fleet of EC2 instances that need to read product images from an S3 bucket. Rather than embedding access keys in the application code, the team creates an IAM Role with a policy that allows only s3:GetObject on that specific bucket, and attaches the role to each EC2 instance. The application receives temporary credentials automatically through the EC2 metadata service — no secrets to rotate, no credentials to accidentally commit to GitHub. This is the authentication-then-authorization flow working exactly as designed.

A financial services firm running dozens of AWS accounts needs to audit every API call made across all accounts. They configure IAM to route all calls through CloudTrail, then use an S3 bucket in a dedicated security account as the central log archive. Because every AWS API call — console click, CLI command, SDK call — passes through IAM, CloudTrail captures a complete record. Understanding that IAM sits in front of every interaction makes it clear why IAM is the right control plane to anchor this audit strategy.

## Think About It

1. IAM is described as a global service with no regional scope. What security and operational implications does this have — and can you think of a scenario where that global nature could create a problem?
2. If IAM is permanently free, why might an organization still want to minimize the number of IAM Users it creates? What costs or risks remain even when the service itself has no price tag?
3. Authentication answers "Who are you?" and authorization answers "What can you do?" — but what happens in the gap between them? If authentication succeeds but authorization is never checked, what does that mean for your security posture, and have you seen this pattern anywhere outside of AWS?
4. The lesson says the four identity types are Users, Groups, Roles, and Policies. Policies aren't really "identities" in the traditional sense — they don't log in or make API calls. Why do you think AWS categorizes them alongside Users, Groups, and Roles?
5. What would have to be true about a system for you to decide that IAM Users alone (without roles) are sufficient for all access? Is there any legitimate use case, or is the answer always "use roles for non-human access"?

## Quick Check

**Q1.** Which of the following is true about IAM as an AWS service?
- A) It is region-specific and must be configured separately in each AWS Region
- B) It has no additional cost and is available globally across all Regions
- C) It is free only during the 12-month free tier period
- D) It requires a separate subscription for advanced features like MFA

**Answer: B** — IAM is a global service (not region-specific) and is permanently free — not subject to the 12-month free tier limitation.

**Q2.** An EC2 instance needs to write logs to an S3 bucket. Which IAM identity type should you use to grant this permission?
- A) IAM User with programmatic access keys embedded in the application
- B) IAM Group attached directly to the EC2 instance
- C) IAM Role attached to the EC2 instance
- D) Root account credentials stored in an environment variable

**Answer: C** — IAM Roles provide temporary credentials to AWS services like EC2 without requiring long-term credentials, which is the correct and secure pattern.

**Q3.** What is the difference between authentication and authorization in the context of an AWS API call?
- A) Authentication checks resource limits; authorization checks identity
- B) Authentication verifies identity (who you are); authorization determines what actions you are permitted to perform
- C) They are two names for the same process in AWS
- D) Authentication is handled by S3; authorization is handled by IAM

**Answer: B** — Authentication ("who are you?") uses credentials to verify identity; authorization ("what can you do?") evaluates IAM policies against the requested action. Both must succeed for the API call to proceed.

## What's Next

Next: A deep dive into Users, Groups, and Roles — the building blocks of IAM identity management.
