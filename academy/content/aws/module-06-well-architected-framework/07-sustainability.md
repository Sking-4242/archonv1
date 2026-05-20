---
title: "Pillar: Sustainability"
type: content
estimated_minutes: 5
cert_tags: ["aws_ccp", "aws_saa", "aws_sap"]
---

# Pillar: Sustainability

## Overview

Added to the Well-Architected Framework in 2021, the Sustainability pillar focuses on minimizing the environmental impact of your cloud workloads. The cloud is inherently more sustainable than on-premises data centers due to AWS's scale, efficiency, and renewable energy investments, but architectural choices still matter.

## Sustainability Design Principles

**Understand your impact:** Know the carbon footprint of your workloads. AWS provides the Customer Carbon Footprint Tool (in the Billing console) showing estimated CO2 emissions from your AWS usage. **Establish sustainability goals:** Set targets for reducing per-unit environmental impact, even as total usage grows. **Maximize utilization:** Idle resources waste energy. Rightsizing, Auto Scaling, and serverless architectures improve utilization, which reduces energy per unit of work. **Anticipate and adopt new, more efficient hardware and software:** AWS continuously introduces more energy-efficient instance types (Graviton processors use up to 60% less energy for equivalent performance). **Use managed services:** Shared managed services achieve higher utilization than dedicated single-customer deployments. **Reduce downstream impact:** Compress data, use efficient serialization formats, implement client-side caching to reduce unnecessary compute and transfer.

## AWS Sustainability Initiatives

AWS's own sustainability commitments are relevant context: 100% renewable energy commitment (already exceeded in some regions), Climate Pledge goal of net-zero carbon by 2040, water stewardship programs, and custom silicon (Graviton, Inferentia, Trainium) optimized for energy efficiency. When you run workloads on AWS, you benefit from these infrastructure investments.

Using AWS Graviton-based instances is one of the simplest sustainability improvements — same or better performance, lower cost, lower energy usage. Consider migrating compute-heavy workloads to Graviton-based instance types (m7g, c7g, r7g families).

## Summary

The Sustainability pillar calls for understanding workload environmental impact, maximizing resource utilization (rightsize, use serverless, eliminate idle resources), adopting efficient hardware (Graviton instances), and leveraging managed services. AWS provides the Customer Carbon Footprint Tool for visibility. Moving to AWS is inherently more sustainable than on-premises, but architecture choices still meaningfully affect environmental impact.

## What's Next

This completes Module 6. The lab covers the Well-Architected Tool — a guided review that scores your workload against all six pillars.
