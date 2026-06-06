# CSE Department Video — Quick Reference

> **Purpose:** Department-wide promo for **CSE faculty and students** (async email/Teams).  
> **Goal:** Download → install → try Pro and Academy; collect feedback.  
> **Film:** ~25 minutes raw → **12–14 minutes** final.  
> **Tone:** Promotional and try-it-yourself, not a live interview trim. Release may be delayed—keep demos **evergreen** (avoid “launching next week” unless you will re-cut).

**Links to use on screen and in description:** [archonpro.net](https://archonpro.net) · [GitHub repo](https://github.com/Sking-4242/archonv1) · `GETTING_STARTED.md` · `python install.py`

---

## One-sentence thesis (repeat in middle + at end)

**One install, two apps: design like an engineer, learn on the same canvas.**

| Product | Port | One line |
|---------|------|----------|
| **Archon Professional** | `3000` | Multi-cloud design studio—validation, cost, Terraform, discovery |
| **Archon Academy** | `3001` | Structured learning, canvas labs, practice tests, instructor tools |
| **Shared** | Same `docker compose up` | One backend: AI, validation, pricing, Terraform |

**Open beta (say this if pricing comes up):** Free account unlocks validation, FinOps, discovery, full Academy, instructor dashboard—no license key required. Commerce is parked; basic canvas works offline without an account.

---

## Audience hooks (one video, two viewers)

| Viewer | Should think |
|--------|----------------|
| **Students** | Cert prep + real architecture tooling; resume-worthy |
| **Faculty** | Self-hosted lab stack; automated first-pass feedback; pilot without procurement |

**Primary CTA:** Install locally. **Secondary CTA:** Reply to you with feedback or join a pilot.

**Optional exclusivity line:**  
*“We’re sharing this with CSE first—your feedback shapes what we use in courses.”*

---

## Final structure (~12–14 min)

| # | Segment | Final time | Notes |
|---|---------|------------|--------|
| 1 | Hook + what Archon is | 1:00 | Camera; dual audience |
| 2 | Why one platform (not 3 tools) | 0:45 | Diagram + code + console split |
| 3 | Pro — one workflow | 4:00–5:00 | Design → validate → fix → Terraform *or* cost |
| 4 | **Cloud security** | **2:00–2:30** | Concepts → design → assurance |
| 5 | Academy — learn + lab + test | 3:30–4:00 | Student path + instructor glance |
| 6 | Try it yourself | 1:30 | Steps on screen |
| 7 | Close + links | 0:45 | |

### Run-of-show (day-of cheat sheet)

```
0:00   HOOK (camera)
1:00   Why one platform (15–45 sec)
1:45   Pro: canvas → validate → 1 fix → export OR import (or cost)
5:45   CLOUD SECURITY (see full section below)
8:15   Academy: lesson → lab → practice → instructor
11:15  TRY IT (steps card + camera)
12:45  CLOSE
```

---

## Opening scripts (~50 seconds)

Film first, direct to camera, then cut to demo.

### Option A — Problem-first (recommended)

> “If you’ve taken or taught a cloud course, you’ve probably seen the same split: architecture on a whiteboard, labs in the AWS console, and Terraform in a repo—with nothing holding them together.
>
> **Archon** is a self-hosted platform we’re highlighting for cloud and systems work. **Archon Professional** is a visual studio for multi-cloud design—validation, cost, Terraform import and export, and live AWS discovery. **Archon Academy** is structured learning on the **same canvas**: modules, hands-on labs, practice tests, and instructor tools for classes.
>
> I’m **[NAME]**, **[ROLE/AFFILIATION]**. This video is for **CSE students and faculty** who want to try it on their own machine—no sales call, just download, Docker, and explore. Here’s what you get in about twelve minutes.”

### Option B — Department hook

> “CSE has been teaching cloud as theory plus console clicks. **Archon** is our answer: a multi-cloud infrastructure studio plus a learning platform that share one backend—so a lab isn’t ‘draw in Lucidchart and write HCL separately,’ it’s **one canvas** with **500+ rules**, exportable Terraform, and instructor visibility into progress.
>
> I’m **[NAME]**. I’ll walk through Professional for design and validation, how we teach **cloud security**, then Academy for curriculum and teaching—and how to install it locally.”

**Land before first cut:**  
*“Two products, one install: Professional on port 3000, Academy on 3001—same Docker stack.”*

---

## Transitions (short separate takes)

- *“That’s the engineering studio—now how we teach security on the same stack.”*
- *“Security on the canvas—now the classroom side.”*
- *“For faculty, the important part is assignments, progress, and optional org tracking—not another SaaS login.”*
- *“Everything runs from one `docker compose up`—links are in the description.”*

---

## Segment: Why one platform (~45 sec)

**Say:** Console labs teach services; employers want **linked** diagram, compliance reasoning, and IaC. Archon connects **design → rules → cost → Terraform** on one graph.

**Student:** Less busywork; portfolio shows architecture, not only screenshots.  
**Faculty:** One rubric: design + compliance + IaC; first pass automated.

---

## Segment: Archon Professional (~5 min film → ~4 min keep)

### Story arc

**Design → validate → fix → (cost **or** Terraform)**

| Step | Show | Say |
|------|------|-----|
| 1 | Canvas: template or 3–4 components + edges | “Four providers—AWS deepest today—130+ AWS components.” |
| 2 | Validate tab; 2–3 findings on canvas | “500+ rules live on the diagram—not a checklist after the fact.” |
| 3 | One-click **Fix** or suggestion | “Actionable Terraform guidance, not just ‘fail.’” |
| 4 | Compliance filter (CIS or SOC2) — 5 sec | “Maps to how we talk about security in systems courses.” |
| 5 | Estimate panel — one number **or** Export ZIP **or** Import .tf / plan JSON — **pick one** | “Cost and IaC round-trip on the same design.” |

**Student hook:** “Resume-grade infrastructure design, not only console work.”  
**Faculty hook:** “Automated first pass; you review submissions.”

**Optional 15 sec B-roll:** `archon-cli validate plan.json --format github` — CI/capstone angle.

### Do not film

API key wizard (unless 5 sec “bring your own LLM”), full rule scroll, every provider, long discovery scan, failed clicks.

### Pro sound bite

> “Multi-cloud canvas—validation, compliance filters, cost, Terraform import and export—self-hosted on your machine.”

---

## Segment: Cloud security (~3 min film → ~2–2.5 min keep)

### Framework: three layers

| Layer | Where | What they learn |
|-------|--------|-----------------|
| **1. Concepts** | Academy (IAM, shared responsibility, compliance modules) | Threat models, shared responsibility, frameworks |
| **2. Design** | Pro — **Security** + **IAM** tabs + topology on canvas | SGs, identity, segmentation, unsafe paths |
| **3. Assurance** | **Validate** + compliance filter + optional **archon-cli** | Findings, CIS/PCI/SOC2/HIPAA/NIST tags, fixes, CI gates |

**One-liner:**  
*“Read the threat model in Academy, build controls on the canvas, get immediate feedback from 500+ rules—including compliance-tagged findings—not weeks later in a postmortem.”*

**10-second department sound bite:**  
> “We teach shared responsibility in Academy, segmentation and IAM on the canvas, and continuous validation against real compliance frameworks before Terraform merges.”

### Script + demo beats

#### Beat 1 — Architecture-first (20 sec)

> “Console labs teach *how to turn on encryption*. Employers also want *why* a database must not face the internet, *why* SSH from `0.0.0.0/0` is a finding, and *how* PCI or HIPAA scope splits between provider and customer. Archon teaches security **on the architecture**—identity, segmentation, compliance—not isolated toggles.”

#### Beat 2 — Academy (25 sec)

**Show:** Academy → AWS → **Module 4 (IAM)** or **Module 5 (shared responsibility / compliance)** — module titles only.

**Say:**

> “Academy covers IAM—users, groups, roles, policies, least privilege, MFA—with **canvas labs** on the same graph as Pro. Module 5 covers **shared responsibility** and **compliance**: what AWS attests in Artifact versus what the customer must prove—same split as certs and vendor reviews.”

- **Faculty:** Fits cloud security electives, cert prep, or a unit in distributed systems.  
- **Students:** Exam narrative and architecture story stay aligned.

#### Beat 3 — Pro demo (60–75 sec) — **priority footage**

**Pre-load:** Template with one deliberate flaw (RDS public path, SG 22/3306 from `0.0.0.0/0`, or missing IAM role).

| Order | Show | Say |
|-------|------|-----|
| 1 | **Security** tab — one SG, one ingress rule | “Boundaries are explicit—not default VPC magic.” |
| 2 | **IAM** tab — one role/policy | “Identity is on the diagram.” |
| 3 | **Validate** — 2–3 canvas highlights | Name types: **topology** (DB to internet, no WAF on public ALB), **SG ports** (SSH/RDP/DB to world), **IAM** (wildcards, escalation), **config** (encryption, flow logs, IMDSv2, public access, …) |
| 4 | Compliance filter → **CIS** or **PCI** | “Findings tagged with CIS, SOC 2, PCI, HIPAA, NIST.” |
| 5 | **Fix this** or suggestion | “Specific remediation—often HCL—not ‘security failed.’” |

> “**153 AWS rules**—config, topology, 18 SG port rules, 6 IAM rules—with Azure and GCP at similar depth. Students **see** misconfiguration on the diagram before it ships.”

**Rule categories to mention (don't scroll all):**

- **Config (88 AWS):** encryption, backups, public access, CloudTrail, flow logs, IMDSv2, …  
- **Topology (27):** DB to internet, missing SG/IAM, no WAF on public ALB, DB in public subnet, …  
- **SG ports (18):** 0.0.0.0/0 SSH/RDP, DB ports to internet, all traffic open, …  
- **IAM (6):** wildcards, broad scope, trust conditions, privilege escalation  

**Standards (Validate tab / CLI):** CIS AWS Foundations 3.0 · SOC 2 · PCI DSS v4 · HIPAA · NIST CSF 2.0

#### Beat 4 — Classroom to pipeline (15 sec, optional)

```bash
archon-cli validate plan.json --format github --standard PCI
```

> “Same rules in **archon-cli** for CI—capstone and PR gates on critical findings or a chosen standard.”

**Transition out:** *“Concepts in Academy, enforcement on the canvas, same validation in GitOps when you’re ready.”*

### Security: film vs skip

| Film | Skip |
|------|------|
| Findings on canvas | All 153 rules listed |
| One SG + one IAM glance | Full policy JSON |
| CIS or PCI filter + 2 findings | Every standard explained |
| One fix | Long AI security chat |

### Security Q&A

| Question | Answer |
|----------|--------|
| Replaces AWS security labs? | Complements console; **architecture + identity + compliance mapping**. |
| Pentest tool? | **Defensive** design review and IaC—not exploitation. |
| Which courses? | Cloud security, systems, capstone, AWS cert prep; Academy Mod 4–5 + Pro validate. |
| Sensitive designs? | Self-hosted; data stays local. |
| Grading? | Rubric on resolved critical findings; export canvas / validation report. |

---

## Segment: Archon Academy (~8 min film → ~4 min keep)

### Story arc

**Learn → canvas lab → practice → teach**

| Step | Show | Say |
|------|------|-----|
| 1 | AWS module path (e.g. fundamentals or IAM) | “25+ AWS modules; Azure/GCP tracks growing.” |
| 2 | One lesson + progress | “Repo-backed curriculum; progress with free account.” |
| 3 | **Canvas lab** + validation | “Same canvas as Pro—industry workflow early.” |
| 4 | Practice test — study mode, 2 questions | “Cert-style; timed mode for exam prep.” |
| 5 | **Instructor:** class, assign module, gradebook glance | “Join codes, assignments, analytics; org code optional for dept tracking—no billing in open beta.” |
| 6 | Teaching assistant — one short prompt | “Copilot for lessons/feedback—not replacing instructor.” |

**Demo logins (local dev only—do not show passwords on final cut):** See `README.md` Academy section; use pre-logged-in browser profiles for filming.

### Academy sound bite

> “Structured cert paths, canvas labs with validation, practice tests, and self-serve instructor tools—on the same install as Professional.”

---

## Segment: Try it yourself (~90 sec)

**Film to camera and/or title card.**

### On-screen steps

1. **Get code:** [archonpro.net](https://archonpro.net) or GitHub `Sking-4242/archonv1`  
2. **Install Docker Desktop**  
3. Run `python install.py` in project folder (see `GETTING_STARTED.md`)  
4. Open **Pro** → `http://localhost:3000` · **Academy** → `http://localhost:3001`  
5. **Free account** on portal when prompted—unlocks validation, full Academy, instructor mode (open beta)

### Script

> “No license key needed for open beta. Basic canvas works offline without an account; signing in unlocks validation, FinOps, discovery, and full Academy. If you get stuck, contact **[YOUR EMAIL / OFFICE HOURS]**. We want quick feedback: what broke, what clicked.”

### Low-friction asks (pick for email)

- **Students:** One Academy lesson + one canvas lab → one sentence or screenshot of feedback.  
- **Faculty:** Reply for a 20-minute install walkthrough for a course or research group.

### Prerequisites (mention if asked)

- Python 3.11+, Docker Desktop  
- LLM API key optional (Settings in app); AWS creds only for discovery/FinOps live features  

---

## Closing (~45 sec)

> “Archon doesn’t replace the AWS console or your textbook—it connects **diagram, rules, cost, and Terraform** so what you draw is what you can reason about and ship. **Professional** for building and validating; **Academy** for learning and teaching—the same Docker stack.
>
> Links in the description: **archonpro.net**, GitHub, and GETTING_STARTED. Download it, break it, tell us what you think. Thanks for watching.”

---

## Email / Teams blurb (when video drops)

**Subject:** Try Archon — cloud design + learning (self-hosted, CSE)

**Body:**

> We’re sharing a short intro to **Archon Professional** (multi-cloud canvas, 500+ validation rules, Terraform round-trip) and **Archon Academy** (modules, canvas labs, practice tests, instructor tools)—one install, runs locally via Docker.
>
> **Watch:** [VIDEO LINK] (~12 min)  
> **Try:** [archonpro.net](https://archonpro.net) → download → `python install.py` → Pro `:3000`, Academy `:3001`  
> **Cloud security:** Academy IAM + shared responsibility/compliance; Pro validates SGs, IAM, topology, and config against **CIS, SOC 2, PCI, HIPAA, NIST** with remediation hints.  
> **Feedback:** [YOUR CONTACT] — especially from anyone in cloud, security, or systems courses.

---

## Pre-shoot checklist (~30 min before)

- [ ] `docker compose up` — healthy containers  
- [ ] Demo graph: **“CSE Demo – Three Tier”** (named, stable for months)  
- [ ] Security demo: one intentional misconfiguration ready to fix  
- [ ] Browser zoom 110–125%; clean profile; bookmarks hidden  
- [ ] Pre-logged-in student + instructor sessions (no password on screen)  
- [ ] Script: opening + three transitions only; demos from muscle memory  
- [ ] End card asset: logo, URLs, QR (editor adds at publish)  
- [ ] Optional: 30 sec vertical teaser (hook + “link in department email”)  
- [ ] Fill in: `[NAME]`, `[ROLE]`, `[YOUR CONTACT]` everywhere above  

---

## Editor guide: keep vs cut

### Keep

- Opening + closing face (brief)  
- Validation findings on canvas  
- One fix + one export *or* import moment  
- Security: SG glance, IAM glance, compliance filter, one fix  
- Academy canvas lab + 2 practice questions  
- Instructor dashboard (real class name)  
- Try-it steps card  

### Cut

- API keys, MFA, Docker logs, loading spinners  
- Typing, mis-clicks, “let me try again”  
- Full rule/module catalog scroll  
- Pricing / institutional license pitch (unless asked—prefer open beta story)  
- Roadmap features not yet shipped (verify at publish: LTI, full practice engine, etc.)  

---

## General Q&A prep

| Question | Direction |
|----------|-----------|
| vs Lucidchart / Draw.io | Executable: rules, Terraform, cost—not static diagrams |
| vs AWS Skill Builder | Complements console; **architecture + IaC + compliance** |
| FERPA / data | Self-hosted; designs stay on your infra |
| TA workload | Validation automates first pass; instructor reviews submissions |
| Azure/GCP | Tracks exist; AWS deepest today |
| Cost to department | Open beta + self-host; institutional licensing on roadmap |
| Cloud save | Not yet—local JSON save/load works |

---

## Product facts (don't oversell—verify at publish)

| Topic | Reference |
|-------|-----------|
| Validation scale | 500+ total (153 AWS, 164 Azure, 163 GCP, 30 on-prem) |
| AWS components | 130+ |
| Academy AWS | 25+ modules; CP through cert tracks with account |
| Compliance | CIS 3.0, SOC 2, PCI v4, HIPAA, NIST CSF 2.0 |
| Discovery | 30 AWS service types; creds local via boto3 |
| CLI tests | 441 tests in archon-cli (mention only if CI segment included) |
| Access | `ARCHON_OPEN_ACCESS=true` default in Docker; see `README.md` |

---

## 30 sec FAQ slide (optional end card)

| Q | A |
|---|---|
| Self-hosted? | Yes—Docker on your machine |
| Free to try? | Yes—open beta; free account unlocks full features |
| Need AWS account? | For discovery/FinOps live; not for first Academy modules / basic canvas |
| Offline? | Basic Pro canvas works without account |

---

## Placeholders to fill before filming

| Field | Your value |
|-------|------------|
| Name | |
| Role / affiliation | |
| Contact email / office hours | |
| Course names to name-drop (optional) | |
| Video link (when live) | |

---

*Last updated for CSE department promo planning. Product details sourced from `README.md`, `GETTING_STARTED.md`, `GITOPS_GUIDE.md`, and `portal/src/content/siteContent.js`.*
