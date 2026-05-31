---
title: "What Is Cloud Computing?"
type: content
estimated_minutes: 8
cert_tags: ["aws_ccp"]
---

# What Is Cloud Computing?

## Overview

Cloud computing is the on-demand delivery of IT resources — compute, storage, databases, networking, analytics, and more — over the internet with pay-as-you-go pricing. Instead of buying, owning, and maintaining physical data centers and servers, you access technology services from a cloud provider such as Amazon Web Services.

The term "cloud" has been used in networking diagrams for decades to represent the internet, and the metaphor stuck. When you hear "the cloud," it simply means: computing resources hosted and managed by someone else, accessible to you over a network.

AWS defines cloud computing around five essential characteristics: on-demand self-service, broad network access, resource pooling, rapid elasticity, and measured service. Understanding these characteristics helps you explain the value of cloud to any audience.

## The Five Essential Characteristics

The National Institute of Standards and Technology (NIST) defines cloud computing with five key characteristics that any cloud service must satisfy:

**On-demand self-service** — You provision resources whenever you need them, without requiring human interaction with the provider. You log in, click a button, and a server is running in minutes.

**Broad network access** — Resources are available over the network and accessed through standard mechanisms (HTTPS, APIs, SDKs) from any device.

**Resource pooling** — The provider pools computing resources and serves multiple customers using a multi-tenant model. Physical and virtual resources are dynamically assigned based on demand.

**Rapid elasticity** — Resources can be scaled up or down quickly, and often automatically, to match demand. From the user's perspective, resources appear unlimited.

**Measured service** — Usage is monitored, controlled, and reported transparently for both provider and consumer — the basis for pay-as-you-go billing.

## A Brief History of Cloud Computing

Before the cloud, every company that needed computing capacity had to build and maintain its own infrastructure. This meant large upfront capital investments, long provisioning cycles (weeks to months), and resources that sat idle during low-demand periods.

Amazon's retail business required massive infrastructure that went mostly unused outside of the holiday shopping season. In 2002, AWS began offering its surplus capacity to outside developers. By 2006, Amazon launched EC2 (Elastic Compute Cloud) and S3 (Simple Storage Service) — the first commercially available cloud services at scale.

Today AWS offers over 200 fully featured services across compute, storage, networking, databases, analytics, AI/ML, security, and more, serving millions of customers worldwide.

## Why Cloud Computing Exists

The fundamental problem cloud computing solves is the mismatch between the capacity you need to provision in advance and the capacity you actually use. Traditional on-premises infrastructure requires you to predict your peak demand and buy for it — leaving most resources idle most of the time.

Cloud computing inverts this model. You pay only for what you use, scale up instantly when demand spikes, and scale back down when it drops. This transforms IT from a capital expense (CapEx) into an operational expense (OpEx) — a shift that changes how organizations budget for and think about technology.

Beyond cost, the cloud enables speed: a startup can deploy globally in hours, not months. It enables experimentation: teams can try ideas cheaply and discard failures without sunk cost. And it enables focus: your engineers work on your product, not on maintaining servers.

## Summary

Cloud computing delivers on-demand IT resources over the internet with pay-as-you-go pricing. It is defined by five characteristics: on-demand self-service, broad network access, resource pooling, rapid elasticity, and measured service. AWS pioneered the commercial cloud in 2006 and today offers 200+ services to millions of customers. The core value proposition is converting capital expenditure into operational expenditure while gaining the ability to scale instantly and globally.

## Examples

Netflix is one of the most cited examples of cloud computing's five characteristics in action. When Netflix decides to release a new season of a popular series, they don't call AWS and ask for more servers — they simply use auto-scaling groups that detect traffic spikes and provision additional capacity within minutes (rapid elasticity). Subscribers in Tokyo, São Paulo, and London all stream from the same platform through standard HTTPS (broad network access), and Netflix pays only for the extra compute during that burst, not for dedicated hardware they'd own forever (measured service).

A small SaaS startup building a B2B analytics tool demonstrates on-demand self-service. On a Tuesday morning, their lead engineer decides to prototype a new data pipeline. She opens the AWS Console, launches an EC2 instance, spins up an RDS database, and has a working environment in under fifteen minutes — no procurement ticket, no waiting on an IT team, no capital approval. Two weeks later, the prototype fails user testing; she terminates the resources and pays roughly $40 for the experiment. The same experiment on-premises would have taken months and cost tens of thousands.

Consider a university's computing needs: enrollment periods in September and January generate massive demand for their student portal, while the rest of the year the system is nearly idle. Resource pooling means the physical AWS hardware serving this university during enrollment also serves thousands of other customers during the university's quiet periods — no one pays for idle capacity. This is the multi-tenant model that makes per-unit cloud costs so much lower than owning dedicated hardware sized for peak.

## Think About It

1. The NIST definition of cloud computing was written in 2011. Which of the five essential characteristics do you think has become *more* important as cloud adoption has matured — and which has become *less* differentiating as competitors have caught up with AWS?

2. AWS launched by offering Amazon's own surplus compute capacity. Why would a retail company's internal infrastructure problem lead to a business model that now generates more revenue than Amazon's retail operations? What does that tell you about the nature of the problem cloud computing solves?

3. If measured service (pay-as-you-go) is a defining characteristic of cloud, how would you explain Reserved Instances — where you commit to paying for a resource for 1–3 years regardless of use? Does this break the definition, or is there a way it still fits?

4. A company's CTO says: "We get rapid elasticity — we can scale up in minutes." Their operations team says: "We've never actually scaled automatically; we always scale manually after getting paged at 2am." Which of the five characteristics are they actually meeting, and which are they failing to use?

5. Cloud computing converts CapEx to OpEx. From a pure accounting standpoint, why might some companies *prefer* CapEx over OpEx — and does that mean cloud is the wrong choice for them?

## Quick Check

**Q1.** According to the NIST definition, which characteristic of cloud computing enables pay-as-you-go billing?
- A) Rapid elasticity
- B) Resource pooling
- C) Measured service
- D) On-demand self-service

**Answer: C** — Measured service means usage is monitored and reported, which is the technical foundation for billing customers only for what they consume.

**Q2.** AWS launched its first commercial cloud services (EC2 and S3) in which year?
- A) 2002
- B) 2004
- C) 2006
- D) 2010

**Answer: C** — AWS launched EC2 and S3 in 2006, though AWS began offering developer services to outside customers as early as 2002.

**Q3.** Cloud computing primarily shifts IT spending from _______ to _______.
- A) OpEx to CapEx
- B) CapEx to OpEx
- C) fixed costs to sunk costs
- D) variable costs to fixed costs

**Answer: B** — Cloud replaces large upfront capital expenditures (buying hardware) with ongoing operational expenditures (monthly usage bills), reducing financial risk and improving budget predictability.

## What's Next

In the next lesson, we compare cloud computing to traditional on-premises infrastructure — the trade-offs, the use cases where each makes sense, and how enterprises decide where to run their workloads.
