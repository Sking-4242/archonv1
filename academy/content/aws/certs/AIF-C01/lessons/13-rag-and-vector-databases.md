---
title: "Retrieval Augmented Generation (RAG) and Vector Databases"
type: content
estimated_minutes: 15
cert_tags: ["AIF-C01"]
---

# Retrieval Augmented Generation (RAG) and Vector Databases

## Overview

A foundation model only knows what was in its training data, frozen at the moment training ended. It does not know your company's policies, last week's sales figures, or the contents of your private documents — and if you ask, it may confidently make something up. **Retrieval Augmented Generation (RAG)** is the single most important technique for solving this, and it appears throughout the AI Practitioner exam. Domain 3, Task 3.1 asks you to define RAG and its business applications, to identify the AWS services that store embeddings in vector databases, and to compare RAG against other customization approaches on cost.

RAG works by giving the model relevant information at the moment of the question instead of baking it into the model. When a user asks something, the system first **retrieves** the most relevant pieces of your data, then inserts them into the prompt so the model can **generate** an answer grounded in those facts. The result is a model that can answer about private, current, or proprietary information it was never trained on — and that cites real sources instead of hallucinating. Because RAG adds knowledge without retraining the model, it is usually far cheaper and faster than fine-tuning, and it keeps answers current simply by updating the underlying data. Understanding RAG, the vector databases that power it, and where it sits among customization options is core practitioner knowledge.

This lesson explains how RAG works end to end, the AWS services that store the embeddings it relies on, and the cost trade-offs between RAG and the other ways to customize a model. After it you will be able to recognize a RAG use case, name the AWS building blocks, and justify RAG against fine-tuning.

---

## Core Concepts

### The Problem RAG Solves

Foundation models have three knowledge gaps: they lack your **private/proprietary** data, they are **out of date** (knowledge stops at training time), and they **hallucinate** when asked beyond what they know. You could try to fix this by fine-tuning the model on your data, but that is expensive, must be repeated whenever the data changes, and still risks hallucination. RAG takes a different path: leave the model as-is and *supply the knowledge at question time*. This grounds the model in real, current, authoritative content and dramatically reduces hallucination because the answer is drawn from retrieved facts rather than the model's memory.

### How RAG Works, Step by Step

RAG has two phases. **Ingestion (offline):** your documents are split into **chunks**, each chunk is converted into an **embedding** (a vector capturing its meaning), and those vectors are stored in a **vector database**. **Retrieval and generation (at query time):** the user's question is converted into an embedding, the vector database returns the chunks whose vectors are most similar (semantically closest) to the question, and those retrieved chunks are inserted into the prompt as context. The foundation model then generates an answer using that supplied context. The two halves you learned earlier — chunking and embeddings from the "how GenAI works" lesson — are exactly the machinery RAG runs on.

The defining property: the model answers from **retrieved, authoritative content**, so it can cite sources and stay grounded. Update the documents, and the answers update automatically — no retraining required.

### Vector Databases and AWS Storage Options

RAG depends on a **vector database** (or vector store) to hold embeddings and perform fast similarity search. The exam specifically names AWS services that can store embeddings as vectors:

- **Amazon OpenSearch Service** — search and analytics engine with vector search; a common choice for RAG.
- **Amazon Aurora** (PostgreSQL-compatible, with the pgvector extension) — store vectors alongside relational data.
- **Amazon RDS for PostgreSQL** (with pgvector) — vector storage in a managed relational database.
- **Amazon Neptune** — graph database with vector/analytics capabilities for relationship-rich data.

The point for the exam is recognition: these AWS services can serve as the vector store behind a RAG application. You don't need to configure them; you need to know that "store embeddings for retrieval" maps to options like OpenSearch, Aurora/RDS PostgreSQL with pgvector, and Neptune.

### Amazon Bedrock Knowledge Bases — Managed RAG

Building RAG by hand means wiring up chunking, an embedding model, a vector store, and retrieval logic. **Amazon Bedrock Knowledge Bases** packages all of that into a managed feature: you point it at your data (for example, documents in Amazon S3), and it handles chunking, embedding, storage in a vector index, and retrieval — then connects the retrieved context to a foundation model to answer questions. For the exam, "managed RAG on AWS" and "ground a Bedrock model in my documents" both point to **Bedrock Knowledge Bases**.

### RAG vs. Other Customization Approaches (Cost)

A central Domain 3 skill is comparing the ways to customize a model's behavior and knowledge, by cost and effort:

- **Prompt engineering / in-context learning** — supply instructions or examples in the prompt. Cheapest, no training, immediate; limited by context window.
- **RAG** — retrieve relevant data at query time. Inexpensive relative to training, keeps knowledge current, reduces hallucination, no model retraining. Adds a retrieval system and vector store.
- **Fine-tuning** — train the model further on your data. More expensive, changes the model's behavior/tone/domain knowledge, must be repeated as data changes.
- **Continued pre-training** — further train the base on large domain corpora. Expensive; for deep domain adaptation.
- **Model distillation** — create a smaller, cheaper model that mimics a larger one. Reduces inference cost; involves a training step.

The exam's recurring guidance: for adding *knowledge* (especially private or frequently changing data), **RAG is usually the cost-effective choice over fine-tuning**, because it avoids retraining and stays current. Fine-tuning is for changing *behavior, style, or specialized skill* that prompting and retrieval can't supply. Often the best design combines them — a fine-tuned tone with RAG-supplied facts.

### Business Applications of RAG

RAG powers many common enterprise use cases: question-answering over internal knowledge bases and documentation, customer-support assistants grounded in product manuals, research assistants over large document sets, and any "chat with your data" experience. The shared trait is the need to answer from specific, authoritative, often-changing content — exactly what RAG is built for.

---

## Configuration Reference

How RAG flows:

```text
INGEST (offline):  documents → chunk → embed → store vectors in vector DB
QUERY (online):    question → embed → similarity search → top relevant chunks
                   → insert chunks into prompt → FM generates grounded answer
```

AWS building blocks:

```text
Need                              AWS option
--------------------------------- ----------------------------------------
Managed end-to-end RAG            Amazon Bedrock Knowledge Bases
Vector store (search engine)      Amazon OpenSearch Service
Vectors with relational data      Amazon Aurora / RDS for PostgreSQL (pgvector)
Vectors with graph/relationships  Amazon Neptune
Source documents                  Amazon S3
```

Customization approaches, cheapest → most expensive (for adding knowledge):

```text
Prompt engineering / in-context  $     no training; limited by context window
RAG                              $$    retrieval + vector store; current, low hallucination
Fine-tuning                      $$$   changes behavior/style; repeat as data changes
Continued pre-training           $$$$  deep domain adaptation
Model distillation               (training) smaller/cheaper model that mimics a bigger one
Rule of thumb: add KNOWLEDGE → RAG; change BEHAVIOR/STYLE → fine-tune
```

---

## How to Decide

- **Need the model to answer from private, current, or proprietary data?** → **RAG** (Bedrock Knowledge Bases for managed).
- **Knowledge changes often?** → **RAG**, so updates are just data updates — no retraining.
- **Need a different tone, format, or specialized skill the base lacks?** → **fine-tuning** (possibly with RAG for facts).
- **Choosing a vector store?** → OpenSearch for search-centric, Aurora/RDS PostgreSQL (pgvector) to sit beside relational data, Neptune for graph/relationship data.
- **Cheapest first:** try prompt engineering / in-context, then RAG, before fine-tuning.

---

## How This Connects

RAG is the payoff of the chunking and embeddings concepts from "how GenAI works," and it directly mitigates the hallucination limitation from Domain 2. It builds on the context-window and cost themes from the previous lesson (RAG sends only relevant chunks, controlling tokens and cost). It recurs in Domain 5 as a **grounding technique** to improve output accuracy, and it pairs with agents (retrieval is the most common agent tool). The customization-cost comparison sets up the next lesson on fine-tuning.

---

## Exam Traps

- **Fine-tuning to add knowledge.** For private or changing facts, RAG is usually cheaper and stays current; fine-tuning is for behavior/style/skill.
- **Thinking RAG retrains the model.** RAG supplies data at query time; the model is unchanged.
- **Forgetting RAG reduces hallucination.** Grounding answers in retrieved sources is a primary reason to use it.
- **Not knowing the vector-store options.** OpenSearch, Aurora/RDS PostgreSQL (pgvector), and Neptune can all store embeddings; Bedrock Knowledge Bases manages the whole pipeline.
- **Assuming RAG needs no maintenance.** Retrieval quality depends on good chunking and up-to-date, well-curated source data.

---

## Summary

Retrieval Augmented Generation grounds a foundation model in your own data by retrieving the most relevant chunks at query time and inserting them into the prompt, so the model answers from authoritative, current content instead of its frozen memory — reducing hallucination and enabling "chat with your data" without retraining. RAG relies on embeddings stored in a vector database; on AWS that can be Amazon OpenSearch Service, Aurora or RDS for PostgreSQL (pgvector), or Neptune, while **Amazon Bedrock Knowledge Bases** provides managed end-to-end RAG. Among customization approaches, RAG is usually the cost-effective way to add knowledge, fine-tuning is for changing behavior or style, and prompt engineering is the cheapest first resort — and the three are often combined.

---

## Examples

**Example 1 — Internal knowledge assistant.** Employees ask questions about HR policies that change quarterly. **RAG** over the policy documents (via Bedrock Knowledge Bases) keeps answers current and grounded — no retraining when policies change.

**Example 2 — RAG vs. fine-tuning.** A team wants the model to "know" thousands of product specs. Because the specs change and are factual, **RAG** beats fine-tuning on cost and freshness.

**Example 3 — Fine-tune for behavior.** A brand needs the model to always respond in a specific tone and format. That's a **fine-tuning** job (optionally with RAG supplying the facts).

**Example 4 — Vector store choice.** A team already runs Aurora PostgreSQL and wants vectors beside their relational data → **Aurora with pgvector**.

---

## Think About It

A company fine-tunes a model every month on its latest product catalog to keep the assistant accurate, and the cost and effort keep climbing. Explain why RAG would likely be cheaper and more current for this *knowledge* problem — and name one situation where they would still genuinely need fine-tuning.

---

## Quick Check

1. In one sentence, how does RAG let a model answer about data it was never trained on?
2. Name two AWS services that can store embeddings for RAG, and the managed feature that runs the whole RAG pipeline.
3. For adding frequently changing private knowledge, is RAG or fine-tuning usually more cost-effective, and why?
4. What does fine-tuning change that RAG does not?

*Answers: (1) it retrieves the most relevant chunks of your data at query time and inserts them into the prompt so the model generates a grounded answer; (2) any two of OpenSearch Service, Aurora/RDS for PostgreSQL (pgvector), Neptune — and Amazon Bedrock Knowledge Bases for managed RAG; (3) RAG, because it avoids retraining and stays current by simply updating the source data; (4) the model's behavior, tone, format, or specialized skill (RAG only supplies external knowledge, leaving the model unchanged).*

---

## What's Next

Next: **Prompt Engineering Techniques** — how to shape model outputs with context, instructions, and examples; zero/few-shot and chain-of-thought; and the risks like prompt injection and jailbreaking.
