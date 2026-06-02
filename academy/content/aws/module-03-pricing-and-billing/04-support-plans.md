---
title: "AWS Support Plans"
type: lesson
estimated_minutes: 22
cert_tags: ["aws_ccp", "aws_clf_c02"]
---

## Overview

AWS offers five support plan tiers — Basic, Developer, Business, Enterprise On-Ramp, and Enterprise — each providing escalating levels of technical guidance, response time guarantees, account management, and proactive advisory services. Every AWS account includes Basic Support at no cost from the moment it is created. The paid tiers add capabilities specifically designed for organizations that have made a business commitment to running production workloads on AWS and need guaranteed access to expert help when things go wrong at 2 a.m. on a holiday weekend.

Support plans exist because cloud infrastructure failures do not follow business hours. When a production database becomes unreachable, when an application begins returning errors to real customers, or when a misconfigured security group exposes a resource to the internet, the business consequence grows every minute the issue persists. AWS structured its support tiers to match this risk curve: the more critical your workload's uptime is to your business, the more robust a support commitment you need. The difference between a 1-hour response SLA and a next-business-day email is not a luxury distinction — for a company losing thousands of dollars per minute during an outage, it is an architectural decision with real financial consequences.

For the CLF-C02 exam, support plans are a recurring topic with specific, testable answers. Expect questions about: response time SLAs for each severity level at each plan tier, which plan tier first enables 24/7 phone access, what a Technical Account Manager (TAM) does and which tiers include TAM access, how many Trusted Advisor checks are available on each tier, and the pricing structure. This lesson covers every plan in detail, walks through the Support Center console and Trusted Advisor dashboard, explains the feature differentiators at each tier, and gives you a decision framework for choosing the right plan for any organizational context the exam presents.

## Core Concepts

### Basic Support: What Every Account Gets for Free

Every AWS account includes Basic Support at no cost, regardless of how much or how little you spend on AWS. Basic Support is not merely a placeholder — it includes real resources that serve genuine operational needs for accounts running non-production or personal workloads.

Basic Support includes: 24/7 access to customer service for account and billing questions (not technical support — this covers questions like "why does my bill show this charge?" or "how do I close my account?"), the complete AWS documentation library and technical whitepapers, access to AWS re:Post (the community question-and-answer forum where AWS engineers and experienced practitioners answer technical questions about common configuration issues), AWS Trusted Advisor with exactly 7 core checks covering critical security and service limit items, and the AWS Health Dashboard for notifications about service events and scheduled maintenance affecting your account.

Basic Support does NOT include the ability to contact AWS Support Engineers for technical questions about your architecture, code, or service behavior. If your Lambda function is failing and you need a human expert to help debug it, you need at minimum Developer Support. The "24/7 customer service" in Basic covers billing and account management only — not technical troubleshooting. The 7 Trusted Advisor checks available on Basic are: S3 Bucket Permissions (public access flags), Security Groups - Specific Ports Unrestricted (SSH/RDP exposure), IAM Use (root account overuse), MFA on Root Account, EBS Public Snapshots, RDS Public Snapshots, and Service Limits. These are fixed and enumerated — no cost optimization, no performance, no fault tolerance checks on this tier.

### Developer Support: The First Paid Tier

Developer Support is priced at the greater of $29 per month or 3% of your monthly AWS charges. It is the first tier that enables contact with AWS's technical engineers, specifically Cloud Support Associates who handle general guidance and common configuration issues during business hours.

The reason Developer Support exists at this price point is to serve the segment of AWS customers who are building, learning, or running non-production workloads where a same-day or next-business-day response is acceptable and overnight downtime carries no revenue consequence. Developer Support is explicitly designed for development environments, learning projects, side projects, and exploratory workloads — not for production applications serving real users. If your workload generates revenue, receives customer traffic, or has any SLA obligation to an external party, Developer Support is inadequate by AWS's own guidance.

Key limitations of Developer Support: email only (no phone, no chat), business hours only (no after-hours coverage), and Cloud Support Associates rather than the full Cloud Support Engineers unlocked at Business tier. Response time SLAs: general guidance questions receive a response within 24 business hours; system impaired cases (something is degraded but operational) receive a response within 12 business hours. There is no "production system down" SLA because Developer Support is explicitly not intended for production use. Trusted Advisor access is identical to Basic — still only the 7 core checks.

### Business Support: The Minimum for Production Workloads

Business Support is priced at the greater of $100 per month or a tiered percentage of monthly AWS charges: 10% of the first $10,000, 7% of the next $80,000, and 5% of any usage above $90,000. For an account spending $5,000/month, Business Support costs $500/month. For an account spending $100,000/month, it costs approximately $6,500/month at the tiered rates.

AWS explicitly describes Business Support as the minimum recommended tier for production workloads, and the feature set justifies that positioning. The most critical additions over Developer Support: 24/7 phone, chat, and email access to Cloud Support Engineers (not Associates — full Engineers, available at any hour including holidays and weekends), full access to all 535+ AWS Trusted Advisor checks across all five categories (Cost Optimization, Performance, Security, Fault Tolerance, and Service Limits), access to the AWS Support API for programmatic case management (integrating AWS cases into ServiceNow or Jira workflows), third-party software support guidance for common stacks running on AWS (LAMP, SQL Server on EC2, Oracle on EC2), and Infrastructure Event Management (IEM) available as a paid add-on for planned large-scale events. The response time SLAs are: general guidance 24 hours, system impaired 12 hours, production system impaired 4 hours, and production system down 1 hour. The 1-hour SLA for production system down is the single most important threshold separating Business from Developer, and it is directly tested on the CLF-C02 exam.

### Enterprise On-Ramp: Entry-Level Enterprise Support

Enterprise On-Ramp is priced at a minimum of $5,500 per month (or the applicable percentage of AWS charges, whichever is greater). It bridges the gap between Business Support and full Enterprise for organizations whose workloads have grown to require enterprise-grade support capabilities but whose spend or organizational maturity may not yet justify the full Enterprise commitment.

Enterprise On-Ramp's key additions over Business Support: access to a pool of Technical Account Managers (TAMs) — you are assigned a primary TAM who knows your account and serves as your internal AWS advocate, but that TAM serves multiple Enterprise On-Ramp customers simultaneously (shared, not dedicated); the Concierge Support Team, which handles complex billing and account-level questions beyond standard customer service, particularly valuable for organizations with consolidated billing arrangements or significant billing disputes; and a business-critical system down response SLA of 30 minutes, a meaningful improvement over Business Support's 1-hour SLA for the most severe incident category.

The 30-minute critical response SLA is worth understanding in operational terms. For a business where each minute of outage has measurable revenue impact — an e-commerce platform during a sale, a payment processor, a trading system — the gap between 30-minute and 1-hour initial response is not abstract. It represents 30 fewer minutes before the first AWS expert is actively engaged on your problem, during which your team is working blind. That gap has a quantifiable cost for any business with meaningful transaction volume.

### Enterprise Support: Dedicated Partnership for Mission-Critical Operations

Enterprise Support is priced at a minimum of $15,000 per month. It is designed for organizations whose AWS workloads are mission-critical — where an outage triggers immediate, severe, and potentially board-level consequences for the business.

Enterprise Support's key additions over Enterprise On-Ramp: a dedicated Technical Account Manager — a named individual assigned exclusively to your account, not shared with any other customer, who knows your architecture end-to-end, attends your quarterly architecture reviews, proactively identifies risks before they become incidents, and provides a direct escalation path inside AWS service teams; proactive architecture reviews where the TAM evaluates your deployment against AWS best practices and identifies gaps; Infrastructure Event Management included at no additional fee (for planned large-scale events like product launches, Black Friday campaigns, or migration cutover weekends); Well-Architected Review facilitation; and a business-critical system down response SLA of 15 minutes.

The dedicated TAM is the defining differentiator between Enterprise and Enterprise On-Ramp. A TAM is not a support engineer who answers tickets faster — a TAM is a proactive strategic partner. The value of a TAM is measured not in incident response speed but in the number of incidents that never occur because the TAM identified the risk proactively. A TAM who reviews your architecture and finds a misconfigured Auto Scaling policy three weeks before a planned product launch has delivered more value in that one conversation than any number of faster ticket responses during an actual outage. This proactive-vs-reactive distinction is a key conceptual test on the CLF-C02 exam.

### Trusted Advisor: 7 Checks vs. 535+ Checks

AWS Trusted Advisor automatically evaluates your account against best practices across five categories: Cost Optimization, Performance, Security, Fault Tolerance, and Service Limits. It surfaces actionable, specific findings: "this S3 bucket has public read access," "this EC2 instance has run at under 5% CPU for 14 days at a cost of $67/month," "you have 3 security groups allowing unrestricted RDP from 0.0.0.0/0."

On Basic and Developer Support, Trusted Advisor provides only the 7 core checks, all of which fall within Security and Service Limits. The Cost Optimization, Performance, and Fault Tolerance categories are entirely locked — you see the category headings but all checks within them are unavailable. On Business Support and above, all 535+ checks across all five categories are active. The gap is the most significant feature differential in the support plan ladder. Without Business Support, you have zero automated visibility into idle EC2 instances burning money, single-AZ database deployments that cannot survive an availability zone failure, CloudFront distributions missing caching headers that are driving up origin costs, or Route 53 records pointing to deleted resources. These findings carry real operational and financial weight for any mature deployment — which is why the Business Support upgrade decision is often self-funding. The cost optimization checks alone frequently surface monthly savings that exceed the support plan's monthly cost within the first billing cycle.

## Configuration Reference

### Navigating the AWS Support Center Console

**Step 1: Open the Support Center.** Sign in to the AWS Management Console. In the top navigation bar, click the question-mark icon (?) and select "Support Center" from the dropdown menu. Alternatively, type "Support" in the search bar at the top of the console and select "AWS Support Center." The Support Center dashboard opens showing a summary panel at the top with current open cases, any active service events affecting your account, and links to documentation and re:Post.

**Step 2: Initiate a new case.** Click the orange "Create case" button in the upper right. The case creation screen presents three category tiles: "Account and billing" (for non-technical questions about your account, invoices, payments, credits, refunds, or billing disputes — available on all plans including Basic), "Service limit increase" (to request higher service quotas — available on all plans), and "Technical" (for questions about AWS services, troubleshooting active issues, or getting architectural guidance — requires Developer Support or above). Select the appropriate category for your situation.

**Step 3: Configure a technical case.** When you select "Technical," a form populates with: a Service dropdown (select the affected AWS service — e.g., "Amazon EC2"), a Category dropdown (select the type of issue — e.g., "Instance Connectivity," "Instance Performance," "API / CLI Issues"), and the Severity selector. The severity levels you see depend on your support plan. On Developer Support, only "General guidance" and "System impaired" are available. On Business Support, the list adds "Production system impaired" and "Production system down." On Enterprise On-Ramp and Enterprise, "Business/mission-critical system down" appears as the highest tier. The severity you select determines your SLA — always set the highest severity that accurately and honestly reflects your situation.

**Step 4: Write an effective case description.** In the description field, provide: the resource IDs of affected resources (instance IDs like i-0a3b2c4d5e, function ARNs, bucket names), the exact error messages or error codes with no paraphrasing — copy the raw output, a timeline of when the issue started and what changed immediately before it began, what you have already tried and what those attempts produced, and your infrastructure context (Region, availability zone, recent deployments, recent configuration changes). A precise, detailed description yields a substantive initial response rather than an opening clarifying question that consumes hours of your SLA window. The first response sets the entire trajectory of the case.

**Step 5: Select your contact method.** On Developer Support, only email is available. On Business Support and above, you choose from email, chat, or phone. For a case filed at "production system down" severity, always select phone — submitting a phone-priority production outage case via email adds delay that defeats the purpose of the 1-hour SLA. Enter your phone number and preferred callback time (immediately, in 30 minutes, etc.) and submit. The case number appears on screen and is emailed to you.

**Step 6: Reviewing the Severity SLA table.** At the bottom of the case creation screen, a table shows the response time SLAs for each severity level at your current plan tier. Review this table carefully as you set severity — it clarifies exactly what you're committing to and what AWS is committing to. Understanding the SLA table is also direct exam preparation. The numbers to memorize: Developer has no production severity levels. Business gives 4-hour response for production impaired and 1-hour for production down. Enterprise On-Ramp gives 30 minutes for critical. Enterprise gives 15 minutes for critical.

### Exploring the Trusted Advisor Dashboard

**Step 1: Open Trusted Advisor.** In the AWS Management Console, type "Trusted Advisor" in the search bar and select it. The Trusted Advisor dashboard opens with a summary panel at the top showing a high-level status across all five categories. Each category displays a colored status: green (all checks passing), yellow (investigation recommended — findings present but not urgent), red (action recommended — findings require attention). The summary counts at the top give you a rapid operational overview without opening individual checks.

**Step 2: The view on Basic vs. Business Support.** This step requires you to understand what you will and will not see depending on your plan tier. On Basic or Developer Support, when you expand the Cost Optimization category, the section renders as a grayed-out panel with a lock icon and an "Upgrade to Business Support" message in place of actual check results. The same occurs for Performance, Fault Tolerance, and most Security checks. Only the 7 core checks described in the Core Concepts section above are populated with actual data. On Business Support, all five categories are fully populated, and the difference in the volume of information is immediate and stark. A medium-sized Business Support account that has been running for three or four months will typically show 15–30 actionable Cost Optimization findings and another 10–20 Security findings when you first enable the full Trusted Advisor view.

**Step 3: Open a specific check finding.** Click any check listed within a category. The detail view for that check shows three things: a description of what the check evaluates and why it matters (a short explanation of the risk or savings opportunity), a table of specific resources that triggered the finding with their IDs, Regions, and the relevant metrics that caused the flag, and a recommended action with a link to the relevant documentation. For example, clicking a Cost Optimization finding for an idle EC2 instance shows: the instance ID, the Region and availability zone, the instance type and current monthly cost, the average CPU utilization over the past 14 days (from CloudWatch), and a calculated estimate of monthly savings from stopping or terminating the instance. This is specific, actionable data tied to real resource identifiers — not a generic recommendation.

**Step 4: Act on a finding or exclude it.** For each flagged resource within a check, two action paths exist. First, take the recommended action: stop the idle EC2 instance, restrict the overly permissive security group, enable versioning on the unprotected S3 bucket, add a second AZ to the single-AZ RDS deployment. Second, click "Exclude item" to mark the finding as a known, intentional configuration that should no longer surface as an active finding. Exclusions are appropriate when a finding represents a deliberate architectural choice that appears non-standard by the check's criteria but is correct for your specific situation. For example, a security group allowing port 443 from 0.0.0.0/0 is technically a Trusted Advisor flag but is entirely correct for a public-facing HTTPS load balancer. Excluding it removes the noise without hiding a real risk.

**Step 5: Configure weekly email notifications.** In the left navigation panel within Trusted Advisor, click "Preferences." The Preferences screen lets you configure automated weekly summary emails. You select which check categories to include (Cost Optimization, Performance, Security, Fault Tolerance, Service Limits), enter one or more recipient email addresses, and choose the preferred day for delivery. Enabling these weekly emails is a low-friction way to ensure that new findings introduced by resource changes during the week get reviewed without requiring anyone to log in to Trusted Advisor proactively. Operationally, Trusted Advisor's value is only realized if someone reads and acts on the findings — the weekly email ensures the dashboard is not ignored.

**Step 6: Refresh a check manually.** Each Trusted Advisor check runs on a refresh cycle — typically every 24 hours. If you have taken a remediation action (for example, restricting a security group) and want to verify the finding is resolved before the next automatic refresh, click the circular refresh icon next to the check name. Manual refresh triggers a rerun of that check against the current account state. When the check confirms the issue is resolved, the resource disappears from the finding list and the check status may change from yellow or red to green.

## How to Decide

Use this framework to select the appropriate support plan for your organizational context:

| Scenario | Recommended Plan | Key Rationale |
|---|---|---|
| Personal account, learning, exam prep | Basic | No production risk; documentation and re:Post solve most questions |
| Side project, non-production sandbox | Developer | Email access to engineers for guidance; acceptable response time for non-urgent use |
| First production app serving real users | Business (minimum) | 24/7 phone/chat, 1-hour critical SLA, full Trusted Advisor |
| Startup at $2K–$5K/month in development | Developer now, Business before first production user | Stage-appropriate cost; Business is required before any production traffic |
| Multiple production workloads, revenue at risk | Business | Full coverage; upgrade when TAM value and 30-minute SLA justify added cost |
| $100K+/year AWS spend, significant production risk | Business or Enterprise On-Ramp | Evaluate whether shared TAM and 30-minute SLA justify $5,500/month minimum |
| Mission-critical systems — downtime = immediate significant revenue loss | Enterprise On-Ramp or Enterprise | 30-minute (On-Ramp) or 15-minute (Enterprise) critical SLA |
| Large deployment, planned major events, board-level cloud strategy | Enterprise | Dedicated TAM, IEM included, proactive reviews, 15-minute critical SLA |

**Feature comparison at a glance:**

| Feature | Basic | Developer | Business | Ent. On-Ramp | Enterprise |
|---|---|---|---|---|---|
| Price | Free | $29/mo or 3% | $100/mo or 10/7/5% | $5,500/mo min | $15,000/mo min |
| Technical support channel | None | Email (business hours) | Phone/chat/email 24/7 | Phone/chat/email 24/7 | Phone/chat/email 24/7 |
| Number of contacts | N/A | 1 | Unlimited | Unlimited | Unlimited |
| General guidance SLA | N/A | 24 business hours | 24 hours | 24 hours | 24 hours |
| System impaired SLA | N/A | 12 business hours | 12 hours | 12 hours | 12 hours |
| Production system impaired SLA | N/A | N/A | 4 hours | 4 hours | 4 hours |
| Production system down SLA | N/A | N/A | 1 hour | 1 hour | 1 hour |
| Critical/business-critical down SLA | N/A | N/A | N/A | 30 minutes | 15 minutes |
| Trusted Advisor | 7 checks | 7 checks | 535+ checks | 535+ checks | 535+ checks |
| Technical Account Manager | No | No | No | Pooled TAM | Dedicated TAM |
| Concierge Support | No | No | No | Yes | Yes |
| Infrastructure Event Management | No | No | Fee-based | Fee-based | Included |

## How This Connects

- **AWS Trusted Advisor** is the most direct feature coupled to support plan tier — upgrading from Developer to Business Support unlocks 528 additional automated checks across cost optimization, performance, security, and fault tolerance. The cost optimization checks alone frequently surface monthly savings that exceed the Business plan cost within the first billing cycle.
- **AWS Health Dashboard** is available at all support tiers, but Business and above accounts receive account-specific event notifications scoped to the services and resources actually in your account, rather than service-wide general announcements that may or may not affect your specific workload.
- **IAM and security governance** benefit directly from full Trusted Advisor security checks at Business and above — automated detection of overly permissive security groups, publicly exposed S3 buckets, unrotated IAM access keys, and missing root MFA that the 7-check Basic tier does not surface.
- **AWS Cost Explorer and AWS Budgets** complement Trusted Advisor's cost findings — Trusted Advisor identifies idle and underutilized resources, Cost Explorer provides the historical utilization data to validate those findings, and Budgets provides proactive spend alerting. Together they form a complete cost governance practice that no single tool delivers alone.
- **The Well-Architected Framework** is most operationally valuable for organizations with Enterprise Support, where the dedicated TAM facilitates formal Well-Architected Reviews — structured evaluations of your architecture against the five pillars (Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization) with AWS guidance and recommendations to address identified gaps.

## Exam Traps

**Trap 1: Confusing the 7 core checks with any full Trusted Advisor access.** Basic and Developer Support provide exactly 7 Trusted Advisor checks — all in Security and Service Limits. The Cost Optimization, Performance, and Fault Tolerance categories are entirely unavailable, not just reduced. Full 535+ check access unlocks only at Business Support and above. Exam questions that mention "full Trusted Advisor" or "all Trusted Advisor checks" are referring to Business or higher.

**Trap 2: Assuming Developer Support provides 24/7 technical access.** Developer Support provides email-only access to Cloud Support Associates during business hours only. There is no phone, no chat, and no after-hours technical coverage. A production outage that begins at 11 p.m. on Developer Support waits until the next business morning for an email response. The CLF-C02 exam frequently tests this: "which plan provides 24/7 access to AWS engineers via phone?" — the answer is Business, not Developer.

**Trap 3: Confusing pooled TAM vs. dedicated TAM.** Enterprise On-Ramp includes access to a pool of TAMs — you have a primary TAM who manages your relationship, but that TAM is shared across multiple Enterprise On-Ramp customers. Enterprise Support includes a dedicated TAM assigned exclusively to your account who serves no other customers. CLF-C02 questions specifying "a dedicated Technical Account Manager" are describing Enterprise support. Questions mentioning "a pool of TAMs" are describing Enterprise On-Ramp.

**Trap 4: Misremembering the critical SLA numbers.** The exam-critical SLA values: Business gives 1-hour response for production system down. Enterprise On-Ramp gives 30 minutes for business-critical system down. Enterprise gives 15 minutes. These appear directly in CLF-C02 scenario questions. Memorize them in sequence: 1 hour → 30 minutes → 15 minutes as you move from Business to On-Ramp to Enterprise.

**Trap 5: Thinking the TAM's primary value is faster ticket resolution.** The exam sometimes frames a scenario where a company wants a proactive advisor to help them avoid problems — not just respond to them faster. That scenario describes a TAM's value. A TAM is not a support engineer with a priority queue — a TAM is an architect and advisor who builds a relationship with your account, proactively identifies risks during regular reviews, and coordinates specialized AWS resources before incidents occur. If the question asks about "proactive guidance" or "preventing issues before they become incidents," the answer involves a TAM, which means Enterprise On-Ramp or Enterprise support.

## Summary

- AWS offers five support plans: Basic (free), Developer ($29/month minimum), Business ($100/month minimum), Enterprise On-Ramp ($5,500/month minimum), and Enterprise ($15,000/month minimum), each tier adding capabilities over the previous.
- Basic Support provides 7 Trusted Advisor checks, documentation, re:Post, and billing customer service only — no access to AWS technical engineers for troubleshooting or guidance.
- Business Support is the minimum recommended tier for any production workload: 24/7 phone, chat, and email access to Cloud Support Engineers, full 535+ Trusted Advisor checks across all five categories, and a 1-hour SLA for production system down.
- Enterprise On-Ramp adds a pooled Technical Account Manager, the Concierge Support Team, and a 30-minute critical response SLA; Enterprise adds a dedicated TAM, included Infrastructure Event Management, and a 15-minute critical SLA.
- The dedicated TAM is the defining feature of Enterprise Support — a proactive strategic partner who identifies architectural risks before they become incidents, facilitates Well-Architected Reviews, coordinates specialized AWS resources for complex problems, and provides direct escalation into AWS service engineering teams.
- For the CLF-C02 exam: memorize the SLAs (1 hour / 30 minutes / 15 minutes for critical at Business / On-Ramp / Enterprise), know which plan unlocks full Trusted Advisor (Business), and know the distinction between pooled and dedicated TAMs (On-Ramp vs. Enterprise).

## Examples

A solo developer builds a personal finance tracking side project on AWS Lambda, DynamoDB, and S3. Their total monthly AWS bill is approximately $11. They occasionally have configuration questions that the AWS documentation and re:Post community answer within a few hours. Basic Support costs nothing and fully meets their needs. Upgrading to Developer Support would cost $29 per month on top of an $11 bill — a 260% increase in total cloud cost for a side project with no paying users, no SLA obligation, and no business consequence if something is broken for a day. For this use case, Basic is the correct answer and any upgrade is waste.

A regional e-commerce company runs its shopping platform on EC2, RDS, ElastiCache, and S3. They process orders around the clock with peak traffic on weekday evenings. On a Tuesday at 8:47 p.m., a deployment misconfiguration causes their checkout API to return 500 errors for all users — no orders can be placed. The on-call engineer opens Support Center, creates a case at "Production system down" severity, selects phone contact, and receives a call from an AWS Cloud Support Engineer at 9:19 p.m. — 32 minutes later, within the 1-hour Business Support SLA. The engineer identifies the root cause in 11 minutes: a recent API Gateway stage deployment mapped to the wrong Lambda version alias. Orders resume at 9:43 p.m. — 56 minutes after the incident began. Had the company been on Developer Support, the same case would have waited until the next business morning for an email response. The checkout system would have been unavailable for 10+ hours overnight with full revenue and reputational consequences. The Business Support plan cost for that month was recovered within the first 20 minutes of the prevented extended outage.

A global fintech company processes payment transactions at scale and is subject to PCI-DSS compliance requirements. Their CTO approves an upgrade to Enterprise Support before a planned geographic expansion into four new markets. AWS assigns them a dedicated TAM who joins their quarterly architecture reviews and bi-weekly operational readiness calls. Eight weeks before the expansion launch date, the TAM reviews the multi-Region deployment design during a regular check-in and identifies a critical asymmetry: the primary Region has Auto Scaling configured correctly, but the disaster-recovery Region has a minimum instance count of zero, meaning a failover would require cold-start scaling from nothing — adding three to five minutes of customer-visible unavailability during an already-stressful incident. The TAM escalates the finding to the platform team and connects them with a specialized solutions architect for a targeted Well-Architected Review. The configuration is corrected before launch. Six weeks post-launch, the primary Region experiences a two-hour partial degradation event. Traffic fails over to the secondary Region in under 40 seconds with no transaction loss and no compliance event requiring regulatory notification. The TAM's value was not faster incident response — it was the incident that never happened because the risk was caught and corrected three weeks before it could become an outage.

## Think About It

1. Business Support costs $100/month minimum or 10% of your monthly AWS charges, whichever is greater. An account spending $8,000/month pays $800/month in support — 10% of infrastructure cost. How would you frame the business case for this expense to a CFO who views it as an overhead line item? What specific risks would you quantify, and how would you calculate the financial exposure of going without it?

2. The dedicated TAM in Enterprise Support is described as a "proactive strategic partner" rather than a reactive support engineer. What specific categories of problems at large-scale AWS deployments is a TAM uniquely positioned to address — and what does that tell you about where the real operational risk lives in cloud-scale architectures as compared to traditional on-premises data center operations?

3. Trusted Advisor provides 7 security checks on Basic Support and 535+ checks on Business and above. If your organization cannot afford to upgrade from Basic Support and therefore cannot see Cost Optimization or Fault Tolerance checks, what alternative AWS services, internal processes, or third-party tools would you build to fill those gaps in automated best-practice monitoring?

4. AWS support plan SLAs define initial response time, not resolution time. If your production system has been down for two hours and your Business Support case received its first contact within the 1-hour SLA (which AWS met), what other simultaneous actions should your team be executing — and why should the support plan response never be your only incident response strategy?

5. You are advising a startup that is four months from its first public launch and currently spending $3,000/month on AWS in development. They plan to go live with 5,000 users on day one and generate revenue from day two. Which support plan would you recommend today, which plan should they upgrade to before launch, and how far in advance should the upgrade happen so the team knows the support channels — and has a TAM relationship if needed — before they urgently require them?

## Quick Check

**Q1.** A company runs a production application that generates revenue 24 hours a day, 7 days a week. They need the ability to call AWS by phone at 3 a.m. and reach a Cloud Support Engineer if a critical outage occurs. What is the minimum support plan that provides this capability?

- A) Basic
- B) Developer
- C) Business
- D) Enterprise On-Ramp

**Answer: C — Business Support** is the first tier to include 24/7 access to Cloud Support Engineers via phone, chat, and email. Basic includes no technical support access at all. Developer includes email-only access during business hours — no phone, no after-hours coverage, no Cloud Support Engineers. Enterprise On-Ramp and Enterprise also provide this capability, but Business is the minimum and lowest-cost plan that satisfies the stated requirement.

---

**Q2.** Which AWS support plan feature provides automated best-practice checks across 535+ items covering cost optimization, performance, security, fault tolerance, and service limits?

- A) AWS Health Dashboard — available on all plans
- B) AWS Trusted Advisor full checks — available on Business Support and above
- C) AWS Trusted Advisor core checks — available on all plans including Basic
- D) AWS Cost Explorer recommendations — available on all plans

**Answer: B — Full AWS Trusted Advisor** (535+ checks across all five categories) is unlocked at Business Support and above. Basic and Developer provide only the 7 core checks in Security and Service Limits — Cost Optimization, Performance, and Fault Tolerance are entirely locked. The AWS Health Dashboard (A) monitors service-level events, not account-level best practice adherence. Cost Explorer (D) provides cost-specific recommendations but not the cross-category automated best-practice evaluation Trusted Advisor performs.

---

**Q3.** What is the guaranteed initial response time for a "production system down" case filed on AWS Business Support?

- A) 15 minutes
- B) 30 minutes
- C) 1 hour
- D) 4 hours

**Answer: C — 1 hour** is the Business Support SLA for production system down severity. 15 minutes is the Enterprise Support SLA for business-critical system down. 30 minutes is the Enterprise On-Ramp SLA for business-critical system down. 4 hours is the Business Support SLA for "production system impaired" — one severity level below production system down — which is a common exam distractor.

## What's Next

Next: the five AWS cost management tools in detail — Cost Explorer for historical analysis and forecasting, AWS Budgets for proactive threshold alerting and automated enforcement, Cost Anomaly Detection for ML-based spend pattern monitoring, the AWS Pricing Calculator for pre-build architecture estimation, and the Cost and Usage Report for granular line-item billing data queryable at scale.
