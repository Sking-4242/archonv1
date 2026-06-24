---
title: "Practical AI Use Cases — and When Not to Use AI"
type: content
estimated_minutes: 12
cert_tags: ["AIF-C01"]
---

# Practical AI Use Cases — and When Not to Use AI

## Overview

A foundational AI certification is ultimately about judgment: knowing when AI/ML is the right tool, when it is the wrong one, and which kind of AI fits a given business problem. The AI Practitioner exam (Domain 1, Task 1.2) tests this directly. It will describe a business situation and ask whether AI is appropriate, what value it would deliver, or which technique to apply. Crucially, it also tests the inverse — recognizing when a deterministic, rule-based, or simpler solution beats machine learning.

This is a more nuanced skill than it sounds. AI shines when patterns are complex, data is plentiful, and approximate predictions create value at scale — fraud detection, demand forecasting, recommendations, document understanding. AI is the *wrong* choice when you need an exact, guaranteed, explainable answer that a rule or formula already provides, when you lack sufficient quality data, or when the cost and risk outweigh the benefit. Reaching for machine learning where a simple rule would do is a common and expensive mistake, and the exam deliberately includes "AI is not appropriate here" as a correct answer.

This lesson surveys the high-value real-world AI applications and gives you a framework for the appropriateness decision. After it you will be able to judge whether a scenario calls for AI and, if so, which category of AI to apply.

---

## Core Concepts

### Where AI/ML Creates Value

AI/ML earns its place in three broad situations. First, **augmenting human decisions** at scale — surfacing the few cases a person should review (flagging suspicious transactions, prioritizing leads). Second, **automation** of tasks that are too high-volume or too pattern-rich for rules — sorting documents, moderating content, routing tickets. Third, **scalability** — applying consistent judgment across millions of events that no human team could handle. The common thread is *complex patterns* plus *high volume* plus *tolerance for probabilistic answers*.

### The Canonical Real-World Applications

The exam expects familiarity with the headline application categories:

- **Computer vision** — image/video understanding: defect detection, content moderation, medical imaging.
- **Natural language processing (NLP)** — sentiment analysis, entity extraction, document classification, translation.
- **Speech recognition** — transcribing and understanding spoken language.
- **Recommendation systems** — personalized product/content suggestions.
- **Fraud detection** — flagging anomalous transactions or behavior.
- **Forecasting** — predicting demand, sales, or capacity from time-series data.
- **Knowledge bases / search** — retrieving and synthesizing information (increasingly powered by GenAI and RAG).
- **Agentic AI** — autonomous assistants that complete multi-step tasks.

Recognizing which category a scenario belongs to is half the battle; it points to the AWS service and the technique.

### When AI Is *Not* Appropriate

The exam rewards knowing the limits. AI is a poor fit when:

- **A specific, guaranteed outcome is required**, not a prediction. If the rule is "orders over $10,000 need manager approval," that's a deterministic rule — not an ML problem.
- **A simple rule or formula already solves it** reliably and cheaply. Don't train a model to do arithmetic or apply fixed policy.
- **Data is insufficient, low-quality, or unrepresentative.** ML needs enough good data; without it, results are unreliable.
- **The cost or risk outweighs the benefit.** A cost-benefit analysis may show that building, running, and governing a model isn't justified for the value returned.
- **Full explainability is legally required and the best model is opaque** — sometimes a simpler, transparent model is mandated regardless of accuracy.

### Traditional ML vs. Foundation Models

For a given use case, the exam also asks whether a **traditional ML model** or a **foundation model** is appropriate. Traditional ML (often on tabular data) suits well-defined prediction tasks where you have labeled data, need explainability, or face tight regulatory/operational constraints. Foundation models suit language- and content-heavy tasks — generation, summarization, conversational interfaces, broad knowledge — where a single pre-trained model can cover many tasks with little custom data. Regulatory concerns, explainability requirements, and operational constraints push toward traditional, transparent models; broad language/content generation pushes toward FMs.

### The Cost-Benefit Lens

Every "should we use AI?" question carries an implicit cost-benefit analysis: data acquisition and labeling, model development or service cost, inference cost, monitoring, and the risk of wrong predictions — weighed against the value of better, faster, or more scalable decisions. The exam expects you to recognize when the math doesn't favor AI.

### Build, Buy, or Use a Managed Service

Even when AI clearly fits, there is a second decision the exam rewards: *how much to build*. The spectrum runs from **using a pre-built managed service** (call an API — Rekognition, Comprehend, Bedrock — with no model work), through **customizing or fine-tuning** an existing model on your data, to **building a custom model from scratch**. For most business problems, and certainly for the "uses but does not build" practitioner this exam targets, the managed-service or pre-trained-model path is the right default: it is faster, cheaper, requires no ML team, and lets the organization focus on the application rather than the infrastructure. Building a custom model is reserved for cases where no existing service or model meets the need and the organization has the data, expertise, and budget to justify it. When a scenario emphasizes speed, low operational overhead, or a small team, lean toward managed services and pre-trained models rather than custom builds.

### Scalability and Consistency as Value Drivers

It is worth naming *why* AI creates value when it does, because the exam frames use cases around these benefits. Beyond raw automation, AI delivers **consistency** — it applies the same criteria to every case, unlike humans who tire or vary — and **scalability** — it handles volumes no human team could, from millions of content-moderation decisions to real-time personalization for every visitor. It also **augments** rather than replaces human judgment in many settings, surfacing the handful of cases a person should focus on. Recognizing which of these benefits a scenario is reaching for (consistency, scale, automation, or human augmentation) helps confirm that AI is genuinely the right tool and points to the category of application involved.

---

## Configuration Reference

Appropriateness decision flow:

```text
Is a specific, guaranteed, exact answer required?        → Use rules/formula, NOT ML
Does a simple rule already solve it cheaply?             → Use the rule, NOT ML
Is there enough quality, representative data?            → If no, ML is not appropriate
Do benefits clearly exceed cost/risk?                    → If no, reconsider ML
Otherwise: complex patterns + volume + ok with predictions → ML/AI is a good fit
```

Use-case → category map:

```text
Tag images / detect defects / moderate content   → Computer vision
Analyze sentiment / extract entities / classify   → NLP
Transcribe speech                                  → Speech recognition
Personalized suggestions                           → Recommendation systems
Flag anomalous transactions                        → Fraud detection
Predict future demand from history                 → Forecasting (time-series)
Answer questions over company documents            → Knowledge base / RAG (GenAI)
Complete multi-step tasks autonomously             → Agentic AI
```

Traditional ML vs. FM:

```text
Need explainability / regulated / tabular prediction → Traditional ML
Language/content generation, broad tasks, little data → Foundation model
```

---

## How to Decide

- **Is the answer deterministic or rule-defined?** → Not AI; use logic/rules.
- **Insufficient or poor data, or benefits < costs?** → AI not appropriate.
- **Complex pattern, high volume, prediction acceptable?** → AI/ML fits; identify the category.
- **Regulated / needs explainability / tabular?** → Traditional ML. **Language/content generation?** → Foundation model.

---

## How This Connects

This lesson applies the paradigms (supervised/unsupervised/RL) and data types from the previous lessons to real business problems, and it sets up the AWS managed-services lessons (which service implements each category) and the entire GenAI track (when an FM is the right tool). The "explainability vs. accuracy" theme returns in Domain 4.

---

## Exam Traps

- **Using ML where a rule suffices.** If the requirement is an exact, policy-defined outcome, a deterministic rule is the right answer, not a model.
- **Ignoring data quality.** "Not enough representative data" can make AI inappropriate regardless of the use case's appeal.
- **Defaulting to foundation models for everything.** A regulated, explainability-bound tabular prediction often calls for traditional ML, not an FM.
- **Missing the cost-benefit signal.** A scenario emphasizing low value or high risk may be pointing to "AI is not appropriate."
- **Mislabeling the application category** (e.g., calling a forecasting problem "computer vision"). Match the modality.

---

## Summary

AI/ML adds value when complex patterns, high volume, and tolerance for probabilistic answers combine — across computer vision, NLP, speech, recommendations, fraud detection, forecasting, knowledge bases, and agentic assistants. It is the wrong tool when an exact or rule-defined outcome is required, when a simple rule already works, when data is insufficient or unrepresentative, or when cost and risk outweigh benefit. For appropriate cases, choose traditional ML for explainable, regulated, tabular prediction and foundation models for broad language and content generation. The exam tests both the "use AI" and the "don't use AI" sides of this judgment.

---

## Examples

**Example 1 — AI fits.** "Detect fraudulent transactions among millions daily." Complex patterns, high volume, prediction acceptable → **AI (fraud detection)**.

**Example 2 — AI does not fit.** "Apply a fixed 8% tax to every invoice." Deterministic rule → **not AI**; use a formula.

**Example 3 — Traditional ML over FM.** "Approve loans with a fully explainable, regulator-auditable model on tabular applicant data." Explainability + regulation + tabular → **traditional ML**.

**Example 4 — FM over traditional ML.** "Summarize and answer questions about thousands of support articles." Language/content + broad knowledge → **foundation model (with RAG)**.

---

## Think About It

A product manager wants to "use AI" to decide which orders qualify for free shipping, where the policy is simply "orders over $50 ship free." Why is machine learning the wrong tool here, and what single question separates this from a genuine ML use case like predicting which customers are likely to churn?

---

## Quick Check

1. Name three situations where AI/ML is *not* appropriate.
2. Which application category fits "personalized product suggestions"?
3. When would you choose traditional ML over a foundation model?
4. What three conditions together make a problem a good ML fit?

*Answers: (1) any three of: an exact/guaranteed outcome is required, a simple rule already solves it, insufficient/unrepresentative data, costs/risks outweigh benefits, mandated explainability with only opaque models available; (2) recommendation systems; (3) when explainability or regulatory/operational constraints apply, or for tabular prediction with labeled data; (4) complex patterns, high volume, and tolerance for probabilistic (non-exact) answers.*

---

## What's Next

Next: **Language and Speech AI Services on AWS** — the managed services (Comprehend, Transcribe, Translate, Lex, Polly) that implement NLP and speech use cases without building models.
