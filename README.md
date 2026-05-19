# Archon

AI-assisted cloud architecture design platform.

**Version:** 0.5.0 &nbsp;|&nbsp; **License:** Apache 2.0 + Commons Clause

---

## Two products, one backend

| | Archon Professional | Archon Academy |
|---|---|---|
| **What it is** | Visual cloud architecture studio | Guided cloud learning platform |
| **Default port** | `3000` | `3001` |
| **Backend** | Shared | Shared |

Both products run from the same `docker compose up`. The shared backend handles AI generation, cost estimation, security validation, and Terraform operations for both.

---

## Archon Professional

Design cloud infrastructure visually. Connect components, configure security and IAM, then generate production-ready Terraform HCL with an AI model of your choice.

### Supported providers

| Provider | Components | Terraform target |
|---|---|---|
| **AWS** | 130+ services across compute, storage, database, networking, security, AI/ML, analytics, DevOps | `hashicorp/aws` |
| **Azure** | 60+ services including AKS, Functions, Cosmos DB, Service Bus, Azure AI | `hashicorp/azurerm` |
| **GCP** | 55+ services including GKE, Cloud Run, BigQuery, Pub/Sub, Vertex AI | `hashicorp/google` |
| **On-Premises** | vSphere VMs, bare metal, NAS, load balancers, firewalls | `hashicorp/vsphere` + `null_resource` |

### Canvas

- Drag-and-drop components from a searchable sidebar
- VPC → Subnet → Resource nesting with visual containment
- 6 typed edge categories: **Data Flow**, **Network**, **Dependency**, **Streaming**, **Batch**, **Event**
- Undo/redo (Ctrl+Z / Ctrl+Y), copy/paste, rubber-band multi-select
- Inline label editing on any node
- Note annotations for documentation
- Canvas PNG export
- Keyboard shortcuts: `H` grab · `V` select · `Space` fit · `F` full zoom · `?` help

### AI features

- **Generate** — produce Terraform HCL from the current diagram using any supported LLM
- **AI canvas builder** — describe an architecture in plain English; the AI builds it on the canvas
- **Architecture review** — AI security and best-practice analysis runs automatically on every Generate
- **HCL validation** — syntax check followed by AI security review of the generated HCL
- **AI chat panel** — persistent chat session with full canvas context

### Security validation

37 rules checked live as you build, organized into three categories:

**Config-based (13 rules)** — checks component settings: RDS/Aurora encryption, backup retention, publicly accessible, deletion protection · EBS encryption · Lambda X-Ray tracing · DynamoDB PITR · Redshift encryption · S3 server-side encryption and versioning · EC2 IMDSv2 enforcement

**Topology-based (14 rules)** — checks the graph structure: databases exposed to internet · compute directly on IGW · missing security groups · missing IAM roles · WAF absent on public ALB · orphaned nodes · ALB with no targets · missing CloudWatch · single-AZ databases · compute connecting to RDS/ElastiCache with no Secrets Manager path · private subnet compute with no NAT gateway · databases in public subnets · ALB spanning one AZ · Lambda with no dead-letter queue

**SG port inspection (10 rules)** — checks security group inbound rules for dangerous exposures: all-traffic open · database ports open to internet · SSH/RDP open to internet · telnet · FTP · SMTP · POP3/IMAP · wide ephemeral port ranges · HTTP without HTTPS

Each finding includes a fix suggestion. Acknowledging a warning (telnet, FTP, SMTP, POP3/IMAP, wide port ranges) saves the dismissal with an optional reason to localStorage and collapses it into a separate section.

### Cost estimation

Per-component monthly cost estimates with region selection. Attempts live pricing first (AWS Pricing API, Azure Retail Prices API, GCP Cloud Billing API) and falls back to static estimates. Estimates display a **LIVE** badge when real API data is returned.

### Terraform

- **Export** — generates multi-file Terraform HCL as a downloadable ZIP, split by resource type
- **Import** — upload one or more `.tf` files; Archon parses them and renders the architecture on the canvas with correct VPC/subnet nesting and inferred resource relationships

### Architecture library

Save named architectures with thumbnail previews to the browser's localStorage. The 4-quadrant landing page lets you start fresh, load a template, open a saved architecture, or import a file.

### Templates

5 pre-built starting points: Web Tier, Serverless API, Data Pipeline, Microservices, Multi-Region.

---

## Archon Academy

Guided cloud architecture curriculum. Structured learning paths, interactive challenges, AI tutor feedback, and progress tracking — all sharing the same backend as Professional.

Academy runs on its own React frontend (port `3001` by default) and uses a **PostgreSQL database** for user accounts, progress tracking, and course content. The database starts automatically as a Docker service alongside the backend and frontends — no external database setup is required.

### Academy credentials — what you need to set

There are two Academy-specific values in `.env` that must be filled in before `docker compose up`:

**1. `POSTGRES_PASSWORD`** — the password for the PostgreSQL database user.

This can be any string. It is only used internally between the backend container and the `db` container — it is never exposed to the browser. Pick something strong for any non-local deployment.

```env
POSTGRES_PASSWORD=your_database_password_here
```

**2. `DATABASE_URL`** — the full PostgreSQL connection string. Update this to match whatever you set for `POSTGRES_PASSWORD`:

```env
DATABASE_URL=postgresql://archon:your_database_password_here@db:5432/archon_academy
```

The format is: `postgresql://<POSTGRES_USER>:<POSTGRES_PASSWORD>@db:5432/<POSTGRES_DB>`

The hostname `db` is the Docker Compose service name — leave it as `db` unless you rename the service.

**3. `ACADEMY_SECRET_KEY`** — a secret used to sign JWT session tokens for Academy user accounts. Generate one with:

```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

Paste the output into `.env`:

```env
ACADEMY_SECRET_KEY=a1b2c3d4e5f6...   # 64-character hex string
```

> **Important:** never commit `.env` to version control. The `.gitignore` excludes it by default.

### Full Academy block in `.env`

```env
# Archon Academy
ACADEMY_PORT=3001
VITE_ACADEMY_API_URL=http://localhost:8000

# PostgreSQL — used by Academy for user accounts and progress
POSTGRES_DB=archon_academy
POSTGRES_USER=archon
POSTGRES_PASSWORD=your_password_here
DATABASE_URL=postgresql://archon:your_password_here@db:5432/archon_academy

# JWT secret — generate with: python -c "import secrets; print(secrets.token_hex(32))"
ACADEMY_SECRET_KEY=your_generated_secret_here
```

Once these are set, run `docker compose up --build` and open [http://localhost:3001](http://localhost:3001). The database is created automatically on first boot.

---

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop) with Compose plugin (running)
- [Python 3.11+](https://www.python.org/downloads/) — for the one-click installer only

---

## Quickstart — one-click installer (recommended)

```bash
git clone https://github.com/Sking-4242/Archon.git
cd Archon
python install.py
```

The installer GUI lets you set backend, Professional, and Academy ports, configure the Ollama base URL, builds all containers, and provides **Open Professional** and **Open Academy** launch buttons.

## Quickstart — manual

```bash
git clone https://github.com/Sking-4242/Archon.git
cd Archon
cp .env.example .env          # fill in your API key and ports
docker compose up --build
```

- Professional: [http://localhost:3000](http://localhost:3000)
- Academy: [http://localhost:3001](http://localhost:3001)

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
│       ├── components/        Canvas, panels, nodes, edges, UI components
│       │   ├── canvas/        ReactFlow canvas, node types, edge types, sidebar
│       │   ├── panels/        ComponentPanel, SecurityTab, IAMTab, ValidateTab,
│       │   │                  GeneratePanel, EstimatePanel, AIChat
│       │   └── ui/            RuleBuilder, PolicyBuilder, SGSelector, shared UI
│       ├── pages/             LandingPage
│       ├── store/             Zustand stores (graph, security, IAM, validation,
│       │                      settings, archive, provider)
│       └── utils/             componentConfig, palettes, ruleMatrix, templates,
│                              serializer — for all 4 providers
│
├── academy/                   Archon Academy (React)
│   └── src/
│
├── backend/                   Shared FastAPI backend
│   └── app/
│       ├── models/            Pydantic request/response models
│       ├── routers/           generate, estimate, validate, export, import_tf
│       ├── services/
│       │   ├── llm/           Abstract LLMProvider + Anthropic, OpenAI, Gemini,
│       │   │                  xAI, Ollama implementations
│       │   ├── prompt_builder.py        AWS Terraform prompts
│       │   ├── azure_prompt_builder.py
│       │   ├── gcp_prompt_builder.py
│       │   ├── onprem_prompt_builder.py
│       │   ├── pricing.py               Static fallback pricing
│       │   ├── live_pricing.py          Live pricing dispatcher (TTL cache)
│       │   ├── aws_live_pricing.py      AWS Pricing API (boto3)
│       │   ├── azure_live_pricing.py    Azure Retail Prices API
│       │   ├── gcp_live_pricing.py      GCP Cloud Billing API
│       │   ├── tf_importer.py           .tf → canvas JSON parser
│       │   └── pdf_export.py            Architecture report PDF
│       ├── tests/
│       └── utils/             HCL validators
│
├── install.py                 One-click setup GUI (tkinter)
├── docker-compose.yml
├── .env.example
├── GETTING_STARTED.md
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
