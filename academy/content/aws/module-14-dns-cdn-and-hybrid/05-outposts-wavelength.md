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

## What's Next

Next up: Route 53 Resolver and hybrid DNS — name resolution between on-premises and AWS.