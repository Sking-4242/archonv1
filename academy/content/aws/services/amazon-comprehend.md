---
title: "Amazon Comprehend"
type: content
estimated_minutes: 13
cert_tags: ["AIF-C01"]
---

# Amazon Comprehend

## Overview

Amazon Comprehend is a managed **natural language processing (NLP)** service that uses machine learning to extract insights and relationships from text — with **no ML expertise required**. You send it text and it returns structured analysis: language, sentiment, key phrases, entities, and more. This *service reference* lesson covers what Comprehend analyzes, custom models, the PII/medical variants, and what each certification expects.

Comprehend matters because organizations have vast amounts of unstructured text — support tickets, reviews, documents, social posts — that contains valuable signal that is impractical to read manually. Comprehend turns that text into structured data you can act on, via a simple API, without training your own NLP models. The key mental model is a **pre-trained AI service**: you call it with text and get insights back immediately, in contrast to SageMaker (where you'd build a custom NLP model) — and you can optionally train **custom classification/entity** models on your own labeled data when the built-in capabilities aren't specific enough.

---

## How It Works

Comprehend provides several built-in analyses over text:

- **Sentiment** — positive, negative, neutral, or mixed.
- **Entity recognition** — people, places, organizations, dates, quantities, etc.
- **Key phrase extraction** — the main points/noun phrases.
- **Language detection** — the dominant language of the text.
- **Syntax analysis** — parts of speech.
- **Topic modeling** — discover topics across a document set.

For domain-specific needs you can train **custom classification** (categorize text into your own labels) and **custom entity recognition** (extract your own entity types) using your labeled data, without managing ML infrastructure. Specialized variants include **Comprehend Medical** (extract medical information from clinical text, including PHI) and **PII detection/redaction** (find and redact personally identifiable information in text).

---

## Key Features

- **Built-in NLP** — sentiment, entities, key phrases, language, syntax, topic modeling.
- **Custom classification and entity recognition** trained on your data (AutoML-style, no infrastructure).
- **PII detection and redaction** for privacy and compliance.
- **Comprehend Medical** for clinical text and PHI extraction.
- **Batch and real-time** analysis, integrated with S3 for large document sets.

---

## Configuration Reference

- **Use built-in analyses** via the API for general NLP needs; process large sets via **asynchronous batch jobs** over S3.
- **Train a custom model** (classification or entity) when built-in capabilities don't match your domain labels/entities.
- **Use PII detection/redaction** to comply with privacy requirements, and **Comprehend Medical** for healthcare text.
- **Secure** with IAM and KMS; keep data in your account/region.

---

## Operations and Troubleshooting

- **Comprehend vs. SageMaker.** For common NLP tasks with **no ML expertise**, use **Comprehend**; to build a fully custom NLP model with control over the algorithm, use **SageMaker**. Comprehend's **custom** models bridge the gap for domain-specific labels without infrastructure.
- **Accuracy on domain text.** If built-in entities/sentiment miss domain nuance, train a **custom** model on labeled examples.
- **Large workloads.** Use asynchronous batch jobs over S3 rather than per-document calls.
- **Privacy.** Use PII detection/redaction before storing or sharing text.

---

## Integrations

Comprehend reads/writes **S3** for batch jobs, is invoked by **Lambda** in pipelines, secured with **IAM/KMS**, and commonly pairs with **Transcribe** (analyze call transcripts), **Textract** (analyze extracted document text), and **Kendra**/**OpenSearch** (enrich search). It is one of the pre-trained AI services alongside Rekognition (vision) and the speech/language services, complementing **SageMaker** (custom models) and **Bedrock** (generative AI).

---

## Pricing and Cost Considerations

Comprehend bills by **units of text processed** (per 100 characters, with minimums) for built-in analyses, with separate pricing for **custom model training and inference endpoints** and for Comprehend Medical. The levers are batching, using built-in APIs where they suffice (vs. maintaining custom endpoints), and shutting down idle custom endpoints. Exact prices vary by feature and Region.

---

## Exam Relevance

**AIF-C01:** Know Comprehend as the pre-trained **NLP** service (sentiment, entities, key phrases, language, PII redaction, Comprehend Medical), custom classification/entity models, and that it requires **no ML expertise** — distinct from SageMaker (custom models) and Bedrock (generative AI). Conceptual content.

---

## Summary

Amazon Comprehend is a managed NLP service that extracts sentiment, entities, key phrases, language, syntax, and topics from text with no ML expertise, plus custom classification/entity models trained on your data, PII detection/redaction, and Comprehend Medical for clinical text. It processes text in real time or as S3 batch jobs and integrates with Lambda, Transcribe, Textract, and search services. The defining exam point is Comprehend as a pre-trained AI service for language understanding — used when you need NLP insights without building a model — versus SageMaker (custom) and Bedrock (generative AI).

---

## Quick Check

1. What kinds of insights does Comprehend extract from text?
2. When would you train a custom Comprehend model instead of using the built-in analyses?
3. Which Comprehend capability supports privacy/compliance, and which targets clinical text?
4. How does Comprehend differ from SageMaker and Bedrock?
5. How would you analyze a very large set of documents efficiently?

---

## What's Next

Pair this with **Amazon Transcribe** and **Amazon Textract** (turn speech/documents into text to analyze), **Amazon Kendra** (search), and **Amazon Bedrock**/**SageMaker** (generative/custom alternatives).
