---
title: "Pillar: Security"
type: content
estimated_minutes: 18
cert_tags: ["aws_ccp", "aws_saa", "aws_sap"]
---

# Pillar: Security

## Overview

The Security pillar encompasses the ability to protect data, systems, and assets while delivering business value through risk assessments and mitigation strategies. In the Well-Architected Framework, Security is defined by seven design principles: implement a strong identity foundation, enable traceability, apply security at all layers, automate security best practices, protect data in transit and at rest, keep people away from data, and prepare for security events. Together, these principles form a posture called defense in depth — the idea that no single control is sufficient, and that every layer of your architecture should enforce independent access controls and protections.

The Security pillar is relevant to every architect and engineer working with AWS, regardless of seniority level, because security failures are uniquely consequential. A reliability failure causes downtime — painful but recoverable. A cost management failure causes waste — expensive but correctable. A security breach causes data loss, regulatory liability, customer trust damage, and potentially irreversible harm to individuals. This asymmetry in consequence is why the Security pillar receives first-priority treatment in Well-Architected reviews and why it is covered more extensively in AWS certifications than any other pillar.

For the CLF-C02 exam, know the seven Security pillar design principles and the names and primary functions of the core security services (IAM, KMS, GuardDuty, Security Hub, WAF, Shield). For the SAA exam, know how to select the right security service for a described scenario and how to configure security controls at each architectural layer. At the SAP level, design multi-account security governance using AWS Organizations, implement automated threat detection and response pipelines, and evaluate trade-offs between security posture and operational complexity.

## Core Concepts

### Implement a Strong Identity Foundation

Every interaction with AWS — whether by a human user, an application, or an AWS service — must be authenticated (verified as who they claim to be) and authorized (permitted to perform the action they are attempting). IAM is the identity foundation: it defines users, groups, roles, and policies that control who can do what on which resources. The strong identity principle has three components: grant only the permissions required for each task (least privilege), require multi-factor authentication (MFA) for all human access, and eliminate long-term credentials wherever possible (use IAM roles instead of access keys for applications).

WHY is least privilege hard to implement correctly? Because it requires knowing exactly what permissions each principal actually needs — a question that is hard to answer upfront and changes as systems evolve. AWS IAM Access Analyzer helps by analyzing which permissions are actually used over a rolling period and identifying over-permissioned policies. At the multi-account level, AWS IAM Identity Center (formerly SSO) provides centralized identity management with permission sets that enforce consistent least-privilege access across all accounts in an AWS Organization.

### Enable Traceability

Every action taken in your AWS environment — every API call, every console login, every resource configuration change — should be logged, retained, and reviewable. AWS CloudTrail provides the API-level audit log. Amazon CloudWatch Logs captures application and system logs. VPC Flow Logs record network traffic at the VPC level. AWS Config records the configuration state of every resource over time.

WHY is comprehensive logging a security requirement rather than just an operational convenience? Two reasons: detection and forensics. Detection: if you are not logging, you cannot detect anomalous activity. Threat actors often operate for months before discovery — only comprehensive, analyzed logs reveal their presence. Forensics: when a security incident occurs, logs are the evidence that allows you to determine what data was accessed, by whom, and for how long. Without logs, you cannot perform a complete incident investigation, cannot meet regulatory breach notification requirements, and cannot prove to auditors what happened.

### Apply Security at All Layers

Security controls should exist independently at every architectural layer — not just at the network perimeter. The layered architecture, from outermost to innermost:

**Edge layer:** AWS WAF (web application firewall filtering HTTP requests), AWS Shield (DDoS protection at the network and transport layers), Amazon CloudFront (can absorb volumetric attacks before traffic reaches origin).

**Network layer:** VPC network ACLs (stateless, subnet-level traffic filtering), security groups (stateful, instance-level traffic filtering), VPC endpoints (private connectivity to AWS services without traversing the internet), AWS Network Firewall (stateful, managed network firewall with IDS/IPS capabilities).

**Compute layer:** IAM roles for EC2 instances and Lambda functions (eliminating the need for application credentials), AWS Systems Manager Session Manager (secure instance access without SSH keys or open inbound ports), Amazon Inspector (continuous vulnerability scanning of EC2 and Lambda).

**Data layer:** AWS KMS (encryption key management for data at rest), AWS Certificate Manager (TLS certificate management for data in transit), Amazon Macie (sensitive data discovery in S3), S3 Object Lock (immutable storage for audit logs and compliance data).

**Identity layer:** IAM, IAM Identity Center, AWS Organizations SCPs (Service Control Policies — the outermost permission boundary that no IAM policy can override).

WHY does defense in depth matter when a perimeter firewall is already in place? Because perimeters are breached. A stolen credential bypasses every network control. A vulnerable application allows attackers to pivot inward from the application tier. Insider threats originate inside the perimeter. Each independent layer limits the blast radius of a control failure — the attacker who defeats one layer still faces all subsequent layers.

### Automate Security Best Practices

Manual security reviews and manual remediation do not scale. The Security pillar requires that security checks, compliance validation, and incident response be automated. AWS Config Rules evaluate resource configurations against compliance rules and flag violations automatically. AWS Security Hub aggregates findings from GuardDuty, Inspector, Macie, Config, and third-party tools into a unified security posture dashboard. Amazon EventBridge rules can trigger Lambda functions to auto-remediate violations — for example, automatically blocking an IAM user whose access key is detected in a public GitHub repository.

WHY is automation necessary for security specifically? Because the attack surface never stops changing. New resources are provisioned, configurations drift, new vulnerabilities are discovered, threat actor tactics evolve — all continuously. A manual security review done monthly cannot keep pace. Automated, continuous controls (Config Rules, GuardDuty, Inspector) evaluate the environment in real time and generate findings the moment something violates a policy, rather than 30 days later.

### Protect Data in Transit and at Rest

All data should be encrypted: in transit (using TLS/HTTPS), at rest (using KMS-managed keys for S3, RDS, EBS, and DynamoDB). AWS Certificate Manager provides free, auto-renewing TLS certificates. AWS KMS provides FIPS 140-2 validated key management. The default recommendation is to encrypt everything by default and never store unencrypted sensitive data anywhere in your AWS environment.

WHY not rely on network security to protect data instead of encrypting it? Network controls can be misconfigured (a security group accidentally opens to 0.0.0.0/0). Employees with network access can read unencrypted data. Storage media that is physically decommissioned may still contain unencrypted data. Encryption ensures that even if data is accessed by an unauthorized party, it is unreadable without the key. AWS KMS also provides fine-grained key policies that control which principals can use which keys, adding an independent access control layer beyond IAM permissions.

### Keep People Away from Data

Direct human access to production data is a security risk — both because humans can make mistakes and because human access is harder to audit than programmatic access. The principle of "keep people away from data" means designing systems so that engineers and operators work through automated tools (runbooks, CI/CD pipelines, Systems Manager Automation) rather than by directly accessing databases or storage. When direct access is genuinely required, it should go through a privileged access management (PAM) system that limits the duration of access, requires justification, and logs every action.

WHY does this principle require specific architectural investment? Because the path of least resistance is to give engineers broad database access "just in case." The Security pillar pushes back by requiring that operational procedures be codified so that most operational tasks are achievable without direct data access. Systems Manager Session Manager replaces SSH — all session activity is logged to CloudTrail. AWS Secrets Manager and Parameter Store prevent credentials from being stored in application code or developer laptops. These controls require design work upfront, but they dramatically reduce the risk of accidental or malicious data exposure.

## Configuration Reference

### Security Layers Table: Layer → Threats → AWS Services

| Layer | Threats Addressed | AWS Services | What the Service Does |
|---|---|---|---|
| Edge | DDoS (L3/L4/L7), volumetric floods | AWS Shield Standard | Free, automatic DDoS protection for all AWS customers |
| Edge | DDoS with SLA guarantee | AWS Shield Advanced | Enhanced protection, cost protection, 24/7 DDoS Response Team |
| Edge | Bot traffic, SQL injection, XSS, geo-blocking | AWS WAF | Inspects HTTP/HTTPS requests; applies managed or custom rule groups |
| Edge + CDN | Volumetric attack absorption, latency | Amazon CloudFront | Distributes and absorbs traffic before it reaches origin; integrates with WAF |
| Network | Unauthorized subnet-level traffic | VPC Network ACLs | Stateless inbound/outbound rules at the subnet boundary |
| Network | Unauthorized instance-level traffic | Security Groups | Stateful inbound/outbound rules attached to ENIs; default-deny inbound |
| Network | Data exfiltration via internet path | VPC Endpoints | Private connectivity to S3, DynamoDB, and other services; no internet gateway required |
| Network | Lateral movement, advanced threats | AWS Network Firewall | Stateful, managed firewall with IDS/IPS signatures; deployed in dedicated subnet |
| Compute | Credential theft, long-term key exposure | IAM Roles for EC2/Lambda | Temporary credentials via instance metadata; no stored access keys |
| Compute | SSH key compromise, open ports | SSM Session Manager | Browser/CLI-based shell access; no inbound ports required; all sessions logged |
| Compute | Known software vulnerabilities (CVEs) | Amazon Inspector | Continuous vulnerability scanning of EC2 AMIs and Lambda function packages |
| Data (at rest) | Unauthorized read of stored data | AWS KMS | Envelope encryption with customer-controlled or AWS-managed keys |
| Data (at rest) | Sensitive data exposure in S3 | Amazon Macie | ML-based classification of S3 objects; identifies PII, financial data, credentials |
| Data (at rest) | Deletion of audit records | S3 Object Lock | WORM storage (Write Once Read Many); compliance mode prevents deletion by any user |
| Data (in transit) | Eavesdropping, MITM | AWS Certificate Manager | Free, auto-renewing TLS certificates for all AWS-integrated services |
| Identity | Over-permissioned access, account-level bypass | AWS Organizations SCPs | Outermost permission boundary; applies to entire accounts; cannot be overridden by IAM |
| Identity | Centralized access across accounts | IAM Identity Center | SSO with permission sets; integrates with external IdPs (Okta, Azure AD) |
| Threat Detection | Compromised credentials, crypto-mining, recon | Amazon GuardDuty | ML-based threat detection from CloudTrail, VPC Flow Logs, DNS logs |
| Aggregation | Fragmented security findings | AWS Security Hub | Unified dashboard; aggregates GuardDuty + Inspector + Macie + Config findings |

### Deciding Between AWS-Managed Keys and Customer Managed Keys in KMS

| Dimension | AWS-Managed Keys | Customer Managed Keys (CMK) |
|---|---|---|
| Key creation | AWS creates automatically when you enable encryption | You create explicitly in KMS |
| Key policy control | AWS controls the key policy | You control the key policy |
| Audit capability | Limited CloudTrail visibility | Full CloudTrail record of every key usage |
| Cross-account access | Not possible | Supported via key policy |
| Key rotation | Automatic (AWS-managed, yearly) | Optional automatic or manual rotation |
| Cost | Free | $1/month per key + $0.03 per 10,000 API calls |
| Use when | Default encryption for non-sensitive data; no compliance requirement for key control | Sensitive data, regulatory requirements, cross-account access, need to revoke/disable independently |

For regulated workloads (HIPAA, PCI-DSS, FedRAMP), CMKs are almost always required — they provide audit trails and key control that AWS-managed keys do not.

### Core Security Services Reference Table

| Service | Layer | Primary Function | CLF-C02 Exam Relevance |
|---|---|---|---|
| AWS IAM | Identity | Authentication and authorization for all AWS principals | High — know roles, policies, least privilege |
| AWS IAM Identity Center | Identity | Centralized SSO across multiple AWS accounts | Medium — know it exists and what it replaces (SSO) |
| AWS KMS | Data | Encryption key management, FIPS 140-2 validated | High — know CMK vs AWS-managed keys |
| AWS Shield Standard | Edge | DDoS protection, included free with all AWS accounts | High — know the difference from Shield Advanced |
| AWS Shield Advanced | Edge | Enhanced DDoS protection, cost protection, 24/7 DRT | Medium — know use case vs Standard |
| AWS WAF | Edge/Network | Web application firewall — filter HTTP requests, block OWASP top 10 | High — know what WAF protects against |
| Amazon GuardDuty | Threat Detection | ML-based threat detection from CloudTrail, Flow Logs, DNS | High — know what it detects and what feeds it |
| AWS Security Hub | Aggregation | Unified security posture: aggregates findings from all security services | Medium — know it aggregates, not detects |
| Amazon Inspector | Compute | Vulnerability scanning of EC2 instances and Lambda functions | Medium — know CVE scanning use case |
| Amazon Macie | Data | Sensitive data discovery and classification in S3 | Medium — know it finds PII/sensitive data in S3 |
| AWS Config | Compliance | Configuration tracking and compliance rule evaluation | High — know Config vs CloudTrail distinction |
| VPC Flow Logs | Network | Network traffic logging at the VPC, subnet, or ENI level | Medium — know they feed GuardDuty |

## How to Decide

### Which Security Service to Use for a Given Scenario

| Scenario | Use This Service | Why |
|---|---|---|
| Need to detect compromised EC2 instance making unusual API calls | Amazon GuardDuty | GuardDuty uses ML to detect anomalous behavior; ingests CloudTrail and generates findings automatically |
| Need to block SQL injection attacks on your web application | AWS WAF | WAF evaluates HTTP requests against rule sets including OWASP Top 10 attack patterns |
| Need to prevent DDoS attacks from overwhelming your ALB | AWS Shield (Standard + Advanced) | Shield operates at the network/transport layer, absorbing volumetric attacks before they reach application |
| Need to ensure all S3 buckets are not publicly accessible | AWS Config Rule (s3-bucket-public-read-prohibited) | Config continuously evaluates resource configuration and flags violations in real time |
| Need to find S3 buckets containing PII that employees might have uploaded | Amazon Macie | Macie uses ML to classify S3 objects and identify PII, financial data, and other sensitive content |
| Need to manage encryption keys for RDS, S3, and EBS with key rotation | AWS KMS Customer Managed Keys | CMKs provide key management, rotation, and key policy-based access control across all encrypted services |
| Need centralized visibility into security findings across 20 AWS accounts | AWS Security Hub | Aggregates GuardDuty, Inspector, Macie, Config, and partner tool findings into a unified dashboard |
| Need to grant an EC2 instance permission to read from S3 without access keys | IAM Role attached to EC2 instance | IAM roles provide temporary credentials automatically; no long-term access keys stored on instance |
| Need to scan EC2 instances for unpatched CVEs continuously | Amazon Inspector | Inspector continuously scans EC2 instances and Lambda functions against CVE databases |

### Prioritizing Security Controls When Starting from Scratch

| Priority | Control | Why First |
|---|---|---|
| 1 | Enable MFA on root account and all IAM users | Root compromise is catastrophic; MFA is the single highest-ROI security control |
| 2 | Enable CloudTrail in all regions with log validation | You cannot investigate without an audit log; start logging immediately |
| 3 | Enable GuardDuty in all accounts and regions | Continuous threat detection with zero configuration; costs scale with volume |
| 4 | Enable Security Hub with AWS Foundational Security Best Practices standard | Immediate visibility into your posture across all services |
| 5 | Enforce S3 Block Public Access at account level | Prevents the most common data exposure category — accidentally public S3 buckets |
| 6 | Replace all application access keys with IAM roles | Eliminates persistent credential theft risk for all applications |
| 7 | Enable KMS encryption for RDS, EBS, and sensitive S3 buckets | Protects data at rest against unauthorized storage-level access |

## How This Connects

- **AWS IAM and AWS Organizations** — IAM is the identity foundation for individual accounts; Organizations Service Control Policies (SCPs) set the outermost permission boundaries that apply across all accounts regardless of individual IAM policies — SCPs cannot be overridden by account-level IAM policies
- **Amazon CloudTrail** — provides the API audit log that implements the "enable traceability" principle; connects directly to the Operational Excellence pillar's observability requirements and is the primary data source for GuardDuty's threat detection
- **Amazon GuardDuty** — continuously analyzes CloudTrail events, VPC Flow Logs, and DNS logs using ML to detect threats that rule-based systems would miss; integrates with Security Hub and EventBridge for automated response
- **AWS KMS** — underpins encryption across all data services (S3 server-side encryption, RDS storage encryption, EBS volume encryption, Secrets Manager secret encryption); without KMS, the "protect data at rest" principle cannot be implemented at the key-management level
- **AWS Config** — evaluates resource configurations against compliance rules continuously; when combined with EventBridge and Lambda, Config findings can trigger automated remediation — closing the loop between detecting a misconfiguration and correcting it

## Exam Traps

**Trap 1: Confusing AWS Shield with AWS WAF.** Shield protects against DDoS attacks at the network and transport layers (volumetric traffic floods). WAF protects against application-layer attacks (SQL injection, XSS, bad bots, geographic restrictions). They are complementary and often deployed together, but they address different threat categories. Shield Standard is free and automatic; WAF requires explicit configuration of rules.

**Trap 2: Thinking Security Hub detects threats.** Security Hub does not detect anything on its own — it aggregates findings from services that do detect (GuardDuty, Inspector, Macie, Config). Security Hub is the unified dashboard and compliance scoring tool. GuardDuty is the threat detection service. This distinction appears frequently on SAA exam questions.

**Trap 3: Believing IAM policies alone control access to KMS-encrypted data.** KMS Customer Managed Keys have their own key policy that is evaluated independently of IAM policies. Both must allow the action for it to succeed. An IAM policy that allows kms:Decrypt is insufficient if the key policy does not also allow that principal to decrypt. This double-authorization model is a common source of "access denied" errors and exam questions.

**Trap 4: Assuming VPC security groups are sufficient for network security.** Security groups are stateful and operate at the instance/ENI level — they are effective for controlling traffic between services. But they do not log traffic (VPC Flow Logs do), do not prevent DDoS (Shield does), and do not filter application-layer content (WAF does). A complete network security posture requires all these layers. Exam questions that ask "how would you prevent SQL injection attacks" cannot be answered with "security groups."

**Trap 5: Confusing Amazon Inspector with Amazon GuardDuty.** Inspector scans for known software vulnerabilities (CVEs) in EC2 instances and Lambda function packages — it is a vulnerability assessment tool. GuardDuty detects active threats by analyzing behavioral patterns in logs — it is a threat detection tool. A question about "finding unpatched software versions" needs Inspector. A question about "detecting unusual API calls from an EC2 instance" needs GuardDuty.

## Summary

- The Security pillar is built on seven design principles: strong identity foundation, enable traceability, apply security at all layers, automate security best practices, protect data in transit and at rest, keep people away from data, and prepare for security events — together forming the defense-in-depth posture.
- Defense in depth means that every architectural layer (edge, network, compute, data, identity) enforces independent security controls, so that a failure at one layer does not expose the entire system — the security groups protecting your database remain effective even if an attacker defeats the WAF.
- AWS KMS Customer Managed Keys are the recommended approach for encrypting sensitive data because they provide key policies (independent of IAM), full CloudTrail audit trails of every encryption/decryption operation, and the ability to revoke access by disabling the key.
- Amazon GuardDuty is the primary threat detection service — it ingests CloudTrail, VPC Flow Logs, and DNS logs and uses ML to identify compromised credentials, crypto-mining, reconnaissance, and other threat patterns without requiring rule configuration.
- AWS Security Hub aggregates findings from GuardDuty, Inspector, Macie, Config, and partner tools into a single security posture dashboard; it scores your environment against CIS AWS Foundations Benchmark and AWS Foundational Security Best Practices standards.
- The "keep people away from data" principle requires architectural investment — IAM roles instead of access keys, Systems Manager Session Manager instead of SSH, Secrets Manager for credential storage — but dramatically reduces the risk of accidental or malicious data exposure by eliminating the most common human-error pathways.

## Examples

**Beginner:** A healthcare startup building a patient data platform enables GuardDuty across all their AWS accounts on day one. Three months after launch, GuardDuty detects unusual API calls originating from a compromised developer credential — an access key accidentally committed to a public GitHub repository. Because GuardDuty is already feeding alerts into Security Hub, the team receives a notification within minutes, revokes the key, and assesses the blast radius before any patient data is exfiltrated. Without GuardDuty running continuously, this credential theft would likely have gone undetected for weeks or months while the attacker explored the environment. The "enable traceability" and "automate security responses" principles work together here — CloudTrail generates the events, GuardDuty analyzes them, Security Hub surfaces the finding, and the team responds.

**Intermediate:** A financial services firm redesigns their VPC architecture to enforce defense in depth after a penetration test reveals their application servers are directly reachable from the internet. They restructure the network: an Application Load Balancer lives in the public subnet; application servers move to a private subnet with security groups allowing only traffic from the ALB's security group; the database tier is in a further-isolated subnet allowing only traffic from the application tier's security group. WAF rules attached to the ALB block OWASP Top 10 attack patterns. VPC Flow Logs capture all traffic for forensic purposes. GuardDuty analyzes the flow logs for behavioral anomalies. Each layer independently enforces access control — the "apply security at all layers" principle implemented across the entire request path.

**Advanced:** A global e-commerce company standardizes on KMS Customer Managed Keys for all data encryption across S3, RDS, EBS, and Secrets Manager. They implement key policies that allow only application IAM roles (not human roles) to decrypt data — enforcing the "keep people away from data" principle at the cryptographic layer. They enable S3 Object Lock in compliance mode on their audit log buckets so that even an administrator cannot delete or modify audit records. Amazon Macie continuously scans all S3 buckets and generates findings whenever sensitive data (PII, financial data) appears in unexpected locations. AWS Config rules enforce that all new S3 buckets are private by default, all EBS volumes are encrypted, and all RDS instances use Multi-AZ with encryption enabled. Security Hub aggregates all findings into a compliance dashboard scored against PCI-DSS controls. This layered approach requires significant architectural investment but creates a security posture where every control failure is caught by an independent control — exactly what defense in depth is designed to achieve.

## Think About It

1. The "least privilege" principle says users and services should have only the permissions they actually need. Why is this genuinely hard to implement correctly even for a team that is fully motivated to do so — and what AWS tools help close the gap between intended and actual permissions?
2. If your organization currently relies on a single network perimeter (a firewall at the edge of your VPC), what categories of threats remain unaddressed, and how does the Security pillar's "apply security at all layers" principle address each of them specifically?
3. The pillar calls for automating security responses — automatically revoking a compromised access key, quarantining a suspicious EC2 instance. What are the failure modes of automated security responses, and how would you design a system that automates responses without risking that a false positive triggers a catastrophic action?
4. The "keep people away from data" principle requires that most operational tasks be achievable without direct data access. For a team where direct database access is currently a daily operational necessity, what would the migration path toward this principle look like, and what would you implement first?
5. Why is encrypting data at rest insufficient on its own to satisfy the Security pillar's data protection requirements, and which additional controls does the pillar call for that address the gaps encryption-at-rest alone leaves open?

## Quick Check

**Q1.** A company needs to detect if an EC2 instance in their production account begins making unusual API calls that suggest the instance has been compromised. Which AWS service provides this capability automatically, without requiring custom rule configuration?

- A) AWS Config
- B) Amazon Inspector
- C) Amazon GuardDuty
- D) AWS Security Hub

**Answer: C** — GuardDuty uses ML to analyze CloudTrail events and detect anomalous behavior — including EC2 instances making API calls they do not normally make, which is a common indicator of a compromised instance. Config evaluates configuration compliance, Inspector scans for vulnerabilities, and Security Hub aggregates findings but does not detect them.

**Q2.** A developer needs to give an EC2 instance permission to read objects from a specific S3 bucket. Which approach aligns with the Security pillar's "implement a strong identity foundation" principle?

- A) Create an IAM user, generate access keys, and store the keys in the EC2 instance's /home directory
- B) Store the access keys in an environment variable on the EC2 instance
- C) Attach an IAM role to the EC2 instance with a policy granting s3:GetObject on the specific bucket
- D) Make the S3 bucket public so the EC2 instance can access it without credentials

**Answer: C** — IAM roles for EC2 instances provide temporary credentials that are automatically rotated, never stored on the instance, and fully logged in CloudTrail. Access keys stored in any form on an instance are long-term credentials that can be exfiltrated; public S3 buckets violate the "protect data" principle entirely.

**Q3.** Which statement correctly describes the relationship between AWS WAF and AWS Shield?

- A) They are the same service — WAF includes Shield protection
- B) Shield replaces WAF for applications that need DDoS protection
- C) WAF filters application-layer HTTP traffic (SQL injection, XSS), while Shield protects against network/transport-layer DDoS attacks — they address different threat categories and are often deployed together
- D) WAF is only available with Shield Advanced subscription

**Answer: C** — WAF and Shield operate at different OSI layers. WAF inspects and filters HTTP/HTTPS application-layer traffic. Shield absorbs volumetric DDoS attacks at the network (L3) and transport (L4) layers. Together they provide complementary protections; separately, each leaves a gap the other fills.

## What's Next

Next lesson: the Reliability pillar — designing systems that withstand failure, recover automatically, and meet availability targets through Multi-AZ, Auto Scaling, backup strategies, and chaos engineering.

---
