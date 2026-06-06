---
title: "Route 53 Resolver and Hybrid DNS"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Route 53 Resolver and Hybrid DNS

## Overview

Every VPC comes with a built-in DNS resolver. It sits at a reserved address — the base of the VPC's CIDR block plus two — and handles DNS queries for every resource in the VPC automatically. By default it knows about Route 53 private hosted zones, AWS service endpoints, and the public internet. What it does not know about is your on-premises DNS infrastructure: the Active Directory domain your corporate laptops authenticate against, the hostname your ERP system uses to find its database, or any other private namespace managed by DNS servers in your data center.

This creates a gap at the boundary of every hybrid architecture. AWS resources cannot resolve on-premises hostnames, and on-premises servers cannot resolve Route 53 private hosted zone names — even when Direct Connect or a VPN provides full network-layer connectivity between the two environments. Route 53 Resolver Endpoints exist to close that gap. An Inbound Endpoint accepts DNS queries from on-premises and passes them to the VPC resolver. An Outbound Endpoint lets the VPC resolver forward queries for corporate domains to on-premises DNS servers. Together they make hybrid DNS transparent — resources on both sides of the boundary resolve each other's names without any IP addresses hardcoded.

For the SAA exam, understand the direction and purpose of each endpoint type, how Resolver Rules control outbound forwarding, and the basics of DNS Firewall for filtering outbound queries. SAP goes deeper: multi-account rule sharing via RAM, DNS Firewall integration with Firewall Manager, and designing for endpoint failure scenarios.

---

## Core Concepts

### The VPC Resolver (Base + 2)

Every VPC has a built-in DNS resolver available at the VPC's base network address plus two. For a VPC with CIDR `10.0.0.0/16`, the resolver address is `10.0.0.2`. EC2 instances use this address automatically — it's set in the DHCP options for the VPC and requires no configuration.

The base+2 resolver handles three categories of queries. First, private hosted zones associated with the VPC — it answers these directly from Route 53's internal data. Second, VPC-internal names like the private DNS hostname of an EC2 instance — these are answered from AWS's internal DNS data. Third, everything else — public internet domains forwarded to Route 53's public resolvers, which query authoritative nameservers on behalf of the VPC.

The critical limitation: this resolver is only accessible from inside the VPC. Traffic to `10.0.0.2` is not routable across Direct Connect or VPN. You cannot configure an on-premises DNS server to forward queries to this address — packets will never arrive. This is why Inbound Endpoints exist.

---

### Inbound Endpoints: On-Premises to AWS

A Route 53 Resolver **Inbound Endpoint** is a set of Elastic Network Interfaces (ENIs) deployed in your VPC subnets. These ENIs have real, routable private IP addresses reachable from on-premises over Direct Connect or VPN. They accept DNS queries forwarded from your on-premises DNS servers and pass them to the VPC resolver.

The flow looks like this: an on-premises server queries `app.internal.corp` — a name in a Route 53 private hosted zone. The on-premises DNS server has a conditional forwarder configured: "send all queries for `internal.corp` to the Inbound Endpoint IPs." The query arrives at an Inbound Endpoint ENI, passes to the VPC resolver, which finds the matching private hosted zone record and returns the answer. The response travels back to the on-premises DNS server and on to the querying machine.

The on-premises DNS server doesn't need to know anything about Route 53 internals — it treats the Inbound Endpoint IPs like any other conditional forwarder target. For high availability, deploy ENIs in at least two AZs and list all endpoint IPs in the on-premises conditional forwarder so queries fail over if one ENI becomes unreachable.

---

### Outbound Endpoints and Resolver Rules: AWS to On-Premises

A Route 53 Resolver **Outbound Endpoint** is the reverse: a set of ENIs through which the VPC resolver forwards DNS queries to on-premises DNS servers. By itself, an Outbound Endpoint does nothing — you must also create **Resolver Rules** that tell it what to forward and where.

A Resolver Rule specifies a domain name (e.g., `corp.example.com`) and a list of target DNS server IPs (e.g., your two on-premises Active Directory DNS servers). When an EC2 instance queries any name matching the rule's domain, the VPC resolver forwards the query through the Outbound Endpoint ENIs to the specified target IPs over Direct Connect or VPN. The on-premises DNS server answers, and the response returns to the EC2 instance.

There are two rule types. **Forward rules** are the ones you create to send domains to on-premises DNS. **System rules** are managed by AWS and take priority — they ensure that AWS-owned namespaces like `amazonaws.com` and associated private hosted zones always resolve locally rather than being forwarded somewhere else. You cannot delete or override system rules.

Rules are **associated with VPCs**, not individual EC2 instances. A rule applied to a VPC affects every resource in that VPC. Rules can also be **shared across accounts** using AWS Resource Access Manager (RAM), allowing a central network account to manage all forwarding rules and distribute them organization-wide without each account recreating them.

---

### Route 53 Resolver DNS Firewall

DNS Firewall inspects and filters outbound DNS queries made by resources in your VPC. Before the VPC resolver returns an answer, DNS Firewall evaluates the queried domain against your rule groups and can block the resolution, allow it, or log it for investigation.

Rules within a rule group use **domain lists** — collections of hostnames and domain patterns. AWS provides managed domain lists that track known malware command-and-control infrastructure, botnet hosts, and malicious distribution networks; these lists update automatically as AWS's threat intelligence identifies new threats. You can also create custom domain lists for your own blocklists or allowlists.

Each rule specifies an action: **BLOCK** returns NXDOMAIN or a custom response to the querying instance, cutting off DNS-based communication with the blocked domain. **ALLOW** explicitly permits resolution (useful in allowlist-first configurations). **ALERT** logs the query to CloudWatch Logs without blocking — useful for detection mode before you're ready to enforce.

DNS Firewall has one important boundary to understand: it operates at the DNS layer. If an EC2 instance already has an IP address cached from a previous DNS lookup and connects to it directly without making another DNS query, DNS Firewall cannot stop that connection. Blocking DNS-based communication is effective against many threat patterns — particularly malware that relies on DNS for C2 callback and data exfiltration via DNS tunneling — but it complements, rather than replaces, network-layer controls like Network Firewall and security groups.

---

## Configuration Reference

### Creating Inbound and Outbound Endpoints

```bash
# Create an Inbound Endpoint — accepts DNS queries from on-premises
aws route53resolver create-resolver-endpoint \
  --creator-request-id "inbound-$(date +%s)" \
  --name "hybrid-inbound-prod" \
  --security-group-ids sg-0abc12345 \           # Must allow UDP/TCP 53 inbound from on-premises CIDRs
  --direction INBOUND \
  --ip-addresses \
    SubnetId=subnet-0aaa111111111aaaa,Ip=10.0.1.10 \  # Static IP in AZ-a (configure as forwarder target on-premises)
    SubnetId=subnet-0bbb222222222bbbb,Ip=10.0.2.10 \  # Static IP in AZ-b (HA)
  --region us-east-1

# After creation, configure your on-premises DNS server to forward
# the relevant domain (e.g., internal.corp) to 10.0.1.10 and 10.0.2.10

# Create an Outbound Endpoint — forwards queries from VPC to on-premises
aws route53resolver create-resolver-endpoint \
  --creator-request-id "outbound-$(date +%s)" \
  --name "hybrid-outbound-prod" \
  --security-group-ids sg-0def67890 \           # Must allow UDP/TCP 53 outbound to on-premises DNS IPs
  --direction OUTBOUND \
  --ip-addresses \
    SubnetId=subnet-0aaa111111111aaaa \          # AZ-a (AWS assigns IP automatically)
    SubnetId=subnet-0bbb222222222bbbb \          # AZ-b (HA)
  --region us-east-1
```

> **Note:** Each endpoint creates one ENI per subnet. You are billed per ENI per hour plus per query. Deploy endpoints in dedicated subnets to simplify security group management — a single SG per endpoint type is cleaner than mixing endpoint ENIs with other workloads.

---

### Creating a Resolver Rule and Associating It with a VPC

```bash
# Create a forward rule — queries for corp.example.com go to on-premises DNS
aws route53resolver create-resolver-rule \
  --creator-request-id "rule-corp-$(date +%s)" \
  --name "forward-corp-dns" \
  --rule-type FORWARD \
  --domain-name "corp.example.com" \            # Matches this domain and all subdomains
  --resolver-endpoint-id rslvr-out-xxxxxxxx \   # The Outbound Endpoint to send queries through
  --target-ips \
    Ip=192.168.1.53,Port=53 \                   # Primary on-premises DNS server
    Ip=192.168.1.54,Port=53 \                   # Secondary on-premises DNS server (HA)
  --region us-east-1

# Associate the rule with a VPC — every resource in the VPC will use this rule
aws route53resolver associate-resolver-rule \
  --resolver-rule-id rslvr-rr-xxxxxxxx \
  --vpc-id vpc-0abc1234567890def \
  --region us-east-1

# Share the rule to another AWS account (or an entire Organization) using RAM
aws ram create-resource-share \
  --name "shared-resolver-rules" \
  --resource-arns arn:aws:route53resolver:us-east-1:123456789012:resolver-rule/rslvr-rr-xxxxxxxx \
  --principals "arn:aws:organizations::123456789012:organization/o-exampleorgid" \
  --region us-east-1

# In the receiving account — associate the shared rule with a local VPC
aws route53resolver associate-resolver-rule \
  --resolver-rule-id rslvr-rr-xxxxxxxx \        # Same rule ID shared via RAM
  --vpc-id vpc-0xyz9876543210fed \
  --region us-east-1
```

---

### Creating a DNS Firewall Rule Group

```bash
# Create a custom domain blocklist
aws route53resolver create-firewall-domain-list \
  --name "custom-malware-blocklist" \
  --region us-east-1

# Add domains to the list
aws route53resolver update-firewall-domains \
  --firewall-domain-list-id fdl-xxxxxxxx \
  --operation ADD \
  --domains "malware-c2.example.net" "exfil-tunnel.xyz" \
  --region us-east-1

# Create a rule group and add rules
aws route53resolver create-firewall-rule-group \
  --name "vpc-dns-security" \
  --region us-east-1

# BLOCK rule using the custom list (higher priority = lower number)
aws route53resolver create-firewall-rule \
  --firewall-rule-group-id frgp-xxxxxxxx \
  --firewall-domain-list-id fdl-xxxxxxxx \
  --name "block-custom-malware" \
  --action BLOCK \
  --block-response NXDOMAIN \                   # Return NXDOMAIN so instance thinks domain doesn't exist
  --priority 100 \
  --region us-east-1

# BLOCK rule using the AWS-managed malware domain list
aws route53resolver create-firewall-rule \
  --firewall-rule-group-id frgp-xxxxxxxx \
  --firewall-domain-list-id AWSManagedDomainsMalwareDomainList \   # Updated automatically by AWS
  --name "block-aws-managed-malware" \
  --action BLOCK \
  --block-response NXDOMAIN \
  --priority 200 \
  --region us-east-1

# Associate the rule group with a VPC
aws route53resolver associate-firewall-rule-group \
  --firewall-rule-group-id frgp-xxxxxxxx \
  --vpc-id vpc-0abc1234567890def \
  --name "prod-vpc-dns-firewall" \
  --priority 100 \
  --region us-east-1
```

> **Note:** DNS Firewall rule groups are VPC-scoped. To enforce the same rules across an entire organization, use AWS Firewall Manager to create a DNS Firewall policy — Firewall Manager deploys and maintains the rule group associations automatically across all VPCs in the organization.

---

## How to Decide

The core question is always: **which direction does the DNS query flow?**

**1. On-premises resources need to resolve Route 53 private hosted zone names**
→ Create an **Inbound Endpoint**. Configure a conditional forwarder on your on-premises DNS server pointing the relevant domain to the Inbound Endpoint's IP addresses.

**2. VPC resources need to resolve on-premises private hostnames**
→ Create an **Outbound Endpoint** and a **Resolver Rule** specifying the domain and target on-premises DNS IPs. Associate the rule with the VPC.

**3. Both directions are needed**
→ Deploy both. Inbound and Outbound Endpoints are independent — you can have one or both simultaneously.

**4. You need to block VPC resources from resolving malicious or unauthorized domains**
→ Use **DNS Firewall** with AWS managed domain lists and/or custom blocklists.

**5. You need the same forwarding rules applied across many accounts**
→ Create rules in a central networking account and share them with **RAM**. Receiving accounts associate the shared rules with their VPCs.

| Scenario | Solution |
|---|---|
| On-premises server resolves AWS private hosted zone record | Inbound Endpoint + on-premises conditional forwarder |
| EC2 instance resolves Active Directory or corporate hostname | Outbound Endpoint + Forward Rule |
| Block malware C2 callbacks from EC2 instances | DNS Firewall with managed malware domain list |
| Push consistent DNS rules to 50 AWS accounts | Resolver Rules shared via RAM |
| Enforce DNS filtering across entire organization | DNS Firewall + Firewall Manager policy |
| Detect suspicious DNS queries without blocking yet | DNS Firewall in ALERT mode |

---

## How This Connects

- **AWS Direct Connect and Site-to-Site VPN** — the network path for all Resolver Endpoint traffic. Inbound queries travel from on-premises to VPC Endpoint ENIs over the same connection your application traffic uses. Without one of these connections, neither endpoint type can reach on-premises DNS servers.
- **Route 53 Private Hosted Zones** — the data source for queries resolved through Inbound Endpoints. Private hosted zones are invisible outside the VPC; the Inbound Endpoint is what makes those records accessible to on-premises DNS servers.
- **AWS Resource Access Manager (RAM)** — enables Resolver Rule sharing across accounts. A single rule created in a central networking account can be associated with VPCs in every account in the organization, so hybrid DNS forwarding is managed in one place.
- **AWS Firewall Manager** — manages DNS Firewall rule group associations centrally. Security teams define a DNS Firewall policy in Firewall Manager, and it automatically deploys and enforces that policy across all VPCs in the organization — the same way Firewall Manager manages Security Group and Network Firewall policies.
- **CloudWatch Logs** — DNS Firewall BLOCK and ALERT actions produce log records. You can also enable Route 53 Resolver Query Logging separately to capture every DNS query made by resources in a VPC, feeding forensic analysis and anomaly detection pipelines.

---

## Exam Traps

- **Inbound vs. Outbound direction is from the VPC's perspective, not the querier's.** "Inbound" means a query comes *into* the VPC resolver from outside — on-premises sends to AWS. "Outbound" means the VPC resolver sends a query *out* to on-premises. Students frequently swap these. When in doubt: Inbound = on-premises → AWS; Outbound = AWS → on-premises.
- **An Outbound Endpoint alone does nothing.** You must also create a Resolver Rule that specifies which domain to forward and which on-premises DNS IPs to send it to, and associate that rule with the VPC. An endpoint without a rule forwards nothing.
- **The base+2 resolver is not routable from on-premises.** On-premises DNS servers cannot forward queries directly to `10.0.0.2` (or equivalent VPC resolver address) — that address is only reachable inside the VPC. Inbound Endpoints exist precisely because the VPC resolver cannot be reached externally.
- **Private hosted zones are not resolvable from on-premises without an Inbound Endpoint.** Creating a private hosted zone and associating it with a VPC does not make it accessible to on-premises systems. An Inbound Endpoint is always required.
- **DNS Firewall blocks DNS resolution, not IP-level connectivity.** If an instance already has an IP cached from a prior lookup, DNS Firewall cannot block a direct connection to that IP. It stops DNS-layer resolution — not network-layer traffic. Complement it with Network Firewall and security groups for full coverage.

---

## Summary

- Route 53 Resolver is the built-in DNS resolver in every VPC, available at the base CIDR address plus two; it handles private hosted zones, VPC-internal names, and public DNS forwarding automatically but is not reachable from outside the VPC.
- Inbound Resolver Endpoints are ENIs deployed in your VPC subnets that accept DNS queries forwarded from on-premises DNS servers over Direct Connect or VPN, enabling on-premises resources to resolve Route 53 private hosted zone records.
- Outbound Resolver Endpoints are ENIs through which the VPC resolver forwards DNS queries to on-premises DNS servers; they only forward what Resolver Rules direct them to — an endpoint without a rule forwards nothing.
- Resolver Rules specify which domain names to forward, through which Outbound Endpoint, and to which on-premises DNS server IPs; they are associated with individual VPCs and can be shared across accounts using RAM.
- DNS Firewall evaluates outbound DNS queries from VPC resources against domain lists, allowing you to block, allow, or alert on queries — including using AWS-managed threat intelligence lists that update automatically.
- For high availability, deploy endpoint ENIs in at least two AZs and list multiple target IPs in Resolver Rules so on-premises DNS redundancy is preserved end-to-end.

---

## Examples

A startup runs all workloads in AWS but developers connect to the office network via VPN. The team creates a Route 53 private hosted zone for `internal.startup.io` and registers service endpoints there. When developers try to reach `api.internal.startup.io` from their laptops, the corporate DNS server has no record for it and returns NXDOMAIN. The team creates an Inbound Endpoint with ENIs in two AZs, then asks the IT admin to add a conditional forwarder on the corporate DNS server pointing `internal.startup.io` to the two Inbound Endpoint IPs. Developer laptops immediately begin resolving AWS-hosted internal names through the VPN — no changes to any EC2 instance, security group, or hosted zone record required.

A manufacturing company runs both AWS microservices and on-premises industrial control systems that reference each other by hostname. The AWS services need to call `historian.plant.corp` (an on-premises data historian) and the on-premises systems need to call `telemetry.aws.corp` (an AWS ECS service). The networking team deploys both an Inbound Endpoint and an Outbound Endpoint in the production VPC. They create a Forward Rule for `plant.corp` pointing to two on-premises DNS servers. The plant's DNS admin adds a conditional forwarder for `aws.corp` pointing to both Inbound Endpoint IPs. Within twenty minutes of configuration, both sides resolve each other's names correctly over an existing Direct Connect connection — with no IP addresses hardcoded in any application configuration file.

A healthcare company's security team discovers that three EC2 instances are periodically making DNS queries to domains associated with known malware infrastructure — signs of an infection that established persistence months earlier and has been exfiltrating data slowly via DNS tunneling. The team enables DNS Firewall with AWS's managed malware domain list and a custom list of domains identified in threat intelligence reports. They start in ALERT mode to confirm the detections without disrupting production, then switch to BLOCK after 48 hours. DNS Firewall immediately starts returning NXDOMAIN to the infected instances when they attempt C2 callbacks. CloudWatch Logs captures every blocked query, feeding a Security Hub workflow that pages the on-call team. The team then deploys the same DNS Firewall policy organization-wide using Firewall Manager — a task that takes less than an hour across 35 AWS accounts.

---

## Think About It

1. Why can't on-premises DNS servers forward queries directly to the base+2 VPC resolver address (e.g., `10.0.0.2`) across a Direct Connect connection, given that the on-premises network can reach other IPs in the VPC CIDR without any problem?
2. An Outbound Endpoint forwards DNS queries to on-premises DNS servers over Direct Connect. What happens to DNS resolution of on-premises hostnames if the Direct Connect link fails? How would you design Resolver Rules and target IP configuration to handle this failure gracefully?
3. DNS Firewall can be configured to fail-open (allow all queries if DNS Firewall itself is unavailable) or fail-closed (block all queries). For a customer-facing production application, which mode would you choose and why? What are the trade-offs for a security-sensitive workload versus a revenue-critical workload?
4. A central networking account manages Resolver Rules shared via RAM to 80 spoke VPCs across 40 AWS accounts. The team updates the Outbound Endpoint's target DNS server IPs during a data center migration. What happens to existing rule associations in the spoke accounts, and what operational steps must be taken in the spoke accounts, if any?
5. DNS Firewall operates at the DNS layer and cannot block connections where the client already knows the destination IP. Given this, what specific threat patterns does DNS Firewall effectively address, and what patterns does it fail to stop? How does pairing it with VPC Network Firewall close those gaps?

---

## Quick Check

**Q1.** On-premises servers need to resolve the private DNS name of an RDS instance managed by a Route 53 private hosted zone. The corporate network connects to AWS via Direct Connect. What must be created in AWS to enable this resolution?

- A) An Outbound Endpoint with a Resolver Rule forwarding the RDS domain to on-premises
- B) A public Route 53 hosted zone that mirrors the private zone records
- C) An Inbound Endpoint; then configure a conditional forwarder on the on-premises DNS server pointing to the Inbound Endpoint IPs
- D) A VPC endpoint for Route 53 that allows on-premises traffic to reach the private hosted zone

**Answer: C** — An Inbound Endpoint creates ENIs in the VPC with routable IP addresses that on-premises DNS servers can forward queries to. The VPC resolver then answers from the private hosted zone. An Outbound Endpoint goes the other direction (AWS → on-premises). A public hosted zone would expose private records to the internet. There is no VPC endpoint for Route 53.

---

**Q2.** An EC2 instance queries `fileserver.corp.example.com` and receives NXDOMAIN, even though a Direct Connect link provides full network connectivity to the corporate data center and an Outbound Endpoint has been created. What is the most likely cause?

- A) The Outbound Endpoint security group does not allow outbound UDP/TCP port 53 to the on-premises DNS server IPs
- B) No Resolver Rule has been created to forward `corp.example.com` queries through the Outbound Endpoint
- C) The on-premises DNS server must be configured with a conditional forwarder back to the VPC
- D) The EC2 instance is not in the same subnet as the Outbound Endpoint ENIs

**Answer: B** — An Outbound Endpoint alone forwards nothing. A Resolver Rule must be created specifying the domain name and target on-premises DNS IPs, then associated with the VPC. Without the rule, the VPC resolver does not know to forward `corp.example.com` to on-premises. (A is also a possible cause of failure, but the question asks for the *most likely* cause when an endpoint exists but no resolution occurs — the missing rule is the primary gap.)

---

**Q3.** A security engineer confirms that DNS Firewall is successfully logging BLOCK events for a known malware domain, but the compromised EC2 instance continues communicating with the malicious endpoint. What is the most likely explanation?

- A) DNS Firewall BLOCK rules require up to 30 minutes to take effect after association
- B) The instance resolved and cached the malicious IP address before DNS Firewall was enabled, and is now connecting directly without a new DNS lookup
- C) DNS Firewall only evaluates queries over UDP port 53, and the malware switched to TCP
- D) The BLOCK rule must be applied at the subnet level, not the VPC level

**Answer: B** — DNS Firewall blocks DNS-layer resolution. If the instance cached the resolved IP before the rule was applied, it can continue making TCP/UDP connections to that IP without issuing another DNS query. DNS Firewall has no visibility into those direct connections. The fix is to also block the known malicious IP range at the network layer using Network Firewall or a security group egress rule. Rules take effect quickly (not 30 minutes); DNS Firewall evaluates both UDP and TCP port 53; and rules are VPC-scoped, not subnet-scoped.

---

## What's Next

Module 14 is complete. The labs for this module cover a CloudFront distribution in front of an S3 origin and a multi-region Route 53 failover configuration — putting the routing policies, CDN design, and DNS concepts from this module to work together.
