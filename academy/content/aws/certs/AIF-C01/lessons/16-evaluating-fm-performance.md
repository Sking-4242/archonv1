---
title: "Evaluating Foundation Model Performance"
type: content
estimated_minutes: 13
cert_tags: ["AIF-C01"]
---

# Evaluating Foundation Model Performance

## Overview

How do you know whether a foundation model — or an application built on one — is actually good? Generative outputs are open-ended, often subjective, and never exactly reproducible, which makes them far harder to evaluate than a classification model where you can simply count correct predictions. The AI Practitioner exam (Domain 3, Task 3.4) asks you to describe approaches to evaluate FM performance, identify the relevant metrics, judge whether a model meets business objectives, and evaluate applications built on FMs such as RAG systems and agents. Evaluation is what turns "it sounds impressive" into "it meets the bar."

This matters because fluency is deceptive. A model can produce confident, well-written text that is subtly wrong, off-task, or biased, and without disciplined evaluation those failures slip into production. Evaluation also drives decisions throughout the lifecycle: choosing among candidate models, deciding whether fine-tuning helped, and monitoring quality over time. The practitioner's job is to know the available methods — automated metrics for scale, human review for judgment, benchmark datasets for comparison, and managed tooling like Amazon Bedrock Model Evaluation — and to choose the right mix for the task, always anchoring back to whether the model moves the **business** metric it was built for.

This lesson covers the evaluation approaches, the named metrics, how to evaluate FM-based applications, and the business-alignment view. After it you will be able to select an evaluation method, interpret the common metrics, and judge an FM application against its objective.

---

## Core Concepts

### Approaches: Human, Automated, and Benchmark

There are three complementary ways to evaluate. **Human-in-the-loop evaluation** has people review and rate outputs — the gold standard for quality, nuance, safety, and subjective tasks, but slow and costly. **Automated metrics** score outputs by formula or by another model, enabling fast, scalable, repeatable evaluation — essential for large-scale or continuous testing. **Benchmark datasets** are standardized sets of inputs with known good answers, used to compare models on common ground and against published results. Mature evaluation blends all three: benchmarks and automated metrics for breadth and speed, human review for the judgment calls and final sign-off on high-stakes use.

### Automated Metrics for Generated Text

The exam names specific metrics for evaluating generated language:

- **ROUGE (Recall-Oriented Understudy for Gisting Evaluation)** — measures overlap between the model's output and a reference, focusing on **recall**; the standard metric for **summarization** (did the summary capture the reference content?).
- **BLEU (Bilingual Evaluation Understudy)** — measures overlap focusing on **precision**; the classic metric for **machine translation** (does the translation match reference translations?).
- **BERTScore** — uses embeddings to compare the **semantic similarity** of output and reference, rather than exact word overlap; it credits answers that mean the same thing in different words, addressing a weakness of ROUGE/BLEU.
- **LLM-as-a-judge** — uses a capable foundation model to evaluate another model's outputs against criteria (helpfulness, correctness, relevance). It scales human-like judgment far more cheaply than human reviewers, and is increasingly common — though it must itself be validated.

The pattern to remember: ROUGE → summarization (recall), BLEU → translation (precision), BERTScore → semantic similarity, LLM-as-a-judge → scalable qualitative scoring.

### Amazon Bedrock Model Evaluation

**Amazon Bedrock Model Evaluation** is the managed feature for assessing and comparing foundation models on AWS. It supports automated evaluation with built-in metrics and datasets, model-as-a-judge scoring, and human evaluation workflows, helping you choose among models and validate quality without building an evaluation harness from scratch. For the exam, "evaluate or compare foundation models on AWS" points to **Bedrock Model Evaluation**.

### Evaluating Applications, Not Just Models

A foundation model rarely ships alone — it's embedded in a RAG pipeline, an agent, or a multi-step workflow, and those systems need their own evaluation beyond the raw model. For **RAG**, you evaluate retrieval quality (did it fetch the right context?) and grounding/faithfulness (did the answer stick to the retrieved facts, or hallucinate?), as well as answer relevance. For **agents**, you evaluate whether they selected the right tools, completed the task, and stayed within bounds. For **workflows**, you evaluate end-to-end task success. The lesson: evaluating the model in isolation isn't enough; you must evaluate the whole application as users experience it.

### Meeting Business Objectives

Technical scores are means, not ends. The exam stresses judging whether an FM application meets **business objectives** using alignment metrics such as **task completion rate**, **user satisfaction**, **cost per interaction**, productivity gains, and user engagement. A summarizer with a great ROUGE score that users ignore has failed; a support agent with a high **task completion rate** and rising **satisfaction** has succeeded. Always pair technical evaluation with business-outcome measurement, and define the target metric before launch.

---

## Configuration Reference

Evaluation approaches:

```text
Approach              Strength                       Trade-off
--------------------- ------------------------------ -------------------
Human-in-the-loop     judgment, nuance, safety        slow, costly
Automated metrics     fast, scalable, repeatable      may miss nuance
Benchmark datasets    standardized comparison         may not match your task
```

Metric → use:

```text
ROUGE          summarization (recall: captured the reference content)
BLEU           translation (precision: matches reference translations)
BERTScore      semantic similarity via embeddings (meaning, not exact words)
LLM-as-a-judge scalable qualitative scoring by a capable model
```

Evaluate the whole application:

```text
RAG       retrieval quality + grounding/faithfulness + answer relevance
Agents    correct tool selection + task completion + stays in bounds
Workflows end-to-end task success
```

Business-alignment metrics:

```text
task completion rate · user satisfaction · cost per interaction ·
productivity · engagement
```

---

## How to Decide

- **Need scale and speed?** → automated metrics (ROUGE/BLEU/BERTScore, LLM-as-a-judge).
- **High-stakes, subjective, or safety-critical?** → include human-in-the-loop review.
- **Comparing candidate models on AWS?** → Bedrock Model Evaluation with benchmarks.
- **Which metric?** summarization → ROUGE; translation → BLEU; meaning-based → BERTScore; broad qualitative → LLM-as-a-judge.
- **Evaluating a RAG/agent app?** → assess retrieval/grounding (RAG) or tool use/task completion (agents), not just the raw model.
- **Final judgment:** does it move the business metric (task completion, satisfaction, cost per interaction)?

---

## How This Connects

Evaluation is the lifecycle stage introduced in Module 1's metrics lesson and the FM-lifecycle lesson, now specialized for generative outputs. It validates the model-selection and parameter choices from lesson 3.1, the RAG design from 3.2, and the fine-tuning from 3.3. Grounding/faithfulness evaluation connects to Domain 5's hallucination-detection and grounding techniques, and human-in-the-loop evaluation connects to Domain 4's responsible-AI oversight (Amazon A2I).

---

## Exam Traps

- **Trusting fluency over evaluation.** Confident, well-written output can still be wrong; measure it.
- **Mismatching metric to task.** ROUGE is for summarization, BLEU for translation; don't swap them. BERTScore captures meaning beyond word overlap.
- **Evaluating only the model, not the application.** RAG and agent systems need retrieval/grounding and task-completion evaluation.
- **Stopping at technical scores.** A strong metric that doesn't improve a business outcome isn't success.
- **Forgetting human review for high-stakes outputs.** Automated metrics scale but miss nuance and safety issues.

---

## Summary

Evaluating foundation models combines human-in-the-loop review (judgment and safety), automated metrics (speed and scale), and benchmark datasets (standardized comparison), with Amazon Bedrock Model Evaluation providing managed tooling on AWS. Know the metrics: ROUGE for summarization (recall), BLEU for translation (precision), BERTScore for semantic similarity, and LLM-as-a-judge for scalable qualitative scoring. Evaluate not just the raw model but the whole application — retrieval and grounding for RAG, tool use and task completion for agents. And always anchor evaluation to business objectives — task completion rate, user satisfaction, cost per interaction — because a strong technical score that doesn't move the business metric is not success.

---

## Examples

**Example 1 — ROUGE for summarization.** A team comparing summarization models scores outputs against reference summaries with **ROUGE** for an automated, scalable comparison, then has humans review the top candidates.

**Example 2 — BLEU for translation.** A localization pipeline measures translation quality against reference translations with **BLEU**.

**Example 3 — RAG evaluation.** A document-Q&A assistant is evaluated not only on answer quality but on whether retrieval fetched the right passages and whether answers stayed grounded in them (faithfulness).

**Example 4 — Business alignment.** A support agent's success is judged by **task completion rate** and **user satisfaction**, not just a model benchmark score.

---

## Think About It

A summarization feature posts excellent ROUGE scores, yet adoption is low and users say the summaries "miss the point." Explain how the technical metric and the business outcome can disagree, and what evaluation you would add (think human-in-the-loop and a business metric) to get the full picture.

---

## Quick Check

1. Name the three broad approaches to evaluating foundation models.
2. Which metric fits summarization, and which fits translation?
3. How does BERTScore differ from ROUGE and BLEU?
4. Beyond the raw model, what must you evaluate in a RAG application?

*Answers: (1) human-in-the-loop evaluation, automated metrics, and benchmark datasets; (2) ROUGE for summarization, BLEU for translation; (3) BERTScore uses embeddings to measure semantic similarity (meaning), crediting correct answers phrased differently, rather than exact word overlap; (4) retrieval quality and grounding/faithfulness (did it fetch the right context and stay grounded in it), plus answer relevance.*

---

## What's Next

You've completed Module 3 (Applications of Foundation Models), the largest domain. Next module: **Guidelines for Responsible AI** — bias, fairness, safety, transparency, and the AWS tools that support them.
