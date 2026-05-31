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

## Examples

A Series B SaaS startup building a project management tool is a textbook public cloud customer. They have no existing infrastructure, no compliance requirements mandating physical control, and a small engineering team that cannot afford to manage data centers. They deploy entirely on AWS — EC2, RDS, S3, CloudFront — benefiting from instant global reach and managed services they could never build themselves. The public cloud's multi-tenant model means they share physical hardware with thousands of other customers, but AWS's VPC and hypervisor isolation means their data never mingles with anyone else's. They trade physical control for speed and economics, which is exactly the right trade for their stage.

A large U.S. defense contractor demonstrates the private cloud model. Their classified project data cannot legally transit public internet infrastructure or reside on hardware shared with commercial customers. They operate an OpenStack-based private cloud in a government-approved facility, giving their engineers cloud-like self-service provisioning while maintaining the physical isolation and air-gap controls their security clearance requires. This is not technophobia — it's a genuine regulatory constraint that public cloud cannot satisfy, even with dedicated hardware options.

A major retail bank illustrates hybrid cloud at its most practical. Their core banking ledger — account balances, transaction records — runs on on-premises mainframes with regulatory requirements around data residency. But their customer-facing mobile app, fraud detection ML models, and marketing analytics all run on AWS. AWS Direct Connect provides a dedicated private connection between their data center and the AWS VPC, so data flows between environments without crossing the public internet. Neither environment could serve their needs alone; hybrid cloud lets them modernize incrementally without ripping out systems that process billions of dollars a day.

## Think About It

1. AWS GovCloud is described as a "public region with restricted access." In what sense is it still a public cloud — and in what sense does it blur the line with community cloud? Where does the distinction between deployment models actually break down in practice?

2. A company uses AWS Dedicated Hosts to meet a compliance requirement stating "no hardware sharing with other organizations." They're still on AWS infrastructure in an AWS data center. Are they running a private cloud, a public cloud, or something in between? What does your answer imply about how the deployment model definitions were written?

3. Hybrid cloud is often described as a "best of both worlds" approach, but critics say it's actually "worst of both worlds" — you pay the complexity tax of managing two environments without fully gaining the benefits of either. Under what specific circumstances would you argue hybrid is genuinely the right long-term architecture rather than a migration stepping stone?

4. Community cloud is the least commonly deployed model. Why do you think that is — and what structural or economic factors would have to change for community clouds to become more prevalent in industries like healthcare or financial services?

5. If a company runs 80% of their workloads on AWS and 20% on-premises (connected via Direct Connect), but they call it a "hybrid cloud strategy," what questions would you ask to determine whether they actually have a coherent hybrid architecture or just some workloads they haven't migrated yet?

## Quick Check

**Q1.** Which deployment model is characterized by infrastructure shared among multiple organizations with common compliance or regulatory requirements?
- A) Public cloud
- B) Private cloud
- C) Hybrid cloud
- D) Community cloud

**Answer: D** — Community cloud is infrastructure shared exclusively by organizations with shared concerns, such as multiple government agencies operating under the same security framework.

**Q2.** Which AWS service allows organizations to run AWS infrastructure in their own on-premises data center?
- A) AWS Direct Connect
- B) AWS VPN
- C) AWS Outposts
- D) AWS Local Zones

**Answer: C** — AWS Outposts delivers physical AWS-managed rack infrastructure to a customer's on-premises location, enabling hybrid architectures where AWS APIs and services run locally.

**Q3.** In a public cloud deployment, how are individual customers' data and workloads kept separate from each other?
- A) Each customer has dedicated physical hardware
- B) Virtualization, hypervisor controls, and logical network isolation (VPC)
- C) Geographic separation across different regions
- D) Encryption of all data at the network layer

**Answer: B** — Public cloud uses a multi-tenant model where customers share physical hardware, but the AWS hypervisor and VPC provide strong logical isolation so one customer's data and compute are inaccessible to others.

## What's Next

In the next lesson, we cover the specific business and technical benefits of cloud computing — agility, elasticity, economies of scale, and more — which are key talking points for the CCP exam.
