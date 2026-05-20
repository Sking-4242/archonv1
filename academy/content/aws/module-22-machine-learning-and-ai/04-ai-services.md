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

## What's Next

Next up: the Module 22 Canvas Labs — integrating AI services into an application architecture.