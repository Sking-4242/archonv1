---
title: "Types of Machine Learning: Supervised, Unsupervised, and Reinforcement"
type: content
estimated_minutes: 11
cert_tags: ["AIF-C01"]
---

# Types of Machine Learning: Supervised, Unsupervised, and Reinforcement

## Overview

Once you know that machine learning means learning patterns from data, the next question is *how* a model learns — and the answer determines what problems it can solve and what data it needs. The AI Practitioner exam expects you to distinguish the three principal learning paradigms (supervised, unsupervised, and reinforcement learning) and to match common techniques — regression, classification, clustering — to the right paradigm and use case.

This matters because the learning type is dictated by your data and your goal, not by preference. If you have historical examples with known answers, you can learn to predict those answers (supervised). If you only have raw data and want to discover structure, you look for natural groupings (unsupervised). If you have an agent that should learn good behavior through trial and reward, you train it by feedback (reinforcement). Choosing the wrong paradigm for the data is a conceptual error the exam tests directly.

This lesson defines each paradigm, ties the standard techniques to it, and gives the tells that map a scenario to a learning type. After it you will be able to read a use case and name both the learning type and the technique it calls for.

---

## Core Concepts

### Supervised Learning — Learning from Labeled Examples

In **supervised learning**, the training data is **labeled**: each example includes the correct answer. The model learns the mapping from inputs to outputs so it can predict the label for new, unseen inputs. Supervised learning splits into two technique families. **Classification** predicts a *category* (spam or not spam; cat, dog, or bird; fraud or legitimate). **Regression** predicts a *continuous number* (tomorrow's temperature, a house price, expected sales). The defining requirement is labeled data — you must have examples with known outcomes to learn from. Tells: "predict," "classify," "based on historical labeled data."

### Unsupervised Learning — Finding Structure in Unlabeled Data

In **unsupervised learning**, the data is **unlabeled** — there are no correct answers provided. The model discovers structure on its own. The dominant technique is **clustering**: grouping similar data points together (e.g., segmenting customers into behavioral groups without predefined categories). Other unsupervised tasks include **dimensionality reduction** (simplifying data while keeping its structure) and **anomaly detection** (flagging unusual points). The defining trait is the *absence of labels* and a goal of *discovery* rather than prediction. Tells: "segment," "group," "find patterns/structure," "no labeled data," "discover."

### Reinforcement Learning — Learning by Reward

In **reinforcement learning (RL)**, an **agent** learns by interacting with an environment and receiving **rewards or penalties** for its actions, gradually learning a strategy (policy) that maximizes cumulative reward. There is no labeled dataset of correct answers; the agent learns from the consequences of its choices through trial and error. RL powers robotics, game-playing AI, and recommendation/optimization problems where good behavior is defined by outcomes over time. Notably, **reinforcement learning from human feedback (RLHF)** — covered later — uses human preference signals as the reward to align foundation models. Tells: "agent," "trial and error," "reward," "learns optimal actions/policy over time."

### Semi-Supervised and Self-Supervised Learning

Real projects rarely have perfectly labeled data, so two hybrid approaches matter. **Semi-supervised learning** uses a small amount of labeled data together with a large amount of unlabeled data — the model learns from the few labels and the structure of the many unlabeled examples. This is valuable precisely because labeling is expensive and slow while unlabeled data is abundant, so a little labeling can go a long way. **Self-supervised learning** goes further: it generates its own labels from the structure of the data itself — for example, hiding part of a sentence and training the model to predict the missing words. No human labeling is required, yet the model learns rich patterns. Self-supervised learning is the engine behind modern foundation models, which is why they can be trained on internet-scale text without anyone labeling it. For the exam, recognize these as practical answers to the "labels are costly" problem that sits between fully supervised and fully unsupervised learning.

### Where Foundation Models Fit

Foundation models are trained on enormous unlabeled text corpora using **self-supervised** learning (a form of learning where the model predicts missing parts of its own input), then often refined with supervised fine-tuning and RLHF. For the foundational exam, the key point is that the same paradigms underlie even cutting-edge GenAI — pre-training is largely self-supervised, alignment uses reinforcement from human feedback. This is a useful reminder that the three classic paradigms are not abstract theory; they are the literal building blocks of the generative systems the rest of this course covers.

### Common Algorithms by Paradigm

You don't need to implement algorithms for this exam, but recognizing a few names and which paradigm they belong to helps with terminology questions. Under **supervised learning**, common methods include linear regression and logistic regression, decision trees and random forests, gradient-boosted trees, and neural networks — used for the regression and classification tasks above. Under **unsupervised learning**, k-means is the classic clustering algorithm, and principal component analysis (PCA) is a common dimensionality-reduction method. **Reinforcement learning** uses methods that learn a policy from rewards, such as Q-learning and policy-gradient approaches. The takeaway is not the math but the association: when you see "k-means," think clustering and unsupervised; when you see "regression" or "decision tree," think supervised. AWS managed services and foundation models sit on top of these underlying methods, so a practitioner mostly selects the right *type* of learning and lets the service handle the algorithm.

### Choosing the Technique

The technique follows the data and the goal: labeled + predict a category → classification; labeled + predict a number → regression; unlabeled + group → clustering; agent + reward signal → reinforcement learning. This four-way mapping is the single most reusable decision in Domain 1, and it is worth committing to memory because it appears, in various disguises, throughout the use-case and foundation-model material that follows.

---

## Configuration Reference

The learning-type decision table:

```text
Data you have            Goal                        Paradigm / Technique
------------------------ --------------------------- -------------------------
Labeled examples         Predict a category          Supervised → Classification
Labeled examples         Predict a number            Supervised → Regression
Unlabeled data           Group / find structure      Unsupervised → Clustering
Unlabeled data           Flag unusual points         Unsupervised → Anomaly detection
Agent + reward signal    Learn best actions over time Reinforcement learning
```

Keyword-to-paradigm decoder:

```text
"predict price / amount / demand"        → Regression (supervised)
"is this X or Y / categorize / detect"   → Classification (supervised)
"segment customers / group / discover"   → Clustering (unsupervised)
"no labels available"                     → Unsupervised
"reward / trial and error / agent policy" → Reinforcement learning
```

---

## How to Decide

- **Do you have labeled examples with known answers?** → Supervised. Then: category → classification; number → regression.
- **Only unlabeled data, and you want to discover groupings or anomalies?** → Unsupervised (clustering / anomaly detection).
- **An agent that should learn good behavior from rewards over time?** → Reinforcement learning.
- **Predicting a specific known quantity vs. exploring unknown structure** is usually the fastest way to split supervised from unsupervised.

---

## How This Connects

This lesson builds on the AI/ML vocabulary lesson (it specializes the "ML" circle) and feeds the use-case lesson (matching techniques to business problems) and the GenAI modules (where self-supervised pre-training and RLHF reappear). The labeled-vs-unlabeled distinction also connects to the data-types lesson that follows.

---

## Exam Traps

- **Assuming all ML needs labels.** Only supervised learning requires labeled data; unsupervised works on unlabeled data.
- **Confusing classification with regression.** Category → classification; continuous number → regression.
- **Calling clustering "classification."** Clustering is unsupervised grouping with no predefined labels; classification assigns known labels.
- **Forcing reinforcement learning onto static datasets.** RL needs an environment and reward feedback, not a fixed labeled set.
- **Overlooking self-supervised pre-training** as the basis of foundation models.

---

## Summary

Machine learning comes in three paradigms. Supervised learning uses labeled data to predict outcomes — classification for categories, regression for numbers. Unsupervised learning finds structure in unlabeled data — clustering to group, plus anomaly detection and dimensionality reduction. Reinforcement learning trains an agent through rewards and penalties to learn an optimal policy over time. Foundation models combine self-supervised pre-training with supervised fine-tuning and reinforcement from human feedback. Match the paradigm and technique to your data and goal: that mapping is the core Domain 1 skill.

---

## Examples

**Example 1 — Regression.** "Estimate next quarter's revenue from years of labeled sales data." Labeled + numeric prediction → **supervised regression**.

**Example 2 — Clustering.** "Group website visitors into segments without predefined categories." Unlabeled + grouping → **unsupervised clustering**.

**Example 3 — Classification.** "Flag each transaction as fraudulent or legitimate using labeled history." Labeled + category → **supervised classification**.

**Example 4 — Reinforcement.** "Train a warehouse robot to navigate efficiently by rewarding faster routes." Agent + reward → **reinforcement learning**.

---

## Think About It

A retailer has millions of purchase records but no predefined customer categories, and wants to "discover natural customer groups" to target promotions. Which learning paradigm and technique fit — and how would the answer change if they instead had labeled "churned / retained" customers and wanted to predict churn?

---

## Quick Check

1. Which learning paradigm requires labeled data?
2. Classification vs. regression — what does each predict?
3. What is the goal of clustering, and which paradigm is it?
4. What signal does a reinforcement-learning agent learn from?

*Answers: (1) supervised learning; (2) classification predicts a category, regression predicts a continuous number; (3) to group similar data points without predefined labels — unsupervised learning; (4) rewards and penalties from interacting with its environment.*

---

## What's Next

Next: **Data and Inference in AI Systems** — the data types models consume (labeled/unlabeled, structured/unstructured, tabular/text/image/time-series) and the inference modes (batch, real-time, asynchronous, serverless) the exam asks you to match to requirements.
