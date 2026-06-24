---
title: "Amazon Rekognition"
type: content
estimated_minutes: 13
cert_tags: ["AIF-C01"]
---

# Amazon Rekognition

## Overview

Amazon Rekognition is a managed **computer vision** service that analyzes images and videos using machine learning — detecting objects, scenes, text, faces, and inappropriate content — with **no ML expertise required**. You send it an image or video and it returns structured analysis through a simple API. This *service reference* lesson covers what Rekognition detects, custom labels, video and face capabilities, privacy considerations, and what each certification expects.

Rekognition matters because images and video are everywhere — user uploads, security cameras, media libraries, documents — and extracting meaning from them manually is impossible at scale. Rekognition provides ready-made vision capabilities so you can add image/video understanding to applications without training models. The mental model is a **pre-trained AI service for vision**: call it with media and get labels, faces, text, or moderation results immediately, with the option to train **Custom Labels** for objects specific to your domain. It is the vision counterpart to Comprehend (language).

---

## How It Works

Rekognition offers several capabilities over images and stored or streaming video:

- **Label / object & scene detection** — identify objects, scenes, and activities.
- **Text in images (OCR-lite)** — detect and read text overlaid in images/video (street signs, labels).
- **Content moderation** — flag inappropriate, unsafe, or explicit content.
- **Face analysis and comparison** — detect faces, analyze attributes (emotions, age range), and **compare/search faces** against a collection for verification or identification.
- **Celebrity recognition** and **PPE detection** (e.g., safety equipment).
- **Video analysis** — the above on video, plus people pathing and segment detection.

For domain-specific objects the built-in labels don't cover, **Rekognition Custom Labels** trains a model on your labeled images (no ML infrastructure). Face data can be stored in **collections** for search; facial recognition use is subject to privacy/ethics considerations.

---

## Key Features

- **Object/scene/label detection**, **text-in-image**, and **content moderation**.
- **Face detection, analysis, comparison, and search** (collections) for verification/identification.
- **Custom Labels** to detect your own object types from labeled images.
- **Video analysis** for stored and streaming video.
- **Integration** with S3 (media), Lambda (pipelines), and Kinesis Video Streams (live).

---

## Configuration Reference

- **Use built-in detections** via the API for common vision tasks; analyze media in **S3**.
- **Train Custom Labels** when you need to recognize domain-specific objects/brands not in the built-in labels.
- **Use face collections** for face search/verification, with attention to **privacy, consent, and bias** considerations.
- **Secure** with IAM/KMS and keep media in your account/region.

---

## Operations and Troubleshooting

- **Rekognition vs. SageMaker.** For common vision tasks with **no ML expertise**, use **Rekognition**; for a fully custom vision model with algorithm control, use **SageMaker**. **Custom Labels** covers domain-specific objects without infrastructure.
- **Domain objects not recognized.** Train **Custom Labels** on your images.
- **Responsible use.** Facial recognition raises bias/privacy/consent issues — apply governance, human review, and appropriate use limits.
- **Live video.** Use **Kinesis Video Streams** with Rekognition for streaming analysis.

---

## Integrations

Rekognition analyzes media in **S3**, is invoked by **Lambda** in pipelines, processes live video via **Kinesis Video Streams**, is secured with **IAM/KMS**, and pairs with **Textract** (document text), **Comprehend** (analyze detected text), and moderation workflows. It is the vision member of the pre-trained AI services, complementing **SageMaker** (custom models) and **Bedrock** (multimodal generative AI).

---

## Pricing and Cost Considerations

Rekognition bills by **images processed** and **minutes of video analyzed** per feature, with separate pricing for **Custom Labels** (training and inference hours) and face-collection storage. The levers are using built-in APIs where they suffice, batching, shutting down idle Custom Labels endpoints, and scoping video analysis. Exact prices vary by feature and Region.

---

## Exam Relevance

**AIF-C01:** Know Rekognition as the pre-trained **computer vision** service (labels, text-in-image, content moderation, face analysis/search, video), **Custom Labels** for domain objects, **no ML expertise** required, and the **responsible-AI** considerations of facial recognition — distinct from SageMaker (custom) and Bedrock (generative). Conceptual content.

---

## Summary

Amazon Rekognition is a managed computer-vision service that detects objects, scenes, text, faces, and unsafe content in images and video with no ML expertise, offering face comparison/search via collections and Custom Labels for domain-specific objects trained on your images. It analyzes S3 media and live Kinesis video, integrates with Lambda/Textract/Comprehend, and is secured with IAM/KMS. The defining exam points are Rekognition as the pre-trained vision AI service (vs. SageMaker custom models and Bedrock generative AI), Custom Labels for domain objects, and the privacy/bias considerations of facial recognition.

---

## Quick Check

1. What can Rekognition detect in images and video?
2. When would you train Custom Labels instead of using built-in detection?
3. What are face collections used for, and what responsible-AI concerns apply?
4. How does Rekognition differ from SageMaker for vision tasks?
5. How would you analyze a live video stream?

---

## What's Next

Pair this with **Amazon Textract** (document text), **Amazon Comprehend** (analyze detected text), **Amazon Kinesis** Video Streams (live), and **Amazon Bedrock**/**SageMaker** (generative/custom alternatives).
