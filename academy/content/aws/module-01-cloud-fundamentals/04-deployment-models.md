---
title: "Public, Private, and Hybrid Cloud"
type: content
estimated_minutes: 18
cert_tags: ["aws_ccp", "clf-c02"]
---

# Public, Private, and Hybrid Cloud

## Overview

Service models (IaaS, PaaS, SaaS) describe what you get from a cloud provider and who manages what. Deployment models answer a different and equally important question: where does the infrastructure live, and who can access it? The four cloud deployment models — public, private, hybrid, and community — each represent a distinct philosophy about control, access, and how infrastructure is shared. Choosing the right deployment model is a business and architectural decision that weighs compliance requirements, security policy, cost, latency, and operational capability simultaneously.

These models exist because "cloud computing" is a broad concept and different organizations have genuinely different requirements. A two-person startup has no reason to operate private infrastructure — public cloud gives them everything they need at a fraction of the cost. A defense contractor handling classified intelligence may be legally prohibited from using public cloud infrastructure for certain data types. A large hospital system might run patient records on private infrastructure while running their public-facing appointment booking portal on public cloud. The deployment model vocabulary gives you a precise way to describe and communicate these architectural decisions.

For the CLF-C02 exam, deployment model questions test whether you can define each model, identify AWS services associated with each, and explain why an organization would choose one over another. The exam pays particular attention to hybrid cloud scenarios — how AWS services like Outposts, Direct Connect, and GovCloud bridge the public/private divide — because these are the most common real-world architectural patterns for enterprises adopting AWS. Expect two to four deployment model questions in the Cloud Concepts domain, with GovCloud frequently appearing as a specific example.

## Core Concepts

### Public Cloud

Public cloud is the model most people mean when they say "the cloud." Computing infrastructure is owned and operated by a third-party provider — AWS, Microsoft Azure, Google Cloud Platform — and made available to any paying customer over the internet. Multiple customers (called tenants) share the same physical infrastructure. Your virtual machine and another customer's virtual machine may run on the same physical host in the same AWS data center, completely unknown to each other.

This multi-tenancy is what makes public cloud economically powerful. By sharing physical hardware across hundreds of thousands of customers simultaneously, cloud providers achieve very high hardware utilization rates — far higher than any individual organization achieves with dedicated equipment. High utilization means lower per-unit cost, which is why public cloud delivers compute power at prices most organizations cannot match on their own.

The critical point for security-minded readers: multi-tenancy does not mean data sharing. AWS uses hypervisor technology (the software layer that creates and manages virtual machines) to completely isolate each customer's compute resources from every other customer's. Your EC2 instance cannot read memory from another customer's EC2 instance, even if both happen to run on the same physical server. Amazon VPC (Virtual Private Cloud) provides additional network isolation — your virtual network is entirely separate from every other customer's virtual network. Shared hardware is not the same as shared access.

Public cloud strengths: zero capital investment in hardware, effectively unlimited scalability from the customer's perspective, global reach across 30+ regions, access to hundreds of managed services, and pricing that benefits from AWS's massive economies of scale. Limitations: dependency on internet connectivity, the multi-tenant model (which despite strong isolation may not satisfy some compliance requirements or organizational risk policies), and the inability to physically inspect the hardware your workloads run on.

### Private Cloud

A private cloud is computing infrastructure dedicated entirely to a single organization. The defining characteristic is exclusivity: no hardware sharing with other tenants. Private cloud infrastructure may be located in your own data center, in a co-location facility your organization leases, or even managed operationally by a third party — but the hardware is reserved for your organization alone.

The motivation for private cloud typically falls into one of three categories: compliance requirements that explicitly prohibit shared infrastructure, organizational risk policies from leadership or legal teams that won't accept multi-tenancy regardless of AWS's technical isolation guarantees, or specific latency and connectivity requirements that necessitate hardware in a specific physical location.

Private cloud can be built several ways. An organization can deploy virtualization software — VMware vSphere, Microsoft Hyper-V, or open-source OpenStack — in their own data center, giving their engineers self-service provisioning (cloud-like user experience) on dedicated hardware (private ownership model). This approach provides maximum control but requires significant operational expertise to build and maintain.

AWS itself offers private cloud options within its ecosystem. **AWS Dedicated Hosts** are physical EC2 servers dedicated entirely to your account — no other customer's virtual machines run on that host. You get the same EC2 APIs, console management, and service integrations, but the underlying hardware is exclusively yours. This satisfies compliance requirements around hardware tenant isolation without leaving the AWS ecosystem or sacrificing the operational simplicity of managed infrastructure.

**AWS Dedicated Instances** provide similar isolation at the instance level — your instances run on hardware not shared with other AWS customers, though the same physical host may host multiple instances within your own account. The distinction from Dedicated Hosts is that with Dedicated Hosts, you have visibility and control over which specific physical host your instances run on — relevant for software licenses that are tied to physical server counts.

**AWS Outposts** goes the furthest: AWS delivers actual rack-mounted server hardware to your on-premises data center or co-location facility. The racks are built to the same specifications as hardware in AWS data centers, run the same AWS software stack, and provide the same AWS APIs and management interfaces. Your team interacts with Outposts through the AWS Console and AWS CLI exactly like any other AWS resource — but the hardware physically resides in your building, behind your firewall, with data never leaving your facility. Outposts is the most complete AWS private cloud solution: it delivers AWS's full operational experience while satisfying the physical location and control requirements that organizations genuinely need.

### Hybrid Cloud

Hybrid cloud combines public and private cloud environments and connects them so that workloads and data can flow between them as a coherent, integrated system. This is a more precise concept than "some things in the cloud and some things on-premises" — a true hybrid architecture means the two environments are connected and managed together, with workloads potentially spanning both environments simultaneously.

Hybrid cloud exists because no single deployment model is the right answer for every workload within a complex organization. A bank might run its core transaction ledger on private on-premises mainframes (regulatory requirement, decades of operational history, risk policy) while running its customer-facing mobile app and fraud detection models on AWS public cloud (scalability, managed ML services, speed of iteration). A manufacturer might keep its industrial control system on-premises (air-gap security requirement, real-time latency constraint) while running its enterprise applications in AWS. Hybrid lets these organizations modernize selectively and incrementally without requiring a "big bang" migration that puts all existing workloads at risk.

AWS provides a rich set of services specifically built for hybrid architectures. **AWS Direct Connect** establishes a dedicated private network connection — a physical fiber circuit — between your on-premises location and the nearest Direct Connect facility, which connects to AWS. Unlike a VPN that routes traffic over the public internet, Direct Connect provides consistent network performance with predictable bandwidth, and the traffic never crosses the public internet. This makes Direct Connect the right choice for hybrid workloads where data must flow reliably between environments at predictable throughput. **AWS Site-to-Site VPN** provides encrypted tunnels over the public internet — faster to set up (hours versus weeks for Direct Connect), lower cost, but with variable performance tied to internet conditions.

**AWS Storage Gateway** allows on-premises applications to use AWS cloud storage (S3, S3 Glacier, EBS) as if it were locally attached storage. An on-premises server can write backup files to a gateway that automatically replicates them to S3, without the application knowing or caring that the data is stored in AWS. **AWS Systems Manager** manages both on-premises servers (via an installed agent) and EC2 instances from a single management interface — providing unified visibility, patch management, and configuration compliance across both environments.

A common hybrid pattern called "cloud bursting" is worth knowing: organizations run their baseline workloads on-premises and automatically extend capacity into AWS EC2 during demand peaks that would overwhelm on-premises hardware. This lets the organization size their private infrastructure for average load while using cloud elasticity to handle spikes — combining the economics of private infrastructure for steady-state with the elasticity of cloud for variable demand.

### Community Cloud

A community cloud is infrastructure shared among a specific, defined group of organizations that share common requirements — typically regulatory compliance frameworks, security policy standards, or organizational mission alignment. Community cloud is more restrictive than public cloud (access is limited to community members) but more shared than private cloud (multiple organizations participate).

Community clouds are less common in practice than public or hybrid, but they are a defined model that appears on the exam. Multiple government agencies operating under the same security framework might share cloud infrastructure that has been jointly certified for their compliance requirements. Healthcare organizations in a regional health information exchange might share a HIPAA-compliant cloud environment. Financial institutions under the same regulatory regime might pool investment in infrastructure that has already been certified rather than each bearing the certification cost independently.

**AWS GovCloud (US)** is the most important community cloud example for the CLF-C02 exam. GovCloud is a set of isolated AWS regions — currently US-East and US-West — that are physically and logically separated from commercial AWS regions. Access to GovCloud requires eligibility verification: only U.S. government entities, U.S. government contractors working on qualifying workloads, and organizations that meet AWS's specific eligibility criteria can create GovCloud accounts. GovCloud supports regulatory frameworks including ITAR (International Traffic in Arms Regulations), FedRAMP High, DoD CC SRG (Cloud Computing Security Requirements Guide), and others. All AWS personnel with access to GovCloud infrastructure are U.S. citizens operating on U.S. soil. GovCloud customers use the same AWS services and APIs as commercial customers, but in an isolated environment with additional personnel and access controls.

One nuance worth noting for the exam: GovCloud is technically a public cloud region with restricted access — it runs on AWS-owned hardware and serves multiple tenants (all eligible U.S. government customers). It blurs the line between public and community cloud models. If pressed on classification, community cloud is the most accurate: it is shared infrastructure restricted to a specific community with common compliance requirements.

### Multi-Cloud

A fourth model worth understanding is multi-cloud: using services from two or more cloud providers simultaneously. An organization might run primary workloads on AWS and use Google Cloud for specific machine learning capabilities, or use Azure for Microsoft-integrated enterprise services while running primary compute workloads on AWS. Multi-cloud is a real enterprise strategy used to avoid vendor dependency on a single provider, meet specific technical requirements that one provider handles better than another, or satisfy procurement and negotiation goals.

Multi-cloud is distinct from hybrid cloud: hybrid refers to combining cloud with on-premises environments, while multi-cloud means using multiple cloud providers. In practice, large enterprises often do both simultaneously — which is sometimes called "hybrid multi-cloud." The exam tests the distinction between hybrid and multi-cloud, so the definitional difference is worth remembering.

## Configuration Reference

**Exploring AWS GovCloud in the Console:**

Navigate to the AWS Console at console.aws.amazon.com. Click the region selector in the top-right corner — it currently shows your active region, such as "US East (N. Virginia)." In the dropdown, scroll to find "AWS GovCloud (US-East)" and "AWS GovCloud (US-West)" listed separately from the standard commercial regions. With a standard commercial AWS account, attempting to switch to a GovCloud region will display a prompt indicating that access requires a separate GovCloud account and eligibility verification. You will not be able to provision resources there. This behavior directly illustrates the community cloud characteristic in practice: the regions are visible in the interface, but access is restricted to the eligible community.

If you create resources in a commercial region and then view the GovCloud entries in the region list, you'll notice your existing resources do not appear when you attempt to switch — because GovCloud is a physically and logically separate environment, not just a different geographic zone of the commercial AWS network. This physical isolation is the feature.

**AWS Outposts — What It Looks Like to the Customer:**

For organizations that have deployed Outposts racks in their data center, the experience in the AWS Console is designed to be nearly identical to working with standard AWS regions. Navigate to EC2 in the console and click "Launch instance." In the network configuration section, look at the "Subnet" dropdown. For accounts with deployed Outposts, the subnet list includes both standard Availability Zone subnets (like "subnet-abc123 | us-east-1a") and Outpost subnets (labeled with the Outpost identifier and the customer-defined site name — something like "subnet-xyz789 | Outpost: Chicago-DataCenter-Rack1"). Selecting an Outpost subnet means the instance you're launching will run on hardware physically located in your building, but managed through the identical AWS Console interface as any cloud-hosted instance.

To see your Outposts configuration: navigate to EC2 in the left menu and scroll to find "Outposts" in the navigation, or search "Outposts" in the console search bar. The Outposts console shows each rack, its physical site address, current available capacity by instance type, and connectivity status back to the parent AWS region. An Outpost that loses connectivity to its parent region continues to serve existing workloads locally but cannot provision new resources until connectivity is restored.

**AWS Direct Connect — Beginning the Process:**

Direct Connect involves physical network provisioning that cannot be completed entirely in the console — it requires working with a network service provider to establish a physical circuit. However, the console shows you where to begin. Search for "Direct Connect" in the service search bar. The Direct Connect console shows "Direct Connect Locations" — a list of worldwide co-location facilities where AWS has network equipment installed. These include major data center facilities like Equinix, CoreSite, and CyrusOne campuses in dozens of cities.

To establish Direct Connect, you (or your network provider) request a cross-connect from your equipment to the AWS router in one of these facilities. For organizations without co-location in a Direct Connect facility, AWS also offers "hosted connections" through network providers who already have Direct Connect infrastructure and can provision dedicated capacity on your behalf. The AWS Console shows your connection status, bandwidth, and virtual interfaces once established. Seeing this interface makes the physical reality of hybrid cloud concrete — it is a real fiber connection between your location and an AWS facility, not a software abstraction.

## How to Decide

Use this framework when choosing a deployment model for a workload or an overall organizational cloud strategy:

| Condition | Recommended Model | Reasoning |
|---|---|---|
| No existing infrastructure, no compliance restriction | Public cloud (standard AWS) | Fastest path, lowest cost, maximum managed service access |
| Hardware isolation required by compliance (no shared tenants) | Dedicated Hosts, or Private | Dedicated Hosts satisfy most hardware isolation requirements while remaining in AWS |
| Need AWS APIs but with hardware physically in your building | Hybrid with AWS Outposts | Outposts brings AWS to your facility |
| Existing sensitive/legacy workloads on-prem, new workloads on cloud | Hybrid cloud | Bridge environments with Direct Connect or Site-to-Site VPN |
| U.S. government workload requiring ITAR or FedRAMP High | AWS GovCloud | Purpose-built for U.S. government compliance requirements |
| Data sovereignty in jurisdiction where no AWS region exists | Private cloud (on-premises) | Genuine geographic constraint with no AWS solution |
| Sub-millisecond latency requirement (HFT, industrial real-time) | Co-located private infrastructure | Physical constraint no cloud architecture can overcome |
| Shared compliance requirements across multiple organizations | Community cloud | Shared certification investment, restricted access |
| Vendor diversification, best-of-breed per service | Multi-cloud | Reduces single-vendor dependency at cost of operational complexity |

**The key judgment call:** Private cloud is almost never the right answer for a new workload being built from scratch. Choose private cloud only when a genuine regulatory, security, or latency requirement exists that cannot be satisfied by public cloud options — including Dedicated Hosts, GovCloud, and Outposts. Many organizations that believe they require private cloud have in fact misread their compliance requirements. Always verify the specific regulatory text before defaulting to the significant cost and complexity of private infrastructure.

## How This Connects

- **AWS Outposts** is the physical manifestation of hybrid cloud — it delivers AWS hardware and software into your data center so you can run AWS services locally while remaining integrated with the parent AWS region. Understanding deployment models sets up your understanding of Outposts as a real product decision.
- **AWS Direct Connect** is what makes production-grade hybrid cloud operationally viable. Consistent, private bandwidth between on-premises and AWS means workloads can span both environments reliably. This connects to networking concepts covered in Module 13.
- **AWS GovCloud** connects directly to IAM and compliance topics in Modules 4 and 5 — it exists because certain government compliance frameworks require not just technical controls but physical infrastructure isolation and personnel vetting that commercial AWS regions do not provide.
- **Amazon VPC** is the networking foundation that makes public cloud functionally similar to private cloud for most practical purposes. Deep VPC knowledge (covered in Module 13) reveals why the multi-tenant public cloud model is more isolated than most security teams initially assume.
- **The AWS Well-Architected Framework's Reliability pillar** (covered in Module 6) uses multiple Availability Zones within a single region as the basis for fault tolerance — understanding that AZs are physically separate data centers connected by dedicated high-bandwidth links helps explain why multi-region hybrid architectures add complexity rather than simplifying resilience for most scenarios.

## Exam Traps

- Students often think private cloud means "more secure" and public cloud means "less secure." This is inaccurate. AWS public cloud achieves compliance certifications for some of the world's most demanding security frameworks, including classified government systems via GovCloud. The deployment model choice is about physical control and regulatory requirements, not inherent security capability — and for most organizations, AWS's security investments exceed what they could realistically achieve in a self-operated private cloud.
- Students often think AWS GovCloud is a private cloud. GovCloud is technically a public cloud region with restricted access — it runs on AWS-owned shared hardware, serves multiple eligible tenants simultaneously, and uses the same multi-tenant architecture as commercial AWS. It is most accurately described as a community cloud: restricted access, shared among a specific community with common compliance requirements. The CLF-C02 exam may ask you to classify GovCloud.
- Students often confuse AWS Direct Connect with AWS VPN. Direct Connect is a dedicated physical circuit — consistent performance, no public internet exposure, higher cost, longer provisioning time (weeks). VPN is an encrypted tunnel over the public internet — variable performance dependent on internet conditions, faster to set up (hours), lower monthly cost. Both create hybrid connectivity, but their performance and cost profiles are meaningfully different.
- Students often think hybrid cloud means an approximately equal split between on-premises and cloud resources. Hybrid cloud simply means the two environments are connected and integrated — the split could be 95/5 in either direction. An organization running 5% of workloads on-premises for a specific compliance reason, connected to AWS via Direct Connect, is running a hybrid cloud architecture regardless of the asymmetry.
- Students often confuse community cloud and private cloud because both restrict access. The key difference: private cloud serves one organization exclusively; community cloud is shared among multiple organizations with common requirements. GovCloud serves thousands of government customers — it is not private to any single one of them.

## Summary

- Public cloud (standard AWS regions) is infrastructure owned by AWS, shared via multi-tenancy with strong hypervisor and VPC isolation — the correct default for most workloads and the model that enables AWS's economies of scale.
- Private cloud is infrastructure dedicated to a single organization; AWS supports this with Dedicated Hosts, Dedicated Instances, and AWS Outposts (which brings AWS hardware into the customer's facility).
- Hybrid cloud connects on-premises and public cloud environments into an integrated architecture using Direct Connect, Site-to-Site VPN, Storage Gateway, and Outposts — widely used by enterprises migrating incrementally or running workloads that span both environments.
- Community cloud serves a restricted group of organizations with shared compliance requirements; AWS GovCloud is the most important exam example — physically isolated, restricted-access regions for U.S. government workloads.
- Multi-cloud uses services from multiple cloud providers simultaneously; it is a real enterprise strategy for vendor diversification but introduces significant operational complexity.
- Private cloud is rarely the right choice for new workloads — AWS Dedicated Hosts and GovCloud satisfy most hardware isolation requirements that organizations initially believe require private infrastructure.

## Examples

A Series B SaaS startup building a project management tool is a textbook public cloud customer. They have no existing infrastructure, no compliance requirements mandating physical hardware control, and a small engineering team that cannot operationally afford to manage data centers. They deploy entirely on AWS — EC2, RDS, S3, CloudFront — benefiting from immediate global reach and managed services they could never build themselves. The multi-tenant model means they share physical hardware with thousands of other AWS customers, but AWS's VPC and hypervisor isolation ensures their data never mingles with anyone else's. They trade physical control for economic efficiency and operational simplicity, which is exactly the right trade at their stage. Any requirement to run their own infrastructure would represent an enormous operational distraction for no technical benefit.

A large U.S. defense contractor with classified program work demonstrates a genuine private cloud requirement. Their contracts involve information subject to ITAR and specific classification requirements that legally restrict which networks and physical hardware the data may transit or reside on. No public cloud infrastructure — regardless of AWS's technical isolation guarantees — satisfies their legal obligations under their security clearance terms for this specific data. They operate an air-gapped private cloud in a government-approved secure facility for classified workloads. Notably, their unclassified project management, HR, and collaboration tools all run on commercial AWS — because those workloads have no such restrictions. The resulting architecture is deliberate hybrid design: classified data on private infrastructure, everything else on public cloud, with no network connection between the two environments. Private cloud here is a legal obligation, not a conservative preference.

A major retail bank operating at enterprise scale illustrates hybrid cloud at its most practical. Their core banking transaction ledger runs on on-premises mainframes that have processed billions of dollars in transactions daily for decades. Migrating this system is a multi-year project requiring extraordinary care — not a candidate for rapid cloud migration. But their customer-facing mobile application, fraud detection machine learning models, and marketing analytics platform all run on AWS, built on modern architectures that leverage Auto Scaling, SageMaker, and Redshift. AWS Direct Connect provides a dedicated private circuit between their primary data center and their AWS VPC, so transaction data flows between the mainframe and the AWS-hosted fraud detection system without touching the public internet. The fraud model receives transaction data from the mainframe in near-real time, scores it against a model running on SageMaker, and returns a risk decision within milliseconds — a process that requires both the mainframe's authoritative data and AWS's ML infrastructure. Neither environment alone could deliver this capability. Hybrid cloud here is not a compromise or a migration stepping stone: it is the correct long-term architecture for this specific combination of business requirements and constraints.

## Think About It

1. AWS GovCloud is described as "a public cloud region with restricted access." In what concrete sense is it still a public cloud — and in what sense does it satisfy the definition of community cloud? Where does the distinction between deployment model categories actually break down in practice?

2. A company uses AWS Dedicated Hosts to satisfy a compliance requirement stating "no hardware sharing with other organizations." They're still on AWS infrastructure in an AWS data center. Are they running a private cloud, a public cloud, or something in between? What does your answer reveal about how the deployment model definitions were originally written?

3. Hybrid cloud is often described as "the best of both worlds," but critics argue it's "the worst of both worlds" — you pay the complexity cost of managing two environments without fully capturing the benefits of either. Under what specific circumstances is hybrid cloud the correct long-term architecture rather than just a migration stepping stone?

4. Community cloud is the least commonly deployed model. What structural or economic conditions would need to change for community clouds to become more prevalent in industries like healthcare or financial services — and does AWS GovCloud suggest a viable path for other industries?

5. If a company runs 80% of workloads on AWS and 20% on-premises connected via Direct Connect, and calls it a "hybrid cloud strategy," what questions would you ask to determine whether they have a coherent integrated hybrid architecture versus workloads they simply haven't finished migrating?

## Quick Check

**Q1.** Which deployment model is characterized by infrastructure shared exclusively among multiple organizations with common compliance or regulatory requirements?
- A) Public cloud
- B) Private cloud
- C) Hybrid cloud
- D) Community cloud

**Answer: D** — Community cloud is infrastructure shared exclusively by a defined community of organizations with shared concerns — such as multiple U.S. government agencies under the same security framework. AWS GovCloud is the most prominent example: it serves thousands of eligible U.S. government customers in physically isolated regions with restricted access.

**Q2.** Which AWS service allows organizations to run AWS-managed infrastructure physically located in their own on-premises data center while using the same AWS APIs and management console?
- A) AWS Direct Connect
- B) AWS Site-to-Site VPN
- C) AWS Outposts
- D) AWS Local Zones

**Answer: C** — AWS Outposts delivers physical AWS-managed rack infrastructure to a customer's on-premises location. It enables EC2, RDS, ECS, and other AWS services to run locally on hardware physically in the customer's building, while being managed through the same AWS Console and APIs as any cloud-hosted resource.

**Q3.** In a public cloud deployment, how are individual customers' workloads and data kept separate from each other on shared physical hardware?
- A) Each customer has dedicated physical servers that other customers cannot access
- B) Customers are automatically placed in different geographic regions
- C) Hypervisor-level virtualization and logical network isolation through Amazon VPC
- D) All data is encrypted at the hardware layer with customer-unique keys

**Answer: C** — Public cloud uses a multi-tenant model where customers share physical hardware, but the AWS hypervisor provides strong compute isolation (preventing one VM from accessing another's memory) and Amazon VPC provides logical network isolation (preventing one customer's traffic from reaching another). The isolation is logically enforced through software, not physical separation.

## What's Next

In the next lesson, we cover the six official AWS benefits of cloud computing — the structured framework AWS uses to describe cloud's value proposition — and how to recognize which benefit applies to any given scenario on the exam.
