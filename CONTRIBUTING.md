# Contributing to Archon

Archon is a solo-dev open-core project. Contributions are welcome, but the bar for what gets merged is deliberate: every change should make the product clearer, more reliable, or more useful — not just bigger.

Read this document before opening a PR. Most rejected contributions fail on scope, not quality.

---

## Development environment

### Requirements

- [Docker Desktop](https://www.docker.com/products/docker-desktop) with Compose plugin
- Node.js 20+ (for frontend linting without Docker)
- Python 3.11+ (for archon-cli and backend checks)
- `pip install -e ./archon-cli[dev]` for CLI tests

### Start the stack

```bash
git clone https://github.com/Sking-4242/archonv1.git
cd archonv1
cp .env.example .env
# Set at least one LLM_PROVIDER and its API key in .env
docker compose up --build
```

Professional runs at [http://localhost:3000](http://localhost:3000).  
Backend API docs at [http://localhost:8000/docs](http://localhost:8000/docs).

### Run the CLI test suite

```bash
cd archon-cli
pip install -e ".[dev]" --break-system-packages
pytest tests/ -q
```

All **441** tests must pass (**1** skipped on Windows for the bash pre-commit hook). Do not submit a PR with failing tests.

### Run backend lint and tests

```bash
cd backend
pip install -r requirements.txt -r requirements-dev.txt
export DATABASE_URL=sqlite:///./test.db   # Windows: set DATABASE_URL=sqlite:///./test.db
ruff check app/
black --check app/
pytest -q
```

### Run frontend lint

```bash
cd frontend
npm ci
npm run lint
npm run format:check
```

### Run Academy lint

```bash
cd academy
npm ci
npm run lint
npm run format:check
```

---

## Continuous integration

Every push and pull request to `master` runs `.github/workflows/ci.yml`:

| Job | What it checks |
|---|---|
| **Frontend lint** | ESLint + Prettier (`frontend/`) |
| **Academy lint** | ESLint + Prettier (`academy/`) |
| **archon-cli test** | Full pytest suite (`441` passed, `1` skipped) |
| **GitOps workflow smoke** | `archon-cli validate` and `cost` with `--format github` on `sample_plan.json` |
| **Portal build** | Vite production build (`portal/`) |
| **Backend lint + test** | Ruff, Black, pytest (`backend/tests/`) |

Reproduce CI locally before opening a PR: run the commands above in each package directory.

---

## Code standards

These are enforced, not suggestions.

**Frontend**
- Functional React components only. No class components.
- Zustand for all shared state. No prop drilling.
- No hardcoded values — URLs, ports, API keys, model names all come from environment variables.
- All new validation rules go in provider-specific rule modules (`gcpValidationRules.js`, `azureValidationRules.js`, `onpremValidationRules.js`) and matching CLI modules (`gcp_validate.py`, `azure_validate.py`, `onprem_validate.py`). A rule added to one must be added to the other.

**Backend**
- All routes in `routers/`. All business logic in `services/`. Nothing in `main.py` except app setup and router registration.
- Every LLM call goes through the abstract `LLMProvider` interface in `backend/app/services/llm/`. No direct SDK calls outside provider files.
- No hardcoded values. All configuration from environment variables.

**General**
- No commented-out code and no TODO stubs. If it is not being built now, it does not exist in the file.
- No unnecessary dependencies. Every package added needs a clear, stated purpose.

---

## What is in scope

- Bug fixes
- New AWS/Azure/GCP/On-Prem component types (palette, config, pricing)
- New validation rules — must follow the existing rule schema and include `suggestion`, `fix`, and `standards` fields
- New compliance mappings in `compliance.py` for existing rules
- Documentation improvements
- Performance improvements to existing features
- Test coverage for untested code paths

---

## What is out of scope

Do not open PRs for the following. They will be closed without review.

- **Auth, teams, or multi-user features** — this requires a foundation rewrite; see ROADMAP.md Explicit Deferrals
- **Azure or GCP discovery** — AWS only until AWS discovery is fully validated
- **Monaco editor / AST sync** — multi-year effort; explicitly deferred in ROADMAP.md
- **terraform apply** — Archon will never run apply; see ROADMAP.md
- **Hosted SaaS infrastructure** — not the right time
- **New LLM providers** beyond the current five — each provider adds maintenance surface; discuss first

If you have a feature idea that does not fit the current scope, open an issue to discuss it before building anything.

---

## PR process

1. Open an issue first for anything non-trivial. Describe the problem and your proposed solution.
2. Fork the repo and create a branch from `main`.
3. Make your changes. Keep PRs focused — one logical change per PR.
4. Ensure all CI checks pass locally (see **Continuous integration** above).
5. Write a clear PR description: what changed, why, and how to test it.
6. Reference the issue number in the PR description.

PRs that skip the issue step, bundle multiple unrelated changes, or add scope that conflicts with the roadmap will be closed.

---

## Adding a new AWS component type

A new component requires changes in four files:

1. `frontend/src/utils/awsPalette.js` — add entry with `id`, `label`, `icon`, `category`
2. `frontend/src/utils/componentConfig.js` — add config fields under `aws` key, split into `basic` and `advanced`
3. `backend/app/services/pricing.py` — add static monthly estimate
4. `backend/app/services/aws_live_pricing.py` — add live pricing API mapping (if available)

For Azure, GCP, and On-Prem, the corresponding `*Palette.js`, `*ComponentConfig.js`, and `*_pricing.py` files follow the same pattern.

---

## Adding a new validation rule

A rule must exist in both the frontend store and the CLI engine.

**Frontend** — add the rule to the provider module (`frontend/src/store/gcpValidationRules.js`, `azureValidationRules.js`, `onpremValidationRules.js`, or inline AWS rules in `validationStore.js`):

```js
{
  id: "your_rule_id",
  level: "critical" | "warning" | "info",
  title: "Short title",
  message: "What's wrong and why it matters.",
  fix: "Short action for the config panel.",
  suggestion: `Specific Terraform resource/attribute guidance.`,
  standards: ["CIS", "SOC2"],  // empty array if no standard applies
  nodeTypes: ["ec2", "rds"],   // node types this rule applies to, or []
},
```

**CLI** — add a matching finding in the provider module (`archon-cli/archon_cli/gcp_validate.py`, `azure_validate.py`, `onprem_validate.py`, or AWS rules in `validate.py`).

**Compliance** (`archon-cli/archon_cli/compliance.py`): if the rule maps to one or more standards, add an entry to `COMPLIANCE_MAP`.

**Tests**: add a test case in `archon-cli/tests/` covering the new rule.

---

## License

By contributing, you agree that your contributions will be licensed under the same license as the project: Apache 2.0 with Commons Clause. See `LICENSE` for the full text.

The Commons Clause restriction means Archon cannot be sold as a hosted service without a commercial agreement. Contributions to the open-core codebase are welcome under these terms.
