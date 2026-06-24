# AIF-C01 (AWS Certified AI Practitioner) — Lesson Plan

A detailed plan for the AI Practitioner curriculum, following the same model as SAA-C03: the cert is organized by the official exam domains, composed of shared library lessons where they fit plus cert-specific lessons authored to the house format. This document is the build spec — review before authoring begins.

---

## Exam at a glance (from the official AIF-C01 guide)

- **Level:** Foundational. Target candidate has up to 6 months of exposure and *uses* — does not build — AI/ML on AWS.
- **Format:** 65 questions (50 scored, 15 unscored). Question types include multiple choice, multiple response, **ordering**, and **matching** (the last two are new vs. SAA and worth calling out in the exam-strategy material).
- **Scoring:** Pass at **700** on a 100–1,000 scale, compensatory model. No penalty for guessing.
- **Five domains and weights:**

| Domain | Weight | Becomes Module |
|--------|-------:|----------------|
| D1 — Fundamentals of AI and ML | 20% | Module 1 |
| D2 — Fundamentals of Generative AI | 24% | Module 2 |
| D3 — Applications of Foundation Models | 28% | Module 3 |
| D4 — Guidelines for Responsible AI | 14% | Module 4 |
| D5 — Security, Compliance & Governance for AI | 14% | Module 5 |

Because Domains 2–5 (80% of the exam) are GenAI-, responsibility-, and governance-specific, and the general curriculum's AI coverage lives in just five infrastructure-oriented lessons (module-22), **most AIF-C01 content is newly authored**, with targeted reuse of the Bedrock, SageMaker, AI-services, MLOps, and core security lessons.

---

## Reuse inventory (existing shared lessons that map in)

| Shared lesson | Reused for |
|---------------|-----------|
| `module-22/01-ml-services-overview.md` | D1.2, D2.3 (the 3-tier AI/ML service model) |
| `module-22/02-bedrock.md` | D2.3, D3.1/3.2 (Bedrock, Knowledge Bases/RAG, Agents, Guardrails) |
| `module-22/03-sagemaker.md` | D1.3, D3.3 (lifecycle, training/fine-tuning awareness) |
| `module-22/04-ai-services.md` | D1.2 (Rekognition/Comprehend/Textract real-world apps) |
| `module-22/05-ml-operations.md` | D1.3 (MLOps concepts) |
| `module-04/01-iam-overview.md` | D5.1 (IAM for AI access) |
| `module-05/01-shared-responsibility.md` | D5.1 (shared responsibility) |
| `module-15/02-kms.md`, `module-15/04-acm-cloudhsm-macie.md` | D5.1 (encryption, Macie) |
| `module-13/05-vpc-endpoints.md` | D5.1 (PrivateLink for private model access) |
| Labs: `module-22/lab-bedrock.md`, `lab-bedrock-rag.md`, `lab-ai-integration.md`, `lab-rekognition.md` | Optional hands-on across D2/D3 |

> **Cleanup note:** the module-22 lesson **frontmatter still lists the retired `MLS-C01` tag**. Curriculum.json was already corrected, but these five `.md` files should have `MLS-C01` removed (and `AIF-C01` optionally added) during this build.

---

## Module 1 — Fundamentals of AI and ML (20%)

Maps to Domain 1 (Tasks 1.1–1.3).

| # | Lesson | Status | Min | Covers |
|---|--------|--------|----:|--------|
| 1.1 | AI, ML, Deep Learning & GenAI: Concepts and Terminology | **New** | 12 | 1.1 — define AI/ML/DL/neural nets, CV, NLP, LLM, GenAI, agentic AI; similarities & differences |
| 1.2 | Types of Machine Learning: Supervised, Unsupervised, Reinforcement | **New** | 11 | 1.1 — learning types; regression/classification/clustering intro |
| 1.3 | Data and Inference in AI Systems | **New** | 11 | 1.1 — labeled/unlabeled, structured/unstructured, tabular/time-series/image/text; batch vs. real-time vs. async vs. serverless inference |
| 1.4 | Practical AI Use Cases — and When *Not* to Use AI | **New** | 12 | 1.2 — value patterns, cost-benefit, deterministic-vs-prediction, technique selection, real-world apps |
| 1.5 | AWS Managed AI/ML Services Overview | **Reuse** `module-22/01` + extend | 11 | 1.2 — 3-tier model; *extend/new sub-lesson* to add Transcribe, Translate, Comprehend, Lex, Polly (not in the current lesson) |
| 1.6 | The AI/ML Lifecycle, MLOps & Evaluation Metrics | **New** (draws on `module-22/03`, `/05`) | 13 | 1.3 — pipeline stages, FM sources, deployment methods, MLOps basics, accuracy/precision/recall/F1, business metrics/ROI |

*Gap flagged:* AIF names Transcribe, Translate, Lex, and Polly, which the current `04-ai-services` lesson omits (it covers Rekognition/Comprehend/Textract/Forecast/Personalize). Plan: a short **new** "Language & Speech AI Services" lesson or an extension of 1.5.

---

## Module 2 — Fundamentals of Generative AI (24%)

Maps to Domain 2 (Tasks 2.1–2.3).

| # | Lesson | Status | Min | Covers |
|---|--------|--------|----:|--------|
| 2.1 | How Generative AI Works: Tokens, Embeddings, Vectors & Transformers | **New** | 13 | 2.1 — tokens, chunking, embeddings, vectors, transformer LLMs, multimodal & diffusion models |
| 2.2 | Foundation Models and the FM Lifecycle | **New** | 11 | 2.1 — FM lifecycle (data/model selection → pre-train → fine-tune → eval → deploy → feedback) |
| 2.3 | Agentic AI Foundations: Agents, MCP & Multi-Agent Patterns | **New** | 12 | 2.1 — agentic concepts, Model Context Protocol, memory, tool use, orchestration, multi-agent patterns |
| 2.4 | GenAI Capabilities, Limitations & Model Selection | **New** | 12 | 2.2 — advantages; hallucinations, nondeterminism, interpretability; selection factors; business value/metrics |
| 2.5 | Building GenAI on AWS: Bedrock, SageMaker & Token Pricing | **New** (reuse `module-22/02`) | 13 | 2.3 — Bedrock/SageMaker/JumpStart/AgentCore; token-based pricing; cost tradeoffs (provisioned throughput, custom models, regional coverage) |

---

## Module 3 — Applications of Foundation Models (28% — largest domain)

Maps to Domain 3 (Tasks 3.1–3.4).

| # | Lesson | Status | Min | Covers |
|---|--------|--------|----:|--------|
| 3.1 | Designing FM Applications: Selection Criteria & Inference Parameters | **New** | 13 | 3.1 — selection (cost/modality/latency/size/context length/prompt caching); temperature, top-p, max length effects |
| 3.2 | Retrieval Augmented Generation (RAG) & Vector Databases | **New** (reuse `module-22/02` KB section) | 13 | 3.1 — RAG, Bedrock Knowledge Bases; vector stores (OpenSearch, Aurora, Neptune, RDS PostgreSQL); customization cost tradeoffs (pre-train / fine-tune / in-context / RAG / distillation) |
| 3.3 | Prompt Engineering Techniques | **New** | 13 | 3.2 — context/instruction/negative prompts; zero/single/few-shot, chain-of-thought, templates; risks (injection, poisoning, hijacking, jailbreaking); Bedrock Prompt Management |
| 3.4 | Training and Fine-Tuning Foundation Models | **New** (reuse `module-22/03`) | 13 | 3.3 — pre-training, fine-tuning, instruction tuning, continuous pre-training, distillation, RLHF, data preparation |
| 3.5 | Evaluating Foundation Model Performance | **New** | 13 | 3.4 — human-in-the-loop, benchmark datasets, Bedrock Model Evaluation; ROUGE, BLEU, BERTScore, LLM-as-a-judge; evaluating RAG/agents/workflows |

---

## Module 4 — Guidelines for Responsible AI (14%)

Maps to Domain 4 (Tasks 4.1–4.2).

| # | Lesson | Status | Min | Covers |
|---|--------|--------|----:|--------|
| 4.1 | Responsible AI: Bias, Fairness, Safety & Veracity | **New** | 13 | 4.1 — responsible-AI features; dataset characteristics; bias/variance effects (over/underfitting); legal risks (IP, biased outputs); Bedrock Guardrails, SageMaker Clarify, Model Monitor, Amazon A2I |
| 4.2 | Transparency and Explainability in AI Models | **New** | 11 | 4.2 — transparent/explainable vs. opaque; SageMaker Model Cards, Clarify, Bedrock Model Evaluations; safety-vs-transparency tradeoffs; human-centered design |

---

## Module 5 — Security, Compliance & Governance for AI (14%)

Maps to Domain 5 (Tasks 5.1–5.2).

| # | Lesson | Status | Min | Covers |
|---|--------|--------|----:|--------|
| 5.1 | Securing AI Systems on AWS | **New** (reuse `module-04/01`, `module-05/01`, `module-15` KMS/Macie, `module-13/05`) | 13 | 5.1 — IAM, encryption, Macie, PrivateLink, shared responsibility, AgentCore Identity, Guardrails; prompt injection, data leakage, output filtering, toxicity; hallucination detection & grounding (RAG, output validation, confidence scoring); data lineage/Model Cards |
| 5.2 | AI Governance and Compliance | **New** | 12 | 5.2 — AWS Config, Inspector, Audit Manager, Artifact, CloudTrail, Trusted Advisor; data governance (lifecycle, residency, retention, logging); GenAI Security Scoping Matrix, governance frameworks, transparency standards |

---

## Capstone (cross-domain)

| Lesson | Status | Min | Covers |
|--------|--------|----:|--------|
| AIF-C01 Exam Strategy & Question Patterns | **New** | 12 | All — qualifier reading, ordering/matching question tactics (new formats), distractor patterns, time management; "use-not-build" framing |

---

## Totals & build approach

- **~21 lessons:** ~18 newly authored + targeted reuse of ~9 shared lessons and 4 optional labs.
- **Estimated new content:** ~230–250 minutes of reading across the five modules plus capstone.
- **Format:** every new lesson follows the house template (Overview → Core Concepts → Configuration/Reference → How to Decide → How This Connects → Exam Traps → Summary → Examples → Think About It → Quick Check → What's Next), 1,400–2,000 words, matching the SAA cert-specific lessons.
- **Manifest:** replace the current `AIF-C01.json` placeholder with a full manifest — 5 weighted domains, task-mapped lesson refs (shared + cert-specific), question-bank pointer (no AIF bank exists yet → flag as a follow-up), and exam metadata (700 pass, 50 scored).
- **Seeding:** cert-specific lessons live under `certs/AIF-C01/lessons/` and are picked up by the existing `seed_library.py` cert-lesson seeding.

### Accuracy flag for authoring

Several services named in the current AIF-C01 guide are very recent (2025) and at or beyond the May 2025 knowledge cutoff: **Amazon Bedrock AgentCore, Strands Agents, Amazon Q / "Amazon Quick," Kiro, and Model Context Protocol (MCP)**. These will be **web-verified at authoring time** before any factual claims are written, to keep the responsible-AI and agentic lessons accurate.

### Suggested build order

1. Module 1 (foundations) → 2. Module 2 (GenAI core) → 3. Module 3 (FM applications, largest) → 4. Modules 4 & 5 (responsible AI, security/governance) → 5. Capstone → 6. Full manifest + re-seed + QA pass (same QA protocol as SAA-C03).
