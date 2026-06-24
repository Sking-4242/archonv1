---
title: "Amazon Transcribe"
type: content
estimated_minutes: 12
cert_tags: ["AIF-C01"]
---

# Amazon Transcribe

## Overview

Amazon Transcribe is a managed **automatic speech recognition (ASR)** service that converts speech in audio and video into accurate text, in real time or from recorded files, with **no ML expertise required**. This *service reference* lesson covers what Transcribe does, its specialized variants and features, and what each certification expects.

Transcribe matters because audio — call-center recordings, meetings, media, voice notes — contains valuable content that is locked away until it's text. Manual transcription is slow and costly; Transcribe automates it via a simple API, producing timestamped, speaker-attributed transcripts you can search, analyze, and store. The mental model is a **pre-trained speech-to-text AI service**: feed it audio and get text back, with features for speakers, vocabulary, and redaction. It is commonly the first step before applying **Comprehend** (NLP) to the resulting text — for example to analyze customer-call sentiment.

---

## How It Works

Transcribe converts speech to text from audio/video, in two modes:

- **Batch transcription** — process recorded files stored in S3.
- **Streaming transcription** — transcribe live audio in real time (e.g., live captions).

Key capabilities:

- **Speaker diarization** — identify and label different speakers ("who said what").
- **Custom vocabulary and custom language models** — improve accuracy on domain-specific terms, names, and acronyms.
- **Automatic language identification** and multi-language support.
- **PII redaction** — automatically remove sensitive information from transcripts.
- **Transcribe Call Analytics** — purpose-built for contact centers, adding sentiment, call categorization, and summaries.
- **Transcribe Medical** — ASR specialized for clinical/medical speech.

---

## Key Features

- **Batch and real-time streaming** speech-to-text.
- **Speaker diarization** and timestamps.
- **Custom vocabulary / custom language models** for domain accuracy.
- **PII redaction** and content filtering.
- **Call Analytics** (contact center) and **Transcribe Medical** variants.

---

## Configuration Reference

- **Choose batch (S3) or streaming** based on whether audio is recorded or live.
- **Add custom vocabulary / a custom language model** to improve accuracy on jargon, product names, or accents.
- **Enable PII redaction** for privacy, and **Call Analytics** for contact-center use cases.
- **Secure** with IAM/KMS; store transcripts in your account/region.

---

## Operations and Troubleshooting

- **Poor accuracy on domain terms.** Add **custom vocabulary** or train a **custom language model**.
- **Need speaker labels.** Enable **speaker diarization**.
- **Pipeline pattern.** Transcribe → **Comprehend** (sentiment/entities/PII) is the standard "analyze recorded calls" flow; for contact centers, **Call Analytics** does much of this in one step.
- **Privacy.** Enable **PII redaction** before storing/sharing transcripts; use Transcribe Medical for clinical audio.

---

## Integrations

Transcribe reads audio from **S3** (batch) or live streams, is invoked by **Lambda**, feeds transcripts to **Amazon Comprehend** (NLP), pairs with **Amazon Translate** (translate transcripts) and **Amazon Polly** (text-to-speech, the inverse), and is secured with **IAM/KMS**. It is the speech-to-text member of the pre-trained AI services and a common front-end to text analytics.

---

## Pricing and Cost Considerations

Transcribe bills by the **seconds/minutes of audio processed**, with higher rates for specialized variants (Call Analytics, Medical) and custom language models. The levers are using the standard service where it suffices, batching, and reserving specialized variants for the cases that need them. Exact prices vary by feature and Region.

---

## Exam Relevance

**AIF-C01:** Know Transcribe as the pre-trained **speech-to-text** service (batch + streaming), speaker diarization, custom vocabulary, PII redaction, and the Call Analytics/Medical variants — **no ML expertise** — and the Transcribe→Comprehend pipeline for analyzing recorded speech. Conceptual content.

---

## Summary

Amazon Transcribe converts speech to text from recorded files (batch via S3) or live audio (streaming) with no ML expertise, offering speaker diarization, custom vocabulary/language models for domain accuracy, PII redaction, and specialized Call Analytics (contact centers) and Medical variants. It integrates with Comprehend (analyze transcripts), Translate, and Polly, secured with IAM/KMS. The defining exam points are Transcribe as the speech-to-text AI service, its accuracy/customization features, and the Transcribe→Comprehend pattern for analyzing spoken content.

---

## Quick Check

1. What two modes does Transcribe support, and when would you use each?
2. How do you improve accuracy on domain-specific terms?
3. What does speaker diarization provide?
4. What is the standard pipeline for analyzing recorded customer calls?
5. Which variant is purpose-built for contact centers?

---

## What's Next

Pair this with **Amazon Comprehend** (analyze transcripts), **Amazon Translate** (translate them), **Amazon Polly** (the text-to-speech inverse), and **Amazon Lex** (conversational voice).
