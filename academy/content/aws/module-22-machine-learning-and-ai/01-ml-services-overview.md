---
title: "AWS Machine Learning Services Overview"
type: content
estimated_minutes: 11
cert_tags: ["CLF-C02", "SAA-C03", "AIF-C01", "MLA-C01"]
---

# AWS Machine Learning Services Overview

## Overview

AWS organizes its machine learning services into three tiers based on the level of ML expertise required. Pre-built **AI services** solve specific, well-defined problems via API — no training data, no model expertise required. **Amazon Bedrock** provides access to powerful foundation models (FMs) from multiple providers via a single managed API — generative AI features without managing model infrastructure. **Amazon SageMaker** is the full MLOps platform for teams that need to build, train, and deploy custom models on their own data.

This tiered model matters because choosing the wrong level creates unnecessary complexity and cost. Teams that reach for SageMaker to solve a problem that Rekognition solves in two API calls have spent weeks building what could have been an afternoon's integration. Conversely, teams that try to fit their domain-specific medical imaging problem into a generic pre-built AI service end up with poor accuracy. The first question in any ML conversation is: which tier fits this problem?

For the SAA exam, understand the three tiers and which service addresses which use case. For CLF, know the pre-built AI services at a conceptual level. MLS adds deep SageMaker and Bedrock knowledge. After this lesson, you will be able to identify the correct AWS ML tier and specific service for any problem description.

---

## Core Concepts

### Tier 1: Pre-Built AI Services

Pre-built AI services provide ML capabilities via simple API calls — you send data, you receive predictions. No training data collection, no model selection, no infrastructure management. AWS has already trained the models on massive datasets; you consume the results.

**Computer vision**: Amazon Rekognition — object and scene detection, facial analysis, face comparison/recognition, text in images (OCR), content moderation, video analysis (people tracking, activity detection).

**Natural language processing**: Amazon Comprehend — sentiment analysis, entity recognition (people, places, organizations, dates), key phrase extraction, language detection, topic modeling, and custom text classification/entity recognition trained on your labels.

**Document understanding**: Amazon Textract — extracts text, tables, and form key-value pairs from PDFs, images, and scanned documents. Goes beyond OCR by understanding document layout structure.

**Speech**: Amazon Transcribe (speech-to-text), Amazon Polly (text-to-speech with multiple voices and languages).

**Translation**: Amazon Translate — neural machine translation across 75+ language pairs.

**Forecasting and recommendations**: Amazon Forecast (time-series prediction), Amazon Personalize (real-time recommendations).

The right tier test: if AWS has a pre-built service for your use case, start there. The cost is API calls instead of model development cycles.

---

### Tier 2: Amazon Bedrock (Foundation Models)

Bedrock provides API access to large, pre-trained foundation models from AWS and third-party providers: Anthropic Claude, Meta Llama, Mistral, Cohere Command, Stability AI (image generation), and Amazon Titan (text and embeddings). These models have been trained on vast corpora and can perform a wide range of language and vision tasks.

**The Bedrock tier addresses**: generative text (chatbots, summarization, Q&A, content generation, code generation, reasoning), image generation, embedding generation for semantic search and RAG. Use Bedrock when the pre-built AI services don't cover your use case but training a custom model from scratch would be overkill.

**What Bedrock requires**: prompt engineering skills (how to instruct the model), understanding of model behavior and limitations (hallucinations, context window limits, token pricing), and application integration via the Bedrock API. No ML training expertise required.

**Serverless and per-token pricing**: Bedrock is fully managed with no model infrastructure to provision. You pay per input and output token. Model selection (Claude vs. Llama vs. Titan) is a configuration choice, not an infrastructure decision.

---

### Tier 3: Amazon SageMaker (Custom Models)

SageMaker is the end-to-end managed ML platform for teams building custom models on their own data. It covers the complete ML lifecycle: data preparation (Data Wrangler, Feature Store), model training (Training Jobs, Automatic Model Tuning), model evaluation and governance (Model Registry), deployment (Real-Time Endpoints, Serverless Inference, Batch Transform), and monitoring (Model Monitor for drift detection).

**The SageMaker tier addresses**: domain-specific problems where no pre-built service or foundation model provides sufficient accuracy because the prediction space is specific to your data (medical imaging anomaly detection, proprietary fraud scoring, custom product ranking). Requires ML expertise: data scientists who understand algorithms, feature engineering, evaluation metrics, and model lifecycle management.

**Cost model**: SageMaker charges for compute time during training (GPU/CPU instances per hour), storage, and inference endpoint runtime. Unlike Bedrock (per-token) or AI services (per API call), SageMaker's cost scales with training duration and inference volume — requires capacity planning.

---

### Specialized ML Compute

**AWS Trainium (Trn1 instances)**: purpose-built chips for training large language models and deep neural networks. Lower cost per training token than equivalent NVIDIA GPU instances. Optimized for PyTorch via the AWS Neuron SDK. Used for cost-efficient LLM pre-training and fine-tuning within SageMaker or on EC2.

**AWS Inferentia (Inf2 instances)**: purpose-built chips for running inference on trained models at high throughput and low cost. Inferentia provides up to 70% lower cost per inference versus equivalent GPU instances. Used for hosting high-traffic SageMaker Real-Time Endpoints or custom inference servers.

**P-series EC2 (P4d, P5)**: NVIDIA A100/H100 GPUs for standard deep learning training workloads. P5 with H100 GPUs is the highest-performance option for large-scale model training when Trainium ecosystem compatibility is not yet available.

---

## Configuration Reference

### Example: Quick AI Services API Comparison

```python
import boto3

# Tier 1: Rekognition — detect labels in an image (no setup beyond IAM)
rekognition = boto3.client('rekognition', region_name='us-east-1')
response = rekognition.detect_labels(
    Image={'S3Object': {'Bucket': 'my-images', 'Name': 'product.jpg'}},
    MaxLabels=10,
    MinConfidence=70
)
# Returns: [{"Name": "Sneaker", "Confidence": 98.7}, {"Name": "Shoe", "Confidence": 97.2}]

# Tier 1: Textract — extract form fields from a document
textract = boto3.client('textract', region_name='us-east-1')
response = textract.analyze_document(
    Document={'S3Object': {'Bucket': 'my-docs', 'Name': 'application_form.pdf'}},
    FeatureTypes=['FORMS']
)
# Returns key-value pairs: {"First Name": "Jane", "Last Name": "Doe", "DOB": "1990-01-15"}

# Tier 2: Bedrock — invoke Claude via the Converse API
bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
response = bedrock.converse(
    modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
    messages=[{
        "role": "user",
        "content": [{"type": "text", "text": "Summarize this contract in 3 bullet points: ..."}]
    }]
)
summary = response['output']['message']['content'][0]['text']

# Tier 3: SageMaker — invoke a deployed custom model endpoint
sagemaker_runtime = boto3.client('sagemaker-runtime', region_name='us-east-1')
response = sagemaker_runtime.invoke_endpoint(
    EndpointName='my-custom-model-endpoint',
    ContentType='text/csv',
    Body='feature1,feature2,feature3\n1.2,3.4,0.8'
)
prediction = response['Body'].read().decode('utf-8')
print(f"Prediction: {prediction}")
```