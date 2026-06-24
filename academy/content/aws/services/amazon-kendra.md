---
title: "Amazon Kendra"
type: content
estimated_minutes: 12
cert_tags: ["AIF-C01"]
---

# Amazon Kendra

## Overview

Amazon Kendra is a managed **intelligent enterprise search** service that uses machine learning to let users find information across an organization's content using natural-language questions — returning precise answers, not just a list of links. It needs **no ML expertise**. This *service reference* lesson covers how Kendra indexes and searches content, its role in retrieval-augmented generation, and what each certification expects.

Kendra matters because enterprises scatter knowledge across wikis, file shares, S3, databases, ticketing systems, and SaaS apps, and traditional keyword search returns documents rather than answers. Kendra applies natural-language understanding so a user can ask "What is our parental-leave policy?" and get the specific answer extracted from the right document. The mental model is **semantic, ML-powered search over connected enterprise data sources**, with **connectors** ingesting content into an index and natural-language queries returning ranked, answer-focused results. Kendra is also a common **retrieval** layer for generative-AI (RAG) applications, supplying relevant context to a foundation model.

---

## How It Works

You create a Kendra **index** and add **data source connectors** that crawl and ingest content from sources like **S3, SharePoint, Salesforce, ServiceNow, databases, web pages, Confluence**, and many more, respecting source **access controls** so users only see what they're permitted to. Kendra applies NLU to understand queries and content, returning:

- **Answer types** — a direct **factoid answer**, a relevant **passage/excerpt**, and ranked **document** results.
- **Natural-language queries** — users ask questions in plain language rather than crafting keyword searches.
- **Relevance tuning, synonyms, and FAQs** — improve results with custom relevance, synonyms, and curated question/answer pairs.

For generative AI, Kendra serves as a **retriever**: it finds the most relevant passages from enterprise content, which are then passed to a foundation model (e.g., via **Bedrock**) to generate a grounded answer — a managed path to enterprise RAG.

---

## Key Features

- **ML-powered natural-language search** returning answers, passages, and documents.
- **Many connectors** to enterprise/SaaS data sources, honoring source permissions (access-controlled search).
- **Relevance tuning, synonyms, and curated FAQs.**
- **Incremental learning** from user interactions to improve ranking.
- **Retriever for RAG** in generative-AI applications.

---

## Configuration Reference

- **Create an index** and add **connectors** for your content sources; sync on a schedule.
- **Preserve access control** so search respects each source's permissions (users see only authorized content).
- **Tune relevance**, add **synonyms/FAQs**, and integrate with **Bedrock** for generative answers (RAG).
- **Secure** with IAM/KMS; keep data in your account/region.

---

## Operations and Troubleshooting

- **Kendra vs. OpenSearch.** **Kendra** is turnkey **natural-language enterprise search with connectors and answer extraction** (no ML/relevance engineering); **OpenSearch** is a flexible search/analytics engine you operate and tune. Choose Kendra for "ask questions over our documents," OpenSearch for custom search/log analytics.
- **Irrelevant results.** Tune relevance, add synonyms/FAQs, and ensure connectors sync the right content.
- **Permission leakage.** Confirm connectors ingest and enforce **source access controls** so users don't see unauthorized content.
- **Generative answers.** Use Kendra as the **retriever** feeding Bedrock for grounded RAG responses.

---

## Integrations

Kendra ingests from **S3** and many enterprise/SaaS sources via connectors, secures with **IAM/KMS**, integrates with **Amazon Bedrock** (as a RAG retriever) and **Lex** (knowledge-backed bots), and is monitored via CloudWatch. It is the enterprise-search member of the AI services and a managed retrieval layer for generative AI, complementing **OpenSearch** (operate-your-own search/vector store).

---

## Pricing and Cost Considerations

Kendra is priced primarily by **index edition and provisioned capacity** (e.g., Developer vs. Enterprise editions billed by index-hours and document/query capacity units), plus connector usage — so it carries a notable baseline cost compared with usage-only services. The levers are choosing the right edition for the workload, right-sizing capacity, and consolidating indexes. For small or bursty needs, the baseline cost is the main consideration. Exact prices vary by edition and Region.

---

## Exam Relevance

**AIF-C01:** Know Kendra as the managed **intelligent enterprise search** service (natural-language questions → answers, connectors honoring access controls, FAQs/relevance tuning), its use as a **RAG retriever** for generative AI with Bedrock, and **Kendra vs. OpenSearch** (turnkey NL search vs. operate-your-own engine) — no ML expertise. Conceptual content.

---

## Summary

Amazon Kendra is ML-powered intelligent enterprise search that answers natural-language questions over content ingested from many sources via connectors (honoring source access controls), returning factoid answers, passages, and ranked documents, with relevance tuning, synonyms, and FAQs. It serves as a managed **retriever for RAG**, supplying grounded context to foundation models via Bedrock. It's secured with IAM/KMS and priced largely by index edition/capacity. The defining exam points are Kendra as turnkey natural-language enterprise search (vs. OpenSearch's operate-your-own engine) and its role as a retrieval layer for generative AI.

---

## Quick Check

1. How does Kendra's search differ from traditional keyword search?
2. How does Kendra get content, and how does it prevent users from seeing unauthorized documents?
3. What is Kendra's role in a retrieval-augmented generation (RAG) application?
4. When would you choose Kendra versus OpenSearch?
5. How is Kendra's pricing model different from usage-only AI services?

---

## What's Next

Pair this with **Amazon Bedrock** (generative answers via RAG), **Amazon OpenSearch** (operate-your-own search comparison), **Amazon S3** (content source), and **Amazon Lex** (knowledge-backed bots).
