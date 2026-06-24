---
title: "AWS Shield"
type: content
estimated_minutes: 16
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03", "SCS-C03"]
---

# AWS Shield

## Overview

AWS Shield is AWS's managed **Distributed Denial of Service (DDoS) protection** service. It defends applications against attacks that try to overwhelm them with traffic at the network, transport, and application layers. It comes in two tiers — **Shield Standard**, on automatically and free for all customers, and **Shield Advanced**, a paid subscription adding enhanced protections, visibility, cost protection, and expert support. This *service reference* lesson covers what each tier protects, how it fits with WAF and CloudFront, and what each certification expects.

Shield matters because DDoS attacks are common and can take an application offline regardless of how well it is built. Shield absorbs and mitigates these attacks at the scale of the AWS edge network, which is far larger than any single application could provision. The key mental model is a **layered edge defense**: **Shield** handles **volumetric and protocol DDoS (L3/L4)** and, with Advanced, application-layer attacks; **AWS WAF** handles **L7 application exploits and HTTP floods**; and **CloudFront/Route 53** provide the global, highly distributed surface that absorbs attack traffic. Shield is best understood alongside those services rather than in isolation.

---

## How It Works

- **Shield Standard** is always on at no cost and automatically protects all AWS customers against the most common **network and transport layer (L3/L4)** DDoS attacks — SYN/UDP floods, reflection attacks, and similar — especially for traffic through CloudFront and Route 53, which are inherently DDoS-resilient.
- **Shield Advanced** is a paid, opt-in subscription that adds:
  - **Enhanced detection and mitigation** for larger and more sophisticated attacks, including **application-layer (L7)** attacks when combined with WAF.
  - **Protected resources** you designate — CloudFront distributions, Route 53 hosted zones, Global Accelerator, Application/Network Load Balancers, and Elastic IPs.
  - **Real-time visibility** into attacks and **health-based detection** using Route 53 health checks.
  - The **Shield Response Team (SRT)** — AWS DDoS experts you can engage during an attack (and who can apply mitigations on your behalf).
  - **Cost protection** — credits for scaling charges incurred because of a covered DDoS attack (e.g., the auto-scaling or data-transfer spike an attack caused).
  - **Automatic application-layer mitigation** that can deploy WAF rules in response to detected L7 attacks.

---

## Key Features

- **Always-on L3/L4 protection** (Standard) for every customer at no charge.
- **Advanced L7 and large-scale mitigation**, real-time metrics, and attack diagnostics (Advanced).
- **Shield Response Team** access for guided or delegated mitigation during incidents.
- **DDoS cost protection** credits for attack-driven scaling charges.
- **Centralized management** of protections across an organization via **AWS Firewall Manager**.
- **Tight WAF integration** — Advanced includes WAF on protected resources and can auto-deploy L7 rules.

---

## Configuration Reference

- **Standard requires no setup** — it's automatic. Architect for resilience by fronting applications with **CloudFront** and **Route 53**.
- **For Shield Advanced**, subscribe, then **add protections** to specific resources (CloudFront, ALB/NLB, Global Accelerator, Route 53, Elastic IPs).
- **Associate WAF web ACLs** with protected resources for L7 defense, and enable **automatic application-layer mitigation**.
- **Use Firewall Manager** to apply Shield Advanced protections consistently across an organization, and configure Route 53 **health checks** to improve detection.

---

## Operations and Troubleshooting

- **Under attack on Shield Advanced.** Use the real-time attack dashboard, ensure WAF rate-based rules are in place for L7 floods, and **engage the Shield Response Team** for large or novel attacks.
- **Application still affected.** Confirm the resource is actually a **protected resource**, that traffic flows through Shield-protected edges (CloudFront/Route 53), and that WAF rules cover the application-layer vector.
- **Unexpected scaling charges from an attack.** File for **cost protection** credits (Advanced) for the covered, attack-driven scaling.
- **Standard vs. Advanced confusion.** Standard is automatic/free and L3/L4; Advanced is paid and adds L7, SRT, cost protection, and visibility — match the answer to the requirement.

---

## Integrations

Shield works hand-in-glove with **AWS WAF** (L7 filtering and rate-based rules), **Amazon CloudFront** and **Amazon Route 53** (the DDoS-resilient edge), **Global Accelerator** and **ELB/Elastic IPs** (protected resources), and **AWS Firewall Manager** (org-wide protection management). A clean mental model of the edge stack: **Shield = DDoS (L3/L4, and L7 with Advanced), WAF = application-layer exploits/floods, CloudFront/Route 53 = global absorbing surface**, together forming defense in depth at the perimeter.

---

## Pricing and Cost Considerations

**Shield Standard is free** and automatic. **Shield Advanced** is a **monthly subscription** (a substantial fixed fee, typically committed for a one-year term) **plus data-transfer-out usage fees** for protected resources, and it **includes AWS WAF** on protected resources. Its **DDoS cost-protection** credits offset attack-driven scaling charges, which can make it cost-effective for high-value, attack-exposed applications. The decision is risk-based: most workloads rely on Standard plus WAF and CloudFront, while internet-facing, high-value, or compliance-driven applications justify Advanced. Exact prices vary and are committed at subscription.

---

## Exam Relevance

**CLF-C02:** Know Shield as AWS's DDoS protection, that **Standard is automatic and free** for all customers, and that **Advanced** is a paid tier with extra protection and support. Foundational — the Standard-vs-Advanced distinction is common.

**SAA-C03:** Know Shield + WAF + CloudFront/Route 53 as layered edge defense, what Advanced protects, and when Advanced is justified. Design depth.

**SOA-C03:** Operate DDoS protection — protected resources, attack visibility, and engaging the SRT. Operations depth.

**SCS-C03:** Secure the edge — Shield Advanced for L7/large attacks, WAF auto-mitigation, Firewall Manager for org-wide protection, and cost protection. Security depth (edge/infrastructure security).

---

## Summary

AWS Shield is managed DDoS protection in two tiers: **Standard**, automatic and free, defending all customers against common L3/L4 attacks (especially via CloudFront and Route 53), and **Advanced**, a paid subscription adding enhanced L3/L4 and application-layer (L7, with WAF) mitigation, real-time attack visibility, the Shield Response Team, DDoS cost protection, and org-wide management via Firewall Manager. It is best understood as one layer of edge defense alongside WAF (application exploits/floods) and CloudFront/Route 53 (the absorbing global surface). The recurring exam points are the Standard-vs-Advanced distinction, the WAF/CloudFront pairing, and cost protection for attack-driven scaling.

---

## Quick Check

1. What is the difference between Shield Standard and Shield Advanced in cost, setup, and protection?
2. Which layers does Shield address versus AWS WAF, and how do they combine at the edge?
3. What does Shield Advanced's "cost protection" cover?
4. Which resources can be designated as Shield Advanced protected resources?
5. How do you apply Shield Advanced protections consistently across many accounts?

---

## What's Next

Pair this with **AWS WAF** (L7 protection), **Amazon CloudFront** (edge absorption), and **Amazon Route 53**. See the SCS-C03 edge-security lesson for the CloudFront + WAF + Shield pattern.
