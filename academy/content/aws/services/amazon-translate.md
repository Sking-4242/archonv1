---
title: "Amazon Translate"
type: content
estimated_minutes: 11
cert_tags: ["AIF-C01"]
---

# Amazon Translate

## Overview

Amazon Translate is a managed **neural machine translation** service that translates text between languages quickly and accurately, with **no ML expertise required**. This *service reference* lesson covers what Translate does, customization for terminology, common uses, and what each certification expects.

Translate matters because reaching global users and processing multilingual content — websites, documents, support tickets, user-generated text — requires translation at a scale and speed humans can't match. Translate provides fluent, context-aware neural translation via a simple API, in real time or batch, across many languages. The mental model is a **pre-trained language-translation AI service**: send text and a target language, get back a translation, with controls to keep brand terms and sensitive data handled correctly. It is frequently combined with Transcribe (speech→text), Comprehend (analysis), and Polly (text→speech) to build multilingual pipelines.

---

## How It Works

You call Translate with source text (the source language can be auto-detected) and a **target language**, and it returns the translation using neural models. It supports:

- **Real-time translation** for interactive use and **batch translation** of large document sets in S3.
- **Custom terminology** — enforce how specific terms (brand names, product names, jargon) are translated so they stay consistent.
- **Active Custom Translation (parallel data)** — adapt translations to your domain/style using your own examples.
- **Profanity masking** and formality settings for some languages.

Translate handles many language pairs and integrates into pipelines for localization and multilingual analytics.

---

## Key Features

- **Neural, context-aware translation** across many languages with auto source-language detection.
- **Real-time and batch** modes.
- **Custom terminology** to control translation of specific terms.
- **Active Custom Translation** for domain/style adaptation.
- **Profanity masking** and formality controls (language-dependent).

---

## Configuration Reference

- **Use real-time** for interactive/app translation and **batch** (S3) for large document localization.
- **Define custom terminology** to keep brand/product terms consistent, and use **parallel data** for domain adaptation.
- **Secure** with IAM/KMS; keep content in your account/region.

---

## Operations and Troubleshooting

- **Brand terms mistranslated.** Add **custom terminology** so they're preserved/translated consistently.
- **Domain tone off.** Use **Active Custom Translation** (parallel data) to adapt style.
- **Multilingual pipelines.** Combine **Transcribe → Translate → Comprehend/Polly** to transcribe, translate, and then analyze or speak content in other languages.
- **Large jobs.** Use **batch** translation over S3 rather than per-string calls.

---

## Integrations

Translate is invoked by **Lambda**, reads/writes **S3** for batch jobs, pairs with **Transcribe** (translate transcripts), **Comprehend** (analyze multilingual text), and **Polly** (speak translated text), and is secured with **IAM/KMS**. It is the translation member of the pre-trained AI services and a key building block for localization and global applications.

---

## Pricing and Cost Considerations

Translate bills by the **number of characters** translated, with a free tier and additional cost for **Active Custom Translation**. The levers are batching, using custom terminology (free) rather than custom-trained adaptation where possible, and caching translations of static content. Exact prices vary by Region.

---

## Exam Relevance

**AIF-C01:** Know Translate as the pre-trained **machine-translation** service (real-time/batch, custom terminology, domain adaptation), its localization/multilingual use cases, and how it combines with Transcribe/Comprehend/Polly — no ML expertise required. Conceptual content.

---

## Summary

Amazon Translate is neural machine translation between many languages, in real time or batch, with no ML expertise, offering custom terminology to keep brand terms consistent and Active Custom Translation for domain/style adaptation. It integrates with Lambda and S3 and pairs with Transcribe, Comprehend, and Polly to build multilingual transcription-translation-analysis-speech pipelines, secured with IAM/KMS and billed per character. The defining exam point is Translate as the translation AI service and its role in multilingual pipelines alongside the other no-expertise language/speech services.

---

## Quick Check

1. What does Translate do, and how can the source language be determined?
2. How do you keep brand/product names translated consistently?
3. What does Active Custom Translation add?
4. Describe a multilingual pipeline combining Translate with other AI services.
5. How is Translate priced, and how can you reduce cost for repeated content?

---

## What's Next

Pair this with **Amazon Transcribe** (speech to text), **Amazon Comprehend** (analysis), **Amazon Polly** (text to speech), and **AWS Lambda**/**Amazon S3** (pipelines).
