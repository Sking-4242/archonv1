# Show HN — draft

> Review and personalize before posting. Replace `[YOUR_HN_USERNAME]` and adjust tone to match your voice.

---

**Title:** Show HN: Archon – visual multi-cloud IDE with 500+ validation rules and Terraform import

**URL:** https://github.com/Sking-4242/archonv1

---

Hi HN,

I built **Archon** — a self-hosted infrastructure IDE that sits between diagramming tools and raw Terraform.

The problem I kept hitting: draw an architecture in a whiteboard tool, then re-implement everything in HCL with no link between the two. Existing Terraform GUIs focus on one cloud or one direction (generate only). I wanted **canvas ↔ Terraform ↔ live AWS** in one place.

**What it does today (Professional 1.0):**

- Multi-cloud canvas — AWS (130+ types), Azure, GCP, On-Prem
- **500+ validation rules** with CIS / PCI / SOC2 / HIPAA / NIST filters and one-click config fixes
- **Import .tf** and **terraform plan JSON** — visualize changes on the canvas
- **AWS discovery** via CLI — pull live resources into the design
- **FinOps** — Cost Explorer + CloudWatch utilization, ranked savings, Terraform hints
- **archon-cli** for CI: `validate --format github`, cost delta, pre-commit hook
- Same stack includes **Academy** — structured AWS curriculum on the same canvas

**Self-hosted.** Docker Compose, your LLM key, your AWS creds. Apache 2.0 + Commons Clause (no hosted SaaS without agreement).

Free tier: full canvas + AWS Cloud Practitioner modules. Pro is $10/mo for validation, FinOps, discovery.

**Try it:**

```bash
git clone https://github.com/Sking-4242/archonv1.git
cd archonv1
python install.py
```

Site: https://archonpro.net  
Repo: https://github.com/Sking-4242/archonv1

I'd love feedback on:
1. Whether the validation → fix loop is useful in your workflow
2. What would make import/discovery compelling for brownfield teams
3. Academy vs Professional — which audience to prioritize

Thanks for reading.

---

## Posting checklist

- [ ] Demo GIF in README (`docs/launch/demo.gif`)
- [ ] README version says 1.0.0
- [ ] archonpro.net live with pricing page
- [ ] Post between Tue–Thu, 8–10am US Eastern
- [ ] Monitor comments for first 2 hours
- [ ] Link to GETTING_STARTED.md for deep questions
