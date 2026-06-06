---
title: "Benefits of Cloud Computing"
type: content
estimated_minutes: 18
cert_tags: ["CLF-C02"]
---

# Benefits of Cloud Computing

## Overview

AWS has articulated six specific benefits of cloud computing that appear directly and repeatedly on the Cloud Practitioner exam. These are not generic marketing claims — they are a structured framework that describes how cloud changes the economics and operational reality of running technology infrastructure. Understanding these six benefits deeply, being able to explain each with a concrete example, and recognizing which benefit applies to a given scenario are all tested skills on the CLF-C02.

The six benefits are: trade upfront expense for variable expense; benefit from massive economies of scale; stop guessing capacity; increase speed and agility; stop spending money on running and maintaining data centers; and go global in minutes. Each one addresses a specific, identifiable problem that traditional on-premises infrastructure creates for organizations. Together, they explain not just what cloud does differently, but why those differences translate into real business outcomes — faster product development, lower financial risk, access to global markets, and engineering teams focused on building rather than maintaining.

This lesson is important beyond exam preparation because these six benefits are the vocabulary that cloud practitioners use in business conversations with executives, finance teams, and skeptical engineers who have invested years in on-premises expertise. Being able to clearly explain each benefit, connect it to a measurable business outcome, and provide a concrete example is the difference between a cloud practitioner who can own a conversation and one who can only answer technical questions. The exam tests the former.

## Core Concepts

### Benefit 1: Trade Upfront Expense for Variable Expense

Traditional infrastructure requires large capital expenditure before you know whether the underlying investment will generate a return. You buy servers before you have users. You build storage capacity before you know how much data you'll accumulate. You negotiate data center leases before you know how long you'll need the space. This upfront spending carries substantial financial risk: if your product fails, the capacity you purchased becomes worthless but remains on your balance sheet as a depreciating liability. If your growth is slower than projected, you've overpaid for capacity that sits idle for years. If your growth is faster than projected, you're capacity-constrained precisely when you need capacity most — and sourcing additional hardware takes months.

Cloud computing replaces this model with variable expense — you pay only for what you consume, in the period you consume it. There is no minimum purchase, no advance commitment for standard on-demand pricing, and no sunk cost if circumstances change. If you launch a product that fails after three months, your AWS bill reflects three months of actual usage — not three years of data center lease payments. If your usage doubles overnight due to unexpected viral growth, your bill doubles and your service continues running — without an emergency hardware order with a multi-week lead time.

This shift changes what's economically rational to attempt. With CapEx infrastructure, failed experiments are expensive even after you stop them — the hardware remains, the lease continues. This creates a natural conservatism: organizations invest engineering time only in projects they're highly confident will succeed. With cloud's variable expense model, a failed experiment costs only the compute time it consumed. Teams run ten experiments speculatively to find the one that works. This structural reduction in the cost of being wrong is one of cloud's most profound and underappreciated value drivers.

### Benefit 2: Benefit from Massive Economies of Scale

AWS serves hundreds of thousands of customers across every industry, operating millions of servers in data centers worldwide. This scale gives AWS purchasing leverage that no individual organization — not even the largest enterprises on earth — can replicate independently. When AWS purchases server processors, memory, and storage hardware, they buy in volumes that secure pricing unavailable to anyone else. When AWS builds data centers, they design custom power distribution systems, cooling infrastructure, and even custom server hardware that squeeze efficiency out of every watt consumed and every rack deployed.

These economies of scale produce continuously lower prices for every AWS customer. AWS has made over 100 price reductions since launching in 2006. The same EC2 instance type that cost one price in 2015 costs significantly less today, often with meaningfully better performance per dollar, because AWS's underlying hardware and operational efficiency has improved. These price reductions happen automatically — you don't need to renegotiate a contract or change anything about your architecture.

The practical implication is that you benefit from cost improvements you didn't have to earn yourself. As AWS optimizes its procurement, its data center design, and its software efficiency, a portion of those savings flows through to customers. No on-premises infrastructure operator enjoys this dynamic: the server you purchased doesn't get cheaper after you buy it, and its operational cost doesn't decrease as the vendor improves their manufacturing process.

### Benefit 3: Stop Guessing Capacity

Capacity planning — predicting how much compute, storage, and network capacity you'll need in the future and purchasing for that prediction — is one of the most reliably wrong activities in technology management. Organizations systematically over-provision because the penalty for under-provisioning is immediate and visible (systems crash, customers complain), while the penalty for over-provisioning is diffuse and invisible (capital sits idle, staff manages hardware that isn't doing much). The result: most on-premises data centers operate at 15–20% average utilization, paying for 100% of their hardware cost to serve 15–20% of potential load.

Cloud computing eliminates the capacity planning problem by making capacity elastic. You don't predict how much you'll need — you provision what you need now, observe actual demand, and scale accordingly. AWS Auto Scaling can monitor your application's CPU utilization, request count, or custom metrics, then automatically add or remove EC2 instances in response to real traffic patterns. Amazon DynamoDB adjusts its read and write throughput automatically in on-demand mode. AWS Lambda scales from zero to thousands of concurrent executions within seconds. No human intervention, no waiting for hardware.

Removing the capacity guessing problem has a second-order effect: it removes the risk of being wrong about initial estimates. When capacity decisions are reversible — you can always scale up or down within minutes — the cost of an incorrect initial estimate is essentially zero. You start conservatively, observe demand, and right-size based on real data rather than speculative projections. This is a fundamentally more rational approach to infrastructure management than capacity planning, and it is only possible because of cloud's rapid elasticity characteristic.

### Benefit 4: Increase Speed and Agility

In traditional IT, provisioning is a multi-step, multi-team, multi-week process. An engineer who needs a new server submits a request to procurement, which requires approval signatures from management, which triggers a hardware order, which arrives days to weeks later depending on supply chain conditions, which then goes to the data center team to rack and cable, then to the networking team to configure routing, then to the operating system team to install and harden, and finally to the engineer who initiated the request. This process commonly takes four to twelve weeks in enterprise environments.

In AWS, the same outcome takes under fifteen minutes. An engineer opens the AWS Console, selects an instance type, chooses a pre-configured operating system image from the AMI catalog, configures network settings, and clicks Launch. The server is running and accessible over the network within two minutes of that click. Total elapsed time: approximately fifteen minutes. No other teams involved, no approval chains, no waiting.

This speed difference is not a convenience — it is a competitive advantage that compounds over years. If an experiment that would have taken eight weeks to provision can now be attempted in fifteen minutes, teams run fifty experiments in the time they used to run one. Organizations that iterate fifty times faster converge on better solutions, respond to market feedback more quickly, and ship improvements that competitors take months to match. The high-performance engineering culture that characterizes the best technology companies — "go fast, learn constantly, ship often" — is structurally enabled by cloud infrastructure that removes the wait between "I want to try this" and "I'm trying this."

Speed and agility extends beyond server provisioning. AWS managed services — databases, message queues, machine learning platforms, content delivery networks, authentication systems — are available as API-ready building blocks immediately. An engineer who would have spent three months building a reliable message queuing system from scratch can instead configure Amazon SQS in thirty minutes and spend those three months building the application features that actually differentiate the product.

### Benefit 5: Stop Spending Money on Running and Maintaining Data Centers

Running a data center is expensive, operationally demanding, and deeply undifferentiated work. Data centers require: physical security (badge access systems, cameras, on-site security guards, mantrap entry systems), redundant power systems (primary feeds, UPS battery backup, diesel generators, transfer switches), precision cooling infrastructure (computer room air conditioners, cooling towers, thermal monitoring, airflow management), hardware lifecycle management (procurement, incoming inspection, installation, maintenance contracts, end-of-life disposal), and structured cabling systems. A modest enterprise data center commonly requires ten to twenty full-time staff whose entire job is keeping the physical environment running — and every hour of their time is an hour not spent building products.

None of this work differentiates the business that runs it. A retailer's competitive advantage comes from its merchandising, logistics, customer experience, and pricing strategy — not from how well its data center cooling system performs. A bank's competitive advantage comes from its financial products, risk management capabilities, and customer relationships — not from the efficiency of its power distribution units. Spending engineering talent and capital on data center operations is spending it on infrastructure that does not make the business better relative to any competitor that also has servers.

Cloud computing allows organizations to redirect both the capital and the human talent previously consumed by data center operations. When workloads move to AWS, the physical infrastructure layer — security, power, cooling, hardware management — becomes AWS's operational responsibility, handled by teams who do nothing else and have optimized every aspect of it at scale. Your engineers stop spending time on undifferentiated infrastructure maintenance and can invest that time in building the products and capabilities that genuinely differentiate the business. This is often described as "focus on your customers, not your infrastructure" — and it is one of the most transformative shifts cloud enables for engineering organizations.

### Benefit 6: Go Global in Minutes

AWS operates in more than 30 geographic regions worldwide, with multiple Availability Zones in each region — physically separate data centers connected by high-bandwidth, low-latency private fiber. Additionally, AWS operates hundreds of edge locations worldwide through Amazon CloudFront, putting cached content and edge compute close to end users everywhere on earth, including in cities and countries that don't have a full AWS region nearby.

Deploying your application to a new AWS region takes minutes. If you've written your infrastructure as code using CloudFormation or the AWS CLI, deploying to a second region is literally running a command with a different region parameter. Users in Europe get served from a European AWS region; users in Asia Pacific get served from a Singapore or Tokyo region. The latency difference for end users is dramatic: instead of experiencing 200+ milliseconds round-trip from a server in the US, a European user might see 20 milliseconds from Frankfurt or Dublin — a 10x improvement in perceived responsiveness that directly affects user experience and engagement.

Before cloud, achieving global infrastructure required years of planning, substantial capital investment, negotiating co-location agreements with facilities in each target country, hiring or contracting local technical staff to manage physical equipment, and managing an increasingly complex web of facility relationships and network interconnects. For most organizations, global infrastructure was simply not an option — only the largest technology and financial firms had the capital and operational scale to deploy globally. AWS makes global deployment accessible to any organization, at any scale, starting from day one if needed.

"Go global in minutes" also encompasses business continuity and regulatory compliance. Spreading workloads across multiple regions provides geographic redundancy that would be prohibitively expensive to build on-premises. Deploying to an EU AWS region (Frankfurt, Ireland, Paris, Stockholm, London, Milan) can satisfy European data residency requirements for EU customer data without building physical European infrastructure.

## Configuration Reference

**Exploring the AWS Global Infrastructure Map:**

Navigate to **infrastructure.aws** in your browser. No AWS account is required — this is a public visualization tool. You'll see a world map with interactive markers representing different types of AWS infrastructure:

**Regions:** Click on any highlighted cluster to see the region name (e.g., "US East (N. Virginia)"), its code (e.g., "us-east-1"), and the number of Availability Zones it contains. As of 2025, most regions have three AZs; us-east-1 has six. Notice the spread across North America, South America, Europe, the Middle East, Africa, and Asia Pacific. Each dot represents a geographic area where you can deploy infrastructure with a single region selector change in the console.

**Availability Zones:** When you click into a region, you'll see AZ count listed. AZs within a region are physically separate data centers — different buildings, different power grids, different flood plains — connected by direct private fiber. Running workloads across multiple AZs within a region is the primary mechanism for fault tolerance in AWS architecture.

**Edge Locations:** Zoom in or look at the smaller, more numerous markers — these represent Amazon CloudFront edge locations and Regional Edge Caches. There are hundreds of edge locations worldwide, dramatically outnumbering the full regions. Edge locations exist in cities and countries that don't have a full AWS region, enabling CloudFront to deliver cached content with low latency to users everywhere, including in markets where AWS doesn't yet have compute infrastructure. This is "go global in minutes" applied to content delivery.

**What to observe specifically:**
1. Count the European region markers. You'll see Frankfurt, Ireland, London, Paris, Stockholm, Milan, and Spain — all EU/EEA data residency options without building physical infrastructure.
2. Count the edge locations versus regions. The ratio is roughly 400+ edge locations to 30+ regions — illustrating that content delivery global reach is far more granular than compute region reach.
3. Find a region announced but not yet launched — the map typically shows "announced" regions in addition to live ones, illustrating that AWS's global footprint is continuously expanding.

**In the AWS Console — Experiencing "Go Global in Minutes" Directly:**

Navigate to console.aws.amazon.com. Find the region selector in the top-right corner — it currently shows your active region, such as "US East (N. Virginia) us-east-1." Click it. The dropdown lists every available commercial region: US East (N. Virginia), US East (Ohio), US West (Oregon), US West (N. California), Canada (Central), South America (São Paulo), Europe (Ireland), Europe (Frankfurt), Europe (London), Europe (Paris), Europe (Stockholm), Europe (Milan), Europe (Spain), Middle East (UAE), Middle East (Bahrain), Africa (Cape Town), Asia Pacific (Singapore), Asia Pacific (Tokyo), Asia Pacific (Seoul), Asia Pacific (Sydney), Asia Pacific (Mumbai), Asia Pacific (Jakarta), Asia Pacific (Osaka), Asia Pacific (Hong Kong), and more. Switching your active region changes where your next provisioned resource will physically live. Switching from us-east-1 to eu-west-1 (Ireland) takes one click, and your next EC2 instance will run in Dublin. That is the "go global in minutes" experience made tangible.

**Exploring Auto Scaling — "Stop Guessing Capacity" Made Concrete:**

In the EC2 console, click "Auto Scaling Groups" in the left navigation. If you create an Auto Scaling group (covered in depth in Module 8), you configure a minimum capacity, a desired capacity, and a maximum capacity. The group then monitors your application — using CloudWatch metrics like CPU utilization or custom metrics you define — and adds instances when load increases and removes them when load decreases. The scaling policies (target tracking, step scaling, scheduled scaling) are all configurable through this console. Even reading through the creation wizard makes the "stop guessing capacity" benefit concrete: you're not buying for peak, you're defining a range and letting demand determine where within that range you actually land.

## How to Decide

When a scenario describes a business situation, problem, or outcome, use this table to identify which cloud benefit most directly applies:

| Scenario or Problem Described | Primary Cloud Benefit |
|---|---|
| Startup cannot afford servers before having revenue | Trade upfront expense for variable expense |
| Company wants to experiment without capital commitment | Trade upfront expense for variable expense |
| Per-unit cloud costs are lower than internal estimates | Benefit from massive economies of scale |
| AWS prices have decreased since the workload was migrated | Benefit from massive economies of scale |
| System crashes during seasonal traffic peaks | Stop guessing capacity |
| Team over-provisioned infrastructure that now sits idle | Stop guessing capacity |
| New feature required 10 weeks of hardware procurement | Increase speed and agility |
| Engineering team ships faster after moving to cloud | Increase speed and agility |
| Infrastructure team headcount is too large relative to product team | Stop spending money on data centers |
| Physical facility costs are consuming a disproportionate share of IT budget | Stop spending money on data centers |
| Users in Europe experience high latency from US-based servers | Go global in minutes |
| Company needs to enter a new geographic market quickly | Go global in minutes |
| Data residency requirement for EU customer data | Go global in minutes |

**For distinguishing similar benefits on the exam:**
- "Trade upfront for variable" vs. "economies of scale": Both affect cost, but differently. Variable expense is about the cost structure (upfront vs. as-you-go). Economies of scale is about AWS's purchasing power driving absolute price reductions over time. If the scenario mentions avoiding a large upfront commitment → Benefit 1. If the scenario mentions prices falling or being lower than expected → Benefit 2.
- "Stop guessing capacity" vs. "speed and agility": Both involve responding to change, but differently. Stop guessing capacity is about matching infrastructure to demand in real time (elasticity). Speed and agility is about how quickly teams can provision new resources and experiment. If the scenario involves traffic spikes or idle hardware → Benefit 3. If it involves provisioning time or iteration speed → Benefit 4.

## How This Connects

- **AWS Auto Scaling** is the technical implementation of "stop guessing capacity" — it makes capacity elastic automatically, monitoring real demand signals and adjusting resource counts to match, removing the need for capacity planning at the infrastructure layer.
- **Amazon CloudFront** is the service that makes "go global in minutes" real for content and API delivery — it distributes content and caches responses at edge locations worldwide automatically, bringing data close to end users without requiring full application infrastructure deployment in every country.
- **AWS Managed Services** — RDS, DynamoDB, SQS, SNS, ElastiCache, and dozens of others — are the practical expression of "stop spending money on data centers." Each managed service is a capability your team would otherwise build and operate themselves, freeing engineering time for differentiated product work.
- **AWS Free Tier** directly supports "trade upfront expense for variable expense" — it allows teams to experiment and validate ideas at zero cost before committing to any spending, pushing the variable expense model even further toward zero risk for initial experimentation.
- **AWS Pricing Calculator** (calculator.aws) and **AWS Cost Explorer** are the tools that make "trade upfront for variable expense" visible and manageable — they allow you to model future costs before committing and track actual spending against budgets in real time, maintaining the transparency that the variable expense model requires.

## Exam Traps

- Students often confuse "trade upfront expense for variable expense" with "cloud is cheaper." The benefit is specifically about cost structure — paying as you go rather than committing upfront — not about whether the total bill will necessarily be lower. Cloud can cost more than on-premises for certain steady-state workloads; the benefit is the elimination of financial risk and capital commitment, regardless of the total.
- Students often confuse "benefit from massive economies of scale" with "stop guessing capacity." Both affect cost, but through different mechanisms. Economies of scale is about AWS's purchasing power translating into price reductions for customers over time. Stop guessing capacity is about real-time elasticity — matching resources to actual demand. Both reduce cost, but they are different benefits describing different dynamics.
- Students often think "go global in minutes" means that a single EC2 instance in us-east-1 is automatically available with low latency worldwide. It is not. By default, a resource in one region serves users from that one region's location. "Go global in minutes" means you can deploy to additional regions quickly and extend your application's geographic footprint easily — it still requires intentional architectural decisions about multi-region deployment.
- Students often leave out one or more of the six benefits when asked to list them. All six are official AWS benefits and all six are testable on the exam. Memorize the complete set: (1) trade upfront for variable expense, (2) massive economies of scale, (3) stop guessing capacity, (4) speed and agility, (5) stop spending on data centers, (6) go global in minutes.
- Students often think "increase speed and agility" refers to computing performance — faster CPUs, lower network latency, better hardware. The benefit refers to organizational agility — the speed at which teams can provision infrastructure, experiment with ideas, and iterate on products. It is a business and process benefit, not a hardware performance benchmark.

## Summary

- AWS defines six official benefits of cloud computing tested on the CLF-C02: trade upfront for variable expense, massive economies of scale, stop guessing capacity, speed and agility, stop spending on data centers, and go global in minutes.
- "Trade upfront for variable expense" removes large capital commitments and enables inexpensive experimentation — you pay for what you actually use rather than what you predict you might need.
- "Economies of scale" means AWS's purchasing and operational efficiency continuously reduces prices for all customers — you benefit from cost improvements you didn't have to earn yourself.
- "Stop guessing capacity" means real-time elasticity — scaling to match actual demand rather than predicted peak — eliminating both over-provisioning waste and under-provisioning risk simultaneously.
- "Speed and agility" means provisioning in minutes instead of weeks, enabling faster iteration cycles, more experimentation, and faster product development — a structural competitive advantage that compounds over time.
- "Go global in minutes" means any organization can deploy to AWS's 30+ worldwide regions immediately, achieving global infrastructure reach that would be financially and operationally impossible to replicate on-premises.

## Examples

Airbnb's early growth illustrates "trade upfront expense for variable expense" and "stop guessing capacity" simultaneously. When Airbnb launched in 2008, they had no idea whether renting out a spare room to strangers would resonate with the public. Committing capital to physical servers before validating the concept would have been a significant financial risk for a company burning through seed funding. By running on AWS, they started with minimal infrastructure, survived unpredictable traffic surges when press coverage sent unexpected waves of visitors to the site, and scaled infrastructure as paying customers validated and then exceeded initial projections. The cloud allowed the founders to spend their limited capital on building the product rather than infrastructure for a product that might not succeed. And when Airbnb did succeed — beyond anyone's initial projections — the infrastructure scaled with them without requiring a hardware refresh cycle that would have taken months and millions to execute.

NASA's Jet Propulsion Laboratory demonstrates "go global in minutes" in a scenario with an inherently unpredictable global audience. When the Curiosity rover landed on Mars in August 2012, NASA expected enormous worldwide interest in the live coverage but could not predict exactly how large the audience would be or from where it would originate. On-premises streaming infrastructure would have required months of planning and millions of dollars in hardware investment — all for a one-time event with uncertain audience size. Using AWS, NASA deployed streaming infrastructure across multiple AWS regions in the hours before the landing event, capable of handling whatever audience materialized. Millions of concurrent viewers from around the world watched the landing without service degradation. After the event, the capacity was released and cost stopped immediately. Two cloud benefits combined to enable an outcome that on-premises infrastructure could not have made economically feasible: go global in minutes and stop guessing capacity.

Stripe illustrates how "increase speed and agility" compounds into a genuine product advantage when applied consistently over years. As a payments infrastructure company, Stripe continuously experiments with fraud detection algorithms, API performance improvements, and new feature behavior — all of which require isolated test environments with separate databases, compute clusters, and network configurations. On-premises, setting up each test environment would require weeks of procurement and configuration. On AWS, Stripe engineers provision complete, isolated environments in under an hour using infrastructure-as-code templates. This means their data science team can run hundreds of fraud model experiments per year instead of dozens. The accumulated learning from those additional experiments produces meaningfully better fraud detection outcomes — a direct, measurable business result driven not by better algorithms alone, but by the structural ability to run experiments faster. This is speed and agility as a compound investment: each year of faster iteration widens the gap between Stripe's capabilities and what a slower-moving competitor could build.

## Think About It

1. AWS has reduced prices over 100 times since 2006, passing economies of scale savings on to customers. If this trend continued indefinitely, at what point — if ever — would cloud compute become so cheap that the CapEx-to-OpEx conversion stops being a meaningful factor in the buying decision? What would be the relevant decision criteria at that point?

2. The "stop guessing capacity" benefit assumes that workload traffic is variable and hard to predict. What happens to this benefit for a company with perfectly flat, highly predictable load — say, a batch processing system that runs identical jobs at the same time every day? Does cloud still win on any of the other five benefits for this workload?

3. "Go global in minutes" is a genuine technical achievement — but deploying infrastructure globally and operating it reliably globally are different challenges. What organizational capabilities, not just technical ones, does a company need to actually realize this benefit beyond the ability to select a new region in a dropdown?

4. The "stop spending money on data centers" benefit assumes cloud frees engineering teams to focus on higher-value work. But many organizations that migrate to cloud end up with the same headcount, now managing cloud infrastructure instead of physical servers. Why does this happen, and what specific organizational decisions would need to be made for the benefit to actually materialize as redirected capacity?

5. AWS frames these as six distinct benefits, but they are deeply interconnected — agility enables more experimentation, which validates the variable expense model, which enables further agility investment. If you had to identify the single benefit that creates the most leverage for a growth-stage startup versus a mature enterprise, would you choose the same one for both? Explain the reasoning.

## Quick Check

**Q1.** A startup wants to launch a new application but has no certainty about how many users it will attract. They choose AWS specifically to avoid purchasing servers before demand is proven. Which of the six cloud benefits most directly applies?
- A) Go global in minutes
- B) Benefit from massive economies of scale
- C) Trade upfront expense for variable expense
- D) Stop spending money on running and maintaining data centers

**Answer: C** — Trading upfront expense for variable expense means the startup pays only for infrastructure they actually use, eliminating the need to commit capital before demand is proven. This benefit most directly addresses the financial risk of pre-revenue or pre-scale infrastructure investment.

**Q2.** AWS has reduced its prices over 100 times since 2006 as data center efficiency improves. A customer who makes no changes to their AWS usage nonetheless sees their bill decrease year over year. Which cloud benefit does this illustrate?
- A) Increase speed and agility
- B) Stop guessing capacity
- C) Go global in minutes
- D) Benefit from massive economies of scale

**Answer: D** — AWS's scale allows it to purchase hardware, power, and data center capacity at volumes no individual organization can match. As AWS grows more efficient, a portion of those savings is passed through to customers via regular price reductions — this is economies of scale delivering value to customers automatically, without any action on their part.

**Q3.** A company's engineers previously spent 6–8 weeks waiting for hardware procurement before starting new development projects. After migrating to AWS, they provision environments in under an hour. Which cloud benefit most directly describes this improvement?
- A) Trade upfront expense for variable expense
- B) Stop spending money on running and maintaining data centers
- C) Increase speed and agility
- D) Stop guessing capacity

**Answer: C** — Increase speed and agility refers specifically to the reduction in time required to provision infrastructure and run experiments — from weeks to minutes. This faster provisioning enables more experimentation, faster learning cycles, and faster time-to-market for new features and products. It is an organizational and process benefit, not a hardware performance improvement.

## What's Next

This completes the theory foundation of Module 1. The next lesson is a hands-on lab: you will create your AWS account, explore the Management Console, enable multi-factor authentication, and set up the baseline environment you'll need for every hands-on exercise that follows in this course.
