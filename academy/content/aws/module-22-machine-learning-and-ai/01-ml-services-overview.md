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

## What's Next

Next up: Amazon Bedrock in depth — foundation models, Knowledge Bases, and RAG patterns.