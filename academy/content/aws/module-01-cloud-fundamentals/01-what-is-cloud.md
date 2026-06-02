---
title: "What Is Cloud Computing?"
type: content
estimated_minutes: 18
cert_tags: ["aws_ccp", "clf-c02"]
---

# What Is Cloud Computing?

## Overview

Cloud computing is the on-demand delivery of IT resources — compute power, storage, databases, networking, analytics, machine learning, and more — over the internet, with pay-as-you-go pricing. Instead of buying, owning, and maintaining physical servers and data centers, you access the technology you need from a cloud provider like Amazon Web Services, use it for as long as you need it, and stop paying the moment you stop using it. Think of it like electricity: you don't build a power plant to light your house — you plug into a shared grid and pay only for the kilowatt-hours you consume. Cloud computing applies the same logic to every layer of the technology stack.

Cloud computing exists because it solves a deep and expensive problem called the capacity mismatch. Before cloud, every company that needed computing power had to predict their peak demand months or years ahead, purchase hardware for that peak, install it in a data center, and then watch most of it sit idle the rest of the time. A retailer buying servers to handle Black Friday traffic would run those servers at 10% utilization for 50 weeks a year. The hardware didn't get cheaper or smaller during those idle weeks — it just silently wasted capital. Cloud computing flips this equation: you pay only for what you consume, scale up instantly when demand spikes, and scale back down when it drops. This transforms IT from a high-stakes guessing game into a precise, metered utility where cost tracks actual usage.

For the AWS Cloud Practitioner exam (CLF-C02), cloud computing is the foundational concept that everything else builds on. The exam tests whether you understand not just what the cloud is, but why it was created, how it is formally defined by NIST, and what value it delivers to organizations. Questions about cloud characteristics, the CapEx-to-OpEx shift, and the origins of AWS all appear in the first domain — "Cloud Concepts" — which accounts for roughly 24% of your exam score. Beyond the exam, understanding cloud computing at this conceptual level makes you a more effective communicator when explaining technology decisions to non-technical stakeholders. The ability to explain *why* a technology exists — not just what it does — is the skill that separates early-career cloud practitioners who can own a conversation from those who can only answer technical questions.

## Core Concepts

### The Capacity Mismatch Problem

Before cloud computing existed, organizations faced a fundamental dilemma when planning IT infrastructure: they had to predict how much computing power they would need, and then purchase hardware for that prediction. The problem was that this prediction had to happen months or years in advance, because hardware procurement, data center buildout, and server configuration took that long. The delivery lead time on enterprise server hardware was measured in weeks. Physical installation and configuration added more weeks. By the time a server was ready to use, the business conditions it was procured for had often already changed.

If an organization predicted too low, their systems crashed or degraded under real-world load — potentially causing revenue loss, customer defections, and reputational damage. If they predicted too high — the far more common choice, because under-provisioning was more immediately visible — they paid for servers that sat idle for most of the year. This is the capacity mismatch problem: the gap between the peak capacity you must provision in advance and the average capacity you actually use.

The waste was enormous. Industry research has consistently found that on-premises data centers operate at 15–20% average utilization. This means a typical organization was paying 100% of the cost for hardware that delivered 15–20% of its potential value. Cloud computing eliminates this by allowing you to provision exactly the capacity you need, right when you need it, and release it the moment you don't. The utility model replaces the ownership model, and the capacity mismatch problem disappears.

### The NIST Five Essential Characteristics

The National Institute of Standards and Technology (NIST) is a U.S. federal agency that sets technology standards. In 2011, NIST published a formal definition of cloud computing built around five essential characteristics. These aren't marketing language — they are a technical checklist. Any service claiming to be "cloud" should satisfy all five. For the exam, you should be able to name all five, define each in one sentence, and recognize which characteristic a given scenario is illustrating.

**On-demand self-service** means you can provision resources — launch a server, create a database, allocate storage — without human interaction from the provider. You log into the AWS Console, click through a configuration wizard, and have a running server within minutes. No purchase order, no call to a sales team, no wait for an operations technician. The provisioning is entirely self-directed. This characteristic was a radical departure from traditional IT, where hardware requests went through procurement queues that routinely took weeks.

**Broad network access** means cloud resources are available over standard networks and accessible from any device using standard protocols (HTTPS, APIs, REST). You don't need a proprietary client, a dedicated leased line, or special hardware to access your cloud resources. A laptop on a home internet connection can provision and manage the same infrastructure as a corporate workstation on a private enterprise network. The internet is the delivery mechanism.

**Resource pooling** means the provider's computing resources serve multiple customers simultaneously using a multi-tenant model. The same physical server hardware may run virtual machines belonging to hundreds of different AWS customers at the same time. Each customer's resources are logically isolated from the others through virtualization — but the hardware is shared. This pooling is precisely what makes cloud economics work: it drives hardware utilization far higher than any single company could achieve alone, which is why cloud providers can offer lower per-unit costs than most organizations could achieve on their own.

**Rapid elasticity** means resources can be scaled up or down quickly — often automatically — to match changing demand. From the user's perspective, available capacity appears unlimited because you can always request more. In practice this means your application can handle a 10x traffic spike without manual intervention, as long as it's architected to scale. It also means you can scale back to near-zero when load drops, immediately stopping the cost of capacity you're not using.

**Measured service** means cloud usage is monitored, controlled, and reported transparently. Every API call, every gigabyte stored, every hour of compute time is metered. This metering is the technical foundation for pay-as-you-go billing — you pay only for what you actually consumed, and the provider can prove exactly what that was. Without measurement, you cannot have usage-based pricing; with measurement, billing becomes a precise accounting of actual consumption.

### The CapEx to OpEx Shift

CapEx stands for Capital Expenditure — money spent to acquire, upgrade, or maintain long-term physical assets. Buying servers, building a data center, purchasing networking hardware: all CapEx. The defining characteristics of CapEx: you spend a large amount of money upfront, before you know whether the investment will deliver its projected value; the asset appears on your balance sheet; and it depreciates over time (typically 3–5 years for servers), regardless of how much it gets used.

OpEx stands for Operational Expenditure — money spent on ongoing costs to run day-to-day operations, expensed in the period it's incurred. Cloud bills are OpEx: you pay monthly, based on what you used that month, and the expense shows up on that month's income statement. There is no asset on your balance sheet, no depreciation schedule, and no large upfront commitment.

This shift matters beyond accounting. CapEx forces you to be right about the future — you're committing to a capacity level before demand is known. If your startup fails after six months, you've still signed a three-year data center lease and bought servers that are now worthless to you. If your product succeeds beyond projections, you're capacity-constrained precisely when you need capacity most. OpEx lets you adjust continuously. Cost tracks reality rather than prediction.

The deeper implication: CapEx makes experimentation expensive. If running a failed experiment costs six months of idle hardware plus staff time, organizations naturally avoid experiments they're not already confident will succeed. This conservative posture is not laziness — it's rational economic behavior. OpEx changes the economics of experimentation. When a failed experiment costs two weeks of compute bills, organizations run more experiments, learn faster, and ultimately build better products.

### How AWS Was Born

Amazon's retail business has a pronounced seasonal pattern: enormous traffic during the holiday shopping season, substantially lower demand the rest of the year. To reliably handle holiday peak load, Amazon built and operated large-scale data center infrastructure — and that infrastructure ran at a fraction of capacity from January through October. Amazon's engineers recognized that the operational discipline, tooling, and infrastructure they'd built to manage this challenge at scale was itself enormously valuable.

In 2002, Amazon began exploring offering developer services externally. By 2006, they launched Amazon EC2 (Elastic Compute Cloud) and Amazon S3 (Simple Storage Service) — the first commercially available cloud infrastructure services at scale. Andy Jassy, who led the team, described it as making Amazon's internal infrastructure available as a utility to anyone who needed it.

This origin story explains something important about AWS's design philosophy. AWS was not built by a technology company trying to sell a product. It was built by a retailer solving its own operational problem, then recognizing the solution had universal value. The result was a service designed for real-world operational efficiency — one shaped by the hard lessons of running infrastructure at scale for millions of customers under genuine business pressure.

### What AWS Is Today

From two original services in 2006, AWS has grown to offer more than 200 fully featured services spanning compute, storage, databases, networking, analytics, machine learning, security, developer tools, IoT, and more. AWS operates in over 30 geographic regions, each containing multiple physically separate Availability Zones, plus hundreds of edge locations worldwide for content delivery.

The breadth of AWS matters to you as a customer because it creates compounding value: the economies of scale keep prices falling over time, the global infrastructure makes low-latency deployment anywhere in the world achievable by any organization, and the depth of managed services means you can build things in days that would take years to replicate on-premises. Millions of customers — from individual developers to the largest enterprises and government agencies on earth — run production workloads on AWS.

### Cloud vs. Traditional IT: The Responsibility Spectrum

The clearest way to understand cloud computing is to place it on a spectrum of responsibility. In traditional on-premises IT, your team owned and operated everything: physical data center infrastructure, servers, networking, operating systems, middleware, and applications. Every layer was yours to configure, secure, monitor, and repair at 3am.

Cloud computing lets you choose how far up the stack you want to hand off to the provider. At one end, AWS manages the physical data center and provides a virtual machine — you manage everything above the hypervisor. At the other end, you consume a fully functional managed application and have no infrastructure visibility at all. The degree of control you retain is a direct trade-off against the operational burden you carry. This spectrum is the foundation of IaaS, PaaS, and SaaS — covered in Lesson 3.

## Configuration Reference

When you first log into the AWS Console at **console.aws.amazon.com**, you are experiencing cloud computing's on-demand self-service characteristic directly. Here is a step-by-step walkthrough of what you'll see and why each element connects to the NIST characteristics:

**The Console Home page** loads with a customizable dashboard showing recently visited services, a cost summary widget, and account health information. Along the top navigation bar, left to right, you'll find: the AWS logo (a link home), a "Services" dropdown, a search bar, a notification bell, a region selector, and your account name. This single screen represents access to over 200 services across dozens of service categories, all available immediately with no procurement or installation.

**The Services menu** is where on-demand self-service becomes tangible. Click "Services" in the top navigation bar (or press the keyboard shortcut Alt+S on Windows / Option+S on Mac). You'll see services grouped into categories: Compute, Storage, Database, Networking & Content Delivery, Security, Identity & Compliance, Machine Learning, Analytics, Developer Tools, and more. Each entry in this menu is a capability that would take a large team months to build and operate from scratch — all of them available to you right now, self-service, with no procurement, installation, or wait.

**The Region selector** (top right, displaying something like "US East (N. Virginia) us-east-1") demonstrates both broad network access and global reach. Click it. You'll see a dropdown listing every AWS region worldwide: US East, US West, Canada, South America, Europe, Middle East, Africa, Asia Pacific. Notice that regions have both a friendly name ("US East (N. Virginia)") and a code ("us-east-1"). Switching regions changes which physical data centers your resources will live in — resources you create in us-east-1 will not appear when you switch to ap-southeast-1 (Singapore), because they physically live in different buildings on different continents.

**To see on-demand self-service in action**, type "EC2" into the search bar and select the EC2 result. On the EC2 Dashboard, click "Launch instance." A configuration wizard appears: choose an operating system from a list of pre-built images (Amazon Linux, Ubuntu, Windows Server, Red Hat, and many others), choose a hardware size from dozens of instance type options, configure your network, and optionally add a startup script. Click "Launch instance" and within two minutes you have a running virtual server — no procurement process, no physical installation, no other team involved.

**To see measured service**, navigate to "Billing and Cost Management" via the account dropdown menu (your name, top right). Select "Bills" from the left navigation. You'll see a breakdown of your AWS charges by service, by region, and often by individual resource identifier — every unit of consumption tracked and billed precisely. The Cost Explorer section allows you to visualize spending over time and by service, which is the measured service characteristic as a reporting interface.

## How to Decide

The key judgment call in this lesson is: does a given scenario actually qualify as cloud computing? Use the NIST five characteristics as a checklist.

| Question to Ask | If YES | If NO |
|---|---|---|
| Can the user provision it without calling the provider? | On-demand self-service confirmed | Not cloud — traditional hosting or legacy managed services |
| Is it accessible over standard internet protocols from any device? | Broad network access confirmed | Possibly a dedicated or proprietary access model |
| Does it use shared physical infrastructure (multi-tenant)? | Resource pooling confirmed | Dedicated hardware — closer to private cloud |
| Can capacity scale up and down quickly without a contract change? | Rapid elasticity confirmed | Fixed-capacity traditional hosting |
| Is usage metered and billed precisely to actual consumption? | Measured service confirmed | Flat-rate or dedicated model — different pricing structure |

If a scenario meets all five, it is cloud computing. If it meets only some, it may be a hybrid or edge case — and the exam tests precisely these gray areas. A basic VPS (virtual private server) from a traditional hosting company that requires a support ticket to resize is not cloud by this definition, even if it's accessed over the internet.

**For the CapEx vs. OpEx decision:**
- If you need to experiment, validate, or scale unpredictably → OpEx/cloud wins because you don't commit capital before demand is proven
- If you have flat, high-utilization, long-running workloads with perfectly known capacity → CapEx analysis is worth doing, though AWS Reserved Instances significantly close the gap
- If you need global reach quickly → cloud wins regardless, because building physical global infrastructure is not feasible for most organizations

## How This Connects

- **EC2 (Elastic Compute Cloud)** is the most direct expression of on-demand self-service and rapid elasticity — it is the service that made commercial cloud infrastructure real in 2006 and remains the foundation of most AWS architectures today.
- **AWS Auto Scaling** is the operational implementation of rapid elasticity — it monitors your application and automatically adds or removes EC2 instances based on demand, making "scale in minutes" reliable and hands-off rather than manual.
- **AWS CloudWatch** is the engine behind measured service — it collects usage metrics on every resource, feeding both the billing system and your operational monitoring dashboards.
- **AWS Regions and Availability Zones** are the physical infrastructure that makes broad network access and global reach real. Understanding the geographic structure of AWS — regions, AZs, and edge locations — is critical for designing low-latency, fault-tolerant architectures and appears throughout the exam.
- **The AWS Shared Responsibility Model** (covered in Module 5) is a direct consequence of resource pooling: because your virtual machines share physical hardware with other customers, AWS must be responsible for securing that physical infrastructure. Your responsibility begins at the layer you control. The NIST characteristics make the shared responsibility boundary logically inevitable.

## Exam Traps

- Students often think "the cloud" means any service hosted on the internet, but the NIST definition is specific — a service must satisfy all five characteristics to genuinely qualify as cloud computing. A web hosting plan where you call support to get more storage is not cloud by this standard, even though it's internet-based.
- Students often think on-demand self-service means "fast." The characteristic is specifically about the absence of human interaction from the provider — you can provision without calling anyone. A slow self-service console still meets the characteristic. A fast phone call to a support agent who provisions resources for you does not.
- Students often think resource pooling means your data is shared with other customers. It is not. Resource pooling means physical hardware is shared — but each customer's compute, storage, and network are completely isolated through virtualization. AWS's hypervisor ensures tenants cannot access each other's resources. Shared hardware is not the same as shared data.
- Students often think the CapEx-to-OpEx shift means cloud is always cheaper. It does not — it means the cost structure is different. Cloud may be more expensive in raw per-hour compute costs for certain steady-state workloads. The value of OpEx is the elimination of financial risk and upfront commitment, not necessarily a lower total bill.
- Students often think AWS was founded as a technology company. AWS was built by Amazon's internal infrastructure team to solve Amazon's own retail capacity problem. This origin explains why AWS's design philosophy is so operationally pragmatic, and the history is sometimes tested in exam context questions about why AWS was created.

## Summary

- Cloud computing is the on-demand delivery of IT resources over the internet with pay-as-you-go pricing — formally defined by five NIST characteristics: on-demand self-service, broad network access, resource pooling, rapid elasticity, and measured service.
- The capacity mismatch problem — paying for peak hardware year-round while average utilization is 15–20% — is the core problem cloud computing was designed to solve.
- The CapEx-to-OpEx shift removes large upfront capital commitments and aligns IT costs with actual consumption, reducing financial risk and lowering the cost of experimentation.
- AWS launched EC2 and S3 in 2006, born from Amazon's own need to manage seasonal retail infrastructure at scale, and has since grown to 200+ services across 30+ geographic regions.
- Resource pooling means physical hardware is shared among customers, but each customer's resources are fully isolated through virtualization — shared infrastructure is not the same as shared data or shared access.
- For the CLF-C02 exam, you should be able to name all five NIST characteristics, explain what each means in plain language, and identify which characteristic a given scenario is illustrating.

## Examples

Netflix is one of the most cited illustrations of all five NIST characteristics working in concert. When Netflix releases a major new series, their engineers do not call AWS to request more servers — their auto-scaling systems detect the traffic spike and provision additional capacity within minutes (rapid elasticity). Subscribers in Tokyo, São Paulo, and London all stream using standard HTTPS on any device (broad network access). The physical hardware serving Netflix in AWS data centers simultaneously serves thousands of other AWS customers, letting AWS achieve high hardware utilization across all tenants — which translates to lower per-unit cost for everyone (resource pooling). Netflix pays precisely for the compute, storage, and data transfer they consumed each month, measured to the second for some services (measured service). And all provisioning is done programmatically through AWS APIs with no human involvement from AWS's side — Netflix engineers launch and terminate infrastructure on demand without a single call to AWS support (on-demand self-service).

A solo developer building a weekend side project demonstrates why the cloud's model matters even at the smallest scale. On a Saturday morning, she decides to prototype a new web application. She opens the AWS Console, launches an EC2 instance, creates an RDS database, and has a working development environment within about fifteen minutes — no procurement ticket, no approval chain, no IT department. She works on it for six hours, then stops. On Sunday she tries adding a caching layer using ElastiCache, decides it's overkill for her current traffic, and terminates it within the hour. At the end of the month, her AWS bill is $8.12 — charged precisely for the hours she used each service. In a traditional model, the minimum unit of infrastructure was a physical server with a multi-year contract. This kind of low-risk weekend experimentation was economically impossible, not because the developer lacked the skill, but because the financial structure of on-premises infrastructure required large commitments before small experiments.

A university's course registration system illustrates the capacity mismatch problem that cloud computing was designed to solve — and shows the real cost of solving it the old way. This university bought servers sized for September and January registration peaks, when tens of thousands of students simultaneously enroll in courses. For those two weeks per year, every server runs near 100% utilization. For the other 50 weeks, average utilization hovers around 8%. The university pays 100% of the hardware cost to serve 8% of peak load, 96% of the time. When the university's IT director modeled a migration to AWS with EC2 Auto Scaling, they found the same registration peak could be handled by a fleet that scales from near-zero to hundreds of instances for two-week bursts, then back down. The effective infrastructure cost for the registration system dropped by over 70% — and for the first time in years, the registration system did not crash on the first day of enrollment.

## Think About It

1. The NIST definition of cloud computing was written in 2011. Which of the five essential characteristics do you think has become *more* important as cloud adoption has matured — and which has become *less* differentiating as competitors have caught up with AWS?

2. AWS launched by making Amazon's own surplus compute capacity available externally. Why would a retail company's internal infrastructure problem lead to a business model that now generates more annual revenue than Amazon's retail operations? What does that tell you about the nature of the problem cloud computing solves?

3. If measured service (pay-as-you-go) is a defining characteristic of cloud, how would you explain Reserved Instances — where you commit to paying for a resource for one to three years regardless of whether you use it? Does this break the NIST definition, or is there a way it still fits within the framework?

4. A company's CTO says: "We have rapid elasticity — we can scale up in minutes." Their operations team says: "We've never actually scaled automatically; we always scale manually after getting paged at 2am." Which NIST characteristics are they actually meeting, and which are they failing to realize? What would need to change for rapid elasticity to be real rather than theoretical?

5. Cloud computing converts CapEx to OpEx. From a pure accounting standpoint, some companies actually prefer CapEx — it can be more favorable for tax treatment in certain jurisdictions, and some finance teams prefer depreciation schedules over variable monthly bills. Does this mean cloud is the wrong choice for these companies, or just that the argument for cloud needs to be reframed?

## Quick Check

**Q1.** According to the NIST definition, which characteristic of cloud computing is the technical foundation for pay-as-you-go billing?
- A) Rapid elasticity
- B) Resource pooling
- C) Measured service
- D) On-demand self-service

**Answer: C** — Measured service means usage is monitored, controlled, and reported transparently. This metering is precisely what enables billing customers for only what they consume. Without measurement, you cannot have usage-based pricing.

**Q2.** A company's servers run at 12% average CPU utilization across the year but must be sized to handle a holiday traffic peak. Which cloud computing problem does this scenario most directly illustrate?
- A) The security risk of multi-tenant infrastructure
- B) The capacity mismatch problem that cloud computing was designed to solve
- C) The difficulty of achieving broad network access on-premises
- D) The need for resource pooling across multiple customers

**Answer: B** — The capacity mismatch problem is the gap between peak capacity you must provision in advance and the average capacity you actually use. This company pays for 100% of peak hardware while using 12% on average — precisely the waste that cloud's pay-as-you-go elasticity eliminates.

**Q3.** Cloud computing primarily shifts IT spending from _______ to _______.
- A) OpEx to CapEx
- B) CapEx to OpEx
- C) fixed costs to sunk costs
- D) variable costs to fixed costs

**Answer: B** — Cloud replaces large upfront capital expenditures (buying hardware before demand is known) with ongoing operational expenditures (monthly usage-based bills). This reduces financial risk, eliminates capacity forecasting commitments, and aligns IT costs with actual business activity.

## What's Next

In the next lesson, we compare cloud computing to traditional on-premises infrastructure in detail — the full trade-off analysis, how to calculate true total cost of ownership, and the scenarios where staying on-premises is genuinely still the right answer.
