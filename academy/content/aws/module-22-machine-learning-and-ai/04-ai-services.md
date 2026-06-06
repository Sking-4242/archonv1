---
title: "AI Services: Rekognition, Comprehend, Textract, and More"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "MLS-C01", "CLF-C02"]
---

# AI Services: Rekognition, Comprehend, Textract, and More

## Overview

AWS's pre-built AI services solve specific, well-defined ML problems via simple API calls — no training data required (unless you use custom variants), no model infrastructure to manage. This lesson covers the major AI services in depth: Amazon Rekognition (computer vision), Amazon Comprehend (NLP), Amazon Textract (document understanding), Amazon Forecast (time-series prediction), and Amazon Personalize (recommendations). Together these services cover the most common ML use cases in production applications.

The architectural principle these services embed is: start at the lowest complexity tier that solves the problem. A team that uses Rekognition `DetectLabels` for product image tagging ships in a day. The same team building a custom image classification model in SageMaker ships in weeks. When the pre-built service is accurate enough, the ROI gap is enormous. The question is always: can this service solve the problem at the accuracy level my use case requires?

For the SAA exam, understand each service's core use case and when to prefer one over another. MLS adds Comprehend Custom Classification, Rekognition Custom Labels, Textract Queries, and the A2I human-in-the-loop integration. After this lesson, you will be able to match any NLP, computer vision, or document processing requirement to the correct AWS AI service.

---

## Core Concepts

### Amazon Rekognition

Rekognition analyzes images and videos using pre-trained deep learning models. Core capabilities:

**Image analysis**:
- `DetectLabels`: identify objects, scenes, and activities in an image — "Person", "Car", "Outdoor", "Beach" with confidence scores
- `DetectFaces`: detect face bounding boxes and attributes (approximate age range, emotions, glasses, eyes open, quality metrics)
- `CompareFaces`: compare two faces and determine if they are the same person, with a similarity score
- `RecognizeCelebrities`: identify public figures
- `DetectText`: extract text from images (OCR) — printed or handwritten
- `DetectModerationLabels`: identify explicit, violent, or inappropriate content for content moderation pipelines
- `DetectProtectiveEquipment`: detect PPE (hard hat, mask, safety vest) on people — industrial safety use cases

**Video analysis** (via Video API — asynchronous): person tracking across frames, activity recognition, face search against a collection, scene detection, segment detection (technical cue, shot change).

**Rekognition Custom Labels**: train a custom image classification or object detection model on your own labeled images (minimum 10 images per class, typically 100+ for good accuracy). Uses transfer learning — you provide labels, Rekognition handles the training. Used when pre-built labels don't cover your specific objects (company logos, proprietary products, domain-specific visual inspection).

---

### Amazon Comprehend

Comprehend performs NLP on text — extracting meaning from unstructured language. Core capabilities:

**Built-in analysis** (no training required):
- `DetectSentiment`: positive, negative, neutral, or mixed sentiment per document
- `DetectEntities`: extract named entities — PERSON, LOCATION, ORGANIZATION, DATE, QUANTITY, EVENT, TITLE, BRAND
- `DetectKeyPhrases`: identify the most significant noun phrases
- `DetectLanguage`: identify the language of text (100+ languages)
- `ClassifyDocument`: classify text against Comprehend's built-in ontology (sports, finance, health, etc.)
- `DetectPiiEntities`: identify and optionally redact PII (names, addresses, SSNs, credit card numbers, phone numbers)

**Custom models** (requires labeled training data):
- **Custom Classification**: train a multi-class or multi-label text classifier on your labeled examples. Minimum 50 examples per class, recommended 100+. Used for: routing support tickets, classifying loan applications, tagging news articles with custom categories.
- **Custom Entity Recognition**: train a custom NER model to extract domain-specific entities not covered by the built-in entity types (medical device names, legal clause identifiers, proprietary product codes).

**Comprehend Medical**: specialized version trained on clinical text — extracts diagnoses, medications, dosages, symptoms, treatments, and relationships between them. HIPAA eligible. Standard Comprehend is not trained on medical terminology and produces poor results on clinical notes; Comprehend Medical is necessary for healthcare NLP.

---

### Amazon Textract

Textract extracts text, tables, and structured form data from PDFs, JPGs, PNGs, and TIFF images — going beyond basic OCR by understanding document layout.

**Analysis modes**:
- `DetectDocumentText`: raw text extraction, block by block
- `AnalyzeDocument(FeatureTypes=['TABLES'])`: extract table structure with row/column relationship preserved
- `AnalyzeDocument(FeatureTypes=['FORMS'])`: extract key-value pairs from form fields ("First Name: Jane Doe")
- `AnalyzeDocument(FeatureTypes=['SIGNATURES'])`: detect signature blocks
- `AnalyzeDocument(FeatureTypes=['QUERIES'])`: answer natural language questions about the document ("What is the patient's date of birth?" → "March 15, 1987")

**Specialized analyzers**:
- **Lending AI**: purpose-built for loan documents — extracts data from paystubs, bank statements, W-2s, tax returns
- **Expense Analysis**: extracts line items, totals, vendor names, and dates from receipts and invoices

**Amazon A2I (Augmented AI) integration**: route low-confidence Textract extractions to human reviewers. Define a confidence threshold — extractions below the threshold go into an A2I work queue where human reviewers validate and correct them. A2I provides a managed review interface and integrates directly with Textract and Rekognition. Use for: financial document processing where errors are costly, medical form data entry, any workflow where 100% automation introduces unacceptable risk.

---

### Amazon Forecast and Amazon Personalize

**Amazon Forecast**: fully managed time-series forecasting service. Provide historical target data (sales by day, demand by SKU, energy consumption by hour) and optional related data (holidays, weather, promotions). Forecast automatically: selects the best algorithm (DeepAR+, CNN-QR, ARIMA, Prophet, NPTS, ETS), trains multiple models, and selects the best via backtesting. Deploy the model as a predictor and query forecasts via API.

Use Forecast when: you need multi-horizon probabilistic forecasts (point estimates + confidence intervals), the data has strong seasonality or external drivers, or you need to forecast thousands of time series simultaneously (one model per SKU, per store).

**Amazon Personalize**: real-time personalized recommendations using the same algorithms that power Amazon.com product recommendations. Provide: user-item interaction history (purchases, views, ratings), optional item metadata (category, price, genre), optional user metadata (age, preferences). Personalize trains a recommendation model automatically and exposes a real-time inference API.

Use Personalize when: you need personalized product recommendations, video/content recommendations, ranked search results, or "related items" features. Personalize handles the cold start problem (new users and new items), automatic model retraining as new interactions arrive, and filters (exclude out-of-stock items from recommendations).

---

## Configuration Reference

### Example: Rekognition Content Moderation Pipeline

```python
import boto3

rekognition = boto3.client('rekognition', region_name='us-east-1')
sqs = boto3.client('sqs', region_name='us-east-1')

def moderate_user_upload(bucket: str, key: str) -> dict:
    """Moderate an image and return the moderation decision."""
    
    response = rekognition.detect_moderation_labels(
        Image={'S3Object': {'Bucket': bucket, 'Name': key}},
        MinConfidence=60    # only return labels with >= 60% confidence
    )
    
    labels = response['ModerationLabels']
    
    # Check for high-severity violations
    high_severity = [
        label for label in labels
        if label['ParentName'] in ['Explicit Nudity', 'Violence', 'Weapons']
        and label['Confidence'] > 85
    ]
    
    # Check for lower-severity content requiring review
    needs_review = [
        label for label in labels
        if label['Confidence'] > 60 and label not in high_severity
    ]
    
    if high_severity:
        return {'action': 'block', 'reason': high_severity}
    elif needs_review:
        # Route to human review via A2I
        return {'action': 'review', 'labels': needs_review}
    else:
        return {'action': 'approve'}

# Triggered by S3 upload event via Lambda
result = moderate_user_upload('user-uploads', 'profile_photo_12345.jpg')
if result['action'] == 'block':
    print(f"Image blocked: {result['reason']}")
elif result['action'] == 'review':
    # Send to A2I human review queue
    print(f"Image sent for human review: {result['labels']}")
else:
    print("Image approved for publication")
```

---

### Example: Comprehend Custom Classification and PII Detection

```python
import boto3

comprehend = boto3.client('comprehend', region_name='us-east-1')

# Use built-in PII detection for real-time redaction
def redact_pii(text: str) -> str:
    """Redact PII entities from text before storage."""
    
    response = comprehend.detect_pii_entities(
        Text=text,
        LanguageCode='en'
    )
    
    # Replace each PII entity with its type label, working backwards to preserve offsets
    entities = sorted(response['Entities'], key=lambda e: e['BeginOffset'], reverse=True)
    text_chars = list(text)
    for entity in entities:
        replacement = f"[{entity['Type']}]"
        text_chars[entity['BeginOffset']:entity['EndOffset']] = list(replacement)
    return ''.join(text_chars)

# Example: redact PII from a support ticket before logging
raw = "Hi, I'm Jane Doe, my SSN is 123-45-6789 and my email is jane@example.com"
clean = redact_pii(raw)
print(clean)
# Output: "Hi, I'm [NAME], my SSN is [SSN] and my email is [EMAIL]"

# Use a custom classifier to route support tickets
CLASSIFIER_ARN = 'arn:aws:comprehend:us-east-1:123456789012:document-classifier/support-router/version/v2'

def classify_ticket(ticket_text: str) -> str:
    response = comprehend.classify_document(
        Text=ticket_text,
        EndpointArn=CLASSIFIER_ARN
    )
    # Return the highest-confidence class
    top_class = max(response['Classes'], key=lambda c: c['Score'])
    return top_class['Name']

ticket = "My order hasn't arrived and tracking shows it's been stuck for a week"
queue = classify_ticket(ticket)
print(f"Route to: {queue}")   # e.g. "SHIPPING_ISSUE"
```