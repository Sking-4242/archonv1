---
title: "How Generative AI Works: Tokens, Embeddings, Vectors, and Transformers"
type: content
estimated_minutes: 15
cert_tags: ["AIF-C01"]
---

# How Generative AI Works: Tokens, Embeddings, Vectors, and Transformers

## Overview

Generative AI can feel like magic — you type a sentence and a machine writes an essay, answers a question, or paints a picture. The AI Practitioner exam expects you to replace that sense of magic with a working mental model of the machinery. Domain 2, Task 2.1 asks you to define the foundational building blocks of generative AI: tokens, chunking, embeddings, vectors, transformer-based large language models, foundation models, multi-modal models, and diffusion models. You are not asked to do the math, but you are asked to understand what each piece is and how the pieces fit together, because nearly every later topic — prompt engineering, RAG, fine-tuning, model selection, cost — rests on these concepts.

The core insight is that generative models do not "understand" language the way people do. They convert text into numbers, learn statistical relationships among those numbers from enormous amounts of data, and then generate new content by predicting what comes next, one piece at a time. Tokens are how text becomes numbers, embeddings are how meaning becomes geometry, the transformer is the architecture that learns relationships across a whole passage at once, and diffusion is the parallel idea for images. Once you see how these connect, the behavior of generative AI — its fluency, its creativity, and its failure modes like hallucination — becomes far less mysterious.

This lesson builds that model from the ground up. After it you will be able to explain, in plain language, how a prompt becomes a response, why embeddings power search and RAG, and why these systems are powerful yet inherently probabilistic.

---

## Core Concepts

### Tokens — How Text Becomes Numbers

A language model cannot process raw letters or words directly; it processes **tokens**. A token is a chunk of text — often a whole word, but frequently a piece of a word (a "subword"), a single character, or a punctuation mark. Tokenization is the step that splits input text into these units and maps each to a numeric ID the model can work with. As a rough rule of thumb, in English one token is about four characters, and 100 tokens is roughly 75 words — but the exact split depends on the model's tokenizer.

Tokens matter for two practical reasons the exam emphasizes. First, **cost and limits are measured in tokens, not words** — you pay per token for input and output, and every model has a maximum **context window** measured in tokens (how much text it can consider at once). Second, **generation happens one token at a time**: the model predicts the most likely next token, appends it, and repeats. That sequential, probabilistic process is why the same prompt can yield different outputs and why longer responses cost more and take longer.

### Chunking — Breaking Documents Into Manageable Pieces

**Chunking** is the practice of splitting a large document into smaller segments before processing — for example, breaking a 200-page manual into paragraph- or section-sized pieces. Chunking exists because of the context-window limit: you cannot feed an entire library into a single prompt, and even if you could, it would be expensive and dilute the model's focus. Chunking is essential to Retrieval Augmented Generation (covered later), where the system retrieves only the few most relevant chunks to answer a question. Good chunking — pieces that are neither too large nor too small, and that respect natural boundaries — directly affects the quality of retrieval-based applications.

### Embeddings and Vectors — Turning Meaning Into Geometry

An **embedding** is a list of numbers — a **vector** — that represents the meaning of a piece of text (or an image, or audio) in a high-dimensional space. The defining property is that **semantically similar things end up close together** in that space, and dissimilar things end up far apart. "Dog" and "puppy" land near each other; "dog" and "spreadsheet" land far apart. A model produces these vectors by learning, during training, to place related concepts near one another.

This geometric representation of meaning is what makes **semantic search** possible: instead of matching keywords, you convert a query into a vector and find the stored vectors closest to it, returning results that mean the same thing even if they share no words. Embeddings are the foundation of **vector databases** and of RAG, both central to Domain 3. For the exam, hold onto this chain: text → embedding (vector) → similarity by distance → semantic search and retrieval.

### The Transformer — The Architecture Behind Modern LLMs

The **transformer** is the neural-network architecture that made today's large language models possible. Its key innovation is the **attention mechanism**, which lets the model weigh the relationships between all tokens in a passage simultaneously, rather than reading strictly left to right and forgetting earlier context. Attention is how the model figures out that, in "the trophy didn't fit in the suitcase because it was too big," the word "it" refers to the trophy. By attending to the whole context at once, transformers capture long-range relationships and nuance, which is why they vastly outperformed earlier architectures and why "transformer-based" is part of the very definition of a modern LLM.

A **large language model (LLM)** is a transformer trained on a massive corpus of text to predict tokens, giving it a broad command of language, facts, and reasoning patterns. "Large" refers to both the training data and the number of **parameters** — the learned weights, often in the billions — that store what the model knows.

### Foundation Models and Multi-Modal Models

A **foundation model (FM)** is a large model pre-trained on broad, general data and designed to be adapted to many downstream tasks. LLMs are the text-centric kind of foundation model. **Multi-modal models** extend the idea across data types: they accept and/or produce more than one modality — for example, taking an image and a text question and returning a text answer, or generating an image from a text prompt. Multi-modal capability is increasingly standard and shows up in exam scenarios about analyzing images with language, captioning, or document understanding combined with reasoning.

### Diffusion Models — Generating Images

While transformers/LLMs dominate text, **diffusion models** are the architecture behind most high-quality image generation. A diffusion model learns to reverse a noising process: during training it watches images get progressively corrupted into random noise, and it learns to undo that corruption. To generate, it starts from random noise and iteratively "denoises" it, guided by a text prompt, until a coherent image emerges. The exam doesn't require the math — just the association: **diffusion = image (and other media) generation**, transformer/LLM = text. Many image services (including models available on Amazon Bedrock) are diffusion-based.

### Putting It Together: Prompt to Response

Here is the whole pipeline in one breath. Your prompt is **tokenized** into numeric units. The transformer processes those tokens using **attention** to understand context, drawing on **embeddings** that encode meaning. It then **predicts the next token**, appends it, and repeats — generating the response one token at a time until it's complete. For images, a **diffusion** model denoises random static into a picture guided by your prompt. Every concept in this lesson is a link in that chain.

---

## Configuration Reference

The building blocks and what each does:

```text
Concept        What it is                          Why it matters
-------------- ----------------------------------- --------------------------------
Token          chunk of text (subword) as a number unit of cost, context limits, generation
Chunking       splitting docs into segments        fits context window; enables RAG
Embedding      vector encoding meaning             semantic search, similarity, RAG
Vector         the list of numbers itself          distance = semantic similarity
Transformer    attention-based architecture        captures full-context relationships
Attention      weighs all tokens at once           resolves references, long-range context
LLM            transformer trained on huge text    language generation/understanding
Foundation model broad pre-trained, adaptable base building block for GenAI apps
Multi-modal    handles multiple data types         image+text in/out, captioning
Diffusion      denoise-from-noise architecture     image/media generation
```

Rules of thumb worth remembering:

```text
~1 token  ≈ 4 characters of English
~100 tokens ≈ 75 words
cost & context limits are counted in TOKENS, not words
generation is sequential: predict next token, repeat
similar meaning ⇒ vectors are CLOSE; different meaning ⇒ vectors are FAR
```

---

## How to Decide

Use the vocabulary to interpret scenarios:

- **A question about cost or input/output limits** → think in **tokens** and context window.
- **"Find documents that mean the same thing," semantic search, RAG** → **embeddings/vectors** and a vector store.
- **"Generate or edit an image"** → **diffusion** model; **"generate or analyze text"** → **transformer/LLM**.
- **"Analyze an image and answer in text," or mixed inputs** → **multi-modal** model.
- **"A general model we adapt to several tasks"** → **foundation model**.

---

## How This Connects

This lesson is the conceptual bedrock for the rest of the GenAI track. Tokens reappear in **token-based pricing** and inference-parameter lessons; chunking and embeddings are the heart of **RAG and vector databases** in Domain 3; the FM definition leads into the **FM lifecycle** lesson; and the probabilistic, next-token nature explained here is exactly why **hallucinations** and nondeterminism (Domain 2.2) and **responsible-AI** concerns (Domain 4) arise. It also builds directly on the Module 1 definition of deep learning and neural networks.

---

## Exam Traps

- **Counting in words instead of tokens.** Cost and context limits are token-based; a token is usually a subword, not a whole word.
- **Confusing embeddings with the generation step.** Embeddings encode meaning for search/retrieval; they are not the model "writing" — that's next-token prediction.
- **Assuming the model "looks things up."** An LLM generates the statistically likely next token from learned patterns; it does not query a database unless paired with retrieval (RAG).
- **Mixing up diffusion and transformers.** Diffusion → images/media; transformers/LLMs → text. Multi-modal models may combine modalities.
- **Thinking outputs are deterministic.** Generation is probabilistic and sequential, so the same prompt can produce different results.

---

## Summary

Generative AI works by turning text into **tokens** (the unit of cost, context, and generation), encoding meaning as **embeddings** (vectors whose closeness reflects similarity, enabling semantic search and RAG), and using the **transformer** architecture — with its **attention** mechanism — to model relationships across an entire passage. **LLMs** are transformers trained on massive text; **foundation models** are broad, adaptable bases; **multi-modal models** span data types; and **diffusion models** generate images by denoising. A response is produced by predicting one token at a time, which is why generative AI is fluent, flexible, and inherently probabilistic. These building blocks underpin every later GenAI topic.

---

## Examples

**Example 1 — Tokens and cost.** A summarization feature processes long documents; the team is surprised by the bill. Because charges are per **token**, long inputs and outputs drive cost — the fix may be chunking and shorter prompts.

**Example 2 — Embeddings for search.** A help center wants users to find answers by meaning, not exact keywords. Convert articles and queries to **embeddings** and match by vector distance — semantic search.

**Example 3 — Diffusion.** A marketing team wants to generate product imagery from text descriptions. That's a **diffusion**-based image model, not an LLM.

**Example 4 — Multi-modal.** An app accepts a photo of a receipt plus a question and returns a typed answer — a **multi-modal** model handling image input and text output.

---

## Think About It

Two paragraphs from different documents share almost no words but describe the same idea. Explain how an embedding-based system can recognize they mean the same thing when a keyword search would miss it entirely — and connect your answer to why generation can still "hallucinate" facts despite this powerful representation of meaning.

---

## Quick Check

1. What is a token, and why are cost and context limits measured in tokens rather than words?
2. What property of embeddings makes semantic search possible?
3. What does the attention mechanism in a transformer let the model do?
4. Which architecture generates images — transformers or diffusion models?

*Answers: (1) a token is a chunk of text (often a subword) mapped to a number; models bill per token and have token-based context windows, and generation happens one token at a time; (2) semantically similar items have vectors that are close together, so similarity can be found by measuring distance; (3) weigh the relationships among all tokens in the passage at once, capturing long-range context and references; (4) diffusion models.*

---

## What's Next

Next: **Foundation Models and the FM Lifecycle** — where foundation models come from, the stages from data selection through deployment and feedback, and how that lifecycle differs from traditional ML.
