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

## Examples

A healthcare company runs a shared S3 data lake used by three different teams: a clinical research team, a billing team, and a data engineering team. Rather than writing a single sprawling bucket policy that tries to express all three teams' permissions in one JSON document, they create three access points — one per team — each with a policy scoped to only the prefixes and actions that team needs. When the billing team's requirements change, an administrator edits only the billing access point policy without risking accidental changes to the clinical research team's access. This is the core value proposition of access points: decomposing a complex shared-bucket policy into manageable, independently maintained units.

A financial services platform runs its analytics workloads on EC2 instances inside a private VPC with no internet gateway. The data they need is in S3, but the security team requires that no data ever traverse the public internet. They create a VPC-restricted access point tied to their VPC and configure a VPC endpoint for S3. The EC2 instances connect to S3 exclusively through the access point — the request never leaves the AWS network. The access point policy also restricts access to a specific `analytics/` prefix, so even if a compromised instance attempts to access other prefixes, the access point policy blocks it at the S3 layer.

A global media company distributes video assets to content delivery pipelines running in `us-east-1`, `eu-west-1`, and `ap-southeast-1`. They configure Cross-Region Replication to keep the asset library in sync across all three regions, then create a Multi-Region Access Point over all three buckets. Their encoding services use the MRAP endpoint — a single hostname — without any region-specific logic. AWS Global Accelerator routes each request to the lowest-latency bucket automatically. During a planned maintenance window in `eu-west-1`, MRAP transparently routes European traffic to the next-nearest region. The engineering team never had to write routing logic or handle failover — the infrastructure absorbed the complexity.

## Think About It

1. An access point policy can only grant permissions that the bucket policy also allows. Why did AWS design it this way — what security property does this constraint enforce, and what would break if access points could expand permissions beyond the bucket policy?
2. If you have 20 teams sharing one S3 bucket and each gets its own access point, what happens to IAM policy management? Have you simplified the problem, or just moved the complexity to a different layer? What organizational structure or tooling would you need to make this scale?
3. A VPC-restricted access point prevents any request from outside the specified VPC. How would you handle a scenario where an on-premises system also needs access to the same data? What networking constructs would let you extend the private path from on-premises to S3 without relaxing the access point restriction?
4. Multi-Region Access Points route requests to the lowest-latency bucket in a replication group. Because replication is asynchronous, a write to the MRAP endpoint might land in Region A, but a subsequent read (routed to Region B) might not yet have the object. How would you design an application that uses MRAP for reads and writes while being safe in the face of replication lag?
5. What trade-offs would you weigh when deciding between managing access to a shared S3 bucket via access points versus splitting the data into separate buckets per team? Consider operational complexity, cost, cross-team data sharing, and audit requirements.

## Quick Check

**Q1.** Which statement correctly describes the relationship between an S3 access point policy and the bucket policy?
- A) The access point policy overrides the bucket policy entirely
- B) The access point policy can only grant permissions that the bucket policy also allows
- C) The bucket policy is ignored when an access point policy is present
- D) Access point policies apply only to cross-account access

**Answer: B** — An access point policy cannot expand permissions beyond what the bucket policy grants; it can only further restrict them, ensuring that the bucket policy remains the authoritative ceiling for all access.

**Q2.** What network restriction can you configure on an S3 Access Point to ensure S3 traffic never leaves the AWS network?
- A) Attach a security group to the access point
- B) Enable Block Public Access on the access point
- C) Restrict the access point to a specific VPC and use a VPC endpoint for S3
- D) Enable Transfer Acceleration on the access point

**Answer: C** — A VPC-restricted access point, combined with an S3 VPC endpoint, ensures all traffic between your workload and S3 stays on the AWS private network and never traverses the public internet.

**Q3.** What underlying AWS service powers the global request routing for Multi-Region Access Points?
- A) Amazon CloudFront
- B) Amazon Route 53 latency-based routing
- C) AWS Global Accelerator
- D) AWS Transit Gateway

**Answer: C** — Multi-Region Access Points are backed by AWS Global Accelerator, which uses anycast routing to direct each request to the lowest-latency bucket in the MRAP replication group.

## What's Next

Next up: the S3 Canvas Lab — design a static hosting and CloudFront architecture in Archon.