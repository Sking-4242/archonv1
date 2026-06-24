# AIF-C01 (AWS Certified AI Practitioner) — Build & QA Report

**Scope:** The complete AIF-C01 curriculum — 21 cert-specific lessons across all five exam domains, the full cert manifest, reuse of 10 shared lessons, and related cleanup. QA covered accuracy, readability, correctness, structure, and manifest resolution.

**Result:** PASS. Full blueprint coverage. No blocking issues. Follow-ups and one environment caveat noted at the end.

---

## 1. What was built

A five-module course mirroring the official exam domains, plus a capstone, authored in the house lesson format (Overview → Core Concepts → Configuration/Reference → How to Decide → How This Connects → Exam Traps → Summary → Examples → Think About It → Quick Check → What's Next).

| Module | Domain (weight) | Lessons |
|--------|-----------------|--------:|
| 1 | Fundamentals of AI and ML (20%) | 6 |
| 2 | Fundamentals of Generative AI (24%) | 5 |
| 3 | Applications of Foundation Models (28%) | 5 |
| 4 | Guidelines for Responsible AI (14%) | 2 |
| 5 | Security, Compliance & Governance (14%) | 2 |
| — | Capstone: Exam Strategy & Question Patterns | 1 |

**21 cert-specific lessons** total, plus reuse of **10 shared lessons** (the five module-22 ML/AI lessons; IAM, shared-responsibility, KMS, Macie, and VPC-endpoints for the security domain).

---

## 2. Structural QA — PASS

Automated checks across all 21 lessons:

- **Frontmatter** present and well-formed on every lesson (`title`, `type`, `estimated_minutes`, `cert_tags: ["AIF-C01"]`).
- **All 11 required sections** present in every lesson.
- **Exactly one H1** per lesson; no malformed headers; **all code fences balanced**.
- **Quick Check** with an answer key on every lesson.
- **Word count:** Modules 2–5 were authored at 1,548–2,078 words; the five Module 1 lessons were then expanded with additional exam-relevant subsections to meet the 1,500–2,500-word standard (see caveat in §6 regarding final automated confirmation).

---

## 3. Accuracy QA — PASS (with live verification of new services)

The fast-moving, post-cutoff services named in the current AIF-C01 guide were **web-verified before authoring**, so factual claims reflect their real, current state:

- **Amazon Bedrock AgentCore** — agentic platform (GA Oct 2025); Runtime, Identity, Memory, Gateway, Observability, Policy (Cedar-based). Described at the conceptual level the foundational exam requires.
- **Strands Agents** — open-source AWS agent SDK (model + system prompt + tools; MCP and multi-agent support).
- **Model Context Protocol (MCP)** — open standard connecting agents to external tools/data.
- **Kiro** — agentic, spec-driven IDE built on Bedrock.
- **Amazon Q / Amazon Quick Suite** — AI assistants for business and developer work.

Core technical content was checked against AWS behavior and the exam guide: the AI⊃ML⊃DL⊃GenAI nesting; learning paradigms and self/semi-supervised learning; tokens/embeddings/transformers/diffusion; the FM lifecycle; inference parameters (temperature, top-p, max length); RAG and the vector-store options (OpenSearch, Aurora/RDS PostgreSQL pgvector, Neptune) plus Bedrock Knowledge Bases; the customization cost order (prompt → RAG → fine-tune → continued pre-training/distillation); RLHF; evaluation metrics (ROUGE→summarization, BLEU→translation, BERTScore→semantic, LLM-as-a-judge); responsible-AI tools (Clarify, Model Monitor, A2I, Guardrails, Model Cards); security controls (IAM, KMS, Macie, PrivateLink, AgentCore Identity/Policy); governance services (Config, CloudTrail, Audit Manager, Artifact, Inspector, Trusted Advisor) and the Generative AI Security Scoping Matrix; and exam logistics (50 scored, pass 700, ordering/matching formats). No factual errors found.

---

## 4. Manifest & resolution — PASS

- `AIF-C01.json` replaces the placeholder with a full manifest: five domains weighted **20/24/28/14/14 (= 100)**, task-mapped lesson refs, exam metadata (50 scored questions, 700 pass, four question formats), and a coverage block.
- **All 31 references resolve:** 21 cert-specific lesson files exist on disk, and all 10 shared refs map to real curriculum slugs.
- The capstone exam-strategy lesson is published-but-unreferenced, so it renders in the cert view's "Capstone & Exam Prep" section.
- `coverage.cert_specific_needed` is **0** — every domain has published cert-specific content.

---

## 5. Related cleanup completed

- **Retired-tag removal:** the five module-22 lessons and two module-22 labs had their stale `MLS-C01` frontmatter tags replaced with `AIF-C01` (and `MLA-C01` where appropriate). `MLS-C01` no longer appears in any lesson.
- **Stale cert list fixed:** `module-25/05-exam-strategy.md` listed retired specialties (Database, Data Analytics, ML) and the old `SCS-C02` code; corrected to the current specialties (Security `SCS-C03`, Advanced Networking `ANS-C01`) with a note that ML now lives in `MLA-C01`.

---

## 6. Follow-ups and caveats

1. **Re-seed required:** run `python seed_library.py` to load the 21 AIF-C01 lessons and the updated tags into the DB; otherwise the cert track won't resolve at runtime.
2. **No AIF-C01 question bank yet:** `questions/aws-aif` does not exist — a follow-up is to author practice questions weighted to 20/24/28/14/14 (note this exam adds **ordering** and **matching** formats).
3. **Sandbox mount caveat:** the Linux sandbox served stale snapshots of the most recently edited files, so a final automated `json.load` of the manifest and a fresh word-count tally of the five expanded Module 1 lessons could not complete in-session. Each was verified through the authoritative editor (valid JSON, all sections present, expansion subsections confirmed in place). Recommend a quick local `python -c "import json; json.load(open('AIF-C01.json'))"` and opening the AIF-C01 track in the app to confirm.
