---
title: "The AI/ML Lifecycle, MLOps, and Evaluation Metrics"
type: content
estimated_minutes: 13
cert_tags: ["AIF-C01"]
---

# The AI/ML Lifecycle, MLOps, and Evaluation Metrics

## Overview

An AI solution is not a one-time build; it is a lifecycle that runs from raw data to a monitored production system and loops back for retraining. The AI Practitioner exam (Domain 1, Task 1.3) asks you to describe that lifecycle, name the AWS services at each stage, explain the basics of ML operations (MLOps), and — importantly — read the metrics used to judge whether a model is good and whether it delivers business value.

Understanding the lifecycle matters because most real-world failures happen *after* a model is built: data drifts, accuracy degrades, and an unmanaged model silently makes worse decisions over time. MLOps is the discipline that keeps models reliable through automation, versioning, and monitoring. And metrics are how you tell success from failure — both technical metrics (accuracy, precision, recall, F1) and business metrics (ROI, cost per user, customer satisfaction). A model with high accuracy that doesn't move a business metric is not a success, and the exam tests that distinction.

This lesson walks the pipeline, introduces MLOps at a foundational level, and explains the core metrics in plain language. After it you will be able to place a task in the lifecycle, name the relevant AWS service, and interpret a model's evaluation numbers.

---

## Core Concepts

### The AI/ML Pipeline, Stage by Stage

A typical pipeline flows through these stages: **data collection** → **data preparation** (cleaning, labeling, feature engineering) → **model training** → **evaluation** → **deployment** → **monitoring** → (loop back to) **retraining**. Each stage has AWS support: **Amazon S3** for data storage; **SageMaker** (Data Wrangler, Processing) for preparation; **SageMaker Training** for training; **SageMaker** evaluation and **Amazon Bedrock Model Evaluation** for assessment; **SageMaker endpoints** or **Bedrock** for deployment; and **SageMaker Model Monitor** for drift monitoring. For practitioners, the point is recognizing what each stage does and that AWS provides managed tooling for all of them — you don't hand-build the pipeline.

### Sources of Models: Build, Buy, or Adapt

You can obtain a model three ways. Use a **managed/pre-trained foundation model** via API (e.g., through **Amazon Bedrock**) — fastest, no training. **Fine-tune or customize** a pre-trained model on your own data when the base model is close but needs domain adaptation. Or **train a custom model** from scratch on SageMaker when you need something the market doesn't offer — rare for practitioners, expensive, and data-hungry. The exam frames this as open-source/pre-trained models vs. custom training, and as the **build-vs-buy** trade-off.

### Putting a Model in Production

Two deployment patterns recur: a **managed API service** (call Bedrock or a SageMaker endpoint — AWS runs the infrastructure) versus a **self-hosted API** (you deploy and operate the model on your own compute). Managed services lower operational burden and speed time to market; self-hosting offers more control at higher operational cost. For the foundational exam, "managed API" is usually the lower-overhead, recommended path.

### MLOps in One Pass

**MLOps** applies DevOps practices to machine learning: making the workflow **repeatable** (automated pipelines instead of manual steps), **scalable**, and **production-ready**, while controlling **technical debt**. Its signature activities are **experimentation** (tracking trials), **versioning** models and data, **automated retraining**, and **model monitoring** for drift — when incoming data or the world changes enough that the model's accuracy decays. The MLOps loop is: deploy → monitor → detect degradation → retrain → redeploy. The reason it exists: a model is never "done," because the data it was trained on keeps aging.

### Model Performance Metrics

For classification models, four metrics recur:

- **Accuracy** — the fraction of all predictions that were correct. Simple, but misleading on imbalanced data (a model that always predicts "not fraud" can be 99% accurate yet useless).
- **Precision** — of the items the model flagged positive, how many truly were. High precision = few false alarms.
- **Recall** — of all the truly positive items, how many the model caught. High recall = few misses.
- **F1 score** — the harmonic mean of precision and recall, a single balanced number when you care about both.

The precision/recall trade-off is the exam's favorite: catching more true positives (recall) often means more false alarms (lower precision), and the right balance depends on the cost of a miss versus a false alarm.

### Business Metrics

Technical metrics are necessary but not sufficient. **Business metrics** judge whether the model delivers value: **return on investment (ROI)**, **cost per user/interaction**, **development cost**, **customer feedback/satisfaction**, conversion rate, and engagement. A model is successful only if it moves the business metric it was built to improve — a recurring theme the exam reinforces across domains.

---

## Configuration Reference

The lifecycle and its AWS services:

```text
Stage              Does                          AWS support
------------------ ---------------------------- ----------------------------
Data collection    gather raw data               Amazon S3
Data preparation   clean, label, feature-build   SageMaker Data Wrangler/Processing
Training           fit the model                 SageMaker Training / Bedrock fine-tuning
Evaluation         measure quality               SageMaker / Bedrock Model Evaluation
Deployment         serve predictions             SageMaker endpoints / Bedrock
Monitoring         detect drift                  SageMaker Model Monitor
Retraining         refresh the model             SageMaker Pipelines (automation)
```

Classification metrics, plainly:

```text
Accuracy  = correct predictions / all predictions      (beware imbalanced data)
Precision = true positives / predicted positives        (few false alarms)
Recall    = true positives / actual positives           (few misses)
F1        = balance of precision and recall
```

Metric emphasis by cost of error:

```text
Cost of a MISS is high (disease, fraud)      → optimize Recall
Cost of a FALSE ALARM is high (spam blocking) → optimize Precision
Care about both                               → F1
```

---

## How to Decide

- **Need a model fast with no training?** → managed pre-trained FM (Bedrock). **Close but needs domain knowledge?** → fine-tune. **Nothing fits and you have lots of data?** → custom training.
- **Lower operational overhead?** → managed API over self-hosted.
- **Choosing a metric:** missing positives is costly → recall; false alarms are costly → precision; balance both → F1; never trust accuracy alone on imbalanced data.
- **Judging success:** confirm a business metric (ROI, satisfaction, cost per interaction) improves, not just a technical score.

---

## How This Connects

This lesson ties the earlier Domain 1 concepts (learning types, data, inference) into an end-to-end workflow and previews the GenAI modules, where the FM lifecycle (pre-train → fine-tune → evaluate → deploy → feedback) is a specialized version of this pipeline and where FM-specific evaluation metrics (ROUGE, BLEU) extend the metrics here. It also connects to the shared SageMaker and MLOps lessons for deeper, builder-level detail.

---

## Exam Traps

- **Trusting accuracy on imbalanced data.** A high accuracy can hide terrible recall; precision/recall/F1 tell the real story.
- **Confusing precision and recall.** Precision = correctness of positive predictions; recall = coverage of actual positives.
- **Treating a model as "done" at deployment.** Monitoring and retraining are core MLOps; models degrade as data drifts.
- **Ignoring business metrics.** A technically strong model that doesn't move ROI or satisfaction isn't a success.
- **Defaulting to custom training.** For most practitioner scenarios, a managed/pre-trained model is the lower-cost, faster choice.

---

## Summary

The AI/ML lifecycle runs from data collection and preparation through training, evaluation, deployment, monitoring, and retraining, with managed AWS services at every stage. Models can be consumed pre-trained (Bedrock), fine-tuned, or custom-trained, and served via managed APIs or self-hosting. MLOps keeps models reliable through automation, versioning, and drift monitoring, because a model is never permanently done. Judge models with the right metrics: precision (few false alarms), recall (few misses), F1 (balance), accuracy (only when classes are balanced) — and confirm a business metric like ROI or satisfaction actually improves.

---

## Examples

**Example 1 — Recall matters.** "A cancer-screening model must miss as few true cases as possible." The cost of a miss is high → optimize **recall**.

**Example 2 — Precision matters.** "An email filter must rarely block legitimate mail." The cost of a false alarm is high → optimize **precision**.

**Example 3 — MLOps loop.** "A demand-forecasting model's accuracy slipped after the holidays." Data drift detected by monitoring → trigger **retraining** and redeploy.

**Example 4 — Build vs. buy.** "We need a chatbot next month with no ML team." → consume a **managed foundation model** via Bedrock, not custom training.

---

## Think About It

A fraud model reports 99% accuracy, and the team is celebrating. Fraud is 1% of transactions. Why might this model still be nearly worthless, and which two metrics would reveal whether it actually catches fraud without drowning analysts in false alarms?

---

## Quick Check

1. Put these lifecycle stages in order: deployment, data preparation, monitoring, training.
2. What does recall measure, and when do you prioritize it?
3. Why can accuracy be misleading on imbalanced data?
4. Give two examples of business metrics for an AI solution.

*Answers: (1) data preparation → training → deployment → monitoring; (2) the share of actual positives the model catches — prioritize it when missing a positive is costly (e.g., disease, fraud); (3) a model can score high accuracy by always predicting the majority class while failing to identify the rare important cases; (4) any two of ROI, cost per user/interaction, development cost, customer satisfaction, conversion rate.*

---

## What's Next

You've completed Module 1 (Fundamentals of AI and ML). Next module: **Fundamentals of Generative AI**, starting with how GenAI works under the hood — tokens, embeddings, vectors, and transformers.
