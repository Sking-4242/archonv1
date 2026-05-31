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

## Examples

A software company adds a customer support chatbot to their SaaS product. They use the Bedrock Converse API with Anthropic Claude, passing the last five conversation turns to maintain context. The conversation history lives in their application's database — Bedrock is stateless, so the application owns continuity. This is the most common Bedrock integration pattern: stateless inference with client-managed conversation state.

A law firm builds an internal research assistant that answers questions grounded in their case archive. They configure a Bedrock Knowledge Base that ingests thousands of case documents from S3 into OpenSearch Serverless. At query time, the user's question is embedded, the most relevant case excerpts are retrieved, and Claude synthesizes an answer citing the specific documents. The RAG architecture means the model can answer questions about cases it was never trained on, with dramatically fewer hallucinations than prompting the model alone.

A fintech company deploys a Bedrock Agent that handles customer account inquiries end-to-end. The agent has three Lambda action groups — one to query account balances, one to initiate transfers, and one to retrieve transaction history. When a customer asks "Why did my balance drop last Tuesday?", the agent reasons through the request, calls the transaction Lambda to retrieve recent activity, interprets the results, and responds — all without a human in the loop. The ReAct reasoning loop is what makes this different from a simple chatbot: the agent decides which tools to call and in what order.

## Think About It

1. Why does Bedrock's stateless design shift the conversation history problem to the application layer — and what are the architectural implications of that choice for a high-traffic chatbot?
2. What would happen if you used a foundation model to answer questions about your company's internal HR policies without a Knowledge Base, and a user asked about a policy that was updated last month?
3. How would you decide when to use Bedrock Guardrails' grounding checks versus relying on prompt engineering alone to reduce hallucinations in a RAG system?
4. A Bedrock Agent's Lambda action groups give the LLM the ability to take real-world actions. What security controls and design patterns would you put in place to prevent the agent from performing unintended or destructive actions?
5. Bedrock bills per input and output token. How does this pricing model affect your architecture decisions differently than paying for a reserved GPU instance running a self-hosted model?

## Quick Check

**Q1.** What is the primary purpose of Bedrock Knowledge Bases?
- A) To fine-tune a foundation model on your own labeled data
- B) To implement retrieval-augmented generation using your private documents
- C) To store and version conversation history across sessions
- D) To enforce content moderation on all model outputs

**Answer: B** — Knowledge Bases implement RAG by ingesting your documents into a vector store and retrieving relevant context at query time, grounding model responses in your private data without fine-tuning.

**Q2.** In a Bedrock Agent, what is the role of an action group?
- A) A set of IAM permissions that control which foundation models the agent can invoke
- B) A Lambda function the agent can call to perform real-world actions during its reasoning loop
- C) A guardrail configuration that filters agent outputs before returning them to the user
- D) A system prompt template that defines the agent's persona and instructions

**Answer: B** — Action groups are Lambda functions that the agent can invoke when it decides an action is needed, enabling the agent to interact with external systems like databases or APIs.

**Q3.** Which Bedrock Guardrails feature would you use to prevent a model from returning a customer's credit card number in its response?
- A) Topic denial
- B) Content filters
- C) PII redaction
- D) Grounding checks

**Answer: C** — PII redaction detects and masks or blocks personally identifiable information — including financial data like credit card numbers — in both model inputs and outputs.

## What's Next

Next up: Amazon SageMaker — building and training custom ML models.