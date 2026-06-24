# AWS Per-Certification Curriculum — Design Proposal

## Goal

Keep the existing 25-module "Zero to Cloud Architect" path as the canonical lesson library, and add a thin per-certification layer that turns the library into targeted, blueprint-aligned exam-prep tracks — one per active AWS cert. Lessons are referenced, never duplicated.

## Core principle: compose, don't copy

Each cert is a **manifest** (`aws/certs/<CODE>.json`) that:

1. Carries exam metadata from the official guide (domains, weights, question count, passing score).
2. Maps each exam **task statement** to an ordered playlist of existing library lessons, tagged with an `emphasis` level (core / supporting / skim).
3. Lists **cert-specific lessons** the general path doesn't cover, as a backlog with status.
4. Points at the cert's **question bank**, ideally weighted to the domain split.

A lesson lives once in `aws/curriculum.json`. Update it, and every cert that references it updates too. The schema is in `aws/certs/cert-manifest.schema.json`; a fully worked example is `aws/certs/SAA-C03.json`.

## Current AWS cert lineup (verified June 2026)

Confirmed against the official AWS exam-guide index. This differs from the tags currently in `curriculum.json` — note the changes flagged below.

| Code | Certification | Level | Notes vs. current tags |
|------|---------------|-------|------------------------|
| CLF-C02 | Cloud Practitioner | Foundational | matches `aws_ccp` |
| AIF-C01 | AI Practitioner | Foundational | **not yet in curriculum** |
| SAA-C03 | Solutions Architect – Associate | Associate | matches `aws_saa` |
| DVA-C02 | Developer – Associate | Associate | matches `aws_dva` |
| SOA-C03 | **CloudOps Engineer** – Associate | Associate | **renamed from SysOps; code is now C03, was C02** |
| DEA-C01 | Data Engineer – Associate | Associate | matches `aws_dea` |
| MLA-C01 | Machine Learning Engineer – Associate | Associate | matches `aws_mla` |
| SAP-C02 | Solutions Architect – Professional | Professional | matches `aws_sap` |
| DOP-C02 | DevOps Engineer – Professional | Professional | matches `aws_dop` |
| AIP-C01 | **Generative AI Developer – Professional** | Professional | **new; not in curriculum** |
| ANS-C01 | Advanced Networking – Specialty | Specialty | matches `aws_ans` |
| SCS-C03 | Security – Specialty | Specialty | **code is now C03; lessons tag SCS-C02** |

Retired / retiring — do **not** build curricula for these:

- **Database – Specialty (DBS-C01):** retired. `aws_dbs` appears on modules 11 and 12 and should be dropped.
- **Machine Learning – Specialty (MLS-C01):** last test day was March 31, 2026 — now retired. `aws_mls` on module 22 should be dropped or folded into MLA-C01.
- Data Analytics, SAP on AWS specialties: already retired.

Net: **12 active certs** to build curricula for (treating MLS as retired), two of which (AIF-C01, AIP-C01) need new foundational/professional content the library doesn't have yet.

## Fixes to make before scaling

1. **Standardize cert identifiers on official exam codes** (`SAA-C03`), not slugs (`aws_saa`). The manifests use codes; `curriculum.json` and lesson frontmatter currently disagree (slugs vs. codes vs. stale codes). Pick codes everywhere.
2. **Update changed codes/names:** SysOps → CloudOps `SOA-C03`; Security `SCS-C02` → `SCS-C03`.
3. **Remove retired-cert tags:** `aws_dbs`, `aws_mls`.
4. **Decide the lesson-tag's role.** Once per-cert manifests exist, the `cert_tags` on lessons become a derived convenience (which certs reference me) rather than the source of truth. Recommend generating them from the manifests rather than hand-maintaining both.

## What the SAA-C03 worked example shows

`aws/certs/SAA-C03.json` maps all four domains and twelve task statements onto **58 existing library lessons** — confirming the general path already covers the large majority of SAA at exam depth. It also surfaces four concrete gaps that justify cert-specific lessons:

- **Cognito** — named in Domain 1.2, no lesson exists.
- **Cross-account STS / role switching** — Domain 1.1 leans on it; general IAM module only introduces roles.
- **Scenario decision drills** — SAA is a selection exam; service-by-service lessons don't train trade-off decisions.
- **Exam strategy / question patterns** — distractor and keyword-trigger training specific to SAA-C03.

This is the payoff of the model: the manifest *proves* coverage and *pinpoints* exactly what new content each cert needs, instead of guessing from tag counts.

## Practice tests

You're already building practice tests matched to the blueprints — that aligns exactly with this model. Recommendation: store each question with its `domain` and `task` id (the same ids used in the manifest, e.g. `D1` / `1.2`). Then a practice exam can be assembled to the official weighting automatically (SAA-C03 = 30 / 26 / 24 / 20), section-level score reports come for free, and the manifest's `question_bank.blueprint_weighted` flag can gate when a cert is "exam-ready." A shared question schema across all banks is worth locking down before the banks grow much larger (current banks range from 21 to 42 files with no enforced structure).

## Suggested build order

1. Lock the question + manifest schemas (this proposal) and the identifier cleanup.
2. **Associates first** — SAA-C03 (done as the reference), then DVA-C02, SOA-C03, DEA-C01, MLA-C01. These reuse the most existing content.
3. **Professionals** — SAP-C02, DOP-C02. Mostly composition over existing + a handful of pro-depth scenario lessons.
4. **Specialties** — ANS-C01, SCS-C03. Heavier cert-specific authoring (deep networking / security domains).
5. **New-content certs** — AIF-C01, AIP-C01. Need foundational AI and GenAI-developer lessons the library lacks.

## Files in this proposal

- `aws/certs/cert-manifest.schema.json` — the JSON Schema for a cert manifest.
- `aws/certs/SAA-C03.json` — fully worked Solutions Architect Associate manifest.
- `aws/certs/CERT_CURRICULUM_DESIGN.md` — this document.
