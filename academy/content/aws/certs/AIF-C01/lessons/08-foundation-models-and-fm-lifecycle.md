---
title: "Foundation Models and the FM Lifecycle"
type: content
estimated_minutes: 13
cert_tags: ["AIF-C01"]
---

# Foundation Models and the FM Lifecycle

## Overview

The previous lesson defined a foundation model as a large, general-purpose model pre-trained on broad data and adaptable to many tasks. This lesson follows the foundation model through its life — from the data and decisions that create it, through the customization that adapts it, to deployment and the feedback loop that keeps it useful. The AI Practitioner exam (Domain 2, Task 2.1) asks you to describe this **FM lifecycle**: data selection, model selection, pre-training, fine-tuning, evaluation, deployment, and feedback. Understanding the lifecycle is what lets you reason about cost, customization, and the trade-offs the exam tests throughout Domains 2 and 3.

What makes foundation models economically transformative is the separation between an enormous, expensive, one-time **pre-training** step and a cheap, repeatable **adaptation** step. A handful of organizations spend millions of dollars and months of compute pre-training a base model on internet-scale data. Everyone else then *adapts* that model to their needs at a tiny fraction of the cost — or simply uses it as-is through an API. This is why a small team can ship a sophisticated AI feature in weeks: they inherit the pre-trained model's general capabilities and only pay for light customization. Recognizing where in the lifecycle the heavy cost sits, and which adaptation options exist, is central to the practitioner's judgment.

This lesson walks each lifecycle stage, clarifies who typically performs it, and connects the stages to the customization and cost trade-offs explored later. After it you will be able to describe how a foundation model is created and adapted, and where an organization's effort and money actually go.

---

## Core Concepts

### Data Selection — The Quality Foundation

Everything a model knows comes from its training data, so **data selection** is the first and arguably most consequential stage. For pre-training, this means assembling a vast, diverse corpus — web text, books, code, and more — and curating it for quality, coverage, and safety. The principle "garbage in, garbage out" is absolute here: biases, gaps, and errors in the data become biases, gaps, and errors in the model. For organizations adapting a model, data selection means curating a smaller, high-quality, representative dataset for the specific domain or task. The exam returns to data quality, representativeness, and curation repeatedly, especially in the responsible-AI domain.

### Model Selection — Choosing a Base

**Model selection** is choosing which foundation model to build on. Few organizations pre-train their own; most pick an existing model that fits their needs on dimensions like capability, modality (text, image, multi-modal), size, cost, latency, language coverage, and licensing. On AWS, model selection often means choosing among the models available in **Amazon Bedrock** (from providers such as Amazon, Anthropic, Meta, Mistral, Cohere, and Stability AI) or in **SageMaker JumpStart**. This stage is so important to applications that Domain 3 devotes an entire task to FM selection criteria.

### Pre-Training — The Expensive Foundation

**Pre-training** is the process that creates the base model: feeding the curated corpus to a transformer and training it (largely through self-supervised next-token prediction) to learn language, facts, and reasoning patterns. Pre-training is extraordinarily resource-intensive — enormous datasets, large GPU clusters, weeks or months of compute, and very high cost. It is performed by model providers, not by typical practitioners. The key exam takeaway: pre-training is where the **majority of the cost and compute** lives, which is exactly why adapting an existing pre-trained model is so much cheaper than creating one.

### Fine-Tuning — Adapting the Base

**Fine-tuning** adapts a pre-trained model to a narrower purpose by training it further on a smaller, targeted dataset. This is where most organizations customize: teaching the model a company's tone, domain vocabulary, or a specific task. Fine-tuning is far cheaper than pre-training because it starts from an already-capable model and only nudges it. There are lighter and heavier forms — from instruction tuning to continued training on domain text — explored in detail in the Domain 3 fine-tuning lesson. Importantly, fine-tuning is just one of several customization options; sometimes prompt engineering or retrieval (RAG) achieves the goal without any training at all.

### Evaluation — Measuring Fitness

Before and after adaptation, a model must be **evaluated** to confirm it meets quality and business requirements. Evaluation combines automated metrics (covered in Domain 3 — ROUGE, BLEU, and others), benchmark datasets, **human-in-the-loop** review, and managed tooling such as **Amazon Bedrock Model Evaluation**. Evaluation is not a one-time gate; it recurs whenever the model or its use changes. The practitioner's mindset: never assume a model is good because it sounds fluent — measure it against the task and the business objective.

### Deployment — Putting the Model to Work

**Deployment** makes the model available to applications. The common patterns mirror the Module 1 lifecycle lesson: consume a **managed API** (e.g., Amazon Bedrock serves the model; you call it and AWS runs the infrastructure) or **self-host** the model on your own compute. Managed APIs minimize operational overhead and speed time to market; self-hosting offers more control at higher cost and effort. Deployment also involves choices about throughput (on-demand vs. provisioned) and region, which feed directly into the cost lesson.

### Feedback — Closing the Loop

The lifecycle is a loop, not a line. Once deployed, real-world usage generates **feedback** — user ratings, corrections, observed failures, and new data — that informs the next round of evaluation, data curation, and fine-tuning. **Reinforcement learning from human feedback (RLHF)** is a structured form of this, using human preference signals to better align the model. Continuous feedback is what keeps a model accurate and relevant as language, facts, and user needs change — the same "models are never done" principle from MLOps, applied to foundation models.

### Who Does What

A useful framing: model **providers** own data selection (at scale), pre-training, and base evaluation, investing the bulk of the cost. **Practitioners and organizations** focus on model selection, light data curation, optional fine-tuning, application-level evaluation, deployment, and the feedback loop. Knowing this division explains why building a GenAI application is mostly about *choosing and adapting*, not *creating*, a foundation model.

---

## Configuration Reference

The FM lifecycle stages:

```text
Stage           What happens                         Who / cost
--------------- ------------------------------------ ------------------------
Data selection  curate broad (or domain) data         provider (huge) / org (targeted)
Model selection pick the base FM                       organization
Pre-training    train the base on massive data        provider — HIGH cost/compute
Fine-tuning     adapt to a domain/task on small data   organization — much lower cost
Evaluation      measure quality vs. task/business      both; recurs
Deployment      serve via managed API or self-host     organization
Feedback        learn from real usage (incl. RLHF)     organization; loops back
```

Where the money is:

```text
Pre-training        $$$$  (months, GPU clusters) — done by providers
Fine-tuning         $$    (targeted data, far cheaper)
Prompt eng. / RAG   $     (no training) — often enough; see Domain 3
Inference (usage)   pay per token / per call
```

---

## How to Decide

- **Need broad capability fast?** Select a pre-trained FM and use it as-is via a managed API — skip training entirely.
- **Need domain tone/vocabulary/behavior the base lacks?** Consider **fine-tuning** on curated data — but first ask whether prompt engineering or RAG suffices (cheaper, no training).
- **Worried about cost?** Remember pre-training is the expensive part and is the provider's job; your costs are mainly inference plus optional fine-tuning.
- **Deploying?** Prefer a **managed API** for lower operational overhead unless control requirements demand self-hosting.

---

## How This Connects

This lesson expands the Module 1 ML lifecycle into its foundation-model form and sets up three Domain 3 lessons directly: FM selection criteria (model selection), customization approaches and their cost trade-offs (fine-tuning vs. RAG vs. in-context learning), and FM evaluation metrics. The feedback and RLHF threads continue into responsible AI (Domain 4). It also reinforces the token and pre-training concepts from the previous lesson.

---

## Exam Traps

- **Thinking organizations pre-train their own models.** Pre-training is provider-scale and rarely done in-house; practitioners select and adapt.
- **Assuming fine-tuning is always required to customize.** Prompt engineering and RAG often achieve the goal with no training and lower cost.
- **Confusing pre-training with fine-tuning.** Pre-training creates the broad base (expensive); fine-tuning adapts it to a task (cheap).
- **Treating deployment as the end.** The lifecycle loops through feedback, evaluation, and re-adaptation.
- **Ignoring data quality.** Poor or unrepresentative data undermines every later stage and is a top responsible-AI concern.

---

## Summary

A foundation model's lifecycle runs from data selection and model selection, through the expensive provider-led pre-training that creates the base, to the much cheaper fine-tuning that organizations use to adapt it, then evaluation, deployment (managed API or self-hosted), and a feedback loop that continuously improves the model. The economic key is the split between costly one-time pre-training and inexpensive, repeatable adaptation — which is why practitioners mostly *select and adapt* rather than *create* models, and why prompt engineering or RAG often customizes a model without any training at all. Knowing where cost and effort sit in this lifecycle underpins the selection and customization decisions tested across Domains 2 and 3.

---

## Examples

**Example 1 — Use as-is.** A startup needs a chatbot next month. It selects a Bedrock model and consumes it via API — no pre-training, no fine-tuning — riding the provider's pre-trained capability.

**Example 2 — Fine-tune.** A law firm needs the model to adopt precise legal phrasing. It fine-tunes a base model on a curated set of its documents — cheap relative to pre-training.

**Example 3 — Feedback loop.** A support assistant logs thumbs-down responses; that feedback feeds re-evaluation and the next fine-tuning round, steadily improving accuracy.

**Example 4 — Avoid training.** A team thinks it needs fine-tuning to answer questions about its product manuals, but RAG (retrieval over the manuals) meets the need with no training at all.

---

## Think About It

Two teams both want a model that "knows our internal product catalog." One plans to fine-tune; the other plans to use retrieval (RAG). Using the lifecycle, explain why the cheaper, faster option is often retrieval — and what specific situation would actually justify fine-tuning instead.

---

## Quick Check

1. Which lifecycle stage carries the majority of the cost and compute, and who performs it?
2. How does fine-tuning differ from pre-training?
3. Name two deployment options for a foundation model.
4. Why is the FM lifecycle described as a loop?

*Answers: (1) pre-training — performed by model providers, not typical organizations; (2) pre-training creates the broad base model on massive data at high cost, while fine-tuning adapts that existing model to a narrower task on a small dataset at much lower cost; (3) a managed API service (e.g., Amazon Bedrock) or self-hosting on your own compute; (4) deployed models generate feedback from real usage that feeds re-evaluation and re-adaptation, because models degrade and needs change over time.*

---

## What's Next

Next: **Agentic AI Foundations** — how foundation models become autonomous agents that plan, use tools, and coordinate, including the Model Context Protocol and the AWS services that operate agents at scale.
