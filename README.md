# Archon

Multi-cloud infrastructure platform for designing, validating, discovering, and generating Terraform-ready architectures. Archon combines a visual canvas designer, a compliance-aware validation engine, a live AWS discovery tool, FinOps analysis, and a standalone CLI — all backed by an AI generation layer that supports every major LLM provider.

**Version:** 1.0.0 &nbsp;|&nbsp; **License:** Apache 2.0 + Commons Clause &nbsp;|&nbsp; **[archonpro.net](https://archonpro.net)** — download, guides, free account portal

---

## Access model (open beta)

Archon is **free to use while we grow the community**. Commerce (licenses, Stripe, pricing pages) is parked — not removed from the codebase, but not required to use the product.

| Context | What you get |
|---|---|
| **Self-hosted, no account** | Full canvas, basic IaC generation, static cost estimates, save/load JSON, templates. Works offline. |
| **Free account (sign in)** | Everything above **plus** validation, FinOps, discovery, Terraform import/plan, live pricing, GitOps, full Academy (all cert tracks, practice tests, AI tutor), instructor dashboard, and teaching assistant. |
| **Academy instructor** | Self-serve instructor role. Optional institution name or org code for usage tracking — no seats, keys, or billing. |

Set `ARCHON_OPEN_ACCESS=true` in `.env` (default in `docker-compose.yml`). Legacy alias: `DEV_UNLOCK_ALL=true`.

**Portal** ([localhost:3002](http://localhost:3002)) — create an account, manage MFA, and (for admins) view institutional usage. No checkout or pricing pages.

**Not yet available:** cloud save to your account (hidden in the UI until shipped).

---

## Two products, one backend

| | Archon Professional | Archon Academy |
|---|---|---|
| **What it is** | Cloud infrastructure design and validation studio | Guided cloud learning platform |
| **Default port** | `3000` | `3001` |
| **Backend** | Shared | Shared |

Both products run from the same `docker compose up`. The shared backend handles AI generation, cost estimation, security validation, FinOps analysis, and Terraform operations for both.

> **Demo:** Record a 30s workflow GIF using [`docs/launch/DEMO_GIF.md`](docs/launch/DEMO_GIF.md), then embed at `docs/launch/demo.gif`.

---

## Quickstart — one-click installer (recommended)

```bash
git clone https://github.com/Sking-4242/archonv1.git
cd archonv1
python install.py
```

The installer GUI sets your ports, builds all containers, and gives you **Open Professional** and **Open Academy** launch buttons when done.

## Quickstart — manual

```bash
git clone https://github.com/Sking-4242/archonv1.git
cd archonv1
docker compose up --build -d
docker compose exec backend python seed.py
```

- Professional: [http://localhost:3000](http://localhost:3000)
- Academy: [http://localhost:3001](http://localhost:3001)
- Portal (download + account): [http://localhost:3002](http://localhost:3002)

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop) with Compose plugin
- [Python 3.11+](https://www.python.org/downloads/) — for the one-click installer only

---

## Archon Professional

### Canvas

Design cloud infrastructure visually across four providers. Drag components from a searchable sidebar onto the canvas, connect them with typed edges, configure security and IAM, then generate production-ready Terraform.

- Drag-and-drop components with VPC → Subnet → Resource nesting
- 6 edge categories: **Data Flow**, **Network**, **Dependency**, **Streaming**, **Batch**, **Event**
- Undo/redo (Ctrl+Z / Ctrl+Y), copy/paste, rubber-band multi-select
- Inline label editing, note annotations, canvas PNG export
- Keyboard shortcuts: `H` grab · `V` select · `Space` fit · `F` full zoom · `?` help
- Architecture library: save named architectures with thumbnail previews to localStorage
- 60 templates across all 4 providers (15 per provider) — load from the landing page or Templates menu

### Supported providers

| Provider | Components | Validation rules | Terraform target |
|---|---|---|---|
| **AWS** | 130+ services — compute, storage, database, networking, security, AI/ML, analytics, DevOps | 153 rules | `hashicorp/aws` |
| **Azure** | 68 services — AKS, Functions, Cosmos DB, Service Bus, Key Vault, Azure OpenAI | 164 rules | `hashicorp/azurerm` |
| **GCP** | 61 services — GKE, Cloud Run, BigQuery, Pub/Sub, Vertex AI | 163 rules | `hashicorp/google` |
| **On-Premises** | 45 types — vSphere VMs, bare metal, NAS, load balancers, firewalls | 30 rules | `hashicorp/vsphere` + `null_resource` |

### Validation — 500+ rules

The validation engine checks your architecture live as you build. Findings appear highlighted on the canvas and in the Validate tab, grouped by severity and then by component. Every finding includes a **suggestion** — a specific, actionable Terraform fix rather than just a problem description.

**Fix this** — config-based findings have a one-click **Fix** button that shows a confirmation with the exact property change and applies it directly to the component config without leaving the Validate tab. Clicking any finding also scrolls and highlights the relevant field in the Component Panel.

#### AWS rules (153)

**Config-based (88)** — RDS/Aurora encryption, backup retention, publicly accessible, deletion protection · EBS encryption · EC2 IMDSv2 enforcement · Lambda X-Ray tracing, DLQ, ARM64 · DynamoDB PITR · Redshift encryption · S3 SSE, versioning, public access blocking · ALB access logging · WAF on public ALB · ECS Fargate logging · ElastiCache encryption-in-transit · Secrets Manager rotation · KMS key rotation · CloudTrail enabled · VPC flow logs · API Gateway logging · and more

**Topology-based (27)** — databases exposed to internet · compute directly on IGW · missing security groups · missing IAM roles · WAF absent on public ALB · orphaned nodes · ALB with no targets · missing CloudWatch · single-AZ databases · no Secrets Manager path · private compute with no NAT gateway · databases in public subnets · Lambda without DLQ · EC2 previous generation

**SG port inspection (18)** — all-traffic open · database ports (1433, 3306, 5432, 6379, 27017) open to internet · SSH/RDP from `0.0.0.0/0` · telnet · FTP · SMTP · POP3/IMAP · wide ephemeral ranges · HTTP without HTTPS

**IAM rules (6)** — wildcard action policies · overly broad resource scope · missing trust conditions · privilege escalation paths

**FinOps rules (14)** — EBS gp2→gp3 · RDS storage upgrade · S3 Intelligent-Tiering · Lambda ARM64 migration · Lambda memory right-sizing · ECS Fargate Spot · DynamoDB provisioned capacity · Aurora Graviton · ElastiCache previous-gen · CloudWatch log retention · NAT Gateway per-AZ · stale EBS snapshots · RDS Multi-AZ cost review

#### Azure rules (164)

Config, topology, NSG, and IAM checks at AWS parity depth — AKS RBAC, Key Vault purge protection, Azure SQL TDE, storage TLS, and NSG port exposure rules.

#### GCP rules (163)

Config, VPC firewall, and IAM checks — GCS public access prevention, Cloud SQL public IP, GKE private clusters, service account key age, open firewall rules.

#### On-Prem rules (30)

Hybrid topology, redundancy, VPN/Direct Connect patterns, and documentation hygiene for brownfield datacenter designs.

### Compliance standards

Filter validation findings by compliance standard using the standard selector in the Validate tab. Each finding is tagged with all applicable standards.

| Standard | Version |
|---|---|
| CIS AWS Foundations Benchmark | 3.0 |
| SOC 2 Type II | 2017 TSC |
| PCI DSS | v4.0 |
| HIPAA Security Rule | 2013 |
| NIST CSF | 2.0 |

### Cost estimation

Per-component monthly cost estimates with region selection. Attempts live pricing first (AWS Price List API, Azure Retail Prices API, GCP Cloud Billing API) and falls back to bundled static estimates when live data is unavailable.

**Usage-based model** — both AWS and Azure support a usage model alongside the base instance cost. Expand the usage inputs for any component in the EstimatePanel to enter actual consumption figures (requests, GB stored, hours/month, tokens, etc.). The cost projection updates in real time and shows a 12-month forecast chart. A **CSV import** lets you calibrate the model from actual billing data.

- **AWS**: 30+ usage-billed service types (EC2, Lambda, S3, RDS, DynamoDB, CloudFront, API Gateway, Bedrock, SageMaker, and more)
- **Azure**: 30 usage-billed service types (VM, Functions, App Service, AKS, Blob Storage, SQL Database, PostgreSQL, CosmosDB, Redis, Azure OpenAI, Log Analytics, and more)
- **LIVE badge** — shown when real-time pricing data is returned
- **Static fallback** — amber banner shown when live pricing is unavailable

### FinOps live analysis (Professional)

Compare modeled estimates to Cost Explorer actuals, fetch CloudWatch utilization, and get ranked savings recommendations with Terraform hints. Upload billing or utilization CSV, or enable live AWS APIs on the backend. Select recommendations and generate combined HCL snippets.

### Terraform

- **Export** — multi-file Terraform HCL as a downloadable ZIP, split by resource type with tabs for each file
- **Import .tf** — upload one or more `.tf` files; Archon parses HCL and renders the architecture with VPC/subnet nesting, inferred dependencies, data sources, module flattening, and `count`/`for_each` labels
- **Import plan** — upload a `terraform show -json` plan JSON; the Validate tab switches to Plan Mode showing color-coded change actions (create/update/delete/replace/no-op) for every resource, with a change-count summary. Click **Clear Plan** in the Validate tab to return to normal validation mode.

### Discovery

Scan your live AWS account and bring discovered infrastructure directly into the canvas.

1. Install the CLI: `pip install -e ./archon-cli`
2. Run: `archon-cli discover --region us-east-1 --format archon -o report.json`
3. Click **CLI Report** in the nav bar and import the file
4. The **Discover tab** opens with all resources grouped by AWS service — search, filter, and place them onto the canvas individually or in bulk

Covers 30 AWS service types across compute, network, storage, database, security, integration, and monitoring. Credentials are resolved locally via boto3. **Nothing leaves your machine.**

See `DISCOVERY_GUIDE.md` for the full walkthrough, IAM permissions, and troubleshooting.

### AI features

- **Generate** — produce Terraform HCL from the current canvas using any supported LLM. AWS generation uses a 70-entry resource hint map (primary resource, companion resources, required variables, expected outputs) to produce deterministic, complete HCL. Azure generation uses a 68-entry hint map with companion rules (AKS requires RBAC, Functions requires Storage Account, Key Vault requires purge protection, etc.).
- **Architecture review** — AI security and best-practice analysis runs on every Generate
- **HCL validation** — syntax check followed by AI security review of the generated HCL
- **AI chat panel** — persistent conversation anchored to the open architecture, with two modes selectable from the panel header:
  - **Chat mode** — ask questions about the current canvas; the AI has full visibility of all nodes, edges, security groups, and IAM roles
  - **Build mode** — describe what to add in plain English; the AI returns a structured plan (nodes, edges, connections) and an **Apply** button that merges it onto the canvas. The design prompt is canvas-aware: it knows what already exists and will only generate new components, referencing existing node IDs when drawing connections.
  - Chat history is persisted per architecture per mode (up to 200 messages) and survives page reloads

---

## archon-cli

A standalone CLI for Terraform plan validation, cost analysis, and live AWS discovery. Works independently of the UI — plug it into CI/CD pipelines or use it locally.

```bash
pip install -e ./archon-cli
```

### Commands

```bash
# Validate a terraform plan (500+ rules — exits 1 on critical findings)
archon-cli validate plan.json

# Filter findings by compliance standard
archon-cli validate plan.json --standard PCI
archon-cli validate plan.json --standard CIS

# Calculate monthly cost delta for a plan
archon-cli cost plan.json

# Discover live AWS resources in a region
archon-cli discover --region us-east-1
archon-cli discover --region us-east-1 --profile production
```

### Output formats

All commands support `--format table` (default), `--format json`, and `--format archon` (for Archon Pro import).

```bash
# Generate Archon Pro import files
archon-cli validate plan.json --format archon -o findings.json
archon-cli cost     plan.json --format archon -o cost.json
archon-cli discover -r us-east-1 --format archon -o discovery.json
```

### CI/CD integration

```bash
# Blocks the pipeline on critical findings
archon-cli validate plan.json

# GitHub Actions annotations (inline PR comments)
archon-cli validate plan.json --format github

# Store artifacts for review in Archon Pro
archon-cli validate plan.json --format archon -o findings.json
archon-cli cost     plan.json --format archon -o cost.json
```

See `GITOPS_GUIDE.md` for ready-to-paste GitHub Actions workflows and a pre-commit hook script.

Deploy the marketing site and portal at **archonpro.net** using [`docs/DEPLOY_ARCHONPRO.md`](docs/DEPLOY_ARCHONPRO.md).

---

## Archon Academy

Guided cloud architecture curriculum sharing the same backend as Professional. Structured learning paths, interactive challenges, AI tutor feedback, and progress tracking — designed for individuals learning cloud infrastructure or teams onboarding new engineers.

Open Academy at [http://localhost:3001](http://localhost:3001) after the stack is running.

### Curriculum

Academy delivers structured, module-based cloud education organized into learning paths:

| Path | Modules | Coverage |
|---|---|---|
| **AWS Foundations** | 6+ modules | Cloud fundamentals, global infrastructure, pricing, core services (EC2, S3, VPC, IAM), databases, serverless |
| **Azure Foundations** | Coming soon | Azure fundamentals, compute, storage, networking, security |
| **Architecture Patterns** | Coming soon | Well-Architected Framework, multi-tier apps, microservices, disaster recovery |

Each module contains:
- **Lessons** — structured reading with diagrams and examples
- **Lab exercises** — hands-on tasks using the Archon canvas and real infrastructure concepts
- **Assignments** — instructor-reviewed canvas submissions
- **Practice tests** — cert-style questions with study and timed modes
- **Progress tracking** — completion state and scores persisted per student account

### Default accounts

After `docker compose exec backend python seed.py`:

| Role | Email | Password |
|---|---|---|
| **Master admin** | `archon` or `archon@archonpro.net` | `archon` |
| **Instructor** | `admin@archon.academy` | `pass123` |
| **Student** | `student@archon.academy` | `pass123` |

> Change these passwords before sharing with real students.

### Student features

- **Modules & lessons** — structured cert prep (AWS Foundations live; more paths coming)
- **Labs & assignments** — canvas exercises with instructor review
- **Practice tests** — study and timed modes; domain breakdown and study recommendations on submit
- **AI tutor** — hint-first guidance tied to lesson context (requires sign-in)

### Instructor features

Log in and switch to **Instructor** mode from the Academy nav.

- **Classes** — create cohorts, share join codes, bulk-enroll students, assign modules and labs
- **Gradebook & analytics** — submission review, progress, at-risk indicators
- **Teaching assistant** — AI copilot for lesson drafts, lab ideas, announcements, and submission feedback
- **Institution tracking (optional)** — set a school name, create a shared org code, or join a colleague’s org. Used for admin analytics only — no billing.

Instructor home: [http://localhost:3001/instructor](http://localhost:3001/instructor)

---

## LLM providers

| Provider | Env var | Default model |
|---|---|---|
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | `claude-sonnet-4-6` |
| OpenAI | `OPENAI_API_KEY` | `gpt-4.1` |
| Google Gemini | `GOOGLE_API_KEY` | `gemini-2.5-flash` |
| xAI (Grok) | `XAI_API_KEY` | `grok-3` |
| Ollama (local) | *(none)* | configurable via `OLLAMA_MODEL` |

Set `LLM_PROVIDER` in `.env` to: `anthropic`, `openai`, `gemini`, `xai`, or `ollama`.
Switch provider, model, and API key at runtime from **Settings** in the nav bar — no restart needed.

---

## Project layout

```
archonv1/
├── frontend/                  Archon Professional (React + React Flow)
│   └── src/
│       ├── components/
│       │   ├── canvas/        ReactFlow canvas, node types, edge types, sidebar
│       │   ├── panels/        ComponentPanel, SecurityTab, IAMTab, ValidateTab,
│       │   │                  DiscoverTab, GeneratePanel, EstimatePanel, ChatPanel
│       │   └── ui/            RuleBuilder, PolicyBuilder, SGSelector,
│       │                      StandardSelector, ImportCLIReportModal,
│       │                      ImportPlanModal, ImportTfModal, shared UI
│       ├── pages/             LandingPage
│       ├── store/             graphStore, securityStore, iamStore, validationStore,
│       │                      discoveryStore, settingsStore, archiveStore,
│       │                      providerStore, planStore, chatStore, usageStore
│       └── utils/             componentConfig, azureComponentConfig,
│                              gcpComponentConfig, onpremComponentConfig,
│                              palettes, ruleMatrix, azureRuleMatrix,
│                              usageSchema, templates, serializer, findingFixes
│
├── academy/                   Archon Academy (React)
│   └── src/
│       ├── components/        Course viewer, lesson renderer, challenge UI,
│       │                      progress tracker, instructor dashboard
│       └── content/           Markdown lesson files organized by provider/module
│
├── backend/                   Shared FastAPI backend
│   └── app/
│       ├── routers/           generate, estimate, validate, export, import_tf,
│       │                      import_plan, design
│       └── services/
│           ├── llm/           Abstract LLMProvider + 5 implementations
│           ├── prompt_builder.py        AWS resource map (70 entries)
│           ├── azure_prompt_builder.py  Azure resource map (68 entries)
│           ├── gcp_prompt_builder.py
│           ├── onprem_prompt_builder.py
│           ├── pricing.py               AWS usage-based pricing (30+ types)
│           ├── azure_pricing.py         Azure usage-based pricing (30 types)
│           ├── gcp_pricing.py
│           ├── live_pricing.py          Live API pricing with TTL cache
│           ├── tf_importer.py
│           └── plan_importer.py
│
├── archon-cli/                Standalone Python CLI
│   └── archon_cli/
│       ├── validate.py        Validation engine (153 AWS + 164 Azure + 163 GCP + 30 On-Prem)
│       ├── gcp_validate.py    GCP rules
│       ├── azure_validate.py  Azure rules
│       ├── onprem_validate.py On-Prem rules
│       ├── cost.py            TF plan cost delta calculator
│       ├── discover.py        Live AWS discovery (30 service types)
│       ├── formatters.py      table / json / archon / github output formats
│       ├── compliance.py      CIS / SOC2 / PCI / HIPAA / NIST mappings
│       └── main.py            CLI entrypoint (441 tests)
│
├── portal/                    archonpro.net marketing + account portal (React)
│
├── docs/
│   ├── DEPLOY_ARCHONPRO.md    Production deployment for archonpro.net
│   └── launch/                Demo GIF script, Show HN draft, GitHub polish checklist
│
├── install.py                 One-click setup GUI (tkinter)
├── docker-compose.yml
├── .env.example
├── GETTING_STARTED.md         First-time setup and basic workflow
├── DISCOVERY_GUIDE.md         Full how-to for the discovery tool
├── GITOPS_GUIDE.md            GitHub Actions + pre-commit hook integration
├── ROADMAP.md                 Engineering and product roadmap
└── test-tf/                   Sample Terraform files for import testing
```

---

## Docker commands

```bash
docker compose up --build      # first run or after code changes
docker compose up -d           # start in background
docker compose down            # stop all containers
docker compose logs -f         # tail logs
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `LLM_PROVIDER` | `anthropic` | Active LLM provider |
| `ANTHROPIC_API_KEY` | — | Anthropic API key |
| `OPENAI_API_KEY` | — | OpenAI API key |
| `GOOGLE_API_KEY` | — | Google Gemini API key |
| `XAI_API_KEY` | — | xAI API key |
| `XAI_BASE_URL` | `https://api.x.ai/v1` | xAI base URL |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Ollama endpoint |
| `BACKEND_PORT` | `8000` | FastAPI port |
| `FRONTEND_PORT` | `3000` | Professional frontend port |
| `ACADEMY_PORT` | `3001` | Academy frontend port |
| `PORTAL_PORT` | `3002` | archonpro.net portal port |
| `ARCHON_OPEN_ACCESS` | `true` | Logged-in users get full features (commerce parked) |
| `DEV_UNLOCK_ALL` | `true` | Legacy alias for `ARCHON_OPEN_ACCESS` |
| `VITE_API_URL` | `http://localhost:8000` | Backend URL baked into frontend build |
