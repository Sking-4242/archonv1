---
title: "Training and Fine-Tuning Foundation Models"
type: content
estimated_minutes: 13
cert_tags: ["AIF-C01"]
---

# Training and Fine-Tuning Foundation Models

## Overview

Sometimes prompting and retrieval are not enough — you need to actually change the model itself, teaching it a specialized skill, a domain's language, or a consistent behavior it doesn't have out of the box. That is the realm of **training and fine-tuning**. The AI Practitioner exam (Domain 3, Task 3.3) asks you to describe the key elements of training a foundation model, the methods for fine-tuning one, and how to prepare data for fine-tuning. You are not expected to run a training job, but you are expected to understand what each training method does, when it is appropriate, and why data preparation makes or breaks the result.

The big picture from the FM lifecycle lesson still holds: pre-training is the expensive, provider-led step that creates the base model, and most organizations never do it. Fine-tuning is the accessible, organization-led step that adapts that base. But "fine-tuning" is an umbrella over several methods that differ in cost, data needs, and what they change — instruction tuning, domain adaptation, transfer learning, continued pre-training, and distillation. Choosing among them, and recognizing when *not* to fine-tune at all (because prompting or RAG would do), is the practitioner judgment the exam tests. And underneath every method is the same truth: a fine-tuned model is only as good as the data it was tuned on, so data curation, quality, representativeness, and governance are central, not incidental.

This lesson explains the training methods, the role of RLHF, and how to prepare data for fine-tuning. After it you will be able to describe each adaptation method and when it applies, and explain what good fine-tuning data looks like.

---

## Core Concepts

### The Training Spectrum

Adapting a model spans a spectrum of cost and depth. **Pre-training** creates the base model from scratch on massive data — provider-scale, highest cost. **Continued (or continual) pre-training** further trains an existing base model on a large corpus of *domain* text (say, medical or legal literature) to deepen its general knowledge of that domain — still data- and compute-heavy. **Fine-tuning** trains the model on a smaller, task-specific labeled dataset to adapt its behavior or skill — far cheaper. **Distillation** trains a smaller "student" model to mimic a larger "teacher" model, producing a cheaper, faster model that retains much of the capability — used to cut inference cost. The exam expects you to place these on the spectrum and match them to needs: deep domain knowledge → continued pre-training; specific task/behavior → fine-tuning; lower inference cost → distillation.

### Methods of Fine-Tuning

Within fine-tuning, the exam names several approaches:

- **Instruction tuning** — fine-tuning on examples of instructions paired with desired responses, teaching the model to follow instructions in a particular way or style. This is how base models become good at doing what they're told.
- **Domain adaptation** — fine-tuning on data from a specific field so the model handles its vocabulary, conventions, and tasks better (e.g., adapting a general model to financial or clinical text).
- **Transfer learning** — the general principle underlying fine-tuning: take a model that learned general patterns and transfer that knowledge to a new, related task with relatively little new data, rather than training from scratch.
- **Continued pre-training** — as above, extending the base model's knowledge with more unlabeled domain text (broader than task-specific fine-tuning).

The common thread: you start from a capable base and make a targeted change, which is dramatically more efficient than training from zero.

### Reinforcement Learning from Human Feedback (RLHF)

**RLHF** is a specialized alignment method: humans rank or rate model outputs, those preferences train a reward model, and the foundation model is then optimized to produce outputs humans prefer. RLHF is how models are aligned to be more helpful, honest, and harmless — turning a raw next-token predictor into a well-behaved assistant. For the exam, know RLHF as the technique that uses **human feedback as the training signal** to align model behavior with human preferences, connecting the reinforcement-learning paradigm from Module 1 to foundation models.

### When to Fine-Tune (and When Not To)

Fine-tuning is the right tool when you need to change the model's **behavior, tone, format, or specialized skill** in a way that prompting and retrieval cannot achieve, and you have good labeled data. It is the *wrong* tool when the real need is **knowledge** — especially private or frequently changing facts — because RAG supplies that more cheaply and stays current, or when prompt engineering already gets you there. The cost ranking from the RAG lesson governs: try prompt engineering, then RAG, and reach for fine-tuning when those genuinely fall short. Fine-tuning also incurs ongoing cost: a custom fine-tuned model must be hosted, and may need re-tuning as needs evolve.

### Preparing Data to Fine-Tune

Every fine-tuning method depends on data quality. The exam highlights the data-preparation considerations:

- **Curation** — selecting relevant, high-quality examples that reflect the target task.
- **Governance** — managing data lawfully and responsibly: permissions, privacy, lineage.
- **Size** — enough examples to learn the pattern, but quality matters more than raw volume.
- **Labeling** — accurate labels/targets; mislabeled data teaches the wrong thing.
- **Representativeness** — data that covers the real distribution of cases, so the model generalizes and doesn't inherit gaps or bias.

Poor data is the most common cause of poor fine-tuning. Biased, unrepresentative, or low-quality data produces a biased, unreliable model — a direct bridge to the responsible-AI domain.

---

## Configuration Reference

The adaptation spectrum:

```text
Method                 Changes                         Cost / data
---------------------- ------------------------------- ----------------------
Pre-training           creates base from scratch       $$$$ provider-scale
Continued pre-training extends domain knowledge         $$$ large domain corpus
Fine-tuning            task behavior/skill/style        $$ smaller labeled set
  Instruction tuning   how it follows instructions      labeled instruction/response pairs
  Domain adaptation    domain vocabulary/tasks          domain-specific data
  Transfer learning    (the principle behind fine-tuning) reuse general knowledge
Distillation           smaller model mimics bigger one  training; cuts inference cost
RLHF                   aligns to human preferences      human rankings → reward model
```

Fine-tuning data checklist:

```text
Curation         relevant, high-quality examples
Governance       privacy, permissions, lineage
Size             enough examples (quality > raw volume)
Labeling         accurate targets
Representativeness covers the real case distribution; avoids bias
```

When to fine-tune vs. alternatives:

```text
Need behavior/tone/format/skill the base lacks  → fine-tune
Need private or changing KNOWLEDGE              → RAG (cheaper, current)
Simple steering achievable in the prompt        → prompt engineering
Lower inference cost from a big model            → distillation
```

---

## How to Decide

- **Is the need *knowledge* (facts, especially private/changing)?** → RAG, not fine-tuning.
- **Is the need *behavior/skill/style* the base can't do, with good labeled data available?** → fine-tuning (instruction tuning or domain adaptation).
- **Need deep, broad domain expertise?** → continued pre-training.
- **Need a cheaper, faster model with similar quality?** → distillation.
- **Aligning model behavior to human preferences?** → RLHF.
- **Before any training:** confirm prompt engineering and RAG truly fall short — they're cheaper.

---

## How This Connects

This lesson deepens the fine-tuning step from the FM-lifecycle lesson and completes the customization-cost comparison started in the RAG lesson. RLHF ties back to the reinforcement-learning paradigm in Module 1. Data preparation — curation, representativeness, governance — leads directly into Domain 4 (bias, fairness, dataset characteristics) and Domain 5 (data governance, secure data engineering). It also reuses the shared SageMaker lesson for builder-level training detail.

---

## Exam Traps

- **Fine-tuning to add knowledge.** Use RAG for private or changing facts; fine-tune for behavior, style, or skill.
- **Confusing continued pre-training with fine-tuning.** Continued pre-training extends broad domain knowledge on large corpora; fine-tuning targets a specific task on a smaller labeled set.
- **Treating distillation as accuracy improvement.** Distillation produces a smaller, cheaper, faster model — the goal is efficiency, not higher accuracy.
- **Underrating data quality.** Biased or unrepresentative fine-tuning data yields a biased, unreliable model.
- **Forgetting RLHF uses human feedback.** Its training signal is human preference, used to align behavior.

---

## Summary

Adapting foundation models spans a cost-and-depth spectrum: provider-scale pre-training creates the base; continued pre-training extends domain knowledge; fine-tuning (via instruction tuning, domain adaptation, and the broader principle of transfer learning) adapts task behavior and skill on a smaller labeled set; and distillation produces a cheaper, faster model that mimics a larger one. RLHF aligns models to human preferences using human feedback as the training signal. Fine-tune when you need behavior, tone, format, or specialized skill the base lacks — but use RAG for knowledge and prompting for simple steering, since both are cheaper. Above all, fine-tuning quality depends on well-curated, representative, accurately labeled, and governed data.

---

## Examples

**Example 1 — Instruction tuning.** A model should always respond in a strict support-ticket format. **Fine-tuning (instruction tuning)** on example tickets teaches the behavior.

**Example 2 — Domain adaptation.** A general model struggles with clinical terminology. **Domain adaptation** (fine-tuning on medical text) improves its handling of the vocabulary.

**Example 3 — Distillation.** A large model is too slow and costly for production. **Distillation** yields a smaller model with similar quality at lower inference cost.

**Example 4 — Wrong tool.** A team plans to fine-tune monthly to keep facts current; **RAG** is the better, cheaper, always-current choice for that *knowledge* need.

---

## Think About It

A bank wants its assistant to (a) always speak in a precise, compliant tone and (b) answer using this week's interest rates. Which need calls for fine-tuning and which calls for RAG — and what would go wrong if they tried to solve both with fine-tuning alone?

---

## Quick Check

1. Where does fine-tuning sit relative to pre-training in cost and scope?
2. What does RLHF use as its training signal, and what is it for?
3. Name three data-preparation considerations for fine-tuning.
4. When should you use RAG instead of fine-tuning?

*Answers: (1) fine-tuning starts from an existing base model and adapts it to a task on a smaller labeled dataset, at far lower cost and narrower scope than provider-scale pre-training; (2) human feedback (preference rankings turned into a reward model), used to align the model's behavior with human preferences; (3) any three of curation, governance, size, labeling accuracy, representativeness; (4) when the need is knowledge — especially private or frequently changing facts — because RAG is cheaper and stays current without retraining.*

---

## What's Next

Next: **Evaluating Foundation Model Performance** — human and automated evaluation, the metrics (ROUGE, BLEU, BERTScore, LLM-as-a-judge), and how to judge whether an FM application meets business objectives.
