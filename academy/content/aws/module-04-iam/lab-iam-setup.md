---
title: "Lab: Create Users, Groups, and Policies"
type: canvas
estimated_minutes: 30
cert_tags: ["aws_ccp", "aws_saa"]
---

# Lab: Create Users, Groups, and Policies

## Challenge

In this lab you'll build out a complete IAM structure for a fictional startup: two teams (developers and ops) each with appropriate least-privilege permissions. You'll write a custom IAM policy from scratch, test that it grants the right access, and diagram the entire identity structure in Archon.

## Learning Objectives

- Create IAM groups for Developer and Ops teams with appropriate managed policies
- Create IAM users and assign them to groups
- Write a custom IAM policy that grants least-privilege S3 access
- Test that the policy works as expected using the IAM Policy Simulator
- Diagram the IAM structure in the Archon canvas

## Steps

1. In IAM, create two groups: Developers (attach AmazonS3ReadOnlyAccess and AWSCloudShellFullAccess) and Ops (attach AmazonEC2FullAccess and AmazonS3FullAccess)
2. Create two IAM users: dev-user-1 (add to Developers group, enable console access) and ops-user-1 (add to Ops group, enable console access)
3. Enable MFA on both users using your authenticator app
4. In IAM → Policies → Create Policy → JSON editor, write a policy that allows GetObject and PutObject on a specific S3 bucket (arn:aws:s3:::your-bucket/*) and ListBucket on the bucket itself
5. Attach your new custom policy to dev-user-1 directly (as an inline test)
6. Open the IAM Policy Simulator (policysim.aws.amazon.com) and test that dev-user-1 can s3:GetObject on your bucket but cannot s3:DeleteBucket
7. Switch to the IAM Policy Simulator for ops-user-1 and confirm ec2:TerminateInstances is allowed
8. Open the Archon canvas and diagram: Account root → Developers group + Ops group → users, with policies shown as attached documents

## Archon Canvas Lab

Open the Archon canvas to diagram the architecture for this lab. Use the component library to place AWS services and label each with its key configuration.
