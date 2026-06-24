---
title: "Amazon Textract"
type: content
estimated_minutes: 12
cert_tags: ["AIF-C01"]
---

# Amazon Textract

## Overview

Amazon Textract is a managed **document text and data extraction** service that uses machine learning to automatically read printed text, handwriting, forms, and tables from scanned documents and images — going beyond simple OCR to understand structure. It needs **no ML expertise**. This *service reference* lesson covers what Textract extracts, its specialized document analyzers, and what each certification expects.

Textract matters because organizations process huge volumes of documents — invoices, forms, IDs, contracts, receipts — and manually keying or even plain OCR-ing them loses structure and is error-prone. Textract extracts not just raw text but the **relationships** (which value goes with which form field, which cells form a table), enabling automated document workflows. The mental model is a **pre-trained AI service for documents**: send a document image/PDF and get back text plus structured key-value and table data with confidence scores. It is distinct from Rekognition's image text-detection in that Textract is purpose-built for **documents** and their structure.

---

## How It Works

Textract analyzes documents (images or PDFs, in real time for single pages or asynchronously for multi-page documents in S3) and returns:

- **Raw text (OCR)** — printed text and handwriting, with the layout and reading order.
- **Forms** — **key-value pairs** (e.g., "Name: Jane Doe"), preserving which label maps to which value.
- **Tables** — cell-level structure so tabular data is extracted as rows/columns.
- **Queries** — ask natural-language questions about a document ("What is the invoice total?") to extract specific values.

Specialized analyzers handle common document types: **Analyze Expense** (invoices/receipts), **Analyze ID** (driver's licenses/passports), and **Analyze Lending** (mortgage/loan documents). Every extracted element carries a **confidence score**, supporting human-review thresholds.

---

## Key Features

- **OCR plus structure** — text, handwriting, **forms (key-value)**, and **tables**.
- **Queries** to extract specific fields by question.
- **Specialized analyzers** — expense (invoices/receipts), identity documents, and lending.
- **Confidence scores** for routing low-confidence results to human review.
- **Async processing** of large/multi-page documents from S3, and integration with human-review workflows (Augmented AI / A2I).

---

## Configuration Reference

- **Choose the operation** — plain text detection, form/table analysis, queries, or a specialized analyzer (expense/ID/lending) matching the document type.
- **Process multi-page docs asynchronously** via S3; single images in real time.
- **Use confidence thresholds** to send uncertain extractions to **human review (A2I)**.
- **Secure** with IAM/KMS; keep documents in your account/region.

---

## Operations and Troubleshooting

- **Textract vs. Rekognition text detection.** For **documents** (forms, tables, structured extraction) use **Textract**; Rekognition's text-in-image is for text in general scenes/photos. This distinction appears on the exam.
- **Low accuracy / wrong field mapping.** Use the right operation (forms/tables/queries) for the document, and apply **confidence thresholds** with human review for critical fields.
- **Large documents.** Use asynchronous jobs over S3.
- **Downstream analysis.** Feed extracted text to **Comprehend** for NLP (entities, sentiment, PII).

---

## Integrations

Textract reads documents from **S3**, is invoked by **Lambda** in document pipelines, routes uncertain results to **Amazon A2I** (human review), feeds extracted text to **Comprehend** (NLP) and **Bedrock** (generative processing), and is secured with **IAM/KMS**. It is the document member of the pre-trained AI services, often the first step in intelligent document processing (IDP) workflows.

---

## Pricing and Cost Considerations

Textract bills **per page** processed, with different rates for plain text detection versus forms/tables/queries and the specialized analyzers (which cost more). The levers are choosing the least-expensive operation that meets the need, batching, and reserving the richer analyses for documents that require structure. Exact prices vary by operation and Region.

---

## Exam Relevance

**AIF-C01:** Know Textract as the pre-trained **document extraction** service (OCR plus forms/key-value, tables, queries, and expense/ID/lending analyzers), confidence scores and human review, **no ML expertise**, and its distinction from Rekognition (scene text) and from building a custom model. Conceptual content.

---

## Summary

Amazon Textract extracts text, handwriting, form key-value pairs, and table structure from documents with no ML expertise, plus natural-language **Queries** and specialized **expense, identity, and lending** analyzers, each result carrying a confidence score for human-review routing. It processes documents from S3 (sync for single pages, async for multi-page), integrates with A2I, Comprehend, Lambda, and Bedrock, and is secured with IAM/KMS. The defining exam points are Textract for structured **document** extraction (vs. Rekognition's general scene-text), confidence-based human review, and its role as the first step in intelligent document processing.

---

## Quick Check

1. What does Textract extract beyond plain text, and why does structure matter?
2. How does Textract differ from Rekognition's text detection?
3. What are the specialized analyzers for, and what do Queries do?
4. How are confidence scores used in a document workflow?
5. Which service would you feed Textract output to for entity/PII analysis?

---

## What's Next

Pair this with **Amazon Comprehend** (analyze extracted text), **Amazon S3** (documents), **AWS Lambda** (pipelines), and **Amazon Bedrock** (generative document processing).
