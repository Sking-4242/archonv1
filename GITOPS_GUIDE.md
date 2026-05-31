# Archon GitOps Integration Guide

This guide covers integrating `archon-cli` into your development workflow: pre-commit validation, GitHub Actions PR gates, and compliance-filtered checks.

---

## Overview

`archon-cli` has three commands relevant to CI/CD:

| Command | What it does | Exit code |
|---|---|---|
| `validate` | Runs architecture rules against a TF plan (153 AWS, 164 Azure, 163 GCP, 30 On-Prem) | 1 if any CRITICAL findings |
| `cost` | Shows monthly cost delta for a TF plan | 0 always |
| `discover` | Scans live AWS infrastructure | 0 always |

The `--format github` flag on `validate` and `cost` produces GitHub-flavored markdown suitable for posting directly as PR comments.

---

## Part 1 — Pre-Commit Hook

The pre-commit hook validates `plan.json` before every commit. It blocks commits that have CRITICAL findings.

### Install

Copy the hook from `.github/hooks/` to your local `.git/hooks/`:

```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

This is a local-only install. Each developer on the team needs to run this once after cloning.

### How it works

The hook runs automatically on `git commit`. If `plan.json` does not exist in the repo root, the hook exits silently. If `archon-cli` is not installed, the hook warns and exits without blocking. If CRITICAL findings are present, the commit is blocked with a clear message.

To skip the hook when you need to commit without a clean plan (not recommended):

```bash
git commit --no-verify
```

### Pre-commit hook verified

The hook in `.github/hooks/pre-commit` is tested in CI (Linux) via `archon-cli/tests/test_gitops.py`. Install locally with:

```bash
cp .github/hooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

Workflow templates use `-o` / `--output` for report files (Windows-safe). See `.github/workflow-templates/archon-validate.yml`.

### Team-wide install with pre-commit framework

If your team uses the [pre-commit framework](https://pre-commit.com), add this to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: local
    hooks:
      - id: archon-validate
        name: Archon Validate
        entry: .github/hooks/pre-commit
        language: script
        pass_filenames: false
        always_run: true
```

Then run `pre-commit install` once per developer.

---

## Part 2 — GitHub Actions PR Gate

The workflow templates in `.github/workflow-templates/` are ready-to-use starting points. Copy the one you want into `.github/workflows/`:

```bash
cp .github/workflow-templates/archon-validate.yml .github/workflows/archon-validate.yml
```

### Standard validate + cost workflow

`.github/workflow-templates/archon-validate.yml` runs on every PR that touches `.tf` or `plan.json` files. It:

1. Installs `archon-cli` from the repo
2. Runs `archon-cli validate plan.json --format github -o validate-report.md` and posts the output as a PR comment
3. Runs `archon-cli cost plan.json --format github -o cost-report.md` and posts the cost delta as a PR comment
4. Fails the job (blocks merge) if any CRITICAL findings are present

#### Wiring up Terraform plan generation

The template includes a placeholder step labeled "Generate plan JSON (replace this step)". Replace it with your real Terraform plan steps. A typical setup using the HashiCorp Terraform action looks like this:

```yaml
- name: Setup Terraform
  uses: hashicorp/setup-terraform@v3

- name: Terraform Init
  run: terraform init
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_DEFAULT_REGION: us-east-1

- name: Terraform Plan
  run: terraform plan -out=tfplan
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_DEFAULT_REGION: us-east-1

- name: Export plan JSON
  run: terraform show -json tfplan > plan.json
```

Note that AWS credentials are only needed for the Terraform plan step — not for `archon-cli validate` or `archon-cli cost`, which work entirely from the plan JSON file.

#### What the PR comment looks like

After the workflow runs, two comments appear on the PR:

**Validation comment:**
```
## Archon Validation — plan.json

| Severity | Count |
|---|---|
| CRITICAL | 1 |
| WARNING | 3 |

---

### CRITICAL

| Rule | Resource | Message | Fix | Standards |
|---|---|---|---|---|
| rds_publicly_accessible | prod-db (rds) | RDS instance is publicly accessible | Disable publicly_accessible | CIS, PCI |

...
```

**Cost comment:**
```
## Archon Cost Impact — plan.json

| | Amount |
|---|---|
| Added | +$75.00/mo |
| Removed | $0.00/mo |
| Net delta | +$75.00/mo |
| Est. total after apply | $75.00/mo |

<details>
<summary>Line items (2 resources)</summary>
...
</details>
```

### Compliance-filtered gate

`.github/workflow-templates/archon-validate-compliance.yml` adds a hard compliance gate for a specific standard. Set `ARCHON_STANDARD` in the workflow env to one of:

| Value | Standard |
|---|---|
| `CIS` | CIS AWS Foundations Benchmark 3.0 |
| `SOC2` | SOC 2 Type II (2017 TSC) |
| `PCI` | PCI DSS v4.0 |
| `HIPAA` | HIPAA Security Rule |
| `NIST` | NIST CSF 2.0 |

The compliance gate runs in addition to (not instead of) the general validation job. Run both in parallel by having both workflow files in `.github/workflows/`.

---

## Part 3 — Command Reference for CI

All output going to a file for later posting should use `-o` rather than shell redirection on Windows. In Linux CI environments, either form works.

```bash
# Validate — markdown for PR comment, exit 1 on critical
archon-cli validate plan.json --format github -o validate-report.md

# Validate filtered to PCI DSS findings only
archon-cli validate plan.json --format github --standard PCI -o pci-report.md

# Cost delta — markdown for PR comment
archon-cli cost plan.json --format github -o cost-report.md

# Validate — JSON for programmatic processing
archon-cli validate plan.json --format json -o findings.json

# Validate — archon format for import into Archon Pro
archon-cli validate plan.json --format archon -o findings-archon.json
```

---

## Part 4 — Storing archon-cli reports as artifacts

To keep reports accessible in GitHub Actions after the job runs, add an artifact upload step after the validation steps:

```yaml
- name: Upload Archon reports
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: archon-reports
    path: |
      validate-report.md
      cost-report.md
```

These artifacts appear in the workflow run summary and can be downloaded or imported into Archon Pro.

---

## Troubleshooting

**`archon-cli: command not found` in CI**
Make sure the `pip install -e ./archon-cli` step runs before any `archon-cli` call. The `-e` flag installs in editable mode from the repo source.

**Workflow posts comment but does not block the PR**
Check that branch protection rules require the `archon-validate` job to pass before merging. In your repo: Settings → Branches → Branch protection rules → Require status checks to pass before merging → add `Archon — Validate + Cost`.

**`plan.json: file not found`**
The Terraform plan generation step must run before `archon-cli`. Verify the plan step outputs to `plan.json` in the working directory, not a subdirectory.

**Findings appear for resources I don't own**
`archon-cli validate` checks every rule that applies to resources in the plan across AWS, Azure, GCP, and On-Prem providers. Use `--standard` to scope findings to a specific compliance standard, or review the full findings list to identify which module is triggering the rule.

**The cost estimate shows static pricing**
`archon-cli cost` uses bundled static pricing data — it does not call any cloud pricing API and does not require credentials. The estimate is an approximation. For live pricing APIs and usage-based models, sign in to Archon Pro and use the Estimate panel.
