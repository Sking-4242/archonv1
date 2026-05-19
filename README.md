# Archon

Visual cloud infrastructure design and Terraform generation.

**Version:** 0.1.0 &nbsp;|&nbsp; **License:** Apache 2.0 + Commons Clause

---

## What it does

Drag cloud components onto a canvas, draw connections, configure security groups and IAM roles, then click **Generate** to produce production-ready Terraform HCL — written by the LLM provider of your choice.

Archon supports four infrastructure providers:

| Provider | Components | Terraform target |
|---|---|---|
| **AWS** | EC2, RDS, S3, Lambda, VPC, EKS, and 40+ more | `hashicorp/aws` |
| **Azure** | VM, AKS, SQL, Blob Storage, VNet, and 30+ more | `hashicorp/azurerm` |
| **GCP** | Compute Engine, GKE, Cloud SQL, GCS, and 30+ more | `hashicorp/google` |
| **On-Premises** | vSphere VMs, bare metal, NAS, load balancers, and more | `hashicorp/vsphere` + `null_resource` |

## Features

- **Visual canvas** — drag-and-drop components, connect them with typed edges (data flow, network, dependency, streaming, batch, event)
- **Multi-provider** — switch between AWS, Azure, GCP, and On-Prem; each provider has its own component palette and Terraform output
- **AI generation** — generate Terraform HCL from your diagram using any supported LLM provider
- **AI canvas builder** — describe an architecture in plain English and let the AI build it for you
- **Architecture review** — AI-powered security and best-practice findings on every generate
- **HCL validation** — syntax check and AI HCL security review before you deploy
- **Cost estimation** — per-component monthly cost estimates with regional pricing
- **PDF export** — full architecture report including review findings, HCL listing, and cost summary
- **Architecture library** — save and reload architectures with SVG thumbnail previews
- **Templates** — 5 pre-built architecture templates to start from
- **Security groups & IAM** — visual rule builder and policy editor, wired directly to components

## Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop) (running)
- [Python 3.11+](https://www.python.org/downloads/) — for the one-click installer only

## Quickstart — one-click installer (recommended)

```bash
git clone https://github.com/Sking-4242/Archon.git
cd Archon
python install.py
```

The installer opens a GUI, lets you pick your LLM provider and enter your API key, writes `.env`, builds the Docker containers, and launches the app.

See [GETTING_STARTED.md](GETTING_STARTED.md) for a full walkthrough.

## Quickstart — manual

```bash
git clone https://github.com/Sking-4242/Archon.git
cd Archon
cp .env.example .env          # edit .env with your provider and API key
docker compose up --build
```

Open [http://localhost:3000](http://localhost:3000)

## LLM providers

| Provider | Env var | Notes |
|---|---|---|
| Anthropic (Claude) | `ANTHROPIC_API_KEY` | [console.anthropic.com](https://console.anthropic.com) |
| OpenAI (GPT-4o) | `OPENAI_API_KEY` | [platform.openai.com](https://platform.openai.com) |
| Google Gemini | `GOOGLE_API_KEY` | [aistudio.google.com](https://aistudio.google.com) |
| xAI (Grok) | `XAI_API_KEY` | [console.x.ai](https://console.x.ai) |
| Ollama (local) | *(none)* | Run Ollama locally; set `OLLAMA_BASE_URL` in `.env` |

Set `LLM_PROVIDER` in `.env` to one of: `anthropic`, `openai`, `gemini`, `xai`, `ollama`

## Project layout

```
Archon/
├── frontend/          React + React Flow canvas
│   └── src/
│       ├── components/    Canvas, panels, nodes, edges, UI
│       ├── pages/         LandingPage
│       ├── store/         Zustand state (graph, settings, archive)
│       └── utils/         Component configs, palettes, templates
├── backend/           FastAPI + LLM abstraction layer
│   └── app/
│       ├── models/        Pydantic request/response models
│       ├── routers/       API endpoints (generate, estimate, validate, export)
│       ├── services/      Prompt builders, pricing, PDF export, LLM providers
│       └── utils/         HCL validators
├── install.py         One-click setup GUI (tkinter)
├── docker-compose.yml
├── .env.example
└── GETTING_STARTED.md
```

## Docker commands

```bash
docker compose up --build      # first run or after code changes
docker compose up -d           # start in background
docker compose down            # stop all containers
docker compose logs -f         # tail logs
```

## Changing providers at runtime

Click **Settings** in the top nav bar to switch LLM provider, API key, or model without restarting.
