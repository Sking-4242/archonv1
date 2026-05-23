"""
compliance.py — Compliance standard metadata and rule-to-standard mapping.

Supported standards
-------------------
CIS     CIS AWS Foundations Benchmark v3.0
SOC2    SOC 2 Type II (Trust Services Criteria)
PCI     PCI DSS v4.0
HIPAA   HIPAA Security Rule
NIST    NIST Cybersecurity Framework 2.0
"""

from __future__ import annotations

# ─── Standard metadata ────────────────────────────────────────────────────────

STANDARDS: dict[str, dict] = {
    "CIS": {
        "id": "CIS",
        "name": "CIS AWS Foundations",
        "version": "v3.0",
        "description": (
            "Center for Internet Security AWS Foundations Benchmark. "
            "Prescriptive guidance for securing AWS accounts and services."
        ),
    },
    "SOC2": {
        "id": "SOC2",
        "name": "SOC 2 Type II",
        "version": "2017 TSC",
        "description": (
            "AICPA Trust Services Criteria covering security, availability, "
            "processing integrity, confidentiality, and privacy."
        ),
    },
    "PCI": {
        "id": "PCI",
        "name": "PCI DSS",
        "version": "v4.0",
        "description": (
            "Payment Card Industry Data Security Standard. Required for any "
            "system that stores, processes, or transmits cardholder data."
        ),
    },
    "HIPAA": {
        "id": "HIPAA",
        "name": "HIPAA Security Rule",
        "version": "45 CFR Part 164",
        "description": (
            "Health Insurance Portability and Accountability Act Security Rule. "
            "Required for systems handling protected health information (PHI)."
        ),
    },
    "NIST": {
        "id": "NIST",
        "name": "NIST CSF",
        "version": "2.0",
        "description": (
            "NIST Cybersecurity Framework 2.0. Voluntary guidance covering "
            "Govern, Identify, Protect, Detect, Respond, and Recover functions."
        ),
    },
}

ALL_STANDARD_IDS = list(STANDARDS.keys())

# ─── Rule → standard mapping ──────────────────────────────────────────────────
# Each entry maps a rule_id to the list of standards it satisfies.
# A finding tagged with ["CIS", "PCI"] means remediating it helps satisfy both.

COMPLIANCE_MAP: dict[str, list[str]] = {

    # ── Config rules ──────────────────────────────────────────────────────────

    "rds_publicly_accessible": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 2.3.2 — RDS instances should not be publicly accessible
    # PCI 1.3 — prohibit direct public access to cardholder data environment
    # HIPAA 164.312(e) — transmission security / access controls
    # NIST PR.AC — protect access to assets

    "rds_unencrypted": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 2.3.1 — RDS storage encryption should be enabled
    # PCI 3.5 — protect stored cardholder data with encryption
    # HIPAA 164.312(a)(2)(iv) — encryption and decryption of ePHI

    "rds_no_backup": ["SOC2", "PCI", "HIPAA", "NIST"],
    # PCI 12.3.2 — data recovery procedures
    # HIPAA 164.308(a)(7) — contingency plan / data backup plan
    # NIST RC.RP — recovery planning

    "rds_no_deletion_protection": ["SOC2", "HIPAA", "NIST"],
    # SOC2 A1.2 — availability / environmental protections
    # NIST PR.IP — resilience / configuration management

    "rds_no_reserved": [],
    # FinOps only — not a compliance control

    "ebs_unencrypted": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 2.2.1 — EBS volume encryption should be enabled
    # PCI 3.5 — protect stored data
    # HIPAA 164.312(a)(2)(iv) — encryption of ePHI at rest

    "ec2_imdsv2_optional": ["CIS", "NIST"],
    # CIS 5.6 — EC2 metadata service should require IMDSv2
    # NIST PR.AC — prevent SSRF-based credential theft

    "ec2_prev_gen": [],
    # Cost/performance only — not a compliance control

    "s3_no_encryption": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 2.1.1 — S3 bucket server-side encryption should be enabled
    # PCI 3.5 — protect stored cardholder data
    # HIPAA 164.312(a)(2)(iv) — encryption of ePHI

    "s3_versioning_off": ["SOC2", "PCI", "NIST"],
    # PCI 10.5.5 — protect audit trails from modification/deletion
    # SOC2 A1.2 — data availability
    # NIST PR.DS — data security / integrity

    "s3_no_block_public_access": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 2.1.5 — S3 bucket Block Public Access should be enabled
    # PCI 1.3 — restrict inbound traffic
    # HIPAA 164.312(e) — transmission/access security

    "lambda_no_tracing": ["SOC2", "NIST"],
    # SOC2 CC7.2 — monitoring / anomaly detection
    # NIST DE.CM — continuous monitoring

    "dynamodb_no_pitr": ["SOC2", "PCI", "HIPAA", "NIST"],
    # PCI 12.3.2 — recovery procedures
    # HIPAA 164.308(a)(7) — contingency plan
    # NIST RC.RP — recovery planning

    "alb_no_access_logging": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 3.x — logging and monitoring
    # PCI 10.2 — implement audit logs
    # HIPAA 164.312(b) — audit controls
    # NIST DE.CM / PR.PT — monitoring and audit logging

    # ── Topology rules ────────────────────────────────────────────────────────

    "exposed_database": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # PCI 1.3 — prohibit direct public access to database tier
    # HIPAA 164.312(e) — transmission security

    "orphaned_node": [],
    # Architecture quality only

    "missing_sg": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 5.x — security group configuration
    # PCI 1.2 — build firewall / router configurations

    "alb_no_targets": [],
    # Architecture quality only

    "missing_waf": ["PCI", "HIPAA", "NIST"],
    # PCI 6.4 — web application firewall for public-facing apps
    # NIST PR.PT — protective technology

    "lambda_no_dlq": ["SOC2", "NIST"],
    # SOC2 CC7 — system availability and monitoring
    # NIST RS.AN — response analysis

    "no_multi_az": ["SOC2", "HIPAA", "NIST"],
    # SOC2 A1.1 / A1.2 — availability commitments
    # HIPAA 164.308(a)(7) — contingency plan
    # NIST PR.IP — resilience

    "rds_in_public_subnet": ["CIS", "PCI", "HIPAA", "NIST"],
    # PCI 1.3 — DMZ / network segmentation
    # HIPAA 164.312(e) — access controls

    "missing_secrets_manager": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS — rotate credentials regularly
    # PCI 8.3 — secure individual non-consumer authentication
    # HIPAA 164.312(d) — authentication / credential management

    "missing_cloudwatch": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 3.x — logging and monitoring
    # PCI 10.2 — implement audit logs
    # HIPAA 164.312(b) — audit controls
    # NIST DE.CM — continuous monitoring

    # ── Security group rules ──────────────────────────────────────────────────

    "sg_open_all": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 5.1 — no security group allows unrestricted ingress
    # PCI 1.2.1 — restrict inbound/outbound traffic

    "sg_open_ssh": ["CIS", "SOC2", "PCI", "NIST"],
    # CIS 5.2 — no security group allows unrestricted ingress on port 22
    # PCI 1.2.1 — restrict access to known IP ranges

    "sg_open_rdp": ["CIS", "SOC2", "PCI", "NIST"],
    # CIS 5.3 — no security group allows unrestricted ingress on port 3389
    # PCI 1.2.1 — restrict access

    "sg_open_db_port": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # PCI 1.2.1 / 1.3 — database ports should not be publicly accessible
    # HIPAA 164.312(e) — access control

    "sg_http_not_https": ["PCI", "HIPAA", "NIST"],
    # PCI 4.2.1 — strong cryptography for data in transit
    # HIPAA 164.312(e)(2)(ii) — encryption in transit

    "sg_ephemeral_ports": ["CIS", "PCI", "NIST"],
    # CIS 5.1 — restrict wide port ranges
    # PCI 1.2.1 — limit inbound/outbound traffic

    "sg_open_telnet": ["CIS", "PCI", "HIPAA", "NIST"],
    # CIS — telnet is plaintext / insecure protocol
    # PCI 2.2.7 — all non-console admin access must be encrypted

    "sg_open_admin_port": ["CIS", "SOC2", "PCI", "NIST"],
    # CIS — restrict management interface access
    # PCI 1.2.1 — restrict inbound traffic

    # ── IAM rules ─────────────────────────────────────────────────────────────

    "iam_admin_policy": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 1.16 — ensure IAM policies that allow full "*:*" admin privileges not attached
    # PCI 7.2 — establish access control systems
    # HIPAA 164.312(a)(1) — access control

    "iam_wildcard_sensitive": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 1.16 — least-privilege IAM
    # PCI 7.2 — need-to-know access
    # HIPAA 164.312(a)(1) — minimum necessary access

    # ── New standard-specific rules (added in compliance build) ───────────────

    "cloudtrail_not_enabled": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 3.1 — CloudTrail should be enabled and configured
    # PCI 10.2 — implement audit logs for all system components
    # HIPAA 164.312(b) — hardware/software/procedural audit controls
    # NIST DE.CM — monitor for cybersecurity events

    "vpc_flow_logs_disabled": ["CIS", "SOC2", "PCI", "NIST"],
    # CIS 3.9 — VPC flow logging should be enabled in all VPCs
    # PCI 10.2.1 — log all individual user access to cardholder data
    # NIST DE.CM — network activity monitoring

    "kms_no_cmk": ["PCI", "HIPAA"],
    # PCI 3.7.2 — key management procedures for encryption keys
    # HIPAA 164.312(a)(2)(iv) — encryption / decryption controls (CMK provides key ownership)

    "waf_required_on_public_alb": ["PCI", "HIPAA", "NIST"],
    # PCI 6.4 — web application firewall required for public-facing web apps
    # NIST PR.PT-3 — principle of least functionality
    # ── ElastiCache rules ─────────────────────────────────────────────────────

    "elasticache_no_encryption_rest": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # PCI ElastiCache.5 — encryption at rest required
    # HIPAA 164.312(a)(2)(iv) — encryption/decryption of ePHI

    "elasticache_no_encryption_transit": ["PCI", "HIPAA", "NIST"],
    # PCI ElastiCache.5 — encryption in transit required
    # HIPAA 164.312(e)(2)(ii) — encryption in transit

    "elasticache_no_auth": ["PCI"],
    # PCI ElastiCache.6 — Redis clusters should use Redis AUTH

    "elasticache_no_backup": ["SOC2", "HIPAA", "NIST"],
    # HIPAA 164.308(a)(7) — contingency plan / data backup
    # NIST RC.RP — recovery planning

    # ── SQS rules ─────────────────────────────────────────────────────────────

    "sqs_no_encryption": ["CIS", "HIPAA"],
    # CIS — encryption of data at rest
    # HIPAA 164.312(a)(2)(iv) — encryption of ePHI

    "sqs_no_dlq": ["SOC2", "NIST"],
    # SOC2 CC7 — system availability / monitoring
    # NIST RS.AN — response analysis

    # ── SNS rules ─────────────────────────────────────────────────────────────

    "sns_no_encryption": ["CIS", "HIPAA"],
    # CIS — encryption of data at rest
    # HIPAA 164.312(a)(2)(iv) — encryption of ePHI at rest

    # ── CloudFront rules ──────────────────────────────────────────────────────

    "cloudfront_no_https": ["PCI"],
    # PCI CloudFront.3 — CloudFront should require HTTPS

    "cloudfront_no_waf": ["PCI", "NIST"],
    # PCI CloudFront.6 / 6.4 — web application firewall required for public-facing apps
    # NIST PR.PT-3 — principle of least functionality

    "cloudfront_no_logging": ["PCI", "SOC2", "NIST"],
    # PCI CloudFront.5 / 10.2 — access logging required
    # NIST DE.CM — continuous monitoring

    # ── EKS rules ─────────────────────────────────────────────────────────────

    "eks_public_endpoint": ["PCI", "NIST"],
    # PCI EKS.1 — EKS cluster endpoint should not be publicly accessible
    # NIST PR.AC — limit access to assets

    "eks_no_logging": ["PCI", "NIST"],
    # PCI EKS.8 — EKS clusters should have audit logging enabled
    # NIST DE.CM — monitor for cybersecurity events

    # ── KMS rules ─────────────────────────────────────────────────────────────

    "kms_no_rotation": ["CIS", "PCI"],
    # CIS 3.6 — ensure rotation for customer created CMKs is enabled
    # PCI KMS.4 — key rotation required

    # ── S3 rules ──────────────────────────────────────────────────────────────

    "s3_no_ssl_policy": ["CIS", "SOC2", "PCI", "HIPAA"],
    # CIS 2.1.1 — ensure S3 bucket policy denies non-HTTPS requests
    # PCI S3.5 — bucket policies should deny non-HTTPS requests
    # HIPAA 164.312(e)(2)(ii) — encryption in transit

    # ── CloudTrail rules ──────────────────────────────────────────────────────

    "cloudtrail_no_encryption": ["CIS", "PCI", "HIPAA"],
    # CIS 3.5 — ensure CloudTrail logs are encrypted at rest using KMS
    # PCI CloudTrail.2 / 10.5 — protect audit trail integrity
    # HIPAA 164.312(b) — audit controls

    # ── Lambda rules ──────────────────────────────────────────────────────────

    "lambda_public_access": ["PCI", "HIPAA"],
    # PCI Lambda.1 — Lambda function policies should prohibit public access
    # HIPAA 164.312(a)(1) — access control

    "lambda_no_vpc": ["PCI"],
    # PCI Lambda.3 — Lambda functions should be in a VPC

    # ── EFS rules ─────────────────────────────────────────────────────────────

    "efs_no_encryption": ["SOC2", "PCI", "HIPAA", "NIST"],
    # HIPAA 164.312(a)(2)(iv) — encryption of ePHI at rest

    # ── ALB rules ─────────────────────────────────────────────────────────────

    "alb_http_no_redirect": ["PCI", "HIPAA"],
    # PCI ELB.1 — ALB should be configured to redirect HTTP to HTTPS
    # HIPAA 164.312(e)(2)(ii) — encryption in transit

    # ── Redshift rules ────────────────────────────────────────────────────────

    "redshift_no_tls": ["PCI"],
    # PCI Redshift.2 — Redshift clusters should require TLS/SSL

    # ── RDS logging rules ─────────────────────────────────────────────────────

    "rds_no_logging": ["PCI", "HIPAA"],
    # PCI RDS.9 — RDS database instances should publish logs to CloudWatch
    # HIPAA 164.312(b) — audit controls

    # ── IAM rules ─────────────────────────────────────────────────────────────

    "iam_no_resource_constraint": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 1.16 — least-privilege IAM
    # PCI 7.2 — access control systems based on need-to-know
    # HIPAA 164.312(a)(1) — minimum necessary access

    "iam_inline_policy": ["CIS", "HIPAA"],
    # CIS — prefer managed policies over inline for auditability
    # HIPAA 164.308(a)(3)(ii) — workforce clearance and authorization

    # ── Secrets Manager rules ─────────────────────────────────────────────────

    "secrets_no_rotation": ["PCI", "HIPAA"],
    # PCI SecretsManager.1 — Secrets Manager secrets should have rotation enabled
    # HIPAA 164.312(d) — authentication / credential management

    # ── Network rules ─────────────────────────────────────────────────────────

    "default_sg_unrestricted": ["CIS", "PCI"],
    # CIS 5.2 — ensure the default security group restricts all traffic
    # PCI EC2.2 — VPC default security group should not allow inbound/outbound traffic

    "subnet_auto_public_ip": ["PCI", "HIPAA"],
    # PCI EC2.15 — subnets should not automatically assign public IP addresses
    # HIPAA 164.312(e) — transmission security / access controls

    # ── FinOps rules ──────────────────────────────────────────────────────────
    "cloudwatch_no_log_retention": ["SOC2", "NIST"],
    # SOC2 CC7.2 — log management and monitoring controls
    # NIST SP 800-92 — guide to computer security log management (retention requirements)

    # ── Previously unmapped security rules ────────────────────────────────────
    "aurora_unencrypted": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # Same standard set as rds_unencrypted — Aurora is a managed RDS engine
    # CIS 2.3.1 / PCI Req 3.4 / HIPAA 164.312(a)(2)(iv) / NIST SC-28

    "aurora_no_backup": ["SOC2", "PCI", "HIPAA"],
    # SOC2 A1.2 — availability and recovery commitments
    # PCI Req 12.10.1 — backup and recovery procedures
    # HIPAA 164.308(a)(7)(ii) — data backup plan

    "redshift_unencrypted": ["CIS", "SOC2", "PCI", "HIPAA", "NIST"],
    # CIS 2.1.1 — ensure Redshift clusters are encrypted
    # PCI Req 3.4 — protect cardholder data at rest
    # HIPAA 164.312(a)(2)(iv) — encryption of data at rest

    "direct_internet_compute": ["CIS", "SOC2", "PCI", "NIST"],
    # CIS 5.4 — ensure no EC2 instances are reachable directly from internet
    # PCI Req 1.3 — prohibit direct public access between internet and cardholder data environment
    # NIST SC-7 — boundary protection / network segmentation

    "missing_iam": ["SOC2", "PCI", "HIPAA", "NIST"],
    # SOC2 CC6.1 — logical and physical access controls
    # PCI Req 7 — restrict access to cardholder data by business need to know
    # HIPAA 164.312(a)(1) — access control
    # NIST AC-3 — access enforcement

    "nat_gateway_missing": ["SOC2", "NIST"],
    # SOC2 CC6.6 — security measures against threats from outside system boundaries
    # NIST SC-7 — boundary protection (private subnets require controlled egress)

    "nat_single_az": ["SOC2"],
    # SOC2 A1.1 — availability: capacity and performance commitments
    # Single NAT gateway is a single point of failure for private subnet egress

    "alb_single_az": ["SOC2", "PCI"],
    # SOC2 A1.1 — availability commitments (multi-AZ required for resilience)
    # PCI ELB.12 — application load balancers should be configured for multi-AZ

    "sg_open_ftp": ["CIS", "PCI", "NIST"],
    # CIS 5.3 — ensure no security groups allow ingress from 0.0.0.0/0 to FTP ports
    # PCI Req 1.2.1 — restrict inbound and outbound traffic to only that required
    # NIST SC-7 — boundary protection

    "sg_open_smtp": ["CIS", "PCI"],
    # CIS — ensure no security groups allow ingress from 0.0.0.0/0 to SMTP
    # PCI Req 1.2.1 — restrict inbound traffic on mail relay ports

    "sg_open_pop3_imap": ["CIS", "PCI"],
    # CIS — ensure no security groups allow ingress from 0.0.0.0/0 to POP3/IMAP
    # PCI Req 1.2.1 — restrict inbound traffic on email retrieval ports

    # ── New topology compliance rules ─────────────────────────────────────────
    "cloudtrail_not_enabled": ["CIS", "SOC2", "PCI", "HIPAA"],
    # CIS 3.1–3.4 — ensure CloudTrail is enabled in all regions
    # SOC2 CC7.2 — monitoring of system components
    # PCI Req 10 — track and monitor all access to network resources
    # HIPAA 164.312(b) — audit controls

    "vpc_flow_logs_disabled": ["CIS", "SOC2", "NIST"],
    # CIS 2.9 — ensure VPC flow logging is enabled in all VPCs
    # SOC2 CC7.2 — monitoring controls
    # NIST SI-4 — information system monitoring

    "kms_no_cmk": ["PCI", "HIPAA"],
    # PCI DSS Req 3.5 — protect keys used to secure cardholder data
    # HIPAA 164.312(a)(2)(iv) — encryption and decryption

    "waf_required_on_public_alb": ["PCI", "HIPAA", "SOC2"],
    # PCI Req 6.6 — address new threats and vulnerabilities on public-facing web applications
    # HIPAA 164.312(e)(2)(i) — encryption of data in transit / application-layer protection
    # SOC2 CC6.6 — security measures against network threats
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_standards_for_rule(rule_id: str) -> list[str]:
    """Return the list of standard IDs a given rule satisfies."""
    return COMPLIANCE_MAP.get(rule_id, [])


def filter_findings_by_standard(findings: list, standard: str) -> list:
    """Return only findings tagged with the given standard code.
    If standard is 'all' or None, return all findings unchanged."""
    if not standard or standard.upper() == "ALL":
        return findings
    code = standard.upper()
    return [f for f in findings if code in (f.standards if hasattr(f, "standards") else f.get("standards", []))]


def standards_summary(findings: list, standard: str | None = None) -> dict[str, int]:
    """Return a count of findings per standard for the given finding list."""
    counts: dict[str, int] = {sid: 0 for sid in ALL_STANDARD_IDS}
    for f in findings:
        stds = f.standards if hasattr(f, "standards") else f.get("standards", [])
        for s in stds:
            if s in counts:
                counts[s] += 1
    if standard and standard.upper() != "ALL":
        return {standard.upper(): counts.get(standard.upper(), 0)}
    return counts
en finding list."""
    counts: dict[str, int] = {sid: 0 for sid in ALL_STANDARD_IDS}
    for f in findings:
        stds = f.standards if hasattr(f, "standards") else f.get("standards", [])
        for s in stds:
            if s in counts:
                counts[s] += 1
    if standard and standard.upper() != "ALL":
        return {standard.upper(): counts.get(standard.upper(), 0)}
    return counts
 access control
    # NIST AC-3 — access enforcement

    "nat_gateway_missing": ["SOC2", "NIST"],
    # SOC2 CC6.6 — security measures against threats from outside system boundaries
    # NIST SC-7 — boundary protection (private subnets require controlled egress)

    "nat_single_az": ["SOC2"],
    # SOC2 A1.1 — availability: capacity and performance commitments
    # Single NAT gateway is a single point of failure for private subnet egress

    "alb_single_az": ["SOC2", "PCI"],
    # SOC2 A1.1 — availability commitments (multi-AZ required for resilience)
    # PCI ELB.12 — application load balancers should be configured for multi-AZ

    "sg_open_ftp": ["CIS", "PCI", "NIST"],
    # CIS 5.3 — ensure no security groups allow ingress from 0.0.0.0/0 to FTP ports
    # PCI Req 1.2.1 — restrict inbound and outbound traffic to only that required
    # NIST SC-7 — boundary protection

    "sg_open_smtp": ["CIS", "PCI"],
    # CIS — ensure no security groups allow ingress from 0.0.0.0/0 to SMTP
    # PCI Req 1.2.1 — restrict inbound traffic on mail relay ports

    "sg_open_pop3_imap": ["CIS", "PCI"],
    # CIS — ensure no security groups allow ingress from 0.0.0.0/0 to POP3/IMAP
    # PCI Req 1.2.1 — restrict inbound traffic on email retrieval ports

    # ── New topology compliance rules ─────────────────────────────────────────
    "cloudtrail_not_enabled": ["CIS", "SOC2", "PCI", "HIPAA"],
    # CIS 3.1-3.4 — ensure CloudTrail is enabled in all regions
    # SOC2 CC7.2 — monitoring of system components
    # PCI Req 10 — track and monitor all access to network resources
    # HIPAA 164.312(b) — audit controls

    "vpc_flow_logs_disabled": ["CIS", "SOC2", "NIST"],
    # CIS 2.9 — ensure VPC flow logging is enabled in all VPCs
    # SOC2 CC7.2 — monitoring controls
    # NIST SI-4 — information system monitoring

    "kms_no_cmk": ["PCI", "HIPAA"],
    # PCI DSS Req 3.5 — protect keys used to secure cardholder data
    # HIPAA 164.312(a)(2)(iv) — encryption and decryption

    "waf_required_on_public_alb": ["PCI", "HIPAA", "SOC2"],
    # PCI Req 6.6 — address new threats and vulnerabilities on public-facing web applications
    # HIPAA 164.312(e)(2)(i) — application-layer protection
    # SOC2 CC6.6 — security measures against network threats
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def get_standards_for_rule(rule_id: str) -> list[str]:
    """Return the list of standard IDs a given rule satisfies."""
    return COMPLIANCE_MAP.get(rule_id, [])


def filter_findings_by_standard(findings: list, standard: str) -> list:
    """Return only findings tagged with the given standard code.
    If standard is 'all' or None, return all findings unchanged."""
    if not standard or standard.upper() == "ALL":
        return findings
    code = standard.upper()
    return [f for f in findings if code in (f.standards if hasattr(f, "standards") else f.get("standards", []))]


def standards_summary(findings: list, standard: str | None = None) -> dict[str, int]:
    """Return a count of findings per standard for the given finding list."""
    counts: dict[str, int] = {sid: 0 for sid in ALL_STANDARD_IDS}
    for f in findings:
        stds = f.standards if hasattr(f, "standards") else f.get("standards", [])
        for s in stds:
            if s in counts:
                counts[s] += 1
    if standard and standard.upper() != "ALL":
        return {standard.upper(): counts.get(standard.upper(), 0)}
    return counts
rd.upper(), 0)}
    return counts
