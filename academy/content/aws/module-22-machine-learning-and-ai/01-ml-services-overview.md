---
title: "AWS Machine Learning Services Overview"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "MLS-C01", "CLF-C02"]
---

# AWS Machine Learning Services Overview

## Overview

AWS offers ML services at three levels: AI services (pre-built APIs, no ML expertise needed), ML platforms (Amazon SageMaker for building custom models), and ML frameworks/infrastructure (managed Jupyter notebooks, Trainium and Inferentia chips). This lesson maps the landscape so you can choose the right service for the task.

## AI Services: Pre-Built Intelligence

AWS AI services provide ML capabilities via API without any model training: Rekognition (image and video analysis — object detection, facial recognition, content moderation), Comprehend (NLP — sentiment, entity extraction, language detection, topic modeling), Translate (neural machine translation), Polly (text-to-speech), Transcribe (speech-to-text), Textract (document text extraction — tables, forms, PDFs), Forecast (time-series forecasting), Personalize (real-time recommendations). Use AI services when your use case matches a well-defined problem — no training data or ML expertise required.

## Amazon Bedrock

Bedrock provides access to foundation models (FMs) from AWS and third-party model providers (Anthropic Claude, Meta Llama, Mistral, Cohere, Stability AI) via a single managed API. Use Bedrock for: generative AI features (chatbots, content generation, summarization, code generation, Q&A), retrieval-augmented generation (RAG) with Knowledge Bases, and agentic AI workflows. Bedrock is serverless — no GPU instances to manage, pay per token. Model responses and inputs are not used to train models.

## Amazon SageMaker

SageMaker is the fully managed ML platform for building, training, and deploying custom ML models. Components: SageMaker Studio (integrated IDE for ML), Data Wrangler (visual data preparation), Feature Store (managed feature repository), Training Jobs (distributed model training on managed GPU clusters), Model Registry (versioned model catalog), Endpoints (real-time inference hosting), Batch Transform (offline bulk inference), Pipelines (MLOps CI/CD for models). Use SageMaker when you need to train custom models on your own data.

## Specialized Compute for ML

Amazon EC2 P4d and P5 instances with NVIDIA A100/H100 GPUs for standard deep learning training. AWS Trainium chips (Trn1 instances) are purpose-built for training large language models at lower cost than GPU instances. AWS Inferentia chips (Inf2 instances) are purpose-built for low-cost, high-throughput inference deployment. For model inference at scale, Inferentia instances can reduce inference costs by up to 70% compared to GPU instances.

## Summary

AWS ML is tiered: pre-built AI APIs for common tasks, Bedrock for generative AI with foundation models, SageMaker for custom model development. AI services require no ML expertise; Bedrock requires prompt engineering; SageMaker requires ML expertise. Choose the right level for your use case — starting with AI services avoids the complexity of custom model training when a pre-built solution exists.

## Examples

A regional retailer wants to add product image tagging to their e-commerce catalog. Rather than hiring a data science team, they call the Rekognition DetectLabels API and receive structured labels — "sneaker," "white," "athletic" — in milliseconds per image. This is the AI services tier in action: a solved problem with a pre-built API, no training data required.

A financial services startup is building an internal document assistant that answers questions about compliance policies stored in SharePoint. They use Amazon Bedrock Knowledge Bases to ingest the PDFs, embed them into OpenSearch Serverless, and wire up Claude via the Converse API. The team ships a working prototype in two weeks — possible because Bedrock handles the infrastructure and they only need prompt engineering skills, not ML expertise.

A healthcare analytics company needs to predict patient readmission risk using their proprietary EHR data — a problem no pre-built AI service covers and no foundation model has been trained on. They use SageMaker Training Jobs with a custom XGBoost container, their own labeled dataset in S3, and SageMaker Autopilot to establish a baseline. This represents the SageMaker tier: when your use case is domain-specific enough that custom model training is unavoidable.

## Think About It

1. Why would you choose a pre-built AI service like Comprehend over building a custom sentiment model in SageMaker, even if you have labeled training data?
2. What would happen if you used a foundation model via Bedrock to answer questions about your company's internal policies without grounding it in your actual documents — and how does that change your architecture decision?
3. How would you decide which tier to start with for a new ML use case — what questions would you ask before reaching for SageMaker?
4. AWS Inferentia chips reduce inference costs by up to 70% compared to GPU instances. What trade-offs might exist in choosing Inferentia over a standard GPU instance for a new model deployment?
5. If AWS adds a new pre-built AI service that matches your existing custom SageMaker model's use case, what factors would drive your decision to migrate versus staying on your custom model?

## Quick Check

**Q1.** A company wants to extract key-value pairs from scanned paper forms with no ML training. Which AWS service is the best fit?
- A) Amazon Comprehend
- B) Amazon Textract
- C) Amazon SageMaker with a custom OCR container
- D) Amazon Rekognition

**Answer: B** — Textract is purpose-built for document layout analysis, including extracting structured form fields and tables from scanned documents without any model training.

**Q2.** Which statement best describes the difference between Amazon Bedrock and Amazon SageMaker?
- A) Bedrock trains custom models; SageMaker hosts pre-trained models
- B) Bedrock provides API access to foundation models; SageMaker is for building and training custom models
- C) Bedrock is only for image generation; SageMaker handles all text tasks
- D) Bedrock requires GPU instances; SageMaker is serverless

**Answer: B** — Bedrock is a managed API for foundation models requiring no training infrastructure, while SageMaker is the full MLOps platform for custom model development on your own data.

**Q3.** AWS Trainium chips are optimized for which ML task?
- A) Real-time inference on small models
- B) Training large language models at lower cost than GPU instances
- C) Image generation using diffusion models
- D) Vector embedding storage and retrieval

**Answer: B** — Trainium (Trn1 instances) are purpose-built for model training, particularly large language models, offering lower cost than equivalent NVIDIA GPU instances for training workloads.

## What's Next

Next up: Amazon Bedrock in depth — foundation models, Knowledge Bases, and RAG patterns.