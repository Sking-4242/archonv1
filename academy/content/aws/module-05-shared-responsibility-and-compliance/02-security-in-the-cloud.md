---
title: "Security In the Cloud (Your Responsibility)"
type: content
estimated_minutes: 15
cert_tags: ["CLF-C02", "SAA-C03", "SCS-C02"]
---

# Security In the Cloud (Your Responsibility)

## Overview

The customer side of the Shared Responsibility Model is not a vague catch-all — it is a specific, enumerable list of security controls that you must design, configure, and maintain. AWS provides the infrastructure and the tools, but the decisions about how those tools are applied to your data and workloads are yours alone. Getting this right is the difference between a secure cloud architecture and a headline-making breach.

Customer security responsibilities cluster into five categories: identity and access management (IAM), data security (encryption at rest and in transit, classification), network security (VPC configuration, security groups, NACLs), operating system and application security (EC2 patching, dependency management, secrets management), and audit and visibility (logging, monitoring, anomaly detection). Each category maps to specific AWS services and specific configuration decisions that you must make deliberately — AWS does not make them for you.

Understanding these responsibilities matters at the CCP level because the exam regularly tests whether you know which controls belong to the customer. It matters in practice because unowned controls become security gaps, and security gaps in the cloud are often exploited within hours of misconfiguration. This lesson walks through each responsibility category with enough depth to recognize and act on it — not just name it.

## Core Concepts

### Identity and Access Management (IAM)

IAM is the most consequential customer responsibility in AWS. It controls who can do what to which resources — and a mistake in IAM configuration can expose your entire account. AWS provides the IAM service, but how you configure it is entirely your problem.

The foundational IAM principle is least privilege: every user, role, and service should have only the permissions it needs to perform its function — nothing more. In practice, this is harder than it sounds. Engineers grant broad permissions to unblock themselves quickly and rarely go back to tighten them. IAM roles on EC2 instances accumulate permissions over time. Service accounts retain access long after the service is decommissioned.

Critical IAM responsibilities include: enforcing MFA on all human accounts (especially the root account, which must never be used for daily operations), rotating access keys on a schedule (or eliminating them in favor of IAM roles), reviewing and removing unused permissions quarterly using IAM Access Analyzer, and ensuring no IAM policy uses a wildcard (`"Action": "*"`) on sensitive resources without explicit justification. AWS Security Hub and AWS Trusted Advisor both surface IAM misconfigurations — treat their findings as a mandatory remediation queue, not suggestions.

### Data Encryption at Rest

Encryption at rest means that data stored on disk is unreadable without the decryption key. In AWS, virtually every storage service supports encryption at rest, but you must enable it — or verify that the service enables it by default. The WHY: if a physical storage medium is removed from an AWS facility (or if an improper logical access path exists to raw storage), encrypted data is useless without the key. Encryption at rest also satisfies a checkbox required by virtually every compliance framework — PCI DSS, HIPAA, SOC 2, ISO 27001 all require it for sensitive data.

Service-by-service customer responsibilities for encryption at rest:
- **EBS volumes**: Not encrypted by default unless you enable account-level default encryption in EC2 settings. You must either enable this setting or explicitly check the encryption box when creating each volume.
- **S3 objects**: AWS now enables server-side encryption (SSE-S3) by default. However, for regulated data requiring customer-managed keys (CMK), you must configure SSE-KMS with your own KMS key.
- **RDS instances**: Encryption must be enabled at creation time and cannot be added afterward. If you create an unencrypted RDS instance, you must snapshot it, copy the snapshot with encryption enabled, and restore from the encrypted snapshot.
- **DynamoDB tables**: Encryption is enabled by default using AWS-owned keys. For compliance requiring customer control over keys, you must configure CMK encryption.
- **Lambda environment variables**: Lambda encrypts environment variables at rest using an AWS-managed KMS key by default. For compliance requirements mandating customer-controlled keys, configure additional encryption with a customer-managed KMS key (CMK). Either way, sensitive values should be stored in Secrets Manager or Parameter Store and retrieved at runtime rather than embedded in environment variables.

### Data Encryption in Transit

Encryption in transit means that data moving between systems is encrypted (typically TLS) so it cannot be read if intercepted on the network. AWS API endpoints use HTTPS by default — you are not making unencrypted calls to AWS services. But within your architecture, you must enforce TLS.

Key in-transit responsibilities: configure RDS to require SSL connections and reject non-SSL clients (this is a parameter group setting — `rds.force_ssl=1` for PostgreSQL, `require_secure_transport=ON` for MySQL). Ensure Application Load Balancers use HTTPS listeners and redirect HTTP to HTTPS. Use certificate management (AWS Certificate Manager) for TLS certificates rather than self-signed or expired certificates. For EC2-to-EC2 traffic within a VPC, consider whether your threat model requires encryption — for payment processing, it does. TLS between microservices is a customer configuration decision.

### Network Security: Security Groups and NACLs

AWS gives you two network-layer security controls — Security Groups and Network Access Control Lists (NACLs) — and you must configure both appropriately. AWS does not configure network restrictions on your behalf; a new VPC is functional but not hardened.

**Security Groups** are stateful virtual firewalls attached to individual resources (EC2 instances, RDS instances, Lambda functions in a VPC, etc.). Stateful means that if you allow inbound traffic, the return traffic is automatically allowed without an explicit outbound rule. Security groups use allow rules only — there is no explicit deny at the security group level. Your responsibilities: never allow 0.0.0.0/0 (all IPv4) on sensitive ports like 22 (SSH), 3306 (MySQL), or 5432 (PostgreSQL) in production. Use security group IDs as sources instead of IP ranges for internal traffic (e.g., allow only the app-server security group to reach the database security group on port 5432). Regularly audit security group rules and remove permissive rules that were added "temporarily."

**Network ACLs (NACLs)** are stateless firewalls at the subnet boundary. Stateless means you must explicitly allow both inbound and outbound traffic — including the return traffic for connections. NACLs process rules in order by rule number and stop at the first match. They are useful for blocking known-bad IP ranges at the subnet level (explicit DENY rules), which security groups cannot do. Your responsibilities: design NACLs to complement your security groups with subnet-level controls, especially for multi-tier architectures where you want to block lateral movement between tiers at the network layer.

### OS Patching and Application Security (EC2)

For any EC2 instance, the guest operating system is entirely your responsibility — AWS never patches it. This is a full-time operational commitment: OS security patches must be applied regularly (critical vulnerabilities within 24–72 hours of release, per most security frameworks), and application dependencies must be updated when CVEs are disclosed.

AWS Systems Manager Patch Manager is the primary tool for managing OS patch compliance across your EC2 fleet. Here is how to use it:

1. Open the **AWS Systems Manager** console and navigate to **Patch Manager** in the left navigation.
2. Create a **Patch Baseline** — a set of rules defining which patches are approved for installation. For Amazon Linux 2, the default AWS baseline automatically approves security patches after a configurable delay (default: 7 days). For Windows, you define which patch classifications (Critical, Important) and products are in scope.
3. Create a **Maintenance Window** — a scheduled time window during which patching runs. Set the schedule (e.g., every Sunday at 2 AM UTC), duration, and stop-time buffer.
4. Associate your EC2 instances with the maintenance window using **Targets** (tag-based selection, e.g., tag `Environment=Production`).
5. Add a **Run Command task** to the maintenance window using the `AWS-RunPatchBaseline` document, which scans and installs approved patches.
6. After a patching cycle, review **Compliance** under Patch Manager to see which instances are compliant, non-compliant, or missing data.

Non-compliant instances — those missing approved patches — represent an open customer responsibility gap. AWS Security Hub can ingest Patch Manager compliance data and surface non-compliant instances as findings, connecting your patching posture to your broader security posture.

### Secrets Management and Application Security

Storing credentials in application code, environment variables, or configuration files is a well-documented failure mode that compromises customer security. If your EC2 instance's user data script contains a database password, and that script is accessible (even briefly), the credential is compromised. This is a customer application security responsibility.

AWS provides two purpose-built services: **AWS Secrets Manager** (for storing, rotating, and retrieving secrets programmatically — database passwords, API keys, OAuth tokens) and **AWS Systems Manager Parameter Store** (for configuration values, with optional KMS encryption for sensitive parameters). Both services allow your application to retrieve secrets at runtime via API call rather than baking them into configuration. Secrets Manager additionally supports automatic rotation — it can rotate RDS passwords on a schedule and update the secret value without any application downtime.

## Configuration Reference

### AWS Security Hub: Customer-Owned Control Overview

Security Hub is where you can see an aggregated view of your customer-side security posture. To access it:

1. Open the **AWS Security Hub** console. If it is not enabled, click **Go to Security Hub** and **Enable Security Hub**.
2. On the **Summary** page, review your **Security score** — a percentage based on how many enabled security controls are passing versus failing across your account.
3. Navigate to **Security standards** in the left menu. You will see enabled standards such as **AWS Foundational Security Best Practices**, **CIS AWS Foundations Benchmark**, and **PCI DSS** (if enabled).
4. Click any standard to see individual controls. Each control represents a customer responsibility check. Examples:
   - `[IAM.1] IAM policies should not allow full "*" administrative privileges` — customer responsibility
   - `[EC2.19] Security groups should not allow unrestricted access to ports with high risk` — customer responsibility
   - `[S3.2] S3 buckets should prohibit public read access` — customer responsibility
5. Click a failing control to see the list of affected resources, the remediation guidance, and the AWS Config rule that drives the check.

Every failing control in Security Hub is a customer responsibility gap. AWS does not auto-remediate these findings — that is your job.

### EC2 Patch Compliance in Systems Manager Patch Manager

After configuring Patch Manager as described above, check compliance status:

1. In **Systems Manager**, navigate to **Patch Manager** > **Dashboard**.
2. The dashboard shows a summary: compliant instances, non-compliant instances, and instances with no data (SSM Agent not installed or not reporting).
3. Click **Non-compliant** to drill into which instances are missing patches and which specific patch IDs are missing.
4. For a single instance: navigate to **Managed Instances**, select the instance, and choose the **Patch** tab to see full patch state detail.
5. For fleet-wide reporting: use **Compliance** under Systems Manager to export compliance data to S3 or query it via AWS Config.

Any instance showing as non-compliant represents an open customer responsibility. Patch Manager does not patch automatically unless you configure and activate a maintenance window with patching tasks — the tool does not run unless you drive it.

## How to Decide

When you encounter a security control and need to determine whether it is your responsibility to configure, apply this decision framework:

| Control Type | Key Question | Customer Action Required? |
|---|---|---|
| IAM permissions and roles | Does a human or service have more access than its function requires? | Yes — scope down or remove |
| Encryption at rest | Is the storage service encrypting data, and with what key type? | Yes — verify enabled, choose key type |
| Encryption in transit | Is TLS required between all components in the data path? | Yes — configure enforcement |
| OS patching (EC2) | Is there a patch management schedule in Systems Manager? | Yes — configure Patch Manager |
| Security group rules | Are any rules open to 0.0.0.0/0 on non-public ports? | Yes — restrict to specific sources |
| NACL rules | Are subnet boundaries restricting lateral movement between tiers? | Yes — design and implement NACLs |
| Secrets in code | Are credentials stored in code, env vars, or config files? | Yes — migrate to Secrets Manager |
| S3 bucket access | Is the bucket policy the least-permissive for its purpose? | Yes — review and tighten |
| Logging and audit | Is CloudTrail enabled with log validation? | Yes — enable account-wide |
| MFA enforcement | Do all human accounts require MFA? | Yes — enforce via IAM policy |

## How This Connects

- **AWS IAM** — the service where customer identity and access management configuration lives. Every permission decision in your account goes through IAM.
- **AWS KMS (Key Management Service)** — the encryption key infrastructure you use to fulfill encryption at rest responsibilities for EBS, S3, RDS, and other services.
- **Amazon VPC** — the network environment where you configure security groups, NACLs, subnets, and routing to fulfill network security responsibilities.
- **AWS Systems Manager** — the fleet management service containing Patch Manager (OS patch compliance), Session Manager (secure EC2 access without SSH keys), and Parameter Store (secrets and configuration).
- **AWS Security Hub** — the aggregated security posture view that surfaces customer responsibility gaps as findings, benchmarked against security standards like CIS and AWS Foundational Security Best Practices.

## Exam Traps

**Trap 1: "AWS automatically patches EC2 instances."** Never. AWS patches the physical host and the hypervisor. The guest operating system on every EC2 instance is the customer's responsibility, forever. If your EC2 fleet has unpatched vulnerabilities, that is your security gap, not AWS's.

**Trap 2: "Security groups are configured by AWS to be secure by default."** Partially true and misleading. The default security group in a default VPC allows all outbound traffic and inbound from within the same security group. That is not a secure production configuration. You must design security group rules for your architecture. AWS provides the tool; security is not a default state.

**Trap 3: "Encryption at rest is automatically enabled for all AWS storage services."** False. S3 defaults to SSE-S3 encryption, but EBS volumes are not encrypted by default (unless you enable account-level encryption defaults). RDS must have encryption enabled at creation time. DynamoDB uses default encryption but requires CMK configuration for customer key control. You must verify encryption status for each service independently.

**Trap 4: "Using AWS Secrets Manager means my secrets are secure."** Secrets Manager secures the secret at rest and in transit. But if your IAM policy allows any EC2 instance in the account to call `secretsmanager:GetSecretValue` on any secret, the secret is accessible far more broadly than intended. The access control layer (IAM) is a separate customer responsibility that Secrets Manager does not solve on its own.

**Trap 5: "Network ACLs and security groups do the same thing."** They do not. Security groups are stateful (return traffic is automatically allowed) and attach to individual resources. NACLs are stateless (you must allow return traffic explicitly) and attach to subnets. Security groups have no explicit deny; NACLs do. Both are customer responsibilities, and they complement each other — they are not interchangeable.

## Summary

- Customer security responsibilities include IAM configuration (least privilege, MFA, key rotation), data encryption at rest and in transit for every relevant service, network security via security groups and NACLs, OS patching for all EC2 instances via Systems Manager Patch Manager, and secrets management via Secrets Manager or Parameter Store.
- AWS Security Hub provides a consolidated view of customer-side security control failures, benchmarked against CIS and AWS security standards — every finding is a gap the customer must close.
- Systems Manager Patch Manager allows fleet-wide patch compliance management and reporting, but it must be actively configured — it does not operate autonomously by default.
- Security groups (stateful, resource-level, allow-only) and NACLs (stateless, subnet-level, allow and deny) are complementary customer-configured network controls that work together to enforce network segmentation.
- Storing credentials in code, environment variables, or configuration files is a customer application security failure — AWS Secrets Manager and Parameter Store exist to eliminate this pattern.
- The common thread across all customer responsibilities: AWS provides the mechanism; the customer provides the decision, the configuration, and the ongoing maintenance.

## Examples

**Beginner:** A solo developer builds a personal project API on EC2. To keep things simple, they SSH into the instance using the root account with a password (no key pair), store their database password in the application's config.py file, and leave the security group open on all ports to avoid troubleshooting connection issues. Within 48 hours, an automated scanner finds the open SSH port, brute-forces the root password, and the instance becomes a cryptocurrency miner. Every failure here is a customer responsibility: no key-based authentication, credentials in a config file, and an overly permissive security group. AWS's physical infrastructure was never touched.

**Intermediate:** A mid-size SaaS company uses AWS Security Hub to run a weekly security posture review. Their security engineer filters Security Hub findings by severity (Critical and High) and by standard (CIS AWS Foundations Benchmark). They find three recurring issues: several EC2 instances are missing patches (Security Hub ingests Patch Manager compliance data), two S3 buckets have public access settings not blocked at the account level, and an IAM user with console access has no MFA enabled. The engineer creates Jira tickets for each finding, assigns them to the owning team, and tracks time-to-remediation. This is what operationalized customer security responsibility looks like — not a one-time audit, but a continuous cycle driven by tooling.

**Advanced:** A healthcare company building a telemedicine platform designs their security controls explicitly against the customer responsibility checklist. For IAM: they use AWS Organizations Service Control Policies to prevent any account in the organization from creating IAM users with long-term access keys — all human access flows through AWS IAM Identity Center (SSO) with MFA enforced. For encryption: they enable account-level EBS encryption with a customer-managed KMS key, use SSE-KMS on S3 with a dedicated key per data classification tier, and require SSL on all RDS instances via parameter group. For network: they implement a hub-and-spoke VPC design with centralized inspection using AWS Network Firewall, and restrict security groups to allow only necessary service-to-service communication by security group ID references. For patching: they run Patch Manager on a 72-hour critical patch SLA with Security Hub integration. This architecture is not just technically sound — it is audit-ready for HIPAA, with each control mapped to a HIPAA safeguard and evidenced continuously by AWS Config rules.

## Think About It

1. IAM is considered one of the highest-risk customer responsibilities in AWS. What specific property of IAM misconfigurations — compared to, say, an unpatched OS vulnerability — makes them so frequently the root cause of cloud breaches?
2. Encryption at rest protects data if physical storage media is improperly handled. Since customers never touch AWS hardware, what is the actual threat model that justifies enabling encryption at rest in AWS? Does understanding that threat model change how urgently you would prioritize it?
3. If you deployed a production three-tier application (load balancer, application servers, database) using all-default AWS settings — default VPC, default security groups, no NACL modifications — walk through every specific security gap your architecture would have and describe how an attacker would exploit each one.
4. Your team is deciding between enforcing encryption in transit at the security group level (blocking non-TLS ports) versus enforcing it at the application level (require SSL in the database connection string). What are the trade-offs, and which approach would you choose for a PCI DSS scoped environment?
5. You have a 200-instance EC2 fleet across 12 AWS accounts. How would you design a patch management program that gives you fleet-wide visibility into patch compliance and meets a 72-hour SLA for critical CVE remediation?

## Quick Check

**Q1.** A company wants to ensure that all EC2 instances across their AWS account have the latest OS security patches applied within 72 hours of release. Which AWS service is best suited to manage and report on patch compliance across the fleet?

- A) AWS Inspector
- B) AWS Systems Manager Patch Manager
- C) AWS Security Hub
- D) AWS Config

**Answer: B** — Systems Manager Patch Manager is the purpose-built service for OS patch compliance across EC2 instances. It allows you to define patch baselines, schedule patching via maintenance windows, and report on compliant versus non-compliant instances. Security Hub and Config can surface compliance findings, but Patch Manager drives the actual patching workflow.

**Q2.** Which of the following is a customer responsibility when using Amazon RDS?

- A) Patching the underlying operating system of the RDS host
- B) Updating the database engine version when AWS releases a security patch
- C) Configuring security group rules to restrict which resources can connect to the database
- D) Managing the physical storage hardware that holds database data

**Answer: C** — With RDS, AWS manages OS patching, database engine patching, and hardware. The customer is responsible for network access controls — specifically, which security groups govern inbound connections to the RDS instance and on which port. Security group configuration is always a customer responsibility.

**Q3.** A developer is storing a production API key by setting it as an environment variable directly on an EC2 instance. Which customer security responsibility is being neglected, and what is the correct alternative?

- A) Physical security of the instance; use a Dedicated Host instead
- B) Hypervisor isolation; use a Nitro-based instance type
- C) Secrets management and application security; use AWS Secrets Manager or Parameter Store with KMS encryption
- D) Network security; store the key in a private S3 bucket instead

**Answer: C** — Storing credentials in environment variables on EC2 exposes them to anyone with instance access, metadata service access, or who can read user data and configuration. The correct approach is AWS Secrets Manager or Parameter Store — both store the secret encrypted at rest with KMS and allow the application to retrieve it at runtime via API call, with access controlled by IAM.

## What's Next

Next lesson covers the other side of the model — what AWS specifically handles below your visibility: physical data center security, the Nitro hypervisor, global network infrastructure, and the managed service software stacks you never touch.
