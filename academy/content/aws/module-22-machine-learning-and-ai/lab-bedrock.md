---
title: "Canvas Lab: RAG Chatbot with Amazon Bedrock Knowledge Bases"
type: canvas
estimated_minutes: 35
cert_tags: ["SAA-C03", "MLA-C01"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: RAG Chatbot with Amazon Bedrock Knowledge Bases

## Challenge

A company wants a chatbot that answers questions about their internal documentation using Retrieval Augmented Generation (RAG) rather than relying solely on an LLM's training data. Documents such as product FAQs and policy guides are stored in S3. Build a Bedrock Knowledge Base that ingests the documents, generates vector embeddings, stores them in an OpenSearch Serverless collection, and serves grounded answers via Claude through the RetrieveAndGenerate API. Sample PDF documents are pre-uploaded to an S3 bucket.

## Learning Objectives

- Create a Bedrock Knowledge Base with an S3 data source and trigger document ingestion
- Configure chunking strategy and verify embedding storage in the OpenSearch Serverless vector store
- Query the Knowledge Base using the RetrieveAndGenerate API and inspect retrieved source chunks
- Compare a direct Claude prompt with no context against a RAG-augmented response to see accuracy differences
- Understand how chunking size affects retrieval quality and relevance scoring

## Steps

1. Upload 3-5 sample PDF or plain text documents to S3 (for example, product FAQ pages or HR policy documents) if not already present
2. In the Bedrock console, navigate to Knowledge Bases and click Create Knowledge Base
3. Set the data source to the S3 bucket containing your documents and choose Titan Embeddings V2 as the embeddings model
4. Select OpenSearch Serverless as the vector store and allow Bedrock to auto-create the collection and index
5. Set the chunking strategy to Fixed Size with 300 tokens per chunk and 10% overlap (30-token overlap)
6. Click Create and Sync; wait for the Sync Status to show Ready before proceeding
7. In the Knowledge Base Test console, type a question that is directly answered in one of your uploaded documents and submit it
8. Expand the Sources section in the response to see which document chunks were retrieved and their relevance scores
9. Change the foundation model to Claude 3 Haiku in the test console settings
10. Ask the same question again and note any difference in the phrasing or depth of the answer
11. Open a separate Claude chat (direct inference without Knowledge Base) and ask the identical question; compare accuracy against the RAG response
12. In CloudShell, run `aws bedrock-agent-runtime retrieve-and-generate --knowledge-base-id <kb-id> --retrieve-and-generate-configuration '{"type":"KNOWLEDGE_BASE","knowledgeBaseConfiguration":{"knowledgeBaseId":"<kb-id>","modelArn":"anthropic.claude-3-haiku-20240307-v1:0"}}' --input '{"text":"<your question>"}'` and examine the `citations` array in the JSON response

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
