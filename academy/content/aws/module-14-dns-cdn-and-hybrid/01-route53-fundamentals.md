---
title: "Route 53 Fundamentals: Hosted Zones and Record Types"
type: content
estimated_minutes: 12
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Route 53 Fundamentals: Hosted Zones and Record Types

## Overview

Amazon Route 53 is AWS's authoritative DNS service, domain registrar, and health monitoring platform. When a user types `shop.example.com` into a browser, their device queries a DNS resolver, which eventually queries Route 53 (if you've configured it as the authoritative name server for your domain). Route 53 looks up the record, returns the answer — an IP address, an alias, another hostname — and the connection proceeds. This chain happens in milliseconds and is the first thing that happens for every web request, API call, or service connection.

Route 53 exists because DNS is a critical dependency for every application, and AWS needed a DNS service that is deeply integrated with its infrastructure, globally distributed, and operationally reliable. It is the only AWS service with a 100% uptime SLA, which is achievable because Route 53 operates from a globally distributed anycast network — queries route to the nearest healthy Route 53 point of presence, and no single failure can take the entire service down.

For the CCP exam, you need to understand what Route 53 does and the difference between Alias and CNAME records. For the SAA exam, the depth extends to hosted zone types, all record types, health check configuration, and how Route 53 integrates with other AWS services as the foundation for all routing policy decisions.

---

## Core Concepts

### Hosted Zones: Public and Private

A **hosted zone** is the container for all DNS records belonging to a domain. When you create a hosted zone for `example.com`, you add records (A, CNAME, MX, etc.) that define how traffic to that domain is handled.

**Public hosted zones** serve DNS queries from the internet. When a user anywhere in the world resolves `www.example.com`, they're querying your public hosted zone. Public hosted zones require your domain's NS (Name Server) records to point to the four Route 53 name servers that AWS assigns to your zone.

**Private hosted zones** serve DNS queries only from within one or more associated VPCs. They are invisible to the public internet. A private hosted zone for `internal.example.com` lets your EC2 instances resolve `db.internal.example.com` to an RDS endpoint without that name ever appearing in public DNS. You associate a private hosted zone with specific VPCs — only resources in those VPCs can resolve the names.

You can have both a public and a private hosted zone for the same domain. The private zone takes precedence for queries from associated VPCs; public queries see only the public zone.

**Cost**: $0.50/month per hosted zone. Route 53 also charges per DNS query — $0.40/million queries for standard resolution.

---

### DNS Record Types

Route 53 supports all standard DNS record types. The most important ones for the exam:

**A record** — maps a hostname to an IPv4 address. The most common record type. `www.example.com → 203.0.113.42`.

**AAAA record** — maps a hostname to an IPv6 address.

**CNAME record** — maps a hostname to another hostname (a canonical name). `www.example.com → myalb-1234.us-east-1.elb.amazonaws.com`. **Critical limitation: a CNAME cannot be used at the zone apex** (the root of the domain). The zone apex is the domain itself — `example.com` without any subdomain. This is a DNS specification requirement, not an AWS restriction. If you try to CNAME `example.com`, DNS clients see it as malformed.

**Alias record** — AWS's extension to standard DNS. An Alias record maps a hostname to an AWS resource endpoint (ALB, CloudFront distribution, S3 website, Elastic Beanstalk, API Gateway, etc.). Like a CNAME, but it **can be used at the zone apex**, there is **no additional charge** for Alias queries (unlike regular record queries), and it automatically tracks IP address changes on the target resource. For AWS resources, always prefer Alias over CNAME.

**MX record** — specifies mail servers for the domain and their priorities. Required for email delivery.

**TXT record** — arbitrary text associated with the hostname. Used for domain ownership verification (Google, AWS Certificate Manager, SES) and email policies (SPF, DKIM).

**NS record** — identifies the authoritative name servers for the zone. The NS records in your hosted zone tell the world which name servers are authoritative for your domain.

**SOA record** — Start of Authority, contains administrative information about the zone including the primary name server, admin email, and zone serial number.

---

### Alias vs. CNAME: The Key Distinction

The Alias vs. CNAME choice comes up constantly in Route 53 questions:

| Feature | Alias | CNAME |
|---|---|---|
| Works at zone apex (`example.com`) | ✅ Yes | ❌ No |
| Query charge | Free | Standard query rate |
| Target | AWS resources only | Any hostname |
| Tracks IP changes automatically | ✅ Yes | ✅ Yes (via re-resolution) |
| TTL control | Controlled by Route 53 | You set it |
| Non-AWS targets | ❌ No | ✅ Yes |

Use Alias for: ALB, NLB, CloudFront distributions, S3 website endpoints, Elastic Beanstalk, API Gateway, Global Accelerator, and other Route 53 records in the same zone.

Use CNAME for: pointing to non-AWS hostnames (third-party services, CDNs you manage outside AWS).

---

### TTL: Balancing Cache Efficiency and Agility

TTL (Time to Live) is the number of seconds DNS resolvers are allowed to cache a record before they must re-query the authoritative server. It controls a fundamental trade-off:

**High TTL (3600–86400 seconds)**: Resolvers cache records for hours or days. Route 53 receives fewer queries, reducing cost. The downside: if you change a record (pointing traffic to a new server, disabling an endpoint), resolvers continue serving the old answer until their cache expires. Changes propagate slowly.

**Low TTL (60 seconds)**: Resolvers re-query frequently. Changes propagate within a minute. The downside: higher Route 53 query volume and cost, and more DNS resolution latency for users because caches don't last long.

**The pre-change TTL reduction pattern** is essential operational knowledge:
1. **24–48 hours before a planned change**: lower the TTL to 60 seconds on the affected records
2. **Wait** for one full old-TTL cache cycle to expire (so all resolvers have re-queried and picked up the new TTL)
3. **Make the DNS change** — now all resolvers will propagate the new answer within 60 seconds
4. **After confirming** the change is stable: restore TTL to its original value

If you skip step 1 and lower TTL right before the change, most resolvers are still caching the old record under the old TTL. Your "short TTL" change hasn't actually propagated yet.

---

### Health Checks

Route 53 health checks continuously probe endpoints and report their health status. This status is consumed by routing policies (Failover, Weighted, Latency, etc.) to avoid routing traffic to unhealthy targets.

Health checks can monitor:
- **An endpoint directly**: HTTP/HTTPS/TCP checks from Route 53's global health checker network to a public IP/hostname. Checks every 10 or 30 seconds from multiple regions.
- **A CloudWatch alarm**: for resources that are not publicly reachable (RDS in a private subnet, EC2 with no public IP), create a CloudWatch alarm based on the resource's metrics (CPUUtilization, DatabaseConnections, etc.) and have the health check monitor the alarm state. This allows Route 53 to reflect internal resource health without direct access.
- **Calculated health checks**: aggregate multiple child health checks into one parent status using AND/OR logic. Useful for checking a tier's overall health before routing.

Health check failure is determined by a configurable threshold — the number of consecutive failures before the check reports unhealthy (default: 3). Recovery requires a configurable number of consecutive successes (default: 3).

---

## Configuration Reference

### Creating a Hosted Zone and Records via the Console

**Create a public hosted zone:**
1. Navigate to **Route 53** → **Hosted zones** → **Create hosted zone**
2. Enter **Domain name** (e.g., `example.com`)
3. Select **Public** hosted zone
4. Click **Create hosted zone** — Route 53 automatically creates NS and SOA records
5. Update your domain registrar's nameservers to the four NS values Route 53 assigned

**Create an Alias record pointing to an ALB:**
1. In your hosted zone, click **Create record**
2. **Record name**: leave blank for zone apex, or enter a subdomain (e.g., `www`)
3. **Record type**: A
4. Toggle **Alias** on
5. **Route traffic to**: Application and Classic Load Balancer → select Region → select your ALB
6. **TTL**: not configurable for Alias records (Route 53 controls it)
7. Click **Create records**

---

### Route 53 CLI Operations

```bash
# List all hosted zones in your account
aws route53 list-hosted-zones \
  --query 'HostedZones[*].{Name:Name,ID:Id,Type:Config.PrivateZone}' \
  --output table

# Create a public hosted zone
aws route53 create-hosted-zone \
  --name example.com \
  --caller-reference $(date +%s) \          # Unique string to prevent duplicate requests
  --hosted-zone-config Comment="Production zone",PrivateZone=false

# Create a private hosted zone (must specify VPCs)
aws route53 create-hosted-zone \
  --name internal.example.com \
  --caller-reference $(date +%s) \
  --hosted-zone-config Comment="Internal services",PrivateZone=true \
  --vpc VPCRegion=us-east-1,VPCId=vpc-0abc1234567890def

# Create an A record with Alias to an ALB
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.example.com",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",          
          "DNSName": "my-alb-1234.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true               
        }
      }
    }]
  }'

# Create a standard A record (non-Alias)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.example.com",
        "Type": "A",
        "TTL": 300,
        "ResourceRecords": [{"Value": "203.0.113.42"}]
      }
    }]
  }'

# Create a health check for an HTTP endpoint
aws route53 create-health-check \
  --caller-reference $(date +%s) \
  --health-check-config '{
    "IPAddress": "203.0.113.42",
    "Port": 80,
    "Type": "HTTP",
    "ResourcePath": "/health",
    "FullyQualifiedDomainName": "www.example.com",
    "RequestInterval": 30,
    "FailureThreshold": 3
  }'

# Test DNS resolution from CLI
aws route53 test-dns-answer \
  --hosted-zone-id Z1234567890ABC \
  --record-name www.example.com \
  --record-type A
```

---

## How to Decide

| Scenario | Record Type | Notes |
|---|---|---|
| Map `example.com` (apex) to ALB | A with Alias | CNAME not allowed at apex |
| Map `www.example.com` to ALB | A with Alias | Preferred — free, auto-tracks IPs |
| Map subdomain to third-party CDN | CNAME | Alias doesn't support non-AWS targets |
| Map domain to CloudFront | A with Alias | Must use us-east-1 ALB hosted zone ID |
| Internal service discovery in VPC | A in private hosted zone | VPC DNS resolver picks up private zone |
| Email routing | MX | Priority determines mail server preference |
| Domain ownership verification | TXT | Content specified by the verifying service |

**For TTL values:**
- Long-term stable records (rarely change): 3600–86400 seconds
- Records you may need to change quickly: 300 seconds
- Active failover records: 60 seconds (lower than health check interval)
- Never set TTL below 30 seconds — resolvers may ignore very short TTLs

---

## How This Connects

- **Elastic Load Balancers** — ALBs and NLBs are the most common Alias record targets. Route 53 points your domain at the load balancer; the load balancer distributes across healthy EC2 instances. The EvaluateTargetHealth flag on the Alias record makes Route 53 report the record unhealthy if the target resource itself is unhealthy.
- **CloudFront** — Alias records point apex domains at CloudFront distributions, enabling custom domain names on CDN-served content. CloudFront distributions require a certificate in us-east-1 via ACM.
- **Route 53 Routing Policies** — health checks are the prerequisite for Failover routing. Without health checks, Route 53 cannot detect an unhealthy primary endpoint and switch to the secondary.
- **AWS Certificate Manager (ACM)** — when you need HTTPS on a custom domain, ACM validates domain ownership via TXT records or email. Route 53 can auto-create the TXT validation record if your domain is in a Route 53 hosted zone.
- **VPC DNS Resolution** — private hosted zones integrate with the VPC's built-in DNS resolver (at the VPC+2 address). Resources in associated VPCs automatically resolve names in private hosted zones without any additional configuration on the instance.

---

## Exam Traps

- **CNAME cannot be used at the zone apex.** `example.com` cannot have a CNAME record — this is a DNS specification requirement. Use an Alias A record for the apex. Exam questions regularly test whether you know to use Alias, not CNAME, for the root domain.
- **Alias records are free; CNAME queries cost money.** Route 53 does not charge for Alias record queries. Standard DNS query rates apply to CNAME and other records. For high-traffic domains pointing to AWS resources, Alias saves meaningful query cost.
- **Lowering TTL doesn't immediately take effect.** Resolvers cached the record under the old TTL. You must wait one full old-TTL cycle after lowering TTL before all resolvers honor the new shorter value. Starting TTL reduction too close to a migration window is a classic operational mistake.
- **Route 53 health checkers operate from the public internet.** They cannot directly reach resources in private subnets, on-premises servers behind a firewall, or instances with no public IP. Use CloudWatch alarm-based health checks for private resources.
- **Private hosted zones override public hosted zones within associated VPCs.** If you have both `example.com` public and private hosted zones, and a VPC is associated with the private zone, all DNS queries from that VPC resolve against the private zone — even for records that only exist in the public zone. This can silently break resolution for records that aren't mirrored in the private zone.

---

## Summary

- Route 53 is AWS's authoritative DNS service and domain registrar with a 100% uptime SLA, achieved via global anycast distribution.
- Public hosted zones serve internet DNS queries; private hosted zones serve only associated VPCs and are invisible to the public internet.
- Alias records are AWS-specific extensions that work at the zone apex, are free to query, and automatically track changing IP addresses of AWS resources — always prefer Alias over CNAME for AWS targets.
- CNAME records cannot be used at the zone apex (`example.com`) — this is a DNS specification requirement.
- TTL determines how long resolvers cache records; lower the TTL to 60 seconds at least one full old-TTL cycle before any planned DNS change to ensure fast propagation.
- Health checks monitor endpoint availability and drive all Route 53 routing policy failover logic; private resources require CloudWatch alarm-based health checks since Route 53 checkers are public-internet only.

---

## Examples

A small e-commerce startup registers their domain through Route 53 and creates a public hosted zone for `shop.example.com`. They add an Alias A record pointing the apex (`shop.example.com`) to their Application Load Balancer — not a CNAME, because the apex cannot use CNAME and Alias records are free. When their ALB scales out during a sale and its IP addresses change, the Alias record automatically resolves to the current IPs without any intervention. This is the default starting point for almost every AWS web application: domain → Route 53 Alias → ALB.

A healthcare company runs an internal patient management system accessible only from their AWS VPCs. They create a private hosted zone for `internal.healthco.com` and associate it with their three production VPCs. EC2 instances query `db.internal.healthco.com` and resolve to the RDS cluster endpoint — traffic never leaves the AWS network and the hostname never appears in public DNS. For the database health check in their failover routing policy, they use a CloudWatch alarm-based health check monitoring the RDS `DatabaseConnections` metric, since Route 53's public health checkers cannot reach the private RDS endpoint directly.

A global SaaS platform prepares for a DNS migration, moving from a third-party registrar to Route 53. Their existing records have a TTL of 86400 (24 hours). Forty-eight hours before the cutover window, the team lowers TTL to 60 seconds on all records. They wait 24 hours — one full old-TTL cycle — so all resolvers worldwide re-query under the new short TTL. Now when they update the NS records at the registrar to point to Route 53, every resolver picks up the change within 60 seconds. After 48 hours of confirmed stable operation, they restore TTL to 3600. Skipping the 24-hour wait would have meant half the internet's resolvers still cached the old NS records for up to a day after the cutover.

---

## Think About It

1. Route 53 achieves a 100% uptime SLA while no other AWS service offers this guarantee. What architectural properties of anycast DNS make this possible, and what does "100% uptime" actually mean in practice for a DNS service?
2. A private hosted zone for `internal.example.com` overrides the public hosted zone for resources in associated VPCs. What could go wrong if you have records in the public zone that don't exist in the private zone, and how would you detect and fix this silently broken resolution?
3. You're about to migrate a high-traffic production service to a new set of servers. Your current DNS records have a TTL of 3600. Walk through the exact sequence of steps and timing required to ensure a fast, clean cutover with minimal risk of users hitting old servers after the change.
4. Route 53 health checkers operate from multiple AWS regions on the public internet. For a backend service that's only accessible within a VPC, what are your options for creating a health check, and what are the trade-offs of each approach?
5. The Alias record is AWS-specific and not part of the DNS standard. What problems does it solve that standard CNAME records do not, and are there any scenarios where using a CNAME instead of an Alias would actually be the better choice?

---

## Quick Check

**Q1.** You need to map the root domain `example.com` to an Application Load Balancer in Route 53. Which record configuration is correct?
- A) CNAME record pointing to the ALB DNS name
- B) A record with the ALB's static IP address
- C) Alias A record pointing to the ALB
- D) TXT record with the ALB DNS name

**Answer: C** — CNAME records cannot be used at the zone apex per DNS specification. An Alias A record is the correct choice: it works at the apex, is free to query, and automatically tracks the ALB's changing IP addresses.

**Q2.** Your Route 53 records currently have a TTL of 7200 seconds. You plan to cut over to new servers in 12 hours. You lower the TTL to 60 seconds right now. What problem exists with this plan?
- A) 60 seconds is too short — Route 53 enforces a minimum TTL of 300 seconds
- B) Resolvers that already cached the record under the 7200-second TTL won't re-query for up to 7200 seconds, so many resolvers will still serve old records during the cutover
- C) Lowering TTL takes effect immediately, so this plan is correct
- D) TTL changes require a 24-hour propagation period regardless of the new value

**Answer: B** — Resolvers already holding the cached record won't re-query until their existing 7200-second cache expires. To ensure all resolvers honor the new 60-second TTL before the cutover, you must lower the TTL at least one full old-TTL cycle (7200 seconds = 2 hours) before the planned change window.

**Q3.** A Route 53 health check needs to monitor an RDS database instance running in a private subnet with no public IP. Which health check type supports this?
- A) HTTP health check pointing directly at the RDS endpoint
- B) TCP health check pointing directly at the RDS port
- C) Health check monitoring a CloudWatch alarm tracking RDS metrics
- D) Calculated health check with zero child checks

**Answer: C** — Route 53's health checkers are distributed across the public internet and cannot reach resources in private subnets. A health check that monitors a CloudWatch alarm (e.g., `DatabaseConnections > 0` or a custom RDS availability alarm) allows Route 53 to reflect private resource health without direct network access.

---

## What's Next

Next: Route 53 Routing Policies — how to control where users land globally using Simple, Weighted, Latency, Failover, Geolocation, Geoproximity, Multi-Value, and IP-Based routing.
