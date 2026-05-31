# Archon — Build Plan

> Sequential build order for a solo developer.
> DEFINITION_OF_DONE.md defines what "done" means for each item.
> This document defines the order.
>
> **Cowork** = content, docs, copy, planning
> **Cursor** = code, architecture, engineering
> **Both** = testing, review, bug fixing
>
> Last updated: May 2026

---

## Continuous Workstreams (run throughout all phases)

These are not phase-gated — they run in parallel with whatever phase is active:

- **Content pipeline** (Cowork) — AI-generate practice test questions, review, send to
  cert-holder reviewers, calibrate. Start immediately. 3,780 questions take time regardless
  of when the practice test engine is ready.
- **Bug fixing** (Both) — as each phase lands, bugs surface. Fix as found, don't batch.
- **Docs** (Cowork) — keep README, ROADMAP, and DEFINITION_OF_DONE current as features ship.

---

## Phase 1 — Foundation
**Goal:** Auth, licensing, and payment in place. Nothing commercial ships without this.
**Owner:** Cursor
**Estimated duration:** 4–6 weeks

### Auth for Professional
- [ ] Email + password account system, JWT-based
- [ ] Same Postgres instance as Academy
- [ ] Canvas save/load migrates to server-backed storage for logged-in users
- [ ] localStorage fallback for anonymous users
- [ ] MFA support (TOTP)
- [ ] Password reset via email (SendGrid or Postmark)

### License Key System
- [ ] License keys generated and stored in archonpro.net backend
- [ ] Key validation: Archon calls archonpro.net API on startup and periodically
- [ ] Offline grace period: key stays valid N days if archonpro.net unreachable
- [ ] Key tied to account, not a loose string in Settings
- [ ] Pool key model for institutional licenses (key + seat limit)
- [ ] Expiry logic: semester-end for institutional, monthly for self-learner
- [ ] Grace period: 1 week soft cut, then hard cut
- [ ] Graduating student perk: 6 months free triggered by IT admin action

### Tier Gating
- [ ] Free tier gates enforced in UI (canvas + basic gen + CP modules + 1 practice test)
- [ ] Professional license unlocks validation, FinOps, discovery, import, plan viz, live pricing
- [ ] Academy license unlocks all cert tracks, AI tutor, assignments, full practice tests
- [ ] Institutional license unlocks instructor dashboard and LTI 1.3
- [ ] Clear upgrade prompts when user hits a gate

### archonpro.net Portal (v1 — minimal)
- [ ] Account creation with MFA
- [ ] Self-learner: subscription status, license key, billing management
- [ ] Institutional admin: pool key, seat count, expiry dates, invoices
- [ ] Stripe integration for payment processing
- [ ] Email delivery: license keys, renewal reminders (2 weeks before expiry), receipts
- [ ] Domain live at archonpro.net (Cloudflare, already purchased)

---

## Phase 2 — Professional Completion
**Goal:** Professional is a shippable, licensable product. All five workflows complete and tested.
**Owner:** Cursor
**Estimated duration:** 6–8 weeks

### Discovery — Full AWS Coverage + Testing
- [ ] All AWS services with canvas components have a discovery handler
- [ ] Relationships between resources rendered as edges
- [ ] Tested rigorously across multiple real AWS account configurations
- [ ] IAM policy JSON finalized and documented
- [ ] DiscoverTab UI handles large accounts gracefully (many resources, pagination)

### GitOps — Test and Debug
- [ ] GitHub Actions workflow templates tested end-to-end against a real repo
- [ ] archon-cli validate runs cleanly in CI with --format github output
- [ ] archon-cli cost runs cleanly in CI
- [ ] Pre-commit hook tested and working
- [ ] GITOPS_GUIDE.md updated to match verified behavior

### GCP — Validation + Generation Parity
- [ ] GCP validation ruleset: ~150 rules across config, topology, firewall, IAM
- [ ] GCP rules mirrored in archon-cli validate
- [ ] Test suite covers all GCP rules
- [ ] GCP generation hint map built at AWS/Azure parity
- [ ] GCP cost estimation at AWS/Azure parity

### Azure — Validation Expansion
- [ ] Azure validation expanded from 47 to ~150 rules
- [ ] All new rules mirrored in archon-cli validate
- [ ] Test suite updated

### FinOps Live Analysis Engine
- [ ] AWS Cost Explorer + CloudWatch metrics API integration
- [ ] CSV upload path for billing/utilization data
- [ ] AI agent analyzes utilization vs. cost, generates ranked recommendations
- [ ] Recommendations UI: review, select, generate Terraform diff
- [ ] Projected savings shown per recommendation and in aggregate

### On-Prem Rules
- [ ] ~30 rules: network topology, hybrid connectivity, redundancy
- [ ] Ansible output path verified
- [ ] Mirrored in archon-cli

### CI Fixes
- [ ] archon-cli pytest added to CI
- [ ] Academy npm lint added to CI
- [ ] CONTRIBUTING.md updated with accurate test counts and scope

---

## Phase 3 — archonpro.net Marketing Site + Professional Launch
**Goal:** Public launch. First paying customers.
**Owner:** Cowork (copy + content) + Cursor (any portal engineering needed)
**Estimated duration:** 2–3 weeks

### Marketing Site
- [ ] Product overview: Professional features, Academy features, value proposition
- [ ] Pricing page: free tier, Professional, Academy, Institutional
- [ ] Features available vs. coming (public roadmap lite)
- [ ] How-to guides: installation, getting started, LTI setup
- [ ] Download page: GitHub link + packaged installer
- [ ] Live at archonpro.net

### Launch
- [ ] Demo GIF: 30 seconds — import .tf → validate → filter PCI → plan viz
- [ ] Show HN post drafted and published
- [ ] GitHub repo polish: description, topics, issue templates, CONTRIBUTING.md
- [ ] README reflects full Professional 1.0 capability

---

## Phase 4 — Academy Build-Out
**Goal:** Academy is student-ready. First institutional pilots possible.
**Owner:** Cursor (engine) + Cowork (content review, curriculum QA)
**Estimated duration:** 8–10 weeks

### Practice Test Engine
- [ ] Study mode: unlimited time, per-question explanations, wrong-answer breakdowns
- [ ] Live mode: timed per cert/difficulty, no feedback until end
- [ ] End-of-test chart: performance by domain with module recommendations
- [ ] 6 tests × 7 AWS certs wired to engine (content from continuous workstream)
- [ ] Questions flagged as inaccurate correctable without redeploy

### AI Tutor
- [ ] Plain language Q&A with curriculum context injected into prompt
- [ ] Canvas analysis: reads student's current canvas state, gives specific feedback
- [ ] Hint-first mode: guides without giving answers directly
- [ ] Works across all 5 LLM providers

### Instructor Dashboard
- [ ] Create and manage classes
- [ ] Enroll students (manual + bulk import)
- [ ] Assign modules, labs, practice tests with optional due dates
- [ ] Class-level progress view with at-risk flagging
- [ ] Individual student view
- [ ] Mark students as graduating (triggers 6-month perk)
- [ ] Assignment library: browse pre-built + create custom

### LTI 1.3 Integration
- [ ] Archon Academy registers as external tool with Canvas LMS
- [ ] JWT auth flow end-to-end
- [ ] Grade passback via LTI Advantage
- [ ] Deep linking for modules and labs
- [ ] IT admin setup documentation

### Content QA (Cowork-led)
- [ ] All 25 AWS manifest modules reviewed for accuracy
- [ ] All ~52 canvas labs verified against current canvas behavior
- [ ] Cert readiness indicators calibrated against real exam pass rates

---

## Phase 5 — Academy Launch
**Goal:** Academy open to paying students and institutional pilots.
**Owner:** Both
**Estimated duration:** 2–3 weeks

- [ ] All AWS CP and SAA content reviewed and accurate (priority certs for launch)
- [ ] Onboarding flow tested: account creation → free CP modules → upgrade prompt
- [ ] Institutional onboarding tested: portal key purchase → LTI setup → student enrollment
- [ ] First institutional pilot identified and onboarded
- [ ] Azure and GCP cert tracks surfaced (content exists, now visible to paid users)

---

## Phase 6 — Sharing + Advanced Features
**Goal:** Collaborative features and FinOps expansion.
**Owner:** Cursor
**Estimated duration:** TBD based on Phase 5 learnings

- [ ] Static architecture sharing: read-only shareable links
- [ ] Real-time collaboration: only if demand is demonstrated post-launch (Yjs/CRDT)
- [ ] FinOps expanded to Azure and GCP
- [ ] On-Prem discovery (hybrid topology)
- [ ] Azure and GCP discovery

---

## Timeline Estimate

| Phase | Focus | Est. Duration | Cumulative |
|---|---|---|---|
| 1 | Foundation (auth, license, portal v1) | 4–6 weeks | Month 1–2 |
| 2 | Professional completion | 6–8 weeks | Month 3–4 |
| 3 | Marketing site + Professional launch | 2–3 weeks | Month 4–5 |
| 4 | Academy build-out | 8–10 weeks | Month 6–7 |
| 5 | Academy launch | 2–3 weeks | Month 8 |
| 6 | Sharing + advanced features | TBD | Month 9+ |

**Archon AI:** ~Month 12+ (separate R&D track, does not block any phase)

---

## Cowork vs. Cursor Division

| Work type | Owner |
|---|---|
| Validation rules (GCP, Azure, On-Prem) | Cursor |
| Auth, license system, tier gating | Cursor |
| FinOps engine and AI agent | Cursor |
| LTI 1.3, instructor dashboard | Cursor |
| Practice test engine (study/live modes) | Cursor |
| AI tutor | Cursor |
| archonpro.net portal engineering | Cursor |
| Practice test content generation + review | Cowork |
| Curriculum QA and module review | Cowork |
| archonpro.net marketing copy and guides | Cowork |
| README, ROADMAP, docs updates | Cowork |
| Planning, sequencing, definition of done | Cowork |
| Testing and bug fixing | Both |

---

*Handoff boundary: git commits. After each Cursor session commits work, Cowork
re-reads relevant files before continuing. DEFINITION_OF_DONE.md and BUILD_PLAN.md
are the shared north star for both tools.*

