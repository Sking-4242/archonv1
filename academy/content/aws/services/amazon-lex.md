---
title: "Amazon Lex"
type: content
estimated_minutes: 12
cert_tags: ["AIF-C01"]
---

# Amazon Lex

## Overview

Amazon Lex is a managed service for building **conversational interfaces** — chatbots and voice bots — using the same deep-learning technology (automatic speech recognition and natural-language understanding) that powers Amazon Alexa, with **no ML expertise required**. This *service reference* lesson covers how Lex models conversations, its integrations, common uses, and what each certification expects.

Lex matters because conversational interfaces — customer-service bots, IVR systems, virtual assistants, application help — let users interact in natural language, but building the speech recognition and intent-understanding behind them is hard. Lex provides it as a managed service that turns user utterances into structured **intents** and gathers the information needed to fulfill them. The mental model is an **intent-and-slot** conversation engine: Lex recognizes what the user wants (intent), collects the required parameters (slots) through dialog, and hands off to your backend (usually **Lambda**) to fulfill the request. It combines ASR and NLU in one service, and pairs with Polly for voice output and Connect for contact centers.

---

## How It Works

You define a **bot** with:

- **Intents** — the actions a user wants ("BookHotel", "CheckOrderStatus"). Each intent has sample **utterances** (example phrases) that Lex generalizes from.
- **Slots** — the parameters an intent needs (date, city, order number), each with a **slot type** (built-in or custom). Lex prompts the user to fill missing slots through **dialog management**.
- **Fulfillment** — once slots are filled, Lex invokes a **Lambda** function (or returns the data) to perform the action and respond.

Lex handles both **text and voice** (using built-in ASR for speech), supports multiple languages, and can manage multi-turn conversations, confirmations, and context. Newer Lex versions add capabilities like conversational FAQ using generative AI / Bedrock-backed responses.

---

## Key Features

- **Intents, utterances, and slots** with managed **dialog** to collect information.
- **Text and voice** (built-in ASR + NLU) in multiple languages.
- **Lambda fulfillment** for backend actions and dynamic responses.
- **Multi-turn context**, confirmations, and session management.
- **Integration with Amazon Connect** for contact-center IVR and with Polly for speech output.

---

## Configuration Reference

- **Define intents and sample utterances**, and **slots** with types and prompts for the data each intent needs.
- **Connect a Lambda** for fulfillment (and optional validation/dialog hooks).
- **Choose channels** — web/mobile chat, voice, or **Amazon Connect** IVR — and languages.
- **Secure** with IAM; log conversations to CloudWatch for tuning.

---

## Operations and Troubleshooting

- **Bot misunderstands users.** Add more varied **sample utterances** and refine **slot types**; review conversation logs to find gaps.
- **Lex vs. building your own NLU.** Lex provides managed ASR+NLU and dialog with **no ML expertise**; building a custom conversational model would use SageMaker/Bedrock. Lex is the answer for "build a chatbot/voice bot."
- **Voice use.** Lex handles ASR for input; pair with **Polly** for spoken responses and **Connect** for phone IVR.
- **Backend actions failing.** Check the **Lambda** fulfillment function's logic and permissions.

---

## Integrations

Lex uses **Lambda** for fulfillment and validation, **Polly** for voice output, **Amazon Connect** for contact-center IVR, **Comprehend/Translate** for added language capabilities, and **CloudWatch** for logging; newer versions can use **Bedrock** for generative conversational responses. It is the conversational-interface member of the pre-trained AI services.

---

## Pricing and Cost Considerations

Lex bills by the **number of text and speech requests** processed, with a free tier. Costs scale with conversation volume; the levers are efficient bot design (fewer turns to resolve), caching/streamlining fulfillment, and using the right channel. Connected services (Lambda, Polly, Connect) bill separately. Exact prices vary by request type and Region.

---

## Exam Relevance

**AIF-C01:** Know Lex as the managed **conversational-interface** (chatbot/voice bot) service built on ASR+NLU, the **intent/utterance/slot** model with Lambda fulfillment, voice via Polly and IVR via Connect, and **no ML expertise** required — distinct from building a custom model. Conceptual content.

---

## Summary

Amazon Lex builds text and voice conversational interfaces using the ASR and NLU behind Alexa, with no ML expertise. You define **intents** (with sample utterances), **slots** (parameters gathered through managed dialog), and **Lambda fulfillment** to perform actions; Lex handles multi-turn context in multiple languages and integrates with Polly (voice), Connect (IVR), and (newer versions) Bedrock for generative responses. It bills per request. The defining exam point is Lex as the chatbot/voice-bot AI service and the intent-and-slot model with Lambda fulfillment.

---

## Quick Check

1. What are intents, utterances, and slots in a Lex bot?
2. How does Lex collect the information an intent needs, and what performs the action?
3. How does Lex provide voice input and output, and what service adds phone IVR?
4. When would you use Lex versus building a custom conversational model?
5. How is Lex priced?

---

## What's Next

Pair this with **AWS Lambda** (fulfillment), **Amazon Polly** (voice output), **Amazon Connect** (IVR), and **Amazon Bedrock** (generative conversational responses).
