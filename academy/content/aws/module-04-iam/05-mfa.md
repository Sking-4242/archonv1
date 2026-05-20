---
title: "Multi-Factor Authentication (MFA)"
type: content
estimated_minutes: 6
cert_tags: ["aws_ccp", "aws_saa", "aws_scs"]
---

# Multi-Factor Authentication (MFA)

## Overview

Multi-Factor Authentication (MFA) adds a second verification step beyond a password. Even if an attacker obtains an IAM user's password, they cannot log in without also having the MFA device. Enabling MFA on all human IAM users — and critically on the root account — is one of the highest-value security actions you can take on a new AWS account.

## MFA Device Types

AWS supports several MFA device types: **Virtual MFA devices** (apps like Google Authenticator, Authy, or Microsoft Authenticator running on a phone — generate TOTP codes). **Hardware TOTP tokens** (physical devices like Gemalto or Thales tokens — generate time-based codes). **FIDO Security Keys** (hardware devices like YubiKey that use public-key cryptography; highly phishing-resistant). **Hardware key fob MFA** (for GovCloud accounts).

Virtual MFA is the most common in practice — free, convenient, and widely supported. Hardware security keys are recommended for high-privilege accounts and root.

## Enforcing MFA via IAM Policy

You can require MFA before users can perform sensitive actions using an IAM policy condition: `"Condition": {"Bool": {"aws:MultiFactorAuthPresent": "true"}}`. Combining this with a deny policy, you can enforce that users must have authenticated with MFA to access certain resources (S3 buckets with sensitive data, IAM management actions, etc.).

A common pattern: create a policy that allows all actions only when MFA is present, and denies everything except the ability to manage one's own MFA device without MFA. This forces users to set up MFA before they can do anything productive.

## Root Account MFA Is Critical

The root account has unlimited access to everything in the AWS account and cannot be restricted by IAM policies. A compromised root account means full account compromise — including the ability to delete all IAM users, modify billing, and access all data.

Enable MFA on root immediately after creating an account. Use a dedicated hardware MFA device (not tied to your phone number) and store it securely. Then use the root account as rarely as possible — only for tasks that explicitly require root (like changing account email, closing the account, or managing support plan).

## Summary

MFA requires a second factor beyond a password, dramatically reducing the risk of credential compromise. Enable it on the root account immediately and on all IAM users with console access. Use IAM policy conditions (aws:MultiFactorAuthPresent) to require MFA for sensitive operations. Hardware security keys offer the strongest protection against phishing.

## What's Next

Next: AWS Organizations and Multi-Account Strategy — how to manage multiple AWS accounts centrally and apply governance at scale.
