---
title: "Securing Compute Workloads"
type: content
estimated_minutes: 18
cert_tags: ["SCS-C03"]
---

# Securing Compute Workloads

## Overview

Compute workloads — EC2 instances, containers, and Lambda functions — are where your code runs and therefore where vulnerabilities, malware, and over-broad permissions do their damage. The Security Specialty exam's Task 3.2 covers *designing, implementing, and troubleshooting security controls for compute workloads*: building hardened images, assigning the right roles, scanning for vulnerabilities, patching at scale, providing secure administrative access without exposing instances, finding vulnerabilities in CI/CD pipelines, and protecting newer workloads like generative AI applications. This is a broad, hands-on task, and the exam tests whether you can secure compute across its full lifecycle — from image build to runtime to patching.

The guiding principle is **secure by construction and least exposure**. A compute workload should start from a hardened, scanned image; run with a narrowly scoped role; be reachable for administration only through audited, credential-less channels; be continuously scanned and patched; and never expose more network surface than necessary. Each of these is an AWS-supported control: EC2 Image Builder for hardened images, instance profiles and execution roles for least-privilege authorization, Amazon Inspector for vulnerability scanning, Systems Manager Patch Manager for patching, Session Manager for keyless admin access, and CodeGuru Security for pipeline scanning. The specialty skill is assembling these into a secure compute baseline and troubleshooting where it breaks down.

This lesson covers hardened images, workload authorization, vulnerability scanning, patching, secure administrative access, and pipeline and GenAI protections. After it you will be able to design and troubleshoot security controls across the compute lifecycle.

---

## Core Concepts

### Hardened Images and Golden AMIs

Security starts at the image. A **hardened (golden) AMI** or container image embeds security controls before any instance launches: a minimal OS with unnecessary packages removed, CIS-benchmark hardening, required agents pre-installed (CloudWatch agent, SSM agent, security tooling), and no embedded secrets. **EC2 Image Builder** automates building, hardening, testing, and distributing these images on a schedule, applying the latest patches and producing consistent, validated images — and can enforce that images pass security tests before distribution. The benefit is that every instance starts from a known-good, patched, instrumented baseline rather than being hardened after launch. The exam expects EC2 Image Builder + Systems Manager as the answer for "produce consistent hardened images with embedded controls."

### Authorizing Compute: Instance Profiles, Service Roles, Execution Roles

Compute workloads need to call AWS APIs, and they should do so with **roles, never long-lived keys**. An **instance profile** attaches an IAM role to an EC2 instance so applications get automatic, rotating temporary credentials from the instance metadata service. **Service roles** let an AWS service act on your behalf, and **execution roles** authorize Lambda functions, ECS tasks (task roles), and similar. The specialty point is **least privilege per workload**: each instance, function, or task gets a role scoped to exactly what it needs, so a compromise is contained. A critical hardening step is enforcing **IMDSv2** (the session-oriented instance metadata service) to prevent SSRF attacks from stealing instance credentials, since IMDSv1's request/response model is exploitable. The exam tests assigning correctly scoped roles and enforcing IMDSv2.

### Vulnerability Scanning with Amazon Inspector

**Amazon Inspector** automatically and continuously scans compute for **known vulnerabilities (CVEs)** and unintended network exposure. It covers **EC2 instances** (OS and application packages), **container images in Amazon ECR** (scanned on push and continuously), and **Lambda functions** (code and dependencies). Inspector prioritizes findings with a risk score and integrates with Security Hub and EventBridge for workflow. Where GuardDuty detects *active threats* from behavior, Inspector finds *latent vulnerabilities* before exploitation. The exam pairs "scan instances/containers/Lambda for CVEs and exposure" with Inspector, and expects it enabled org-wide via delegated administration.

### Patching at Scale with Systems Manager

Finding vulnerabilities is only useful if you remediate them. **Systems Manager Patch Manager** automates patching across EC2 and on-premises servers: it defines **patch baselines** (which patches are approved and how quickly), **maintenance windows** (when patching runs), and **patch groups** (which instances get which baseline), and reports compliance. Combined with Inspector (find) and Patch Manager (fix), you get a continuous vulnerability-management loop, with automation to validate that patching succeeded. The exam expects Patch Manager for "deploy patches across compute consistently and report compliance," often triggered or validated alongside Inspector findings.

### Secure Administrative Access — No Bastions, No Keys

Administrative access is a major attack surface, and the modern AWS pattern eliminates open SSH/RDP ports and SSH keys entirely. **Systems Manager Session Manager** provides shell access to instances **without opening inbound ports, without SSH keys, and without a bastion host** — access is authorized by IAM, fully logged to CloudTrail/CloudWatch/S3, and works through the SSM agent over an outbound connection. **EC2 Instance Connect** provides short-lived SSH key injection for temporary access. The security wins: no standing inbound access, IAM-controlled and audited sessions, and no long-lived credentials. The exam strongly favors Session Manager for "secure, auditable administrative access without exposing instances" — a frequent correct answer over bastion hosts or open SSH.

### Pipeline Security and Shift-Left

Securing compute increasingly means catching issues **before deployment**, in the CI/CD pipeline. **Amazon CodeGuru Security** (and **Amazon Q Developer**'s security scanning) analyze application code for vulnerabilities and insecure patterns, and Inspector scans container images and Lambda packages in the pipeline. Integrating these as pipeline stages — failing the build on critical findings — shifts security left so vulnerabilities are fixed in code rather than discovered in production. The exam references discovering and remediating vulnerabilities within a pipeline as a Task 3.2 skill.

### Runtime Threat Detection for Compute

Hardening, scanning, and patching address *latent* weaknesses, but workloads also need detection of *active* threats at runtime — and the two are complementary, a distinction the exam tests. **GuardDuty Runtime Monitoring** deploys a lightweight agent (managed for EKS, and available for ECS/Fargate and EC2) that observes operating-system and container runtime behavior — process execution, file activity, and network connections — to detect threats that only appear at execution, such as a container spawning a reverse shell, cryptomining, or communication with a known command-and-control endpoint. This catches what static scanning cannot: a compromise that exploits a zero-day or a legitimate-but-misused process. **GuardDuty Malware Protection** complements it by scanning EBS volumes attached to suspicious instances. The exam's mental model: **Inspector finds vulnerabilities before exploitation; GuardDuty Runtime Monitoring detects exploitation as it happens** — defense in depth across the compute lifecycle, both deployed org-wide via delegated administration and feeding the same findings pipeline.

### Protecting Generative AI Workloads

A newer Task 3.2 skill is implementing **protections and guardrails for generative AI applications**, applying the **OWASP Top 10 for LLM Applications** — risks like **prompt injection**, **insecure output handling**, **sensitive information disclosure**, and **excessive agency**. Controls include **Amazon Bedrock Guardrails** (filtering harmful content, blocking topics, redacting PII, and detecting prompt-injection patterns), strict **least-privilege roles** for agents (limiting "excessive agency"), **input validation and output filtering**, and isolating the model's tool access. The exam expects awareness that GenAI workloads are compute workloads with their own threat model, defended with Guardrails plus the same least-privilege and validation discipline applied elsewhere.

---

## Configuration Reference

Compute security lifecycle:

```text
Build     EC2 Image Builder → hardened, scanned, patched golden image (+ agents)
Authorize instance profile / task role / execution role (least privilege); enforce IMDSv2
Scan      Amazon Inspector → CVEs + exposure (EC2, ECR images, Lambda)
Patch     Systems Manager Patch Manager → baselines, maintenance windows, compliance
Admin     Session Manager (no ports/keys, IAM-auth, logged) / EC2 Instance Connect
Pipeline  CodeGuru Security / Amazon Q / Inspector in CI/CD (fail on critical)
GenAI     Bedrock Guardrails + least-privilege agent roles + input/output validation
```

Tool → job:

```text
EC2 Image Builder      consistent hardened images with embedded controls
Instance profile/roles least-privilege workload authorization (no long-lived keys)
IMDSv2 (enforced)      prevent SSRF credential theft from instance metadata
Amazon Inspector       continuous CVE + network-exposure scanning (EC2/ECR/Lambda)
SSM Patch Manager      automated patching + compliance reporting
SSM Session Manager    keyless, portless, audited admin access
CodeGuru Security      code vulnerability scanning in the pipeline
Bedrock Guardrails     GenAI/LLM protections (OWASP LLM Top 10)
```

---

## How to Decide

- **Produce consistent, hardened, patched images?** → EC2 Image Builder (+ Systems Manager).
- **Authorize a workload to call AWS?** → a least-privilege role (instance profile / task / execution role); enforce IMDSv2.
- **Find vulnerabilities in instances, container images, or Lambda?** → Amazon Inspector.
- **Patch fleets and report compliance?** → Systems Manager Patch Manager.
- **Give admins access without open ports, keys, or bastions?** → Session Manager (audited, IAM-controlled).
- **Catch vulnerabilities before deploy?** → CodeGuru Security / Inspector in the pipeline.
- **Secure a GenAI app?** → Bedrock Guardrails + least-privilege agent roles + input/output validation.

---

## How This Connects

This lesson connects to Detection (Inspector findings and GuardDuty Runtime Monitoring feed the pipeline), Incident Response (hardened images for clean recovery, Session Manager for response access), IAM (instance/execution roles and least privilege, Domain 4), and Data Protection (no embedded secrets, IMDSv2). The GenAI guardrails connect to the AI Practitioner curriculum's responsible-AI and security material.

---

## Exam Traps

- **Opening SSH/RDP or using bastions for admin.** Session Manager gives keyless, portless, audited access — usually the intended answer.
- **Long-lived keys on instances.** Use instance profiles/roles for rotating temporary credentials; never embed keys.
- **Not enforcing IMDSv2.** IMDSv1 enables SSRF-based credential theft; enforce IMDSv2.
- **Confusing Inspector and GuardDuty.** Inspector finds latent vulnerabilities/exposure; GuardDuty detects active threats from behavior.
- **Hardening after launch.** Bake hardening into the image with EC2 Image Builder, not ad hoc post-launch.
- **Ignoring GenAI threats.** LLM apps need Guardrails and least-privilege agent roles to address prompt injection and excessive agency.

---

## Summary

Securing compute means secure-by-construction workloads with least exposure across their lifecycle. Start from hardened golden images built and validated by EC2 Image Builder; authorize each workload with a least-privilege role (instance profile, task role, execution role) and enforce IMDSv2 to stop credential theft. Continuously scan EC2, ECR images, and Lambda for CVEs and exposure with Amazon Inspector, and remediate at scale with Systems Manager Patch Manager. Provide administrative access through Session Manager — no open ports, no SSH keys, no bastions, fully IAM-controlled and logged. Shift security left by scanning code and artifacts (CodeGuru Security, Inspector) in the pipeline, and protect generative AI workloads with Bedrock Guardrails and tightly scoped agent roles against the OWASP LLM Top 10. Together these controls keep workloads patched, least-privileged, and unexposed.

---

## Examples

**Example 1 — Keyless admin.** A security review flags open SSH ports and shared keys → replace with **Session Manager** (IAM-authorized, logged) and close inbound SSH entirely.

**Example 2 — Vulnerability loop.** Container images must be free of critical CVEs → **Inspector** scans images on push in ECR; the pipeline fails the build on critical findings; **Patch Manager** keeps running hosts patched.

**Example 3 — SSRF defense.** An app is vulnerable to SSRF that could read instance credentials → enforce **IMDSv2** and scope the instance role tightly.

**Example 4 — GenAI guardrails.** An LLM-powered assistant must resist prompt injection and not leak PII → **Bedrock Guardrails** plus a least-privilege agent role limiting tool access.

---

## Think About It

A team secures EC2 instances by sharing one SSH key among admins, opening port 22 to the office IP range, and patching manually when they remember. Identify three weaknesses (access exposure, credential management, vulnerability management) and redesign each with the appropriate AWS control, explaining how your design also produces an audit trail of administrative access.

---

## Quick Check

1. What service builds consistent hardened images, and what belongs in a golden image?
2. How should compute workloads authenticate to AWS APIs, and why enforce IMDSv2?
3. What is the difference between Amazon Inspector and Amazon GuardDuty for compute?
4. Why is Session Manager preferred over a bastion host with SSH for administrative access?

*Answers: (1) EC2 Image Builder; a golden image has a minimal hardened OS, latest patches, required agents (CloudWatch/SSM/security), CIS benchmarks applied, and no embedded secrets; (2) via least-privilege IAM roles (instance profiles, task/execution roles) that supply rotating temporary credentials — never long-lived keys — and IMDSv2 is enforced to prevent SSRF attacks from stealing those credentials; (3) Inspector continuously scans for latent vulnerabilities (CVEs) and network exposure on EC2, ECR images, and Lambda, while GuardDuty detects active threats from runtime/behavioral signals; (4) Session Manager provides IAM-authorized, fully logged shell access with no open inbound ports, no SSH keys, and no bastion to maintain or expose.*

---

## What's Next

Next: **Network Security Controls and Segmentation** — security groups, NACLs, AWS Network Firewall, segmentation strategies, and identifying unnecessary network access.
