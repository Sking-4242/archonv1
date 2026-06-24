---
title: "AI, ML, Deep Learning, and GenAI: Concepts and Terminology"
type: content
estimated_minutes: 12
cert_tags: ["AIF-C01"]
---

# AI, ML, Deep Learning, and GenAI: Concepts and Terminology

## Overview

The AI Practitioner exam opens with vocabulary, and getting the vocabulary precisely right is worth more points than it looks. Much of Domain 1 — and a surprising number of questions across the whole exam — turns on whether you can correctly distinguish artificial intelligence from machine learning, machine learning from deep learning, and traditional ML from generative AI. These terms are used loosely in everyday conversation, but the exam uses them precisely, and the distractors are built from the common confusions.

This lesson defines the core terms and, more importantly, shows how they nest inside one another. Artificial intelligence is the broad goal of making machines perform tasks that normally require human intelligence. Machine learning is one approach to AI in which systems learn patterns from data rather than following hand-written rules. Deep learning is a subfield of machine learning that uses many-layered neural networks. Generative AI is an application of deep learning that creates new content. Agentic AI adds autonomous, goal-directed action on top of generative models. Each is a subset of the one before — a set of nested circles, not separate things.

You are a *user* of these technologies for this exam, not a builder, so the goal is conceptual fluency: knowing what each term means, how the layers relate, and which label applies to a given scenario. After this lesson you will be able to read any AIF question's framing and immediately place it at the right level of the AI hierarchy.

---

## Core Concepts

### The Nesting: AI ⊃ ML ⊃ Deep Learning ⊃ GenAI

Picture concentric circles. The outermost is **Artificial Intelligence (AI)**: any technique that lets machines mimic human intelligence — including old-fashioned rule-based systems. Inside it is **Machine Learning (ML)**: systems that improve at a task by learning statistical patterns from data instead of being explicitly programmed with rules. Inside ML is **Deep Learning (DL)**: ML that uses *neural networks* with many layers to learn complex patterns directly from raw data (images, audio, text). Inside DL is **Generative AI (GenAI)**: deep-learning models that *generate* new content rather than only classifying or predicting. The exam loves questions that hinge on this nesting — for example, "is generative AI a type of machine learning?" (yes, it is a subset).

### Neural Networks and Why "Deep"

A **neural network** is a model loosely inspired by the brain: layers of interconnected nodes ("neurons") that transform input into output, with the strength of connections ("weights") adjusted during training. "Deep" simply means *many* hidden layers. Depth lets the network learn hierarchical features — early layers detect edges in an image, later layers detect shapes, then objects — without a human specifying those features. This is why deep learning dominates **computer vision** (interpreting images and video) and **natural language processing (NLP)** (understanding and generating human language).

### Model, Algorithm, Training, and Inference

Four terms that are easy to blur. An **algorithm** is the procedure used to learn from data (the method). A **model** is the *result* of running that algorithm on data — the learned artifact that makes predictions. **Training** is the process of feeding data to the algorithm so the model's parameters are adjusted to fit the patterns. **Inference** is using the trained model to produce an output (a prediction or generated content) on new input. Plainly: the algorithm trains a model; the model performs inference. Mixing up "algorithm" and "model," or "training" and "inference," is a classic distractor.

### Large Language Models and Generative AI

A **large language model (LLM)** is a deep-learning model trained on vast amounts of text to predict and generate language. LLMs are the engines behind most generative-AI text applications — chat assistants, summarization, code generation. **Generative AI** is broader than text: it also generates images, audio, and video. A **foundation model (FM)** is a large, general-purpose model (often an LLM, but also multimodal) pre-trained on broad data and adaptable to many downstream tasks — the building block for GenAI applications on AWS.

### Agentic AI

**Agentic AI** extends generative models with the ability to *act*: an AI agent can plan, call tools or APIs, use memory, and take a sequence of steps toward a goal with limited human intervention. Where a plain LLM responds to a single prompt, an agent can break a task into steps, fetch information, invoke functions, and iterate. This is the newest term in the exam's vocabulary; for the foundational level you need the concept (autonomous, goal-directed, tool-using), not the implementation.

### Bias, Fairness, and Fit

Three quality terms introduced here and deepened in Domain 4. **Bias** is systematic error that skews a model's outputs (e.g., favoring one group). **Fairness** is the goal of equitable outcomes across groups. **Fit** describes how well a model matches the underlying pattern: **overfitting** means it memorized the training data and generalizes poorly; **underfitting** means it failed to learn the pattern at all. Good models generalize — they fit the signal, not the noise.

### Narrow AI and the Limits of Today's Systems

A piece of context that sharpens the vocabulary: essentially all AI in production today is **narrow AI** (also called weak AI) — systems built to do a specific task or a bounded set of tasks well, such as recognizing faces, translating text, or generating prose. Even the most capable foundation models, impressive as they are across many tasks, are still narrow in the sense that they do not possess general human-like understanding or independent goals. This contrasts with the hypothetical idea of **artificial general intelligence (AGI)** — a system with broad, human-level reasoning across any domain — which does not exist today and is not what these services provide. Keeping this in mind prevents two common errors: over-trusting a model as if it truly "understands," and under-appreciating how powerful narrow systems already are within their scope. For the exam, treat every AWS AI service as a capable narrow tool applied to a defined problem, not a general intelligence.

### Why Precise Terminology Wins Points

It is worth stating plainly why this lesson matters so much for the exam. AWS writes distractor answers from the *common confusions* between these terms — labeling a rule-based system "machine learning," calling generative AI something separate from ML, or swapping "training" and "inference." A candidate who holds the nested hierarchy and the precise definitions firmly in mind can eliminate those distractors instantly, while a candidate with only a fuzzy sense of the words will find several answers that all "sound right." Precision here is not pedantry; it is points.

---

## Configuration Reference

The hierarchy and the key distinctions, condensed:

```text
AI            mimic human intelligence (includes rule-based systems)
 └ ML         learn patterns from data instead of explicit rules
    └ Deep Learning   multi-layer neural networks; powers CV and NLP
        └ GenAI       generate new content (text, image, audio, video)
            └ Agentic AI   GenAI that plans, uses tools, and acts toward goals
```

Term pairs the exam tests:

```text
Algorithm  vs  Model        method  vs  learned artifact
Training   vs  Inference    learning  vs  using the model
LLM        vs  FM           language model  vs  general/multimodal base model
Overfitting vs Underfitting memorized noise  vs  failed to learn signal
ML         vs  GenAI        predict/classify  vs  generate content (GenAI ⊂ ML)
```

---

## How to Decide

When a question asks you to label a technology or scenario:

- **Is content being *generated* (text, image, code, audio)?** → Generative AI.
- **Does the system *act* autonomously with tools/steps toward a goal?** → Agentic AI.
- **Is a model *learning from data* to predict or classify?** → Machine learning (deep learning if neural networks on raw images/text/audio).
- **Are rules hand-written with no learning?** → AI, but *not* ML.

---

## How This Connects

This lesson is the vocabulary foundation for the entire AIF-C01 curriculum. Learning types (supervised/unsupervised/reinforcement) build on "ML" here; the GenAI module builds on "FM," "LLM," and "GenAI"; the responsible-AI module deepens "bias," "fairness," and "fit." Every later module assumes these definitions, so anchor them now.

---

## Exam Traps

- **Treating GenAI and ML as separate.** Generative AI is a subset of machine learning (specifically deep learning), not a parallel category.
- **Confusing algorithm with model.** The algorithm is the learning method; the model is what it produces.
- **Confusing training with inference.** Training builds the model; inference uses it.
- **Calling every AI system "machine learning."** Rule-based systems are AI but not ML — no learning from data.
- **Equating LLM with FM.** All LLMs are foundation models, but foundation models also include multimodal/image models.

---

## Summary

The AI Practitioner vocabulary nests: AI contains ML, ML contains deep learning, deep learning contains generative AI, and agentic AI adds autonomous, tool-using action on top. Neural networks with many layers ("deep") power computer vision and NLP. An algorithm trains a model; the model performs inference. LLMs are text-focused foundation models; foundation models are broad, adaptable base models for GenAI. Bias, fairness, and fit (over/underfitting) describe model quality. Mastering these precise distinctions is the highest-leverage first step for the exam.

---

## Examples

**Example 1 — Labeling correctly.** "A system writes a marketing email from a prompt." Content is generated → **generative AI** (built on an LLM/foundation model).

**Example 2 — Not ML.** "A tax program applies fixed if-then rules to compute a refund." Rule-based, no learning → **AI but not machine learning**.

**Example 3 — Agentic.** "An assistant reads a ticket, looks up the order in a database, issues a refund, and emails the customer." Plans and uses tools toward a goal → **agentic AI**.

---

## Think About It

Someone claims "generative AI and machine learning are two different fields." Using the nested-circles model, how would you correct them — and where exactly do deep learning and large language models sit relative to both?

---

## Quick Check

1. Place these from broadest to narrowest: deep learning, AI, generative AI, machine learning.
2. What is the difference between an algorithm and a model?
3. What distinguishes inference from training?
4. Is a hand-coded rule-based system considered machine learning? Why or why not?

*Answers: (1) AI → machine learning → deep learning → generative AI; (2) the algorithm is the learning method, the model is the learned artifact it produces; (3) training adjusts the model's parameters from data, inference uses the finished model to produce outputs on new input; (4) no — it follows explicit hand-written rules and does not learn patterns from data.*

---

## What's Next

Next: **Types of Machine Learning — Supervised, Unsupervised, and Reinforcement Learning**, which classifies *how* models learn from data and introduces the regression/classification/clustering techniques the exam asks you to match to use cases.
