# CLF-C02 (AWS Certified Cloud Practitioner) — Completion & QA Report

**Goal:** Ensure the Cloud Practitioner cert has every lesson it needs and is complete.

**Result:** COMPLETE. All four domains and every task statement are now covered by a combination of existing shared lessons and 8 newly authored cert-specific gap lessons, wired into a full manifest. PASS on structure and resolution. One follow-up noted.

---

## 1. Coverage approach

CLF-C02 already had strong coverage of core services — modules 1–6 were fully tagged `CLF-C02`, plus ~40 individual lessons across the curriculum — and an existing question bank (`questions/aws-cp`, 24 files). The work here was to find and fill the **gaps** the architecture-focused curriculum didn't emphasize, then map everything to the official blueprint.

The exam's four domains and weights (verified from the official guide): **Cloud Concepts 24%, Security & Compliance 30%, Cloud Technology & Services 34%, Billing/Pricing/Support 12%**; 65 questions (50 scored), pass 700, multiple-choice and multiple-response only.

---

## 2. Gaps identified and filled (8 new cert-specific lessons)

| # | Lesson | Fills (domain/task) | Words |
|---|--------|--------------------|------:|
| 1 | Cloud Economics and the Value of AWS | D1.4 (CapEx/OpEx, TCO, economies of scale, rightsizing, BYOL) | 1,823 |
| 2 | Cloud Migration and the AWS Cloud Adoption Framework | D1.3 (CAF, the 7 Rs, DMS/SCT/Snowball) | 1,767 |
| 3 | Accessing and Deploying on AWS | D3.1 (Console/CLI/SDK/IaC, deployment models) | 1,592 |
| 4 | AWS Security Services Overview | D2.2 / D2.4 (GuardDuty, Inspector, Shield, WAF, Macie, Trusted Advisor, encryption, logging) | 1,659 |
| 5 | Analytics and AI/ML Services Overview | D3.7 (Athena, Kinesis, Glue, QuickSight, Kendra, data lakes) | ~1,700 |
| 6 | Other AWS Services Survey | D3.8 (EventBridge, Connect, SES, dev tools, WorkSpaces, Amplify, IoT) | 1,549 |
| 7 | AWS Support, Partners, and Technical Resources | D4.3 (Support plans, Partner Network, Marketplace, Health Dashboard) | 1,731 |
| 8 | CLF-C02 Exam Strategy and Question Patterns | capstone (all domains) | 1,664 |

These were the genuine gaps: the general curriculum under-covered cloud economics, migration/CAF, ways-to-access AWS, the broader security-services catalog, analytics, the services-breadth survey, and the support/partners ecosystem — all of which CLF-C02 tests directly.

---

## 3. Manifest — full coverage, all references resolve

`CLF-C02.json` replaces the placeholder with a complete manifest:

- **Four domains** weighted **24/30/34/12 (= 100)**, with all 19 task statements mapped.
- **57 lesson references total** — **49 shared** library lessons (all resolve to seeded curriculum slugs) plus the **8 cert-specific** lessons (all files present on disk). Every reference resolves.
- The capstone exam-strategy lesson is published-but-unreferenced, so it renders in the cert view's "Capstone & Exam Prep" section.
- **Question bank** pointed at `questions/aws-cp`.
- `coverage.cert_specific_needed` = **0**.

---

## 4. Structural QA — PASS

All 8 new lessons: valid frontmatter, single H1, all 11 house-style sections, balanced code fences, Quick Check with answer key, and 1,500–2,500 words (lesson 5 was topped up with data-lake and batch-vs-real-time sections to clear the floor). Written in the same format as the SAA and AIF cert lessons.

---

## 5. Follow-ups and caveat

1. **Re-seed required:** run `python seed_library.py` so the 8 CLF-C02 lessons load into the DB and the cert track resolves at runtime.
2. **Question bank:** `questions/aws-cp` exists and is now pointed to by the manifest, but it hasn't been verified as weighted to the 24/30/34/12 domain split — a worthwhile follow-up.
3. **Sandbox caveat:** as in prior sessions, the Linux mount served stale snapshots of the freshly written manifest and the just-edited lesson, so a final automated `json.load` and word tally couldn't complete in-session. Resolution was verified independently (49/49 shared refs against curriculum.json, 8/8 cert files on disk, weights = 100), and the lesson edits were confirmed present via the authoritative reader. A quick local `python -c "import json; json.load(open('CLF-C02.json'))"` and opening the track in-app will confirm.
