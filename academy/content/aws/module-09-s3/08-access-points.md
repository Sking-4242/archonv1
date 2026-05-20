---
title: "S3 Access Points and Multi-Region Access Points"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# S3 Access Points and Multi-Region Access Points

## Overview

As teams grow, managing a single bucket policy for dozens of applications becomes complex and error-prone. S3 Access Points solve this by giving each application its own named access point with its own policy, simplifying access management for shared datasets. Multi-Region Access Points extend this with automatic routing across regions.

## What Is an Access Point?

An access point is a named network endpoint attached to a bucket with its own access point policy (a subset of the bucket's permissions). You grant applications access to the access point rather than the bucket directly. Each access point can restrict access to a specific VPC, a specific prefix, or specific account — without changing the main bucket policy.

## Access Point Policies

Access point policies follow the same IAM JSON syntax as bucket policies. An access point policy can only grant permissions that the bucket policy also allows — it can't expand permissions. To simplify management, set the bucket policy to delegate access control entirely to access points, then manage all permissions in individual access point policies.

## VPC-Restricted Access Points

You can configure an access point to only accept requests from a specific VPC. When combined with a VPC endpoint for S3, this creates a private data access path where applications in the VPC can read/write S3 data without traffic leaving the AWS network. This is a common pattern for private data lakes.

## Multi-Region Access Points (MRAP)

MRAP provides a single global endpoint that routes requests to the lowest-latency S3 bucket in a replication group. Requests go to the nearest region automatically, and if that region is unavailable, traffic can failover. MRAP is backed by AWS Global Accelerator. Use it for globally distributed applications that need low-latency access to S3 data replicated across multiple regions.

## Summary

S3 Access Points decouple application access policies from the main bucket policy, making shared datasets manageable at scale. VPC-restricted access points enforce private access paths. Multi-Region Access Points add global routing and failover for geo-distributed workloads. These are advanced features that appear on SAA and SAP exams.

## What's Next

Next up: the S3 Canvas Lab — design a static hosting and CloudFront architecture in Archon.