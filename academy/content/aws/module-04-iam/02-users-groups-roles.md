---
title: "Users, Groups, and Roles"
type: content
estimated_minutes: 8
cert_tags: ["aws_ccp", "aws_saa", "aws_soa"]
---

# Users, Groups, and Roles

## Overview

IAM Users, Groups, and Roles are the three ways you can create identities in AWS. Each serves a different purpose, and knowing when to use each is fundamental to building a secure AWS environment. A common exam question type presents a scenario and asks you to identify the appropriate IAM construct.

## IAM Users

An IAM User is a long-term identity that represents a person or application. Each user has a unique name within the AWS account and can have up to two types of credentials: **console access** (username + password) for the AWS Management Console, and **programmatic access** (access key ID + secret access key) for the CLI, SDK, and API.

Best practices: enable MFA on all users, rotate access keys regularly, never share user credentials between people or applications, and never use the root account user for day-to-day operations. IAM Users should be created for each individual person who needs AWS access — one user per person, not one user shared across a team.

The hard limit is 5,000 IAM Users per account. For larger organizations or applications with many users, consider IAM Identity Center (formerly SSO) or federated access.

## IAM Groups

IAM Groups are collections of IAM Users. You attach policies to groups, and all users in the group inherit those permissions. Groups cannot be nested (groups of groups) and a user can belong to up to 10 groups.

Groups are the right way to manage permissions at scale. Instead of attaching policies to each user individually, create groups that match job functions: Developers, Ops, ReadOnly, BillingAdmins. When a new employee joins, add them to the appropriate group. When they change roles, move them to a different group. When they leave, delete their user — their removal from all groups is automatic.

Groups do not have credentials and cannot be used as principals in IAM policies or resource-based policies.

## IAM Roles

IAM Roles are the most powerful and flexible IAM construct, and the one most commonly misunderstood. Unlike users, roles have no long-term credentials. Instead, they have a trust policy that defines who can assume the role, and permission policies that define what the role can do. When a principal assumes a role, they receive temporary security credentials (via STS — Security Token Service) that expire after a configurable duration.

**Key role use cases:** EC2 instances accessing S3 or DynamoDB (attach an IAM role to the EC2 instance — the application running on it inherits the role's permissions without needing hardcoded credentials), cross-account access (assume a role in another AWS account), federated users (SAML 2.0 or OIDC identity providers assume AWS roles), and AWS services acting on your behalf (Lambda execution role, ECS task role).

## Summary

IAM Users are for individuals and long-running applications with long-term credentials. IAM Groups organize users by job function, enabling permissions management at scale. IAM Roles provide temporary credentials to AWS services, cross-account principals, and federated users — they're the preferred mechanism for any non-human access. Never use root; use roles instead of users wherever possible for applications.

## What's Next

Next: IAM Policies — the JSON documents that define exactly what actions are allowed or denied, and how they're evaluated.
