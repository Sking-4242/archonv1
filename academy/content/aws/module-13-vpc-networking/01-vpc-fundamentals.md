---
title: "VPC Fundamentals: Your Private Network on AWS"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02", "CLF-C02"]
---

# VPC Fundamentals: Your Private Network on AWS

## Overview

A Virtual Private Cloud (VPC) is your logically isolated, software-defined network within a single AWS region. Every compute resource you launch — EC2 instances, RDS databases, Lambda functions in a VPC, ECS tasks, EKS nodes — runs inside a VPC and inherits its networking rules. AWS created VPCs so that customers could replicate the network segmentation and security controls they already had in on-premises data centers: specific address ranges, subnet boundaries, routing policies, and controlled internet access. Without understanding VPCs, you cannot reason clearly about security, high availability, or connectivity for any AWS workload.

VPC is built around the concept of software-defined networking. AWS gives you full control over IP address ranges, subnet layout, route tables, and gateway attachments — but all of it runs on AWS's global physical infrastructure, virtualized away from you. The hardware underneath is shared; the logical isolation is enforced by the hypervisor and AWS's networking fabric. This means your VPC traffic is private by default: no other AWS customer can route packets into your VPC unless you explicitly create a cross-account connection.

VPC is the most-tested networking topic across all AWS certification exams. Questions cover CIDR planning, public vs. private subnet mechanics, NAT Gateway behavior, route table configuration, and the behavior of the default VPC. Many exam scenarios require you to trace the path of a packet through multiple VPC components and identify which one is missing or misconfigured. This lesson builds the mental model you need to answer those questions confidently.

## Core Concepts

### CIDR Blocks and IP Address Planning

Every VPC is defined by a primary CIDR block — a range of private IP addresses expressed in CIDR notation. AWS allows VPC CIDRs in the range /16 (65,536 addresses) to /28 (16 addresses). For most production workloads, /16 is the standard starting point because it gives you enough room to carve out subnets across multiple Availability Zones and tiers without running out of space.

AWS requires VPC CIDRs to come from the RFC 1918 private address ranges:
- `10.0.0.0/8` — supports /16 to /28 VPC CIDRs within this space (e.g., `10.0.0.0/16`)
- `172.16.0.0/12` — supports VPC CIDRs like `172.16.0.0/16` through `172.31.0.0/16`
- `192.168.0.0/16` — the full range can be used as a VPC CIDR (`192.168.0.0/16`)

You can also add up to four secondary CIDR blocks to a VPC after creation, which allows you to expand address space without rebuilding. This is useful when a VPC grows beyond its original plan.

**Why CIDR planning matters:** Every VPC peering connection and Transit Gateway attachment requires non-overlapping CIDR ranges. If two VPCs you want to connect both use `10.0.0.0/16`, peering is impossible without re-addressing one of them — an expensive, disruptive operation in production. Plan your CIDR ranges upfront with future connectivity in mind: use different /8 octets for different VPCs, or allocate large blocks centrally (e.g., `10.0.0.0/8` for AWS, `172.16.0.0/12` for on-premises).

### Subnets: AZ-Scoped Subdivisions

A subnet is a subdivision of a VPC CIDR assigned to a single Availability Zone. You cannot span a subnet across AZs — this is by design, because subnets are the unit of AZ-specific resource placement. Resources in a subnet inherit the subnet's route table and can communicate with any other resource in the VPC via the local route.

AWS reserves 5 IP addresses in every subnet — you do not get to use all of them:
- `.0` — Network address
- `.1` — VPC router
- `.2` — AWS DNS
- `.3` — Reserved for future use
- `.255` — Broadcast (AWS does not support broadcast, but the address is reserved)

This means a /28 subnet (16 total IPs) gives you only 11 usable addresses. A /24 subnet (256 total IPs) gives you 251 usable addresses. Factor this into subnet sizing — particularly for subnets that will hold many EC2 instances or RDS replicas.

**Why subnets matter beyond address space:** Subnets are the boundary at which you apply route tables and Network ACLs. A subnet's route table determines whether it is public or private. A subnet's NACL determines what traffic is allowed in or out at the subnet boundary. The public/private split is not about the subnet itself — it is entirely about which route table is associated with it.

### Public vs. Private Subnets

A subnet is "public" if and only if its associated route table contains a route that sends internet-bound traffic (`0.0.0.0/0`) to an Internet Gateway. There is nothing else that makes a subnet public. A resource in a public subnet also needs a public IP address (assigned automatically or explicitly) to be reachable from the internet — but the subnet's public status is purely a routing designation.

A subnet is "private" when its route table has no route to an Internet Gateway. Resources in a private subnet cannot be reached from the internet and cannot initiate outbound internet connections — unless a NAT Gateway provides outbound-only access.

The standard three-tier architecture maps directly onto this:
- **Public subnets:** Application Load Balancers, NAT Gateways, bastion hosts — anything that must accept inbound internet traffic or that needs to sit between the internet and private resources
- **Private app subnets:** EC2 instances, ECS tasks, Lambda — the actual application logic, shielded from direct internet access
- **Private data subnets:** RDS, ElastiCache, Redshift — databases and caches that should never be directly internet-accessible

### Internet Gateway

An Internet Gateway (IGW) is a horizontally scaled, redundant, highly available VPC component that you attach to a VPC to enable internet connectivity. Exactly one IGW can be attached to a VPC at a time. The IGW performs Network Address Translation (NAT) between an instance's private IP and its associated public or Elastic IP address when traffic leaves or enters the VPC.

The IGW is stateless and does not limit bandwidth — it scales automatically to handle all traffic. You do not manage it operationally; you simply create it, attach it to the VPC, and add it as a route target. The IGW enables bidirectional internet traffic: inbound connections to resources with public IPs, and outbound connections from those same resources.

**Why the IGW matters:** Many exam questions ask what component is missing when an EC2 instance in a "public" subnet cannot reach the internet. The diagnostic checklist is: (1) Is an IGW attached to the VPC? (2) Does the subnet's route table have `0.0.0.0/0 → igw-xxx`? (3) Does the instance have a public IP? (4) Do the security group rules allow the traffic? The most commonly missed element is the route table entry or the IGW attachment.

### Route Tables

A route table is a set of rules (routes) that determine where network traffic from a subnet is directed. Every VPC has a main route table; any subnet not explicitly associated with a custom route table uses the main route table by default.

Every route table contains an immutable local route — for a VPC with CIDR `10.0.0.0/16`, this is `10.0.0.0/16 → local`. This route cannot be deleted and ensures all resources within the VPC can communicate with each other without any additional configuration.

Route matching uses longest-prefix match: the most specific route that matches the destination IP wins. If you have both `0.0.0.0/0 → igw-xxx` and `10.1.0.0/24 → pcx-xxx` (a peering connection), traffic to `10.1.0.5` uses the peering route (more specific) while all other traffic uses the IGW route.

**Explicit vs. main route table associations:** When you create a custom route table and associate specific subnets with it, those associations are explicit. Subnets without explicit associations fall back to the main route table. This matters because changes to the main route table affect all implicitly associated subnets — a risk in production environments. Best practice: associate every subnet explicitly with its appropriate route table so there is no ambiguity.

### NAT Gateway

A NAT Gateway allows resources in private subnets to initiate outbound internet connections — for software updates, API calls, external service integrations — while remaining completely unreachable from inbound internet connections. NAT stands for Network Address Translation: the NAT Gateway replaces the private source IP with its own public IP before forwarding packets to the internet, and reverses the translation for return traffic.

NAT Gateways are AZ-scoped resources. A NAT Gateway deployed in `us-east-1a` can only be used by resources in the same AZ without crossing AZ boundaries (which adds latency and costs cross-AZ data transfer fees). For high availability, deploy one NAT Gateway per AZ and configure each AZ's private subnet route table to point to the NAT Gateway in the same AZ.

Billing for NAT Gateways has two components: an hourly charge per gateway (approximately $0.045/hour) and a data processing charge per GB of traffic (approximately $0.045/GB). For workloads with heavy outbound traffic (video processing, large data transfers), NAT Gateway costs can become significant — VPC Endpoints are often used to route AWS service traffic (S3, DynamoDB) without touching the NAT Gateway.

### Default VPC

Every AWS region has a default VPC pre-created in your account. Its properties:
- CIDR: `172.31.0.0/16`
- One /20 subnet per Availability Zone, all public
- An IGW attached and a route table with `0.0.0.0/0 → igw-xxx`
- `enableDnsSupport` and `enableDnsHostnames` enabled

The default VPC makes it trivial to launch EC2 instances immediately without any network configuration. This is intentional — it lowers the barrier to getting started. However, the default VPC is not suitable for production workloads because all subnets are public (any instance with a public IP is internet-accessible), there is no private subnet isolation, and multiple teams sharing the default VPC creates security and governance risks. Production workloads always belong in custom VPCs with deliberately designed subnet topology.

## Configuration Reference

### CLI: Create a VPC and Subnets

```bash
# Create a VPC with a /16 CIDR
aws ec2 create-vpc \
  --cidr-block 10.0.0.0/16 \
  --tag-specifications 'ResourceType=vpc,Tags=[{Key=Name,Value=prod-vpc}]'
# Returns: VpcId (e.g., vpc-0abc1234)

# Enable DNS hostnames (required for Route 53 Private Hosted Zones and some service integrations)
aws ec2 modify-vpc-attribute \
  --vpc-id vpc-0abc1234 \
  --enable-dns-hostnames

# Create a public subnet in us-east-1a
aws ec2 create-subnet \
  --vpc-id vpc-0abc1234 \
  --cidr-block 10.0.1.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=public-1a}]'
# Returns: SubnetId (e.g., subnet-0pub1a)

# Create a private app subnet in us-east-1a
aws ec2 create-subnet \
  --vpc-id vpc-0abc1234 \
  --cidr-block 10.0.11.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-app-1a}]'

# Create a private data subnet in us-east-1a
aws ec2 create-subnet \
  --vpc-id vpc-0abc1234 \
  --cidr-block 10.0.21.0/24 \
  --availability-zone us-east-1a \
  --tag-specifications 'ResourceType=subnet,Tags=[{Key=Name,Value=private-data-1a}]'
```

### CLI: Create and Attach an Internet Gateway

```bash
# Create the IGW
aws ec2 create-internet-gateway \
  --tag-specifications 'ResourceType=internet-gateway,Tags=[{Key=Name,Value=prod-igw}]'
# Returns: InternetGatewayId (e.g., igw-0abc5678)

# Attach IGW to the VPC — one IGW per VPC maximum
aws ec2 attach-internet-gateway \
  --internet-gateway-id igw-0abc5678 \
  --vpc-id vpc-0abc1234

# Create a route table for public subnets
aws ec2 create-route-table \
  --vpc-id vpc-0abc1234 \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=public-rt}]'
# Returns: RouteTableId (e.g., rtb-0pub)

# Add the internet route — this is what makes a subnet "public"
aws ec2 create-route \
  --route-table-id rtb-0pub \
  --destination-cidr-block 0.0.0.0/0 \
  --gateway-id igw-0abc5678

# Associate the public subnet with the public route table
aws ec2 associate-route-table \
  --route-table-id rtb-0pub \
  --subnet-id subnet-0pub1a
```

### CLI: Create a NAT Gateway and Private Route Table

```bash
# Allocate an Elastic IP for the NAT Gateway
aws ec2 allocate-address --domain vpc
# Returns: AllocationId (e.g., eipalloc-0abc)

# Create NAT Gateway in the PUBLIC subnet (not the private subnet)
# NAT Gateway itself needs internet access, so it must live in a public subnet
aws ec2 create-nat-gateway \
  --subnet-id subnet-0pub1a \
  --allocation-id eipalloc-0abc \
  --tag-specifications 'ResourceType=natgateway,Tags=[{Key=Name,Value=nat-1a}]'
# Returns: NatGatewayId (e.g., nat-0abc)
# Wait for NAT Gateway to reach 'available' state before creating routes

# Create a route table for private subnets in us-east-1a
aws ec2 create-route-table \
  --vpc-id vpc-0abc1234 \
  --tag-specifications 'ResourceType=route-table,Tags=[{Key=Name,Value=private-rt-1a}]'
# Returns: RouteTableId (e.g., rtb-0priv1a)

# Route outbound internet traffic through the NAT Gateway
aws ec2 create-route \
  --route-table-id rtb-0priv1a \
  --destination-cidr-block 0.0.0.0/0 \
  --nat-gateway-id nat-0abc

# Associate private app subnet with the private route table
aws ec2 associate-route-table \
  --route-table-id rtb-0priv1a \
  --subnet-id subnet-0priv-app-1a

# Associate private data subnet with the same route table
aws ec2 associate-route-table \
  --route-table-id rtb-0priv1a \
  --subnet-id subnet-0priv-data-1a
```

### Console Navigation

**VPC Dashboard:** AWS Console → VPC → Your VPCs → Create VPC. The "VPC and more" wizard option automatically creates subnets, route tables, and an IGW in one workflow — useful for learning but review every resource it creates.

**Route Tables:** VPC → Route Tables → select a route table → Routes tab (view routes) / Subnet Associations tab (see which subnets use this table).

**NAT Gateways:** VPC → NAT Gateways → Create NAT Gateway. You must specify the subnet (must be public) and an Elastic IP allocation.

### CIDR Planning Table: 3-Tier, 3-AZ Production VPC

| Subnet Name        | CIDR           | AZ           | Tier    | Route Target           |
|--------------------|----------------|--------------|---------|------------------------|
| public-1a          | 10.0.1.0/24    | us-east-1a   | Public  | 0.0.0.0/0 → IGW        |
| public-1b          | 10.0.2.0/24    | us-east-1b   | Public  | 0.0.0.0/0 → IGW        |
| public-1c          | 10.0.3.0/24    | us-east-1c   | Public  | 0.0.0.0/0 → IGW        |
| private-app-1a     | 10.0.11.0/24   | us-east-1a   | App     | 0.0.0.0/0 → nat-1a     |
| private-app-1b     | 10.0.12.0/24   | us-east-1b   | App     | 0.0.0.0/0 → nat-1b     |
| private-app-1c     | 10.0.13.0/24   | us-east-1c   | App     | 0.0.0.0/0 → nat-1c     |
| private-data-1a    | 10.0.21.0/24   | us-east-1a   | Data    | (no internet route)    |
| private-data-1b    | 10.0.22.0/24   | us-east-1b   | Data    | (no internet route)    |
| private-data-1c    | 10.0.23.0/24   | us-east-1c   | Data    | (no internet route)    |

Each AZ has its own NAT Gateway in its public subnet, so private subnet resources always stay within their AZ for outbound traffic. The data tier subnets have no internet route at all — databases don't need to reach the internet.

## How to Decide

| Scenario | Decision |
|---|---|
| Resource needs inbound internet traffic (ALB, bastion) | Public subnet + IGW route |
| Resource needs outbound internet only (app server pulling updates) | Private subnet + NAT Gateway route |
| Resource must never reach the internet (database, cache) | Private subnet with no internet route |
| You need internet access from a private subnet in 2 AZs | Deploy one NAT Gateway per AZ; point each AZ's private route table to its local NAT |
| Starting a new production workload | Create a custom VPC — never use the default VPC |
| You need to expand a VPC's address space | Add a secondary CIDR block rather than recreating the VPC |
| Two VPCs need to communicate now or in the future | Plan non-overlapping CIDRs from the start — you cannot peer overlapping VPCs |
| NAT Gateway cost is too high | Route AWS service traffic (S3, DynamoDB) through VPC Endpoints to bypass NAT |

## How This Connects

- **Security Groups and NACLs** are the traffic filtering layer applied on top of the routing infrastructure you set up here — a NACL sits at the subnet boundary; a security group sits at the instance ENI. Both work within the VPC topology defined by subnets and route tables.
- **VPC Peering and Transit Gateway** both require non-overlapping CIDR blocks across connected VPCs — the CIDR planning decisions made here determine whether future connectivity is even possible.
- **VPN and Direct Connect** connect on-premises networks to this VPC; the Virtual Private Gateway attaches to the VPC and propagates routes into your VPC route tables, extending your on-premises routing into AWS.
- **VPC Endpoints** eliminate the need to send AWS service traffic (S3, DynamoDB, SSM) through the NAT Gateway, reducing costs and keeping traffic within the AWS network — they are a direct optimization of the outbound path defined by private subnet route tables.
- **Route 53 Private Hosted Zones** rely on the VPC's DNS settings (`enableDnsSupport`, `enableDnsHostnames`) to resolve internal names like `db.internal` to private IP addresses — DNS in VPC is foundational to service discovery in microservices architectures.

## Exam Traps

**"Public subnet" means more than just auto-assign public IP.** Many candidates think assigning a public IP to an instance is what makes a subnet public. The defining characteristic is the route table: `0.0.0.0/0 → igw-xxx`. An instance with a public IP in a subnet with no IGW route cannot reach the internet. Both the route AND the IP are required.

**NAT Gateway must be in a public subnet.** Exam questions sometimes describe a NAT Gateway placed in a private subnet and ask why internet access fails. The NAT Gateway itself needs a path to the internet — it must live in a subnet with an IGW route. Placing it in a private subnet creates a circular dependency where nothing reaches the internet.

**AWS reserves 5 IPs per subnet, not 4.** A common mistake is thinking AWS reserves only the network address and broadcast address (2 IPs), leading to incorrect answers about usable subnet sizes. The correct number is 5: network, router, DNS, future use, and broadcast.

**One NAT Gateway per AZ for HA — not one per VPC.** A single NAT Gateway deployed in one AZ is a single point of failure. If that AZ goes down, all private subnets in other AZs lose internet access. The correct HA design is one NAT Gateway per AZ with each AZ's private route table pointing to its local NAT Gateway.

**The default VPC CIDR is 172.31.0.0/16, not 10.0.0.0/16.** This is a frequent exam distractor. The default VPC uses the `172.31.0.0/16` range, not the more commonly used `10.0.0.0/16`. Questions about the default VPC may test whether you know this specific detail.

## Summary

- A VPC is a logically isolated virtual network in one AWS region, defined by a CIDR block (/16 to /28, from RFC 1918 ranges).
- AWS reserves 5 IP addresses per subnet — account for this in all subnet sizing calculations.
- A subnet is public when its route table routes `0.0.0.0/0` to an Internet Gateway; it is private when no such route exists.
- An Internet Gateway enables bidirectional internet access for resources with public IPs; exactly one can be attached per VPC.
- A NAT Gateway enables outbound-only internet access for private subnets; it must live in a public subnet and should be deployed one per AZ for high availability.
- The default VPC (`172.31.0.0/16`, all public subnets) is convenient for development but not suitable for production workloads.

## Examples

A three-tier e-commerce platform launches on AWS. The architecture team creates a custom VPC with CIDR `10.0.0.0/16` and plans nine subnets: three public (/24 each) and six private (three app-tier, three data-tier), one set per Availability Zone. The Application Load Balancer launches in the public subnets and requires a public IP and an IGW route to accept HTTPS traffic from the internet. The application tier (EC2 in Auto Scaling groups) runs in private app subnets. Each AZ's private app subnet routes `0.0.0.0/0` to the NAT Gateway in that same AZ's public subnet, allowing EC2 instances to pull OS patches and contact external payment APIs. The RDS Multi-AZ database runs in the private data subnets with no internet route at all — it communicates only with the application tier via the local VPC route. This layout enforces the principle of least privilege at the network layer: only the ALB is internet-exposed.

A healthcare SaaS company migrates to AWS and must ensure their application servers can install security patches without being reachable inbound. They deploy NAT Gateways in each of three public subnets (one per AZ) and configure the three private app subnet route tables to each point to their corresponding local NAT Gateway. When an EC2 instance in `us-east-1b` initiates an outbound HTTP request to a package repository, the packet flows: EC2 → private subnet → private route table → NAT Gateway in `us-east-1b` public subnet → IGW → internet. The return traffic reverses the path, with NAT translation restoring the original private IP. No inbound internet session can be initiated to the EC2 instance because no route from the internet points to the instance's private IP. When their original design mistakenly placed a single NAT Gateway in `us-east-1a`, they discovered cross-AZ data transfer charges on their bill — moving NAT Gateways to each AZ eliminated the cross-AZ traffic entirely.

A fintech startup initially uses the default VPC for rapid prototyping. When they hire their first security engineer, she immediately identifies three problems: all developer-launched EC2 instances got public IPs by default (the default VPC has auto-assign public IP enabled on all subnets), there is no network isolation between their production database test instance and developer workstations, and the CIDR `172.31.0.0/16` conflicts with the company's on-premises network range, making future VPN connectivity impossible. She creates a new custom VPC with `10.10.0.0/16` (chosen to avoid conflicts with the existing `10.0.0.0/8` on-premises range), designs explicit public and private subnets with auto-assign public IP disabled by default, and migrates all production resources. This illustrates why default VPC is a starting point, not a production pattern — it optimizes for ease of first use, not for security, governance, or future connectivity planning.

## Think About It

1. AWS reserves 5 IP addresses per subnet: network, router, DNS, future use, and broadcast. If you are designing a subnet for an RDS Multi-AZ deployment that requires a primary instance, a standby instance, and up to 3 read replicas, what is the minimum subnet size (/28, /27, /26) you would choose and why? What happens if you undersize the subnet and need to add resources later?

2. A NAT Gateway must live in a public subnet and itself requires an IGW route to reach the internet. Trace the full packet path for an EC2 instance in a private subnet making an outbound HTTPS request to `api.stripe.com`. Name every AWS resource the packet passes through, the source IP at each hop, and where NAT translation occurs.

3. You are the architect for a company planning to connect three VPCs together in the future using VPC Peering. VPC A uses `10.0.0.0/16`, VPC B uses `10.1.0.0/16`, and VPC C uses `10.0.0.0/16`. Which pair of VPCs can be peered immediately? What options does the team have to resolve the conflict, and what are the trade-offs of each approach?

4. The route table local route (`10.0.0.0/16 → local`) is immutable and always present. What would break in a VPC if this route could be deleted? Give two specific scenarios where the local route is the only thing enabling a connection to succeed.

5. A startup uses a single NAT Gateway in one AZ to save money. They argue that NAT Gateway is a managed service and "AWS handles the redundancy." Is this argument correct? What failure scenario is not covered by a single NAT Gateway, and at what approximate monthly traffic volume does deploying one NAT Gateway per AZ become cheaper than the cross-AZ data transfer costs from a single NAT?

## Quick Check

**Q1.** A solutions architect creates a subnet with CIDR `10.0.5.0/28` and attempts to launch 12 EC2 instances in it. After launching 11 instances, no more can be launched due to insufficient IP addresses. Why?

- A) A /28 subnet only has 12 total IPs and one was used for the first EC2 instance's public IP
- B) A /28 subnet has 16 total IPs, AWS reserves 5, leaving 11 usable addresses
- C) AWS limits EC2 instances per subnet to 11 regardless of subnet size
- D) The subnet needs to be associated with a route table before more IPs are available

**Answer: B** — A /28 CIDR provides 16 IP addresses (2^4). AWS reserves 5 per subnet (network, router, DNS, future use, broadcast), leaving exactly 11 usable addresses. The 12th instance cannot launch because there are no free IPs.

**Q2.** An EC2 instance in a private subnet can reach other instances in the same VPC but cannot connect to the internet to download updates. The instance has no public IP. A NAT Gateway exists in the VPC. What is the MOST LIKELY cause of the failure?

- A) The NAT Gateway is in a private subnet instead of a public subnet
- B) The private subnet's route table has no route directing `0.0.0.0/0` to the NAT Gateway
- C) The EC2 instance's security group is blocking outbound traffic
- D) The Internet Gateway is not attached to the VPC

**Answer: B** — The fact that the instance can reach other VPC resources confirms the local route and VPC routing are working. The NAT Gateway exists, so the likely missing piece is the route table entry in the private subnet pointing `0.0.0.0/0` to the NAT Gateway. Without that route, outbound internet traffic has no path.

**Q3.** Which of the following statements about the AWS default VPC is correct?

- A) The default VPC uses the CIDR `10.0.0.0/16` and has one public subnet per AZ
- B) The default VPC uses the CIDR `172.31.0.0/16`, has public subnets in each AZ, and has an Internet Gateway attached
- C) The default VPC has private subnets by default for security; you must manually add an Internet Gateway
- D) The default VPC is created on demand the first time you launch an EC2 instance in a region

**Answer: B** — The default VPC CIDR is `172.31.0.0/16` (not `10.0.0.0/16`). It comes with public subnets in every AZ, an IGW attached, and route tables configured for internet access. It exists automatically in every region before you launch anything.

## What's Next

Next up: Security Groups and Network ACLs — the two-layer traffic filtering system that controls what flows through the VPC topology you just built.
