---
title: "Building GenAI on AWS: Bedrock, SageMaker, and Token-Based Pricing"
type: content
estimated_minutes: 14
cert_tags: ["AIF-C01"]
---

# Building GenAI on AWS: Bedrock, SageMaker, and Token-Based Pricing

## Overview

Knowing how generative AI works is one thing; knowing which AWS service to reach for, and what it will cost, is what makes you a practitioner. The AI Practitioner exam (Domain 2, Task 2.3) asks you to identify the AWS services and features for building generative AI applications, explain the advantages of using AWS GenAI services, describe the benefits of AWS infrastructure for these applications, and reason about the cost trade-offs — especially the **token-based pricing model**. This lesson maps the AWS GenAI toolkit and demystifies how you pay for it.

The central advantage of building GenAI on AWS is that it dramatically **lowers the barrier to entry**. Instead of acquiring GPUs, hosting massive models, and assembling an ML team, you call a managed API and pay for what you use. That shifts the work from infrastructure to application, letting organizations ship AI features quickly, securely, and cost-effectively. But "pay for what you use" has a specific meaning in generative AI: you pay per **token**, and the number of tokens flowing in and out of a model — multiplied by your traffic — drives the bill. Practitioners who understand token pricing and the throughput options can design applications that are both capable and affordable; those who don't are the ones surprised by the invoice.

This lesson surveys the AWS GenAI services by purpose, explains the infrastructure benefits AWS brings, and breaks down token-based pricing and its cost levers. After it you will be able to choose an AWS GenAI service for a scenario and reason clearly about what will drive its cost.

---

## Core Concepts

### Amazon Bedrock — The Managed Foundation Model Service

**Amazon Bedrock** is the primary service for building generative AI applications on AWS. It provides access, through a single managed API, to foundation models from multiple providers — Amazon (the Nova and Titan families), Anthropic (Claude), Meta (Llama), Mistral, Cohere, Stability AI, and others — for text generation, summarization, Q&A, code, image generation, and embeddings. There is no infrastructure to provision and no GPUs to manage. Bedrock also bundles the higher-level capabilities a real application needs: **Knowledge Bases** for retrieval (RAG), **Agents** for tool-using workflows, **Guardrails** for safety, **Model Evaluation** for quality assessment, and **Prompt Management** for versioning prompts. For most GenAI scenarios on the exam, Bedrock is the expected answer because it offers the fastest path from idea to production with the least operational burden.

### Amazon SageMaker AI and JumpStart

**Amazon SageMaker AI** is the broader machine-learning platform for teams that need to build, train, fine-tune, and deploy their own models — including foundation models — with full control. **SageMaker JumpStart** is a hub of pre-trained, ready-to-deploy foundation and ML models you can launch and customize within SageMaker. The distinction the exam draws: Bedrock is the managed, API-first path for *consuming and lightly customizing* foundation models with minimal overhead, while SageMaker is the more hands-on platform for teams that need deeper customization, control, or to host models themselves. Practitioners default to Bedrock; SageMaker appears when control and custom model work are required.

### Higher-Level and Agentic Services

AWS layers application-level GenAI products on top of these foundations. **Amazon Q** is the AI assistant family for business knowledge (Q Business) and development (Q Developer). **Amazon Quick Suite** is an agentic "AI teammate" for business workflows that grounds answers in company data and can take actions. **Bedrock AgentCore** and the open-source **Strands Agents** SDK (from the agentic lesson) build and operate agents. The pattern to recognize: AWS offers GenAI at every level — raw model API (Bedrock), build-your-own platform (SageMaker), agent frameworks/platforms (Strands, AgentCore), and ready-made assistants (Amazon Q, Quick) — so you choose the level that matches how much you need to build versus consume.

### Why Build GenAI on AWS

The exam expects you to articulate the advantages. **Lower barrier to entry and speed to market** — managed APIs remove the need for ML infrastructure and expertise. **Cost-effectiveness** — pay-per-use instead of buying and running GPUs. **Choice** — many models behind one API, so you can pick or switch models without re-architecting. And the **infrastructure benefits**: AWS brings **security** (encryption, IAM, private networking), **compliance** (audit-ready services and certifications), **responsibility and safety** features (Guardrails), and global scale and reliability. A crucial detail for trust: data you send to Bedrock is not used to train the base foundation models, and stays within your security boundary — a point that matters for enterprise adoption.

### Token-Based Pricing

Generative model usage is billed primarily by **tokens**. You pay for **input tokens** (the prompt and any context you send) and **output tokens** (the model's response), usually at different per-token rates, and output tokens are often more expensive. Because cost scales with token volume, the levers are clear: shorter prompts, retrieving only the relevant context (rather than stuffing whole documents), capping output length, and choosing a smaller model when it suffices all reduce cost. Token pricing also ties cost to performance — longer context and longer outputs mean higher cost *and* higher latency. This is why the earlier advice to "right-size the model" and to use RAG (which sends only relevant chunks) is as much a cost strategy as a quality one.

### Throughput and Cost Trade-offs

Beyond per-token rates, AWS offers throughput options that trade cost against guarantees. **On-demand** pricing charges per token with no commitment — ideal for variable or unpredictable workloads. **Provisioned throughput** reserves dedicated model capacity for a fee, providing consistent high throughput and latency for steady, high-volume production workloads — more cost-effective at scale but a waste for sporadic use. Other cost factors the exam names include **availability and redundancy**, **regional coverage** (model availability and data-residency choices vary by Region), and the cost of **custom models** (fine-tuning and hosting a customized model adds cost over using a base model). The decision mirrors compute purchasing elsewhere on AWS: commit for steady high volume, stay on-demand for variable load.

---

## Configuration Reference

AWS GenAI services by purpose:

```text
Service / layer          Use it when you want to...
------------------------ ---------------------------------------------
Amazon Bedrock           consume/customize FMs via a managed API (default)
  Knowledge Bases        add RAG/retrieval grounding
  Agents                 build tool-using agent workflows
  Guardrails             enforce safety/content policies
  Model Evaluation       assess model quality
  Prompt Management      version and manage prompts
SageMaker AI / JumpStart build, fine-tune, host your own models (more control)
Strands / AgentCore      build and operate agents (code SDK / managed platform)
Amazon Q / Quick Suite   use ready-made AI assistants (little/no building)
```

Token-based pricing and cost levers:

```text
You pay for: input tokens (prompt+context) + output tokens (response)
             output tokens often cost more than input tokens

Lower cost by:
  • shorter prompts; retrieve only relevant context (RAG) vs. whole docs
  • cap maximum output length
  • use a smaller model that still meets the quality bar

Throughput choice:
  On-demand            pay per token, no commitment   → variable/unpredictable load
  Provisioned throughput reserved capacity, steadier   → steady high-volume production
Other cost factors: region coverage, redundancy/availability, custom-model hosting
```

---

## How to Decide

- **Consume a foundation model fast with least overhead?** → **Amazon Bedrock** (managed API).
- **Need deep customization, control, or to host your own model?** → **SageMaker AI / JumpStart**.
- **Build or run agents?** → **Strands** (code) / **Bedrock AgentCore** (managed); or use **Amazon Q / Quick** if you don't need to build.
- **Controlling cost?** → trim input/output tokens, use RAG to send only relevant context, right-size the model; choose **provisioned throughput** for steady high volume and **on-demand** for variable load.

---

## How This Connects

This lesson grounds the Module 2 concepts in concrete AWS services and pricing, and it leans on the token concept from the "how GenAI works" lesson. It connects forward to Domain 3, where Bedrock's Knowledge Bases power the **RAG** lesson, Prompt Management supports **prompt engineering**, and Model Evaluation supports **FM evaluation** — and to Domain 5, where Bedrock Guardrails and AWS infrastructure security recur. It also reuses the shared Bedrock and SageMaker library lessons for builder-level depth.

---

## Exam Traps

- **Defaulting to SageMaker for simple GenAI.** For consuming foundation models with low overhead, Bedrock is usually the intended answer; SageMaker is for deeper control/custom models.
- **Counting cost in requests, not tokens.** GenAI cost scales with input + output tokens; long prompts and long responses cost more.
- **Choosing provisioned throughput for spiky traffic.** Reserved capacity suits steady high volume; on-demand suits variable load.
- **Assuming your data trains the base model.** Data sent to Bedrock isn't used to train the foundation models and stays in your security boundary.
- **Ignoring regional and custom-model costs.** Model availability varies by Region, and hosting a fine-tuned custom model adds cost over a base model.

---

## Summary

AWS offers generative AI at every level: Amazon Bedrock provides managed, API-based access to many foundation models (plus Knowledge Bases, Agents, Guardrails, Evaluation, and Prompt Management) and is the default for most applications; SageMaker AI and JumpStart serve teams needing deeper control and custom model work; Strands and AgentCore build and run agents; and Amazon Q and Quick Suite are ready-made assistants. Building on AWS lowers the barrier to entry, speeds time to market, and brings security, compliance, and safety, while keeping your data out of base-model training. Cost is driven by **token-based pricing** — input plus output tokens — so trim prompts and outputs, ground with RAG, and right-size the model; choose provisioned throughput for steady high volume and on-demand for variable load.

---

## Examples

**Example 1 — Bedrock default.** A team wants a summarization feature live in two weeks with no ML staff. **Amazon Bedrock** via API delivers it with minimal overhead.

**Example 2 — SageMaker for control.** A research group must fine-tune and host a specialized model with full control over weights and infrastructure → **SageMaker AI / JumpStart**.

**Example 3 — Token cost control.** A document-Q&A app's bill is high because it stuffs entire manuals into each prompt. Switching to **RAG** sends only the few relevant chunks, cutting input tokens and cost.

**Example 4 — Throughput choice.** A steady, high-volume production chatbot moves from on-demand to **provisioned throughput** for predictable latency and better economics at scale.

---

## Think About It

Two GenAI applications have identical traffic counts, but one costs three times as much to run. Using token-based pricing, list at least three differences between the apps that could explain the gap — and for each, the design change that would bring the expensive app's cost down.

---

## Quick Check

1. Which AWS service is the default managed-API path for consuming foundation models, and which is for building/hosting your own?
2. What two token categories are you billed for, and which is often more expensive?
3. Name two ways to reduce token cost without changing traffic volume.
4. When does provisioned throughput make more sense than on-demand pricing?

*Answers: (1) Amazon Bedrock for the managed API; SageMaker AI (with JumpStart) for building/hosting your own; (2) input tokens (prompt + context) and output tokens (response) — output tokens are often more expensive; (3) any two of: shorten prompts, use RAG to send only relevant context, cap output length, use a smaller model; (4) for steady, high-volume production workloads where reserved capacity is more economical and gives consistent latency.*

---

## What's Next

You've completed Module 2 (Fundamentals of Generative AI). Next module: **Applications of Foundation Models** — the largest exam domain — beginning with FM selection criteria and inference parameters.
