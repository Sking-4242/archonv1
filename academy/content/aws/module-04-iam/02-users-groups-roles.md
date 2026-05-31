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

## Examples

A ten-person SaaS startup onboards a new backend engineer. Rather than duplicating permissions by attaching five separate policies to the new IAM User, the team adds the user to a pre-existing "Developers" IAM Group. That group already has policies for CodeCommit, S3 (dev bucket only), CloudWatch Logs, and ECR. The engineer gets exactly the right access on day one, and when they leave six months later, deleting their user automatically removes them from all groups — no stale permissions to audit.

A production Lambda function processes payment records and needs to read from DynamoDB and write to SQS. The team creates an IAM Role called payment-processor-role with a trust policy that allows Lambda to assume it, and two permission policies: one allowing dynamodb:GetItem and dynamodb:Query on the payments table, and one allowing sqs:SendMessage on the orders queue. The Lambda function assumes this role at runtime and receives temporary STS tokens — no hardcoded credentials anywhere in the codebase. This is the canonical example of why roles exist: they make non-human access both secure and rotation-free.

A large enterprise uses Active Directory for employee identity management. Rather than creating 3,000 individual IAM Users in AWS, they configure SAML 2.0 federation between their Active Directory and AWS. Employees log in with their corporate credentials and are mapped to IAM Roles based on their AD group membership. When an employee leaves, disabling their AD account immediately revokes AWS access — no separate IAM offboarding required. This demonstrates how roles enable federated access at a scale that individual IAM Users simply cannot support.

## Think About It

1. Groups cannot be nested in IAM — you cannot put a group inside another group. Many other identity systems (like Active Directory) support nested groups. What problems might nested groups introduce in an authorization system, and why might AWS have deliberately chosen to exclude them?
2. The lesson states that roles should be preferred over users for application access because they use temporary credentials. But temporary credentials also expire — what mechanisms ensure that a long-running application (like an EC2 instance running for months) always has valid credentials without any manual intervention?
3. If an IAM User belongs to three groups, each with different permission policies, how does IAM determine what the user is actually allowed to do? What happens if Group A allows an action and Group B's policy is silent on it? What if Group C explicitly denies it?
4. The hard limit for IAM Users per account is 5,000. An enterprise with 50,000 employees needs AWS access for all of them. What architectural approaches could you use, and what trade-offs do each introduce in terms of operational complexity, security, and user experience?
5. Why is it never acceptable to use the root account for day-to-day operations, even for a solo developer who "is" the only admin? What specific risks remain even if the solo developer is careful and trustworthy?

## Quick Check

**Q1.** An IAM Group can contain which of the following?
- A) Other IAM Groups (nested groups)
- B) IAM Roles
- C) IAM Users only
- D) IAM Users and IAM Roles

**Answer: C** — IAM Groups can only contain IAM Users. Groups cannot be nested, and Roles cannot be members of groups.

**Q2.** A developer needs to grant an EC2 instance permission to read from an S3 bucket without storing credentials in the application. What is the correct approach?
- A) Create an IAM User with an access key and store it in an environment variable on the instance
- B) Attach an IAM Role with the required S3 permissions to the EC2 instance
- C) Add the EC2 instance to an IAM Group that has S3 read permissions
- D) Use the root account access key and rotate it monthly

**Answer: B** — IAM Roles attached to EC2 instances provide temporary credentials through the instance metadata service — no long-term credentials are needed or stored.

**Q3.** What is the maximum number of IAM Users allowed per AWS account?
- A) 1,000
- B) 10,000
- C) 5,000
- D) Unlimited

**Answer: C** — The hard limit is 5,000 IAM Users per account. Organizations needing more identities should use IAM Identity Center or federated access.

## What's Next

Next: IAM Policies — the JSON documents that define exactly what actions are allowed or denied, and how they're evaluated.
