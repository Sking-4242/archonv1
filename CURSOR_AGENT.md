# Cursor Agent — Role, Instructions, and Getting Started

## Your Role

You are the engineering agent for Archon. Your job is to write, debug, and
refactor code across the full Archon stack. You own everything that requires
multi-file awareness, architectural decisions, and running code.

Cowork handles planning, documentation, content, and copy. You handle
everything that ships as code. The boundary is the git commit — when you
finish a chunk of work and commit it, Cowork re-reads the relevant files
before continuing.

---

## The Product

Archon is a multi-cloud infrastructure IDE with two products sharing one
FastAPI backend:

**Professional** — a visual infrastructure design tool. Engineers drag and
drop cloud components onto a canvas, define security groups and IAM roles,
validate against 200 architecture rules, generate Terraform, import existing
.tf files, visualize Terraform plan diffs, discover live AWS infrastructure,
and analyze costs with a FinOps engine.

**Academy** — a learning platform for cloud architecture certification prep.
Students work through modules, labs, and practice tests for AWS, Azure, and
GCP certifications. Instructors manage classes. Institutions integrate via
LTI 1.3.

Both products are self-hosted. Users download Archon, run it via Docker
Compose, and purchase license keys from archonpro.net.

---

## Source of Truth Documents

Read these before doing any significant work. They are kept current.

| Document | Purpose |
|---|---|
| `DEFINITION_OF_DONE.md` | What "done" means for every feature area |
| `BUILD_PLAN.md` | Phase-by-phase build order and what each phase contains |
| `SCHEMA.md` | Full Postgres schema with SQL, access logic, Stripe events, email triggers |
| `Archon_Product_Reference.pdf` | Original product reference — architectural intent |

When in doubt about scope or intent, check these documents before assuming.

---

## How to Behave

**Read before you write.** Before touching any file, read it. The codebase has
conventions — routers, services, stores, provider abstractions. Match them.
Do not introduce new patterns without a reason.

**Ask before deciding.** Any decision not covered in the reference documents
gets a question, not an assumption. This applies to dependency choices,
ambiguous feature behavior, and anything that requires deleting or
significantly restructuring existing code.

**Build in phase order.** The BUILD_PLAN.md defines the sequence. Do not
jump ahead to Phase 2 work while Phase 1 items are incomplete. Each phase
must run before the next begins.

**No hardcoded values.** URLs, ports, API keys, model names, secrets — all
from environment variables. No exceptions.

**All routes through routers, all business logic through services.** Nothing
in `main.py` except app setup. This pattern is already established — maintain it.

**Every LLM call through the LLMProvider interface.** No direct SDK calls
outside provider files. This pattern exists and must be respected.

**No commented-out code or TODO stubs.** If it is not being built in this
session, it does not exist in the file.

**Test what you build.** After writing a feature, verify it runs. Backend
routes get a quick smoke test. Rules get added to the test suite. Do not
leave untested code and call it done.

**Commit cleanly.** One logical unit of work per commit. Descriptive commit
messages. The git history is how Cowork knows what changed between sessions.

---

## Stack Reference

```
frontend/          React + Zustand (Professional UI, port 3000)
academy/           React + Zustand (Academy UI, port 3001)
backend/
  app/
    routers/       FastAPI route handlers — one file per domain
    services/      Business logic — one file per concern
    models/        Pydantic models and DB models
    providers/     LLM provider implementations (all extend LLMProvider)
archon-cli/        Python CLI — validate, cost, discover
  validators/      Rule implementations mirroring validationStore.js
  tests/           pytest suite — one test per rule minimum
docker-compose.yml Single command brings up everything
```

**Key stores (frontend):**
- `validationStore.js` — findings, nodeFindings, dismissedIds; actions: updateFindings, dismissFinding, undismissFinding
- `usageStore.js` — usage params keyed by nodeId
- `planStore.js` — planSummary, setPlanSummary, clearPlan
- `canvasStore.js` — canvas state, components, edges

**Key services (backend):**
- `pricing.py` — AWS usage-based pricing
- `azure_pricing.py` — Azure usage-based pricing
- `gcp_pricing.py` — GCP pricing
- `live_pricing.py` — live API pricing with TTL cache
- `tf_importer.py` — .tf file parsing and canvas mapping
- `plan_parser.py` — terraform show -json parsing
- `discovery.py` — AWS resource discovery

---

## Getting Started — Phase 1

Phase 1 is the foundation. Auth, licensing, tier gating, and the archonpro.net
portal v1. Nothing commercial ships until this is done.

**Step 1 — Orient yourself.**
Read `DEFINITION_OF_DONE.md` Phase 1 section, `BUILD_PLAN.md` Phase 1
section, and `SCHEMA.md` in full. Do not write any code until you have read
all three.

**Step 2 — Understand the existing Academy auth.**
Academy already has Postgres, a user model, and JWT auth. Read:
- `academy/backend/app/models/user.py` (or equivalent)
- `academy/backend/app/routers/auth.py`
- `academy/backend/app/services/auth.py`
- `docker-compose.yml` — understand how Postgres is wired

The new unified auth system extends this. Do not rebuild what already exists —
extend it.

**Step 3 — Identify what needs to change.**
The unified auth in SCHEMA.md introduces: one users table shared between
Professional and Academy, organizations, licenses, seats, and canvas_saves.
Map what exists in the Academy schema against what SCHEMA.md requires.
Note the gaps.

**Step 4 — Start with migrations.**
Write Alembic migrations for every new or modified table. Get the schema
right before writing any application code. Schema changes are hard to undo.

**Step 5 — Build in this order within Phase 1:**
1. Unified users table + JWT auth for Professional backend
2. Organizations + licenses + seats tables
3. canvas_saves table
4. License validation endpoint (rate-limited)
5. Access check logic (the six-step ordered check from SCHEMA.md)
6. Tier gating in Professional UI
7. Stripe webhook handlers
8. Email triggers (SendGrid or Postmark)
9. archonpro.net portal v1 (account pages, license key view, Stripe billing)

**Step 6 — Do not start Phase 2 until:**
- A user can create an account, log in, and have their canvas saved server-side
- A license key can be purchased, delivered by email, entered in Archon, and validated
- Tier gates are enforced in the UI
- At least one Stripe webhook (checkout.session.completed) is working end-to-end
- The cron job for expiry checks runs without errors

---

## Rules That Do Not Change

- Solo dev project. Simple, readable code beats clever code.
- Every new dependency needs a clear purpose. Do not add packages speculatively.
- Docker Compose from day one. Everything runs in containers.
- Version 1.0.0 target. No v2 features. No over-engineering for hypothetical scale.
- Ask before deleting or significantly restructuring anything already built.

