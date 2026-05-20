---
title: "Public, Private, and Hybrid Cloud"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp"]
---

# Public, Private, and Hybrid Cloud

## Overview

Service models (IaaS/PaaS/SaaS) describe what you get from a cloud provider. Deployment models describe where your infrastructure lives and who can access it. The four deployment models — public, private, hybrid, and community — each address different requirements around control, security, compliance, and cost.

For the Cloud Practitioner exam, you should be able to define each model, identify its use cases, and explain why an organization might choose one over another.

## Public Cloud

In a public cloud, computing resources are owned and operated by a third-party provider and delivered over the internet. Multiple customers (tenants) share the same physical infrastructure, though their resources are isolated from each other through virtualization and logical controls.

AWS is a public cloud. When you launch an EC2 instance, it runs on AWS-owned hardware in an AWS-managed data center. You share that hardware with other AWS customers — but your instance, your data, and your network are completely isolated from theirs through the AWS hypervisor and VPC.

**Public cloud strengths:** No capital investment, infinite scalability (from the user's perspective), global reach, access to hundreds of managed services. **Weaknesses:** Multi-tenant environment (though well-isolated), dependency on internet connectivity, potential compliance challenges in some industries.

## Private Cloud

A private cloud is cloud infrastructure operated solely for a single organization, either managed internally or by a third party, and hosted on-premises or in a dedicated facility. The defining characteristic is exclusivity — no hardware sharing with other organizations.

**On-premises private cloud:** VMware vSphere clusters, OpenStack deployments, or similar solutions run in your data center. You get cloud-like flexibility (self-service provisioning, resource pooling) without leaving your facility.

**Managed private cloud:** AWS offers AWS Dedicated Hosts (dedicated physical servers) and AWS Dedicated Instances to help meet compliance requirements that prohibit hardware sharing. AWS Outposts brings actual AWS infrastructure into your on-premises environment.

Private cloud is common in financial services, government, healthcare, and defense — industries with strict data residency or isolation requirements.

## Hybrid Cloud

Hybrid cloud combines public and private cloud environments, allowing data and applications to move between them. The two environments are connected — typically via AWS Direct Connect or a VPN — so workloads can run wherever they make the most sense.

**Common hybrid patterns:** Keep sensitive customer data on-premises (private), process it in the cloud (public) for analytics. Run steady-state baseline workloads on-premises, burst to the cloud during peak demand. Migrate workloads incrementally — some in the cloud, some on-prem — during a multi-year transformation.

AWS supports hybrid architectures through AWS Direct Connect, AWS VPN, AWS Outposts, AWS Storage Gateway, and AWS Systems Manager (for managing on-premises servers alongside EC2 instances). The well-architected approach to hybrid is to treat both environments as a single operational domain.

## Community Cloud

A community cloud is shared infrastructure provisioned for exclusive use by a specific community of organizations with shared concerns — regulatory, mission, security policy, or compliance requirements. It may be owned by one or more of the organizations, a third party, or some combination.

Examples include cloud environments shared among multiple government agencies operating under the same security framework (like FedRAMP), or healthcare organizations sharing a HIPAA-compliant cloud platform.

Community clouds are less common in practice than public or hybrid, but appear on the CCP exam. AWS GovCloud (US) is an example of a purpose-built cloud region for U.S. government customers with specific compliance requirements, though it's technically a public region with restricted access.

## Summary

Public cloud (AWS) is shared, managed infrastructure over the internet — the default for most organizations. Private cloud is dedicated infrastructure for a single organization, offering more control at higher cost. Hybrid cloud mixes both, using AWS for variable workloads while keeping sensitive data or legacy systems on-premises. Community cloud serves groups with shared compliance requirements. AWS supports all models through services like Outposts (on-premises), Direct Connect (hybrid connectivity), and GovCloud (regulated public).

## What's Next

In the next lesson, we cover the specific business and technical benefits of cloud computing — agility, elasticity, economies of scale, and more — which are key talking points for the CCP exam.
