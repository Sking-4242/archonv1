# Archon — Engineering & Product Roadmap

> **Solo dev. Open core. Build in order. Validate before advancing.**
>
> This document is the source of truth for what gets built next, why, and what
> is explicitly out of scope. It is intentionally more opinionated than a
> backlog and more honest than a pitch deck.

---

## Current State — v0.3.0

Archon is a working visual cloud infrastructure design tool with:

- **Multi-cloud canvas** — AWS (86 types), Azure (68), GCP (61), On-Prem (45) = 260+ component types
- **IaC generation** — provider-aware Terraform output (AWS/Azure/GCP) and infra scripts (On-Prem) via 5 LLM providers
- **Security validation** — 9-rule engine with live canvas highlights (critical/warning/info)
- **Cost estimation** — live pricing (AWS Pricing API, Azure Retail API, GCP Billing API) with 1-hour TTL cache and static fallback
- **AI features** — architecture review on generate, HCL security review, conversational chat panel, AI canvas builder
- **Save/load** — JSON round-trip (lossless), localStorage library, template gallery (5 templates)
- **Landing page** — 4-quadrant home screen with saved architectures, templates, provider selector
- **6 edge types** — Network, Data Flow, Dependency, Streaming, Batch, Event

What Archon cannot do yet:

- Read existing Terraform and visualize it
- Discover live cloud infrastructure from AWS APIs
- Visualize what a `terraform plan` would change
- Anything with user accounts, teams, or persistence beyond localStorage

---

## Strategic Positioning

Archon is not a diagramming tool. It is not just a Terraform generator. The
goal is to become **the first cohesive visual infrastructure IDE** — a tool
that understands infrastructure at every stage of its lifecycle: design,
validation, generation, import, diff, and discovery.

The most important near-term strategic move is completing the feedback loop:

```
Currently:    Canvas  →  Terraform
Required:     Canvas  ↔  Terraform  ←  Live Cloud
```

Until Archon can go in both directions — reading existing infrastructure and
writing new IaC — it is only useful for greenfield projects. The far larger
market is engineers dealing with infrastructure that already exists.

### Target users (near-term)

- **Cloud consultants and MSPs** who inherit messy client infrastructure and
  need to understand it quickly
- **Security engineers** who want structured SG/IAM analysis and attack surface
  visibility on existing infra
- **Small DevOps teams** who lack internal tooling and want cost and security
  intelligence without enterprise overhead
- **Students and junior engineers** learning cloud architecture through visual
  feedback

---

## Roadmap

Phases are ordered by impact-to-effort ratio for a solo developer. Each phase
ends with a concrete, demonstrable milestone before the next phase begins.

---

### v0.4.0 — Terraform Import

**The single most important feature Archon can add.**

Right now Archon only generates Terraform from a canvas. This adds the reverse:
parse existing `.tf` files and render them as an editable canvas. The moment
this ships, Archon becomes useful to the far larger population of engineers
working with existing infrastructure rather than designing from scratch.

`python-hcl2` is already a project dependency. The node rendering system is
complete. This is not starting from zero.

#### Scope

- Parse `.tf` file(s) via `python-hcl2` in a new backend service
  (`tf_importer.py`)
- Identify resources by type and map them to Archon component types
  (`aws_instance` → `ec2`, `aws_vpc` → `vpc`, etc.)
- Infer relationships from resource references
  (`aws_instance.subnet_id = aws_subnet.id` → edge)
- Build VPC/subnet containment hierarchy where present
- Return a valid Graph JSON that the frontend can load via the existing
  `loadState` path
- Add an "Import .tf" button in the nav bar alongside the existing Load/Save
  buttons

#### Explicit MVP constraints

- Single-file import only to start — multi-file and module support deferred
- Layout is auto-generated (grid or force-directed) — pixel-perfect
  reconstruction is not a goal
- Variable interpolation (`var.region`) renders as the variable reference
  string, not resolved value — full resolution deferred
- No Terraform state file awareness in this phase

#### Milestone

Open a real `.tf` file containing VPCs, subnets, EC2 instances, security
groups, and an RDS instance. See them rendered on the canvas with edges
reflecting resource references. Edit a node config. Click Generate and receive
updated HCL. The loop is complete.

#### Why this before everything else

- Completes the missing direction in the core workflow
- `python-hcl2` already in deps — no new dependencies required
- Immediately opens the consultant/MSP/inheritance use case
- Pairs directly with the validation engine (import → validate → fix)
- Creates the foundation for plan diff visualization in v0.6.0

---

### v0.5.0 — Validation Depth

The existing 9-rule engine is a solid foundation. This phase makes it
genuinely useful for a security audit workflow — the kind of report you'd
share with a client or present in a review.

#### New rules to add

**Security (critical)**
- IAM policies with `*` wildcard actions on sensitive services
- S3 bucket accessible publicly without explicit intent marker
- Security group with `0.0.0.0/0` on non-HTTP/HTTPS ports (22, 3306, 5432, etc.)
- RDS instance without encryption at rest enabled
- Lambda without a dead-letter queue when connected to async invocations

**Architecture (warning)**
- Subnets not associated with a route table
- NAT Gateway in only one AZ when multiple subnets span AZs
- ALB without access logging enabled
- S3 bucket without versioning when connected to Lambda or application nodes

**FinOps (info)**
- EC2 instance types from previous generations (t2.*, m4.*, c4.*)
- RDS without reserved instance marker in config

#### Fix suggestions

Each finding should include a `suggestion` field — a short, specific action
the user can take. Not just "S3 bucket is public" but "Enable Block Public
Access in the S3 config panel or add an aws_s3_bucket_public_access_block
resource." This transforms the Validate tab from a list of problems into an
actionable audit checklist.

#### Validate tab improvements

- Group findings by severity, then by component
- "Export findings" button — download the current findings as JSON or a
  plain-text checklist
- Keyboard shortcut to jump between findings on the canvas

#### Milestone

Import a real-world architecture (or load a complex template), run validation,
and produce a finding report with specific fix suggestions that you'd
comfortably share with a client. The combination of Import (v0.4.0) +
Validation Depth is the first complete audit workflow.

---

### v0.6.0 — Terraform Plan Visualization

`terraform plan -json` outputs a fully structured JSON diff of what Terraform
intends to create, modify, or destroy. This phase parses that output and
overlays the planned changes directly on the canvas.

This is the feature most likely to get shared. Visualizing the blast radius of
a Terraform plan is something engineers immediately understand and want — and
nothing else does it well in a visual format.

#### Scope

- New panel or modal: "Load Plan" — accepts the JSON output of
  `terraform plan -out=plan.bin && terraform show -json plan.bin`
- Backend service parses the plan JSON and produces a diff annotation keyed
  on resource addresses
- Frontend overlays visual states on canvas nodes:
  - **Green ring** — resource will be created
  - **Yellow ring** — resource will be modified (show changed attributes on hover)
  - **Red ring** — resource will be destroyed
  - **No ring** — no planned change
- Diff summary panel showing counts (N creates, N modifies, N destroys) and a
  scrollable list of specific changes
- "Clear plan overlay" button to return to normal view

#### Explicit constraints

- Read-only — Archon displays the plan, it does not execute it
- No `terraform apply` in this phase (or any phase for the foreseeable future)
- Requires that the canvas was loaded from an imported `.tf` file for resource
  addresses to align — document this clearly

#### Milestone

Paste the JSON output of a real `terraform plan` run into Archon. See creates,
modifies, and destroys color-coded on the canvas. Hover a yellow node to see
which attributes are changing. Take a screenshot that would be worth posting.

---

### v0.7.0 — AWS Discovery MVP

A local Python tool that uses existing AWS credentials to discover live
infrastructure and produce an Archon canvas state. This is the most
commercially valuable feature for consultants and MSPs.

This phase is fourth — not second — because it introduces live cloud API
access and requires careful trust design before shipping. The earlier phases
establish a track record and user base first.

#### Discovery targets (MVP scope — 12 resource types)

| Resource | API |
|---|---|
| VPCs | `ec2:DescribeVpcs` |
| Subnets | `ec2:DescribeSubnets` |
| Internet Gateways | `ec2:DescribeInternetGateways` |
| NAT Gateways | `ec2:DescribeNatGateways` |
| Route Tables | `ec2:DescribeRouteTables` |
| Security Groups | `ec2:DescribeSecurityGroups` |
| EC2 Instances | `ec2:DescribeInstances` |
| Application Load Balancers | `elasticloadbalancing:DescribeLoadBalancers` |
| RDS Instances | `rds:DescribeDBInstances` |
| Lambda Functions | `lambda:ListFunctions` |
| S3 Buckets | `s3:ListBuckets` |
| IAM Roles (attached to resources) | `iam:GetInstanceProfile` |

#### Trust and permissions design (required before shipping)

This must be solved before the feature ships, not after:

- Discovery runs **locally only** — credentials never leave the machine, no
  data sent to any Archon server
- Provide a ready-to-use IAM policy JSON with exactly the read permissions
  required — nothing broader. Document this in the UI and in the README.
- Make it explicit in the UI that this is read-only and what API calls are made
- Add a confirmation dialog before any discovery run that shows the account ID
  being targeted and the region

#### Architecture

- `archon-discover` as a local CLI tool (Python, ships alongside the backend)
  OR an in-app "Discover from AWS" button in the landing page that invokes the
  same backend service
- Discovery outputs a Graph JSON file, which is then loaded through the
  existing `handleLoadJSON` path — no new import mechanism needed
- Region selector before discovery (reuse existing region dropdown)

#### Milestone

Point Archon at a real AWS account (test/sandbox account). Click discover.
Wait 15–30 seconds. See the live VPC topology, EC2 instances, load balancers,
and RDS instances rendered on the canvas. Run validation against it. Save it
to the library.

---

### v1.0.0 — Stabilization and First Public Push

By the time v0.7.0 ships, Archon will have four distinct high-value workflows:

1. **Design** — greenfield canvas → IaC generation
2. **Import** — existing Terraform → editable canvas → updated IaC
3. **Audit** — import or design → deep validation → findings report
4. **Plan diff** — `terraform plan` output → visual blast radius
5. **Discovery** — live AWS account → canvas → validate → export

v1.0.0 is a stabilization milestone, not a feature release:

- Polish rough edges identified during v0.4.0–v0.7.0
- Update README and reference docs to reflect full capability
- Write a proper demo GIF for the README covering all five workflows
- Publish a Show HN post — this is the right moment, not earlier
- Evaluate user feedback to determine what v1.x focuses on

The v1.0.0 release is the first appropriate moment for a genuine public launch.
Before then, the product is still being validated.

---

## Explicit Deferrals

The following features are real ideas that belong on a longer horizon. They
are listed here so they do not enter planning conversations prematurely.

### Monaco Editor + AST Synchronization

True bidirectional canvas ↔ Terraform AST sync — where editing HCL updates
the canvas in real time and moving a node updates the code — requires:

- A full Terraform HCL parser and AST manipulation engine
- Conflict resolution when both sides change simultaneously
- Module and variable resolution
- Provider schema awareness
- Comment and formatting preservation

This is a multi-year engineering effort at solo pace. Hashicorp's own tooling
has struggled with it for years. Do not plan or scaffold this until Archon has
multiple engineers and proven product-market fit.

### Runtime Metrics Overlay

Overlaying live CloudWatch/Azure Monitor metrics on canvas nodes requires
always-on cloud API polling, real-time WebSocket infrastructure, and metric
normalization across providers. This is adjacent to a monitoring dashboard,
not an extension of an infrastructure design tool. Defer indefinitely.

### Team Collaboration (CRDT, shared workspaces)

Adding real-time collaborative editing requires rearchitecting the persistence
layer from scratch. localStorage → PostgreSQL, stateless → WebSocket sessions,
single user → multi-user conflict resolution (Yjs or similar). This is not an
add-on — it's a foundation rewrite. Do not plan this until the product has
demonstrated it needs it.

### Azure and GCP Discovery

The MVP discovery engine targets AWS only. Azure (Azure Resource Graph) and
GCP (Cloud Asset Inventory) have different APIs, different auth models, and
different resource taxonomies. Extend discovery to other providers only after
AWS discovery is validated and proven useful.

### Hosted Cloud Version / Paid Tier

Do not architect for hosting until Archon has 100+ regular users of the
self-hosted version. The right time to think about monetization is when
demand exists, not when features exist.

### Terraform Plan Execution (terraform apply)

Archon will never run `terraform apply` in the foreseeable future. The blast
radius of a mistake in a hosted apply runner is too high, the trust required
is significant, and the infrastructure to do it safely (state locking,
credential isolation, audit logging, rollback) is a product in itself.
Visualize plans. Do not execute them.

---

## Engineering Principles (standing constraints)

These carry forward from the project foundation and do not change by version:

- **Solo dev. Simple, readable code beats clever code.** No over-engineering
  for hypothetical scale.
- **Build in order. Each phase must run before the next begins.** No phase
  skipping.
- **No hardcoded values.** URLs, ports, API keys, model names — all from
  environment variables.
- **Every LLM call through the abstract LLMProvider interface.** No direct SDK
  calls outside provider files.
- **All routes through routers, all business logic through services.** Nothing
  in `main.py` except app setup.
- **Docker Compose from day one.** Frontend and backend in separate containers.
- **Ask before deciding.** Any ambiguity not resolved by this document or the
  Product Reference gets a question, not an assumption.
- **No commented-out code or TODO stubs.** If it is not being built now, it
  does not exist in the file.

---

## Growth Strategy

Archon will not find users through advertising or outreach campaigns. The
realistic acquisition path for an early open-source infrastructure tool is
community discovery.

The right moment to invest in visibility is when v0.7.0 ships — at that point
Archon has five distinct demonstrable workflows and can be shown in a single
compelling demo.

**Planned channels at v1.0.0:**

- **Hacker News Show HN** — a well-written post with a live demo GIF showing
  the import + validate + plan diff workflow. This is the single highest-ROI
  distribution move for a developer tool.
- **r/devops and r/terraform** — post the Show HN to relevant subreddits the
  same day
- **README demo GIF** — a 30-second screen recording covering the full
  workflow. This is the most-viewed artifact in any open-source project.
- **GitHub repository polish** — clear description, good topics, starred
  templates, a CONTRIBUTING.md

Do not spend time on SEO, social media, or content marketing before v1.0.0.
The product is not ready to be the top result for anything yet.

---

## Version Summary

| Version | Focus | Milestone |
|---|---|---|
| 0.3.0 | Multi-cloud, live pricing, landing page | ✅ Complete |
| 0.4.0 | Terraform Import | Open a real .tf → edit on canvas → regenerate |
| 0.5.0 | Validation Depth + fix suggestions | Audit report worth sharing with a client |
| 0.6.0 | Terraform Plan Visualization | Paste plan JSON → visual blast radius |
| 0.7.0 | AWS Discovery MVP | Live AWS account → editable canvas |
| 1.0.0 | Stabilization + public launch | Show HN, README polish, full demo GIF |

---

*Last updated: May 2026 · Archon v0.3.0*
