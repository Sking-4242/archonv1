---
title: "Amazon Lex & Amazon Translate"
type: content
estimated_minutes: 35
cert_tags: ["SAA-C03", "CLF-C02"]
---

## Overview

Amazon Lex is a fully managed service for building conversational interfaces — chatbots and voice applications — using the same deep learning technology that powers Alexa. Lex handles automatic speech recognition (ASR) to convert spoken language to text and natural language understanding (NLU) to determine what the user wants to do, all without requiring any ML expertise. Developers define the vocabulary of possible user actions (intents) and the data those actions require (slots), then Lex manages the conversation flow, prompting users for missing information and handing off to application logic when all required data is collected.

Amazon Translate is a neural machine translation service that converts text between over 75 languages in real time or in batch. Traditional rule-based translation systems struggled with idiomatic expressions, context, and ambiguity. Amazon Translate uses deep learning models trained on massive corpora of parallel text, producing fluent, natural-sounding translations that preserve meaning across languages. It supports both synchronous API calls for individual strings and asynchronous batch jobs for large document sets stored in S3.

For exams, both services represent the "AI without ML expertise" pattern. When a scenario describes building a customer-facing chatbot, voice-enabled IVR, or multi-language support feature without mentioning model training or custom infrastructure, Lex and Translate are the expected answers. They are pay-per-use, HIPAA eligible, and integrate naturally with the broader AWS ecosystem through Lambda, Connect, S3, and Comprehend.

---

## Core Concepts

### Intents, Slots, and Fulfillment

An **intent** represents the goal behind a user's utterance — what they want to accomplish. You define sample utterances (phrases users might say) so Lex can recognize when a user has that goal. A **slot** is a piece of data the intent needs to be fulfilled — for example, a `BookFlight` intent requires slots for `DepartureCity`, `DestinationCity`, and `TravelDate`. Lex prompts the user for each slot in turn if the information was not provided in the initial utterance. Once all required slots are filled, the intent moves to **fulfillment**: either a Lambda function is invoked (for dynamic actions like querying a database) or Lex returns the collected slot values to the calling application. The separation of intent recognition, slot elicitation, and fulfillment is what makes Lex powerful — it handles the conversational complexity so your Lambda only receives clean, validated data.

### Lex V2 Architecture: Bot Locales and DTMF

Lex V2 introduced **bot locales** — language-specific configurations within a single bot. A single bot can have locales for English (US), Spanish (US), French (CA), and so on, each with its own intents, slots, and training utterances. This is critical for building multilingual applications without maintaining separate bots. Lex V2 also supports **DTMF** (Dual-Tone Multi-Frequency) input, which means it can accept phone keypad presses as input in addition to speech and text. This is essential for IVR (Interactive Voice Response) systems where users interact with a phone menu. The Lex V2 API is streaming-capable, enabling real-time, continuous conversation handling rather than discrete request/response cycles.

### Integration with Amazon Connect

Amazon Connect is AWS's cloud-based contact center service. When integrated with Lex, Connect uses a Lex bot as the voice or chat interface for incoming customer interactions. The Connect contact flow invokes the Lex bot, which handles the NLU and conversation, then routes the call to the appropriate queue, agent, or automated action based on the intent and slots collected. This pattern is the canonical exam scenario for "build a call center that automatically handles common inquiries." Lex + Connect eliminates the need to build custom speech recognition or NLU — Connect provides the telephony layer and Lex provides the intelligence.

### The Canonical Exam Pattern: Lex + Lambda + DynamoDB

The most common exam architecture for Lex is: a user interacts with a chatbot (web, mobile, or voice via Connect) → Lex recognizes the intent and collects slots → Lambda is invoked for fulfillment → Lambda queries or writes to DynamoDB → Lambda returns a response that Lex speaks or displays to the user. This pattern appears in scenarios involving customer service automation, order tracking, appointment booking, and FAQ handling. Lambda provides the business logic bridge between the conversational layer (Lex) and the data layer (DynamoDB or other backends), making it a three-tier serverless architecture.

### Amazon Translate: Real-Time vs. Batch Translation

Amazon Translate offers two operating modes. **Real-time translation** uses the `TranslateText` API — you send a string and receive the translated string synchronously. This suits interactive applications like translating a customer chat message before routing it to an agent. **Batch translation** processes large volumes of documents asynchronously. You store source documents in S3, start a batch job via the `StartTextTranslationJob` API, and Translate writes translated output files back to a destination S3 prefix. Batch jobs are ideal for translating product catalogs, legal document archives, or historical customer reviews at scale. The two modes are priced differently — choosing the right one is itself an exam consideration.

### Custom Terminology and Active Custom Translation

Out-of-the-box Translate may mistranslate brand names, product codes, medical terminology, or legal terms that have specific, non-standard meanings in your domain. **Custom Terminology** lets you upload a CSV or TMX file mapping source terms to their correct translations. Translate enforces those mappings regardless of context — ensuring "Firehose" is never translated as the literal word for a fire hose. **Active Custom Translation** goes further: you provide a parallel corpus (pairs of source and target sentences from your domain), and Translate fine-tunes its model on your data. This is valuable for highly specialized domains like clinical medicine or patent law where general translation models underperform. Both features require no ML expertise — you provide the data, Translate handles the rest.

---

## Configuration Reference

### Creating a Lex V2 Bot with an Intent via AWS CLI

```bash
# Step 1: Create the bot shell
aws lexv2-models create-bot \
  --bot-name "FlightBookingBot" \
  --description "Bot for booking flights" \
  --role-arn "arn:aws:iam::123456789012:role/LexBotRole" \
  --data-privacy '{"childDirected": false}' \
  --idle-session-ttl-in-seconds 300
  # idle-session-ttl: seconds before Lex discards session context (max 86400)

# Step 2: Create a bot locale (language-specific configuration)
aws lexv2-models create-bot-locale \
  --bot-id "BOTID12345" \
  --bot-version "DRAFT" \
  --locale-id "en_US" \
  --nlu-intent-confidence-threshold 0.40
  # nlu-intent-confidence-threshold: minimum confidence score to match an intent (0.0-1.0)
  # Lower threshold = more permissive matching; higher = more conservative

# Step 3: Create an intent within the locale
aws lexv2-models create-intent \
  --bot-id "BOTID12345" \
  --bot-version "DRAFT" \
  --locale-id "en_US" \
  --intent-name "BookFlight" \
  --description "Intent to book a flight" \
  --sample-utterances '[
    {"utterance": "I want to book a flight"},
    {"utterance": "Book me a flight to {DestinationCity}"},
    {"utterance": "I need to fly from {DepartureCity} to {DestinationCity}"}
  ]' \
  --fulfillment-code-hook '{"enabled": true}'
  # fulfillment-code-hook enabled: Lambda is invoked when all required slots are filled
  # If disabled, Lex returns slot values to caller without invoking Lambda

# Step 4: Create a custom slot type for cities
aws lexv2-models create-slot-type \
  --bot-id "BOTID12345" \
  --bot-version "DRAFT" \
  --locale-id "en_US" \
  --slot-type-name "CityNames" \
  --slot-type-values '[
    {"sampleValue": {"value": "Seattle"}},
    {"sampleValue": {"value": "New York"}},
    {"sampleValue": {"value": "Chicago"}}
  ]' \
  --value-selection-setting '{"resolutionStrategy": "ORIGINAL_VALUE"}'
  # ORIGINAL_VALUE: return exactly what the user said
  # TOP_RESOLUTION: return the top resolved synonym from the slot type definition

# Step 5: Attach a slot to the intent
aws lexv2-models create-slot \
  --bot-id "BOTID12345" \
  --bot-version "DRAFT" \
  --locale-id "en_US" \
  --intent-id "INTENTID123" \
  --slot-name "DestinationCity" \
  --slot-type-id "SLOTTYPEID123" \
  --value-elicitation-setting '{
    "slotConstraint": "Required",
    "promptSpecification": {
      "messageGroups": [{
        "message": {
          "plainTextMessage": {"value": "Where would you like to fly to?"}
        }
      }],
      "maxRetries": 3,
      "allowInterrupt": true
    }
  }'
  # slotConstraint Required: Lex will prompt user until this value is provided
  # maxRetries: how many re-prompt attempts before Lex falls to fallback intent
  # allowInterrupt: user can speak mid-prompt to provide answer

# Step 6: Build the bot locale (makes the draft version ready for testing)
aws lexv2-models build-bot-locale \
  --bot-id "BOTID12345" \
  --bot-version "DRAFT" \
  --locale-id "en_US"
```

### Real-Time Translation with the Translate API (Python)

```python
import boto3

translate = boto3.client('translate', region_name='us-east-1')

# Synchronous translation -- returns immediately with translated text
response = translate.translate_text(
    Text="Our product guarantee covers manufacturing defects for two years.",
    SourceLanguageCode='en',      # ISO 639-1 language code; use 'auto' for detection
    TargetLanguageCode='es',      # Target language
    Settings={
        'Formality': 'FORMAL',    # FORMAL or INFORMAL tone; supported for select pairs
        'Profanity': 'MASK'       # MASK replaces profanity with [####] in output
    },
    TerminologyNames=['BrandTerminology']  # Reference uploaded custom terminology file
)

print(response['TranslatedText'])
# "Nuestra garantia de producto cubre defectos de fabricacion durante dos anos."
print(response['SourceLanguageCode'])  # 'en' (confirmed even if 'auto' was used)
print(response['AppliedTerminologies']) # List of terminology files that affected output
```

### Batch Translation Job Configuration (Python)

```python
import boto3

translate = boto3.client('translate', region_name='us-east-1')

# Start an asynchronous batch translation job
# All source documents must already exist in the S3 input prefix
response = translate.start_text_translation_job(
    JobName='ProductCatalogTranslation-June2024',
    InputDataConfig={
        'S3Uri': 's3://my-translation-bucket/input/',
        # ContentType options:
        #   text/plain        -- .txt files
        #   text/html         -- .html files (preserves HTML tags)
        #   application/vnd.openxmlformats-officedocument.wordprocessingml.document -- .docx
        'ContentType': 'text/html'
    },
    OutputDataConfig={
        'S3Uri': 's3://my-translation-bucket/output/',
        'EncryptionKey': {
            'Type': 'KMS',
            'Id': 'arn:aws:kms:us-east-1:123456789012:key/mrk-abc123'
            # KMS key encrypts translated output files; must be in same region as job
        }
    },
    # IAM role must have s3:GetObject on input prefix and s3:PutObject on output prefix
    DataAccessRoleArn='arn:aws:iam::123456789012:role/TranslateS3AccessRole',
    SourceLanguageCode='en',
    TargetLanguageCodes=['es', 'fr', 'de', 'ja'],  # Translate to 4 languages in one job
    TerminologyNames=['BrandTerminology'],           # Enforce term mappings in output
    ParallelDataNames=['ProductDescriptionCorpus']   # Active Custom Translation corpus
)

job_id = response['JobId']
print(f"Translation job started: {job_id}")

# Poll for job completion
import time
while True:
    status_resp = translate.describe_text_translation_job(JobId=job_id)
    status = status_resp['TextTranslationJobProperties']['JobStatus']
    print(f"Status: {status}")
    # Terminal statuses: COMPLETED, COMPLETED_WITH_ERROR, FAILED, STOPPED
    if status in ('COMPLETED', 'COMPLETED_WITH_ERROR', 'FAILED', 'STOPPED'):
        break
    time.sleep(30)

# Output files are written to: s3://my-translation-bucket/output/<job-id>/<target-lang>/
```

### Uploading Custom Terminology via AWS CLI

```bash
# Custom terminology CSV format:
# Row 1: language codes (source,target)
# Rows 2+: term mappings
#
# Example brand_terminology.csv:
# en,es
# Firehose,Firehose
# CloudWatch,CloudWatch
# DataVault Pro,DataVault Pro
# Widget SDK,Widget SDK

aws translate import-terminology \
  --name "BrandTerminology" \
  --merge-strategy OVERWRITE \
  --data-file fileb://brand_terminology.csv \
  --terminology-data '{"Format": "CSV"}'
  # Format: CSV or TMX (Translation Memory eXchange -- XML-based industry standard)
  # OVERWRITE: replaces any existing terminology with this name
  # FAIL_ON_CONFLICT: returns error if terminology already exists (safer for automation)

# Verify upload
aws translate get-terminology \
  --name "BrandTerminology" \
  --terminology-data-format CSV
```

---

## How to Decide

| Scenario | Service | Reasoning |
|---|---|---|
| Build a chatbot for customer order status | Amazon Lex | Multi-turn conversation, intent + slot collection |
| Add voice input to a call center IVR | Amazon Lex + Connect | Lex for NLU, Connect for telephony |
| Translate a single user message in real time | Amazon Translate (real-time) | Synchronous, low-latency single string |
| Translate 500,000 documents overnight | Amazon Translate (batch) | Async batch job, S3 input/output |
| Prevent brand names from being translated | Custom Terminology | Explicit term-to-term overrides |
| Improve accuracy for legal/medical domain | Active Custom Translation | Domain-specific parallel corpus fine-tuning |
| Chatbot that also needs entity recognition | Lex + Comprehend | Lex for dialog flow; Comprehend for entities |
| Multi-language chatbot (English + Spanish) | Lex V2 bot locales | Single bot, multiple language configurations |

**Decision framework:**
1. Is this a conversational, multi-turn interaction requiring intent and slot management? Use Lex.
2. Does it require a phone channel in a contact center? Add Connect to Lex.
3. Is this converting text between languages? Use Translate.
4. Is it a single string needed immediately? Use Translate real-time (`translate_text`).
5. Is it large-volume documents? Use Translate batch with S3.
6. Are domain-specific terms being mistranslated? Use Custom Terminology or Active Custom Translation.

---

## How This Connects

- **AWS Lambda**: The primary fulfillment mechanism for Lex intents. When all required slots are collected, Lex invokes Lambda with the intent name and slot values as a structured JSON event. Lambda executes business logic (database lookups, API calls, writes) and returns a response Lex delivers to the user. Without Lambda, Lex can only return raw slot data — it cannot take actions on its own.
- **Amazon Connect**: Integrates Lex bots as the conversational intelligence layer for cloud contact centers. A Connect contact flow invokes a Lex bot for greeting, intent identification, and data collection before routing to a human agent or automated action. This enables deflection of high-volume repetitive calls (balance inquiries, order status, hours and location) without agent involvement.
- **Amazon Comprehend**: Pairs with Translate in multi-language document processing pipelines. A common pattern: use Translate to convert foreign-language content to English, then run Comprehend sentiment analysis or named entity recognition. This allows a single NLP pipeline to process content from all languages without training language-specific models.
- **Amazon S3**: The storage backbone for Translate batch jobs. Source documents are read from S3 input prefixes; translated output files are written back to S3 output prefixes. S3 event notifications can trigger Lambda to start a Translate batch job when new documents arrive, enabling fully automated, event-driven translation pipelines.

---

## Exam Traps

**Trap 1: Lex requires Amazon Transcribe to handle voice input.**
Lex includes automatic speech recognition (ASR) as a built-in capability — it accepts audio input directly and handles speech-to-text internally. You do not need Transcribe as a preprocessing step for Lex. Transcribe is a separate service for transcribing arbitrary audio recordings or streams (e.g., meeting recordings, call center recordings after the fact). For an interactive voice chatbot, Lex is self-contained.

**Trap 2: Lex can perform business logic without Lambda.**
Lex manages the conversation — intent recognition, slot elicitation, confirmation — but it cannot query databases, call APIs, or take external actions on its own. For any intent requiring a dynamic action, a Lambda function is required for fulfillment. Omitting Lambda means the bot can only collect and return data to the calling application, which is rarely sufficient for real applications.

**Trap 3: Amazon Translate automatically handles domain-specific vocabulary correctly.**
Without Custom Terminology, Translate applies general-purpose translation rules that may produce incorrect results for brand names, medical terms, legal Latin phrases, or proprietary product names. Custom Terminology must be explicitly created and referenced in each API call. It is not automatic and does not apply globally to all translations in your account.

**Trap 4: Batch Translate modifies source objects in S3.**
Batch Translate reads from a configured source prefix and writes translated files to a separate destination prefix. It never modifies the source documents. Source and destination must be separate S3 locations, and both must be specified when starting the job.

**Trap 5: Lex V1 and Lex V2 features are the same.**
Lex V2 is a redesigned service with significant capability differences from V1. Lex V2 introduced bot locales (multiple languages per bot), streaming conversations, and a restructured API and console. Exam questions referencing multi-language bots, streaming, or "bot locales" are specifically about Lex V2. New architectures should use Lex V2; V1 is legacy.

---

## Summary

- Amazon Lex builds conversational interfaces using intents (user goals) and slots (required data parameters), with Lambda invoked at fulfillment to perform dynamic actions.
- Lex V2 supports multiple bot locales for multilingual chatbots within a single bot, and DTMF input for phone-based IVR systems integrated with Amazon Connect.
- Amazon Translate provides neural machine translation for 75+ languages via synchronous API calls for real-time use cases and asynchronous batch jobs processing S3 documents.
- Custom Terminology enforces explicit term mappings for brand names, medical terms, and legal phrases; Active Custom Translation fine-tunes the model on domain-specific parallel corpora.
- Both services are fully managed, pay-per-use, HIPAA eligible, and require no ML model training or infrastructure management.
- The canonical exam architecture for conversational AI is Lex + Lambda + DynamoDB, with Amazon Connect added when a telephone channel is required.

---

## Examples

**Beginner:** A retail startup wants to add a live chat widget to their website that can answer "Where is my order?" and "What is your return policy?" They have no ML experience. They use Amazon Lex to define two intents: `CheckOrderStatus` (with a slot for `OrderID`) and `ReturnPolicy` (no slots, returns a static message). For `CheckOrderStatus`, they wire a Lambda function that queries their DynamoDB orders table and returns the current shipping status. The entire chatbot is operational in a few hours, with no model training and no servers to manage.

**Intermediate:** A healthcare company operates a multilingual patient portal serving English, Spanish, and Portuguese-speaking patients. They build a Lex V2 bot with three locales — `en_US`, `es_US`, and `pt_BR` — each with localized intents and sample utterances for appointment scheduling and prescription refill requests. Fulfillment Lambda functions call their EHR API. Patient messages submitted through the portal are translated to English using Amazon Translate before routing to English-speaking nursing staff; staff replies are translated back before display. Custom Terminology ensures drug names and procedure names are never mistranslated, and HIPAA eligibility of both services satisfies their compliance team.

**Advanced:** A global e-commerce platform receives millions of customer reviews daily in 40 languages. An EventBridge scheduled rule triggers a Lambda function each night that starts an Amazon Translate batch job, reading that day's new reviews from an S3 staging prefix and writing translated English versions to a processing prefix. A second Lambda, triggered by S3 completion notifications, invokes Amazon Comprehend batch sentiment analysis on the translated reviews and writes aggregate sentiment scores by product and region to DynamoDB. A QuickSight dashboard reads DynamoDB for product managers. Active Custom Translation trained on product-category-specific parallel data improves translation accuracy, and the fully serverless pipeline runs at a fraction of the cost of human translation.

---

## Think About It

1. A user says "I want to fly from Seattle to New York on December 15th" to a Lex bot. The `BookFlight` intent requires `DepartureCity`, `DestinationCity`, and `TravelDate`. What does Lex do next — does it prompt for anything? Why or why not?

2. Your Lex chatbot needs to look up a customer's account balance before confirming a transaction. Where does that lookup logic live, and how does Lex pass the relevant data to it? What format does the response need to take?

3. A stakeholder asks: "What stops Amazon Translate from mistranslating our proprietary product names into nonsense in the target language?" What is your answer, and what specific Translate feature does it reference?

4. Your team uses Amazon Translate to convert support tickets from Japanese to English. After deployment, you notice that your software product name "DataVault Pro" is being transliterated into phonetic Japanese characters instead of kept as-is. What is the correct fix, and how do you implement it?

5. An architect proposes using Amazon Transcribe to convert customer voice calls to text before passing that text to Amazon Lex for intent recognition. A colleague says this is redundant. Who is right, and is there a scenario where using both Transcribe and Lex together actually makes sense?

---

## Quick Check

**Question 1:** A company is building a voice-enabled IVR system for their contact center. Customers should be able to say their account number and request a balance check. Which combination of AWS services is most appropriate?

- A) Amazon Transcribe + AWS Lambda + Amazon DynamoDB
- B) Amazon Lex + Amazon Connect + AWS Lambda
- C) Amazon Polly + Amazon Comprehend + Amazon RDS
- D) Amazon Rekognition + Amazon Connect + AWS Lambda

**Answer: B** — Amazon Lex provides ASR and NLU for voice input, handling intent recognition (balance check request) and slot collection (account number). Amazon Connect provides the telephony infrastructure for the IVR. AWS Lambda handles fulfillment — querying the account balance. Option A uses Transcribe, which converts audio to text but provides no conversational flow or intent recognition. Option C uses Polly (text-to-speech output, not input recognition) and Comprehend (text analytics, not conversation management). Option D uses Rekognition, which is an image/video service with no relevance to voice.

---

**Question 2:** A company stores 2 million product descriptions in English in Amazon S3 and needs them translated into French, German, and Japanese for an international launch. The translations are needed within 24 hours but do not need to be real-time. Which approach is most cost-effective and operationally appropriate?

- A) Call `translate_text` in a loop from an EC2 instance for each document
- B) Use Amazon Translate batch translation with S3 input and output prefixes
- C) Use Amazon Comprehend to extract key phrases, then translate each phrase
- D) Train a custom SageMaker translation model on the product descriptions

**Answer: B** — Batch translation is designed exactly for this use case: high-volume documents in S3, translated asynchronously within a time window. Option A would technically work but is operationally fragile, difficult to monitor, handles retries manually, and requires managing infrastructure. Option C translates fragments rather than full documents and loses document context and structure. Option D is unnecessary cost and complexity — a managed translation service already handles this use case without training.

---

**Question 3:** An Amazon Translate batch job completes but the output files contain incorrect translations for several legal Latin phrases. For example, "habeas corpus" has been translated into a Spanish phrase rather than preserved as-is. What is the correct remediation?

- A) Increase the MaxConcurrency setting on the batch job to improve accuracy
- B) Upload a Custom Terminology file mapping the Latin phrases to themselves, and re-run the job referencing that terminology
- C) Switch from batch translation to real-time translation, which uses a more accurate model
- D) Use Amazon Comprehend to identify and remove Latin phrases before passing documents to Translate

**Answer: B** — Custom Terminology allows explicit term mappings, including mapping a term to itself to prevent translation. A CSV with `habeas corpus → habeas corpus` in the target language column forces Translate to preserve the phrase verbatim. This is the standard pattern for legal, medical, or brand terms. Option A (MaxConcurrency) controls throughput, not translation quality. Option C is incorrect — real-time and batch translation use the same underlying model; the accuracy issue would persist. Option D would produce incomplete documents missing important legal content.

---

## What's Next

The next lesson covers Amazon Polly and Amazon Transcribe — the text-to-speech and speech-to-text services that complete the AWS conversational AI toolkit. Understanding how Polly (voice output) and Transcribe (audio transcription for recordings and streams) complement Lex will complete your understanding of end-to-end voice application architecture on AWS.
