---
title: "Cost-Optimized Networking: Data Transfer, NAT, and Egress"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03"]
---

# Cost-Optimized Networking: Data Transfer, NAT, and Egress

## Overview

Most newcomers to AWS budget carefully for compute and storage and then get surprised by the bill for *data transfer* — the cost of moving bytes between zones, regions, the internet, and through gateways. The SAA exam knows this is where real architects save (or waste) money, so Domain 4, Task 4.4 ("Design cost-optimized network architectures") is dense with data-transfer decisions: NAT gateway placement, cross-AZ traffic, VPC endpoints versus internet egress, and CDN offload.

Data transfer pricing follows a few consistent principles, and once you internalize them the exam questions become mechanical. The governing idea: **traffic that stays inside one Availability Zone and uses private addressing is usually free or cheapest; traffic that crosses an AZ boundary, leaves for the internet, or flows through a managed gateway costs money** — sometimes a lot, at scale. Architects reduce cost by keeping traffic local, replacing internet paths with private ones, sharing or right-placing gateways, and offloading egress to a CDN.

This lesson collects the network-cost levers that the shared lessons mention only in passing. After it you will be able to spot the cost mistake in a network diagram and name the cheaper design — exactly what the exam asks.

---

## Core Concepts

### How AWS Charges for Data Transfer

A simplified but exam-accurate model: **data into AWS from the internet is free.** **Data out to the internet (egress) is charged** per GB and is the dominant data-transfer cost for most workloads. **Traffic between Availability Zones** (even within one region, using private IPs) is charged a small per-GB rate in *both* directions. **Traffic within a single AZ** using private IPs is generally free. **Cross-Region** traffic is charged and costs more than cross-AZ. The practical hierarchy from cheapest to most expensive: same-AZ private → cross-AZ → cross-Region → internet egress.

Two corollaries the exam loves: using **private IPs and staying in-AZ** avoids charges that **public IP** paths incur, and **routing through the internet** when a private path exists is both less secure and more expensive.

### NAT Gateway Costs and Placement

A NAT gateway lets instances in private subnets reach the internet for outbound traffic (updates, API calls) without being publicly reachable. It carries two costs: an **hourly charge** plus a **per-GB data-processing charge** for everything flowing through it. Two exam-relevant decisions follow. First, **one NAT gateway per AZ vs. a single shared one**: a single shared NAT gateway is cheaper (one hourly charge) but creates a cross-AZ dependency and cross-AZ data-transfer cost, and is a single point of failure; one per AZ is more resilient and avoids cross-AZ charges but multiplies the hourly cost. Second, **avoiding the NAT gateway entirely** for AWS-bound traffic by using VPC endpoints (below). For purely cost-driven, lower-resilience designs, a shared NAT gateway wins; for production resilience, per-AZ is standard.

### VPC Endpoints — Cutting Egress and NAT Costs

VPC endpoints keep traffic to AWS services on the AWS private network instead of routing it out through a NAT gateway and the internet. There are two kinds. A **Gateway endpoint** (for **S3 and DynamoDB only**) is **free** and is added to your route table — using it for S3/DynamoDB access from private subnets eliminates the NAT data-processing charge for that traffic entirely. An **Interface endpoint** (powered by PrivateLink, for most other services) has an hourly and per-GB cost but is still typically cheaper and more secure than internet egress, and avoids NAT processing. The exam pattern: "private instances access S3 but you want to avoid NAT/egress cost" → **S3 Gateway endpoint (free)**.

### CloudFront — Offloading Egress

Serving content directly from S3 or EC2 to the internet incurs standard egress rates on every byte. Putting **CloudFront** in front changes the economics: data transfer from origin to CloudFront is free, CloudFront's per-GB egress rates are generally lower than direct EC2/S3 egress, and — most importantly — cached responses are served from the edge without hitting the origin at all, cutting both origin load and origin egress. For any high-volume content delivery scenario, CloudFront is simultaneously the performance answer and the cost answer.

### Keeping Traffic Local and Private

The cheapest byte is the one that never crosses a boundary. Design choices that reduce data-transfer cost include co-locating chatty components in the same AZ where resilience requirements allow, using **private IP addresses** and endpoints instead of public ones, choosing a **single region** when latency permits, and using **Direct Connect** instead of internet/VPN for large, steady hybrid transfers (lower per-GB rates at volume). Each is a recurring exam lever.

---

## Configuration Reference

The cost hierarchy and the levers:

```text
Data transfer cost, cheapest → most expensive
  same-AZ (private IP)   ~ free
  cross-AZ               $  (both directions)
  cross-Region           $$
  internet egress        $$$ (the usual top line item)

Lever                                   → Effect
--------------------------------------- → -----------------------------------
S3/DynamoDB Gateway endpoint            → FREE private access; removes NAT cost
Interface (PrivateLink) endpoint         → private access to AWS svc; avoids egress
CloudFront in front of S3/EC2            → free origin→CDN, lower egress, cache offload
Single shared NAT gateway                → cheapest NAT (less resilient, cross-AZ cost)
One NAT gateway per AZ                    → resilient, no cross-AZ NAT traffic (costs more)
Keep traffic in-AZ + private IPs         → avoids cross-AZ and public-path charges
Direct Connect for steady hybrid volume  → lower per-GB than VPN/internet at scale
```

Quick recognition map:

```text
"avoid NAT cost for S3 access"            → S3 Gateway endpoint (free)
"reduce internet egress for content"       → CloudFront
"cheapest NAT, resilience not required"    → one shared NAT gateway
"minimize cross-AZ charges"                → keep traffic in-AZ; per-AZ NAT
"large steady on-prem transfer, cut cost"  → Direct Connect
```

---

## How to Decide

- **Private instances need S3/DynamoDB?** → free Gateway endpoint (never route that through NAT).
- **Private instances need other AWS services privately?** → Interface endpoint.
- **High-volume internet content delivery?** → CloudFront to cut egress and offload origin.
- **NAT design, cost-first vs. resilience-first?** → shared NAT (cheaper) vs. per-AZ NAT (resilient, no cross-AZ NAT cost).
- **Large, steady hybrid data flow?** → Direct Connect over VPN/internet.
- **Chatty components, cost-sensitive?** → co-locate in one AZ and use private IPs.

---

## How This Connects

This lesson extends the shared VPC, VPC-endpoints, NAT-gateway, CloudFront, and Direct Connect lessons into a single cost lens. It mirrors the **caching** lesson — CloudFront and endpoints improve performance *and* cost — and connects to Domain 1 security (private paths via endpoints are both cheaper and safer than internet egress). It's a core part of the Domain 4 picture alongside the shared compute- and storage-cost lessons.

---

## Exam Traps

- **Routing S3 access through a NAT gateway.** When private instances hit S3, a free S3 Gateway endpoint removes the NAT data-processing cost — failing to use it is the classic waste.
- **Assuming cross-AZ traffic is free.** Cross-AZ transfer is charged in both directions; "free because it's the same region" is wrong.
- **Forgetting NAT has a per-GB charge.** NAT gateways cost an hourly *and* a data-processing fee; high-volume egress through NAT is expensive.
- **Direct S3/EC2 egress at scale.** For high-volume delivery, CloudFront lowers egress cost and offloads the origin.
- **Confusing Gateway and Interface endpoints.** Gateway = S3/DynamoDB only, free. Interface = most other services, hourly + per-GB.

---

## Summary

Data transfer is where AWS network costs hide, and the exam tests your ability to control it. Costs rise as traffic crosses boundaries: same-AZ private is near-free, then cross-AZ, then cross-Region, then internet egress (usually the largest line item). Free S3/DynamoDB Gateway endpoints eliminate NAT and egress cost for that traffic; Interface endpoints privatize access to other services; CloudFront slashes egress and offloads origins; and NAT gateway placement trades cost against resilience. Keep traffic local and private, and replace internet paths with private ones, to design the cost-optimized networks the exam rewards.

---

## Examples

**Example 1 — Private app reading S3.** EC2 in private subnets reads large objects from S3 via a NAT gateway, generating big data-processing bills. Adding a free S3 Gateway endpoint routes that traffic privately and removes the NAT cost.

**Example 2 — Viral content site.** A site serves video directly from S3 and egress costs spike. Fronting S3 with CloudFront cuts per-GB egress and serves most requests from cache, dropping origin transfer dramatically.

**Example 3 — Cost-first sandbox.** A non-production VPC needs outbound updates but not high availability. A single shared NAT gateway minimizes hourly cost; the team accepts the reduced resilience.

---

## Think About It

A private-subnet fleet pulls hundreds of gigabytes per day from S3 and also calls DynamoDB, all through a per-AZ NAT gateway, and the data-processing charges dominate the bill. Which *two* changes remove almost all of that NAT cost for the S3 and DynamoDB traffic specifically — and how much do those endpoints cost?

---

## Quick Check

1. Order these cheapest to most expensive: internet egress, same-AZ private, cross-AZ.
2. Which VPC endpoint type is free, and which two services does it serve?
3. Name two costs a NAT gateway incurs.
4. How does CloudFront reduce data-transfer cost for high-volume content?

*Answers: (1) same-AZ private → cross-AZ → internet egress; (2) Gateway endpoints are free, for S3 and DynamoDB; (3) an hourly charge and a per-GB data-processing charge; (4) origin→CloudFront transfer is free, its egress rates are lower, and cached responses avoid the origin entirely.*

---

## What's Next

You've completed the cost-optimized networking additions for Domain 4. Next, two cross-domain capstone lessons tie everything together: **SAA Scenario Decision Drills** and **SAA-C03 Exam Strategy and Question Patterns.**
