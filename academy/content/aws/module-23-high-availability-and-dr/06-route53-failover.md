---
title: "Route 53 Health Checks and Failover"
type: content
estimated_minutes: 40
cert_tags: ["SAA-C03", "SAP-C02"]
---

## Overview

Route 53 health checks are the mechanism by which AWS's DNS service actively monitors the availability of your endpoints and automatically adjusts DNS responses based on health status. Rather than serving DNS records blindly regardless of whether the backend is operational, Route 53 health checks continuously probe your endpoints and mark them healthy or unhealthy. When combined with failover routing policies, this creates DNS-layer high availability: traffic automatically shifts away from failed endpoints without any human intervention, typically within 60–90 seconds of a failure being detected.

The problem this solves is deceptively simple but critical at scale: DNS is often the first layer in the request path, and if DNS continues routing traffic to a failed server, no amount of application-layer resilience helps. Health checks make DNS an active participant in your availability architecture rather than a passive directory. This is especially powerful because DNS-based failover operates below the application layer — it works regardless of the type of application, protocol, or whether the failure is a hardware fault, a software crash, or a regional outage.

For the SAA-C03 and SAP-C02 exams, Route 53 health checks and failover are high-frequency topics. Scenarios involving active-active vs. active-passive architectures, private resource monitoring, multi-region DR, and DNS-layer traffic management consistently test whether you understand health check types, the role of CloudWatch alarms for private resources, and how failover routing differs from weighted and latency routing when health checks are applied.

---

## Core Concepts

### Health Check Types

Route 53 supports three types of health checks, each designed for a different monitoring scenario.

**Endpoint health checks** probe a specific IP address or domain name directly. You configure the protocol (HTTP, HTTPS, or TCP), port, and — for HTTP/HTTPS — the path to request and optionally a string to match in the response body. Route 53 deploys health checkers in multiple AWS regions worldwide, and each checker independently probes your endpoint at the configured interval. An endpoint is considered unhealthy when a threshold number of consecutive checks fail. Endpoint checks are appropriate for publicly reachable resources: EC2 instances, load balancers, web servers with public IPs, or any service accessible from the public internet.

**Calculated health checks** aggregate multiple child health checks using Boolean logic (AND, OR, or a minimum number of healthy children). They do not probe any endpoint directly. Instead, they evaluate the status of up to 256 child health checks and become healthy or unhealthy based on the configured condition. This is valuable for composite availability scenarios: mark a regional endpoint healthy only if both the application server and the database health checks are passing, or mark a service degraded if fewer than 3 of 5 nodes are healthy.

**CloudWatch alarm health checks** tie a Route 53 health check to the alarm state of a CloudWatch metric alarm. If the alarm is in ALARM state, the health check is considered unhealthy; if OK, it is healthy. This type is essential for monitoring private resources (inside a VPC) because Route 53 health checkers cannot reach private IP addresses from outside the VPC. By publishing custom metrics from inside the VPC to CloudWatch and triggering alarms on those metrics, you can expose the health of private resources to Route 53.

### Request Interval and Failure Threshold

Two settings directly control detection speed and cost. The **request interval** determines how frequently each regional health checker probes your endpoint: 30 seconds (standard, lower cost) or 10 seconds (fast, higher cost). Because Route 53 uses multiple health checker regions, your endpoint actually receives more frequent probes than the interval alone implies — roughly 3–5 checkers may probe independently.

The **failure threshold** is the number of consecutive failed checks (from a single health checker's perspective) before that checker considers the endpoint unhealthy. Route 53 marks an endpoint unhealthy when enough of its distributed health checkers agree it has failed. Setting a low threshold (1–2) with fast interval (10s) gives the fastest failure detection — useful for aggressive RTO requirements. A threshold of 3 with a 30-second interval means failure detection could take up to 90 seconds plus DNS TTL propagation time, which is acceptable for less time-sensitive workloads but cheaper to operate.

### Failover Routing Policy

Failover routing implements an **active-passive** topology at the DNS layer. You create two records with the same name and type: a **Primary** record pointing to your main endpoint and a **Secondary** record pointing to your standby or DR endpoint. Each record is associated with a health check. Route 53 serves the Primary record to all DNS queries as long as its health check passes. The moment the Primary health check fails, Route 53 automatically serves the Secondary record instead. When the Primary recovers, Route 53 resumes serving it.

This automatic promotion from Primary to Secondary requires no manual intervention, no code changes, and no load balancer configuration. The TTL on the DNS records controls how quickly clients pick up the change — lower TTLs (60–300 seconds) allow faster propagation but increase DNS query volume and cost. You can also nest failover routing within other routing types — for example, using latency routing within each of two regions, where each region's aggregate health is governed by a calculated health check that feeds into a failover policy between regions.

### Active-Active vs. Active-Passive

Understanding the distinction between active-active and active-passive DNS architectures is a core exam topic. **Failover routing** always creates active-passive: at any moment, all traffic goes to the Primary (or Secondary if Primary is down), never split between them. This is appropriate when the secondary is a cold or warm standby that should only serve traffic during a primary failure — a DR site that you want to reserve capacity on, or an older version of your application running in a second region.

**Active-active** means multiple endpoints serve traffic simultaneously. This is achieved with weighted routing (explicit percentage splits), latency routing (traffic goes to the closest healthy region), or geolocation routing — but all of these work in conjunction with health checks to automatically remove unhealthy endpoints from the rotation. When a health check fails on a weighted record with weight > 0, Route 53 effectively treats that record as weight 0 and redistributes traffic to the remaining healthy records. Active-active is appropriate when all regions have full capacity and you want to use all of them simultaneously, removing failed regions rather than promoting a dedicated secondary.

### Health Checks for Private Resources

Route 53 health checkers are hosted in AWS's public infrastructure and cannot reach resources inside a VPC on private IP addresses. This is a common architectural constraint that exam scenarios explicitly test. The solution is to use **CloudWatch alarm health checks**: deploy a CloudWatch agent or custom metric publisher inside the VPC to monitor the private resource, configure a CloudWatch alarm on that metric, and then create a Route 53 health check that watches the alarm state. When the internal resource fails, the CloudWatch metric degrades, the alarm fires, and Route 53 marks the health check unhealthy — triggering failover even though Route 53 never directly contacted the private resource.

### DNSSEC for Public Hosted Zones

Route 53 supports DNSSEC (Domain Name System Security Extensions) signing for public hosted zones. DNSSEC adds cryptographic signatures to DNS records, allowing resolvers to verify that DNS responses are authentic and have not been tampered with in transit. This protects against DNS cache poisoning and DNS spoofing attacks, where an attacker could redirect traffic by poisoning a resolver's cache with forged DNS responses. Enabling DNSSEC in Route 53 involves Route 53 generating a Key Signing Key (KSK), Route 53 signing records with a Zone Signing Key (ZSK), and you registering the public key with the parent zone (the domain registrar) to establish the chain of trust. DNSSEC is relevant for the SAP-C02 security architecture scenarios.

---

## Configuration Reference

### Creating an Endpoint Health Check via AWS CLI

```bash
# Create an HTTP endpoint health check for a public web server
aws route53 create-health-check \
  --caller-reference "hc-web-primary-$(date +%s)" \
  --health-check-config '{
    "IPAddress": "203.0.113.45",
    "Port": 443,
    "Type": "HTTPS",
    "ResourcePath": "/health",
    "FullyQualifiedDomainName": "primary.example.com",
    "RequestInterval": 10,
    "FailureThreshold": 3,
    "MeasureLatency": true,
    "EnableSNI": true,
    "SearchString": "\"status\":\"ok\"",
    "Regions": ["us-east-1", "us-west-2", "eu-west-1"]
  }'
  # IPAddress: the public IP of the endpoint to probe
  # ResourcePath: the HTTP path Route 53 requests (must return 2xx for healthy)
  # RequestInterval: 10 (fast, ~$1/mo) or 30 (standard, ~$0.50/mo)
  # FailureThreshold: consecutive failures before marking unhealthy (1-10)
  # SearchString: optional; response body must contain this string to be healthy
  # Regions: restrict which AWS health checker regions participate (reduces probe volume)
  # EnableSNI: send SNI header for HTTPS checks (required for SNI-based virtual hosting)
```

### Creating a CloudWatch Alarm Health Check for Private Resources

```bash
# Step 1: Publish a custom metric from inside the VPC
# (This runs on the EC2 instance or Lambda inside the VPC)
aws cloudwatch put-metric-data \
  --namespace "App/PrivateWebServer" \
  --metric-name "HealthStatus" \
  --value 1 \
  --unit "Count"
  # Value 1 = healthy; 0 = unhealthy
  # Publish this on a schedule (e.g., every 60 seconds via cron or EventBridge)

# Step 2: Create a CloudWatch alarm that triggers when HealthStatus drops to 0
aws cloudwatch put-metric-alarm \
  --alarm-name "PrivateWebServer-HealthAlarm" \
  --metric-name "HealthStatus" \
  --namespace "App/PrivateWebServer" \
  --statistic Minimum \
  --period 60 \
  --evaluation-periods 2 \
  --threshold 1 \
  --comparison-operator LessThanThreshold
  # Alarm fires when Minimum(HealthStatus) < 1 for 2 consecutive 60-second periods
  # This gives a ~2 minute detection window before the health check flips

# Step 3: Create a Route 53 health check that watches the CloudWatch alarm
aws route53 create-health-check \
  --caller-reference "hc-private-resource-$(date +%s)" \
  --health-check-config '{
    "Type": "CLOUDWATCH_METRIC",
    "AlarmIdentifier": {
      "Region": "us-east-1",
      "Name": "PrivateWebServer-HealthAlarm"
    },
    "InsufficientDataHealthStatus": "Unhealthy"
  }'
  # InsufficientDataHealthStatus: what to consider the health when CloudWatch
  #   has no data yet. Options: Healthy | Unhealthy | LastKnownStatus
  # Unhealthy is the safer choice: fail-closed when data is missing
```

### Creating Failover DNS Records (Active-Passive)

```bash
# First, get the hosted zone ID
aws route53 list-hosted-zones --query "HostedZones[?Name=='example.com.'].Id" --output text
# Returns: /hostedzone/Z1234567890ABC

# Create the PRIMARY failover record (points to us-east-1 load balancer)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "primary-us-east-1",
        "Failover": "PRIMARY",
        "AliasTarget": {
          "HostedZoneId": "Z35SXDOTRQ7X7K",
          "DNSName": "my-alb-us-east-1-1234567890.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        },
        "HealthCheckId": "abc123-health-check-id"
      }
    }]
  }'
  # Failover: PRIMARY -- this record serves traffic when healthy
  # EvaluateTargetHealth: true -- also check that the ALB itself has healthy targets
  # HealthCheckId: the Route 53 health check ID created above
  # SetIdentifier: unique identifier required when multiple records share the same name+type

# Create the SECONDARY failover record (points to us-west-2 DR load balancer)
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "app.example.com",
        "Type": "A",
        "SetIdentifier": "secondary-us-west-2",
        "Failover": "SECONDARY",
        "TTL": 60,
        "ResourceRecords": [{
          "Value": "52.10.11.12"
        }],
        "HealthCheckId": "def456-health-check-id"
      }
    }]
  }'
  # Failover: SECONDARY -- only served when primary health check fails
  # TTL 60: 60-second DNS cache; low TTL means faster propagation of the failback
  # Note: SECONDARY can also be an Alias record pointing to an ALB or CloudFront
```

### Creating a Calculated Health Check

```bash
# Create a calculated health check that requires at least 2 of 3 child checks to be healthy
aws route53 create-health-check \
  --caller-reference "hc-calculated-$(date +%s)" \
  --health-check-config '{
    "Type": "CALCULATED",
    "HealthThreshold": 2,
    "ChildHealthChecks": [
      "hc-app-server-id-111",
      "hc-database-id-222",
      "hc-cache-id-333"
    ]
  }'
  # HealthThreshold: minimum number of child checks that must be healthy
  # If 2 of 3 are healthy, this calculated check is healthy
  # If only 1 of 3 is healthy, this calculated check is unhealthy
  # Use this to implement composite availability logic without changing DNS records
```

---

## How to Decide

| Goal | Approach | Routing Policy |
|---|---|---|
| Primary region active, DR region standby | Primary + Secondary records with health checks | Failover (active-passive) |
| All regions serve traffic, remove failed ones | Health checks on all records | Weighted or Latency with health checks (active-active) |
| Route to closest healthy region | Latency records with health checks | Latency |
| Monitor a private EC2 instance | CloudWatch metric + alarm + CloudWatch alarm health check | Any routing policy |
| Monitor composite availability (app + DB) | Calculated health check combining child checks | Any routing policy |
| Fast failure detection (<30s) | Fast request interval (10s) + low threshold (2-3) | Endpoint health check |
| Protect against DNS spoofing | Enable DNSSEC on public hosted zone | N/A (security feature) |
| Test DR failover | Temporarily disable primary health check | Failover |

**Decision framework:**
1. Should one site handle all traffic and the other only take over during failure? Use Failover routing (active-passive).
2. Should all sites serve traffic simultaneously, with failed sites removed automatically? Use Latency, Weighted, or Geolocation routing with health checks attached (active-active).
3. Is the resource inside a VPC with no public IP? Use CloudWatch alarm health check — endpoint checks cannot reach private resources.
4. Do you need to monitor multiple components as a unit? Use a Calculated health check combining child checks.
5. How fast does the RTO need to be? Fast interval (10s) + low threshold + low DNS TTL for minimum detection + propagation time.

---

## How This Connects

- **Elastic Load Balancing**: ALB and NLB can be the targets of Route 53 Alias records in failover configurations. Setting `EvaluateTargetHealth: true` on an Alias record means Route 53 also evaluates whether the ALB has healthy registered targets — adding a second layer of health validation beyond the Route 53 health check itself.
- **Amazon CloudWatch**: CloudWatch alarm health checks bridge the gap between Route 53's public health checking infrastructure and private resources inside VPCs. CloudWatch also receives Route 53 health check status as a metric, enabling alerting (SNS notifications) when health check status changes.
- **AWS Global Accelerator**: Often confused with Route 53 failover because it also provides multi-region traffic routing with health checks. The key difference is that Global Accelerator operates at the network layer (anycast IPs, TCP/UDP), provides faster failover (seconds vs. the DNS TTL delay inherent in Route 53), and is better for TCP-layer applications. Route 53 failover is DNS-layer and subject to TTL caching delays; Global Accelerator bypasses DNS caching entirely.
- **AWS Certificate Manager (ACM) and DNSSEC**: DNSSEC signing for Route 53 public hosted zones uses AWS KMS for key management. The Key Signing Key (KSK) is stored as a KMS asymmetric key in your account, and Route 53 uses it to sign Zone Signing Keys. This ties Route 53's security posture to KMS key policies and rotation procedures.

---

## Exam Traps

**Trap 1: Route 53 failover is instantaneous.**
Route 53 failover speed depends on three compounding factors: the health check detection time (request interval × failure threshold), the time for Route 53 to update its DNS responses after marking an endpoint unhealthy (typically within seconds), and the DNS TTL — the time already-cached DNS responses remain valid in resolvers and clients. With a 30-second interval, threshold of 3, and a 60-second TTL, total failover visible to end users could be up to 3 minutes. Minimizing TTL before anticipated maintenance and using the fast 10-second interval reduces this, but failover is never truly instantaneous.

**Trap 2: You can use endpoint health checks to monitor EC2 instances in private subnets.**
Route 53 endpoint health checkers operate from AWS's public infrastructure and cannot reach private IP addresses inside a VPC. If an EC2 instance is in a private subnet with no public IP, an endpoint health check will always fail (or be unreachable). The correct solution is a CloudWatch alarm health check: publish a custom metric from inside the VPC, create a CloudWatch alarm on that metric, and have Route 53 watch the alarm state.

**Trap 3: Failover routing and active-active are the same thing.**
Failover routing is explicitly active-passive: one Primary serves all traffic, the Secondary is dormant until failover. Active-active requires different routing policies — weighted, latency, or geolocation — with health checks to remove failed endpoints from rotation. Questions that ask for "all regions handling traffic simultaneously with automatic removal of failed regions" are describing active-active, which requires weighted or latency routing with health checks, not failover routing.

**Trap 4: SECONDARY records require health checks.**
Route 53 does not require a health check on the Secondary failover record. If the Secondary record has no health check, Route 53 always serves it when the Primary is unhealthy, regardless of whether the Secondary endpoint is actually healthy. Adding a health check to the Secondary is optional but recommended to prevent Route 53 from serving traffic to a Secondary that is also down.

**Trap 5: Route 53 health checks work for private hosted zones directly.**
Route 53 health checkers cannot probe resources by resolving names from private hosted zones, because the health checkers are outside the VPC and cannot resolve private DNS names. Health checks must reference public IP addresses or publicly resolvable FQDNs, or use the CloudWatch alarm approach for private resources.

---

## Summary

- Route 53 health checks actively monitor endpoints and automatically adjust DNS responses, making DNS an active participant in availability architecture rather than a passive directory.
- Endpoint health checks probe public IPs/domains directly; calculated health checks aggregate child checks with Boolean logic; CloudWatch alarm health checks monitor private resources indirectly via metric alarms.
- Failover routing implements active-passive DNS topology: all traffic goes to the Primary record, and Route 53 serves the Secondary only when the Primary health check fails.
- Active-active architectures use weighted, latency, or geolocation routing with health checks — unhealthy records are automatically excluded from DNS responses without switching to a single secondary.
- Private resources inside VPCs cannot be monitored by endpoint health checks; CloudWatch alarm health checks are the correct solution, publishing custom metrics from inside the VPC to CloudWatch.
- DNSSEC protects public hosted zones against DNS spoofing and cache poisoning by adding cryptographic signatures that resolvers can validate.

---

## Examples

**Beginner:** A startup runs a web application on a single EC2 instance in us-east-1. They want to ensure that if the instance becomes unhealthy, DNS stops routing users to it and instead routes them to a static error page hosted on S3. They create an HTTP endpoint health check pointing to the EC2 instance's public IP on port 80, path `/healthcheck`. They create two Route 53 A records for their domain: a Primary Failover record pointing to the EC2 IP with the health check attached, and a Secondary Failover record as an Alias pointing to the S3 static website endpoint with no health check. When the EC2 instance fails, Route 53 detects it within 90 seconds and begins serving the S3 static page.

**Intermediate:** A SaaS company runs their application in us-east-1 and eu-west-1 in an active-passive configuration. They want automatic failover to eu-west-1 if us-east-1 becomes unhealthy, but they want the health check to evaluate the entire tier — both the ALB and the RDS Aurora cluster must be healthy. They create individual endpoint health checks for the ALB in each region and CloudWatch alarm health checks for Aurora (since Aurora is in a private subnet). A calculated health check per region combines the ALB and Aurora checks with AND logic (both must be healthy). Failover routing records for their domain reference the per-region calculated health checks — failover triggers only when the whole primary region stack is considered unhealthy.

**Advanced:** A global financial services company requires sub-60-second failover between their two active AWS regions (us-east-1 and ap-southeast-1) for their trading platform. They configure Route 53 latency routing with health checks (active-active normally) but want guaranteed failover semantics. They set Route 53 health check intervals to 10 seconds (fast) with a failure threshold of 2, giving a maximum health check detection time of 20 seconds. DNS TTLs are set to 30 seconds. They combine this with AWS Global Accelerator as a second layer of failover that operates at the TCP level below DNS, bypassing resolver caching entirely for sub-10-second TCP failover for clients that support it. Route 53 provides the broader DNS routing and health-driven removal, while Global Accelerator handles the latency-sensitive trading application tier.

---

## Think About It

1. Your application runs in us-east-1 (primary) and us-west-2 (secondary) with Route 53 failover routing. The DNS TTL is set to 300 seconds (5 minutes) and the health check uses a 30-second interval with a threshold of 3. What is the worst-case time from failure to all users being routed to the secondary? What levers can you adjust to reduce this?

2. A database server runs in a private subnet with no public IP. You need Route 53 to stop routing traffic to the web tier if the database is down. How do you make Route 53 aware of the database's health state? Walk through each component of the solution.

3. Your company uses weighted routing with three regional endpoints, each with weight 100. Each endpoint has a health check. One region's health check fails. What does Route 53 serve to DNS queries? What does the weight distribution look like at that point?

4. A colleague says "We should use Route 53 failover routing for our active-active multi-region architecture to get automatic health-based routing." Why is this advice technically incorrect, and what should you recommend instead?

5. You need to validate that your Route 53 failover configuration works before a production launch. You do not want to actually bring down the primary region. What is the simplest way to test the failover behavior?

---

## Quick Check

**Question 1:** An application runs on private EC2 instances in a VPC. A solutions architect needs to configure Route 53 to stop routing traffic to this application when the EC2 instances fail. The instances have no public IP addresses. What is the correct approach?

- A) Create an endpoint health check pointing to the private IP addresses of the EC2 instances
- B) Create a CloudWatch metric alarm based on EC2 health status published from within the VPC, then create a Route 53 CloudWatch alarm health check referencing that alarm
- C) Create an endpoint health check with the VPC CIDR range specified as a trusted network
- D) Use AWS Health to monitor EC2 and automatically update Route 53 records via Lambda

**Answer: B** — Route 53 endpoint health checkers operate from outside the VPC and cannot reach private IP addresses. The correct pattern is to publish a custom metric to CloudWatch from inside the VPC (e.g., via CloudWatch agent or a Lambda function with VPC access), create a CloudWatch alarm on that metric, and create a Route 53 health check of type CLOUDWATCH_METRIC that watches the alarm state. Option A will not work because the health checkers have no network path to private IPs. Options C and D are not valid Route 53 features.

---

**Question 2:** A company wants a multi-region active-active DNS architecture where traffic is distributed across us-east-1, eu-west-1, and ap-southeast-1. If one region's application becomes unhealthy, traffic should automatically redistribute to the remaining two healthy regions. Which Route 53 routing policy and configuration achieves this?

- A) Failover routing with one PRIMARY and two SECONDARY records
- B) Simple routing with a single record containing all three IP addresses
- C) Weighted routing with equal weights on three records, each associated with a health check
- D) Geolocation routing with continent-based rules for North America, Europe, and Asia-Pacific

**Answer: C** — Weighted routing with equal weights (e.g., 100/100/100) and a health check on each record implements active-active with automatic removal of failed endpoints. When one region's health check fails, Route 53 redistributes its traffic to the remaining two healthy records. Option A (failover) is active-passive — it routes all traffic to primary normally, which is not active-active. Option B (simple routing) does not support health checks and cannot remove unhealthy IPs. Option D (geolocation) would work for geographic routing but doesn't naturally redistribute traffic from a failed region to the other two.

---

**Question 3:** A Route 53 failover configuration has a Primary record with a TTL of 60 seconds and a health check using a 10-second interval with a failure threshold of 3. An EC2 instance behind the Primary record fails completely at 12:00:00. What is the earliest time a client making a fresh DNS query (no cached response) would receive the Secondary record's IP address?

- A) 12:00:10 (one health check interval)
- B) 12:00:30 (threshold × interval)
- C) 12:01:00 (threshold × interval + TTL)
- D) 12:00:30 is the earliest detection; clients with cached responses see transition up to 60 seconds later

**Answer: D** — The health check failure is detected after 3 consecutive failures at 10-second intervals, meaning the endpoint is marked unhealthy at approximately 12:00:30. Route 53 then updates its DNS responses to return the Secondary record. A client making a fresh DNS query after 12:00:30 would get the Secondary IP. However, any client or resolver that already cached the Primary record's response (with a 60-second TTL) will continue using the Primary IP until their cache expires — up to 12:01:30 for entries cached just before the failure. The question specifies "a fresh DNS query (no cached response)" making option D most precisely correct: earliest is ~12:00:30, with the TTL footnote applying to cached clients.

---

## What's Next

The next lesson covers AWS Global Accelerator — the network-layer alternative to DNS-based failover that provides anycast routing, TCP-layer health checks, and sub-10-second failover that bypasses DNS caching entirely. Understanding how Global Accelerator complements and differs from Route 53 failover is a key differentiator topic for both the SAA-C03 and SAP-C02 exams.
