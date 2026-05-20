---
title: "Amazon Bedrock: Foundation Models and Generative AI"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "MLS-C01"]
---

# Amazon Bedrock: Foundation Models and Generative AI

## Overview

Amazon Bedrock is the managed foundation model API layer on AWS. It provides access to powerful pre-trained models for text generation, summarization, Q&A, code generation, image generation, and more — without managing any model infrastructure. This lesson covers the Bedrock API, Knowledge Bases for RAG, and Bedrock Agents.

## Bedrock Model API

Invoke foundation models via the InvokeModel or InvokeModelWithResponseStream API. Each model has its own request/response format (Anthropic Claude, Llama, Cohere, Mistral, Titan, Stability AI Diffusion). The Converse API provides a unified conversation interface across text models — simpler for multi-turn conversations. Requests are signed with IAM Sigv4. Responses are billed per input and output token. Model inference is stateless — maintain conversation history in your application.

## Knowledge Bases (RAG)

Retrieval-Augmented Generation (RAG) augments LLM responses with relevant data from your own documents. Bedrock Knowledge Bases: (1) ingest documents (PDFs, Word docs, web pages, S3 files) into a vector database (OpenSearch Serverless, Pinecone, Aurora PostgreSQL with pgvector), (2) at query time, embed the user query and retrieve semantically similar document chunks, (3) pass retrieved context plus the user question to the foundation model. RAG dramatically reduces hallucinations and lets you use the LLM on private internal data without fine-tuning.

## Bedrock Agents

Agents enable LLMs to take actions — not just generate text. You define: a foundation model, instructions (system prompt), action groups (Lambda functions the agent can call to perform real-world actions), and optionally a Knowledge Base. The agent reasons in a ReAct (Reason + Act) loop: analyze the user request → decide which action to take → call the Lambda → observe the result → repeat until it can answer. Example: a customer service agent that can look up order status, process refunds, and update shipping addresses via Lambda action groups backed by your APIs.

## Bedrock Guardrails

Guardrails add safety and compliance controls to Bedrock API calls. Configure: content filters (block harmful content by category and severity), topic denial (prevent the model from discussing specific topics), word filters (custom blocked terms), PII redaction (detect and mask or block PII in inputs and outputs), grounding checks (verify responses are grounded in the retrieved context, not hallucinated). Guardrails apply to all models and are configured separately from the model selection.

## Summary

Bedrock provides managed access to foundation models from multiple providers. Use the Converse API for multi-turn chat. Knowledge Bases implement RAG for private data Q&A with minimal hallucination. Agents enable LLM-driven automation with Lambda action groups. Guardrails add safety and compliance. Bedrock is the fastest path to production generative AI features on AWS.

## What's Next

Next up: Amazon SageMaker — building and training custom ML models.