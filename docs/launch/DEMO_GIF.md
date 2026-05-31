# Demo GIF — recording script

Target: **30 seconds**, silent or with captions. Shows the Professional workflow that differentiates Archon from diagram tools.

## Setup

1. Clean canvas, AWS provider, `us-east-1`
2. Sample `.tf` file in repo: `test-tf/` or a minimal VPC + RDS plan
3. Professional running at localhost:3000 — sign in for full validation/FinOps/discovery (open access)

## Shot list (~30s)

| Time | Action | Caption (optional) |
|---|---|---|
| 0–5s | Nav → **Import .tf** → select file → canvas populates | Import existing Terraform |
| 5–10s | Click **Validate** → scroll findings → filter **PCI** | 500+ rules · compliance filters |
| 10–15s | Click a CRITICAL finding → canvas highlights node | Actionable fixes on canvas |
| 15–20s | Nav → import **plan.json** → plan viz colors on nodes | Visualize terraform plan |
| 20–25s | **Estimate** tab → run estimate → show monthly total | Live pricing + usage model |
| 25–30s | **Generate** → show HCL preview | Production-ready Terraform |

## Export settings

- Resolution: 1280×720 or 1920×1080
- FPS: 15–30
- Tool: OBS, ScreenToGif, or LICEcap
- Save to: `docs/launch/demo.gif` (keep under 5 MB for GitHub README)

## README embed (after recording)

```markdown
![Archon demo](docs/launch/demo.gif)
```

Replace the placeholder in README once the GIF is recorded.
