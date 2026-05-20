---
title: "Canvas Lab: Bedrock RAG Architecture"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "MLS-C01"]
canvas_type: open
---

# Canvas Lab: Bedrock RAG Architecture

## Challenge

Design a retrieval-augmented generation (RAG) architecture that allows internal employees to ask natural language questions about the company's policy documents and technical runbooks stored in S3. The system must provide accurate answers grounded in the actual documents, cite the source document, and prevent the LLM from answering outside the scope of the provided documentation.

## Learning Objectives

- Implement a RAG pipeline using Bedrock Knowledge Bases
- Use Bedrock Guardrails to prevent out-of-scope answers
- Design an API interface for the internal Q&A tool
- Secure the system so only authenticated employees can use it

## Steps

1. Create an S3 bucket: company-docs/ with policy PDFs and runbooks uploaded
2. Create a Bedrock Knowledge Base: source=S3 (company-docs/), chunking strategy=Fixed (512 tokens, 20% overlap), vector store=OpenSearch Serverless
3. Configure the Knowledge Base sync schedule to re-embed and index new documents nightly
4. Create a Bedrock Guardrail: Topic Denial = 'Do not answer questions outside the company documentation', Grounding Filter = enabled (prevent hallucinated answers not in retrieved context)
5. Create a Lambda function: receives user question → calls Bedrock RetrieveAndGenerate API with Knowledge Base ID and Guardrail ID → returns answer + source citations
6. Create an API Gateway HTTP API: POST /ask endpoint → Lambda function
7. Add Cognito User Pool authorizer to API Gateway (only employees with valid Cognito JWT can call /ask)
8. Annotate: the RetrieveAndGenerate API retrieves top-K document chunks, injects them into the Claude prompt, and Claude answers using only the retrieved context
9. Add a CloudWatch dashboard showing: Knowledge Base sync status, Bedrock token usage, API invocation count, and Guardrail violation count

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.