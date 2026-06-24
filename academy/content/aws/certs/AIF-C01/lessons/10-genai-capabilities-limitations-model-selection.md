---
title: "GenAI Capabilities, Limitations, and Model Selection"
type: content
estimated_minutes: 14
cert_tags: ["AIF-C01"]
---

# GenAI Capabilities, Limitations, and Model Selection

## Overview

Generative AI is powerful, but it is not appropriate for every problem, and choosing the right model for a given job is a real skill. The AI Practitioner exam (Domain 2, Task 2.2) asks you to describe what generative AI does well, recognize its genuine limitations, identify the factors that go into selecting a GenAI model, and connect a GenAI application to the business value and metrics it should deliver. This is the judgment layer on top of the mechanics from the previous lessons: you know how GenAI works, now you decide *when* and *with which model* to use it.

The stakes are practical. Deploy generative AI where its strengths — fluent language, adaptability, content creation, conversation — solve a real problem, and you create enormous value. Deploy it where its weaknesses — hallucination, nondeterminism, weak interpretability — are unacceptable, and you create risk, embarrassment, or harm. A model that confidently invents a legal citation or a medical dosage is not a quirky bug; it is a fundamental property of how these systems generate text. The mature practitioner neither dismisses generative AI nor over-trusts it, but matches it to use cases that tolerate its limitations and adds safeguards where they don't.

This lesson lays out the advantages, the disadvantages, the model-selection factors, and the business metrics, with the decision framework the exam tests. After it you will be able to argue both for and against using GenAI in a scenario and choose a model on the right criteria.

---

## Core Concepts

### What Generative AI Does Well

Generative AI's advantages cluster around language and content. It is **adaptable** — one model handles summarization, drafting, classification, translation, and Q&A without separate systems. It is **responsive and conversational**, enabling natural-language interfaces that lower the barrier between people and software. It **generates content** — text, images, code, audio — at speed and scale, accelerating drafting, ideation, and personalization. And it brings **broad general knowledge** plus reasoning patterns learned from vast data, so it can perform reasonably on tasks it was never explicitly trained for ("zero-shot"). These strengths make GenAI excellent for assistants, content drafting, summarization, code help, customer service, search, and knowledge work.

### Where Generative AI Falls Short

The limitations are just as important and are favorite exam material. **Hallucination** is the tendency to produce confident, fluent output that is factually wrong — because the model generates statistically likely text, not verified truth. **Nondeterminism** means the same prompt can yield different outputs, which complicates testing and any use needing reproducibility. **Interpretability is limited** — it is hard to explain *why* the model produced a given answer, a problem for regulated or high-stakes decisions. And outputs can be **inaccurate, biased, or outdated**, reflecting flaws and time limits in the training data. None of these is a bug to be fully patched; they are inherent properties to be managed — with retrieval (RAG) for grounding, guardrails for safety, human review for high-stakes outputs, and careful use-case selection.

### Matching GenAI to the Right Problems

Combine the strengths and weaknesses into a fit test. Generative AI fits when the task is language- or content-centric, tolerates some variability, and benefits from broad knowledge or natural conversation — and where occasional errors are caught or low-cost. It is a poor fit when the task demands a single exact, verifiable answer with no tolerance for error, full explainability, or perfect reproducibility, unless you add strong grounding and human oversight. This echoes the Module 1 "when not to use AI" lesson, sharpened for generative models specifically.

### Factors for Selecting a GenAI Model

When GenAI fits, you still must choose *which* model. The exam lists the selection factors:

- **Model type and capabilities** — text, image, multi-modal; reasoning strength; supported tasks.
- **Performance requirements** — quality on your task, measured by evaluation.
- **Latency** — how fast responses must be (interactive chat vs. batch).
- **Cost** — token pricing and overall spend (covered in the next lesson).
- **Model size and complexity** — larger models are often more capable but slower and pricier; smaller models can be cheaper and faster and sufficient.
- **Constraints and compliance** — data residency, regulatory needs, licensing.
- **Language and modality coverage** — multilingual needs, image vs. text.

There is rarely a single "best" model — only the best fit for *your* requirements. A frequent, exam-relevant insight: the largest, most capable model is not always the right choice; a smaller, cheaper, faster model that meets the quality bar is often better.

### Business Value and Metrics

A GenAI project is justified by business outcomes, not novelty. The exam expects you to tie applications to metrics such as **ROI**, **efficiency** (time or cost saved), **conversion rate**, **average revenue per user**, **customer lifetime value**, **user engagement**, **accuracy** on the task, and **cross-domain performance**. The discipline is to define the target metric *before* building and measure whether the GenAI feature actually moves it — a fluent demo that doesn't improve a business metric is not a success.

---

## Configuration Reference

Advantages vs. limitations:

```text
Advantages                         Limitations
---------------------------------- ----------------------------------
adaptability (one model, many tasks) hallucination (confident, wrong)
responsiveness / conversational      nondeterminism (varies per run)
content generation at scale          limited interpretability
broad general knowledge / zero-shot  inaccuracy, bias, stale data
```

Model-selection factors:

```text
Factor               Ask
-------------------- --------------------------------------------
Capabilities/modality text? image? multi-modal? reasoning depth?
Performance          does it meet the quality bar on our task?
Latency              interactive (fast) or batch (tolerant)?
Cost                 token price and total spend acceptable?
Size/complexity      is a smaller, cheaper, faster model enough?
Compliance/constraints residency, regulation, licensing met?
Language coverage    multilingual needs supported?
```

Business metrics to target:

```text
ROI · efficiency/time saved · conversion rate · ARPU ·
customer lifetime value · engagement · task accuracy
```

---

## How to Decide

- **Is the task language/content-centric and error-tolerant (or easily checked)?** → GenAI fits; otherwise add grounding/human review or reconsider.
- **Selecting a model:** start from requirements (quality, latency, cost, compliance, modality), then pick the **smallest/cheapest model that clears the quality bar** — not automatically the largest.
- **High-stakes accuracy needs?** → pair the model with RAG for grounding and human-in-the-loop review; do not rely on the raw model.
- **Justifying the project:** define the target business metric first and measure the lift.

---

## How This Connects

This lesson applies the mechanics from the tokens/transformers and FM-lifecycle lessons to real decisions, and it sets up the next lesson on **token-based pricing and AWS GenAI infrastructure** (cost is a selection factor) and Domain 3's deeper **FM selection criteria, RAG, and evaluation** lessons. The limitations — hallucination, bias, interpretability — are the bridge into responsible AI (Domain 4) and grounding techniques (Domain 5).

---

## Exam Traps

- **Treating hallucination as a fixable bug.** It is inherent to probabilistic generation; manage it with grounding (RAG), guardrails, and human review.
- **Always choosing the biggest model.** The right model is the one that meets requirements at acceptable cost and latency — often a smaller one.
- **Using GenAI where an exact, verifiable answer is mandatory** without grounding or oversight.
- **Forgetting nondeterminism.** If reproducibility matters, plan for variability in outputs.
- **Skipping business metrics.** A polished GenAI feature that doesn't move ROI, efficiency, or engagement isn't a win.

---

## Summary

Generative AI excels at adaptable, conversational, content-generating tasks backed by broad knowledge, but it hallucinates, behaves nondeterministically, resists interpretation, and can be inaccurate or biased — limitations to be managed, not ignored. Use it where its strengths solve the problem and its weaknesses are tolerable or mitigated (with RAG grounding, guardrails, and human review). When selecting a model, weigh capabilities, performance, latency, cost, size/complexity, compliance, and language coverage — and prefer the smallest, cheapest model that meets the quality bar over the largest by default. Finally, justify every GenAI application with a concrete business metric and measure whether it actually improves it.

---

## Examples

**Example 1 — Good fit.** Drafting first-pass marketing copy that a human edits: language-centric, error-tolerant (human in the loop), benefits from creativity → strong GenAI fit.

**Example 2 — Risky fit needing safeguards.** A medical-information assistant: language-centric but low error tolerance → only acceptable with RAG grounding, guardrails, citations, and human oversight.

**Example 3 — Right-sizing the model.** A high-volume classification task meets its quality bar with a smaller, cheaper model; choosing the largest model would needlessly raise cost and latency.

**Example 4 — Metric-driven.** A support-assistant project sets "reduce average handle time by 20%" as its target and measures the actual lift, rather than declaring success because the bot "sounds smart."

---

## Think About It

A team is excited to deploy a generative assistant that quotes company policy to customers, and they plan to use the largest available model "to be safe." Identify the two biggest risks in this plan (one about the model's behavior, one about the model choice) and what you would change to address each.

---

## Quick Check

1. Name three inherent limitations of generative AI.
2. Why isn't the largest model always the best choice?
3. What technique most directly reduces hallucination by grounding answers in real data?
4. Give two business metrics you might use to justify a GenAI application.

*Answers: (1) any three of: hallucination, nondeterminism, limited interpretability, inaccuracy/bias/stale data; (2) a smaller, cheaper, faster model that meets the quality bar is often a better fit on cost and latency; (3) Retrieval Augmented Generation (RAG); (4) any two of ROI, efficiency/time saved, conversion rate, ARPU, customer lifetime value, engagement, task accuracy.*

---

## What's Next

Next: **Building GenAI on AWS — Bedrock, SageMaker, and Token-Based Pricing** — the AWS services for developing generative AI applications and how token-based pricing and throughput choices drive cost.
