# Show HN: Archon – visual infrastructure IDE for Terraform (design, import, validate, plan diff, discover)

**Title:** Show HN: Archon – visual Terraform IDE with plan diff visualization and compliance-aware validation

---

## Post body

I built a visual infrastructure tool that covers the full IaC lifecycle — not just diagram → Terraform, but also importing existing `.tf` files, visualizing `terraform plan` output as color-coded canvas overlays, and pulling live AWS infrastructure into an editable canvas.

**Five workflows in one tool:**

1. **Design** — drag-and-drop canvas across AWS (130+ types), Azure, GCP, and on-prem. Six typed edge categories (network, data flow, dependency, streaming, batch, event). AI canvas builder for plain-English input. 60 templates.

2. **Import** — upload a `.tf` file and see your infrastructure rendered as an editable canvas. Resource references become edges. VPC/subnet containment is preserved. Edit a node, regenerate, get updated HCL.

3. **Validate** — 85-rule engine covering security config, topology, SG port inspection, compliance standards (CIS, SOC2, PCI, HIPAA, NIST), and FinOps cost-optimization checks. Every finding includes a specific Terraform fix suggestion. Export findings as JSON or a checklist.

4. **Plan diff** — paste `terraform show -json` output and see creates, modifies, and destroys as color-coded rings on canvas nodes. Changed attributes appear in a diff panel on hover.

5. **Discover** — `archon-cli discover --region us-east-1` scans 30 AWS resource types using your existing credentials (nothing leaves your machine) and produces an importable canvas state.

**CLI included:** `archon-cli` works standalone in CI/CD. `archon validate plan.json --format github` emits GitHub Actions annotations. It runs the same 85-rule engine as the UI.

The whole thing runs locally with `docker compose up`. No cloud account required. No telemetry.

**Tech:** React + React Flow frontend, FastAPI backend, python-hcl2 for HCL parsing. LLM generation supports Anthropic, OpenAI, Gemini, xAI, and Ollama (local).

**Repo:** https://github.com/Sking-4242/archonv1  
**License:** Apache 2.0 + Commons Clause

Happy to answer questions about the plan diff parser or the validation rule engine — those were the most interesting problems to build.

---

## Notes for posting

- Post on a weekday, 8–10am ET — best HN timing for developer tools
- Include a demo GIF in the repo README before posting — the plan diff visualization is the most compelling thing to show in 30 seconds
- Suggested GIF flow: load a template → run validate → import a .tf file → load a plan JSON and show the color rings → run archon-cli discover and import the result
- Have the repo README, CONTRIBUTING.md, and GITOPS_GUIDE.md all finalized before posting — HN readers check these immediately
- Expected top questions: "How does it handle modules?", "Can it run terraform apply?", "What's the Commons Clause restriction?", "How accurate is the cost estimation?" — have answers ready

## Likely HN communities to cross-post

- r/devops — same day as HN post
- r/terraform — same day
- r/aws — if the discovery tool is prominent

## Title alternatives (if the primary gets poor CTR)

- "Show HN: I built a tool that visualizes terraform plan output on a canvas"  
- "Show HN: Archon – import your .tf files, validate them against CIS/SOC2/PCI, export findings"
- "Show HN: Visual Terraform IDE with compliance validation and plan diff (self-hosted)"
