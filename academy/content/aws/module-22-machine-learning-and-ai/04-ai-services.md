---
title: "AI Services: Rekognition, Comprehend, Textract, and More"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "MLS-C01", "CLF-C02"]
---

# AI Services: Rekognition, Comprehend, Textract, and More

## Overview

AWS's pre-built AI services solve specific ML problems via API — no training data required. This lesson covers the most important AI services: computer vision (Rekognition), NLP (Comprehend), document understanding (Textract), forecasting (Forecast), and recommendations (Personalize).

## Amazon Rekognition

Rekognition analyzes images and videos for: object and scene detection (identify that an image contains 'car', 'tree', 'person'), facial analysis (detect faces, estimate age/gender/emotion, find facial landmarks), face comparison and recognition (is this face the same as a reference face?), text in images (OCR), content moderation (detect explicit or violent content), and video analysis (track people, detect activities, segment scenes). Use for: content moderation pipelines, identity verification, video surveillance analysis, product catalog image tagging.

## Amazon Comprehend

Comprehend is NLP-as-a-service. Capabilities: sentiment analysis (positive/negative/neutral/mixed per document or per entity), entity recognition (extract people, places, organizations, dates, quantities), key phrase extraction, language detection, topic modeling (LDA over document collections), and custom classification/entity recognition (train on your labeled data). Comprehend Medical is a specialized version for clinical text — extracts medical conditions, medications, dosages, and relationships. Use for: analyzing customer feedback, extracting information from contracts, routing support tickets.

## Amazon Textract

Textract goes beyond simple OCR — it analyzes document layout and extracts tables, forms (key-value pairs), and handwriting from PDFs, images, and scanned documents. Queries mode lets you ask natural language questions about a document ('What is the patient name?') without complex parsing. Lending AI and Expense Analysis are specialized Textract analyzers for loan documents and receipts. Integrate Textract with A2I (Augmented AI) to route low-confidence extractions to human reviewers for validation.

## Amazon Forecast and Personalize

Forecast produces time-series predictions using deep learning models — for demand forecasting, inventory planning, financial metrics. You provide historical data (sales by SKU, by day) and related data (promotions, holidays); Forecast trains and deploys a model automatically. Personalize provides real-time recommendations using the same algorithms as Amazon.com — train on user-item interaction history and serve personalized product recommendations, video recommendations, or content ranking. Both services abstract the ML complexity; you provide data and consume predictions via API.

## Summary

Rekognition for computer vision, Comprehend for NLP, Textract for document extraction, Forecast for time-series prediction, Personalize for recommendations. All operate as API services — no ML expertise required. These cover the most common ML use cases for application developers. Use them before reaching for SageMaker — they're faster to integrate and operationally simpler.

## Examples

A user-generated content platform receives tens of thousands of image uploads per hour. Before displaying any image publicly, they pass each through Rekognition's content moderation API, which scores the image for explicit and violent content. Images that score above a threshold are held for human review; the rest publish automatically. This replaces a 20-person moderation team for routine cases and lets humans focus only on borderline content — a direct application of Rekognition's content moderation capability at operational scale.

An insurance company receives thousands of claim forms as scanned PDFs each day. Their previous process required clerks to manually key data from the forms into their claims management system. By routing each PDF through Textract with form extraction enabled, they receive structured key-value pairs — policyholder name, claim date, amount requested — that feed directly into their database. Where Textract's confidence is low, they route to Amazon A2I for human review, creating a hybrid human-in-the-loop pipeline rather than a fully manual one.

A streaming platform with 50 million users wants to improve content recommendations beyond a simple "most popular" ranking. They use Amazon Personalize, feeding it years of user-item interaction history. Within days, the service trains a recommendation model using the same deep learning techniques as Amazon.com and exposes a real-time API. The platform's engineering team never wrote a recommendation algorithm — they just provided data in Personalize's expected format and consumed the API. The key insight is that Personalize handles the cold start problem, new item injection, and model retraining automatically.

## Think About It

1. Why would a company use Amazon Comprehend for sentiment analysis of customer support tickets rather than simply counting positive and negative keywords with a rules-based approach?
2. What would happen if a healthcare company used standard Amazon Comprehend instead of Comprehend Medical to extract diagnoses from clinical notes — and why does the distinction matter?
3. How would you decide whether to use Amazon Forecast or to build a custom time-series model in SageMaker for a demand forecasting use case with strong seasonality and external influencing factors like promotions?
4. Rekognition's facial recognition capability raises privacy concerns if misused. What architectural controls would you design into a system to ensure it's used only for legitimate, consented identity verification?
5. Amazon Personalize requires a minimum amount of interaction history to produce accurate recommendations. What would you do in the early days of a new product when that interaction data doesn't yet exist?

## Quick Check

**Q1.** A company wants to automatically classify incoming customer support emails into categories like "billing," "technical issue," and "account access" without building a model from scratch. Which Comprehend feature is most appropriate?
- A) Entity recognition
- B) Topic modeling
- C) Custom classification
- D) Sentiment analysis

**Answer: C** — Comprehend Custom Classification lets you train a text classifier on your own labeled examples, enabling domain-specific routing categories that Comprehend's built-in capabilities don't cover.

**Q2.** What makes Amazon Textract different from a standard OCR service?
- A) Textract only works with handwritten text, while OCR handles printed text
- B) Textract understands document layout and extracts structured tables and form key-value pairs, not just raw text
- C) Textract requires a custom trained model for each document type
- D) Textract uses Rekognition under the hood to identify document regions

**Answer: B** — Textract analyzes document structure, enabling extraction of structured data like form fields and table cells — not just a flat stream of characters that OCR alone would produce.

**Q3.** Which AWS AI service would you use to build a real-time product recommendation feature for an e-commerce site based on user purchase and browsing history?
- A) Amazon Forecast
- B) Amazon Comprehend
- C) Amazon Personalize
- D) Amazon Rekognition

**Answer: C** — Personalize is specifically designed for real-time personalized recommendations trained on user-item interaction data, analogous to the recommendation engine powering Amazon.com.

## What's Next

Next up: the Module 22 Canvas Labs — integrating AI services into an application architecture.