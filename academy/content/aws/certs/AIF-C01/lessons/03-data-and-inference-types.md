---
title: "Data and Inference in AI Systems"
type: content
estimated_minutes: 11
cert_tags: ["AIF-C01"]
---

# Data and Inference in AI Systems

## Overview

Machine learning is only as good as the data it learns from and only as useful as the way it delivers predictions. The AI Practitioner exam tests both ends of this: the **types of data** that feed AI models, and the **modes of inference** by which a trained model serves results. These are practical, decision-oriented topics — given a description of the data or a latency requirement, you should be able to name the right category or serving mode.

Data comes in several shapes, and the shape determines which techniques and services apply. Some data is labeled, some isn't; some is neatly tabular, some is free-form text or pixels. Inference, meanwhile, can happen in different patterns: instantly in response to a request, in large scheduled batches, asynchronously for long-running jobs, or on fully managed serverless infrastructure that scales to zero. Matching the inference mode to the business requirement — latency, volume, cost — is exactly the kind of judgment the exam rewards.

This lesson catalogs the data types and inference modes, with the tells that map a scenario to each. After it you will be able to classify any dataset and recommend an appropriate inference pattern.

---

## Core Concepts

### Labeled vs. Unlabeled Data

**Labeled data** includes the correct answer for each example (an image tagged "cat," a transaction marked "fraud") and is required for supervised learning. **Unlabeled data** is raw with no answers attached and is used by unsupervised and self-supervised methods. Labeling is often expensive and slow because it usually requires human effort, which is why unlabeled data is far more abundant — a recurring theme in why foundation models are pre-trained on vast unlabeled corpora.

### Structured vs. Unstructured Data

**Structured data** fits neatly into rows and columns with a defined schema — think database tables and spreadsheets. **Unstructured data** has no predefined model — free text, images, audio, video, documents. A useful middle category, **semi-structured data**, has some organizational markers without a rigid schema (JSON, logs). The exam pairs structured data with traditional ML on tabular features, and unstructured data (text, images) with deep learning and foundation models.

### The Specific Data Modalities

Within these buckets, the exam names specific modalities:

- **Tabular** — rows and columns of numeric/categorical features; the classic input for regression and classification.
- **Time-series** — values ordered over time (sensor readings, stock prices, demand); used for forecasting.
- **Text** — natural language; processed by NLP and LLMs.
- **Image** (and video) — pixels; processed by computer vision.

Recognizing the modality points you to the technique: tabular → traditional ML; time-series → forecasting; text → NLP/LLMs; image → computer vision.

### Inference: Turning a Model Into a Service

**Inference** is using a trained model to produce outputs on new data. How you serve inference is a design decision driven by latency tolerance, request volume, and cost. The four modes the exam expects:

- **Real-time (synchronous)** — a persistent endpoint returns a prediction immediately, for interactive use (a chatbot reply, a fraud check at checkout). Lowest latency, but you pay for always-on capacity.
- **Batch** — the model scores a large dataset all at once on a schedule, with no need for instant responses (nightly churn scores for every customer). Cost-efficient for high volume; not interactive.
- **Asynchronous** — requests are queued and processed when ready, suited to large payloads or long-running inferences (processing a long video) where the caller doesn't need an instant answer.
- **Serverless** — inference runs on fully managed infrastructure that scales automatically, including to zero when idle, so you pay only for what you use. Ideal for **intermittent or unpredictable** traffic where an always-on endpoint would waste money.

### Matching Inference to the Requirement

The decision is driven by the question's constraints. "Immediate response to a user" → real-time. "Score millions of records overnight" → batch. "Large payload, can wait" → asynchronous. "Sporadic traffic, minimize idle cost" → serverless. These mappings recur throughout Domains 1–3.

### Why Data Quality Underpins Everything

The most sophisticated model cannot overcome bad data — a principle so important the exam returns to it across multiple domains. **Data quality** spans several properties: **accuracy** (the data is correct), **completeness** (no critical gaps), **consistency** (the same thing is represented the same way), **timeliness** (the data is current enough for the task), and **representativeness** (the data reflects the real-world cases the model will face). Poor data quality produces unreliable predictions, and unrepresentative data produces biased ones that work well for some groups and badly for others. Because models learn patterns directly from data, any flaw in the data becomes a flaw in the model — "garbage in, garbage out." For a practitioner, this means that before trusting a model you ask where its data came from and whether it fairly represents the problem. This concern resurfaces forcefully in the responsible-AI and security domains, where data quality, representativeness, and governance are treated as first-class requirements rather than afterthoughts.

### Structured and Unstructured Data in Practice

The structured/unstructured split has a practical consequence worth internalizing: it largely determines which technique and service apply. **Structured, tabular** data (rows and columns of numbers and categories) is the natural home of **traditional machine learning** — regression and classification on features, often the right tool when you need explainability and have clean labeled records. **Unstructured** data (text, images, audio) is the domain of **deep learning and foundation models**, because neural networks excel at learning directly from raw, high-dimensional inputs. So when a scenario describes spreadsheets of customer metrics, think traditional ML; when it describes free-form documents, photos, or audio, think deep learning or foundation models. This early signal — what *shape* is the data — is one of the fastest ways to orient yourself in an exam question.

---

## Configuration Reference

Data types at a glance:

```text
Axis                Categories
------------------- -------------------------------------------
Label               labeled (supervised)  |  unlabeled (unsup/self-sup)
Structure           structured (tables) | semi-structured (JSON) | unstructured (text/image)
Modality            tabular | time-series | text | image/video
```

Inference-mode decision table:

```text
Requirement                                  → Inference mode
-------------------------------------------- → ---------------
Immediate, interactive response               → Real-time (synchronous)
Score a large dataset on a schedule           → Batch
Large payloads / long jobs, can wait          → Asynchronous
Sporadic/unpredictable traffic, scale to zero → Serverless
```

---

## How to Decide

- **Need a prediction *right now* for a user?** → Real-time endpoint.
- **Scoring huge volumes with no latency pressure?** → Batch.
- **Inputs are large or slow to process and the caller can wait?** → Asynchronous.
- **Traffic is intermittent and you want to pay only when used?** → Serverless.
- **Classifying the data?** Tabular/time-series → traditional ML; text/image → deep learning/FMs; labeled → supervised, unlabeled → unsupervised.

---

## How This Connects

This lesson grounds the learning-types lesson (labeled data enables supervised learning) and sets up the lifecycle and GenAI modules (foundation models pre-train on vast unlabeled text; inference modes reappear in Bedrock's real-time vs. batch options and in cost discussions). The structured/unstructured split also informs which AWS AI service fits a use case.

---

## Exam Traps

- **Confusing structured with labeled.** Structure is about schema (rows/columns); labels are about having answers. A tabular dataset can be unlabeled.
- **Defaulting to real-time inference.** For high-volume, non-interactive scoring, batch is cheaper and correct; for sporadic traffic, serverless avoids idle cost.
- **Treating asynchronous and batch as the same.** Asynchronous handles individual large/long requests via a queue; batch scores a whole dataset at once.
- **Forgetting serverless scales to zero.** When the tell is "unpredictable/intermittent traffic, minimize cost," serverless is the intended answer.

---

## Summary

AI data is categorized by label (labeled vs. unlabeled), structure (structured, semi-structured, unstructured), and modality (tabular, time-series, text, image). Those categories steer technique and service selection. Inference — serving a trained model — comes in four modes: real-time for immediate interactive responses, batch for high-volume scheduled scoring, asynchronous for large or long-running requests that can wait, and serverless for intermittent traffic that should scale to zero. Match the data type to the technique and the inference mode to the latency, volume, and cost requirement.

---

## Examples

**Example 1 — Batch inference.** "Generate churn scores for all 5 million customers every night." High volume, no interactivity → **batch**.

**Example 2 — Real-time inference.** "Approve or decline each card transaction in under 100 ms." Immediate, interactive → **real-time endpoint**.

**Example 3 — Serverless inference.** "An internal tool gets a few dozen unpredictable requests a day." Sporadic, cost-sensitive → **serverless**.

**Example 4 — Data modality.** "Forecast next month's electricity demand from years of hourly readings." Time-series → forecasting.

---

## Think About It

A team insists on a always-on real-time endpoint for a model that is only invoked a handful of times per day at random. What inference mode would cut their cost without hurting those users, and what is the trade-off they're currently paying for?

---

## Quick Check

1. What is the difference between structured and labeled data?
2. Which inference mode best fits scoring millions of records overnight?
3. Which inference mode scales to zero for intermittent traffic?
4. Match modality to technique: time-series, text, image.

*Answers: (1) structured refers to a defined row/column schema, labeled refers to having known answers — a structured table can still be unlabeled; (2) batch; (3) serverless; (4) time-series → forecasting, text → NLP/LLMs, image → computer vision.*

---

## What's Next

Next: **Practical AI Use Cases — and When *Not* to Use AI** — recognizing where AI/ML adds value, where it doesn't, and how to pick the technique for a business problem.
