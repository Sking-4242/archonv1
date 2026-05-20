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

## What's Next

Next: A deep dive into Users, Groups, and Roles — the building blocks of IAM identity management.
