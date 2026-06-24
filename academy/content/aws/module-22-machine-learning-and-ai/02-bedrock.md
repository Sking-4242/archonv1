---
title: "Amazon Bedrock: Foundation Models and Generative AI"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "AIF-C01", "MLA-C01"]
---

# Amazon Bedrock: Foundation Models and Generative AI

## Overview

Amazon Bedrock is the managed foundation model API layer on AWS. It provides API access to powerful pre-trained models from AWS and third-party providers — Amazon Nova, Anthropic Claude, Meta Llama, Mistral, Cohere, Stability AI, and Amazon Titan — for text generation, summarization, Q&A, code generation, image generation, and embedding creation. No model infrastructure to provision, no GPUs to manage, no training required: send a request, receive a response, pay per token.

The problem Bedrock solves is the infrastructure gap between "I want to add an AI feature" and "I have a working AI feature." Before managed FM APIs, adding a chatbot to an application required: selecting a model, acquiring GPU instances, serving the model with a serving framework, scaling the inference server, monitoring GPU utilization, and patching the serving stack. Bedrock replaces all of that with an API call, letting teams focus on the application layer — prompts, context, user experience — rather than ML infrastructure.

For the SAA and MLS exams, understand Bedrock's model selection, the Converse API for multi-turn chat, Knowledge Bases for RAG, Bedrock Agents for multi-step automation, and Guardrails for safety. After this lesson, you will be able to design a complete generative AI feature on AWS using Bedrock and explain each component's role.

---

## Core Concepts

### Foundation Models and the Bedrock Model API

Bedrock provides access to multiple foundation model families, each suited to different tasks:

- **Amazon Nova (Micro, Lite, Pro, Premier)**: AWS's current flagship model family, launched November 2024. Nova models handle text, multimodal (images + text), and agentic workloads. Nova Micro is the lowest-latency/cost option; Nova Premier is the highest-capability. Nova models are the recommended choice for AWS-native AI architectures and offer competitive performance at lower cost than many third-party models.
- **Anthropic Claude (3.5 Sonnet, 3.5 Haiku, etc.)**: the highest-capability third-party models for complex reasoning, analysis, document understanding, and code generation. Different Claude versions trade off capability against cost and latency.
- **Meta Llama**: open-weight models suitable for fine-tuning and deployment within AWS infrastructure. Popular for organizations requiring open-source provenance.
- **Mistral**: high-performance European models with strong multilingual capabilities.
- **Amazon Titan**: AWS's earlier text and embedding models. Superseded by Amazon Nova for most use cases; Titan Text and Titan Embeddings V2 remain available.
- **Stability AI**: Stable Diffusion for image generation.
- **Cohere**: embedding and text generation models with strong retrieval performance.

**API options**:
- **InvokeModel**: single-turn, synchronous invocation. Each model has its own request/response format.
- **InvokeModelWithResponseStream**: same as InvokeModel but streams tokens back as they are generated — better user experience for chatbots.
- **Converse API**: unified multi-turn conversation interface that works across all text models with a consistent request/response format. Handles message history, system prompts, and tool use (function calling). Recommended for all new chat implementations.

**Pricing**: per input token and per output token, varying by model. Output tokens are typically 3–5x more expensive than input tokens. Context window length (number of tokens) directly affects both capability and cost.

---

### Knowledge Bases — Retrieval-Augmented Generation (RAG)

Foundation models are trained on general data up to a knowledge cutoff. They cannot answer questions about your proprietary documents, recent events, or internal policies without augmentation. **Retrieval-Augmented Generation (RAG)** solves this by providing relevant context from your documents at query time — retrieved from a vector database and included in the prompt.

**Bedrock Knowledge Bases** automates the RAG infrastructure:
1. **Ingestion**: upload documents (PDFs, Word, HTML, Markdown, S3 files) to S3. Knowledge Bases chunks the documents, generates embeddings using Amazon Titan Embeddings V2 or Amazon Nova Embedding (or another configured embedding model), and stores the embeddings in a vector database.
2. **Vector database options**: Amazon OpenSearch Serverless (default), Amazon Aurora PostgreSQL with pgvector, Pinecone, Weaviate, Redis. Choose based on existing infrastructure or cost.
3. **Retrieval**: at query time, the user's question is embedded and semantically similar document chunks are retrieved from the vector database.
4. **Generation**: retrieved chunks + user question are assembled into a prompt and passed to the configured foundation model. The model generates a grounded response citing your documents.

**RAG dramatically reduces hallucinations** by grounding the model's response in retrieved content rather than model memory. The model can only say things that are supported by the retrieved context — or explicitly state it doesn't know.

---

### Bedrock Agents

Bedrock Agents enable foundation models to take actions — not just generate text. An agent has:
- A **foundation model** (Claude, Titan, etc.) as its reasoning engine
- A **system prompt** (instructions defining behavior, persona, scope)
- **Action groups**: Lambda functions the agent can invoke to interact with external systems (query databases, call APIs, update records)
- Optionally, a **Knowledge Base** for information retrieval

Agents operate in a **ReAct loop** (Reason + Act): analyze the user's request → decide which action to take → invoke the Lambda → observe the result → decide the next action → repeat until the agent can formulate a complete response. The agent reasons about multi-step tasks autonomously.

**Example**: a customer service agent with action groups for `GetOrderStatus(orderId)`, `ProcessRefund(orderId, amount)`, and `UpdateShippingAddress(orderId, address)`. When a customer asks "why hasn't my order from last Tuesday arrived?", the agent calls `GetOrderStatus`, observes that the shipment is delayed, and responds with the status — without human routing or hard-coded decision trees.

---

### Bedrock Guardrails

Guardrails add configurable safety and compliance controls to all Bedrock invocations. Applied at the API layer, Guardrails intercept both the input sent to the model and the output returned to the application.

**Control types**:
- **Content filters**: block harmful content (hate speech, violence, sexual content, insults) by category and severity level
- **Topic denial**: prevent the model from discussing specified topics (e.g., competitor products, legal advice, medical diagnoses)
- **Word filters**: custom blocked terms list
- **PII redaction**: detect and mask or block personally identifiable information (names, SSNs, credit card numbers, email addresses) in both inputs and outputs
- **Grounding checks**: verify that the model's response is factually grounded in retrieved context (for RAG architectures) — surfaces hallucinations that claim to cite sources but don't

Guardrails apply to any model in Bedrock with the same configuration — you don't reconfigure per model change.

---

## Configuration Reference

### Example: Bedrock Converse API — Multi-Turn Chat with System Prompt

```python
import boto3

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')

# Maintain conversation history in your application (Bedrock is stateless)
conversation_history = []

def chat(user_message: str) -> str:
    conversation_history.append({
        "role": "user",
        "content": [{"type": "text", "text": user_message}]
    })
    
    response = bedrock.converse(
        modelId='anthropic.claude-3-5-sonnet-20241022-v2:0',
        system=[{
            "text": """You are a customer support assistant for AcmeCorp.
            - Only answer questions about our products (see knowledge base)
            - Be concise and professional
            - If you don't know the answer, say so — do not guess"""
        }],
        messages=conversation_history,    # pass full conversation history for context
        inferenceConfig={
            "maxTokens": 1024,            # max output tokens per response
            "temperature": 0.7,           # 0 = deterministic, 1 = creative
            "topP": 0.9
        }
    )
    
    # Append assistant reply to history so the next turn has full context
    assistant_message = response['output']['message']
    conversation_history.append(assistant_message)
    
    # Extract the text from the response
    return response['output']['message']['content'][0]['text']

# Multi-turn usage — history is maintained across calls
print(chat("What is Amazon S3?"))
print(chat("How does its pricing work?"))   # model has context from previous turn
```