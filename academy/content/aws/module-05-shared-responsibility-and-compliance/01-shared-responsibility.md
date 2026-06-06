---
title: "The Shared Responsibility Model"
type: content
estimated_minutes: 14
cert_tags: ["CLF-C02", "SAA-C03"]
---

# The Shared Responsibility Model

## Overview

When you move workloads to AWS, you do not hand over all security responsibility to Amazon. Instead, you enter a formal division of labor called the Shared Responsibility Model — one of the most important conceptual frameworks in all of AWS, and a topic that appears on every AWS certification exam. Understanding it is not optional; misunderstanding it is the root cause of most cloud security breaches.

The model can be condensed into one sentence: AWS is responsible for security **of** the cloud, and you are responsible for security **in** the cloud. AWS secures the physical data centers, the hardware, the hypervisor, and the software stacks that power managed services. You secure what you deploy on top — your data, your IAM configuration, your network controls, your application code, and your operating system where applicable.

What makes this model genuinely complex — and what makes it an exam favorite — is that the boundary between "of" and "in" is not fixed. It moves depending on which AWS service type you use. With IaaS (Infrastructure as a Service) like EC2, you manage far more. With PaaS (Platform as a Service) like RDS, AWS absorbs more. With higher-level services like Lambda or S3, AWS absorbs even more. The model is a spectrum, not a binary switch. Understanding exactly where that boundary sits for each service you use is a practical security skill, not just an academic one.

## Core Concepts

### The Two Sides: "Of" vs. "In"

The official AWS framing — security of the cloud versus security in the cloud — is precise and deliberate. "Of" means the cloud platform itself: the steel, the silicon, the fiber, the virtualization layer. "In" means what you run and configure inside that platform: your code, your data, your access policies, your network topology.

This distinction matters because it makes explicit what each party controls. AWS controls the data center. You control the door to your S3 bucket. AWS controls the hypervisor. You control whether your EC2 instance has the latest OS patches. Neither party can do the other's job — AWS cannot patch your application code, and you cannot patch AWS's physical servers. The model is not about trust; it is about capability and control.

### IaaS: EC2 and Maximum Customer Responsibility

EC2 is Infrastructure as a Service — you get a virtual machine and you control everything above the hardware. AWS is responsible for the physical host hardware, the Nitro hypervisor that isolates your instance from neighboring tenants, and the global network fabric. Everything else is yours.

That means the full guest operating system — including every security patch, every hardening configuration, every installed package — is your responsibility. The application running on that OS is your responsibility. The data your application writes to disk is your responsibility. The security groups that control traffic to and from the instance are your responsibility. The IAM role attached to the instance and the permissions it grants are your responsibility. This is the widest customer responsibility surface of any AWS service type, which is why EC2 security is a discipline unto itself.

### PaaS: RDS and Shrinking Customer Responsibility

Amazon RDS is Platform as a Service — you consume a managed database engine without managing the host it runs on. AWS assumes responsibility for the underlying operating system (patching, hardening, configuration), the database engine software (version upgrades, security patches), the hardware, and the hypervisor. This removes a large operational and security burden that traditionally required a dedicated DBA team.

What remains yours: you decide whether encryption at rest is enabled and which KMS key is used. You configure the security groups that control which resources can reach the database port. You manage the database user accounts and their privileges. You decide whether to enable automated backups and how long to retain them. You choose whether to enable Multi-AZ for availability. AWS gave you a secure, managed foundation — but the access controls, encryption settings, and data governance are still your domain.

### SaaS-Like: Lambda and Minimal Customer Responsibility

AWS Lambda is often called serverless, but that is really a shorthand for "AWS manages the servers and you never see them." AWS is responsible for the execution environment — the underlying OS, the runtime (Node.js, Python, Java, etc.), the hardware, the scaling infrastructure, and the isolation between function executions. This is a fundamentally larger AWS responsibility surface than EC2 or RDS.

What you own: the function code itself (if your code has a SQL injection vulnerability, that is your problem), the IAM execution role the function uses (overly permissive roles are a customer failure), any environment variables or secrets your function accesses, and the data your function processes. Lambda shrinks your responsibility surface dramatically — but it does not eliminate it.

### S3: Object Storage and the Data Responsibility Trap

Amazon S3 is one of the most misunderstood services in the responsibility model. Developers sometimes assume that because S3 is a fully managed AWS service, AWS secures their data. This is incorrect and dangerous. AWS secures the S3 infrastructure — the hardware, the distributed storage system, the durability mechanisms. You are responsible for everything about how your data is configured and accessed.

That means bucket policies, object ACLs, and access control are entirely yours. Whether your bucket is public or private is your decision. Whether objects are encrypted — and which key is used — is your decision. Whether you enable versioning, Object Lock, or access logging is your decision. S3 now enables server-side encryption by default, which is a helpful default, but it does not substitute for your access control configuration. A correctly encrypted but publicly accessible S3 bucket is still a breach.

### The Spectrum: Responsibility Shifts with Service Type

The most important insight in this lesson is that shared responsibility is not a single line — it is a gradient. Every AWS service sits somewhere on a spectrum from maximum customer responsibility (EC2, bare-metal) to minimum customer responsibility (fully managed SaaS-like services). When you architect a system, you are implicitly choosing where on that spectrum to operate, and therefore how much security work your team will own.

Choosing RDS over self-managed MySQL on EC2 is not just a convenience decision — it is a security responsibility decision. You are outsourcing OS patching and engine security to AWS. Choosing Lambda over EC2 is not just a scaling decision — it is a decision to hand the runtime security surface to AWS. Understanding this spectrum lets you make deliberate architectural choices about security ownership, not accidental ones.

## Configuration Reference

The following responsibility matrix shows who owns each security control for four major service types. Read AWS as "AWS manages this — you have no access to it." Read Customer as "you must configure and maintain this." Read Shared as "AWS provides the mechanism or the default, but you must make active decisions to apply it correctly."

| Security Control | EC2 (IaaS) | RDS (PaaS) | Lambda (Serverless) | S3 (Object Storage) |
|---|---|---|---|---|
| Physical data center security | AWS | AWS | AWS | AWS |
| Hardware (servers, network, storage) | AWS | AWS | AWS | AWS |
| Hypervisor / virtualization isolation | AWS | AWS | AWS | AWS |
| Host operating system | AWS (host OS) / Customer (guest OS) | AWS | AWS | AWS |
| Guest OS patching | **Customer** | AWS | AWS | N/A |
| Runtime environment (language, engine) | Customer | AWS (DB engine) | AWS | N/A |
| Application code | **Customer** | **Customer** | **Customer** | N/A |
| Data at rest — encryption capability | AWS provides KMS integration | AWS provides KMS integration | AWS provides env var encryption | AWS provides SSE by default |
| Data at rest — encryption enabled | **Customer** | **Customer** | **Customer** | AWS (default SSE-S3) / Customer (KMS) |
| Data in transit — TLS capability | AWS provides endpoints | AWS provides endpoints | AWS provides HTTPS | AWS provides HTTPS endpoints |
| Data in transit — TLS enforcement | **Customer** | **Customer** | **Customer** | **Customer** |
| Network configuration (security groups) | **Customer** | **Customer** | **Customer** (VPC config if used) | N/A (bucket policies instead) |
| Network ACLs (subnet level) | **Customer** | **Customer** | **Customer** (if VPC-attached) | N/A |
| IAM roles and permissions | **Customer** | **Customer** | **Customer** | **Customer** |
| Access control policies | **Customer** | **Customer** (DB users) | **Customer** | **Customer** (bucket policies, ACLs) |
| Firewall / security group rules | **Customer** | **Customer** | **Customer** | N/A |
| Patch management (infrastructure) | AWS | AWS | AWS | AWS |
| DDoS mitigation (infrastructure layer) | AWS (Shield Standard) | AWS (Shield Standard) | AWS (Shield Standard) | AWS (Shield Standard) |
| Compliance certification (infrastructure) | AWS | AWS | AWS | AWS |

**How to read this table in practice:** For any security control in your architecture, identify which service type it falls under, find the corresponding column, and check who owns the row. If the cell says Customer, that control must appear in your security checklist. If it says AWS, you can rely on AWS's audit reports (available in AWS Artifact) to verify it — but you cannot configure or change it.

## How to Decide

When evaluating who owns a security control for a given AWS resource, use this decision framework:

| Question | If Yes | If No |
|---|---|---|
| Does the customer have direct access to configure this control in the AWS Console or API? | Customer responsibility | Likely AWS responsibility |
| Is this control at the physical infrastructure level? | AWS responsibility | Continue to next question |
| Is this a managed service where AWS abstracts the underlying OS? | AWS owns the OS layer | Customer owns the OS layer |
| Does a misconfiguration of this control appear in Security Hub or Trusted Advisor findings? | Customer responsibility | Likely AWS responsibility |
| Can the customer choose to enable or disable this control? | Customer responsibility (even if AWS provides the default) | AWS responsibility |

**Practical example:** You want to know who is responsible for enabling encryption on an RDS instance. Walk through: Can the customer configure it? Yes — you check a box when creating the instance. Is it physical infrastructure? No. Is RDS a managed service? Yes, but encryption is a customer-facing setting. Does it appear in Security Hub? Yes — unencrypted RDS is a finding. Can you choose to enable or disable it? Yes. Result: customer responsibility. AWS provides the mechanism; you must pull the trigger.

## How This Connects

- **AWS Identity and Access Management (IAM)** — the primary tool for fulfilling your "in the cloud" IAM responsibilities. Misconfigured IAM is the most common root cause of cloud security incidents.
- **AWS Key Management Service (KMS)** — the encryption key service that underpins customer-side encryption decisions across EBS, S3, RDS, and Lambda. Choosing whether to use AWS-managed or customer-managed keys is always a customer responsibility.
- **AWS Security Hub** — aggregates security findings across your AWS accounts and benchmarks your configuration against CIS and AWS Foundational Security Best Practices. Every finding in Security Hub is a customer responsibility gap.
- **AWS Artifact** — the portal where you download AWS's compliance audit reports (SOC 2, ISO 27001, PCI DSS). These reports verify AWS's side of the shared responsibility model.
- **Amazon VPC** — the network boundary you configure to fulfill your network security responsibilities. Security groups, NACLs, route tables, and subnet design are all customer-owned controls that live inside VPC.

## Exam Traps

**Trap 1: "It's managed by AWS, so AWS handles all the security."** Wrong. RDS is managed, but you still own encryption configuration, security group rules, and database user privileges. "Managed" means AWS manages the infrastructure and runtime — not your data or your access controls.

**Trap 2: "S3 data is secure because S3 is encrypted by default."** Dangerous half-truth. S3 does now enable server-side encryption by default, which protects data at rest from physical media theft. But encryption does not control who can access the objects. A publicly accessible bucket with encrypted objects is still a breach. Access control and encryption are separate controls, both your responsibility.

**Trap 3: "AWS Shield protects my application from all DDoS attacks."** Shield Standard, which is free and automatic, protects against common infrastructure-layer (L3/L4) DDoS attacks. Application-layer (L7) attacks — like HTTP floods — still require customer action: AWS WAF rules, Shield Advanced, and application-level rate limiting. Infrastructure DDoS is AWS's job; application-layer DDoS defense is yours.

**Trap 4: "The hypervisor is the customer's responsibility to configure."** Never. Customers have zero access to the hypervisor. Hypervisor security and tenant isolation are entirely AWS's responsibility. This is one of the clearest AWS-only responsibilities in the model.

**Trap 5: "The shared responsibility model is the same for all services."** Incorrect. The model explicitly shifts by service type. EC2 gives you maximum control and maximum responsibility. Lambda gives you minimum control but also minimum responsibility. The exam will test whether you know where the line sits for specific services.

## Summary

- The Shared Responsibility Model divides security into AWS's domain ("of the cloud": hardware, facilities, hypervisor, managed runtimes) and the customer's domain ("in the cloud": data, IAM, network config, OS patching where applicable, application security).
- The boundary is not fixed — it shifts by service type. EC2 (IaaS) requires the most customer security work; Lambda and S3 (managed/serverless) require less, but do not eliminate customer responsibility.
- Customers always own their data, their IAM configuration, and their access control policies, regardless of which AWS service stores or processes that data.
- AWS provides mechanisms for security controls (encryption APIs, security group infrastructure, KMS) but the customer must make active decisions to apply them correctly.
- AWS's side of the model is verified by third-party auditors; those reports are downloadable from AWS Artifact and can be used to satisfy enterprise or regulatory due diligence requirements.
- Misunderstanding the model — assuming AWS handles more than it does — is the most common structural cause of cloud security failures at the CCP/practitioner level.

## Examples

**Beginner:** A developer builds their first AWS project — a simple web app with an EC2 instance and an S3 bucket for user uploads. They use all defaults: no OS patching scheduled, default security groups with port 22 open to 0.0.0.0/0, and the S3 bucket left with ACLs not reviewed. Six months later, the EC2 instance is compromised through an unpatched vulnerability, and a competitor downloads 50,000 user files from the public-facing S3 bucket. Every one of these failures is a customer responsibility gap — not an AWS failure. AWS's physical infrastructure, hypervisor, and S3 storage system performed perfectly. The security gaps lived entirely in the "in the cloud" domain that the developer never engaged with.

**Intermediate:** A mid-market e-commerce company migrates from a colocation data center to AWS. Their security team is experienced with traditional infrastructure and initially approaches AWS the same way — patching everything manually, managing network ACLs like physical firewall rules. As they add managed services (RDS for the database, SQS for order queuing, CloudFront for distribution), their security architect realizes the responsibility model is shifting. They build an internal service catalog that explicitly maps every service they use to the responsibility matrix — identifying which controls they must configure (encryption, access policies, security groups) and which controls AWS owns (database engine patching, CloudFront infrastructure, SQS message routing). This catalog becomes the foundation of their quarterly security review process, ensuring customer-side gaps are tracked and closed systematically.

**Advanced:** A fintech firm operates under PCI DSS and is designing a new payment processing pipeline. Their solution architect builds the architecture on Lambda (for processing logic), DynamoDB (for transaction records), and API Gateway (for the payment endpoint). In their threat model, they explicitly map the shared responsibility boundary for each service: Lambda — AWS owns the runtime and execution isolation, they own the function code and IAM execution roles; DynamoDB — AWS owns the storage infrastructure and at-rest encryption by default, they own the table-level access policies and must enable KMS CMK encryption for PCI scope; API Gateway — AWS owns the infrastructure, they own authentication configuration (API keys, Cognito authorizers), WAF integration, and TLS policy selection. This granular responsibility mapping directly feeds their PCI DSS self-assessment questionnaire — they can document which controls are AWS's (backed by AWS's PCI Attestation of Compliance from Artifact) and which are theirs, with configuration evidence from AWS Config.

## Think About It

1. Why does the responsibility boundary shift when you move from EC2 to Lambda? What specific responsibilities does AWS absorb, and does absorbing those responsibilities introduce any new risks for the customer — or only remove them?
2. A developer tells you: "We use S3, so AWS handles our data security." What exactly is incomplete or misleading about that statement? What three specific questions would you ask to understand the actual security posture of that data?
3. If an organization using 15 different AWS services assumes AWS is responsible for all IAM configuration across those services, walk through the realistic attack scenario that follows. What specific AWS service documentation would you point them to in order to correct this assumption?
4. You are architecting a system that processes sensitive medical data. You have a choice between self-managed PostgreSQL on EC2 or Amazon RDS. How does the Shared Responsibility Model factor into that architectural decision — not just operationally, but in terms of your compliance documentation burden?
5. The shared responsibility model is sometimes compared to renting an apartment (you don't maintain the building's plumbing, but you lock your own door). Where does that analogy break down when applied to cloud security, and what unique risks does the breakdown reveal?

## Quick Check

**Q1.** Under the AWS Shared Responsibility Model, who is responsible for patching the operating system on an Amazon EC2 instance?

- A) AWS, because EC2 runs on AWS physical infrastructure
- B) The customer, because EC2 is an IaaS service where the customer controls the guest OS
- C) AWS patches the kernel; the customer patches user-space packages
- D) It depends on the EC2 instance type and size

**Answer: B** — EC2 is Infrastructure as a Service. The customer controls the guest operating system — including all security patches, hardening, and configuration. AWS manages the physical host and hypervisor, but the guest OS is entirely the customer's domain.

**Q2.** When a customer uses Amazon RDS, which of the following is AWS responsible for, and which is the customer responsible for?

- A) AWS: database user permissions; Customer: database engine patching
- B) AWS: database engine patching; Customer: security group configuration
- C) AWS: security group rules; Customer: database engine patching
- D) AWS: enabling encryption at rest; Customer: physical hardware

**Answer: B** — With RDS, AWS manages the database engine software including security patches — that is the core value of a managed database service. Security group configuration controlling which resources can reach the database remains entirely the customer's responsibility. Encryption at rest must also be enabled by the customer.

**Q3.** A company is evaluating whether to run their message queue on self-managed Apache Kafka on EC2 or switch to Amazon SQS. From a Shared Responsibility Model perspective, what changes when they move to SQS?

- A) The customer loses all control over message-level security
- B) AWS absorbs responsibility for the broker software, OS, and hardware; the customer retains responsibility for access policies and message encryption
- C) The shared responsibility model does not apply to SaaS-like services like SQS
- D) AWS takes over all security responsibilities because SQS is fully managed

**Answer: B** — Moving from self-managed Kafka on EC2 to SQS shifts the broker software, underlying OS, and hardware entirely to AWS. The customer retains responsibility for IAM policies controlling who can send and receive messages, KMS encryption of message content, and VPC endpoint configuration if applicable. Shared responsibility still applies — the boundary simply moves.

## What's Next

Next lesson examines the customer side of the model in depth — the specific security controls you own and must configure correctly, from IAM to OS patching to network segmentation.
