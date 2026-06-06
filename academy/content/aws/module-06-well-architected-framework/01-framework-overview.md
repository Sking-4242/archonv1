---
title: "Well-Architected Framework Overview"
type: content
estimated_minutes: 22
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Well-Architected Framework Overview

## Overview

The AWS Well-Architected Framework is the authoritative body of architectural best practices for designing, building, and operating workloads in the cloud. It did not originate from a committee of theorists — it emerged from AWS Solutions Architects conducting tens of thousands of customer architecture reviews over more than a decade, cataloguing the patterns that consistently produced reliable, secure, efficient, and cost-effective systems, and the anti-patterns that consistently caused outages, breaches, runaway costs, and operational nightmares. The framework is, at its core, the codified experience of watching real architectures succeed and fail at scale — then asking what the successful ones had in common. Published first in 2015 and regularly updated since, it is the closest thing AWS has to a single definitive answer to the question: "How should I build things on AWS?"

The framework is organized around six pillars: Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability. Each pillar represents a distinct dimension of architectural quality that every workload must address. Critically, the pillars are not independent — deliberate trade-offs between them are normal, expected, and architecturally honest. Adding redundancy for Reliability increases costs (Cost Optimization tension). Encrypting all data at rest for Security introduces some computational overhead (Performance Efficiency tension). Building automated deployment pipelines for Operational Excellence takes engineering time that could have gone to features. Becoming fluent in the framework means understanding not just each pillar in isolation, but how to reason about these tensions explicitly and prioritize based on actual business requirements — not guesswork.

For the CLF-C02 exam, you must know the names of all six pillars and what each addresses at a survey level. For the SAA and SAP exams, you must apply the pillars to architecture scenarios: identifying which pillar a given design choice supports, which pillar a described problem violates, and how to recommend Well-Architected improvements in context. In practice, the framework is used by AWS Solutions Architects during formal workload reviews, by engineering teams during system design, and by organizations running periodic architectural health checks. It is also the operating philosophy behind AWS Trusted Advisor, the Well-Architected Tool, and much of AWS's own service design. Understanding it deeply makes you a better architect and a more effective communicator with AWS teams and customers alike.

## Core Concepts

### The Six Pillars

The six pillars cover every major dimension of architectural quality. Knowing each one's name, focus, and primary AWS services is a CLF-C02 exam requirement.

| Pillar | Core Question | Key Themes | Representative Services |
|---|---|---|---|
| Operational Excellence | Can you run and improve your system reliably over time? | IaC, automated runbooks, CI/CD, blameless post-mortems, small reversible changes | CloudFormation, CodePipeline, Systems Manager, CloudWatch, CloudTrail |
| Security | Can you protect data and systems while delivering value? | Least privilege, defense in depth, encryption everywhere, automated responses | IAM, KMS, GuardDuty, WAF, Shield, Security Hub |
| Reliability | Will your system perform its function consistently and recover from failures? | Multi-AZ, Auto Scaling, backup and restore, chaos engineering | RDS Multi-AZ, Auto Scaling, Route 53, AWS Backup, FIS |
| Performance Efficiency | Are you using the right resources for each job at the right scale? | Managed services, mechanical sympathy, benchmarking, serverless | Lambda, ElastiCache, CloudFront, DynamoDB, Graviton instances |
| Cost Optimization | Are you spending only what delivers value, and do you know where every dollar goes? | Rightsizing, consumption model, Savings Plans, tagging, waste elimination | Cost Explorer, Compute Optimizer, Savings Plans, Spot Instances |
| Sustainability | What is the environmental impact of your workload, and how can you reduce it? | Energy efficiency, utilization, lower-carbon options, idle elimination | Graviton, serverless, managed services, Carbon Footprint Tool |

WHY does this structure matter? Having six distinct named pillars gives teams a shared vocabulary for architectural conversations. Instead of a vague debate about "whether the architecture is good," teams can have specific, targeted discussions: "We have a Reliability gap here — no Multi-AZ on this database — and a Cost Optimization opportunity there — these instances are 60% idle." The pillars convert architectural quality from an aesthetic judgment into a structured, auditable evaluation.

### Shared Design Principles Across All Pillars

Before the pillar-specific principles, the Well-Architected Framework articulates several design principles that cut across all pillars and apply to every workload on AWS:

| Design Principle | What It Means | Why It Matters |
|---|---|---|
| Stop guessing capacity | Use Auto Scaling and serverless; provision to actual demand, not predictions | Prevents both costly over-provisioning and dangerous under-provisioning |
| Test systems at production scale | Spin up full-scale replicas in the cloud to run load tests; tear them down after | Simulation in the cloud is cheap; discovering capacity limits in production is not |
| Automate to make architectural experimentation easier | Automation lets you try architectures cheaply and roll back safely | Manual environments make experimentation expensive and reversal risky |
| Allow for evolutionary architectures | Design systems that can change without full rewrites | Business requirements evolve; locked architectures accumulate debt |
| Drive architectures using data | Use actual usage and performance data to guide changes | Intuition is unreliable; data is falsifiable |
| Improve through game days | Simulate failure scenarios to validate assumptions and train the team | Assumptions about resilience must be verified, not trusted |

### The Well-Architected Tool (WAT)

The Well-Architected Tool is a free, self-service AWS console application (available at console.aws.amazon.com/wellarchitected) that guides you through a structured review of any workload against the six pillars. You define a workload — a name, description, environment, AWS accounts, and regions — select a lens (standard Well-Architected, SaaS, Financial Services, Serverless, Data Analytics, and many others), and answer a series of questions about your architecture choices. Based on your answers, the tool generates a report identifying High Risk Issues (HRIs) and Medium Risk Issues (MRIs), ranked by pillar and severity, with specific remediation guidance for each finding.

WHY use the Tool rather than just reading the whitepaper? The whitepaper is general guidance. The Tool is personalized — it asks questions about your specific workload, records your answers, and produces findings relevant to what you have actually described. The output is a prioritized, actionable remediation list for your architecture, not a generic best-practices document. The Tool is free, exportable as a PDF report, and tracks milestone history across multiple reviews so you can measure architectural improvement over time.

### High Risk Issues (HRIs) and Medium Risk Issues (MRIs)

When the Well-Architected Tool evaluates your answers, it classifies findings by severity. A High Risk Issue (HRI) represents a significant architectural gap — something that meaningfully threatens the workload's reliability, security, performance, cost posture, or operational capability. A Medium Risk Issue (MRI) is a moderate gap: worth addressing, but less urgent than an HRI.

WHY does the HRI/MRI distinction matter? Triage. A large workload review across all six pillars may surface 20–40 findings. Without prioritization, remediation planning is paralytic. HRIs carry the highest probability or impact of causing real harm — outages, data loss, security breaches, severe cost overruns. Addressing HRIs first is the Well-Architected approach to remediation sequencing. Most organizations build a 3–6 month remediation roadmap from their HRI list following a formal review.

### Lenses

The base Well-Architected Framework covers workloads in general. Lenses are domain-specific extensions that add tailored questions and guidance for particular workload types. AWS publishes lenses for SaaS, Serverless, Data Analytics, Financial Services, Healthcare, Government, IoT, Machine Learning, and more. Third parties and AWS Partners can also publish custom lenses.

WHY do lenses exist? Different workloads have genuinely different architectural requirements. A SaaS application faces multi-tenancy isolation challenges — shared infrastructure with per-tenant data separation — that a standard enterprise workload never encounters. A financial services workload must address audit trail depth, data residency, and segregation of duties at a level that a startup SaaS workload does not. Lenses let the framework be simultaneously general (applicable to any workload) and specific (surfacing the real concerns of particular industries and architectures). A SaaS lens review might add 30–50 questions that the standard framework would never ask.

### Pillar Trade-offs and Prioritization

The six pillars create inherent, unavoidable tensions. Common examples:

| Trade-off | Pillar A | Pillar B | Resolution Approach |
|---|---|---|---|
| Multi-AZ redundancy costs money | Reliability (more) | Cost Optimization (less) | Quantify cost of downtime vs. cost of redundancy |
| Encryption adds latency overhead | Security (more) | Performance Efficiency (less) | Benchmark actual impact; usually acceptable |
| Writing runbooks takes engineering time | Operational Excellence (more) | Speed to market | Prioritize top 3 failure modes; build incrementally |
| Rightsizing requires monitoring investment | Cost Optimization (more) | Operational Excellence (foundation needed) | OE investment enables CO improvement |

AWS's position on trade-offs: they are explicitly expected and should be made deliberately. "We chose to accept single-AZ as a known reliability risk during beta, and we will address it before GA" is a professionally made trade-off. "We didn't think about it" is architectural debt accumulating by default. The framework teaches you to name trade-offs, document them, and revisit them as circumstances change.

## Configuration Reference

### AWS Well-Architected Tool Console Walkthrough

Navigate to console.aws.amazon.com/wellarchitected to access the Tool. You must be signed into an AWS account.

**Step 1: Create a Workload**

Click "Define workload." Complete the workload definition form:

| Field | What to Enter | Why It Matters |
|---|---|---|
| Workload Name | Descriptive name (e.g., "Order Processing API - Production") | Identifies this workload across all reviews and reports |
| Description | What the workload does, who its users are, its criticality | Gives reviewers context; improves the quality of pillar answers |
| Review Owner | Name or email of the responsible engineer or team | Accountability for follow-up remediation |
| Environment | Pre-production or Production | Affects how severely findings are weighted; Production HRIs are flagged more urgently |
| AWS Regions | All regions where the workload runs | Scopes the review; findings can reference region-specific gaps |
| Account IDs | AWS account numbers used by this workload | Associates findings with specific accounts for multi-account organizations |
| Industry Type | Your industry vertical (e.g., Financial Services, Healthcare, Technology) | Enables industry-relevant guidance in the standard review |
| Industry | Specific industry category | Further scopes recommendations |

After saving, the workload appears in your workload list with status "Not started."

**Step 2: Select a Lens**

From the workload detail page, click "Start reviewing" and choose which lens to apply. The default is the AWS Well-Architected Framework lens — always apply this. If your workload is a SaaS product, also select the SaaS Lens. If you are building serverless architecture, add the Serverless Lens. Multiple lenses can be applied simultaneously to a single workload.

WHY this matters: The standard lens covers all six pillars with questions applicable to any workload. Domain lenses add 20–60 additional questions specific to your workload type. Selecting the wrong lens or no domain lens means your review will miss the risk categories most relevant to your architecture.

**Step 3: Answer the Pillar Questions**

The tool presents questions for each pillar in sequence. For each question, your options are:

| Answer | Meaning |
|---|---|
| Yes | This best practice is fully implemented |
| No | This best practice is not implemented (generates a risk finding) |
| N/A | Not applicable to this workload (requires written justification) |
| Question not applicable | Skip the entire question (requires written justification) |

Example question under Reliability: "How do you use fault isolation to protect your workload?" This question covers whether you use multiple AZs, bulkhead patterns, cell-based architectures, and other isolation strategies. A "No" answer on multi-AZ for a production database generates an HRI. The tool shows the risk level of each question before you answer — you can see in advance which questions carry HRI weight.

Work through all pillars. Save progress as you go; you do not need to complete the review in a single session.

**Step 4: View the HRI Report and Improvement Plan**

After completing questions for all pillars, navigate to the "Improvement plan" tab. The tool displays:

| Section | What It Shows |
|---|---|
| Risk summary | Total HRI count and MRI count, broken down by pillar |
| HRI list | Each finding with: the best practice that is missing, description of the risk, link to AWS remediation documentation |
| Risk column | High or Medium designation for each finding |
| Improvement plan | Prioritized remediation list with estimated effort levels |

The improvement plan is exportable as a PDF. Use it to build your remediation roadmap: assign HRIs to engineering owners, estimate effort, and sequence work by severity and dependency.

**Step 5: Save a Milestone and Track Progress**

Before beginning remediation, save a milestone. Milestones capture a point-in-time snapshot of your workload's risk posture — they are your "before" baseline. After implementing improvements, return to the workload, update your answers to "Yes" for resolved findings, and save a new milestone. The Tool tracks HRI count across milestones, giving you an audit trail of architectural improvement that is valuable for stakeholder reporting, compliance documentation, and demonstrating progress over time.

**Step 6: Re-review on a Cadence**

The Well-Architected Tool supports ongoing, iterative use. Most organizations schedule workload re-reviews annually or after significant architectural changes. The milestone history shows whether your workload is getting better or accumulating debt — which is precisely the kind of quantified, objective architectural health data that engineering leadership and boards of directors respond to.

## How to Decide

### How to Prioritize Remediation When HRIs Span Multiple Pillars

When a workload review surfaces HRIs across multiple pillars, use this sequence:

| Priority | Pillar | Scenario | Rationale |
|---|---|---|---|
| 1st | Security | Data exposure, access control gaps, no MFA on root, unencrypted sensitive data | Breaches are uniquely irreversible — stolen data cannot be "un-stolen" |
| 2nd | Reliability | No backups, no Multi-AZ for production databases, data loss risk | Data loss is also irreversible; protect it before addressing availability |
| 3rd | Reliability | Single points of failure, no auto-recovery, no health checks | Customer-visible outages affect revenue and trust |
| 4th | Operational Excellence | No IaC, no monitoring, no incident runbooks | Without OE foundations, fixing other pillars is slower and riskier |
| 5th | Performance Efficiency | Wrong instance types, no caching, suboptimal database queries | Performance affects UX but rarely causes catastrophic failure |
| 6th | Cost Optimization | Oversized instances, no Savings Plans, unused resources | Cost waste is recoverable; costly but not immediately harmful |
| 7th | Sustainability | Energy inefficiency, idle resources | Strategically important; rarely emergency-level |

**Exceptions:** If a Cost Optimization HRI represents extreme waste ($100K+/month), elevate it. If a regulatory audit deadline is approaching, prioritize Security and Reliability HRIs that affect compliance first.

### Which Lens to Select

| Workload Type | Apply These Lenses |
|---|---|
| All workloads | AWS Well-Architected Framework (always) |
| SaaS product | + SaaS Lens |
| Serverless-first architecture | + Serverless Lens |
| Data analytics / data lake | + Data Analytics Lens |
| Financial services | + Financial Services Industry Lens |
| Machine learning workloads | + Machine Learning Lens |
| Multiple categories | Apply all relevant lenses; review findings from each |

## How This Connects

- **AWS IAM and AWS Organizations** — the Security pillar's identity foundation; Organizations enables multi-account governance with Service Control Policies that the Well-Architected Tool can review across linked accounts, ensuring account-level guardrails are evaluated alongside individual resource configurations
- **Amazon CloudWatch and AWS CloudTrail** — provide the observability and audit logging that underpin both Operational Excellence (monitoring, alerting, post-mortems) and Security (traceability of every API action); many WAT questions on both pillars will ask whether these are enabled and configured comprehensively
- **AWS Auto Scaling and Amazon RDS Multi-AZ** — the core infrastructure patterns for implementing the Reliability pillar's automatic failure recovery principle; questions on the Reliability pillar in the WAT will ask directly whether your compute tier auto-scales and whether your database tier uses Multi-AZ
- **AWS Cost Explorer and AWS Trusted Advisor** — the primary tools for identifying Cost Optimization HRIs that the Well-Architected Tool surfaces; Trusted Advisor checks align closely with WAT questions on rightsizing, unused resources, and savings opportunities
- **AWS CloudFormation and AWS CDK** — the IaC tools that implement the Operational Excellence pillar's "perform operations as code" principle; WAT questions on OE ask whether all infrastructure is version-controlled and deployed through automation, which CloudFormation and CDK directly enable

## Exam Traps

**Trap 1: Confusing the Well-Architected Tool with a cost estimator.** The WAT is a risk assessment instrument — it identifies architectural gaps as HRIs and MRIs. It does not produce cost estimates. The AWS Pricing Calculator is for cost estimation; AWS Cost Explorer is for analyzing current spending. The WAT produces risk findings, not dollar amounts.

**Trap 2: Thinking the pillars are a checklist you complete once.** Workloads evolve. New AWS services create new options. New business requirements change acceptable trade-offs. The framework is designed for ongoing, iterative review — not a one-time compliance exercise. Exam questions may present "conduct a single Well-Architected review at launch" as a correct answer when the right answer is periodic, continuous review.

**Trap 3: Assuming higher availability always equals better architecture.** Each additional nine of availability has exponential cost and complexity. A personal blog does not need five-nines availability; designing for it would waste money and engineering time. The Well-Architected Framework teaches you to match reliability targets to actual business requirements, then engineer precisely to those targets — not to maximize every metric regardless of cost.

**Trap 4: Thinking the Sustainability pillar is optional or only for large enterprises.** Added in 2021, Sustainability is a full pillar, covered on the CLF-C02 exam. Every organization using AWS has a carbon footprint from their compute, storage, and data transfer. The pillar provides guidance for understanding and reducing it, and AWS certification exams test it alongside the other five pillars.

**Trap 5: Confusing HRIs with application bugs.** HRIs are architectural gaps — missing redundancy, absent encryption, no backup policy — not code defects. The Well-Architected Tool reviews architecture decisions, not application source code. This distinction matters for understanding what the tool can and cannot catch.

## Summary

- The AWS Well-Architected Framework organizes architectural best practices into six pillars — Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability — each addressing a distinct dimension of quality that every workload must consider, with explicit trade-offs expected between them.
- Shared design principles apply across all pillars: stop guessing capacity, test at production scale, automate experimentation, allow evolutionary architectures, drive decisions with data, and improve through game days — these are the behavioral commitments that make pillar-specific guidance achievable.
- The Well-Architected Tool (console.aws.amazon.com/wellarchitected) provides a free, guided workload review that generates prioritized HRIs and MRIs with remediation guidance; milestone tracking allows organizations to measure architectural improvement over time.
- Lenses extend the standard framework with domain-specific questions for SaaS, Serverless, Data Analytics, Financial Services, Machine Learning, and other specialized workload types — a SaaS lens review may surface 30–50 findings that the standard review would never ask about.
- HRIs should be triaged by consequence: Security and data-loss Reliability HRIs first, then availability Reliability, then Operational Excellence foundations, then Performance Efficiency, then Cost Optimization, then Sustainability.
- The Well-Architected Framework is not a one-time compliance exercise; internalizing the pillars as a continuous design philosophy — where every architectural decision is evaluated against all six dimensions — prevents architectural debt from accumulating between formal reviews.

## Examples

**Beginner:** A small startup building their first AWS-hosted application uses the Well-Architected Tool before their beta launch. After defining their workload and completing the pillar questionnaire, the tool flags three HRIs: no automated database backups (Reliability), application secrets stored as plaintext environment variables instead of AWS Secrets Manager (Security), and no CloudWatch alarms configured for any resource (Operational Excellence). None of these are complex to fix. But without the structured review, all three would have gone unnoticed until a real incident forced them to the surface. The Tool's value at this stage is systematic completeness — it asks about architectural dimensions the team was not thinking about.

**Intermediate:** A mid-sized SaaS company applies both the standard lens and the SaaS Lens to their five production workloads on a quarterly review cadence. After Q1's review, the SaaS lens surfaces an MRI about tenant data isolation: their multi-tenant data separation is enforced in application code rather than at the database layer, creating a theoretical data leakage risk if a bug is introduced in the tenant-routing logic. This finding would not have appeared in a standard review — only the SaaS lens asks about it. The team addresses it by implementing RDS Row-Level Security, converting the MRI to a resolved finding before Q2's review. The domain lens earns its value by surfacing the exact risk category most relevant to their architecture.

**Advanced:** A financial services firm with 40 workloads across six AWS accounts implements a formal Well-Architected governance program. Every new workload requires a Well-Architected review using both the standard lens and the Financial Services Industry Lens before moving to production. The firm exports milestone data from the Tool into an internal dashboard that tracks total HRI count by pillar and account over time. Architecture board meetings use this dashboard as a health scorecard — teams with unresolved HRIs older than 90 days are required to present a written remediation plan with committed dates. This programmatic approach converts the framework from a guidance document into an organizational accountability mechanism, precisely what AWS recommends for enterprises operating at scale.

## Think About It

1. The framework was built by distilling patterns from tens of thousands of customer architecture reviews. Why might that bottom-up, empirical approach produce better guidance than a small panel of experts reasoning from first principles — and what kinds of knowledge might it still miss?
2. The six pillars create genuine trade-offs — adding redundancy for Reliability raises costs (Cost Optimization tension). How would you decide which pillar to prioritize when trade-offs are unavoidable, and what information would you need to make that decision well?
3. The Well-Architected Tool produces HRIs and MRIs, but the same finding might be a critical emergency for one organization and an acceptable accepted risk for another. What factors determine whether a given HRI requires immediate remediation or can be deferred?
4. Why might it be valuable to run a Well-Architected review on a workload that has been running smoothly in production for two years — rather than only using the framework for new designs?
5. What is the concrete difference between using the framework as a compliance checkbox (answering questions to get a clean report) versus genuinely internalizing it as a design philosophy? What would each approach look like in your day-to-day architectural decisions?

## Quick Check

**Q1.** A company completes a Well-Architected Tool review and receives findings across multiple pillars. Which type of finding should they prioritize addressing first?

- A) Medium Risk Issues in the Cost Optimization pillar
- B) High Risk Issues, triaged by consequence severity — Security and data-loss Reliability HRIs first
- C) All Operational Excellence findings, since this pillar affects all others
- D) Findings in the most recently added pillar (Sustainability)

**Answer: B** — HRIs represent the most significant architectural gaps and must be addressed before MRIs. Among HRIs, triage by consequence: Security HRIs and data-loss Reliability HRIs carry the highest potential impact (both involve potentially irreversible harm) and should be resolved first.

**Q2.** What is the primary purpose of lenses in the AWS Well-Architected Tool?

- A) To apply cost discounts to specific workload types
- B) To extend the standard framework with domain-specific questions and guidance for particular industries or workload types
- C) To reduce the total number of review questions for simpler workloads
- D) To generate compliance certifications for regulated industries

**Answer: B** — Lenses add domain-specific questions (for SaaS, Serverless, Financial Services, Data Analytics, ML, etc.) on top of the standard six-pillar questionnaire, surfacing industry-specific risks that the general framework does not cover. They do not reduce questions, discount costs, or generate certifications.

**Q3.** Which statement correctly describes a tension between two Well-Architected pillars?

- A) The Security pillar and the Cost Optimization pillar never conflict — security controls are always free to implement
- B) Adding Multi-AZ redundancy improves Reliability but increases cost, representing a genuine trade-off with Cost Optimization
- C) The Sustainability pillar contradicts Performance Efficiency because efficient compute always uses more energy
- D) Operational Excellence conflicts with Reliability because CI/CD automation introduces more failure modes than manual deployments

**Answer: B** — Multi-AZ deployments require running duplicate infrastructure in a second Availability Zone, roughly doubling the cost of stateful resources like RDS. This is the most commonly cited pillar tension — more reliability costs more money, and the trade-off must be made deliberately and documented explicitly.

## What's Next

The next six lessons go deep on each pillar in sequence, starting with Operational Excellence — covering the specific AWS services, design patterns, and configuration decisions that implement each pillar's principles in real architectures.

---
