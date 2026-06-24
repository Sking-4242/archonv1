# SCS-C03 (AWS Certified Security – Specialty) — Granular Curriculum Plan

A detailed, granular curriculum for the Security Specialty, built to the same compose model as the other certs but authored at **specialty depth** — every core lesson is newly written and targets **2,000+ words**, because the existing security lessons in the library are SAA-level and far too shallow for this exam. Shared lessons are referenced only as prerequisites/supporting material.

---

## Exam at a glance (from the official SCS-C03 guide)

- **Level:** Specialty. Target candidate has **3–5 years** of experience securing cloud solutions.
- **Format:** 65 questions (50 scored, 15 unscored). Question types include multiple choice, multiple response, **ordering**, and **matching**.
- **Scoring:** Pass at **750** on a 100–1,000 scale, compensatory. No penalty for guessing.
- **Six domains and weights:**

| Domain | Weight | Becomes Module |
|--------|-------:|----------------|
| D1 — Detection | 16% | Module 1 |
| D2 — Incident Response | 14% | Module 2 |
| D3 — Infrastructure Security | 18% | Module 3 |
| D4 — Identity and Access Management | 20% | Module 4 |
| D5 — Data Protection | 18% | Module 5 |
| D6 — Security Foundations and Governance | 14% | Module 6 |

The exam is deep and operational — it tests *design, implement, and troubleshoot* across detection, response, and controls, not just recognition. The curriculum mirrors that: each lesson works real configurations (KMS key policies, SCPs, IAM policy evaluation, WAF rules, CloudTrail org trails) rather than surface definitions.

---

## Existing coverage (referenced as prerequisites, not core)

| Shared lesson | Used as prerequisite for |
|---------------|--------------------------|
| `module-04-iam/*` (IAM basics, policies, MFA, Organizations) | D4 (IAM), D6 (governance) |
| `module-05-*` (shared responsibility, compliance, Artifact) | D6 (foundations) |
| `module-15-security-services/*` (KMS, Secrets Manager, ACM/CloudHSM/Macie, GuardDuty/Security Hub, Config/CloudTrail, WAF/Shield) | D1, D3, D5 — but only as SAA-level intros |
| `module-13-vpc-networking/*` (SG/NACL, Network Firewall, endpoints, VPN/DX, flow logs) | D3 (infrastructure), D1 (network logs) |
| `module-16-monitoring/*` (CloudWatch, CloudTrail lab, Systems Manager, EventBridge) | D1 (detection), D2 (response) |

> These give learners the foundation; the SCS-C03 lessons below go to specialty depth and are all newly authored.

---

## Module 1 — Detection (16%)

| # | Lesson | Maps to | Granular coverage |
|---|--------|---------|-------------------|
| 1.1 | Security Monitoring & Threat Detection Services | T1.1 | GuardDuty (finding types, protection plans), Security Hub (standards, aggregation, central config), Macie, **Amazon Security Lake**, Detective; org-wide aggregation; EventBridge-driven alerting |
| 1.2 | Designing Logging Solutions at Scale | T1.2 | CloudTrail (org trails, management vs. data events, log file validation), dedicated logging account, CloudWatch Logs (agent, subscription filters), centralization patterns, log integrity |
| 1.3 | Log Storage, Analysis & Correlation | T1.2 | Security Lake + OCSF, Athena over logs, CloudWatch Logs Insights, OpenSearch, network log sources (VPC Flow Logs, TGW flow logs, Route 53 Resolver query logs) |
| 1.4 | Troubleshooting Detection, Logging & Alerting | T1.3 | Missing-log root causes, CloudWatch Agent misconfig, resource/log permissions, Lambda/API Gateway/CloudFront logging, KMS-on-logs pitfalls |

## Module 2 — Incident Response (14%)

| # | Lesson | Maps to | Granular coverage |
|---|--------|---------|-------------------|
| 2.1 | Incident Response Planning & Runbooks | T2.1 | NIST IR lifecycle on AWS, runbooks/playbooks, Systems Manager OpsCenter/Incident Manager, pre-provisioned access, blast-radius minimization, IR readiness |
| 2.2 | Automating & Testing Incident Response | T2.1 | Automated remediation (SSM Automation, Step Functions, Lambda, EventBridge), automated EC2 forensics, Shield Advanced prep, testing with Fault Injection Service / Resilience Hub |
| 2.3 | Responding to Security Events: Forensics, Containment & Recovery | T2.2 | Forensic artifact capture (snapshots, memory, logs), isolation/quarantine patterns, credential revocation, eradication & recovery, root cause analysis with Amazon Detective |

## Module 3 — Infrastructure Security (18%)

| # | Lesson | Maps to | Granular coverage |
|---|--------|---------|-------------------|
| 3.1 | Edge Security: CloudFront, WAF & Shield Advanced | T3.1 | WAF (rule groups, rate-based, geo/IP, managed rules, OWASP Top 10), CloudFront security headers/OAC, S3 CORS, Shield Advanced, rate limiting, client fingerprinting, OCSF integrations |
| 3.2 | Securing Compute Workloads | T3.2 | Hardened AMIs/EC2 Image Builder, instance/service/execution roles, Inspector vulnerability scanning, Patch Manager, Session Manager / EC2 Instance Connect, CodeGuru Security, GenAI/LLM OWASP guardrails |
| 3.3 | Network Security Controls & Segmentation | T3.3 | SG vs. NACL deep dive, Network Firewall (stateful/stateless, domain rules), north-south/east-west, isolated subnets, Verified Access, Network Access Analyzer, Inspector reachability |
| 3.4 | Secure Hybrid & Private Connectivity | T3.3, T5.1 | Site-to-Site VPN, Direct Connect + MACsec, PrivateLink/VPC endpoints (+ endpoint policies), Client VPN, Verified Access for hybrid |

## Module 4 — Identity and Access Management (20% — largest)

| # | Lesson | Maps to | Granular coverage |
|---|--------|---------|-------------------|
| 4.1 | Authentication Strategies & Federation | T4.1 | IAM Identity Center (permission sets, IdP/SAML/OIDC), Cognito (user/identity pools), MFA, Directory Service, workforce vs. customer identity |
| 4.2 | Temporary Credentials & Workload Identity | T4.1, T4.2 | STS (AssumeRole, federation, session tags), presigned URLs, IAM Roles Anywhere, instance profiles, source identity, credential lifetimes |
| 4.3 | IAM Policy Evaluation & Least Privilege | T4.2 | Full policy-evaluation logic (explicit deny → org SCP → resource → identity → boundary → session), policy types, permission boundaries, conditions, least-privilege design |
| 4.4 | Advanced Authorization: RBAC, ABAC & Cross-Account | T4.2 | RBAC vs. ABAC (tag-based), resource policies, cross-account trust, IAM paths, Verified Permissions (Cedar), confused-deputy/ExternalId |
| 4.5 | Troubleshooting & Analyzing Authorization | T4.2 | IAM Policy Simulator, IAM Access Analyzer (external/unused access, policy validation, custom policy checks), debugging access-denied |

## Module 5 — Data Protection (18%)

| # | Lesson | Maps to | Granular coverage |
|---|--------|---------|-------------------|
| 5.1 | Protecting Data in Transit | T5.1 | TLS enforcement, ACM (public/private), ELB security policies, PrivateLink, inter-node encryption (EMR/EKS/SageMaker), Nitro encryption |
| 5.2 | AWS KMS Deep Dive | T5.2, T5.3 | Key types (AWS-managed/customer-managed/AWS-owned), key policies vs. grants vs. IAM, encryption context, envelope encryption, multi-Region keys, key rotation |
| 5.3 | Encryption at Rest & Key Material Choices | T5.2, T5.3 | SSE vs. client-side, KMS vs. CloudHSM, imported key material vs. AWS-generated, external key stores (XKS), service-level encryption (S3/EBS/RDS), Private CA |
| 5.4 | Data Integrity, Lifecycle & Resilient Backups | T5.2 | S3 Object Lock & Glacier Vault Lock (WORM), versioning, lifecycle/retention, AWS Backup (vault lock), Data Lifecycle Manager, DataSync, ransomware protection |
| 5.5 | Secrets Management & Data Masking | T5.3 | Secrets Manager (rotation, cross-account), Parameter Store, CloudWatch Logs data-protection policies, SNS message data protection, masking sensitive data |

## Module 6 — Security Foundations and Governance (14%)

| # | Lesson | Maps to | Granular coverage |
|---|--------|---------|-------------------|
| 6.1 | Multi-Account Governance | T6.1 | Organizations (OUs), Control Tower (guardrails/landing zone), SCPs vs. **RCPs** vs. declarative policies vs. AI opt-out, delegated administrators, centralized root management & break-glass |
| 6.2 | Secure & Consistent Resource Deployment | T6.2 | IaC at scale (CloudFormation StackSets, CloudFormation Guard, cfn-lint), tagging strategy, central policy enforcement (Firewall Manager), secure sharing (RAM, Service Catalog) |
| 6.3 | Evaluating Compliance of AWS Resources | T6.3 | Config rules/conformance packs + auto-remediation, Security Hub standards, Audit Manager evidence, AWS Artifact, Well-Architected Tool security pillar |

## Capstone

| Lesson | Coverage |
|--------|----------|
| SCS-C03 Exam Strategy & Question Patterns | Specialty-level scenario reading, ordering/matching tactics, the troubleshooting mindset, cost/security/complexity trade-offs, time management |

---

## Totals & build approach

- **22 lessons** (21 domain lessons + capstone), all newly authored at **2,000+ words** with the house template (Overview → Core Concepts → Configuration Reference → How to Decide → How This Connects → Exam Traps → Summary → Examples → Think About It → Quick Check → What's Next).
- **Estimated ~45,000+ words** of new specialty content.
- **Configuration depth:** because this exam tests implementation and troubleshooting, the Configuration Reference sections will carry real artifacts — KMS key policies, SCP/RCP JSON, IAM policy-evaluation walkthroughs, WAF rule logic, CloudTrail org-trail setup, Network Firewall rules — annotated line by line.
- **Manifest:** replace the `SCS-C03.json` placeholder with a full six-domain manifest (weights 16/14/18/20/18/14), mapping each cert-specific lesson to its task(s) and referencing the SAA-level shared lessons as `supporting`/prerequisite.
- **Question bank:** an SCS bank already exists (`questions/aws-scs`, 42 files) — the manifest will point at it; verifying its weighting to the six-domain split is a follow-up.

### Accuracy flag for authoring

A few in-scope items are recent and will be **web-verified at authoring time**: **Resource Control Policies (RCPs)**, **declarative policies**, **centralized root access** for member accounts, **AWS Verified Access / Verified Permissions**, **IAM Roles Anywhere**, **Security Lake / OCSF**, and the **GenAI/LLM OWASP guardrails** skill — all newer than the May 2025 cutoff or evolving quickly.

### Suggested build order

Module 4 (IAM, 20%) and Module 5 (Data Protection, 18%) are the highest-weight and most detail-dense; Modules 1/3 next; then 2/6; capstone last. I recommend authoring in domain order (1 → 6) for narrative continuity, module by module, with a structural QA pass after each and a full QA + manifest at the end.
