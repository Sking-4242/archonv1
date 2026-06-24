---
title: "Language and Speech AI Services on AWS"
type: content
estimated_minutes: 11
cert_tags: ["AIF-C01"]
---

# Language and Speech AI Services on AWS

## Overview

The shared library lessons cover AWS's vision and document AI services (Rekognition, Textract) and the three-tier model of AI/ML services. This lesson fills the gap the AI Practitioner exam specifically names: the **language and speech** managed AI services — Amazon Comprehend, Transcribe, Translate, Lex, and Polly. The exam expects you to match each to its use case, because Task 1.2 explicitly lists these services and asks you to "explain the capabilities of AWS managed AI/ML services."

These services embody the top tier of AWS's AI stack: **pre-built AI services** that solve a well-defined problem through a simple API call, with no model training, no data science, and no infrastructure to manage. You send text or audio, you get back a result — sentiment, a transcript, a translation, a spoken-audio file, or a chatbot response. For a practitioner who *uses* rather than builds AI, these are the everyday tools, and the exam treats knowing "which service does what" as core knowledge.

This lesson defines each service, its inputs and outputs, and the tell that maps a scenario to it. After it you will be able to pick the right language or speech service for any described task.

---

## Core Concepts

### Amazon Comprehend — Natural Language Processing

**Amazon Comprehend** is the managed NLP service. Given text, it extracts meaning: **sentiment** (positive/negative/neutral/mixed), **entities** (people, places, organizations, dates), **key phrases**, **language detection**, and **topic modeling** across document sets. **Comprehend Medical** specializes in extracting medical information from clinical text. A common use is **PII detection and redaction** — finding and masking personally identifiable information in documents. Tell: "analyze text," "sentiment," "extract entities/key phrases," "detect PII in text."

### Amazon Transcribe — Speech to Text

**Amazon Transcribe** converts **audio into text** (automatic speech recognition). It handles streaming and batch audio, speaker identification (diarization), custom vocabularies, and automatic PII redaction in transcripts. **Transcribe Medical** targets clinical dictation. Typical uses: captioning, call-center transcript generation, meeting notes. Tell: "convert speech/audio to text," "transcribe calls," "generate captions."

### Amazon Translate — Machine Translation

**Amazon Translate** performs **neural machine translation** between languages — text in one language, text out in another, with support for many language pairs and custom terminology. It is used to localize applications, translate user-generated content, and support multilingual chat. Tell: "translate text between languages," "localize content."

### Amazon Lex — Conversational Interfaces

**Amazon Lex** builds **conversational chatbots and voice assistants** using the same technology as Alexa. It provides automatic speech recognition and natural-language understanding to interpret **intents** (what the user wants) and **slots** (the parameters), and it integrates with Lambda to fulfill requests. Uses: customer-service bots, IVR systems, virtual agents. Tell: "build a chatbot," "voice/IVR assistant," "understand user intent."

### Amazon Polly — Text to Speech

**Amazon Polly** is the inverse of Transcribe: it converts **text into lifelike spoken audio** (text-to-speech), with many voices and languages and neural voice options. Uses: voice responses, audio versions of content, accessibility, IVR prompts. Tell: "convert text to speech," "generate spoken audio/voice."

### Custom Variants — When the Defaults Aren't Enough

Each service offers a default model that works out of the box, but several support light **customization** without any deep ML work — a distinction the exam sometimes probes. **Comprehend** supports custom classification and custom entity recognition, training on your labeled examples to recognize categories or entities specific to your business. **Transcribe** supports custom vocabularies and custom language models to improve accuracy on domain-specific terms (medical, legal, product names). **Translate** supports custom terminology to enforce preferred translations of brand names and jargon. **Lex** bots are versioned and built from your defined intents and slots. The key point: these remain *managed* services — customization means supplying data or configuration, not building or training a model from scratch. If a scenario needs domain-specific accuracy but still wants a managed service, a custom variant is usually the intended answer over jumping to SageMaker.

### Pre-Built Service vs. Foundation Model

A recurring decision is whether to use one of these purpose-built services or a general foundation model (via Bedrock). For a **well-defined, single-purpose task** — transcribe this audio, translate this text, detect sentiment — the purpose-built service is typically simpler, cheaper, faster, and more accurate than prompting a general LLM to do the same job. Foundation models shine when the task is open-ended, conversational, or spans multiple capabilities at once. The exam rewards recognizing that not every language task needs a large language model: a focused service like Transcribe or Translate is often the right, cost-effective tool.

### Real-Time and Batch Modes

These services apply the inference-mode ideas from the data lesson. **Transcribe** offers both **streaming** (real-time) transcription for live captions or call monitoring and **batch** transcription for recorded files, so you match the mode to whether results are needed instantly or can be processed after the fact. **Polly** can stream synthesized speech for interactive responses or generate audio files in advance. **Comprehend** and **Translate** support both synchronous calls for a single piece of text and asynchronous batch jobs for large document sets. The exam tell mirrors the earlier inference lesson: "live" or "real-time" points to streaming/synchronous use, while "process thousands of recorded files" points to batch — and the same managed service usually supports whichever mode the scenario needs.

### Where These Fit Against Bedrock and Q

It helps to place these services in the wider AWS AI landscape. The language and speech services are **purpose-built, single-capability** tools. **Amazon Bedrock** provides general foundation models for open-ended generation and reasoning, and **Amazon Q** offers ready-made assistants for business and developer tasks. A modern application often blends them: Transcribe turns a call into text, Comprehend redacts PII, and a Bedrock model summarizes and drafts a response. Knowing that these focused services coexist with — and frequently feed — foundation-model and assistant services helps you choose the simplest tool for each step rather than forcing one model to do everything.

### Seeing Them as a Pipeline

These services compose. A multilingual voice assistant might use **Transcribe** (speech→text), **Comprehend** (understand/redact), **Translate** (localize), **Lex** (manage the conversation), and **Polly** (text→speech response). Recognizing each service by its input→output is the key exam skill, and recognizing how they chain is a bonus for scenario questions.

---

## Configuration Reference

Service → input/output → use case:

```text
Service             Input → Output            Pick it for
------------------- ------------------------- --------------------------------
Amazon Comprehend   text → insights           sentiment, entities, key phrases, PII, language
Amazon Transcribe   audio → text              speech-to-text, captions, call transcripts
Amazon Translate    text → translated text    language translation / localization
Amazon Lex          text/voice → intent+action chatbots, voice assistants, IVR
Amazon Polly        text → audio              text-to-speech, voice output
```

Keyword decoder:

```text
"sentiment / extract entities / detect PII in text" → Comprehend
"transcribe / speech to text / captions"            → Transcribe
"translate / localize into other languages"          → Translate
"chatbot / conversational / understand intent"        → Lex
"text to speech / generate a voice / spoken audio"    → Polly
```

---

## How to Decide

- **Direction of conversion** is the fastest tell: audio→text = Transcribe; text→audio = Polly; text→another language = Translate.
- **Understanding text** (sentiment, entities, PII) → Comprehend.
- **Holding a conversation / understanding intent** → Lex.
- **Vision or documents instead of language/speech?** → that's Rekognition/Textract (covered in the shared AI-services lesson), not these.

---

## How This Connects

This lesson completes the managed-AI-services picture begun in the shared "AWS Machine Learning Services Overview" and "AI Services: Rekognition, Comprehend, Textract" lessons, which cover the vision/document side and the three-tier model. Together they answer Domain 1.2's "capabilities of AWS managed AI/ML services." These services also reappear as building blocks alongside Bedrock in the GenAI modules.

---

## Exam Traps

- **Confusing Transcribe and Polly.** Transcribe is speech→text; Polly is text→speech. The direction is the whole answer.
- **Using Lex when Comprehend fits (or vice versa).** Lex *manages a conversation* and intents; Comprehend *analyzes* text (sentiment, entities). "Chatbot" → Lex; "analyze this text" → Comprehend.
- **Reaching for Bedrock/an LLM when a pre-built service suffices.** For a well-defined task like translation or transcription, the purpose-built service is simpler and cheaper than a foundation model.
- **Forgetting PII redaction** is available in both Comprehend (text) and Transcribe (audio transcripts).

---

## Summary

AWS's language and speech AI services are pre-built, API-driven tools that require no model building. Comprehend analyzes text for sentiment, entities, key phrases, language, and PII. Transcribe converts speech to text; Polly converts text to speech — opposite directions. Translate performs neural machine translation between languages. Lex builds conversational chatbots and voice assistants by recognizing intents and slots. Identify the service by its input→output direction and the task it performs, and remember they compose into multilingual, voice-enabled pipelines.

---

## Examples

**Example 1 — Transcribe + Comprehend.** "Turn recorded support calls into text and flag negative sentiment." Audio→text (Transcribe), then analyze sentiment (Comprehend).

**Example 2 — Polly.** "Read articles aloud for an accessibility feature." Text→audio → **Polly**.

**Example 3 — Lex.** "Build a customer-service chatbot that books appointments." Conversation + intent → **Lex** (with Lambda fulfillment).

**Example 4 — Translate.** "Localize product reviews into five languages." Text→other languages → **Translate**.

---

## Think About It

A company wants a phone-based assistant that callers speak to in Spanish and that replies in spoken Spanish, while logging the sentiment of each call. Which of these five services would you chain together, and in what order, to cover speech-in, understanding, conversation, and speech-out?

---

## Quick Check

1. Which service converts speech to text, and which converts text to speech?
2. Which service detects sentiment and entities in text?
3. Which service would you use to build a voice/text chatbot?
4. Which service performs language translation?

*Answers: (1) Transcribe (speech→text) and Polly (text→speech); (2) Amazon Comprehend; (3) Amazon Lex; (4) Amazon Translate.*

---

## What's Next

Next: **The AI/ML Lifecycle, MLOps, and Evaluation Metrics** — how AI solutions move from data to production, the MLOps practices that keep them reliable, and the metrics (accuracy, precision, recall, F1, and business metrics) used to judge them.
