---
title: "AWS Outposts, Wavelength, and Local Zones"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Outposts, Wavelength, and Local Zones

## Overview

AWS's default model is simple: your infrastructure lives in an AWS region, and your users connect to it over the internet. This works for the vast majority of workloads. But some workloads genuinely cannot live in a standard cloud region — because regulations require data to stay in a specific building, because a manufacturing process needs sub-5ms response to sensors on the factory floor, or because a 5G mobile application needs compute that responds in under 10ms to a device that cannot leave the carrier network.

These are the constraints that Outposts, Local Zones, and Wavelength were designed to address. They are not alternatives to AWS regions — they are **extensions** of the AWS platform into different physical environments: your own data center, a major metropolitan area, or a telecom carrier's network infrastructure. From a software perspective, they look like additional Availability Zones in your VPC, running the same AWS APIs and services. The difference is where the physical hardware sits and who controls it.

For the SAA exam, you need to recognize which extension fits which scenario: Outposts for on-premises data residency, Local Zones for metropolitan latency, Wavelength for 5G edge compute. SAP goes deeper into Outpost networking, the services available in each extension type, and the operational model differences.

---

## Core Concepts

### AWS Outposts: AWS in Your Data Center

An AWS Outpost is a physically delivered rack (or multiple racks) of AWS-designed hardware that lives in your data center or co-location facility. The Outpost connects to an AWS parent region via a dedicated high-speed network link — this is the "service link" that carries API calls, service communications, and management traffic.

**What runs on an Outpost**: EC2 instances, EBS volumes, ECS, EKS, RDS (MySQL and PostgreSQL), EMR, ElastiCache, App Mesh, and other services. An Outpost appears in your AWS account as an Availability Zone in your VPC — resources in the Outpost VPC can communicate directly with resources in the parent region's AZs as if they're in the same network.

**Who manages the hardware**: AWS. AWS ships the rack, installs it, performs hardware maintenance, and handles firmware updates. You provide the physical space, power, cooling, and network connectivity. You manage the software running on it (EC2 instances, containers, databases).

**When to use Outposts**:
- Data residency regulations that require specific data to be processed within a specific physical location (specific building, specific country without AWS region coverage)
- Ultra-low latency to on-premises systems — e.g., a manufacturing execution system that must respond to factory floor sensors in <5ms
- Applications with network requirements that make round-trips to a cloud region unacceptable (industrial control systems, real-time process automation)
- Gradual cloud adoption for organizations that want to use AWS APIs and tooling while keeping data on-premises during a multi-year migration

**Key limitation**: Outposts require a working service link to the parent region for most control-plane operations. If the network link goes down, you can continue running already-launched EC2 instances, but you cannot launch new instances, modify configurations, or use most managed services. Planning for disconnected operation requires careful design.

---

### AWS Local Zones: AWS Closer to Cities

A Local Zone is an extension of an AWS region that places compute, storage, and networking infrastructure in a specific city or metropolitan area. Unlike a full AWS region (which has 3+ Availability Zones and the full service catalog), a Local Zone offers a **subset of services** — primarily EC2, EBS, VPC, and some container services — and relies on the parent region for everything else (IAM, S3, RDS, Lambda, CloudFront, etc.).

**Physical model**: AWS builds and manages Local Zone infrastructure. You don't control or supply the hardware. Local Zones are simply additional "Availability Zones" that appear in your VPC when you opt in.

**Available cities** (examples): Los Angeles, Boston, Dallas, Chicago, Miami, Denver, Houston, Minneapolis, New York, Philadelphia, Seattle, and growing. AWS publishes the full list at the infrastructure.aws map.

**Network connectivity**: Local Zone infrastructure connects to the parent region via AWS's private fiber backbone. Applications running in a Local Zone can access parent region services (IAM, S3, etc.) over this connection. Users connect to Local Zone resources from the metropolitan area with single-digit millisecond latency.

**When to use Local Zones**:
- Video editing and media production with real-time rendering feedback requirements
- Gaming with extreme latency sensitivity for players in a specific city
- Machine learning inference serving a concentrated population of users
- Any application where a full AWS region is too far (>10ms) for the use case

---

### AWS Wavelength: AWS Inside 5G Networks

AWS Wavelength embeds AWS compute and storage directly within telecom operators' 5G network infrastructure — inside the mobile core, at or near the radio access network. The key design goal: a 5G mobile device's traffic reaches the application endpoint without ever leaving the carrier's network.

With a standard cloud deployment, a 5G device in New York sends data → carrier radio → carrier backhaul → internet → AWS region (potentially distant) → back. Even at the speed of light, this round-trip is 30–80ms. With Wavelength, the path is: 5G device → carrier radio → Wavelength Zone (inside the carrier network) → application response. The round-trip can be under 10ms because the compute is adjacent to the radio infrastructure.

**Available carriers** (examples): Verizon (US), Vodafone (UK/Germany), KDDI (Japan), SK Telecom (Korea), and others.

**What runs in Wavelength**: EC2 instances, EBS volumes, ECS, EKS, and a subset of AWS services. Wavelength Zones are extensions of a parent region and appear as additional AZs in your VPC.

**Carrier IP addresses**: resources in a Wavelength Zone get Carrier IP addresses — IPs from the telecom operator's address space, reachable from 5G devices on that carrier's network. The application endpoint is accessible from the carrier's 5G network without going through the public internet.

**When to use Wavelength**:
- Augmented/virtual reality overlays on live video from 5G devices
- Autonomous vehicle applications requiring real-time communication with edge infrastructure
- Real-time gaming for 5G mobile players where latency determines gameplay quality
- Smart city applications processing 5G IoT sensor data at the network edge

**Key constraint**: Wavelength is only available through specific carrier partnerships. An application targeting multiple carriers' 5G subscribers must deploy in multiple Wavelength Zones (one per carrier partnership) and manage traffic routing accordingly.

---

### Comparing the Three Extensions

| Feature | Outposts | Local Zones | Wavelength |
|---|---|---|---|
| Physical location | Your data center / colo | AWS-managed, major cities | Inside telecom carrier's network |
| Who manages hardware | AWS | AWS | AWS |
| Connectivity to parent region | Service link (dedicated) | AWS backbone | AWS backbone |
| Use case | Data residency, on-premises latency | Metropolitan latency | 5G mobile edge |
| Target user | On-premises workloads | City-specific applications | 5G device applications |
| Latency to users | Depends on your facility | Single-digit ms to metro area | Sub-10ms from 5G devices |
| Service breadth | Full AWS service set | Subset only | Subset only |
| Parent region dependency | High (control plane) | Moderate (non-local services) | Moderate (non-local services) |
| Exam trigger words | "on-premises," "data residency," "factory floor" | "city," "metropolitan," "media production" | "5G," "telecom," "mobile edge" |

---

## Configuration Reference

### Opting In to Local Zones

Local Zones require opting in before use. In the console:

1. Navigate to **EC2 → Settings** (in account attributes section) or **AWS Console → Account Settings**
2. Find **Zones** → Local Zones
3. Click **Manage** and enable the specific Local Zone (e.g., `us-east-1-bos-1` for Boston)
4. Once enabled, the Local Zone appears as an available AZ when creating subnets and launching EC2 instances

```bash
# List available Local Zones and their status
aws ec2 describe-availability-zones \
  --filters "Name=zone-type,Values=local-zone" \
  --query 'AvailabilityZones[*].{Zone:ZoneName,State:State,GroupName:GroupName,OptedIn:OptInStatus}' \
  --output table \
  --region us-east-1

# Opt in to a specific Local Zone
aws ec2 modify-availability-zone-group \
  --group-name us-east-1-bos-1 \           # Boston Local Zone group name
  --opt-in-status opted-in \
  --region us-east-1

# Create a subnet in a Local Zone (specify the Local Zone AZ name)
aws ec2 create-subnet \
  --vpc-id vpc-0abc1234567890def \
  --cidr-block 10.0.100.0/24 \
  --availability-zone us-east-1-bos-1a \   # Local Zone AZ identifier
  --region us-east-1

# Launch an EC2 instance in the Local Zone
aws ec2 run-instances \
  --image-id ami-0abc1234567890def \
  --instance-type c5.xlarge \
  --subnet-id subnet-0lz1234567890abc \    # Subnet in the Local Zone
  --count 1 \
  --region us-east-1
```

---

### Checking Available Services per Zone Type

```bash
# See which services are available in Local Zones
aws ec2 describe-availability-zones \
  --filters \
    "Name=zone-type,Values=local-zone" \
    "Name=opt-in-status,Values=opted-in" \
  --query 'AvailabilityZones[*].{Name:ZoneName,Parent:ParentZoneName}' \
  --output table \
  --region us-east-1

# List Outpost resources in your account (if any)
aws outposts list-outposts \
  --query 'Outposts[*].{Name:Name,Site:SiteName,Status:LifeCycleStatus,AvailabilityZone:AvailabilityZone}' \
  --output table

# List Wavelength zones
aws ec2 describe-availability-zones \
  --filters "Name=zone-type,Values=wavelength-zone" \
  --query 'AvailabilityZones[*].{Zone:ZoneName,State:State,Parent:ParentZoneName}' \
  --output table \
  --region us-east-1
```

---

## How to Decide

The exam question will describe a scenario. Match the key phrase to the right service:

| Scenario keyword | Service |
|---|---|
| "data must stay in our building / facility" | **Outposts** |
| "on-premises processing," "factory floor," "process must not leave site" | **Outposts** |
| "single-digit ms latency to users in [city name]" | **Local Zones** |
| "media production," "video editing," "game studio in [city]" | **Local Zones** |
| "5G mobile devices," "telecom carrier," "mobile edge" | **Wavelength** |
| "augmented reality on 5G," "connected vehicle," "sub-10ms to mobile" | **Wavelength** |

**Decision framework when the scenario is ambiguous:**

1. Is the hardware in the customer's own facility? → **Outposts**
2. Is the goal metropolitan latency for internet users in a specific city? → **Local Zones**
3. Is the application serving 5G mobile devices through a carrier network? → **Wavelength**
4. Is latency to a standard cloud region acceptable? → **Standard AWS Region**

---

## How This Connects

- **VPC** — all three extension types (Outposts, Local Zones, Wavelength) extend your VPC. Resources in any zone can communicate with resources in the parent region through your VPC as if they share the same private network.
- **Amazon ECS and EKS** — containerized workloads can run on Outposts and Local Zones, enabling container orchestration across on-premises and cloud resources with the same control plane.
- **AWS Direct Connect** — frequently paired with Outposts for dedicated, consistent network connectivity between the Outpost's service link and the parent region. Direct Connect reduces dependency on public internet for the service link.
- **AWS Systems Manager** — Outpost-based EC2 instances are managed through Systems Manager (SSM) just like cloud-based instances — patching, Session Manager access, and automation work the same way.
- **Route 53 Private Hosted Zones** — associate private hosted zones with VPCs that span Outposts or Local Zones, enabling consistent internal DNS resolution across on-premises and cloud resources using the same hostnames.

---

## Exam Traps

- **"On-premises" always means Outposts on the exam.** Local Zones are in major cities but AWS-managed. Outposts are in your building. If a question says "data must not leave the customer's facility" or "on-premises processing," the answer is Outposts, not Local Zones.
- **Local Zones offer a subset of services, not the full catalog.** Lambda, IAM, S3, RDS (most engines), and other services are only available in the parent region. Applications in Local Zones must make API calls to the parent region for these services.
- **Wavelength requires a specific carrier partnership.** Not every carrier is a Wavelength partner. An app targeting multiple carriers' 5G subscribers needs separate Wavelength Zone deployments per carrier.
- **Outposts lose control-plane function when the service link fails.** Running EC2 instances keep running, but you cannot launch new instances, modify configurations, or use managed services that require the control plane. Applications must be designed for this failure mode.
- **Local Zones are not the same as edge locations.** CloudFront edge locations (~400+) serve cached content. Local Zones (~30+ cities) run EC2 and other compute services. These are completely different things at completely different scales.

---

## Summary

- AWS Outposts delivers AWS hardware racks to your on-premises facility, letting you run native AWS services locally for data residency or ultra-low latency to on-premises systems.
- AWS Local Zones place a subset of AWS services (primarily EC2, EBS, VPC) in major cities, appearing as additional AZs in your VPC for single-digit ms latency to metropolitan users.
- AWS Wavelength embeds AWS compute inside telecom carriers' 5G networks, enabling sub-10ms latency for 5G mobile device applications that cannot route through the public internet.
- All three extensions connect back to a parent AWS region over the AWS private backbone and appear as Availability Zones in your VPC.
- Key exam trigger words: "on-premises/facility" → Outposts; "city/metropolitan" → Local Zones; "5G/telecom/mobile edge" → Wavelength.
- Outposts lose control-plane functionality if the service link to the parent region fails — existing instances keep running but new launches and most management operations fail.

---

## Examples

A hospital network runs real-time patient monitoring software with a HIPAA data residency requirement: raw patient vitals cannot leave the hospital's physical facility. They deploy an AWS Outpost rack in their on-premises data center. EC2 instances on the Outpost process vital-sign streams locally using native AWS APIs and only aggregated, de-identified results are sent to the parent region for analytics dashboards. The Outpost appears as an Availability Zone in their VPC, so the application code needs zero changes — it runs in the same VPC, just in an AZ that happens to be in their building rather than in AWS's data center.

A media production studio in Austin, Texas needs sub-5ms rendering feedback for their video editing pipeline. The nearest AWS region (us-east-1, Virginia) adds 35ms of latency — too slow for interactive real-time editing. AWS has a Local Zone in Dallas, connected to Austin via AWS's backbone and the studio's 50Gbps private fiber circuit. The studio deploys their render farm EC2 instances in the Dallas Local Zone. Editors get near-real-time rendering previews over the sub-5ms link from Austin to Dallas. The us-east-1 region handles storage (S3), access management (IAM), and services not available in the Local Zone. The studio didn't need to build or manage any data center hardware.

A sports broadcasting company works with a major 5G carrier to stream augmented reality overlays — real-time player statistics and ball trajectory predictions — to viewers watching on 5G mobile devices at a live stadium event. The latency budget is under 10ms from camera input to viewer display. Deploying in the nearest AWS region (30ms away) would exceed this budget. They deploy their overlay-rendering application in the carrier's Wavelength Zone, embedded inside the carrier's 5G network infrastructure at the stadium. Requests from 5G devices never leave the carrier network — the compute is literally adjacent to the 5G radio equipment. The application serves 80,000 concurrent AR viewers at 8ms average latency, a result physically impossible to achieve from a standard cloud region.

---

## Think About It

1. AWS Outposts requires a service link to the parent region for control-plane operations, meaning most management actions fail if the link goes down. How would you design an Outpost-based application to be resilient to service link outages — which operations must complete before the link fails, and which ones can you tolerate losing temporarily?
2. Why would a company choose AWS Outposts over simply running their own servers on-premises with standard virtualization (VMware, for example)? What specific value does the AWS-managed hardware and native AWS API compatibility provide?
3. Local Zones offer a subset of AWS services and rely on the parent region for the rest. What specific architectural patterns would you use to ensure low latency to Local Zone users while still using parent-region services like RDS or Lambda?
4. AWS Wavelength requires specific carrier partnerships for each deployment. If your application needs to serve 5G users from three different carriers in the same city, what does your infrastructure deployment look like? What complexity does this introduce?
5. From a cost perspective, Outposts require purchasing or leasing dedicated hardware plus AWS licensing fees, significantly more than equivalent cloud capacity. What business scenarios justify this premium, and how would you quantify the total cost of ownership for a 3-year Outpost commitment versus a hybrid architecture using Direct Connect to a standard region?

---

## Quick Check

**Q1.** A financial services company has a regulatory requirement that certain risk calculations must be performed within their own physical data center in Frankfurt, where there is no AWS region. Which service allows them to use native AWS APIs and services while keeping processing on-premises?
- A) AWS Local Zones
- B) AWS Wavelength
- C) AWS Outposts
- D) AWS Direct Connect to the eu-central-1 region

**Answer: C** — AWS Outposts delivers AWS hardware to the customer's own facility, enabling native AWS API usage (EC2, EBS, ECS, RDS) while keeping data processing physically on-premises to meet regulatory requirements.

**Q2.** A video game company wants to minimize latency for players in the Chicago metropolitan area who currently experience 25ms round-trip time to the nearest AWS region. Which AWS infrastructure extension is most appropriate?
- A) AWS Outposts
- B) AWS Local Zones
- C) AWS Wavelength
- D) Amazon CloudFront

**Answer: B** — AWS Local Zones place a subset of AWS compute and storage services in specific cities including Chicago, providing single-digit millisecond latency to metropolitan users. Outposts is for on-premises deployments; Wavelength is for 5G carrier networks; CloudFront caches content but doesn't run compute.

**Q3.** What is the primary operational difference between a Local Zone and an Outpost?
- A) Local Zones support more AWS services than Outposts
- B) Outposts are physically located in the customer's own facility; Local Zones are AWS-managed infrastructure in specific cities
- C) Outposts connect to the internet directly; Local Zones route through the parent region
- D) Local Zones require a Direct Connect circuit; Outposts use public internet

**Answer: B** — Outposts deliver AWS hardware to the customer's premises, which the customer provides power, cooling, and space for. Local Zones are entirely AWS-managed infrastructure in metropolitan areas — the customer opts in to use them but does not own or manage the hardware.

---

## What's Next

Next: Route 53 Resolver and hybrid DNS — how to connect on-premises DNS infrastructure with Route 53 private hosted zones for seamless name resolution across hybrid environments.
