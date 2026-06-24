---
title: "Amazon Macie"
type: content
estimated_minutes: 17
cert_tags: ["SCS-C03", "SAA-C03", "CLF-C02", "AIF-C01"]
---

# Amazon Macie

## Overview

Amazon Macie is a data security service that uses machine learning and pattern matching to **discover, classify, and help protect sensitive data in Amazon S3**. Where GuardDuty watches for threats and Inspector scans for vulnerabilities, Macie answers a different question: *where is my sensitive data, and is it exposed?* This is a *service reference* lesson covering what Macie discovers, the two kinds of findings it produces, how you scope and run discovery, and what each certification expects.

The reason Macie exists is that organizations accumulate enormous amounts of data in S3 and quickly lose track of what is sensitive and where it lives. Personally identifiable information (PII), financial data, credentials, and health information end up scattered across buckets, sometimes in buckets that are public or shared with other accounts. Manually auditing this is impossible at scale. Macie automates it: it inventories your S3 estate, evaluates each bucket's security posture, and inspects object contents to locate sensitive data — then raises findings you can alert and act on.

The single most important scoping fact about Macie is that **it works on Amazon S3 specifically**. It does not scan EBS volumes, RDS databases, DynamoDB tables, or arbitrary data stores. When a scenario asks how to discover sensitive data in S3, Macie is the answer; when it asks about other data stores, Macie is a distractor.

---

## How It Works

Macie operates in two complementary modes:

1. **S3 bucket posture monitoring.** Continuously, Macie maintains an inventory of your S3 buckets and evaluates each one's security and access posture — whether it is **publicly accessible**, whether it is **encrypted**, whether it is **shared with other AWS accounts or externally**, and whether it enforces secure settings. This produces **policy findings** when a bucket's configuration weakens the security of the data it holds.

2. **Sensitive data discovery.** Macie inspects the *contents* of S3 objects to identify sensitive data using **managed data identifiers** (built-in detectors for common types — names, addresses, credit-card numbers, government IDs, secret keys, and more) and **custom data identifiers** you define with regular expressions, keywords, and proximity rules. When it finds sensitive content, it produces a **sensitive data finding** describing the type and location.

Sensitive data discovery comes in two forms. **Automated sensitive data discovery** continuously and cost-effectively samples objects across your buckets to build an organization-wide *sensitivity map* — a broad picture of where sensitive data likely lives — without scanning everything. **Sensitive data discovery jobs** are targeted, deeper scans you configure against specific buckets, on a schedule or one-off, when you need thorough inspection of known-important data.

This split matters: automated discovery gives you cheap, broad awareness; discovery jobs give you deep, scoped certainty. The exam-relevant skill is choosing the right one for a requirement.

---

## Key Features

- **Managed data identifiers** for a wide catalog of sensitive data types (PII, financial, credentials, PHI-style identifiers), maintained by AWS.
- **Custom data identifiers** using regex plus keyword and proximity logic for organization-specific data (employee IDs, internal account numbers).
- **Allow lists** to exclude known-benign text (for example a public sample value) from being flagged, reducing false positives.
- **Two finding types** — *policy findings* (bucket-level exposure: public, unencrypted, externally shared) and *sensitive data findings* (object-level: this object contains data of this type).
- **Sensitivity scoring** that ranks buckets by how sensitive and exposed their contents are, so you triage the riskiest first.
- **Multi-account management** through AWS Organizations with a delegated administrator, so one security account sees the sensitive-data posture of the whole organization.

---

## Configuration Reference

- **Enablement** is per account and per Region, like other detection services. Macie evaluates buckets in the Region where it is enabled.
- **Automated discovery** can be turned on org-wide with minimal configuration; it begins building the sensitivity map automatically.
- **Discovery jobs** require you to select target buckets, choose managed and/or custom identifiers, set a sampling depth, and optionally a schedule.
- **Results encryption.** Macie findings and any sensitive-data sample results it writes to S3 should be encrypted with a KMS key; Macie needs permission to use that key.
- **Delegated administrator** via Organizations centralizes findings and configuration across accounts.

---

## Operations and Troubleshooting

- **Routing findings.** Macie publishes findings to **EventBridge** and to **AWS Security Hub**. The common pattern: a policy finding that a bucket became public triggers, through EventBridge, an automated remediation (re-block public access) and an SNS alert; sensitive data findings feed Security Hub for centralized posture.
- **Controlling cost and noise.** Use automated discovery for breadth and reserve deep discovery jobs for buckets that genuinely warrant exhaustive scanning, since deep scans inspect large volumes of object content. Use allow lists to suppress predictable false positives.
- **Macie reports no sensitive data where you expect it.** Check that the discovery job actually targeted the bucket, that sampling depth was sufficient, that the right managed/custom identifiers were selected, and that Macie has permission to read the objects and decrypt them (a KMS key policy that excludes Macie will block content inspection).
- **A finding cannot be investigated.** Confirm results-bucket and KMS permissions so Macie can store sample evidence.

---

## Integrations

Macie is a producer in the same security ecosystem as GuardDuty and Inspector: it sends findings to **Security Hub** (aggregation and posture) and **EventBridge** (alerting and automated remediation), is centrally managed through **AWS Organizations**, and relies on **AWS KMS** for encrypting results and on S3 bucket/object permissions for content access. It complements rather than overlaps the other detection services — GuardDuty finds *threats*, Inspector finds *vulnerabilities*, and Macie finds *sensitive data and exposure* — and a complete data-protection design often uses Macie findings to drive S3 remediation (block public access, enforce encryption) and to prioritize where the strongest controls are needed.

---

## Pricing and Cost Considerations

Macie pricing has two usage-based dimensions: a charge for **S3 bucket evaluation** (monitoring bucket inventory and posture, priced by the number of buckets) and a charge for **sensitive data inspection** (priced by the gigabytes of object content Macie analyzes during automated discovery and discovery jobs). The practical implication is that posture monitoring is relatively inexpensive and broad, while deep content inspection scales with data volume — so the cost-aware pattern is continuous automated discovery for awareness plus targeted jobs for the data that matters. A free trial is available, and the console estimates inspection cost before you run large jobs. Exact per-unit prices vary by Region and change over time.

---

## Exam Relevance

**CLF-C02:** Recognize Macie as the service that uses machine learning to discover and protect sensitive data (like PII) in Amazon S3 — and that it is S3-specific, distinct from GuardDuty and Inspector. Foundational depth.

**SAA-C03:** Know Macie discovers sensitive data and flags S3 buckets that are public, unencrypted, or externally shared, and that its findings integrate with Security Hub and EventBridge for response. Architecture-level: protecting data in S3.

**SCS-C03:** Deepest. Know the two finding types (policy vs. sensitive data); managed vs. custom data identifiers and allow lists; automated discovery vs. discovery jobs and when to use each; the KMS/permissions requirements for content inspection; and the Organizations delegated-administrator model. Expect scenarios like "find and flag PII across hundreds of buckets and automatically remediate public exposure."

---

## Summary

Amazon Macie discovers, classifies, and helps protect sensitive data in Amazon S3 using machine learning and pattern matching. It continuously monitors bucket posture (producing policy findings for public, unencrypted, or externally shared buckets) and inspects object content (producing sensitive data findings) using managed and custom data identifiers. Automated sensitive data discovery builds a broad, cost-effective sensitivity map; discovery jobs perform deep, targeted scans. Findings flow to Security Hub and EventBridge for centralized posture and automated remediation, and the service is managed org-wide through a delegated administrator. The defining constraint to remember: Macie works on S3, and its job is sensitive-data discovery and exposure detection — not threat or vulnerability detection.

---

## Quick Check

1. What single data store does Macie inspect, and why does that constraint matter on the exam?
2. What is the difference between a Macie *policy finding* and a *sensitive data finding*?
3. When would you use automated sensitive data discovery versus a sensitive data discovery job?
4. A discovery job returns no results for a bucket you know contains PII in encrypted objects. What two permission-related causes should you check?
5. How does Macie compare to GuardDuty and Inspector in terms of what each one detects?

---

## What's Next

Pair this with **AWS Security Hub** (where Macie findings aggregate) and **AWS KMS** (which encrypts Macie results and whose key policy must permit content inspection). In the SCS-C03 path, this supports the Detection domain and the Data Protection domain lessons on protecting confidential data.
