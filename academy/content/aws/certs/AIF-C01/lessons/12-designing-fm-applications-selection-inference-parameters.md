---
title: "Designing FM Applications: Selection Criteria and Inference Parameters"
type: content
estimated_minutes: 14
cert_tags: ["AIF-C01"]
---

# Designing FM Applications: Selection Criteria and Inference Parameters

## Overview

Applications of foundation models is the largest domain on the AI Practitioner exam — 28% of scored content — and it begins with two practical design skills: choosing the right foundation model for an application, and tuning the inference parameters that shape how that model responds. Domain 3, Task 3.1 asks you to identify FM selection criteria and to describe the effect of inference parameters on model responses. These are the day-to-day decisions of anyone building with foundation models, and the exam tests them directly with scenario questions.

The two skills are linked. Selecting a model narrows the field to one that fits your requirements — cost, latency, modality, capability, context length. Then inference parameters fine-tune the behavior of whichever model you chose, controlling how creative or how focused its outputs are and how long they run. A team that picks a capable model but leaves its parameters at defaults often gets outputs that are too random for a factual task or too rigid for a creative one. Conversely, no amount of parameter tuning fixes a fundamentally wrong model choice. Getting both right is what separates a reliable FM application from a frustrating one.

This lesson covers the selection criteria first, then the inference parameters, with the decision logic the exam rewards. After it you will be able to choose a foundation model on the right dimensions and tune temperature, top-p, and length to match a task.

---

## Core Concepts

### Selection Criteria — Matching the Model to the Job

There is no universally best foundation model — only the best fit for a specific application. The exam lists the criteria you weigh:

- **Cost** — token-based pricing and total spend; often the deciding factor at scale.
- **Modality** — does the task need text, images, or multi-modal (e.g., image-plus-text) capability?
- **Latency** — interactive experiences need fast responses; batch jobs tolerate slower, cheaper models.
- **Multi-lingual support** — does the application serve users in multiple languages?
- **Model size and complexity** — larger models are often more capable but slower and costlier; smaller models can be cheaper, faster, and entirely sufficient for simpler tasks.
- **Customization** — how easily the model can be fine-tuned or adapted, if you need that.
- **Input/output length (context window)** — how much text the model can take in and produce; long-document tasks need large context windows.
- **Prompt caching** — the ability to reuse and cache repeated portions of prompts (such as a long fixed instruction or context) to cut cost and latency on repeated calls.

The recurring exam insight, carried from the model-selection lesson: do not reflexively pick the biggest or most capable model. Start from the application's hard requirements and choose the **smallest, cheapest, fastest model that meets the quality bar**.

### Context Window and Prompt Caching

The **context window** — measured in tokens — is the maximum amount of text the model can consider in a single request, covering both your input and its output. A small context window forces you to summarize or chunk long inputs; a large one lets you include more context (entire documents, long conversations) at the cost of more tokens. **Prompt caching** addresses a common inefficiency: when many requests share a large, unchanging prefix (a long system prompt or a fixed reference document), caching that prefix lets the model skip reprocessing it each time, reducing both latency and cost. Recognizing when a workload has repeated context is the tell for prompt caching as a cost lever.

### Inference Parameters — Shaping the Output

Once a model is chosen, **inference parameters** control how it generates. These are set per request and don't change the model itself; they change its behavior. The exam focuses on a few:

**Temperature** controls randomness. A **low temperature** (near 0) makes the model more deterministic and focused — it strongly favors the most likely next token, producing consistent, conservative output. A **high temperature** makes the model more random and creative — it considers less likely tokens, producing varied, novel output. For factual, precise tasks (extracting data, answering from a document), use low temperature; for creative tasks (brainstorming, story writing), use higher temperature.

**Top-p (nucleus sampling)** also controls randomness, by limiting choices to the smallest set of tokens whose probabilities add up to *p*. A low top-p restricts the model to only the most probable tokens (focused); a high top-p allows a wider pool (diverse). Temperature and top-p both tune the randomness/creativity dial from slightly different angles; you typically adjust one primarily.

**Maximum length (max tokens)** caps how many tokens the model may generate. It controls response length, prevents runaway output, and directly bounds output cost. Set it generously enough to complete the task but no larger than needed.

Other parameters you may see include **top-k** (limit to the *k* most likely tokens) and **stop sequences** (strings that tell the model to stop generating). The principle across all of them: parameters trade off focus/consistency against diversity/creativity, and bound length/cost.

### Putting Selection and Parameters Together

A complete design decision reads like this: a customer-support assistant that must answer accurately from policy documents needs a model with a sufficient context window and good instruction-following, run at **low temperature** for consistency, with a **max length** sized to a concise answer — and, if every request shares the same long policy preamble, **prompt caching** to cut cost. A creative-copy generator, by contrast, uses a higher temperature for variety. Same machinery, opposite settings, driven by the task.

---

## Configuration Reference

FM selection criteria:

```text
Criterion            Ask
-------------------- ----------------------------------------------
Cost                 token price and total spend acceptable?
Modality             text / image / multi-modal needed?
Latency              interactive (fast) or batch (tolerant)?
Multi-lingual        which languages must it support?
Size/complexity      is a smaller, cheaper, faster model enough?
Customization        will we need to fine-tune/adapt it?
Context window       how long are inputs and outputs?
Prompt caching       do requests share a large fixed prefix?
```

Inference parameters and their effect:

```text
Parameter      Low value                 High value
-------------- ------------------------- --------------------------
Temperature    focused, deterministic    creative, random
Top-p          narrow token pool, focused wider pool, diverse
Max length     short, bounded output      longer output (more cost)
Stop sequences end generation at a marker  —
```

Task → settings:

```text
Factual / extraction / consistent answers → LOW temperature (and top-p)
Creative / brainstorming / varied output  → HIGHER temperature
Repeated long fixed context                → enable prompt caching
Control cost / avoid runaway output        → set a sensible max length
```

---

## How to Decide

- **Selecting a model:** list hard requirements (modality, latency, context length, languages, budget), then choose the **smallest model that meets the quality bar**, not the largest.
- **Long documents or conversations?** → require a large enough **context window**; if a big fixed prefix repeats, add **prompt caching**.
- **Tuning behavior:** factual/precise → **low temperature**; creative/varied → **higher temperature**; always set a **max length** appropriate to the task.
- **Cost pressure:** smaller model, shorter prompts/outputs, prompt caching, and (next lesson) RAG to send only relevant context.

---

## How This Connects

This lesson operationalizes the model-selection factors introduced in Domain 2 and the token concepts from "how GenAI works." It sets up the rest of Domain 3: RAG (which manages context for long-document tasks), prompt engineering (which works alongside parameters to shape outputs), and evaluation (which measures whether your chosen model and settings meet the bar). Temperature's link to randomness also connects to the nondeterminism and hallucination themes from Domain 2.

---

## Exam Traps

- **Choosing the biggest model by default.** Match requirements; a smaller, cheaper, faster model often wins.
- **High temperature for factual tasks.** Randomness undermines accuracy and consistency; use low temperature for precise, factual work.
- **Confusing temperature and max length.** Temperature controls randomness/creativity; max length controls output length and cost.
- **Ignoring the context window.** Long-document tasks fail on models with small context windows; size the window to the input.
- **Overlooking prompt caching** when many requests share a large fixed prefix — a missed cost and latency win.

---

## Summary

Designing a foundation-model application starts with selecting a model on the right criteria — cost, modality, latency, multi-lingual support, size/complexity, customization, context window, and prompt caching — choosing the smallest model that meets the quality bar rather than the largest by default. Then inference parameters shape the chosen model's behavior per request: temperature and top-p trade focus and consistency against creativity and diversity (low for factual tasks, higher for creative ones), and maximum length bounds response length and output cost. Large context windows handle long inputs, and prompt caching cuts cost when requests share a big fixed prefix. Right model plus right parameters is what makes an FM application reliable.

---

## Examples

**Example 1 — Low temperature.** A tool extracts structured fields from contracts and must be consistent and accurate. Use a strong instruction-following model at **low temperature** with a bounded **max length**.

**Example 2 — High temperature.** A marketing brainstorm generator should produce many varied ideas. Use a **higher temperature** for diversity.

**Example 3 — Context window.** Summarizing 80-page reports requires a model with a **large context window**; a small-window model would force heavy chunking.

**Example 4 — Prompt caching.** A support bot prepends the same 3,000-token policy document to every request. **Prompt caching** that fixed prefix cuts per-request cost and latency.

---

## Think About It

A team complains their document-Q&A assistant "makes things up and gives different answers each time." Before changing models, which single inference parameter would you adjust and in which direction — and which selection criterion (hint: it limits how much of the document the model can see) might also be the root cause?

---

## Quick Check

1. Should you default to the largest, most capable foundation model? Why or why not?
2. What does temperature control, and which setting suits factual tasks?
3. What does the maximum-length parameter bound, and why does it affect cost?
4. When is prompt caching a useful cost lever?

*Answers: (1) no — choose the smallest model that meets the quality bar, since smaller models are cheaper and faster and often sufficient; (2) randomness/creativity of the output — use a low temperature for factual, consistent tasks; (3) it caps the number of output tokens generated, which bounds both response length and per-request output cost; (4) when many requests share a large, unchanging prefix (e.g., a long system prompt or fixed reference document), caching it avoids reprocessing and reduces cost and latency.*

---

## What's Next

Next: **Retrieval Augmented Generation (RAG) and Vector Databases** — how to ground a foundation model in your own data, the AWS services that store embeddings, and how RAG compares to other customization approaches on cost.
