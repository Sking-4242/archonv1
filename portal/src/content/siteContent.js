/** Marketing copy shared across archonpro.net pages. */

export const GITHUB_URL = "https://github.com/Sking-4242/archonv1";
export const DOCS_BASE = "https://github.com/Sking-4242/archonv1/blob/master";

export const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    cta: "Get started",
    ctaHref: "/download",
    highlight: false,
    description: "Design and learn without a license key.",
    features: [
      "Full canvas — all four providers, all components",
      "Basic IaC generation and static cost estimates",
      "Save/load JSON and 60 templates",
      "AWS Cloud Practitioner modules (Academy)",
      "1 practice test (AWS CP, easy)",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "$10",
    period: "/ month",
    cta: "Subscribe",
    ctaHref: "/login",
    highlight: true,
    description: "Everything you need to design, validate, and ship infrastructure.",
    features: [
      "500+ validation rules across AWS, Azure, GCP, On-Prem",
      "Compliance filters — CIS, SOC2, PCI, HIPAA, NIST",
      "FinOps live analysis + CloudWatch / Cost Explorer",
      "Terraform import, plan visualization, multi-file export",
      "AWS discovery (30 services) + archon-cli GitOps",
      "Live pricing APIs with usage-based estimates",
      "Unlimited AI generation (bring your own LLM key)",
    ],
  },
  {
    id: "academy",
    name: "Academy",
    price: "$10",
    period: "/ month",
    cta: "Subscribe",
    ctaHref: "/login",
    highlight: false,
    description: "Full cert prep and guided learning paths.",
    features: [
      "All AWS cert tracks — SAA, DVA, SysOps, SOA, SAP, Security",
      "6 practice tests per cert (study + timed modes)",
      "AI tutor with canvas-aware feedback",
      "Full lab and assignment library",
      "Cert readiness indicators",
    ],
    note: "Included with Institutional licenses.",
  },
  {
    id: "institutional",
    name: "Institutional",
    price: "$20",
    period: "/ student / semester",
    cta: "Contact us",
    ctaHref: "mailto:support@archonpro.net?subject=Institutional%20license",
    highlight: false,
    description: "Pool keys for universities and bootcamps.",
    features: [
      "Everything in Academy + Professional per seat",
      "Instructor dashboard and class management",
      "LTI 1.3 integration with Canvas LMS",
      "Bulk seat management via this portal",
      "Graduating student perk — 6 months free Pro + Academy",
    ],
  },
];

export const PROFESSIONAL_FEATURES = [
  {
    title: "Visual canvas",
    body: "130+ AWS, 68 Azure, 61 GCP, and 45 on-prem components. Six edge types, security groups, IAM, templates, and undo/redo.",
  },
  {
    title: "Validation engine",
    body: "153 AWS, 164 Azure, 163 GCP, and 30 on-prem rules. Live findings on the canvas with one-click fixes and compliance filtering.",
  },
  {
    title: "FinOps",
    body: "Compare modeled costs to Cost Explorer actuals. CloudWatch utilization, ranked savings, and Terraform hints.",
  },
  {
    title: "Terraform lifecycle",
    body: "Import .tf files and plan JSON. Export multi-file HCL. Visualize create/update/destroy on the canvas.",
  },
  {
    title: "Discovery",
    body: "Scan live AWS accounts with archon-cli. Import resources into the canvas — credentials never leave your machine.",
  },
  {
    title: "GitOps",
    body: "Validate and cost TF plans in CI. GitHub annotation format, pre-commit hook, and workflow templates included.",
  },
];

export const ACADEMY_FEATURES = [
  {
    title: "Structured curriculum",
    body: "25+ AWS modules from cloud fundamentals through ML, plus Azure and GCP tracks.",
  },
  {
    title: "Hands-on labs",
    body: "52 canvas labs where students design real architectures and get validation feedback.",
  },
  {
    title: "Practice tests",
    body: "Thousands of exam-style questions with study and timed modes (full engine shipping in Academy 1.0).",
  },
  {
    title: "AI tutor",
    body: "Hint-first guidance tied to lesson context and the student's canvas (Academy license).",
  },
];

export const ROADMAP_SHIPPED = [
  { name: "Multi-cloud canvas (AWS, Azure, GCP, On-Prem)", status: "shipped" },
  { name: "500+ validation rules + compliance filters", status: "shipped" },
  { name: "Terraform import, export, and plan visualization", status: "shipped" },
  { name: "AWS discovery + archon-cli GitOps", status: "shipped" },
  { name: "FinOps live analysis (AWS)", status: "shipped" },
  { name: "Live pricing + usage-based cost model", status: "shipped" },
  { name: "Auth, licensing, and customer portal", status: "shipped" },
  { name: "Academy AWS CP + module library", status: "shipped" },
];

export const ROADMAP_COMING = [
  { name: "Practice test engine — study + timed modes", status: "q3", eta: "Academy 1.0" },
  { name: "AI tutor with canvas analysis", status: "q3", eta: "Academy 1.0" },
  { name: "Instructor dashboard + assignments", status: "q3", eta: "Academy 1.0" },
  { name: "LTI 1.3 — Canvas LMS integration", status: "q3", eta: "Academy 1.0" },
  { name: "Static architecture sharing (read-only links)", status: "future", eta: "Post-launch" },
  { name: "FinOps for Azure and GCP", status: "future", eta: "Phase 6" },
  { name: "Azure and GCP live discovery", status: "future", eta: "Phase 6" },
  { name: "Real-time collaboration", status: "future", eta: "If demand proven" },
];

export const GUIDES = [
  {
    slug: "installation",
    title: "Installation",
    summary: "Docker, the one-click installer, and first launch.",
  },
  {
    slug: "getting-started",
    title: "Getting started",
    summary: "Build, validate, generate Terraform, and run your first estimate.",
  },
  {
    slug: "lti",
    title: "LTI setup for institutions",
    summary: "Prepare Canvas LMS integration for Academy (preview).",
  },
];
