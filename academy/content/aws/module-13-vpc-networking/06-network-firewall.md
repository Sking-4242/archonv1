---
title: "AWS Network Firewall and Traffic Inspection"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Network Firewall and Traffic Inspection

## Overview

Security groups control which ports are open. NACLs add subnet-level stateless filtering. But neither can inspect the contents of a packet, identify a domain name, detect an exploit pattern in an HTTP payload, or block a known-malicious IP from a threat intelligence feed. When you need that level of inspection — stateful, deep-packet, signature-based — AWS Network Firewall is the managed service that fills the gap. It is a fully managed, stateful network firewall and intrusion prevention system (IPS) that you deploy inside your VPC, routing traffic through it before it reaches the internet or your application subnets.

AWS Network Firewall supports two rule types that work at different layers. Stateless rules perform fast 5-tuple matching (source IP, destination IP, source port, destination port, protocol) at line rate, similar to NACLs but more flexible and used primarily to pass clearly-safe traffic forward without full inspection. Stateful rules do the real work: they are Suricata-compatible, meaning you can write the same rule syntax used by the open-source Suricata IDS/IPS engine. Stateful rules support domain-name filtering (allow or block by FQDN), protocol detection, TLS SNI inspection, and full IPS signature sets for detecting known attack patterns, exploit attempts, and malware callbacks. The combination gives you a layered inspection engine that can enforce egress domain allowlists for malware prevention, block specific IP ranges from threat intel, and detect lateral movement patterns.

Network Firewall is one of several AWS network security tools and each operates at a different layer. AWS WAF handles Layer 7 HTTP/HTTPS attacks against web applications on ALBs, CloudFront, and API Gateway. AWS Shield provides DDoS protection — Standard automatically for all customers, Advanced as a paid tier for high-risk applications. AWS Firewall Manager provides a centralized control plane to deploy and enforce WAF rules, Shield Advanced protections, security group policies, and Network Firewall policies across an entire AWS Organization from a single account. Understanding how these four services complement each other — and which to use for which threat — is a recurring exam scenario.

---

## Core Concepts

### Stateless Rules — Fast Path for Known-Good Traffic

Stateless rules in Network Firewall evaluate each packet independently using 5-tuple matching: source IP, destination IP, source port, destination port, and protocol. They process packets before stateful rules and are evaluated in priority order. Each stateless rule results in one of three actions: Pass (send to stateful engine for further inspection), Drop (block the packet), or Forward to stateful (send for stateful inspection).

The primary use of stateless rules is to handle high-volume, clearly-safe traffic efficiently without burdening the stateful engine. For example: if you trust all traffic between two internal CIDR ranges and want to pass it without inspection overhead, a stateless rule handles that at line rate. Or you might use stateless rules to drop traffic on ports that should never appear (e.g., inbound port 23 — Telnet) before the stateful engine even sees it. Stateless rules do not maintain connection state — each packet is evaluated independently, which means they cannot make decisions based on whether a TCP connection was established from inside or outside.

### Stateful Rules — Suricata IPS, Domain Filtering, Protocol Detection

Stateful rules maintain connection state and support the full Suricata rule syntax. This means Network Firewall ships with Suricata-compatible rule groups that you can use directly, and you can write custom Suricata rules for specific detection or blocking requirements. AWS provides AWS-managed rule groups (Threat Signatures for known-malicious IPs and domains, Botnet command-and-control domains, exploit signatures) that are updated automatically.

The most operationally important stateful rule capability is **domain list rules** — a simplified rule type where you specify a list of fully qualified domain names and choose either ALLOW or DENY. A domain allowlist blocks all outbound HTTP/HTTPS except to approved domains. This is the primary technique for preventing malware callbacks: even if an instance is compromised, it cannot reach a command-and-control domain if that domain is not on the allowlist. Domain list rules work by inspecting the HTTP `Host` header for plaintext traffic and the TLS `SNI` (Server Name Indication) field for HTTPS — they do not require TLS decryption to block by hostname.

### Deployment Architecture — Firewall Subnets and Routing

Network Firewall is deployed into dedicated firewall subnets — one per Availability Zone. Each firewall subnet hosts a Network Firewall endpoint (a gateway-type endpoint, conceptually similar to an Interface Endpoint but for routing purposes). Traffic must be explicitly routed through these endpoints via route table manipulation — the firewall does not intercept traffic automatically.

The routing pattern for egress inspection (the most common deployment):
1. **Private subnet route table**: default route (0.0.0.0/0) points to the firewall endpoint in the same AZ (e.g., `vpce-firewall-1a`) — not to the NAT Gateway directly.
2. **Firewall subnet route table**: default route points to the NAT Gateway. After inspection, approved traffic exits through NAT.
3. **Internet Gateway route table (ingress)**: traffic returning from the internet to private subnet CIDRs routes through the firewall endpoint before reaching private subnets.

This creates a traffic path of: private instance → firewall endpoint → NAT Gateway → internet (outbound), and internet → IGW → firewall endpoint → NAT Gateway → private instance (inbound). All traffic passes through the firewall regardless of direction.

### Centralized Inspection VPC Pattern (TGW)

In a multi-VPC organization, deploying a separate Network Firewall in every VPC is expensive and operationally complex. The preferred large-scale pattern is a **centralized inspection VPC**: a dedicated VPC containing only Network Firewall endpoints, connected to all spoke VPCs via a Transit Gateway (TGW).

The routing works through TGW route tables:
- All spoke VPC default routes point to the TGW for east-west (VPC-to-VPC) and north-south (internet-bound) traffic.
- TGW routes traffic to the inspection VPC, where it passes through Network Firewall.
- After inspection, TGW routes approved traffic to the destination (another spoke VPC, or the egress VPC with NAT and IGW).

This pattern means one Network Firewall deployment protects all VPCs. The trade-off: TGW introduces latency and data transfer costs, and the Network Firewall becomes a single point of failure if not deployed across multiple AZs (it always should be). TGW route tables must be carefully designed to ensure traffic flows through the inspection path and cannot bypass it.

### Distributed Deployment — Firewall Per VPC

In the distributed pattern, each VPC has its own Network Firewall deployment. This provides AZ-local inspection (no cross-AZ traffic to a central firewall), blast-radius isolation (a misconfigured firewall in one VPC doesn't affect others), and simpler routing (no TGW-based inspection routing to manage). The cost is higher — each VPC pays the per-AZ endpoint and processing charges separately. For organizations with a small number of high-value VPCs or strict latency requirements, distributed deployment is appropriate. For 10+ VPCs, centralized inspection almost always wins on cost.

### AWS WAF — Layer 7 Web Application Protection

AWS WAF is a web application firewall that operates at Layer 7 and attaches to specific resources: Application Load Balancers, CloudFront distributions, API Gateway stages, and AppSync. WAF inspects HTTP/HTTPS request content — headers, query strings, URI paths, body — against rules. It can block SQL injection, cross-site scripting (XSS), known-bad IP addresses (AWS IP reputation lists), rate limit specific endpoints, and enforce geographic restrictions.

AWS Managed Rule Groups are pre-built WAF rule sets maintained by AWS: `AWSManagedRulesCommonRuleSet` (OWASP Top 10), `AWSManagedRulesSQLiRuleSet`, `AWSManagedRulesKnownBadInputsRuleSet`, and others. They are updated as new threats emerge. WAF and Network Firewall are complementary: WAF handles application-layer attacks on HTTP/HTTPS endpoints; Network Firewall handles network-layer traffic inspection for all protocols. A web application needs both.

### AWS Shield — DDoS Protection

Shield Standard is automatically applied to all AWS resources at no cost. It protects against volumetric L3/L4 DDoS attacks — SYN floods, UDP reflection attacks, large-packet floods — at the AWS network edge before traffic reaches your infrastructure. Shield Standard is always active; you cannot disable it.

Shield Advanced is a paid service (~$3,000/month per organization, not per resource) that adds: enhanced DDoS detection and mitigation for complex attacks, access to the AWS Shield Response Team (SRT) for proactive engagement during attacks, detailed attack diagnostics and telemetry, DDoS cost protection (billing credits for auto-scaling costs triggered by a DDoS attack), and advanced protection for EC2 Elastic IPs, CloudFront, Route 53, Global Accelerator, ALB, and ELB. Shield Advanced is appropriate for gaming platforms, financial services with real-time settlement systems, media streaming, and any application where downtime costs more than $3,000/month and DDoS risk is elevated.

### AWS Firewall Manager — Centralized Policy Enforcement

Firewall Manager is the control plane for enforcing security policies across an AWS Organization. From a single administrator account, you create Firewall Manager policies that define a security baseline — a WAF rule group, a Shield Advanced enrollment, a security group policy, or a Network Firewall policy — and apply it to all accounts in an OU or the entire organization. Firewall Manager automatically deploys and enforces the policy on existing and new resources as they are created.

The key use case: an organization wants every ALB across 50 accounts to have the `AWSManagedRulesCommonRuleSet` WAF rule group attached. Without Firewall Manager, this requires manually attaching WAF web ACLs to every ALB in every account. With Firewall Manager, one policy covers all accounts automatically. It also reports compliance — you can see which resources are out of policy and remediate them centrally.

---

## Configuration Reference

### Create a Network Firewall (CLI)

```bash
# Step 1: Create a stateful rule group with a domain allowlist
# This blocks all outbound HTTPS except to approved domains
aws network-firewall create-rule-group \
  --rule-group-name "egress-domain-allowlist" \
  --type STATEFUL \
  --capacity 100 \
  --rule-group '{
    "RulesSource": {
      "RulesSourceList": {
        "Targets": [
          ".amazonaws.com",
          ".example-vendor.com",
          "api.github.com"
        ],
        "TargetTypes": ["HTTP_HOST", "TLS_SNI"],
        "GeneratedRulesType": "ALLOWLIST"
      }
    }
  }'
# Capacity = estimated number of rules. Set generously; cannot decrease later.
# ALLOWLIST blocks all domains NOT on the list for HTTPS/HTTP
# HTTP_HOST inspects plaintext HTTP Host header
# TLS_SNI inspects TLS SNI for HTTPS without decryption

# Step 2: Create a firewall policy referencing the rule group
RULE_GROUP_ARN=$(aws network-firewall describe-rule-group \
  --rule-group-name egress-domain-allowlist \
  --type STATEFUL \
  --query "RuleGroupResponse.RuleGroupArn" --output text)

aws network-firewall create-firewall-policy \
  --firewall-policy-name "vpc-egress-policy" \
  --firewall-policy '{
    "StatelessDefaultActions": ["aws:forward_to_sfe"],
    "StatelessFragmentDefaultActions": ["aws:forward_to_sfe"],
    "StatefulRuleGroupReferences": [
      {"ResourceArn": "'"$RULE_GROUP_ARN"'"}
    ]
  }'
# aws:forward_to_sfe = forward all traffic to Stateful engine for domain inspection
# StatelessDefaultActions applies to all traffic not matched by a stateless rule

# Step 3: Create the firewall in the dedicated firewall subnet
POLICY_ARN=$(aws network-firewall describe-firewall-policy \
  --firewall-policy-name vpc-egress-policy \
  --query "FirewallPolicyResponse.FirewallPolicyArn" --output text)

aws network-firewall create-firewall \
  --firewall-name "vpc-egress-firewall" \
  --firewall-policy-arn "$POLICY_ARN" \
  --vpc-id vpc-0abc12345def67890 \
  --subnet-mappings \
    SubnetId=subnet-firewall-1a \
    SubnetId=subnet-firewall-1b
# Deploy in firewall subnets — one per AZ for HA
# Firewall subnets should contain ONLY the firewall endpoint, no other resources

# Step 4: Get the firewall endpoint IDs for route table updates
aws network-firewall describe-firewall \
  --firewall-name vpc-egress-firewall \
  --query "FirewallStatus.SyncStates"
# Returns per-AZ endpoint IDs (format: vpce-xxxx) used as route targets
```

---

### Update Route Tables for Traffic Inspection

```bash
# Private subnet route table: send default traffic to firewall endpoint (not NAT)
# Replace rtb-private-1a with your private subnet route table in AZ 1a
# Replace vpce-firewall-1a with the firewall endpoint ID in AZ 1a

aws ec2 replace-route \
  --route-table-id rtb-private-1a \
  --destination-cidr-block 0.0.0.0/0 \
  --vpc-endpoint-id vpce-firewall-1a
# Traffic leaving private subnet in AZ 1a now hits the firewall first

# Firewall subnet route table: after inspection, send to NAT Gateway
aws ec2 create-route \
  --route-table-id rtb-firewall-1a \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-0abc1234  # NAT Gateway in same AZ for traffic flow optimization

# IGW route table: inbound traffic from internet routes to firewall before private subnets
aws ec2 create-route \
  --route-table-id rtb-igw \
  --destination-cidr-block 10.0.1.0/24 \  # private subnet CIDR
  --vpc-endpoint-id vpce-firewall-1a
```

> **Routing symmetry is critical.** Network Firewall is stateful — it needs to see both directions of a connection to track state. If outbound traffic goes through firewall-1a but inbound returns through firewall-1b, the firewall drops the return packets as unsolicited. Always route traffic through the firewall endpoint in the same AZ as the source subnet.

---

### Console Path

**VPC → Network Firewall → Create firewall**
1. Name the firewall and select VPC
2. Add subnet mappings — select the dedicated firewall subnet in each AZ
3. Create or associate a firewall policy
4. After creation, retrieve endpoint IDs from the firewall status page
5. Update route tables manually (console or CLI) to route traffic through endpoints

**Network Firewall → Rule groups → Create rule group**
- Type: Stateful or Stateless
- Rule format: Domain list (simplified UI) or Suricata compatible (raw rule syntax)
- Domain list: paste approved domains, choose ALLOWLIST or DENYLIST

---

## How to Decide

| Threat or Requirement | Tool | Why |
|---|---|---|
| Block SQL injection in HTTP requests to ALB | **AWS WAF** | Layer 7 request inspection on ALB |
| Block XSS in API Gateway | **AWS WAF** | WAF attaches to APIGW stage |
| Volumetric DDoS against EC2 Elastic IP | **Shield Standard** (automatic) | L3/L4 flood mitigation at AWS edge |
| Managed DDoS response + billing protection | **Shield Advanced** | SRT access + cost coverage |
| Block outbound to malware C2 domains | **Network Firewall** | Domain allowlist/denylist via TLS SNI |
| Detect exploit patterns in network traffic | **Network Firewall** | Suricata IPS signatures |
| Block all traffic except known-good protocols | **Network Firewall** | Stateful stateless rules combined |
| Enforce WAF policy across 50 accounts | **Firewall Manager** | Central policy; auto-deploys to all accounts |
| Enforce Network Firewall policy across org | **Firewall Manager** | Central deployment and compliance reporting |
| Block specific IP ranges (threat intel) | **Network Firewall** OR **WAF** | NF for any protocol; WAF for HTTP only |
| Inspect inbound traffic content before ALB | **Network Firewall** at VPC edge | Precedes ALB in traffic path |

---

## How This Connects

- **VPC Routing** is the mechanism that makes Network Firewall work. Firewalls do not intercept traffic automatically — route tables must explicitly direct traffic through firewall endpoints. Misconfigured route tables are the most common reason Network Firewall deployments fail to inspect traffic.
- **Transit Gateway** enables the centralized inspection VPC pattern. TGW route tables control which traffic routes through the inspection VPC containing Network Firewall, making it possible to inspect traffic for all spoke VPCs with a single firewall deployment.
- **AWS WAF** and **Network Firewall** are complementary, not alternatives. WAF handles HTTP/HTTPS application attacks on specific resources (ALBs, CloudFront). Network Firewall handles network-layer inspection for all traffic through the VPC. Most production security architectures need both.
- **Firewall Manager** requires AWS Organizations and a designated Firewall Manager administrator account. It can manage WAF, Shield Advanced, Security Groups, Network Firewall, and Route 53 DNS Firewall policies. Understanding its relationship to Organizations is exam-relevant.
- **CloudWatch and S3** integrate with Network Firewall for logging. Firewall alert logs and flow logs can be sent to CloudWatch Logs, S3, or Kinesis Data Firehose. Alert logs record rule matches; flow logs record all observed traffic. Both are needed for meaningful security monitoring.

---

## Exam Traps

**"AWS WAF and AWS Network Firewall do the same thing."** They do not. WAF is Layer 7, HTTP/HTTPS only, and attaches to ALBs, CloudFront, and API Gateway — it cannot protect a raw TCP service or inspect non-HTTP traffic. Network Firewall is Layers 3–7, supports all protocols, and sits in the VPC routing path. They are complementary layers of a defense stack.

**"Shield Advanced replaces or includes WAF."** False. Shield Advanced provides DDoS protection and the Shield Response Team. It does not include WAF rules or Network Firewall capabilities. You can combine Shield Advanced with WAF (and AWS recommends it for public web applications), but they are separate services with separate billing.

**"Network Firewall automatically inspects all traffic in a VPC."** False. Network Firewall only inspects traffic that is explicitly routed through its firewall endpoints. If route tables send traffic directly to a NAT Gateway or internet gateway without passing through the firewall endpoint, that traffic is not inspected. Route table configuration is the deployment step most likely to be wrong.

**"Firewall Manager creates the firewall rules itself."** Firewall Manager enforces policies but the underlying rules are still defined in WAF web ACLs, Network Firewall policies, and rule groups. Firewall Manager is the enforcement and compliance layer — it deploys and monitors, but you still define what the rules say.

**"Stateful rules replace stateless rules."** They serve different purposes. Stateless rules run first at high speed for simple 5-tuple decisions (pass or drop without state tracking). Stateful rules run second with connection tracking and deep inspection. Stateless rules are used for high-volume obvious cases; stateful rules handle everything requiring content awareness or connection context.

---

## Summary

- **AWS Network Firewall** is a managed stateful firewall deployed in dedicated subnets. Traffic must be explicitly routed through it via route table changes — it does not auto-intercept.
- **Stateless rules** perform fast 5-tuple matching per packet. **Stateful rules** are Suricata-compatible and support domain allowlists, protocol detection, and IPS signatures.
- **Deployment patterns**: distributed (firewall per VPC, simpler routing, higher cost) or centralized inspection VPC (single firewall via TGW, lower cost, more complex routing).
- **AWS WAF** protects Layer 7 HTTP/HTTPS applications on ALBs, CloudFront, and API Gateway. It handles SQL injection, XSS, rate limiting, and IP reputation blocking.
- **Shield Standard** is automatic and free (L3/L4 DDoS). **Shield Advanced** adds the Shield Response Team, enhanced telemetry, and billing protection for ~$3,000/month.
- **Firewall Manager** is the central control plane for deploying and enforcing WAF, Shield, security group, and Network Firewall policies across an entire AWS Organization.

---

## Examples

A financial services company builds a new trading platform on AWS and faces a strict compliance requirement: all outbound network traffic from EC2 instances must be inspected for unauthorized data exfiltration and malware callbacks. Security groups can restrict ports, but the compliance team requires domain-level egress controls — no instance should be able to reach an arbitrary internet domain. They deploy Network Firewall in dedicated firewall subnets across two AZs. Private subnet route tables redirect default routes to the firewall endpoints; firewall subnet route tables forward approved traffic to NAT Gateways. They configure a domain allowlist with 23 approved FQDNs: the trading data provider APIs, software package repositories, AWS service endpoints, and their monitoring vendor. When a developer accidentally installs a package with a dependency that phones home to a telemetry server, Network Firewall's stateful engine blocks the TLS SNI and logs the attempt — revealing a supply chain risk before any data leaves the environment.

A media company operates a high-traffic streaming platform with millions of concurrent viewers. During a major live event, they receive a volumetric DDoS attack peaking at 400 Gbps aimed at their CloudFront distribution. AWS Shield Standard, which is always active, detects the attack at the AWS network edge and reroutes traffic through scrubbing infrastructure before it reaches CloudFront — the platform stays online without any customer action. Post-event, the security team upgrades to Shield Advanced: the $3,000/month is justified by the fact that a single hour of downtime would cost far more in lost advertising revenue, and the Shield Response Team engagement during the next attack proves valuable. They also configure Shield Advanced protection for their ALBs and attach WAF with rate limiting rules to prevent HTTP layer floods that Shield Standard does not cover. The layered defense — Shield at the edge, WAF on the ALB — handles both volumetric and application-layer threats.

A large enterprise adopts AWS at scale across 80+ accounts. The security team determines that every ALB across all accounts must have the `AWSManagedRulesCommonRuleSet` WAF rule group attached, and every account must enroll in Shield Advanced. Without automation, enforcing this across 80 accounts with hundreds of ALBs is untenable. They designate a security account as the Firewall Manager administrator, enable Firewall Manager integration with AWS Organizations, and create two policies: a WAF policy attaching the managed rule group to all ALBs in all member accounts, and a Shield Advanced policy enrolling all accounts. Firewall Manager deploys the WAF web ACLs automatically to existing ALBs and to new ALBs as they are created. The compliance dashboard shows which accounts are in policy and flags any non-compliant resources within minutes of creation. What would have been weeks of manual work across 80 accounts becomes a zero-touch continuous enforcement system.

---

## Think About It

1. Security groups, NACLs, AWS WAF, and AWS Network Firewall each operate at a different level of the stack. For each one, name a specific attack type that it can detect or prevent that the others cannot. Where do they genuinely overlap, and where is each tool strictly required?

2. AWS Network Firewall stateful rules can inspect HTTPS traffic by examining the TLS SNI field — but they cannot read the encrypted payload without TLS inspection (decryption). For a financial services application, what is the security value of SNI-based domain filtering on HTTPS if the payload is still encrypted? What threats does it address, and what threats remain invisible?

3. The centralized inspection VPC pattern (firewall in one VPC, all spoke VPCs route through TGW) reduces cost and operational complexity compared to per-VPC firewalls. What failure modes does it introduce? If the Network Firewall in the inspection VPC goes down, what happens to traffic from all spoke VPCs? How would you design the deployment to eliminate this as a single point of failure?

4. Firewall Manager can enforce a Network Firewall policy across all accounts in an organization. What is the governance trade-off between a strictly centralized policy (security team controls all rules) and a delegated model (application teams can add rules within guardrails)? How would you design Firewall Manager policies to support both organizational baseline rules and team-level customization?

5. A domain allowlist in Network Firewall blocks all egress except approved FQDNs. An application team argues that they cannot build a complete allowlist because their third-party dependencies dynamically load modules from CDN endpoints with unpredictable hostnames. How would you approach building the allowlist without breaking the application? What process would you establish for adding new approved domains, and how would you detect gaps without disabling inspection?

---

## Quick Check

**Q1.** A company wants to block HTTP requests containing SQL injection patterns from reaching their Application Load Balancer. Which AWS service should they use?

- A) AWS Network Firewall with a Suricata rule targeting SQL patterns
- B) AWS WAF with the AWSManagedRulesSQLiRuleSet rule group attached to the ALB
- C) AWS Shield Advanced with enhanced DDoS filtering
- D) A NACL rule blocking the attacker's source IP address

**Answer: B** — AWS WAF operates at Layer 7 and attaches directly to ALBs. It can inspect HTTP request content for SQL injection patterns using managed or custom rule groups. Network Firewall can also detect SQL injection via Suricata rules, but WAF attached to the ALB is the purpose-built, operationally simpler solution for this specific threat.

---

**Q2.** An AWS Network Firewall is deployed in firewall subnets but VPC Flow Logs show that EC2 instances in private subnets are sending traffic directly to the NAT Gateway, bypassing the firewall. What is the most likely cause?

- A) Network Firewall is not enabled for stateful inspection
- B) The private subnet route tables still have a default route (0.0.0.0/0) pointing to the NAT Gateway instead of the firewall endpoint
- C) The firewall endpoint security group is blocking traffic from the private subnet CIDR
- D) Network Firewall only inspects inbound traffic, not outbound

**Answer: B** — Network Firewall does not intercept traffic automatically. Private subnet route tables must be updated to route default traffic (0.0.0.0/0) to the firewall endpoint in the same AZ. If the route still points to NAT Gateway, traffic bypasses the firewall entirely.

---

**Q3.** What does AWS Firewall Manager require before it can enforce WAF and Network Firewall policies across multiple AWS accounts?

- A) Each account must have a dedicated Network Firewall deployment
- B) AWS Organizations must be enabled and Firewall Manager must be associated with a designated administrator account
- C) All accounts must be in the same AWS region
- D) Shield Advanced must be active in every member account before WAF policies can be enforced

**Answer: B** — Firewall Manager requires AWS Organizations to be enabled and a Firewall Manager administrator account to be designated (typically a security or network account). Once configured, Firewall Manager can deploy and enforce policies across all accounts in selected OUs or the entire organization automatically.

---

## What's Next

Next: VPC Design Patterns — CIDR planning for organizations, the hub-and-spoke architecture with Transit Gateway, AWS IPAM, and the three-tier subnet reference model.
