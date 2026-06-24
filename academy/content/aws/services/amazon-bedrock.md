---
title: "Amazon Bedrock"
type: content
estimated_minutes: 19
cert_tags: ["AIF-C01", "SAA-C03"]
---

# Amazon Bedrock

## Overview

Amazon Bedrock is a fully managed service that provides access to high-performing **foundation models (FMs)** — from Amazon and leading AI companies — through a single API, and the tools to build **generative AI** applications with them: customization, retrieval-augmented generation, agents, and guardrails. It is serverless: you don't provision or manage any model infrastructure. This *service reference* lesson covers what Bedrock offers, how you build with it, responsible-AI controls, and what each certification expects.

Bedrock matters because generative AI is now central to many applications, but training or hosting large foundation models yourself is impractical for most teams. Bedrock gives API access to a choice of FMs and the building blocks to ground them in your data and deploy them safely. The key contrast for the exams is **Bedrock (foundation models via API for generative AI) versus SageMaker (build/train your own custom models) versus the pre-trained AI services (single-purpose vision/language).** Bedrock is the answer for "build a generative-AI application using foundation models without managing infrastructure." The core mental model is **choose a model → ground and customize it (prompts, RAG, fine-tuning) → add agents and guardrails → call it via API**, all serverless.

---

## How It Works

Bedrock exposes multiple **foundation models** (text and multimodal, plus image and embedding models) through a unified API, so you can pick the model that best fits a task and switch models with minimal code change. You build with several capabilities:

- **Prompting and inference** — call models with prompts and **inference parameters** (temperature, top-p, max tokens) that control output randomness/length.
- **Knowledge Bases (RAG)** — connect a model to your own data so it answers from authoritative sources: documents are embedded into a **vector store** (e.g., OpenSearch Serverless), and at query time relevant context is retrieved and added to the prompt — **retrieval-augmented generation**, which reduces hallucination and grounds responses.
- **Customization** — **fine-tuning** (train on labeled examples to specialize a model) and **continued pre-training**; customized models run in **provisioned throughput**.
- **Agents** — orchestrate multi-step tasks, calling APIs/functions and knowledge bases to complete actions, not just generate text.
- **Guardrails** — configurable safety controls that filter harmful content, block denied topics, redact PII, and reduce hallucination, applied consistently across models.

---

## Key Features

- **Choice of foundation models** (Amazon and third-party) via one serverless API.
- **Knowledge Bases** for managed RAG over your data.
- **Fine-tuning and customization** for domain specialization, with provisioned throughput for production.
- **Agents** for multi-step, tool-using workflows.
- **Guardrails** for safety, content filtering, denied topics, and PII redaction.
- **Security/governance** — data is not used to train the base models, with KMS encryption, VPC/PrivateLink access, and IAM control; **Model Evaluation** to compare models.

---

## Configuration Reference

- **Select a model** appropriate to the task (reasoning, summarization, chat, images, embeddings) and tune **inference parameters**.
- **Use Knowledge Bases (RAG)** to ground responses in your data via a vector store rather than fine-tuning when the need is up-to-date factual grounding.
- **Fine-tune** only when you need consistent style/domain behavior, and use **provisioned throughput** for production customized models.
- **Apply Guardrails** for safety/PII, and access Bedrock privately via **VPC/PrivateLink** with **IAM** and **KMS**.

---

## Operations and Troubleshooting

- **Bedrock vs. SageMaker vs. AI services.** Building a **generative-AI app on foundation models** without managing infra → **Bedrock**; training a **custom model** → **SageMaker**; a **single-purpose** capability (OCR, sentiment) → an **AI service**. Central exam decision.
- **RAG vs. fine-tuning.** For grounding in current/private facts, use **Knowledge Bases (RAG)**; for consistent domain style/format, consider **fine-tuning**. RAG is usually the first answer for "answer from our documents."
- **Hallucinations / unsafe output.** Use **Guardrails** and RAG grounding; tune prompts and parameters.
- **Cost/latency.** Choose a right-sized model, use on-demand for variable load and provisioned throughput for steady high volume.

---

## Integrations

Bedrock grounds models with data in **S3** via **Knowledge Bases** backed by a vector store (**OpenSearch Serverless**, Aurora pgvector, etc.), is orchestrated by **Lambda/Step Functions**, fronted by **API Gateway**, secured with **IAM/KMS/VPC (PrivateLink)**, and monitored via **CloudWatch**. It complements **SageMaker** (custom models) and the pre-trained AI services, and is the generative-AI foundation-model layer of the AWS ML stack.

---

## Pricing and Cost Considerations

Bedrock prices inference primarily by **tokens processed** (input and output) for on-demand usage, with **provisioned throughput** (committed model units, hourly) for steady, high-volume or customized-model workloads; **Knowledge Bases**, fine-tuning/customization, and the vector store have their own costs. The levers are choosing an appropriately sized model, using RAG to keep prompts efficient, on-demand vs. provisioned throughput by traffic pattern, and managing prompt/response token counts. Exact prices vary by model and Region.

---

## Exam Relevance

**AIF-C01:** Core content. Know Bedrock as managed access to foundation models for generative AI, **RAG via Knowledge Bases**, fine-tuning/customization, **Agents**, **Guardrails**, inference parameters, model selection, and **Bedrock vs. SageMaker vs. AI services**. Heavily weighted.

**SAA-C03:** Know Bedrock at an architectural level — serverless FM access, RAG with a vector store, private access via PrivateLink, and where generative AI fits in a solution. Design depth.

---

## Summary

Amazon Bedrock provides serverless access to a choice of foundation models through one API, plus the tools to build generative-AI applications: prompting with inference parameters, **Knowledge Bases** for retrieval-augmented generation (grounding models in your data via a vector store), **fine-tuning/customization** for specialization, **Agents** for multi-step tool-using tasks, and **Guardrails** for safety and PII redaction. It keeps your data private (not used to train base models), with KMS/VPC/IAM controls and model evaluation. The defining exam points are Bedrock (generative AI on foundation models) vs. SageMaker (custom models) vs. AI services (single-purpose), and RAG vs. fine-tuning for grounding versus specialization.

---

## Quick Check

1. When would you use Bedrock versus SageMaker versus a pre-trained AI service?
2. What is retrieval-augmented generation (RAG), and which Bedrock feature provides it?
3. When would you fine-tune a model instead of using RAG?
4. What do Guardrails do, and why do inference parameters like temperature matter?
5. How does Bedrock keep your data private and access controlled?

---

## What's Next

Pair this with **Amazon SageMaker** (custom models), **Amazon OpenSearch** (vector store for RAG), **Amazon S3** (knowledge-base data), and the pre-trained AI services. See the AIF-C01 generative-AI and Bedrock lessons.
