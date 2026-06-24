---
title: "Troubleshooting and Analyzing Authorization"
type: content
estimated_minutes: 17
cert_tags: ["SCS-C03"]
---

# Troubleshooting and Analyzing Authorization

## Overview

Designing authorization is half the job; the other half is **verifying it** — proving a policy grants exactly what's intended, finding access that shouldn't exist, and diagnosing why a request was denied. The Security Specialty exam's Task 4.2 includes analyzing authorization failures and investigating and correcting unintended permissions, naming **IAM Policy Simulator** and **IAM Access Analyzer** specifically. These are operational, tool-centric skills: given an access-denied error, find the cause; given an organization, find resources shared externally and permissions never used; given a policy change, check it doesn't become more permissive than allowed.

This matters because authorization in a real environment is the emergent result of many overlapping policies, and humans are bad at reasoning about their combined effect. An identity policy looks fine, but a permission boundary caps it; a bucket looks private, but a resource policy shares it with an external account; a role accumulated permissions over years and now grants far more than it uses. The specialty discipline uses **automated reasoning** tools to answer these questions provably rather than by inspection. IAM Access Analyzer uses provable-security techniques to find external, unused, and internal access and to validate policies; the Policy Simulator evaluates whether specific requests would be allowed. Knowing what each tool answers — and using them to both troubleshoot and proactively rightsize — is exactly what the exam tests.

This lesson covers diagnosing access-denied errors, the Policy Simulator, and the full IAM Access Analyzer feature set. After it you will be able to troubleshoot authorization failures and proactively find and remove unintended or unused access.

---

## Core Concepts

### Diagnosing Access-Denied Errors

When a request is denied, the method follows the policy-evaluation algorithm in reverse: identify the **principal**, the **action**, and the **resource**, then check each policy layer for what's blocking or what's missing. Two failure shapes: an **implicit deny** (no policy grants the action — add a grant in the identity or resource policy) or an **explicit deny / cap** (an SCP, RCP, permission boundary, resource policy, or session policy denies or doesn't include it). The **CloudTrail** event for the failed call records the principal and often an informative error, and the error message itself frequently states which policy type caused the deny (e.g., "with an explicit deny in a service control policy"). Work the layers: is it granted? is it capped by a boundary/SCP/RCP? is it explicitly denied? is a condition (MFA, source IP, org) unmet? Most denials resolve to a missing grant, a boundary/SCP cap, or an unsatisfied condition.

### IAM Policy Simulator

The **IAM Policy Simulator** evaluates whether a given principal would be **allowed or denied** a specific action on a specific resource, *without making real requests*. You select a user/group/role, choose actions and resources, and the simulator returns the decision and which statement was decisive — accounting for identity policies, resource policies, permission boundaries, and (with context) conditions. It's the tool for **testing a policy before deployment** ("will this role be able to do exactly what I intend, and nothing more?") and for **debugging** ("why would this principal be denied this action?"). The exam pairs "test/predict whether a policy allows an action" with the Policy Simulator. (For real requests, CloudTrail shows what actually happened; the simulator predicts what would happen.)

### IAM Access Analyzer — External Access

**IAM Access Analyzer** uses **automated reasoning (provable security)** to analyze policies and find access. **External access analysis** identifies resources in your accounts/organization that are **shared with an external entity** — an S3 bucket, IAM role, KMS key, SQS queue, etc., whose policy grants access to a principal outside your zone of trust (another account or the public). This is how you find unintended external exposure that no human reviewed. Findings tell you which resource is shared, with whom, and via which policy, so you can remediate. The exam pairs "find resources unintentionally shared outside the org/account" with Access Analyzer external-access findings.

### IAM Access Analyzer — Unused Access

**Unused access analysis** guides you toward least privilege by finding **access that exists but isn't used**: unused IAM **roles**, unused **access keys** and **passwords** for IAM users, and — for active roles and users — unused **services and actions** (permissions granted but never exercised in the tracked period). Security teams use this across an organization to **rightsize permissions**, removing grants that aren't needed. This operationalizes the "grant minimally, observe, tighten" loop from the least-privilege lesson. The exam pairs "find and remove permissions that are granted but never used / rightsize toward least privilege" with Access Analyzer unused-access findings.

### IAM Access Analyzer — Internal Access and Custom Policy Checks

Newer Access Analyzer capabilities deepen its reach. **Internal access analysis** identifies **who within your organization** has access to critical resources (such as S3, DynamoDB, and RDS), using automated reasoning over identity policies, resource policies, **SCPs**, and **RCPs** together — answering "who can actually reach this sensitive resource, accounting for every policy layer." **Custom policy checks** use automated reasoning to **proactively validate policies before deployment** — for example, flagging a policy change that is **more permissive than the previous version**, or that grants access to specific sensitive actions — so security teams can automate policy review in **CI/CD pipelines**, auto-approving conformant changes and flagging the rest. **Policy validation** (Access Analyzer's policy checks) also flags syntax and security warnings as you author. Together these shift authorization assurance left, into the pipeline, and prove properties of policies rather than eyeballing them.

### Guided Revocation and Remediation

Beyond findings, Access Analyzer supports **remediation** — guidance and, in cases, generated least-privilege policies based on access activity (CloudTrail-informed) and guided revocation of unused access. The workflow is: analyze (external/unused/internal), review findings, and remediate by tightening resource policies, removing unused roles/keys, or replacing broad policies with rightsized ones. Findings integrate with **Security Hub** and **EventBridge** for organization-wide workflow and automation. The exam expects you to treat Access Analyzer as a continuous control — analyze, validate in CI/CD, remediate, repeat — not a one-time scan.

### Choosing the Right Tool

Map the question to the tool: "**will/why would** this principal be allowed/denied this action?" → **Policy Simulator** (predict) or **CloudTrail** (what happened); "what's **shared externally**?" → Access Analyzer external; "what permissions are **unused** / rightsize?" → Access Analyzer unused; "**who internally** can reach this sensitive resource (across all policy layers)?" → Access Analyzer internal; "is this policy change **more permissive than allowed** before deploy?" → Access Analyzer custom policy checks. Knowing which tool answers which question is the core exam skill here.

---

## Configuration Reference

Tool → question answered:

```text
IAM Policy Simulator        will this principal be allowed/denied this action? (predict, no real call)
CloudTrail                  what did this principal actually do / why denied (real events)
Access Analyzer — external  which resources are shared OUTSIDE the account/org?
Access Analyzer — unused    which roles/keys/passwords/services/actions are UNUSED (rightsize)?
Access Analyzer — internal  WHO within the org can access S3/DynamoDB/RDS (all policy layers)?
Access Analyzer — custom checks  is a policy MORE permissive than before / grants sensitive access? (CI/CD)
Access Analyzer — policy validation  syntax + security warnings while authoring
```

Access-denied diagnostic flow:

```text
identify principal + action + resource
→ is it GRANTED (identity/resource policy)?           no → implicit deny: add grant
→ capped by boundary / SCP / RCP / session policy?     yes → cap: adjust the cap
→ explicit DENY anywhere?                              yes → remove/adjust the deny
→ condition unmet (MFA, source IP, org, region)?       yes → satisfy the condition
(CloudTrail error message often names the blocking policy type)
```

Continuous least-privilege loop:

```text
Access Analyzer unused → remove unused roles/keys/permissions
Access Analyzer external/internal → fix unintended sharing/access
Custom policy checks in CI/CD → block over-permissive policy changes before deploy
```

---

## How to Decide

- **Predict whether a policy allows an action (pre-deployment or debugging)?** → IAM Policy Simulator.
- **See what actually happened on a real denied/allowed request?** → CloudTrail.
- **Find resources shared with external entities?** → Access Analyzer external-access findings.
- **Rightsize permissions / find unused access?** → Access Analyzer unused-access findings.
- **Determine who internally can reach a sensitive resource across all policies?** → Access Analyzer internal-access findings.
- **Stop policy changes that become more permissive?** → Access Analyzer custom policy checks in CI/CD.

---

## How This Connects

This lesson closes the IAM domain by validating and debugging everything the prior four lessons designed — it applies the policy-evaluation algorithm in reverse for troubleshooting and uses automated reasoning to verify least privilege. Access Analyzer's internal-access analysis spans SCPs and RCPs (governance, Domain 6) and protects sensitive data stores (Data Protection, Domain 5); its findings feed Security Hub (Detection, Domain 1); and CI/CD policy checks connect to secure deployment (Domain 6).

---

## Exam Traps

- **Using the Policy Simulator for real activity.** The simulator *predicts*; CloudTrail shows what actually occurred.
- **Treating Access Analyzer as one feature.** It has distinct external, unused, internal, and custom-policy-check capabilities — match the right one to the question.
- **Eyeballing for external sharing.** Use Access Analyzer's automated reasoning to *prove* what's shared externally rather than reading policies by hand.
- **Ignoring unused access.** Least privilege is continuous; unused-access findings are the tool to rightsize.
- **Missing the explicit-deny/cap in denials.** When a grant exists but access is denied, look for an SCP/RCP/boundary/resource explicit deny or an unmet condition.
- **Skipping pre-deployment checks.** Custom policy checks in CI/CD catch over-permissive changes before they ship.

---

## Summary

Verifying and troubleshooting authorization relies on the right tools. The IAM Policy Simulator predicts whether a principal would be allowed or denied a specific action (great for testing before deployment and debugging), while CloudTrail shows what really happened. IAM Access Analyzer uses automated reasoning to find access provably: external-access findings reveal resources shared outside your account/org; unused-access findings reveal unused roles, keys, passwords, and services/actions to rightsize toward least privilege; internal-access findings reveal who within the org can reach sensitive S3/DynamoDB/RDS resources across all policy layers (including SCPs and RCPs); and custom policy checks validate that a policy isn't more permissive than before, integrable into CI/CD. To diagnose an access denial, walk the evaluation algorithm — grant present? capped? explicitly denied? condition unmet? — using CloudTrail's error detail. Treat these as continuous controls that prove and tighten authorization rather than one-time checks.

---

## Examples

**Example 1 — Pre-deploy test.** Before granting a new role, a team uses the **Policy Simulator** to confirm it can perform its required actions and nothing more.

**Example 2 — External exposure.** A review must find any bucket, role, or key shared outside the organization → **Access Analyzer external-access** findings list them with the granting policy.

**Example 3 — Rightsizing.** An audit must remove permissions nobody uses → **Access Analyzer unused-access** findings show unused roles, keys, and unused services/actions on active roles.

**Example 4 — CI/CD guardrail.** A pipeline must block any IAM policy change that broadens access → **Access Analyzer custom policy checks** flag changes more permissive than the prior version.

---

## Think About It

A security team needs to answer three questions: "could this new role do anything beyond its intent," "which of our S3 buckets are exposed to outside accounts," and "which permissions across our org are granted but never used." Name the exact tool/feature for each, and explain why automated-reasoning analysis is more trustworthy than manually reading the policies for the last two.

---

## Quick Check

1. What does the IAM Policy Simulator do, and how does it differ from CloudTrail?
2. Which IAM Access Analyzer capability finds resources shared with external entities?
3. Which Access Analyzer capability helps you rightsize toward least privilege, and what does it find?
4. How do custom policy checks help in a CI/CD pipeline?

*Answers: (1) it predicts whether a given principal would be allowed or denied a specific action on a resource without making a real request (for testing/debugging), whereas CloudTrail records what actually happened on real requests; (2) external-access analysis/findings; (3) unused-access analysis — it finds unused IAM roles, unused access keys and passwords, and unused services and actions on active roles/users; (4) they use automated reasoning to flag policy changes that are more permissive than the previous version (or grant sensitive access) before deployment, so conformant changes can be auto-approved and risky ones flagged for review.*

---

## What's Next

You've completed Module 4 (Identity and Access Management). Next module: **Data Protection**, starting with controls for data in transit.
