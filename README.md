# Archon

Multi-cloud infrastructure platform for designing, validating, discovering, and generating Terraform-ready architectures. Archon combines a visual canvas designer, a compliance-aware validation engine, a live AWS discovery tool, and a standalone CLI — all backed by an AI generation layer that supports every major LLM provider.

**Version:** 0.5.0 &nbsp;|&nbsp; **License:** Apache 2.0 + Commons Clause

---

## Two products, one backend

| | Archon Professional | Archon Academy |
|---|---|---|
| **What it is** | Cloud infrastructure design and validation studio | Guided cloud learning platform |
| **Default port** | `3000` | `3001` |
| **Backend** | Shared | Shared |

Both products run from the same `docker compose up`. The shared backend handles AI generation, cost estimation, security validation, and Terraform operations for both.

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

| Provider | Components | Terraform target |
|---|---|---|
| **AWS** | 130+ services — compute, storage, database, networking, security, AI/ML, analytics, DevOps | `hashicorp/aws` |
| **Azure** | 60+ services — AKS, Functions, Cosmos DB, Service Bus, Azure AI | `hashicorp/azurerm` |
| **GCP** | 55+ services — GKE, Cloud Run, BigQuery, Pub/Sub, Vertex AI | `hashicorp/google` |
| **On-Premises** | vSphere VMs, bare metal, NAS, load balancers, firewalls | `hashicorp/vsphere` + `null_resource` |

### Validation — 49 rules

The validation engine checks your architecture live as you build. Findings appear highlighted on the canvas and in the Validate tab.

**Config-based (13 rules)** — checks component settings: RDS/Aurora encryption, backup retention, publicly accessible, deletion protection · EBS encryption · EC2 IMDSv2 enforcement · Lambda X-Ray tracing · DynamoDB PITR · Redshift encryption · S3 SSE and versioning · ALB access logging · S3 block public access

**Topology-based (16 rules)** — checks the graph structure: databases exposed to internet · compute directly on IGW · missing security groups · missing IAM roles · WAF absent on public ALB · orphaned nodes · ALB with no targets · missing CloudWatch · single-AZ databases · no Secrets Manager path · private compute with no NAT gateway · databases in public subnets · ALB spanning one AZ · Lambda with no dead-letter queue · EC2 previous generation type

**SG port inspection (10 rules)** — checks security group inbound rules: all-traffic open · database ports open to internet · SSH/RDP from 0.0.0.0/0 · telnet · FTP · SMTP · POP3/IMAP · wide ephemeral ranges · HTTP without HTTPS

**Compliance-specific (4 rules)** — additional checks required by standards: CloudTrail not enabled · VPC flow logs disabled · no customer-managed KMS key on data stores · WAF required on public ALB

### Compliance standards

Filter validation findings by compliance standard using the standard selector pills in the Validate tab. Each finding is tagged with all applicable standards.

| Standard | Version |
|---|---|
| CIS AWS Foundations Benchmark | 3.0 |
| SOC 2 Type II | 2017 TSC |
| PCI DSS | v4.0 |
| HIPAA Security Rule | 2013 |
| NIST CSF | 2.0 |

### Cost estimation

Per-component monthly cost estimates with region selection. Attempts live pricing first (AWS Price List API, Azure Retail Prices API, GCP Cloud Billing API) and falls back to bundled static estimates. Shows a **LIVE** badge when real-time data is returned and an amber warning when live pricing falls back to static.

### Terraform

- **Export** — multi-file Terraform HCL as a downloadable ZIP, split by resource type
- **Import .tf** — upload one or more `.tf` files; Archon parses HCL and renders the architecture with VPC/subnet nesting, inferred dependencies, data sources, module flattening, and `count`/`for_each` labels
- **Import plan** — upload a `terraform show -json` plan JSON; Archon renders the plan with color-coded change-action badges (create/update/delete/replace) and surfaces plan-specific validation findings

### Discovery

Scan your live AWS account and bring discovered infrastructure directly into the canvas.

1. Install the CLI: `pip install -e ./archon-cli`
2. Run: `archon-cli discover --region us-east-1 --format archon -o report.json`
3. Click **CLI Report** in the nav bar and import the file
4. The **Discover tab** opens with all resources grouped by AWS service — search, filter, and place them onto the canvas individually or in bulk

Covers 30 AWS service types across compute, network, storage, database, security, integration, and monitoring. Credentials are resolved locally via boto3. **Nothing leaves your machine.**

See `DISCOVERY_GUIDE.md` for the full walkthrough, IAM permissions, and troubleshooting.

### AI features

- **Generate** — produce Terraform HCL from the current canvas using any supported LLM
- **AI canvas builder** — describe an architecture in plain English; the AI builds it on the canvas
- **Architecture review** — AI security and best-practice analysis runs on every Generate
- **HCL validation** — syntax check followed by AI security review of the generated HCL
- **AI chat panel** — persistent chat session with full canvas context

---

## archon-cli

A standalone CLI for Terraform plan validation, cost analysis, and live AWS discovery. Works independently of the UI — plug it into CI/CD pipelines or use it locally.

```bash
pip install -e ./archon-cli
```

### Commands

```bash
# Validate a terraform plan (49 rules — exits 1 on critical findings)
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

# Store artifacts for review in Archon Pro
archon-cli validate plan.json --format archon -o findings.json
archon-cli cost     plan.json --format archon -o cost.json
```

---

## Archon Academy

Guided cloud architecture curriculum sharing the same backend as Professional. Structured learning paths, interactive challenges, AI tutor feedback, and progress tracking.

Open Academy at [http://localhost:3001](http://localhost:3001) after the stack is running.

### Default accounts

| Role | Email | Password |
|---|---|---|
| **Instructor** | `admin@archon.academy` | `pass123` |
| **Student** | `student@archon.academy` | `pass123` |

> Change these passwords before sharing with real students.

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
│       │   │                  DiscoverTab, GeneratePanel, EstimatePanel, AIChat
│       │   └── ui/            RuleBuilder, PolicyBuilder, SGSelector,
│       │                      StandardSelector, ImportCLIReportModal, shared UI
│       ├── pages/             LandingPage
│       ├── store/             graphStore, securityStore, iamStore, validationStore,
│       │                      discoveryStore, settingsStore, archiveStore,
│       │                      providerStore, planStore
│       └── utils/             componentConfig, palettes, ruleMatrix, templates,
│                              serializer — for all 4 providers
│
├── academy/                   Archon Academy (React)
│
├── backend/                   Shared FastAPI backend
│   └── app/
│       ├── routers/           generate, estimate, validate, export, import_tf,
│       │                      import_plan
│       └── services/
│           ├── llm/           Abstract LLMProvider + 5 implementations
│           ├── prompt_builder.py / azure_ / gcp_ / onprem_
│           ├── pricing.py / live_pricing.py / aws_ / azure_ / gcp_
│           ├── tf_importer.py
│           └── plan_importer.py
│
├── archon-cli/                Standalone Python CLI
│   └── archon_cli/
│       ├── validate.py        49-rule validation engine
│       ├── cost.py            TF plan cost delta calculator
│       ├── discover.py        Live AWS discovery (30 service types)
│       ├── formatters.py      table / json / archon output formats
│       ├── compliance.py      CIS / SOC2 / PCI / HIPAA / NIST mappings
│       └── main.py            CLI entrypoint
│
├── install.py                 One-click setup GUI (tkinter)
├── docker-compose.yml
├── .env.example
├── DISCOVERY_GUIDE.md         Full how-to for the discovery tool
├── ROADMAP.md
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
| `VITE_API_URL` | `http://localhost:8000` | Backend URL baked into frontend build |
