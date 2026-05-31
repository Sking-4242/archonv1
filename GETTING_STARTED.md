# Getting Started with Archon

Archon is a multi-cloud infrastructure IDE. Drag and drop AWS, Azure, GCP, or on-prem components onto a canvas, define security groups and IAM roles, validate your architecture against 500+ rules, and generate production-ready Terraform with one click.

Archon Academy adds structured cert prep, practice tests, and instructor tools on the same stack.

---

## Access: self-hosted vs account

| Mode | Professional | Academy |
|---|---|---|
| **No account (default self-host)** | Canvas, basic IaC, static estimates, JSON save/load, templates | AWS Cloud Practitioner modules; one practice test |
| **Free account (sign in)** | + validation, FinOps, discovery, Terraform import/plan, live pricing, GitOps | All cert tracks, full practice tests, AI tutor, instructor tools |

Create an account at the portal ([http://localhost:3002/login](http://localhost:3002/login)) or from **Account** in Professional / Academy. With `ARCHON_OPEN_ACCESS=true` (default in Docker), signing in unlocks everything — no license key.

Self-hosted Professional **works offline without an account** for the basic tier. Cloud save to your account is not available yet.

---

## Prerequisites

- **Python 3.11+** — install from [python.org](https://python.org) (not the Microsoft Store version)
- **Docker Desktop** — install from [docker.com](https://docker.com/products/docker-desktop) and make sure it is running before you launch the installer

---

## Installation

1. Download or clone the Archon repository
2. Open a terminal in the project folder
3. Run the installer:

```bash
python install.py
```

The setup window will open. Fill in your details and click **Install & Launch**.

### What the installer does

- Checks that Docker is installed and running
- Asks for your LLM provider and API key
- Writes a `.env` configuration file
- Builds and starts the Docker containers
- Gives you a link to open Archon in your browser

### Supported providers

| Provider | Requires API key | Where to get one |
|---|---|---|
| Anthropic (Claude) | Yes | console.anthropic.com |
| OpenAI (GPT-4o) | Yes | platform.openai.com |
| Google Gemini | Yes | aistudio.google.com |
| xAI (Grok) | Yes | console.x.ai |
| Ollama (local) | No | ollama.com — run locally |

If you choose **Ollama**, make sure Ollama is running locally before generating. No API key is needed.

---

## Basic workflow

### 1. Build your architecture

Select your cloud provider from the provider dropdown (AWS, Azure, GCP, or On-Prem), then drag components from the left sidebar onto the canvas. Components are grouped by category — networking, compute, storage, database, and more.

Click any component to open the **Component** tab in the right sidebar, where you can set the label and resource-specific config (instance type, engine, runtime, etc.).

Connect two components by dragging from one handle to another. Choose the connection type:
- **Network** — traffic flows between resources
- **Data Flow** — one resource reads or writes to another
- **Dependency** — one resource depends on another existing first

### 2. Define security groups

Open the **Security** tab in the right sidebar.

Click **New Security Group**, give it a name, and add inbound and outbound rules. The **Auto-suggest** section shows recommended rules based on the connections you drew — click **Apply** to add them automatically.

Assign security groups to components using the checkboxes in the **Component** tab.

### 3. Define IAM roles

Open the **IAM** tab. Click **New Role**, give it a name, and add policy statements (effect, actions, resources). Assign roles to components from the **Component** tab. Components that support IAM but have no role assigned are flagged with a warning.

### 4. Validate your architecture

Click **Validate** in the top navigation bar. The Validate tab opens in the right sidebar with findings grouped by component.

- **500+ rules** across AWS, Azure, GCP, and On-Prem when signed in (153 AWS alone — config, topology, SG, IAM, FinOps)
- Each finding shows severity (CRITICAL / WARNING / INFO), a description, and a specific suggestion for fixing it
- Findings are mapped to compliance standards (SOC2, PCI-DSS, HIPAA, CIS, NIST) — use the standard filter to scope the view
- Click a finding to jump to the affected component on the canvas
- Export findings as JSON or a plain-text checklist using the Export button

### 5. Generate Terraform

Click **Generate** in the top navigation bar. The output panel opens at the bottom. Click **Generate** inside the panel to call your LLM provider — Terraform HCL will appear with syntax highlighting. Click **Download .tf** to save it.

---

## Saving and loading

- **Save** — exports your full architecture (canvas, security groups, IAM roles) as a `.json` file
- **Open** — loads a previously saved `.json` file and restores the entire canvas
- **New** — clears the canvas and starts fresh (prompts for confirmation if you have work on the canvas)

Your canvas also saves automatically to browser local storage, so closing and reopening the tab restores your last session.

Cloud save to your account is planned but not shipped yet — use JSON export for backups today.

---

## Changing providers

Click **Settings** in the top navigation bar to switch your LLM provider, enter a different API key, or change the model. Settings apply immediately to the next Generate call.

---

## Academy

Archon Academy is at [http://localhost:3001](http://localhost:3001). Sign in for full access to cert tracks, practice tests, and instructor tools.

### Demo accounts

Run `docker compose exec backend python seed.py`, then sign in with:

| Role | Email | Password |
|---|---|---|
| Instructor | `admin@archon.academy` | `pass123` |
| Student | `student@archon.academy` | `pass123` |

### How it works

- **Modules** — grouped by provider and topic (AWS Foundations is the primary live path)
- **Lessons** — reading content with concept explanations
- **Labs & assignments** — canvas exercises; instructors review and grade submissions
- **Practice tests** — timed (live) or untimed (study) modes; scored with domain breakdown
- **AI tutor** — contextual hints on labs (sign-in required)
- **Progress** — tracked per account in the database

### Students

Browse modules, complete lessons, submit labs, take practice tests, and join a class with a **class code** from your instructor.

### Instructors

Switch to instructor mode from the Academy nav, then:

1. **Optional:** set your institution name or create/join an org code (Instructor home → *Your institution*) — helps Archon understand classroom usage; no billing
2. **Create a class** — get a join code for students
3. **Assign modules and labs** from your content library
4. **Review submissions** in the gradebook
5. **Teaching assistant** — AI help for lesson drafts, lab ideas, at-risk summaries, and feedback (`/instructor/assistant`)

Instructor home: [http://localhost:3001/instructor](http://localhost:3001/instructor)

### AWS Foundations curriculum (sample modules)

| Module | Topics |
|---|---|
| VPC Fundamentals | Subnets, route tables, internet gateways, NAT |
| Compute Basics | EC2 instance types, AMIs, user data |
| Storage | S3 buckets, versioning, lifecycle, tiers |
| Databases | RDS engines, Multi-AZ, read replicas |
| Serverless | Lambda, API Gateway, event sources |
| Security | IAM roles, policies, security groups, least privilege |

## Stopping Archon

To stop the containers:

```bash
docker compose down
```

To restart later without rebuilding:

```bash
docker compose up -d
```
