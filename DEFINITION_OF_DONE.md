# Archon — Definition of Done

> This document defines what "done" means for each major area of the Archon product.
> A feature is done when every item in its section is true. Pending decisions are flagged
> with ⚠️ and must be resolved before the relevant section can be fully scoped.
>
> Last updated: May 2026

---

## Tier Definitions

### Free Tier (free account required, no license key)
**Professional:**
- Full canvas — all four providers, all components, all edge types
- Save/load JSON, templates, undo/redo, copy/paste
- Basic IaC generation
- Cost estimation (static pricing only, no live API)

**Academy:**
- All modules required for AWS Cloud Practitioner certification
- 1 easy practice test for AWS CP (below-exam-level)
- Full component library — browse all canvas components with descriptions
- Progress tracked server-side (requires free account)

### Professional License (paid, license key required)
- Unlimited IaC generation across all providers
- Full 200-rule validation engine
- FinOps live analysis engine + AI recommendations
- Terraform import and plan visualization
- Discovery tool (AWS full coverage)
- Live pricing API
- GitOps pipeline integration

### Academy License (paid, license key required)
- All cert tracks: SAA, DVA, SysOps, SOA, SAP, Security Specialty
  (CP advanced content — all 6 practice tests including the 5 beyond the free one)
- AI tutor (all contexts — lessons, labs, challenges)
- Full assignment and lab library
- Progress tracking across all modules and certs
- Cert readiness indicators

### Institutional License (paid, pool key with seat limit)
- Everything in Academy license
- Instructor dashboard and class management
- LTI 1.3 integration with Canvas LMS
- Bulk seat management via archonpro.net portal
- Graduating student perk: 6 months free Pro + Academy per marked graduate

### Account Requirements
- Free tier: account creation required (email + password + MFA optional)
- All paid tiers: account required, MFA available
- Anonymous users: can view the archonpro.net marketing site only
- Progress saving, practice test scores, and lab state all require a logged-in account

### ⚠️ Build Item: Auth for Professional
Professional currently has no account system — canvas state lives in localStorage only.
To support the free account tier, license key association, and future sharing features,
Professional needs an auth layer:
- Email + password login, JWT-based, same Postgres instance as Academy
- Canvas save/load migrates from localStorage to server-backed storage for logged-in users
- License key tied to account (not a loose string in Settings)
- localStorage remains as anonymous fallback for users who haven't created an account

---

## 1. Archon Professional — The IDE

### Canvas and Components
- [ ] AWS: 130+ component types, all with config fields at current depth
- [ ] Azure: 68 component types, all with config fields at AWS parity depth ✅
- [ ] GCP: full component set with config fields at AWS parity depth
- [ ] On-Prem: component set maintained for hybrid architecture documentation
- [ ] All four providers selectable from provider dropdown on canvas
- [ ] 6 edge types work across all providers: Network, Data Flow, Dependency, Streaming, Batch, Event
- [ ] 60 templates (15 per provider) load correctly and are accurate

### Validation Engine
- [ ] AWS: ~153 rules across config, topology, SG, IAM, and FinOps categories ✅
- [ ] Azure: rules expanded to AWS parity depth (~150 rules) across config, topology, NSG, IAM
- [ ] GCP: full ruleset built (~150 rules) — config, topology, firewall, IAM
- [ ] On-Prem: ~30 rules focused on network topology, hybrid connectivity, and redundancy
  (no cloud compliance framework — different rule categories than cloud providers)
- [ ] All rules have severity, description, suggestion, and compliance mapping where applicable
- [ ] CLI (archon-cli validate) mirrors all rules across all providers
- [ ] Test suite covers all rules with parity between JS engine and Python CLI
- [ ] ValidateTab: findings grouped by component, jump-to-node, dismiss/undismiss, export JSON/text
- [ ] Standard filter (SOC2, PCI, HIPAA, CIS, NIST) works for all providers with rules mapped

### IaC Generation
- [ ] AWS: Terraform generation with 70-entry resource hint map ✅
- [ ] Azure: Terraform generation with 68-entry resource hint map ✅
- [ ] GCP: Terraform generation with full resource hint map at AWS/Azure parity
- [ ] On-Prem: Ansible playbook output (not Terraform — no good bare-metal TF story)
- [ ] Multi-file tabs in GeneratePanel with copy buttons ✅
- [ ] AI architecture review runs on generate for all providers
- [ ] HCL security review available post-generate

### Terraform Import
- [ ] .tf file import via ImportTfModal — multi-file, data sources, modules, count/for_each ✅
- [ ] Resources map to canvas nodes accurately for AWS, Azure, GCP
- [ ] Edges inferred from resource references
- [ ] Import limitations documented clearly in UI

### Terraform Plan Visualization
- [ ] Load terraform show -json output via Plan modal
- [ ] Create/modify/destroy rings overlay on canvas nodes
- [ ] Change diff panel: counts + scrollable change list
- [ ] Clear plan overlay button
- [ ] Tested end-to-end against real terraform plan output — works reliably

### Discovery (AWS)
- [ ] archon-cli discover runs against a real AWS account without errors
- [ ] Covers all AWS services, components, and relationships available via the AWS APIs —
  not limited to the current 30+ types; any service that has a canvas component has a
  corresponding discovery handler
- [ ] Relationships between resources are inferred and rendered as edges (e.g. EC2→SG,
  ALB→Target Group→EC2, RDS→subnet, Lambda→VPC, IAM role→service)
- [ ] Output loads correctly into canvas via DiscoverTab with full topology intact
- [ ] Read-only — no write operations, no credentials leave local machine
- [ ] IAM policy JSON documented — minimum required permissions, nothing broader
- [ ] Tested rigorously across multiple account configurations with minimal bugs
- [ ] Azure and GCP discovery: deferred (clearly roadmapped, not present at launch)

### FinOps Tool
- [ ] Static FinOps findings (14 rules) in validation engine ✅
- [ ] Live analysis engine: connect to AWS Cost Explorer + CloudWatch metrics APIs directly
- [ ] CSV upload path: user exports billing/utilization data and uploads to Archon
- [ ] AI agent analyzes utilization vs. cost and generates specific optimization recommendations
  (example: "5 x t2.medium at 30% utilization → 2 x t3.large, projected 40% cost reduction")
- [ ] Recommendations UI: user reviews suggestions, selects which to apply
- [ ] Selected recommendations generate a Terraform diff to implement the changes
- [ ] Projected savings shown per recommendation and in aggregate
- [ ] Backed by a well-prompted LLM call with utilization + cost context (not a custom model)

### GitOps Pipeline
- [ ] GITOPS_GUIDE.md is accurate and complete ✅ (needs verification)
- [ ] GitHub Actions workflow templates work end-to-end against a real repo
- [ ] archon-cli validate runs cleanly in CI with --format github annotation output
- [ ] archon-cli cost runs cleanly in CI
- [ ] Pre-commit hook installs and works
- [ ] Tested end-to-end — not just documented

### AI Features
- [ ] AI Generate: architecture generation from prompt with canvas builder ✅
- [ ] AI Chat: conversational panel with canvas context injection ✅
- [ ] AI Design: /design endpoint with plan suggestions ✅
- [ ] HCL Security Review: post-generate security analysis ✅
- [ ] All AI features work across all 5 LLM providers (Anthropic, OpenAI, Gemini, xAI, Ollama)
- [ ] No direct SDK calls outside provider files — all through LLMProvider interface

### Cost Estimation
- [ ] AWS: usage-based pricing for 30+ service types ✅
- [ ] Azure: usage-based pricing for 30 service types ✅
- [ ] GCP: usage-based pricing at AWS/Azure parity
- [ ] On-Prem: amortized hardware cost estimates
- [ ] Live pricing (API) with static fallback for AWS, Azure, GCP ✅
- [ ] LIVE/STATIC badge + fallback banner in EstimatePanel ✅
- [ ] Usage model inputs + projection chart in EstimatePanel ✅

---

## 2. Archon Academy — The Learning Platform

### Content (AWS Track — launch scope)
- [ ] 7 certification tracks: Cloud Practitioner, SAA, DVA, SysOps, SOA, SAP, Security Specialty
- [ ] Modules QA'd: all 25 AWS manifest modules reviewed for accuracy and completeness
- [ ] Canvas labs verified: all ~52 canvas lab entries in AWS manifest load and validate correctly
- [ ] Lessons: reading content reviewed for accuracy against current AWS documentation
- [ ] Challenges: open-ended design problems with scoring guidance reviewed

### Practice Tests (AWS — launch scope)
- [ ] 6 practice tests per certification × 7 certs = 42 tests total
- [ ] 90 questions per test = 3,780 questions total
- [ ] Difficulty split per cert: 1 below exam level, 2 at exam level, 3 above exam level
- [ ] Content pipeline: AI-generated → Seth review → cert-holder feedback → calibration
  against commercial practice tests → Seth takes actual certs using Archon as prep
- [ ] Study mode: unlimited time, full explanations for wrong answers including why
  other options are incorrect
- [ ] Live mode: timed (time varies per cert/difficulty), no feedback until completion
- [ ] End-of-test chart: performance by domain/topic with module recommendations
  for areas where student scored below threshold
- [ ] Questions flagged by cert holders as inaccurate are correctable without a full redeploy

### AI Tutor
- [ ] Available in any lesson, lab, or challenge context
- [ ] Plain language Q&A: answers student questions about concepts in the current module
- [ ] Canvas analysis: when student is stuck on a lab, tutor analyzes their current canvas
  state and gives specific feedback on what's missing or wrong (not just "you're wrong")
- [ ] Does not give away answers directly — guides with hints and questions
- [ ] Backed by LLM with curriculum context + canvas state injected into prompt
- [ ] Works across all 5 LLM providers

### Assignments Library
- [ ] Library of pre-built lab scenarios instructors can browse and assign
- [ ] Instructors can build custom assignments using the canvas
- [ ] Assignments have defined correct-answer schemas that the validation engine checks against
- [ ] Students can see assigned work in their dashboard with due dates if set

### Student Experience
- [ ] Module unlock gating: modules unlock in sequence, or instructor can override
- [ ] Progress tracked server-side (Postgres) for logged-in users ✅
- [ ] Progress dashboard: modules completed, practice test scores, lab completion
- [ ] Cert readiness indicator: based on practice test performance across all 6 tests

### Instructor Dashboard (Institutional tier)
- [ ] Create and manage classes
- [ ] Enroll students (manual + bulk import)
- [ ] Assign specific modules, labs, or practice tests with optional due dates
- [ ] Class-level progress view: completion rates, average scores, at-risk students
- [ ] Individual student view: full progress breakdown per student
- [ ] Assignment library access: browse pre-built + create custom
- [ ] Marks students as graduating (triggers 6-month free Archon Pro/Academy perk)

### LTI 1.3 Integration
- [ ] Archon Academy registers as an external tool with Canvas LMS
- [ ] JWT-based auth flow works end-to-end
- [ ] Grade passback via LTI Advantage (assignment scores pass to Canvas gradebook)
- [ ] Deep linking: instructors can link specific modules/labs from Canvas assignments
- [ ] Setup documentation for IT admins at institutions

### Azure and GCP Academy Tracks
- [ ] Deferred until AWS track is fully QA'd and launch-ready
- [ ] Content exists in manifests but is not surfaced to students until reviewed
- [ ] Roadmapped clearly on archonpro.net

---

## 3. archonpro.net — Marketing Site and Customer Portal

### Marketing Site
- [ ] Product overview page: Professional features, Academy features, clear value proposition
- [ ] Pricing page: self-learner ($10/mo), institutional ($20/student/semester), free tier
- [ ] Features available vs. features coming (public roadmap lite)
- [ ] How-to guides: installation, getting started, LTI setup for institutions
- [ ] Download page: GitHub link + packaged installer download
- [ ] MFA available for all portal accounts

### Customer Portal
- [ ] Account creation with MFA
- [ ] Self-learner: subscription status, license key, billing management
- [ ] Institutional admin: view all license keys for their org, seat count vs. limit,
  expiry dates, download invoices, manage renewal
- [ ] Pool key model: one key per institution with a seat limit (not per-student keys)
- [ ] License expiry: end of semester with automated handling:
  - 2-week reminder email
  - 1-week grace period after expiry (soft cut — warning shown, access continues)
  - Hard cut after grace period — access removed until renewal
- [ ] Graduating student perk: IT admin marks students as graduating,
  system grants 6 months free Pro/Academy
- [ ] Email delivery: license keys, renewal reminders, receipts (SendGrid or Postmark)
- [ ] Payment processing: Stripe or equivalent integrated with the portal

---

## 4. Infrastructure and Distribution

### Product Distribution
- [ ] GitHub repo: clean, public, well-documented, installable
- [ ] Packaged installer downloadable from archonpro.net
- [ ] Docker Compose brings up all services (frontend, backend, Academy, Postgres) in one command
- [ ] installer.py handles: Docker check, .env config, container build/start, browser open
- [ ] Free tier works without a license key — no account required
- [ ] License key entry: single field in Settings, validated against archonpro.net
- [ ] Invalid/expired key shows clear message with link to purchase/renew

### License Validation
- [ ] License keys validated via archonpro.net API call on product startup and periodically
- [ ] Offline grace period: if archonpro.net is unreachable, key remains valid for N days
  (avoids cutting off users with network issues)
- [ ] ⚠️ Pending: free vs. paid tier split determines which features are gated

### Self-Hosted Operations
- [ ] Postgres data (Academy) backed up — documentation for backup procedure
- [ ] Default credentials (seed.py) documented with strong warning to change before
  any shared/institutional deployment
- [ ] ACADEMY_SECRET_KEY rotation documented
- [ ] Health check endpoints for both Professional backend and Academy backend

---

## 5. Architecture Sharing (Future — post-auth)

Not in scope until Professional auth is shipped. Scoped here so the auth
layer is designed to support it from the start.

**Static sharing:**
- Generate a read-only shareable link for any saved architecture
- Recipient views the canvas in a read-only mode — no account required to view
- Link can be revoked by the owner
- Useful for sharing designs with clients, stakeholders, or teammates

**Real-time collaboration:**
- Two or more users edit the same canvas simultaneously
- Requires CRDT or operational transform for conflict resolution (Yjs is the
  realistic choice)
- This is a significant architecture addition — do not attempt until static
  sharing is proven and there is genuine user demand for real-time

**Design constraint:** Auth for Professional must use server-backed canvas
storage (not localStorage) before either sharing mode can be built.

---

## 6. Archon AI (Future — ~12 months)

Not in scope for v1.0. Scoped here so nothing built now blocks it.

**Interface contract (design now, build later):**
- All AI calls already go through the LLMProvider abstraction — Archon AI slots in
  as another provider without touching call sites
- FinOps AI agent and Academy AI tutor are built with provider-agnostic prompts —
  swappable to Archon AI when ready
- Canvas state serialization format (Graph JSON) is already clean enough to be
  training data — no changes needed

**When the time comes:**
- Fine-tuned model on infrastructure design, Terraform, and AWS/Azure/GCP security
- Training data: Graph JSON → Terraform pairs, validation findings, FinOps recommendations
- Evaluation: against existing rule engine (does it catch what the rules catch?)
- Deployed as a self-hostable model option alongside the 5 existing providers

---

## Summary Checklist by Area

| Area | Estimated State | Biggest remaining work |
|---|---|---|
| Professional — Canvas/Components | ~85% | GCP config depth |
| Professional — Validation | ~45% | GCP + Azure expansion, On-Prem rules |
| Professional — Generation | ~80% | GCP hint map |
| Professional — Import/Plan/Discovery | ~60% | Full AWS service coverage + testing + debug |
| Professional — FinOps Tool | ~15% | Live analysis engine + AI agent |
| Professional — GitOps | ~60% | Testing + debug |
| Academy — Content | ~50% | QA, canvas lab verification |
| Academy — Practice Tests | ~5% | Full content pipeline |
| Academy — AI Tutor | ~0% | Build from scratch |
| Academy — Instructor Dashboard | ~20% | Full dashboard build |
| Academy — LTI 1.3 | ~0% | Build from scratch |
| archonpro.net | ~0% | Full build |
| License System | ~0% | Full build |
| Archon AI | ~0% | Deferred |

---

*⚠️ Free vs. paid tier split must be defined before license system build begins.*

