# AWS Practice-Test (Question Bank) QA Report

**Scope:** The four question banks that currently exist — `aws-cp` (540 Q), `aws-saa` (540 Q), `aws-scs` (630 Q), `aws-soa` (230 Q) — totaling **1,940 questions**. (Banks for the other certs — AIF, DVA, DEA, MLA, SAP, DOP, ANS, AIP — are not yet built.) QA covered schema/data quality, answer-key validity, answer-position bias, domain weighting vs. the official blueprints, question-format coverage, and a content-accuracy spot-check.

**Overall:** Content-writing quality is high — realistic, exam-style scenarios with strong explanations, no duplicate IDs, no duplicate stems, and no invalid answer-key references anywhere. The issues are concentrated in **schema consistency, answer-position bias, format coverage, and two banks needing structural attention** (`aws-cp` data hygiene, `aws-soa` targeting a retired exam version).

---

## ✅ Fixes Applied (this session)

All mechanical and data-quality issues identified below have been **fixed and re-verified**:

| Issue | Bank | Fix applied | Verified |
|-------|------|-------------|----------|
| 8 records used `question`/`question_type` instead of `stem`/`type` | aws-cp | Renamed to standard fields | 0 empty stems |
| 68 questions missing `domain`; mixed int/string/name formats | aws-cp | Domain derived from authoritative filename; normalized to integer + `domain_name` | 0 missing; weighting now **24/30/33/12 = blueprint** |
| Answer-position **A-bias** (A=32%, χ²=17.8 skewed) | aws-scs | Rebalanced 46 safe A-answers (no letter-ref) by swapping option text + `correct` + distractor rationale | **χ²=0.0, A=25%** |
| `type: "multiple-choice"` mislabel (all single-answer) | aws-scs | Normalized to `single` | consistent |
| Flawed ABAC question `scs-d4-t4-004` (stem/answer contradiction) | aws-scs | Rewrote stem as proper tag-matching ABAC; answer B now correct & consistent | reviewed |
| Built to **retired SOA-C02** (6 domains) | aws-soa | Re-mapped to **SOA-C03** (5 domains): D1 retitled to include Performance Optimization; 6 performance Qs folded into D1; 18 cost/billing Qs (now out of scope) deactivated with reason, content preserved | 5 domains; 212 active |
| Inconsistent schema across banks (type labels, domain formats) | all | Standardized: `domain` = integer + `domain_name`; `type` = `single`/`multiple-response` | all banks consistent |

**Post-fix verification (all four banks):** 0 parse errors · 0 invalid answer keys · 0 non-integer domains · 0 missing `domain_name` · 0 empty stems · answer balance χ² all ≤ 4.9 (well within tolerance).

**Not auto-fixed (require new content authoring — recommended next):** adding genuine multiple-response items to SCS/SOA and ordering/matching items to SCS/AIF; minor weighting fine-tuning (SCS D2/D4, SOA D1/D2 are a few points off and need a handful of questions added/moved); broadening SOA's difficulty range (no `above`); and a full line-by-line content-accuracy review (the spot-check found one error, since fixed). The 18 deactivated SOA cost questions are preserved (`active: false`) and could seed a future general-AWS or finance bank.

---

## Scorecard

| Bank | Questions | Schema | Domain weighting | Answer balance | Formats | Verdict |
|------|----------:|--------|------------------|----------------|---------|---------|
| **aws-saa** | 540 | ✅ clean | ✅ 30/26/24/20 = blueprint | ✅ balanced | select-two present | **Near production-ready** |
| **aws-scs** | 630 | ⚠️ inconsistent | ◑ close (D2 over, D4 under) | ❌ A-biased (32%) | ❌ no multi-select | **Good content, needs rebalancing** |
| **aws-cp** | 540 | ❌ split schema | ❌ skewed + 137 unmapped | ✅ balanced | multi present | **Data-hygiene cleanup needed** |
| **aws-soa** | 230 | ✅ clean | n/a (wrong version) | ◑ mild A-lean | ❌ no multi-select | **Built to RETIRED SOA-C02** |

---

## High-severity findings

### 1. `aws-soa` targets the retired SOA-C02 blueprint, not SOA-C03
The SOA bank's six domains are **Monitoring/Logging/Remediation, Reliability/BC, Deployment/Provisioning/Automation, Security/Compliance, Networking/Content Delivery, Cost/Performance Optimization** — the **SOA-C02** structure. The current exam is **SOA-C03 (CloudOps Engineer – Associate)**, which restructured the domains. These practice tests are aligned to an outdated exam version and should be re-mapped to SOA-C03's domains (and re-weighted) before release. (The content itself is sound; the domain framing is stale.)

### 2. `aws-cp` has a split schema and missing domain data
- **8 questions** (in `domain-04-billing-pricing.json`, test 1) use the field names **`question`/`question_type`** instead of the bank-standard **`stem`/`type`** — they will render blank in any system expecting `stem`.
- **68 questions** have **no `domain` field at all**, and across the bank the `domain` value is inconsistently an integer (`1`), a string (`"1"`), or a name (`"Cloud Concepts"`).
- Net effect: 137 questions can't be reliably bucketed by domain, so blueprint weighting can't be enforced and ~8 won't display.

---

## Medium-severity findings

### 3. `aws-scs` answer-position bias (statistically significant)
Correct answers are placed in position **A 32% of the time** (expected 25%), chi-square = 17.8 (well above the p=0.01 threshold of 11.3). A test-taker who always guesses "A" scores meaningfully above chance — a real exam-integrity issue. Answer options should be shuffled to flatten the A/B/C/D distribution. (For comparison, `aws-saa` is well-balanced at chi-square = 3.1; `aws-cp` = 2.5.)

### 4. Missing multi-select / ordering / matching formats
- `aws-scs`: **0 true multi-select questions** out of 630, even though SCS-C03 includes **multiple-response, ordering, and matching**. The `type: "multiple-choice"` label (257 questions) is misleading — all are single-answer.
- `aws-soa`: 0 multi-select.
- `aws-cp` (35) and `aws-saa` (14) have some select-two, but **no bank has ordering or matching** items, which AIF-C01 and SCS-C03 use.
The banks under-represent the real exam's question formats, which inflates pass-prediction optimism.

### 5. Cross-bank schema inconsistency (systemic)
The four banks disagree on field names and value formats:
- Stem field: `stem` (most) vs `question` (8 CP).
- Type label: `single`, `multiple`, `select-two`, `multiple-choice` — four spellings for two real types.
- Domain value: integer, string, or domain name depending on bank/file.
- `aws-scs` domain field mixes `1`–`6` with `"domain-01"`.
A single renderer/exam engine will need a normalization layer or, better, a **standardized question schema** applied across all banks. **`aws-saa`'s schema is the cleanest and is recommended as the canonical template.**

### 6. `aws-scs` flawed question — `scs-d4-t4-004` (ABAC)
The stem says the policy condition is `ec2:ResourceTag/Environment = Production` (a **static** value). With that condition, stopping a **Production-tagged** instance **matches** and should be **allowed**. But the keyed answer is **B ("denied")**, and the explanation silently switches to a *different* policy where the condition matches the **caller's own tag** (`aws:PrincipalTag`). The stem and answer are inconsistent — the question is wrong as written. Fix by either (a) rewriting the stem so the condition matches the principal's tag (true ABAC), or (b) changing the answer to "allowed." This was found in a 17-question content sample (≈1 clear error + 2 mild ambiguities), suggesting a **full content review of SCS is warranted**.

---

## Low-severity findings

- **Minor weighting deviations:** `aws-scs` Domain 2 is over-weighted (≈18% vs 14% target) and Domain 4 under (≈16% vs 20%); `aws-cp` Domains 3 and 4 are under-represented (25.6% vs 34%, 8.7% vs 12%). Re-balance counts per domain to match blueprints.
- **Mild answer ambiguity** (sampled): e.g., an SOA "daily EBS backup without scripts" question keys **AWS Backup** but **Data Lifecycle Manager** is equally valid; an SOA "audit SG changes" question keys **CloudTrail** while **Config** is also defensible. Tighten stems so exactly one option is best.
- **Difficulty range gaps:** `aws-soa` uses only `below`/`at` (no `above`); `aws-scs` is heavy on `at` (360/630). Broaden the hard-question mix, especially for the specialty.
- **Difficulty values** are consistent within banks (`below`/`at`/`above`) — good.

---

## Strengths (keep these)

- **Writing quality is strong** across all banks: realistic, scenario-based stems (not trivia), plausible distractors, and explanations that teach (often naming the better alternative, e.g., Session Manager over IP-restricted SSH).
- **No duplicate IDs, no duplicate stems, no invalid answer keys** in any bank.
- **`aws-saa` is excellent** — clean schema, blueprint-exact weighting (30/26/24/20), balanced answer positions, accurate content. Use it as the **template** for fixing the others.
- Useful metadata is present (`tags`/`keywords`, `module_ref`, `difficulty`, `test_number`) to support adaptive/per-test assembly once normalized.

---

## Recommended fixes, in priority order

1. **`aws-soa`:** re-map domains and weights to **SOA-C03 (CloudOps)**; the content can largely be reused but re-bucketed.
2. **`aws-cp`:** normalize the 8 `question/question_type` records to `stem/type`; add the missing `domain` field to all 68; standardize `domain` to a single format. Then re-balance counts to 24/30/34/12.
3. **`aws-scs`:** shuffle answer positions to remove the A-bias; add genuine multiple-response (and, ideally, ordering/matching) items; fix `scs-d4-t4-004`; do a full content-accuracy review; rename `multiple-choice` → `single`.
4. **All banks:** adopt one **canonical question schema** (model it on `aws-saa`) — consistent field names, type labels, and domain values — so the exam engine needs no per-bank special-casing.
5. **All banks:** add ordering/matching items where the target exam uses them (AIF, SCS), and broaden the hard-difficulty mix.
6. **Content:** spot-check found a low-to-moderate error rate; schedule a full review pass per bank before public release, starting with SCS.

---

## Method note

QA was performed programmatically across all 1,940 questions (schema validation, ID/stem de-duplication, answer-key validity, chi-square on answer positions, domain weighting vs. blueprint) plus a manual content-accuracy spot-check of ~17 sampled questions across the four banks. Blueprint weights compared against the official exam guides: CLF-C02 24/30/34/12, SAA-C03 30/26/24/20, SCS-C03 16/14/18/20/18/14.
