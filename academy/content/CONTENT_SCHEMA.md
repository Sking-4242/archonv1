# Archon Academy — Content Schema Reference

> This document defines the canonical format for all practice test questions
> across all certification tracks. Every question must conform to this schema.
> The practice test engine is built against this format — do not deviate.
>
> Last updated: May 2026

---

## Question Types

| Type | Description | Options | Correct field |
|---|---|---|---|
| `single` | Pick one correct answer | A, B, C, D | `"A"` (string) |
| `multiple` | Select TWO correct answers | A, B, C, D, E | `["A", "C"]` (array) |

**Scoring:** All-or-nothing. For `multiple` questions, both answers must be
correct to receive credit. Partial credit is not awarded.

**Convention:** `multiple` questions always include `"(Select TWO.)"` at the
end of the question text, matching AWS exam formatting exactly.

---

## Question Object

```json
{
  "id": "aws-cp-01-001",
  "cert": "aws-cp",
  "domain": "Cloud Concepts",
  "domain_index": 1,
  "difficulty": "below",
  "test_number": 1,
  "question_type": "single",
  "question": "What is the primary benefit of using AWS cloud services instead of on-premises infrastructure?",
  "options": {
    "A": "Guaranteed 100% uptime for all services",
    "B": "The ability to trade fixed capital expense for variable operational expense",
    "C": "Unlimited free storage for all data",
    "D": "Automatic compliance with all regulatory requirements"
  },
  "correct": "B",
  "explanation": "AWS allows organizations to replace large upfront capital expenditures (servers, data centers) with variable operational costs that scale with usage. You only pay for what you consume.",
  "distractors": {
    "A": "AWS offers high availability SLAs (e.g. 99.99%) but not 100% uptime guarantees. No provider can guarantee this.",
    "B": null,
    "C": "AWS storage services are not free. S3, EBS, and other storage services are billed based on usage.",
    "D": "AWS provides compliance certifications and tools (Artifact, Config) but customers are responsible for their own compliance posture under the shared responsibility model."
  },
  "module_ref": "aws-cp-cloud-concepts-01",
  "keywords": ["cloud economics", "capex", "opex", "cloud benefits"],
  "active": true
}
```

---

## Field Definitions

### id
Format: `{cert}-{domain_index_padded}-{question_index_padded}`
Example: `aws-cp-01-042` = AWS Cloud Practitioner, domain 1, question 42

- `cert` — see cert values below
- `domain_index` — integer 1–N matching the domain's position in the official exam guide
- `question_index` — sequential within the domain across all tests and difficulties

IDs are permanent. Once assigned, never reassign an ID to a different question.
If a question is retired, set `active: false` — do not reuse the ID.

### cert
| Value | Certification |
|---|---|
| `aws-cp` | AWS Certified Cloud Practitioner |
| `aws-saa` | AWS Certified Solutions Architect – Associate |
| `aws-dva` | AWS Certified Developer – Associate |
| `aws-sysops` | AWS Certified SysOps Administrator – Associate |
| `aws-soa` | AWS Certified Solutions Architect – Professional |
| `aws-sap` | AWS Certified Solutions Architect – Professional |
| `aws-sec` | AWS Certified Security – Specialty |

### domain
Must match the official AWS exam domain name exactly as published in the
current exam guide for that certification. See domain tables below.

### domain_index
Integer. The domain's position in the official exam guide (1-based).
Used in the question ID and for domain-level reporting.

### difficulty
| Value | Meaning |
|---|---|
| `below` | Easier than the real exam. Builds confidence and tests foundational knowledge. Test 1 only. |
| `at` | Matches real exam difficulty and style. Tests 2 and 3. |
| `above` | Harder than the real exam. Tests 4, 5, and 6. |

### test_number
Integer 1–6. Which practice test this question belongs to.

| Test | Difficulty | Time (CP scaled to 90q) |
|---|---|---|
| 1 | `below` | 132 min |
| 2 | `at` | 124 min |
| 3 | `at` | 124 min |
| 4 | `above` | 115 min |
| 5 | `above` | 115 min |
| 6 | `above` | 115 min |

Time calculation: CP official = 90 min / 65 questions = 1.385 min/question.
- Below: 1.47 min/question × 90 = 132 min (6% more time)
- At: 1.385 min/question × 90 = 124 min (matches real exam ratio)
- Above: 1.28 min/question × 90 = 115 min (8% less time)

### question_type
`"single"` or `"multiple"`. See question types table above.

### question
The full question text. For `multiple` questions, must end with `"(Select TWO.)"`

### options
Object. Keys are `A`, `B`, `C`, `D` for `single` questions.
Keys are `A`, `B`, `C`, `D`, `E` for `multiple` questions.
All option keys must be present. No null values in options.

### correct
- `single`: string — `"A"` | `"B"` | `"C"` | `"D"`
- `multiple`: array of exactly two strings — e.g. `["B", "D"]`

### explanation
String. Explains why the correct answer(s) are right. Shown in study mode
after the student answers. Should reference the specific AWS service behavior,
documentation principle, or architectural concept that makes this correct.
Aim for 2–4 sentences. Not shown in live mode until test completion.

### distractors
Object with same keys as `options`. For each key:
- If the key is a correct answer: `null`
- If the key is a wrong answer: explanation string of why this option is wrong

Distractor explanations should be specific — not just "this is wrong" but why
a student might have chosen it and what the correct understanding is.
Aim for 1–3 sentences per distractor.

### module_ref
String. The slug of the Academy module a student should study if they miss
this question. Used to generate the post-test weakness chart recommendations.
Must match a valid module slug in the curriculum manifest.

### keywords
Array of 2–4 strings. Used for weakness chart grouping and filtering.
Keep keywords consistent across questions covering the same topic.
Use service names (e.g. `"S3"`, `"IAM"`, `"Lambda"`), concepts
(e.g. `"high availability"`, `"encryption at rest"`), and domain themes.

### active
Boolean. `true` for live questions. `false` for retired or flagged questions.
Inactive questions are never served to students. Use this instead of deletion.

---

## AWS Cloud Practitioner Domains

| # | Domain | Exam Weight | question_type ratio |
|---|---|---|---|
| 1 | Cloud Concepts | 24% | ~90% single, ~10% multiple |
| 2 | Security and Compliance | 30% | ~90% single, ~10% multiple |
| 3 | Cloud Technology and Services | 34% | ~90% single, ~10% multiple |
| 4 | Billing, Pricing and Support | 12% | ~90% single, ~10% multiple |

Question distribution across 90 questions per test (approximate):
- Domain 1: ~22 questions
- Domain 2: ~27 questions
- Domain 3: ~31 questions
- Domain 4: ~11 questions

---

## Content Quality Standards

Every question must pass these checks before being marked `active: true`:

1. **Factually accurate** — verified against current AWS documentation
2. **Unambiguous** — only one defensible correct answer (or exactly two for select-TWO)
3. **No trick questions** — tests knowledge, not reading comprehension or gotchas
4. **Plausible distractors** — wrong answers should be things a student might
   actually believe, not obviously absurd options
5. **Current** — reflects current AWS service behavior, not deprecated features
6. **Official domain language** — uses AWS terminology, not invented terms
7. **Calibrated** — difficulty tag (`below` / `at` / `above`) has been reviewed
   by at least one person who has passed the relevant certification

---

## Content Files

Questions are stored as JSON arrays, one file per cert per domain:

```
academy/content/
  questions/
    aws-cp/
      domain-01-cloud-concepts.json
      domain-02-security-compliance.json
      domain-03-technology-services.json
      domain-04-billing-pricing.json
    aws-saa/
      domain-01-*.json
      ...
```

Each file is a JSON array of question objects conforming to this schema.
Files are read-only at runtime (mounted as a Docker volume).
To update questions, edit the file and restart — no database migration needed.

---

## select-TWO Example

```json
{
  "id": "aws-cp-03-018",
  "cert": "aws-cp",
  "domain": "Cloud Technology and Services",
  "domain_index": 3,
  "difficulty": "at",
  "test_number": 2,
  "question_type": "multiple",
  "question": "A company wants to store objects that are infrequently accessed and can tolerate retrieval times of several hours. Which TWO Amazon S3 storage classes should they consider? (Select TWO.)",
  "options": {
    "A": "S3 Standard",
    "B": "S3 Glacier Flexible Retrieval",
    "C": "S3 Standard-IA",
    "D": "S3 Glacier Deep Archive",
    "E": "S3 Intelligent-Tiering"
  },
  "correct": ["B", "D"],
  "explanation": "S3 Glacier Flexible Retrieval and S3 Glacier Deep Archive are both designed for infrequently accessed data with retrieval times ranging from minutes to hours (Flexible Retrieval) or up to 12 hours (Deep Archive). Both offer significantly lower storage costs than S3 Standard in exchange for retrieval latency.",
  "distractors": {
    "A": "S3 Standard is optimized for frequently accessed data with millisecond retrieval. It is the most expensive storage class and is not appropriate for infrequently accessed data.",
    "B": null,
    "C": "S3 Standard-IA is designed for infrequent access but offers millisecond retrieval — not 'several hours.' It is a valid choice for infrequent access with rapid retrieval requirements, but does not match the 'several hours' retrieval tolerance described.",
    "D": null,
    "E": "S3 Intelligent-Tiering automatically moves objects between access tiers but does not offer retrieval times of several hours. It is best suited for data with unknown or changing access patterns."
  },
  "module_ref": "aws-cp-technology-services-03",
  "keywords": ["S3", "storage classes", "Glacier", "archival"],
  "active": true
}
```

