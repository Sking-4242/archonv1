# SAA-C03 Curriculum — QA Report

**Scope:** All SAA-C03 cert-specific lesson material (7 authored lessons), the SAA-C03 manifest, and the shared-lesson references that make up the four-domain course. QA covered accuracy, readability, and correctness.

**Result:** PASS. No blocking issues. Minor notes and follow-ups listed at the end.

---

## 1. What was reviewed

The SAA-C03 course is a composition: shared library lessons (referenced, not copied) grouped under the four official exam domains, plus seven cert-specific lessons that fill genuine gaps and add the design-decision layer the exam tests.

The seven cert-specific lessons authored and QA'd:

| # | Lesson | Domain | Words |
|---|--------|--------|------:|
| 1 | Cross-Account Access: STS, Role Switching, Resource Policies | D1 (1.1) | 1,955 |
| 2 | Amazon Cognito for Application User Authentication | D1 (1.2) | 1,674 |
| 3 | Choosing Decoupling Services: SQS/SNS/Kinesis/EventBridge | D2 (2.1) | 1,666 |
| 4 | Caching Strategies: Edge, In-Memory, Database | D3 (3.3, 3.4) | 1,557 |
| 5 | Cost-Optimized Networking: Data Transfer, NAT, Egress | D4 (4.4) | 1,604 |
| 6 | SAA Scenario Decision Drills | capstone | 1,511 |
| 7 | SAA-C03 Exam Strategy and Question Patterns | capstone | 1,465 |

---

## 2. Structural QA — PASS

Automated checks across all seven lessons:

- **Frontmatter:** all present and well-formed (`title`, `type`, `estimated_minutes`, `cert_tags: ["SAA-C03"]`).
- **Required sections:** all 11 house-style sections present in every lesson (Overview → Core Concepts → Configuration Reference → How to Decide → How This Connects → Exam Traps → Summary → Examples → Think About It → Quick Check → What's Next).
- **Headings:** exactly one H1 (the title) per lesson; no malformed heading levels (the Domain 4 lesson's initial single-`#` Overview was caught and corrected).
- **Code fences:** all balanced (even count) in every file.
- **Quick Check:** every lesson ends with a Quick Check that includes an answer key.
- **Length:** 1,465–1,955 words, consistent with the existing lesson corpus and the template's guidance.

---

## 3. Accuracy QA — PASS

Key technical claims fact-checked against AWS service behavior and the official SAA-C03 exam guide:

- **STS / cross-account:** temporary credentials 15 min–12 hr (default 1 hr); chained-role sessions capped at 1 hr; two-sided trust (target trust policy + caller `sts:AssumeRole`); resource-based policy option for S3/SQS/SNS/KMS/Lambda; `ExternalId` for the confused-deputy defense. ✔ Correct.
- **Cognito:** user pool = authentication + JWTs; identity pool = temporary AWS credentials via STS/IAM role, incl. guest role; API Gateway Cognito authorizer; per-user S3 scoping via `cognito-identity.amazonaws.com:sub`. ✔ Correct.
- **Messaging:** SQS standard (at-least-once, best-effort order) vs. FIFO (exactly-once, strict order, bounded throughput); SNS no retention/fan-out; Kinesis retention 24 h default up to 365 days, per-shard ordering, multi-consumer replay; EventBridge content routing + SaaS sources. ✔ Correct.
- **Caching:** CloudFront edge; ElastiCache cache-aside/write-through/TTL; DAX is DynamoDB-only and does not accelerate strongly consistent reads; read replicas scale diverse relational reads. ✔ Correct.
- **Network cost:** inbound free; egress is the dominant cost; cross-AZ charged both directions; same-AZ private near-free; S3/DynamoDB **Gateway endpoints are free**; Interface (PrivateLink) endpoints hourly + per-GB; NAT gateway hourly + per-GB processing; CloudFront origin→edge transfer free. ✔ Correct.
- **Exam facts:** 130 min, 65 questions (50 scored, 15 unscored), pass 720 on 100–1,000 scale, no guessing penalty, MC/MR formats. ✔ Matches the official exam guide.
- **Decision drills:** Lambda 15-min ceiling; EFS (shared Linux) vs. EBS (single instance) vs. FSx (Windows/Lustre); four DR tiers ordered by cost/RTO; S3 11-nines durability. ✔ Correct.

No factual errors found.

---

## 4. Readability — PASS

- Consistent voice and structure with the existing library (e.g., the IAM Advanced and EC2 lessons used as style references).
- Each lesson opens with motivation (the "why"), not just definitions, per the template.
- Configuration Reference sections use real, annotated JSON/CLI/decision tables rather than pseudocode.
- Exam Traps and Quick Checks reinforce the testable distinctions.

---

## 5. Manifest & resolution — PASS (with sandbox caveat)

- The manifest groups all four domains with weights summing to 100 (30/26/24/20).
- All shared-lesson references (86) were verified to resolve to seeded library slugs in an earlier automated pass.
- The five new cert-specific domain/capstone references map to the seven published cert lessons; every referenced `.md` file exists on disk. Resolution is therefore complete; the three domain-decision lessons appear inline under their domains, and the two cross-domain lessons appear in the new "Capstone & Exam Prep" section.
- `coverage.cert_specific_needed` is now 0 — all four domains have published cert-specific content.

*Caveat:* the sandbox's Linux mount served stale snapshots of the most-edited files (`SAA-C03.json`), so a final automated `json.load` could not complete in-session. The file was validated via authoritative editor reads and clean, balanced edits. Recommend a quick local `python -c "import json; json.load(open('SAA-C03.json'))"` (or simply loading the cert track in the app) to confirm.

---

## 6. Follow-ups (non-blocking)

1. **Re-seed required:** run `python seed_library.py` so the seven cert lessons (and the updated official-code tags) load into the DB; otherwise the new references won't resolve at runtime.
2. **Question bank not yet blueprint-weighted:** `questions/aws-saa` should be tagged by domain/task and balanced to 30/26/24/20.
3. **Shared-lesson deep QA:** this report fact-checked the new cert-specific material in depth and structurally validated that all referenced shared lessons resolve. A line-by-line content audit of the 58 shared lessons was not part of this pass and can be scheduled separately if desired.
