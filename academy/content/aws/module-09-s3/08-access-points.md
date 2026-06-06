---
title: "S3 Access Points and Multi-Region Access Points"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# S3 Access Points and Multi-Region Access Points

## Overview

A shared S3 bucket used by multiple teams or applications eventually develops a bucket policy problem. Each new team needs different permissions scoped to different prefixes, and each new requirement gets appended to the same JSON document. After a few years, the bucket policy is hundreds of lines long, reviewed by no one, and changed by everyone. S3 Access Points solve this by decomposing bucket access management into independently maintained, per-application policy units. Each access point is a named network endpoint attached to a bucket with its own access policy — scoped to specific prefixes, specific accounts, or specific VPCs. Instead of one giant shared policy, you have N small focused policies that are independently auditable and changeable without risk to other teams.

The relationship between access point policies and bucket policies is additive in the restrictive direction: an access point policy can only grant permissions that the bucket policy also allows. This creates a two-layer authorization model. The bucket policy sets the ceiling — it declares that access points are delegated to control access — and each access point policy sets the actual effective permissions within that ceiling. This design means the bucket policy can be simplified to a single delegation statement, and all the specific per-team logic lives in access point policies where it is easier to maintain and review.

Multi-Region Access Points (MRAP) extend the concept from access management to global routing. An MRAP sits in front of S3 buckets in multiple regions that are kept in sync through S3 replication. It exposes a single global hostname backed by AWS Global Accelerator. A request to the MRAP endpoint is automatically routed to the lowest-latency bucket in the replication group. If one region becomes unavailable, routing fails over to the next-nearest bucket. The application code never changes — it always points at the same MRAP ARN. Regional failover is managed at the infrastructure layer, not the application layer.

## Core Concepts

### What Is an Access Point

An access point is a named, per-bucket network endpoint with its own access point policy. Key properties:

- Each access point has a unique ARN and hostname of the form `accesspoint-name-accountid.s3-accesspoint.region.amazonaws.com`
- An access point policy is an IAM policy document scoped to the access point — same JSON syntax as a bucket policy
- Access points can enforce a network origin restriction: internet-accessible (default) or VPC-restricted
- One bucket can have up to 10,000 access points
- Access point operations: any S3 data plane operation (GetObject, PutObject, ListBucket, etc.) can be performed via the access point ARN

### The Two-Layer Permission Model

This is the most important concept for exams. Access point permissions are evaluated in conjunction with the bucket policy, not instead of it. Both must grant the access. The standard pattern is:

1. Set the bucket policy to delegate all access control to access points: grant `s3:*` to any principal that accesses via an access point ARN in the same account.
2. Write each access point policy to grant only the specific permissions each team needs.

If the bucket policy does not grant a permission, no access point policy can grant it. If the access point policy does not grant a permission, the caller cannot perform the action even if the bucket policy would allow it. The effective permission is the intersection of both.

### VPC-Restricted Access Points

An access point can be locked to a specific VPC: only API calls that originate from within that VPC are accepted. Any request from outside the VPC — even with valid IAM credentials — is rejected by the access point. Pair this with an S3 VPC Endpoint (Gateway type) so traffic between the VPC and S3 travels entirely over the AWS private network without touching the public internet. This is the canonical pattern for private data lake access.

The VPC restriction is set at access point creation time and cannot be changed afterward. If you need internet access later, you must create a new access point.

### Access Point Policies — Per-Team Scoping

Each team's access point policy is scoped to:
- Specific prefixes the team is allowed to access
- Specific API actions (read-only vs. read-write)
- Specific source accounts (for cross-account access)
- Optionally, specific IAM principals within the team's account

### Multi-Region Access Points (MRAP)

MRAP provides a single global endpoint (ARN + hostname) backed by AWS Global Accelerator that routes requests to the lowest-latency S3 bucket in a configured replication group. Architecture:

1. Create S3 buckets in multiple regions
2. Configure bidirectional or multi-directional S3 replication between them (so all buckets hold the same data)
3. Create an MRAP that references all of the buckets
4. Applications use the MRAP ARN for all reads and writes

Request routing: a GET or PUT to the MRAP hostname enters the AWS network at the nearest Global Accelerator edge PoP and is directed to the bucket in the lowest-latency region. Because replication is asynchronous, reads may occasionally return slightly stale data (the object exists in Region A but a millisecond-ago write from Region B has not yet replicated). Design MRAP-based applications to tolerate eventual consistency for reads.

MRAP also supports failover routing policies: you can designate buckets as active or passive. In active-passive, all traffic goes to active buckets unless they fail, then passive buckets receive traffic. In active-active, all buckets serve traffic based on latency.

### Object Lambda Access Points (Connection to Lesson 07)

Object Lambda Access Points build on regular access points. A regular access point serves as the "supporting access point" that the Object Lambda accesses to fetch the original object; the Object Lambda Access Point is the endpoint callers use. This is covered in depth in Lesson 07 (Event Notifications and Object Lambda) but architecturally belongs here because access points are the underlying mechanism.

## Configuration Reference

### Bucket Policy for Access Point Delegation

```json
// bucket-policy-access-point-delegation.json
// Simplest possible bucket policy: delegate everything to access points
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DelegateToAccessPoints",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "*",
      "Resource": [
        "arn:aws:s3:::my-shared-bucket",
        "arn:aws:s3:::my-shared-bucket/*"
      ],
      "Condition": {
        "StringEquals": {
          "s3:DataAccessPointAccount": "123456789012"
          // Only allow access via access points owned by this account
          // Prevents cross-account access points from being used without explicit bucket policy grants
        }
      }
    }
  ]
}
```

```bash
aws s3api put-bucket-policy \
  --bucket my-shared-bucket \
  --policy file://bucket-policy-access-point-delegation.json
```

### Create a Standard (Internet-Accessible) Access Point

```bash
# Create an internet-accessible access point for the analytics team
aws s3control create-access-point \
  --account-id 123456789012 \
  --name analytics-team-ap \
  --bucket my-shared-bucket
# No --vpc-configuration means internet-accessible (default)
# Access point ARN: arn:aws:s3:us-east-1:123456789012:accesspoint/analytics-team-ap
```

```json
// analytics-team-access-point-policy.json
// Grant the analytics team read-only access to the analytics/ prefix only
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AnalyticsTeamReadOnly",
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:role/AnalyticsTeamRole"
        // Scope to a specific IAM role — not all principals in the account
      },
      "Action": [
        "s3:GetObject",
        "s3:ListBucket"
        // Read-only: GetObject for downloads, ListBucket for directory listing
      ],
      "Resource": [
        "arn:aws:s3:us-east-1:123456789012:accesspoint/analytics-team-ap/object/analytics/*",
        // Object-level actions scoped to the analytics/ prefix
        "arn:aws:s3:us-east-1:123456789012:accesspoint/analytics-team-ap"
        // Bucket-level actions (ListBucket) on the access point itself
      ]
    }
  ]
}
```

```bash
# Apply the access point policy
aws s3control put-access-point-policy \
  --account-id 123456789012 \
  --name analytics-team-ap \
  --policy file://analytics-team-access-point-policy.json

# Use the access point ARN in an API call
aws s3api get-object \
  --bucket "arn:aws:s3:us-east-1:123456789012:accesspoint/analytics-team-ap" \
  --key "analytics/2024/Q4/report.csv" \
  /tmp/report.csv
# The --bucket parameter accepts access point ARNs directly
```

### Create a VPC-Restricted Access Point

```bash
# Create an access point restricted to a specific VPC
aws s3control create-access-point \
  --account-id 123456789012 \
  --name private-datalake-ap \
  --bucket my-shared-bucket \
  --vpc-configuration VpcId=vpc-0abc123def456789a
# Any request NOT originating from vpc-0abc123def456789a is rejected,
# regardless of IAM credentials

# Verify the VPC restriction
aws s3control get-access-point \
  --account-id 123456789012 \
  --name private-datalake-ap
# Response includes "VpcConfiguration": {"VpcId": "vpc-0abc123def456789a"}
# and "NetworkOrigin": "VPC"
```

```bash
# Also create an S3 VPC Endpoint (Gateway type) so traffic stays off the internet
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0abc123def456789a \
  --service-name com.amazonaws.us-east-1.s3 \
  --vpc-endpoint-type Gateway \
  --route-table-ids rtb-0abc123def456789a
# With VPC endpoint + VPC-restricted access point:
# EC2 → VPC Gateway Endpoint → S3 access point
# Zero internet hops; data never leaves AWS private network
```

### Create a Multi-Region Access Point

```bash
# Create an MRAP across three regional buckets
aws s3control create-multi-region-access-point \
  --account-id 123456789012 \
  --details '{
    "Name": "global-media-assets",
    "Regions": [
      {"Bucket": "media-assets-us-east-1"},
      {"Bucket": "media-assets-eu-west-1"},
      {"Bucket": "media-assets-ap-southeast-1"}
    ],
    "PublicAccessBlock": {
      "BlockPublicAcls": true,
      "IgnorePublicAcls": true,
      "BlockPublicPolicy": true,
      "RestrictPublicBuckets": true
    }
  }'
# MRAP creation is async — it takes a few minutes to provision
# MRAP ARN: arn:aws:s3::123456789012:accesspoint/global-media-assets.mrap
# MRAP hostname: <alias>.mrap.accesspoint.s3-global.amazonaws.com

# Check creation status
aws s3control describe-multi-region-access-point \
  --account-id 123456789012 \
  --name global-media-assets
```

```bash
# Configure failover routing: make eu-west-1 passive (failover only)
aws s3control submit-multi-region-access-point-routes \
  --account-id 123456789012 \
  --mrap "arn:aws:s3::123456789012:accesspoint/global-media-assets.mrap" \
  --route-updates '[
    {
      "Bucket": "media-assets-us-east-1",
      "TrafficDialPercentage": 100
      // Active: receives traffic normally
    },
    {
      "Bucket": "media-assets-eu-west-1",
      "TrafficDialPercentage": 0
      // Passive: receives no traffic unless active buckets are unavailable
    }
  ]'
# TrafficDialPercentage 0 = passive; 100 = active; values between 0-100 for weighted routing
```

### Console Path

**Standard Access Point**: S3 → bucket → Access Points tab → Create access point → name it → select network origin (Internet or VPC) → attach a policy → Create.

**MRAP**: S3 → Multi-Region Access Points (left nav) → Create Multi-Region Access Point → add buckets from different regions → configure Block Public Access → Create.

## How to Decide

| Scenario | Use What | Why |
|---|---|---|
| Multiple teams share one bucket, each needs different prefix access | Access points per team | Decompose the bucket policy; each team's policy is independent |
| Applications in a private VPC must access S3 without internet | VPC-restricted access point + VPC Gateway Endpoint | Private data path; access point blocks any non-VPC request |
| Global app needs low-latency S3 reads from multiple continents | MRAP | Single global endpoint; Global Accelerator routes to nearest bucket |
| Regional DR failover for S3 with automatic traffic switching | MRAP active-passive | TrafficDialPercentage 0 on standby; switch to 100 on failover |
| Different consumers need different views of the same stored object | Object Lambda Access Point | Transform on-the-fly per caller; one stored copy |
| On-premises access to S3 without public internet | VPC-restricted AP + Direct Connect/VPN | Extend the private path from on-premises to S3 |
| Cross-account team needs scoped access without bucket policy changes | Cross-account access point | Grant foreign account's role access to a specific access point |

## How This Connects

- **S3 Replication (Lesson 05)**: MRAP requires the backing buckets to be kept in sync. CRR (Cross-Region Replication) is what populates the same data into all regional buckets in the MRAP group. MRAP handles routing; replication handles data synchronization.
- **S3 Event Notifications / Object Lambda (Lesson 07)**: Object Lambda Access Points build on regular access points. The regular access point is the "supporting access point" that Object Lambda uses to fetch original objects. Understanding both access points and Object Lambda together creates a complete picture of the S3 access plane.
- **VPC and Networking (Module 07)**: VPC-restricted access points and S3 VPC endpoints are complementary controls. The VPC endpoint establishes the private routing path; the access point restriction enforces that no request can come from outside that path. Together they create defense-in-depth for private data access.
- **IAM (Module 06)**: The two-layer permission model (bucket policy + access point policy) is a specific application of the IAM principle of least privilege. The bucket policy acts as the ceiling; the access point policy acts as the floor for each team. Understanding how IAM policy evaluation works — specifically that both must allow an action — is prerequisite knowledge.
- **Global Accelerator (Module 10)**: MRAP is powered by AWS Global Accelerator. Understanding that Global Accelerator uses anycast IP routing to direct traffic to the nearest AWS entry point — and that this is different from CloudFront's CDN caching model — is important for MRAP exam questions.

## Exam Traps

1. **"An access point policy overrides the bucket policy."** False. The access point policy and bucket policy are both evaluated. The effective permission is the intersection — the caller must be allowed by both. Neither document overrides the other. The bucket policy sets the ceiling; the access point policy can only operate within that ceiling.

2. **"You can change a VPC-restricted access point to internet-accessible after creation."** False. The network origin restriction (Internet vs. VPC) is set at creation time and is immutable. If you need to change the network origin, you must create a new access point.

3. **"MRAP provides synchronous multi-region writes — writing to MRAP ensures the object is immediately available in all regions."** False. MRAP routes the write to one regional bucket, and replication propagates the object to other buckets asynchronously. A subsequent read routed to a different region may not yet see the write. MRAP is eventually consistent, not strongly consistent across regions.

4. **"Multi-Region Access Points use CloudFront for routing."** False. MRAP is backed by AWS Global Accelerator, not CloudFront. CloudFront is a CDN for caching content at edge locations; Global Accelerator is a network routing service that directs traffic to the nearest AWS origin. These are distinct services with different use cases.

5. **"An access point allows access to the entire bucket by default."** False. An access point policy must explicitly grant access. Without an access point policy, no principal can access anything through the access point even if the bucket policy would otherwise allow it. Access points are deny-by-default — you must write a policy to grant access.

## Summary

- S3 Access Points provide named network endpoints with their own access policies, decomposing complex shared-bucket policies into independently maintainable per-team units.
- The two-layer permission model: the bucket policy sets the ceiling; the access point policy must also allow the action. Both must allow — neither overrides the other.
- VPC-restricted access points accept only requests from a specified VPC. Combined with an S3 VPC Gateway Endpoint, this creates a fully private data access path.
- Multi-Region Access Points provide a single global hostname backed by Global Accelerator, routing requests to the lowest-latency bucket in a CRR replication group — active-active or active-passive.
- MRAP replication is asynchronous — reads may return stale data if routed to a region that has not yet received a recent write. Applications must tolerate eventual consistency.
- Object Lambda Access Points build on regular access points to intercept and transform GET responses in-flight.

## Examples

A healthcare company runs a shared S3 data lake accessed by three teams: clinical research, billing, and data engineering. Rather than maintaining a sprawling bucket policy, they create one access point per team. The clinical research access point allows read-only access to `clinical/` prefixes for a specific IAM role. The billing access point allows read/write to `billing/` prefixes. The data engineering access point allows full access to `raw/` and `processed/` prefixes for their pipeline role. When the billing team's requirements change, an administrator edits only the billing access point policy — a 20-line JSON document — without touching any configuration that affects the other teams. The bucket policy itself is a single 10-line delegation statement that says "access points in this account control access." The complexity is real and present, but it is modularized.

A financial services platform runs analytics workloads on EC2 instances inside a private VPC with no internet gateway. The data lives in S3. The security team requires that S3 traffic never traverse the public internet. They create a VPC-restricted access point tied to the analytics VPC and configure an S3 VPC Gateway Endpoint. The EC2 instances use the access point ARN for all S3 operations. If someone attempts to access the data from outside the VPC — even with valid credentials — the access point rejects the request at the S3 layer. The access point policy further restricts to the `analytics/` prefix, adding a defense-in-depth layer so that a compromised instance with valid credentials cannot access other data prefixes.

A global media company distributes video assets from encoding pipelines in `us-east-1`, `eu-west-1`, and `ap-southeast-1`. They configure CRR between all three regional buckets to keep the asset library in sync, then create an MRAP over all three. Their encoding services use the MRAP ARN with `TrafficDialPercentage` set to 100 for all three regions (active-active). Global Accelerator routes each request to the nearest bucket. A European encoder writing a new asset hits `eu-west-1` with single-digit millisecond latency; an Asian encoder reading the same asset a few seconds later hits `ap-southeast-1` — though if replication has not yet propagated the write, the read might hit `us-east-1` or `eu-west-1` instead. During a planned maintenance window on `eu-west-1`, the team uses the MRAP routing API to set `eu-west-1`'s `TrafficDialPercentage` to 0. European traffic reroutes to `us-east-1` automatically, with no application code change.

## Think About It

1. An access point policy can only grant permissions that the bucket policy also allows. Why did AWS design it this way? What security property does this constraint enforce, and what would break if access points could expand permissions beyond the bucket policy's ceiling?

2. If you have 20 teams sharing one S3 bucket, each with their own access point, what does the operational model look like at scale? Have you simplified the problem or moved complexity to a different layer? What organizational tooling — IaC, policy templates, automated reviews — would you need to govern 20 access point policies safely?

3. A VPC-restricted access point blocks requests from outside the VPC. How would you extend private access to an on-premises data center that needs to read the same S3 data? What networking constructs make this possible without removing the VPC restriction?

4. MRAP routes reads and writes to the nearest bucket, but replication is asynchronous. A writer in Tokyo uploads a video asset via MRAP (hits `ap-southeast-1`). A reader in London queries the MRAP for the same asset 500 ms later (hits `eu-west-1`). Is the read guaranteed to find the asset? How would you design the application to handle the case where it is not?

5. What are the trade-offs between managing shared S3 data access via access points versus splitting data into separate buckets per team? Consider operational overhead, cross-team data sharing, cost allocation, and audit surface area.

## Quick Check

**Q1.** Which statement correctly describes the relationship between an S3 access point policy and the bucket policy?
- A) The access point policy overrides the bucket policy entirely
- B) The bucket policy is ignored when an access point policy is present
- C) The access point policy can only grant permissions that the bucket policy also allows — both must allow the action
- D) Access point policies apply only to cross-account access

**Answer: C** — Both the access point policy and the bucket policy are evaluated. The effective permission is the intersection of both — the caller must be allowed by both documents. Neither overrides the other. The bucket policy acts as the permission ceiling.

**Q2.** What two components are required to ensure S3 traffic from a private EC2 instance never traverses the public internet?
- A) Transfer Acceleration + Block Public Access
- B) VPC-restricted access point + S3 VPC Gateway Endpoint
- C) Bucket policy with VPC condition + NAT Gateway
- D) MRAP + Direct Connect

**Answer: B** — A VPC-restricted access point enforces that only requests from the specified VPC are accepted at the access point layer. A VPC Gateway Endpoint for S3 ensures that the network path from the VPC to S3 stays entirely within the AWS private network. Together, these two controls eliminate any public internet hops.

**Q3.** What underlying AWS service powers the global request routing for Multi-Region Access Points?
- A) Amazon CloudFront
- B) Amazon Route 53 latency-based routing
- C) AWS Global Accelerator
- D) AWS Transit Gateway

**Answer: C** — Multi-Region Access Points are backed by AWS Global Accelerator, which uses anycast routing to direct each request to the lowest-latency bucket in the MRAP replication group. CloudFront is a CDN for content caching; Route 53 provides DNS-level routing; Transit Gateway connects VPCs.

## What's Next

Next up: the S3 Canvas Lab — design a static hosting and CloudFront architecture in Archon, applying the access, performance, and event-driven patterns from this module.
