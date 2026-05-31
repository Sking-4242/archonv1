---
title: "AWS Outposts, Wavelength, and Local Zones"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Outposts, Wavelength, and Local Zones

## Overview

Some workloads must run on-premises — for latency, data residency, or disconnected operation. AWS Outposts brings AWS infrastructure and services into your data center. AWS Wavelength and Local Zones extend AWS compute to telecom networks and metropolitan edge locations for ultra-low latency.

## AWS Outposts

AWS Outposts delivers AWS-designed racks to your on-premises facility. The Outpost runs natively on AWS hardware and connects to the parent AWS region via a network link. You can run EC2, ECS, EKS, RDS, EMR, and other services on Outposts. Outposts appear as an availability zone in your VPC. Use for: data residency requirements, applications with ultra-low latency to on-premises systems, manufacturing floor processing, or hybrid architectures that need native AWS APIs on-premises.

## AWS Local Zones

Local Zones are extensions of an AWS region placed in major cities (Los Angeles, Boston, Dallas, etc.). They offer compute, storage, and networking services with single-digit millisecond latency to that city. Applications that need low-latency access to users in a specific city but don't justify a full region can use a Local Zone. Local Zones appear as AZs in your VPC and connect back to the parent region for services not available locally.

## AWS Wavelength

Wavelength embeds AWS compute and storage within telecom 5G networks. Applications deployed in Wavelength Zones are reached directly from 5G devices without leaving the telecom network — providing sub-10ms latency for mobile use cases. Target applications: augmented reality, real-time gaming, connected vehicles, smart city applications that rely on 5G edge compute. Wavelength Zones are available in partnership with Verizon, Vodafone, SK Telecom, and others.

## Choosing the Right Extension

Outposts: on-premises, you own/manage the facility, full AWS services, for data residency or on-premises latency. Local Zones: in major cities, AWS-managed, subset of services, for metropolitan latency. Wavelength: inside telecom 5G networks, ultra-low latency for 5G device applications. If an exam question mentions on-premises hardware running AWS services, the answer is Outposts.

## Summary

Outposts brings AWS to your data center for on-premises requirements. Local Zones deliver AWS to major cities for metropolitan latency. Wavelength extends into 5G networks for mobile edge compute. These are the AWS answer to workloads that cannot move fully to a cloud region — whether due to data residency, physical latency, or 5G connectivity requirements.

## Examples

A hospital network runs real-time patient monitoring software that legally cannot send raw patient vitals data outside its physical facility due to HIPAA data residency requirements, and the processing must complete within 50 milliseconds of measurement. They deploy an AWS Outpost rack in their on-premises data center. EC2 instances on the Outpost process the vital-sign streams locally using native AWS APIs, and only aggregated, de-identified results are sent to the parent region for analytics. The Outpost appears as an Availability Zone in their VPC, so the application code needs zero changes — it just runs in a different AZ that happens to be in their building.

A media production studio in Austin, Texas needs sub-5ms rendering feedback for their video editing pipeline, but the nearest AWS region (us-east-1) adds 30ms of latency. AWS has a Local Zone in Dallas. The studio deploys their render farm EC2 instances in the Dallas Local Zone, which is connected to their Austin studio via a private fiber circuit. Editors get near-real-time rendering previews without the studio needing to manage its own data center hardware. The Dallas Local Zone handles compute; the us-east-1 region handles storage, IAM, and other services not available locally.

A sports broadcasting company works with a major US carrier to stream augmented reality overlays — real-time player statistics, ball trajectory predictions — directly to 5G mobile viewers watching a live game. The latency budget is under 10ms from camera capture to viewer overlay. They deploy their overlay-rendering application in an AWS Wavelength Zone embedded in the carrier's 5G network. Requests from 5G devices never leave the carrier network to reach AWS — the compute is literally inside the telecom infrastructure. No amount of regional AWS optimization could achieve this latency because physics (speed of light across the internet) sets a hard floor that Wavelength sidesteps by co-locating compute with the radio access network.

## Think About It

1. Why would an organization choose AWS Outposts over simply co-locating their own servers in a data center — what specific value does the AWS-managed hardware provide?
2. What would happen to an application running on an Outpost if the network link to the parent AWS region was severed — which operations would continue working and which would fail?
3. How would you decide between a Local Zone and an Outpost for a manufacturing company that processes sensor data on their factory floor — what questions would you need to answer about their requirements?
4. Wavelength Zones are available only through telecom partnerships. What does this architectural constraint mean for an enterprise that wants to target multiple carriers' 5G subscribers — and how does that complicate deployment?
5. Data residency requirements often drive Outposts decisions, but what other operational costs come with running an Outpost that a cloud-only architecture avoids — and how do you quantify when the trade-off is worth it?

## Quick Check

**Q1.** A company has a legal requirement that patient data must be processed only within their own physical data center. Which AWS service satisfies this while still allowing them to use native AWS APIs and services?
- A) AWS Local Zones
- B) AWS Wavelength
- C) AWS Outposts
- D) An AWS region with a data residency agreement

**Answer: C** — AWS Outposts brings AWS-managed infrastructure physically into the customer's facility, allowing native AWS API usage while keeping data processing on-premises to meet residency requirements.

**Q2.** A game company wants ultra-low latency for players on 5G mobile devices without traffic leaving the carrier network. Which AWS infrastructure extension is designed for this scenario?
- A) AWS Outposts
- B) AWS Local Zones
- C) AWS Direct Connect
- D) AWS Wavelength

**Answer: D** — AWS Wavelength embeds compute and storage within telecom 5G network infrastructure, allowing 5G device traffic to reach application endpoints without traversing the public internet.

**Q3.** A Local Zone differs from a full AWS region primarily in that it:
- A) Is managed by the customer, not AWS
- B) Offers only a subset of AWS services and connects back to a parent region for the rest
- C) Requires a Direct Connect circuit to use
- D) Only supports containerized workloads via EKS

**Answer: B** — Local Zones provide a subset of AWS compute, storage, and networking services in a specific city, and rely on the parent region for services (like IAM and most managed databases) that are not available locally.

## What's Next

Next up: Route 53 Resolver and hybrid DNS — name resolution between on-premises and AWS.