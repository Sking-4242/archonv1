---
title: "Amazon Polly"
type: content
estimated_minutes: 11
cert_tags: ["AIF-C01"]
---

# Amazon Polly

## Overview

Amazon Polly is a managed **text-to-speech (TTS)** service that turns written text into lifelike spoken audio using deep-learning voices, in many languages and voice options, with **no ML expertise required**. This *service reference* lesson covers what Polly does, its voice types and controls, common uses, and what each certification expects.

Polly matters because adding natural-sounding speech to applications — voice responses, accessibility narration, audio versions of content, IVR prompts, e-learning — traditionally required recording voice talent or running speech engines. Polly generates speech on demand via an API, in real time or as audio files you store and replay. The mental model is the **inverse of Transcribe**: where Transcribe converts speech to text, Polly converts **text to speech**. It is the voice-output member of the pre-trained AI services, often combined with Lex (conversational interfaces) and Translate (multilingual audio).

---

## How It Works

You send text (plain or marked up with **SSML** for control over pronunciation, pauses, emphasis, and rate) and Polly returns synthesized **audio** (e.g., MP3, OGG, PCM) using a chosen **voice**:

- **Standard voices** — the original concatenative TTS.
- **Neural (NTTS) voices** — higher-quality, more natural deep-learning voices, including **newscaster** and **conversational** styles, and **long-form** and **generative** voices for the most natural output.
- **Brand/Custom voices** — create a unique voice for your brand (custom engagement).

You can stream audio in real time for interactive use or generate and store files in S3 for replay. **Speech marks** provide timing metadata (e.g., for lip-sync or highlighting text as it's spoken).

---

## Key Features

- **Lifelike neural voices** in many languages, with styles (newscaster, conversational, long-form).
- **SSML** for fine control over pronunciation, pauses, emphasis, and speaking rate.
- **Real-time streaming** or **file generation** (store in S3).
- **Speech marks** for synchronization (highlighting/lip-sync).
- **Custom/brand voices** for a distinctive identity.

---

## Configuration Reference

- **Choose a voice and engine** — neural for natural quality; pick language/style to fit the use case.
- **Use SSML** to control pronunciation, pacing, and emphasis where needed.
- **Stream for interactive responses** or **generate files to S3** for content you replay.
- **Secure** with IAM/KMS.

---

## Operations and Troubleshooting

- **Robotic or mispronounced output.** Use **neural voices** and **SSML** (phonemes, breaks, emphasis) to refine.
- **Polly vs. Transcribe.** Polly is **text-to-speech**; Transcribe is **speech-to-text** — the inverse. A frequent exam pairing.
- **Multilingual audio.** Pair with **Translate** to speak content in multiple languages.
- **Cost on repeated content.** Generate once and cache the audio file rather than re-synthesizing.

---

## Integrations

Polly is invoked by **Lambda**, stores audio in **S3**, powers spoken responses in **Amazon Lex** chatbots/IVR and **Amazon Connect** contact flows, pairs with **Translate** for multilingual speech and **Transcribe** as the inverse, and is secured with **IAM/KMS**. It is the voice-output member of the pre-trained AI services.

---

## Pricing and Cost Considerations

Polly bills by the **number of characters** of text synthesized, with neural/generative voices priced higher than standard, and a free tier. The levers are caching generated audio for static/repeated content (synthesize once), choosing the voice engine appropriate to quality needs, and trimming unnecessary text. Exact prices vary by voice type and Region.

---

## Exam Relevance

**AIF-C01:** Know Polly as the pre-trained **text-to-speech** service (neural voices, SSML, languages/styles, custom voices), its use cases (accessibility, IVR, narration), and that it is the **inverse of Transcribe** — no ML expertise required. Conceptual content.

---

## Summary

Amazon Polly converts text into lifelike speech using deep-learning voices in many languages and styles, controlled with SSML, streamed in real time or generated as audio files in S3, with speech marks for synchronization and optional custom brand voices. It powers accessibility narration, IVR/chatbot voice (with Lex/Connect), and multilingual audio (with Translate), secured with IAM/KMS, and bills per character synthesized. The defining exam point is Polly as text-to-speech — the inverse of Transcribe — and one of the no-expertise pre-trained AI services.

---

## Quick Check

1. What does Polly convert, and how does that relate to Transcribe?
2. What do neural voices and SSML each improve?
3. When would you generate and store audio files versus stream in real time?
4. How would you produce spoken audio in several languages?
5. How is Polly priced, and how can you reduce cost for repeated content?

---

## What's Next

Pair this with **Amazon Transcribe** (the speech-to-text inverse), **Amazon Lex** (conversational voice), **Amazon Translate** (multilingual), and **AWS Lambda**/**Amazon S3** (pipelines and storage).
