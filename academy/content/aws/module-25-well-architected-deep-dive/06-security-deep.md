---
title: "Security Pillar Deep Dive"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Security Pillar Deep Dive

## Overview

The Well-Architected Security pillar defines how to protect data, systems, and assets while delivering business value. Security in AWS is not a single control or a perimeter wall — it is a layered, automated discipline that assumes every layer can be breached and asks: what stops an attacker who has already gotten past the previous layer? This lesson builds on the introductory coverage in Module 6 and Module 15 and goes deeper into the mechanisms, decision logic, and automation patterns that distinguish a well-architected system from a merely functional one.

The problem the Security pillar addresses is the asymmetry between defenders and attackers. A defender must get every control right, every time. An attacker needs only one gap. AWS's answer is **defense in depth**: implement independent security controls at every layer — identity, network, application, data — so that a failure at one layer does not compromise the entire system. Each layer assumes the one above it has already been breached. This model also enables detection and response: when each layer emits signals, a compromise at one layer is visible before it propagates.

For SAA-C03, expect questions on IAM policy evaluation, KMS key types, the shared responsibility model, GuardDuty vs. Security Hub vs. Inspector, and WAF vs. Shield. SAP-C02 goes further into AWS Organizations SCPs, permission boundaries for delegated admins, ABAC, OIDC federation for CI/CD pipelines, automated incident response patterns, and multi-account security architectures. After this lesson, you will be able to map a security requirement to the correct AWS service, identify common security misconfigurations, and design automated remediation workflows.

---

## Core Concepts

### The 7 Security Design Principles

The Well-Architected Security pillar organizes guidance around seven design principles. Understanding the reasoning behind each principle helps you apply them correctly in exam scenarios rather than just reciting them.

**1. Implement a strong identity foundation.** Every action in AWS is an API call with a principal (who), an action (what), and a resource (where). If identity is weak — shared credentials, overly permissive roles, long-lived access keys — every other layer is compromised before an attacker even reaches it. Use IAM Identity Center for centralized human access, service roles for workloads, and eliminate long-lived access keys entirely.

**2. Enable traceability.** You cannot respond to what you cannot see. Every API call must be logged (CloudTrail), every resource configuration recorded (Config), and every finding aggregated (Security Hub). Traceability is both a detective control and a compliance requirement. The exam often tests whether you know which service captures which type of event.

**3. Apply security at all layers.** Defense in depth means applying controls at the edge (WAF, Shield, CloudFront), the network (VPC, Security Groups, NACLs, Network Firewall), the compute tier (Systems Manager, IMDSv2, no SSH), and the data tier (KMS, S3 Object Lock, Macie). Each layer is independent.

**4. Automate security best practices.** Manual security reviews do not scale and introduce lag. Security should be codified: SCPs define what accounts can do by policy; AWS Config rules detect drift automatically; EventBridge + Lambda can remediate findings without human intervention. Automation also removes human error from routine security operations.

**5. Protect data in transit and at rest.** All data must be encrypted. In transit means TLS 1.2+ enforced via policy (S3 bucket policy `aws:SecureTransport`, ALB HTTPS listener). At rest means KMS-encrypted EBS, S3 SSE-KMS, RDS encryption enabled at launch. The exam tests the difference between SSE-S3 (AWS-managed), SSE-KMS (customer-controlled key), and SSE-C (customer-provided key).

**6. Keep people away from data.** Direct human access to production data is a security risk — accidental deletion, exfiltration, compliance violation. Use Systems Manager Session Manager instead of SSH (no bastion, no key pairs, full session logging). Use S3 signed URLs for temporary object access instead of making buckets public. Use database query tools that log every query. Minimize who can access production.

**7. Prepare for security events.** Assume that a security incident will occur. Build and test IR playbooks before an incident. Use AWS GameDays or simulated exercises. Ensure your team knows how to isolate a compromised instance (remove from ASG, attach restrictive Security Group, snapshot for forensics) before it is needed. Pre-provision IR tooling.

---

### Identity and Access: Beyond Basic IAM

Basic IAM — inline policies, `AdministratorAccess`, long-lived access keys — is the most common source of AWS security failures. Well-architected identity goes much further.

**IAM Identity Center (SSO)** is the recommended solution for human access to AWS accounts. It integrates with your identity provider (Okta, Azure AD, or the built-in directory), provides centralized permission sets managed as code, and issues short-lived credentials via federation. Users never have long-lived IAM user credentials. Centralized means a single revocation point: disable a user in your IdP and access to all AWS accounts is gone.

**Service Control Policies (SCPs)** are organization-level guardrails applied via AWS Organizations. SCPs define the maximum permissions available in an account — they do not grant permissions, they restrict them. A `Deny` in an SCP cannot be overridden by any IAM policy in the account, including the root user. Use SCPs to prevent leaving AWS (block services not approved for use), prevent disabling security controls (block CloudTrail from being turned off), and enforce region restrictions.

**Permission boundaries** constrain the maximum permissions a principal can grant when creating new IAM roles. They are used for delegated administration: a developer can create IAM roles for their application, but the permission boundary ensures those roles can never have more permissions than what the developer themselves has. This enables self-service without privilege escalation.

**Attribute-Based Access Control (ABAC)** uses tags on both the IAM principal and the resource to make authorization decisions. A policy like `Allow s3:GetObject if resource:Environment == principal:Environment` dynamically restricts access based on matching attributes. ABAC scales better than role-per-project RBAC because you don't need a new policy for every new project — the tag drives the decision.

**OIDC federation for CI/CD** (GitHub Actions, GitLab CI) eliminates static access keys in CI/CD pipelines. The pipeline authenticates to an OIDC provider configured in IAM and receives a temporary role credential scoped to the specific repo, branch, and workflow. There is no long-lived secret to rotate or leak.

---

### Detection: Knowing When Something Is Wrong

Detection controls produce findings that feed investigation and response. AWS provides a layered detection stack; each service serves a different purpose.

**AWS CloudTrail** records every API call made in your account — who made it, what action, what resource, what IP address, what time. CloudTrail is the authoritative audit log. Enable CloudTrail in all regions with a multi-region trail; enable CloudTrail Lake for SQL-queryable event history. Exam trap: CloudTrail logs *management events* (control plane) by default; *data events* (S3 GetObject, Lambda Invoke) must be explicitly enabled and carry additional cost.

**AWS Config** records the configuration state of every resource and detects drift from expected configuration. Config Rules (managed or custom Lambda) continuously evaluate resources against compliance rules — e.g., "all S3 buckets must have block-public-access enabled." Config produces a compliance timeline, not just a point-in-time snapshot. Config is about *what* resources look like; CloudTrail is about *what happened*.

**Amazon GuardDuty** is a threat detection service that uses machine learning and threat intelligence feeds to identify malicious or unauthorized behavior — compromised credentials (unusual API calls from a Tor exit node), cryptocurrency mining (unusual EC2 network traffic patterns), S3 data exfiltration (high-volume GetObject from an unusual principal). GuardDuty operates from VPC Flow Logs, CloudTrail, DNS logs, and EKS audit logs without requiring you to configure log routing — you enable it and it works.

**AWS Security Hub** aggregates findings from GuardDuty, Inspector, Macie, Config, Firewall Manager, and third-party tools into a single normalized view using the AWS Security Finding Format (ASFF). Security Hub applies security standards (CIS AWS Foundations Benchmark, AWS Foundational Security Best Practices) and scores your overall security posture. In multi-account deployments, Security Hub in a designated administrator account aggregates findings from all member accounts.

**Amazon Detective** provides investigation capabilities for findings surfaced by GuardDuty. When GuardDuty raises a finding about a potentially compromised EC2 instance, Detective shows you a timeline of network activity, API calls, and associated IAM principals from that instance — building context automatically that would take hours to assemble manually.

---

### Infrastructure Protection

Infrastructure protection covers the network and compute tiers. The goal is to minimize the attack surface and ensure that even if one component is compromised, lateral movement is constrained.

**AWS WAF** (Web Application Firewall) inspects HTTP/HTTPS traffic at Layer 7 and blocks requests matching rules — SQL injection, cross-site scripting, rate limiting, IP reputation lists, geographic blocking, bot management. WAF attaches to CloudFront, ALB, API Gateway, or AppSync. Use AWS Managed Rules for common protections without writing rules yourself. WAF is your application-layer protection.

**AWS Shield** protects against DDoS attacks at Layers 3, 4, and 7. Shield Standard is automatic and free for all AWS customers — it mitigates volumetric UDP/TCP flood attacks against EC2 and ELB. Shield Advanced (paid) provides enhanced protection for CloudFront, Route 53, and Global Accelerator; dedicated DDoS response team access; cost protection for scaling events caused by a DDoS attack; and 24/7 proactive engagement.

**AWS Network Firewall** is a managed, stateful network firewall deployed inside your VPC. It goes beyond Security Groups and NACLs by providing deep packet inspection, intrusion detection/prevention (IDS/IPS) rules (Suricata-compatible), domain-based filtering (allow/deny by FQDN), and centralized traffic inspection for hub-and-spoke architectures. Use Network Firewall when you need perimeter-level control for egress traffic or east-west traffic between VPCs.

**VPC Security Groups and NACLs** are still foundational. Security Groups are stateful, instance-level firewalls — return traffic is automatically allowed. NACLs are stateless, subnet-level firewalls — both inbound and outbound rules must explicitly allow return traffic. The exam frequently tests the stateful/stateless distinction.

**Systems Manager Session Manager** replaces SSH and RDP for interactive access to EC2 instances. No inbound ports (443 outbound only from the instance to the SSM endpoint), no key pairs to manage, no bastion hosts, full session logging to CloudWatch Logs and S3. Session Manager is a preventive control (no open SSH ports) and a detective control (full audit trail) simultaneously.

---

### Data Protection

Data protection means ensuring that sensitive data is encrypted, classified, and access-controlled at rest and in transit — and that accidental or malicious exposure is detected.

**AWS KMS** (Key Management Service) is the foundation of encryption at rest across AWS. Customer Managed Keys (CMKs) give you control over key policy, key rotation, and usage auditing (via CloudTrail). AWS Managed Keys are managed by AWS on your behalf — simpler but less control. Key policies determine who can use and administer the key; IAM policies alone cannot grant KMS permissions without a permissive key policy. Understand multi-region KMS keys for cross-region encryption consistency (e.g., DynamoDB Global Tables, Aurora Global Database).

**S3 Object Lock** implements WORM (Write Once Read Many) storage. Objects in Compliance mode cannot be deleted or overwritten by anyone — including the root user — until the retention period expires. Governance mode allows users with specific IAM permissions to delete. Object Lock is required for SEC 17a-4 compliance, HIPAA audit log immutability, and ransomware protection (even if credentials are compromised, attackers cannot delete the locked objects).

**Amazon Macie** uses machine learning to discover and classify sensitive data in S3 — PII (names, addresses, SSNs, credit card numbers), PHI, financial data. Macie produces findings when it detects a bucket with PII that is publicly accessible, unencrypted, or shared with an unexpected account. This is your automated data classification layer.

---

### Incident Response Architecture

Preparation before an incident is the difference between a one-hour containment and a 72-hour breach investigation. An automated IR architecture detects, alerts, and remediates faster than any human workflow.

The foundational pattern is: **GuardDuty finding → EventBridge rule → Lambda function → remediation action**. A GuardDuty finding is published as an event to EventBridge. An EventBridge rule matches findings of a specific type or severity and invokes a Lambda function. The Lambda function performs the remediation action — isolating an EC2 instance, revoking IAM credentials, blocking an IP in WAF, or publishing to SNS for human escalation.

This pattern enables sub-minute response to common threat patterns without human intervention. The Lambda IR handler should: (1) parse the finding, (2) take the least-invasive effective action first, (3) preserve forensic state (snapshot EBS volumes before termination), (4) notify the security team, and (5) log all actions to a tamper-proof audit trail (CloudTrail + S3 Object Lock).

---

## Configuration Reference

### Security Hub Finding → EventBridge → Lambda Auto-Remediation

This pattern automatically isolates an EC2 instance when GuardDuty generates a high-severity finding (e.g., backdoor communication, credential compromise). The EventBridge rule triggers a Lambda function that moves the instance into a forensic security group.

```json
// EventBridge rule: match GuardDuty HIGH/CRITICAL findings for EC2 instances
// Save as: eventbridge-guardduty-ec2-rule.json
{
  "source": ["aws.guardduty"],
  "detail-type": ["GuardDuty Finding"],
  "detail": {
    "severity": [
      // Match severity 7.0–10.0 (HIGH and CRITICAL)
      // GuardDuty severity: LOW=1-3.9, MEDIUM=4.0-6.9, HIGH=7.0-10.0
      { "numeric": [">=", 7.0] }
    ],
    "type": [
      // Match findings that indicate active threat to EC2
      { "prefix": "Backdoor:EC2" },
      { "prefix": "CryptoCurrency:EC2" },
      { "prefix": "Trojan:EC2" },
      { "prefix": "UnauthorizedAccess:EC2" }
    ]
  }
}
```

```python
# lambda/isolate_ec2.py
# Lambda function: receive GuardDuty finding, snapshot EBS, isolate instance
#
# Required IAM permissions for the Lambda execution role:
#   ec2:DescribeInstances, ec2:CreateSnapshot, ec2:ModifyInstanceAttribute
#   ec2:DescribeSecurityGroups, ec2:CreateSecurityGroup
#   ec2:RevokeSecurityGroupIngress, ec2:RevokeSecurityGroupEgress
#   ec2:AuthorizeSecurityGroupIngress (none — forensic SG has no ingress)
#   sns:Publish
#   ssm:GetParameter  (to fetch FORENSIC_SG_ID and SNS_TOPIC_ARN)

import boto3
import json
import os
import logging
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

ec2 = boto3.client("ec2")
sns = boto3.client("sns")
ssm = boto3.client("ssm")


def get_parameter(name: str) -> str:
    """Fetch a value from SSM Parameter Store (SecureString or String)."""
    response = ssm.get_parameter(Name=name, WithDecryption=True)
    return response["Parameter"]["Value"]


def get_instance_id_from_finding(finding: dict) -> str | None:
    """
    Extract EC2 instance ID from a GuardDuty finding.
    GuardDuty places the resource in finding["detail"]["resource"].
    """
    resource = finding.get("detail", {}).get("resource", {})
    instance_details = resource.get("instanceDetails", {})
    return instance_details.get("instanceId")


def snapshot_instance_volumes(instance_id: str, finding_id: str) -> list[str]:
    """
    Create EBS snapshots for forensic preservation before isolation.
    Tags the snapshots with the GuardDuty finding ID for traceability.
    Returns a list of snapshot IDs.
    """
    response = ec2.describe_instances(InstanceIds=[instance_id])
    reservations = response["Reservations"]
    if not reservations:
        logger.warning(f"No reservation found for instance {instance_id}")
        return []

    snapshot_ids = []
    volumes = reservations[0]["Instances"][0].get("BlockDeviceMappings", [])

    for mapping in volumes:
        volume_id = mapping["Ebs"]["VolumeId"]
        snap = ec2.create_snapshot(
            VolumeId=volume_id,
            Description=f"Forensic snapshot — GuardDuty finding {finding_id}",
            TagSpecifications=[
                {
                    "ResourceType": "snapshot",
                    "Tags": [
                        {"Key": "Purpose", "Value": "ForensicIR"},
                        {"Key": "InstanceId", "Value": instance_id},
                        {"Key": "FindingId", "Value": finding_id},
                        {"Key": "CreatedBy", "Value": "AutoIR-Lambda"},
                        # Timestamp for retention lifecycle
                        {"Key": "SnapshotDate", "Value": datetime.utcnow().strftime("%Y-%m-%d")},
                    ],
                }
            ],
        )
        snapshot_ids.append(snap["SnapshotId"])
        logger.info(f"Created snapshot {snap['SnapshotId']} for volume {volume_id}")

    return snapshot_ids


def isolate_instance(instance_id: str, forensic_sg_id: str) -> None:
    """
    Replace all security groups on the instance with the forensic security group.
    The forensic SG has no inbound or outbound rules — complete network isolation.
    This does NOT terminate the instance so memory can be captured if needed.
    """
    ec2.modify_instance_attribute(
        InstanceId=instance_id,
        Groups=[forensic_sg_id],  # Replace ALL existing security groups
    )
    logger.info(f"Isolated {instance_id} — replaced SGs with forensic SG {forensic_sg_id}")


def lambda_handler(event: dict, context) -> dict:
    """
    Entry point. Receives an EventBridge event wrapping a GuardDuty finding.
    1. Extract instance ID
    2. Snapshot EBS volumes (forensic preservation)
    3. Replace security groups with forensic SG (network isolation)
    4. Notify security team via SNS
    """
    logger.info("Received event: %s", json.dumps(event))

    finding_id = event.get("detail", {}).get("id", "unknown")
    finding_type = event.get("detail", {}).get("type", "unknown")
    severity = event.get("detail", {}).get("severity", 0)
    account_id = event.get("account", "unknown")
    region = event.get("region", "unknown")

    instance_id = get_instance_id_from_finding(event)
    if not instance_id:
        logger.warning("No EC2 instance ID found in finding %s — skipping", finding_id)
        return {"statusCode": 200, "body": "no_instance_id"}

    # Retrieve config from SSM Parameter Store (avoids hardcoding ARNs in Lambda env vars)
    forensic_sg_id = get_parameter("/security/ir/forensic-sg-id")
    sns_topic_arn = get_parameter("/security/ir/sns-topic-arn")

    # Step 1: preserve forensic state before any network changes
    snapshot_ids = snapshot_instance_volumes(instance_id, finding_id)

    # Step 2: isolate the instance (no network access in or out)
    isolate_instance(instance_id, forensic_sg_id)

    # Step 3: notify the security team with full context
    message = {
        "summary": f"EC2 AUTO-ISOLATED — GuardDuty finding",
        "finding_id": finding_id,
        "finding_type": finding_type,
        "severity": severity,
        "instance_id": instance_id,
        "account_id": account_id,
        "region": region,
        "snapshots_created": snapshot_ids,
        "action_taken": "Instance security groups replaced with forensic SG (no inbound/outbound). EBS snapshots created.",
        "next_steps": [
            "Review CloudTrail for API calls from this instance in the past 24h",
            "Check IAM credentials associated with the instance role for anomalous usage",
            "Use Amazon Detective to visualize activity timeline",
            "Consider capturing memory before termination",
        ],
    }

    sns.publish(
        TopicArn=sns_topic_arn,
        Subject=f"[AUTO-IR] EC2 Isolated: {instance_id} — {finding_type}",
        Message=json.dumps(message, indent=2),
    )

    logger.info("IR complete for %s. Snapshots: %s", instance_id, snapshot_ids)
    return {
        "statusCode": 200,
        "body": json.dumps({
            "instance_id": instance_id,
            "action": "isolated",
            "snapshots": snapshot_ids,
        }),
    }
```

```yaml
# cloudformation/forensic-sg.yaml
# Creates the forensic security group used by the IR Lambda.
# No ingress, no egress — complete isolation. Deployed once per region.
AWSTemplateFormatVersion: "2010-09-09"
Description: "Forensic security group for EC2 incident response isolation"

Parameters:
  VpcId:
    Type: AWS::EC2::VPC::Id
    Description: VPC where the forensic SG will be created

Resources:
  ForensicSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: "IR Forensic — no inbound, no outbound. Applied by auto-IR Lambda."
      VpcId: !Ref VpcId
      # Intentionally no SecurityGroupIngress or SecurityGroupEgress properties.
      # AWS creates a default allow-all egress rule; we remove it explicitly below.
      Tags:
        - Key: Name
          Value: forensic-isolation-sg
        - Key: Purpose
          Value: IncidentResponse

  # Remove the default allow-all egress rule that AWS adds automatically
  ForensicSGEgressRevoke:
    Type: AWS::EC2::SecurityGroupEgress
    Properties:
      GroupId: !Ref ForensicSecurityGroup
      IpProtocol: "-1"       # All protocols
      CidrIp: "0.0.0.0/0"   # All destinations
      # This resource REMOVES the implicit egress rule by declaring it,
      # which prevents any outbound traffic from an isolated instance.
      Description: "Revoke default egress — forensic SG must have no outbound"

  # Store the SG ID in Parameter Store for the IR Lambda to retrieve
  ForensicSGParameter:
    Type: AWS::SSM::Parameter
    Properties:
      Name: /security/ir/forensic-sg-id
      Type: String
      Value: !Ref ForensicSecurityGroup
      Description: "Forensic SG ID used by the auto-IR Lambda for EC2 isolation"

Outputs:
  ForensicSGId:
    Value: !Ref ForensicSecurityGroup
    Description: "Forensic security group ID"
    Export:
      Name: !Sub "${AWS::StackName}-ForensicSGId"
```

---

## How to Decide

### Choosing the Right Security Service

| Requirement | Service | Why |
|---|---|---|
| Audit log of all API calls | CloudTrail | Records every control-plane action with principal, resource, time |
| Detect S3 data events (GetObject, PutObject) | CloudTrail data events | Not enabled by default — must be configured explicitly |
| Detect configuration drift from baseline | AWS Config | Continuous compliance evaluation against defined rules |
| Detect active threats (malware, C2, mining) | GuardDuty | Behavioral anomaly + threat intel, no agent required |
| Aggregate findings from all security services | Security Hub | Normalizes ASFF findings; applies compliance standards |
| Investigate a specific GuardDuty finding | Amazon Detective | Automated timeline and network graph for that finding |
| Discover PII in S3 buckets | Amazon Macie | ML-based classification of S3 object content |
| Protect web app from SQLi/XSS | AWS WAF | Layer 7 inspection; rule-based blocking |
| Protect against DDoS at L3/L4 | Shield Standard (free) or Shield Advanced | Auto-mitigation for volumetric attacks |
| Deep packet inspection / IPS for VPC | Network Firewall | Suricata-compatible stateful engine inside VPC |
| Encrypt data at rest with customer key control | KMS CMK | Customer controls key policy, rotation, deletion window |
| Prevent deletion of audit logs | S3 Object Lock (Compliance) | WORM — root user cannot delete before retention period expires |
| Interactive EC2 access without SSH | Session Manager | No open ports, full session logging, IAM-controlled |
| Human access to multi-account AWS | IAM Identity Center | Centralized, federated, short-lived credentials |
| Org-wide permission guardrails | SCPs (Organizations) | Deny overrides all IAM policies in child accounts |

---

## How This Connects

- **AWS Organizations + SCPs** are the prerequisite for every multi-account security architecture. SCPs enforce guardrails that prevent individual accounts from disabling GuardDuty, CloudTrail, or Security Hub — making those detective controls tamper-proof even if an account is compromised.
- **EventBridge** is the integration backbone for automated security response. Every AWS security service (GuardDuty, Security Hub, Config, Macie) publishes findings as EventBridge events, enabling a unified event-driven remediation architecture regardless of which service detected the issue.
- **AWS Systems Manager** connects to infrastructure protection: Session Manager eliminates bastion hosts and SSH key management; Patch Manager automates OS patching to reduce vulnerability surface; Automation documents turn incident response runbooks into auditable, executable code.
- **AWS CloudFormation / CDK** enables security-as-code: deploy KMS keys, forensic security groups, Config rules, Security Hub standards, and IR Lambda functions as versioned, reviewable infrastructure. A security control that is not in code will drift from its intended state over time.

---

## Exam Traps

**Trap 1: "SCPs grant permissions to accounts."**
SCPs do not grant permissions — they restrict the maximum permissions available. An empty SCP (no statements) or a full-access SCP does not actually grant any IAM user permission to do anything; those permissions still come from IAM policies within the account. SCPs only constrain; IAM policies still must grant.

**Trap 2: "GuardDuty analyzes CloudTrail logs, so I don't need to enable CloudTrail separately."**
GuardDuty consumes CloudTrail events as an input, but it does not replace CloudTrail. You still need CloudTrail enabled to retain a queryable audit log, to feed AWS Config, and to meet compliance requirements. GuardDuty uses those signals to produce findings; it does not store the raw log data for you to query.

**Trap 3: "Security Hub is a threat detection service like GuardDuty."**
Security Hub does not detect threats itself. It aggregates, normalizes, and scores findings from other services (GuardDuty, Inspector, Macie, Config). The exam frequently presents scenarios where you need to "centralize security findings from all accounts" — the answer is Security Hub, not GuardDuty.

**Trap 4: "A KMS key policy `Allow *` makes the key publicly accessible."**
A KMS key policy that allows `Principal: "*"` is not the same as a public S3 bucket. All KMS API calls are still authenticated AWS API calls — `*` in a key policy means any authenticated IAM principal in the account (unless the policy also specifies `aws:PrincipalOrgID` or similar condition). Truly anonymous access to KMS is not possible.

**Trap 5: "WAF protects against DDoS and Shield protects against SQLi."**
These are swapped. WAF inspects Layer 7 application-level content (SQLi, XSS, bot traffic). Shield mitigates network and transport layer volumetric DDoS attacks (L3/L4 floods). Shield Advanced adds some L7 DDoS protection when combined with WAF, but they are distinct services with distinct purposes.

---

## Summary

- The Security pillar is organized around seven design principles: strong identity, traceability, layered controls, automation, encryption, minimizing human data access, and incident response readiness.
- Defense in depth means every layer (identity, network, application, data) has independent controls that assume the layers above and below it may be breached.
- AWS's detection stack has clear roles: CloudTrail for API audit, Config for configuration compliance, GuardDuty for active threat detection, Security Hub for aggregation and scoring, Detective for investigation, and Macie for data classification.
- Automated remediation via EventBridge + Lambda enables sub-minute response to security findings, with forensic state preservation before any destructive action.
- SCPs in AWS Organizations are the most powerful preventive control in a multi-account environment because they constrain even the account root user and cannot be overridden by any IAM policy within the account.
- The exam consistently tests the boundaries between similar-sounding services (WAF vs. Shield, GuardDuty vs. Security Hub vs. Inspector) — know what each service detects/does and what it does not.

---

## Examples

**Beginner:** A startup running a single AWS account with an ALB and RDS instance wants to improve their security posture with minimal operational overhead. They enable GuardDuty (one click, no agents, immediate threat detection), turn on Security Hub with the AWS Foundational Security Best Practices standard (automated compliance checks), and enforce IMDSv2 on all EC2 instances using an SCP deployed from AWS Organizations. They configure an S3 bucket with server-side encryption (SSE-KMS) and block-public-access settings. These steps alone address the most common misconfigurations with minimal maintenance burden.

**Intermediate:** A financial services company migrating to AWS needs to meet SOC 2 Type II requirements. They architect a multi-account structure with a security tooling account that is the delegated administrator for Security Hub, GuardDuty, and Macie. An SCP at the organization root prevents any account from disabling GuardDuty or CloudTrail. All findings are aggregated in the security account's Security Hub. EventBridge rules in each account forward findings to a central EventBus in the security account. A Lambda function in the security account matches findings against a severity-action matrix: HIGH findings for IAM principal anomalies trigger immediate credential revocation via the IAM API; CRITICAL findings for EC2 trigger the isolation pattern shown in the Configuration Reference. All CloudTrail logs flow to an S3 bucket with Object Lock enabled in Compliance mode for seven-year retention.

**Advanced:** A large enterprise running 200 AWS accounts needs a Zero Trust architecture for their multi-region SaaS platform. Every service-to-service call uses OIDC-based short-lived credentials rather than long-lived access keys. Developers access production via IAM Identity Center with attribute-based access control: a developer's `Department` tag in the IdP maps to the S3 bucket prefix they are allowed to access. Network traffic between VPCs flows through AWS Network Firewall with Suricata IPS rules that block known malicious domains and enforce TLS inspection. Macie runs automated sensitive data discovery jobs daily on every S3 bucket and publishes findings to Security Hub. A custom Lambda function correlates Config compliance findings with GuardDuty threat findings — an EC2 instance that is both "non-compliant with patch baseline" and "exhibiting cryptocurrency mining behavior" is automatically escalated to critical severity and triggers the full IR playbook.

---

## Think About It

1. Your company's on-call engineer receives 60 Security Hub findings per shift. Most are low severity. How would you redesign your Security Hub configuration to surface only actionable findings without losing coverage?

2. A GuardDuty finding indicates that an IAM role used by a Lambda function is making API calls from an unexpected IP address at 3 AM. What is your first action, and why does the order of actions matter for forensic integrity?

3. An SCP prevents all accounts in your organization from disabling GuardDuty. A developer argues this blocks a legitimate use case: a development account where they want to reduce costs. How do you accommodate this without weakening organizational security posture?

4. Your security team uses CloudTrail to investigate incidents. A forensic review reveals that an attacker deleted a critical S3 object 30 minutes before you were alerted. What architectural changes would prevent this specific failure mode in the future?

5. A new regulation requires that all encryption keys for customer data must be managed by your company, not AWS, and must be able to be revoked within one hour of a breach notification. Which KMS key type and which configuration satisfies this requirement, and what is the tradeoff?

---

## Quick Check

**Question 1:** Your company's compliance team requires that all API activity in every AWS account be auditable for seven years and that logs cannot be deleted by any principal, including the root user. Which combination of services meets this requirement?

A. CloudTrail logging to an S3 bucket with versioning enabled  
B. CloudTrail logging to an S3 bucket with S3 Object Lock in Governance mode  
C. CloudTrail logging to an S3 bucket with S3 Object Lock in Compliance mode and a seven-year retention period  
D. CloudTrail Lake with a seven-year retention configuration  

**Answer: C.** Object Lock in Compliance mode means no user — including the root user and AWS Support — can delete or shorten the retention period before the retention date. Versioning alone (A) allows deletion by any user with s3:DeleteObject permissions. Governance mode (B) allows users with the `s3:BypassGovernanceRetention` permission to delete. CloudTrail Lake (D) supports retention but without the legal tamper-proof guarantees of S3 Object Lock Compliance mode.

---

**Question 2:** A GuardDuty finding indicates `UnauthorizedAccess:EC2/SSHBruteForce` — an EC2 instance is attempting SSH connections to other hosts in the VPC. Which remediation action is most appropriate as an immediate automated response?

A. Terminate the EC2 instance immediately  
B. Remove the instance from its Auto Scaling group and place it in a forensic security group with no inbound or outbound rules  
C. Add a deny-all NACL to the subnet containing the instance  
D. Revoke all IAM permissions attached to the instance profile  

**Answer: B.** Removing the instance from the ASG prevents replacement, preserving it for forensic analysis. Replacing its security group with a forensic no-access SG stops the SSH brute-force traffic immediately without destroying forensic evidence. Terminating (A) destroys evidence before investigation. A deny-all NACL (C) affects the entire subnet, impacting other healthy instances. Revoking IAM permissions (D) addresses credential abuse but does not stop the network-level threat of SSH brute force.

---

**Question 3:** You need to give developers in a sandbox AWS account the ability to create IAM roles for their applications, but you want to ensure those roles can never have more permissions than the developers themselves possess. Which IAM feature should you implement?

A. Service control policies (SCPs)  
B. IAM permission boundaries  
C. Resource-based policies  
D. AWS Organizations tag policies  

**Answer: B.** Permission boundaries define the maximum permissions that can be granted by a principal when creating new roles. Even if a developer creates a role with AdministratorAccess, the permission boundary caps the effective permissions to only what the developer themselves is allowed. SCPs (A) apply at the account level, not at the individual developer level within an account. Resource-based policies (C) attach to specific resources, not to IAM principals. Tag policies (D) enforce consistent tagging but do not control permissions.

---

## What's Next

The next lesson covers the Reliability Pillar deep dive — building systems that recover automatically from failure, spanning single-component failures through full region outages. You will learn availability math, chaos engineering with AWS FIS, and how Route 53, Aurora Global Database, and DynamoDB Global Tables combine to achieve aggressive RTO/RPO targets.
