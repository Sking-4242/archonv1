# Getting Started with Archon

Archon lets you drag and drop AWS components onto a canvas, define security groups and IAM roles, and generate production-ready Terraform with one click.

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

Drag AWS components from the left sidebar onto the canvas. Components are grouped by category — networking, compute, storage, database, and more.

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

### 4. Generate Terraform

Click **Generate** in the top navigation bar. The output panel opens at the bottom. Click **Generate** inside the panel to call your LLM provider — Terraform HCL will appear with syntax highlighting. Click **Download .tf** to save it.

---

## Saving and loading

- **Save** — exports your full architecture (canvas, security groups, IAM roles) as a `.json` file
- **Open** — loads a previously saved `.json` file and restores the entire canvas
- **New** — clears the canvas and starts fresh (prompts for confirmation if you have work on the canvas)

Your canvas also saves automatically to browser local storage, so closing and reopening the tab restores your last session.

---

## Changing providers

Click **Settings** in the top navigation bar to switch your LLM provider, enter a different API key, or change the model. Settings apply immediately to the next Generate call.

---

## Stopping Archon

To stop the containers:

```bash
docker compose down
```

To restart later without rebuilding:

```bash
docker compose up -d
```
