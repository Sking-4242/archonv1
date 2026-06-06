---
title: "AWS VPN and Direct Connect"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS VPN and Direct Connect

## Overview

Most production AWS architectures have a hybrid component — on-premises data centers, corporate offices, and manufacturing facilities that need private, secure connectivity to resources running in AWS VPCs. AWS offers two fundamentally different mechanisms for this: Site-to-Site VPN establishes an IPsec-encrypted tunnel over the existing public internet and can be operational in minutes to hours; AWS Direct Connect provisions a dedicated physical fiber connection from your facility to an AWS Direct Connect location and delivers consistent, high-bandwidth connectivity that never touches the public internet.

The choice between VPN and Direct Connect is not about security (both are private and encrypted), it is about bandwidth, latency consistency, reliability requirements, and time-to-provision. Site-to-Site VPN is fast to set up, low cost, and sufficient for moderate bandwidth needs — but its performance is bounded by public internet routing, which can vary significantly based on congestion, routing changes, and BGP path selection. Direct Connect provides predictable throughput and sub-millisecond latency consistency, but requires physical circuit provisioning (1–3 months) and significant cost for the port and cross-connect.

This lesson covers the technical architecture of both options — the AWS-side and on-premises-side components, routing protocols, redundancy design, and the decision criteria that drive the choice between them. It also covers two related services: Direct Connect Gateway (for connecting one DX circuit to VPCs in multiple regions) and AWS Client VPN (for individual remote-worker connectivity). VPN and Direct Connect are consistently tested on both the Solutions Architect Associate and Professional exams, with scenarios focused on choosing the right option, designing for resilience, and understanding the role of BGP in hybrid connectivity.

## Core Concepts

### Site-to-Site VPN: Encrypted Tunnels over the Internet

AWS Site-to-Site VPN creates an IPsec (Internet Protocol Security) encrypted tunnel between an on-premises network device and the AWS side of the connection. Every VPN connection consists of two tunnels for redundancy — if one tunnel fails, BGP reconverges and traffic shifts to the second tunnel automatically.

**AWS-side components:**
- **Virtual Private Gateway (VGW):** The AWS-managed VPN concentrator that terminates the VPN tunnels. A VGW attaches to a single VPC. You can attach the VPN to a Transit Gateway instead of a VGW when connecting multiple VPCs to the same on-premises network.
- **Customer Gateway (CGW):** An AWS resource object that represents your on-premises VPN device. You configure it with the public IP address of your on-premises router and the BGP ASN (Autonomous System Number) if using dynamic routing.

**On-premises side:**
- A physical or virtual VPN device (Cisco, Juniper, Palo Alto, pfSense, etc.) that supports IKEv1 or IKEv2 and IPsec. AWS provides a device-specific configuration download from the console with pre-shared keys and tunnel endpoint IPs.

**Routing options:**
- **Static routing:** You manually specify which CIDRs are reachable via the VPN tunnel. Simple but requires manual updates when routes change.
- **Dynamic routing (BGP):** The on-premises device and VGW exchange route advertisements automatically via BGP. New subnets on either side are learned automatically. BGP ASN 64512 is the default AWS ASN for VGW; you specify your on-premises ASN in the Customer Gateway configuration. BGP also enables automatic failover between the two VPN tunnels.

**Bandwidth:** Each VPN tunnel supports up to 1.25 Gbps. The two tunnels per connection serve as redundant paths for high availability — by default, one tunnel is active and the other is standby. Additive throughput (approaching 2.5 Gbps) requires ECMP (Equal-Cost Multipath) routing, which must be explicitly configured on your on-premises router and the Transit Gateway attachment; it is not enabled by default. Real-world throughput is also limited by your internet connection quality and latency. VPN throughput over a 100 Mbps internet connection will not reach 1.25 Gbps regardless of the VPN configuration.

**Use cases for VPN:** Quick setup for hybrid connectivity proof-of-concept, backup path for Direct Connect, development and staging environments, moderate bandwidth requirements (under ~500 Mbps), or sites where dedicated circuits are not available.

### AWS Direct Connect: Dedicated Private Network Connectivity

AWS Direct Connect provides a dedicated, physical network connection from your data center or colocation facility to an AWS Direct Connect location. Traffic never traverses the public internet. You get consistent bandwidth, consistent latency, and lower data transfer pricing than internet-based transfers to AWS.

**Physical architecture:**
1. Your router in your data center or a colocation facility
2. A cross-connect (fiber) at a Direct Connect location (AWS-operated cage in a neutral colocation facility like Equinix)
3. AWS Direct Connect equipment at that location
4. AWS backbone to your target AWS region

You do not physically own the connection to AWS — you own or lease the physical port in the colocation facility and provision the cross-connect to the AWS equipment.

**Port speeds:**
- **Dedicated connections:** 1 Gbps, 10 Gbps, or 100 Gbps — ordered directly from AWS
- **Hosted connections:** 50 Mbps to 10 Gbps — provisioned through an AWS Direct Connect Partner, which owns the port and subdivides it

**Provisioning timeline:** Ordering a dedicated connection typically takes 4–12 weeks. The physical circuit must be ordered, cross-connects must be installed at the colocation facility, and AWS must provision the port. This is the most significant operational difference from VPN — you cannot spin up Direct Connect in response to an immediate business need.

**Virtual Interfaces (VIFs):** After the physical connection is established, you create virtual interfaces on top of it to define where traffic is destined:
- **Private VIF:** Routes traffic to a specific VPC via a VGW or to multiple VPCs via a Direct Connect Gateway. Use for private IP connectivity to your VPC resources.
- **Public VIF:** Routes traffic to AWS public services (S3, DynamoDB, CloudFront) over the DX connection instead of the internet. Traffic uses AWS public IP addresses but stays on the DX circuit.
- **Transit VIF:** Connects to a Direct Connect Gateway that is associated with a Transit Gateway. Use this when you want all your VPCs (connected via TGW) to be reachable over the DX connection.

### Direct Connect Gateway: Multi-Region Access from One DX Circuit

A Direct Connect Gateway (DXGW) is a global AWS resource that lets a single Direct Connect connection reach VPCs in multiple AWS regions. Without a DXGW, a private VIF can only connect to a VGW in one specific region. With a DXGW, the private or transit VIF connects to the gateway, and the gateway is associated with VGWs or Transit Gateways in any AWS region.

The architecture: DX physical connection → Private VIF → Direct Connect Gateway → VGW in us-east-1, VGW in eu-west-1, VGW in ap-southeast-1. One DX circuit provides private connectivity to VPCs across three regions. This is significantly cheaper than provisioning separate DX connections per region.

Important limitation: A Direct Connect Gateway does not allow communication between the VPCs attached to it — it only provides connectivity from on-premises to each VPC. Traffic between VPCs must use VPC Peering or Transit Gateway.

### Direct Connect Resilience Architecture

A single Direct Connect connection is a single point of failure. DX resilience architecture must account for multiple failure modes:

1. **Fiber cut:** Physical damage to the fiber between your facility and the DX location
2. **Port failure:** Hardware failure on your equipment or the AWS equipment at the DX location
3. **DX location failure:** Power outage or major failure at the entire colocation facility

AWS defines four resilience tiers for DX:

| Resilience Level | Architecture | Protects Against |
|---|---|---|
| No resilience | Single DX connection | Nothing — any failure breaks connectivity |
| Development resilience | Single DX + VPN backup | Fiber cuts and port failures (VPN takes over); not DX location outage |
| High resilience | Two DX connections to same DX location | Port failures and fiber cuts on one circuit; not DX location outage |
| Maximum resilience | Two DX connections at two separate DX locations | All failure modes including full facility outage at one location |

**The most common exam scenario:** DX as primary with VPN backup. BGP is configured to prefer DX routes (using BGP LOCAL_PREF or AS path prepending) when DX is healthy. When DX fails, BGP reconverges within 90 seconds and traffic fails over to VPN automatically. This provides a backup path over a completely different physical transport.

Note: Two DX connections to the same DX location do NOT protect against a facility outage — both connections share the same building's power, cooling, and physical infrastructure. Maximum resilience requires connections to geographically separate DX locations.

### Client VPN: Remote Worker Access

AWS Client VPN provides an OpenVPN-based managed service for individual user remote access to AWS and on-premises resources. It is the AWS equivalent of a traditional corporate SSL VPN for remote workers.

**Architecture:**
- A Client VPN endpoint is associated with a VPC subnet (creating an ENI in that subnet)
- Remote users install the OpenVPN client and connect using the downloaded configuration file
- Connected users receive IP addresses from a specified client IP CIDR range
- Users can access the associated VPC (and anything routable from it — peered VPCs, on-premises via TGW)

**Authentication options:** Active Directory (via AWS Directory Service), SAML 2.0 (Okta, Azure AD, etc.), or mutual certificate authentication.

**Client VPN vs. Site-to-Site VPN:** Client VPN connects individual user devices (one VPN session per user). Site-to-Site VPN connects entire networks (one tunnel connecting all on-premises users to AWS through their corporate network device). Use Client VPN for developers working from home; use Site-to-Site VPN or Direct Connect for connecting a data center.

## Configuration Reference

### CLI: Create a Site-to-Site VPN

```bash
# Step 1: Create a Customer Gateway (represents on-premises device)
aws ec2 create-customer-gateway \
  --type ipsec.1 \
  --public-ip 203.0.113.10 \
  --bgp-asn 65000
  # --public-ip: the public IP of your on-premises VPN device
  # --bgp-asn: your on-premises BGP Autonomous System Number
  # Use 65000–65534 for private ASNs; must be different from AWS default (64512)
# Returns: CustomerGatewayId (e.g., cgw-0abc1234)

# Step 2: Create a Virtual Private Gateway (AWS side VPN concentrator)
aws ec2 create-vpn-gateway \
  --type ipsec.1 \
  --amazon-side-asn 64512
  # --amazon-side-asn: AWS BGP ASN (64512 is default; change if conflicts with your network)
# Returns: VpnGatewayId (e.g., vgw-0abc1234)

# Step 3: Attach the VGW to your VPC
aws ec2 attach-vpn-gateway \
  --vpn-gateway-id vgw-0abc1234 \
  --vpc-id vpc-0abc1234

# Step 4: Create the VPN connection between CGW and VGW
aws ec2 create-vpn-connection \
  --type ipsec.1 \
  --customer-gateway-id cgw-0abc1234 \
  --vpn-gateway-id vgw-0abc1234 \
  --options StaticRoutesOnly=false
  # StaticRoutesOnly=false enables BGP dynamic routing
  # StaticRoutesOnly=true for static routing (specify routes manually)
# Returns: VpnConnectionId (e.g., vpn-0abc1234)

# Step 5 (Static routing only): Add static routes for on-premises CIDRs
aws ec2 create-vpn-connection-route \
  --vpn-connection-id vpn-0abc1234 \
  --destination-cidr-block 192.168.0.0/16
  # 192.168.0.0/16 is your on-premises CIDR

# Step 6: Enable route propagation in VPC route table
# This makes VGW automatically add learned routes (BGP) to the route table
aws ec2 enable-vgw-route-propagation \
  --route-table-id rtb-0private \
  --gateway-id vgw-0abc1234

# Step 7: Download on-premises device configuration from console
# Console: VPC → Site-to-Site VPN Connections → select connection
# → Download Configuration → choose your device vendor and software version
# The downloaded file contains pre-shared keys, tunnel endpoint IPs, and device-specific config syntax
```

### CLI: Direct Connect Virtual Interfaces

```bash
# After physical DX connection is provisioned, create a Private VIF
aws directconnect create-private-virtual-interface \
  --connection-id dxcon-0abc1234 \
  --new-private-virtual-interface \
    virtualInterfaceName=prod-private-vif,\
    vlan=101,\
    asn=65000,\
    virtualGatewayId=vgw-0abc1234,\
    addressFamily=ipv4,\
    customerAddress=169.254.10.2/30,\
    amazonAddress=169.254.10.1/30
  # vlan: 802.1Q VLAN tag — must match your router configuration
  # asn: your on-premises BGP ASN
  # customerAddress/amazonAddress: BGP peering addresses on the DX link (/30 link-local IPs)

# Create a Transit VIF (connects to DXGW → TGW instead of individual VGW)
aws directconnect create-transit-virtual-interface \
  --connection-id dxcon-0abc1234 \
  --new-transit-virtual-interface \
    virtualInterfaceName=transit-vif,\
    vlan=102,\
    asn=65000,\
    directConnectGatewayId=dxgw-0abc1234,\
    addressFamily=ipv4,\
    customerAddress=169.254.20.2/30,\
    amazonAddress=169.254.20.1/30

# Associate a Direct Connect Gateway with a VGW (for Private VIF to reach a VPC)
aws directconnect create-direct-connect-gateway-association \
  --direct-connect-gateway-id dxgw-0abc1234 \
  --gateway-id vgw-0vpc-us-east-1
  # Can repeat for VGWs in other regions — one DXGW, multiple regional VGWs
```

### Console Navigation

**Site-to-Site VPN:** VPC → Site-to-Site VPN Connections → Create VPN Connection. Select your VGW (or TGW) and your CGW. After creation, select the connection → Download Configuration to get device-specific tunnel configuration for your on-premises router.

**Customer Gateway:** VPC → Customer Gateways → Create Customer Gateway. You only need the public IP and BGP ASN.

**Direct Connect:** AWS Direct Connect console (separate from VPC console) → Connections → Create Connection (for hosted) or request via AWS (for dedicated). After physical provisioning: Direct Connect → Virtual Interfaces → Create Virtual Interface.

**Direct Connect Gateway:** Direct Connect → Direct Connect Gateways → Create Direct Connect Gateway. Then associate VGWs from different regions to the DXGW.

### BGP ASN Requirements Summary

| Component | ASN Used | Notes |
|---|---|---|
| Virtual Private Gateway (AWS) | 64512 (default) or custom public/private ASN | Can set custom ASN at VGW creation time |
| Customer Gateway (on-premises) | Your on-premises BGP ASN | Must differ from VGW ASN; 65000–65534 for private |
| Transit Gateway | 64512 (default) or custom | Set at TGW creation time |
| Direct Connect (Private VIF) | Your on-premises BGP ASN | Same ASN as your on-premises network |
| Multi-hop BGP for DX backup VPN | AS path prepending | Make VPN routes less preferred than DX routes |

## How to Decide

| Requirement | Site-to-Site VPN | Direct Connect |
|---|---|---|
| Time to provision | Minutes to hours | 4–12 weeks (physical circuit) |
| Bandwidth needed | Up to ~1.25 Gbps per tunnel (internet-limited) | 1, 10, or 100 Gbps (dedicated port) |
| Latency consistency | Variable (internet routing) | Consistent, predictable (dedicated circuit) |
| Traffic path | Over public internet (encrypted) | Never touches public internet |
| Cost profile | Low fixed cost; standard data transfer rates | High fixed cost (port + cross-connect); lower per-GB rates |
| Use for backup/failover | Yes — ideal as DX backup path | Primary connectivity path |
| Compliance requirement for no internet | No | Yes — traffic stays on private circuit |
| Setup complexity | Low — download config and apply to router | High — physical infrastructure required |
| Suitable for high-volume data transfer (TB+/day) | No — cost and consistency issues | Yes — designed for this |
| Remote individual users | No — use Client VPN | No — use Client VPN |
| Connecting remote office without colocation | Yes — internet is available everywhere | No — requires colocation access |

## How This Connects

- **VPC Route Tables:** Both VPN and Direct Connect inject routes into your VPC's route tables. VGW route propagation (enabled on a route table) automatically adds learned on-premises routes from BGP. Without route propagation, you must manually add static routes for each on-premises CIDR — a maintenance burden that breaks whenever on-premises subnets change.
- **Transit Gateway:** The preferred attachment point for VPN and DX at scale. Instead of one VGW per VPC, attach VPN and Direct Connect Gateway to a TGW, and all VPCs connected to the TGW can reach on-premises. This is the standard enterprise hybrid architecture.
- **VPC Peering and routing:** If multiple VPCs are peered or connected via TGW, on-premises hosts that route to AWS via VPN or DX can potentially reach all VPCs in the topology — or can be isolated to specific VPCs via TGW route table segmentation. Always consider on-premises connectivity when designing VPC-to-VPC routing.
- **Security Groups and NACLs:** On-premises traffic arriving via VPN or DX enters a VPC through the VGW or TGW attachment. It then passes through the same security group and NACL evaluation as any other VPC traffic. Your security groups must include the on-premises CIDR ranges as allowed sources if on-premises hosts need to reach EC2 instances directly.
- **AWS Direct Connect SiteLink:** A newer DX feature that allows on-premises networks at different DX locations to communicate with each other over the AWS backbone — using DX as a private WAN backbone between sites, not just from on-premises to AWS.

## Exam Traps

**VPN bandwidth is limited by your internet connection, not the AWS service limit.** A common mistake is thinking the 1.25 Gbps VPN tunnel limit is what you will get. In practice, throughput depends on your internet circuit quality and the latency to AWS. A 100 Mbps internet connection cannot push 1.25 Gbps through a VPN tunnel. Direct Connect bandwidth is the port speed you purchased — it is not subject to internet congestion.

**Two tunnels per VPN connection are for HA, not for doubled bandwidth.** Both tunnels in a VPN connection connect to the same two AWS endpoints. Their purpose is to ensure that if one tunnel goes down, the second continues routing — they are not parallel paths that add capacity. Some architectures can load-balance across tunnels using ECMP, but this is an advanced configuration, not the default behavior.

**A Direct Connect connection to the same DX location is NOT maximum resilience.** Two DX connections to the same location protect against port or fiber failures but share the same physical facility. A power outage, building fire, or network equipment failure at that facility takes down both connections. Maximum resilience requires connections at two geographically separate DX locations. This is a common exam trap — "dual DX connections" sounds fully redundant until you ask about the DX location.

**Virtual Private Gateway vs. Direct Connect Gateway — they serve different scopes.** A VGW attaches to one VPC and enables VPN or DX connectivity for that VPC only. A Direct Connect Gateway is a global resource that enables one DX connection to reach VPCs across multiple regions. Exam questions often describe a need to connect one DX circuit to VPCs in three different regions — the answer is DXGW, not three separate VGWs with three separate DX connections.

**Client VPN is for individual users, not data center connectivity.** Client VPN (OpenVPN-based) is designed for remote workers connecting individual devices. It does not replace Site-to-Site VPN or Direct Connect for connecting an office or data center. An exam question asking about a company's 500-employee remote workforce needing AWS access points to Client VPN; a question about connecting a data center to AWS points to Site-to-Site VPN or Direct Connect based on bandwidth and latency requirements.

## Summary

- Site-to-Site VPN creates IPsec tunnels over the internet between an on-premises device (Customer Gateway) and AWS (Virtual Private Gateway or Transit Gateway); two tunnels per connection provide redundancy; maximum throughput is ~1.25 Gbps per tunnel.
- Direct Connect provides a dedicated physical fiber connection from your facility to an AWS DX location; delivers consistent bandwidth (1, 10, or 100 Gbps) and low-latency connectivity that never touches the public internet; provisioning takes 4–12 weeks.
- Direct Connect virtual interfaces define the connectivity type: Private VIF for VPC access via VGW, Transit VIF for multi-VPC access via TGW, Public VIF for AWS public service endpoints.
- Direct Connect Gateway is a global resource that allows one DX connection to reach VPCs in multiple AWS regions via multiple VGW associations.
- Maximum DX resilience requires connections at two separate DX locations, not just two connections to the same location.
- Client VPN (OpenVPN-based) provides individual user remote access to VPC resources and is distinct from Site-to-Site VPN, which connects entire networks.

## Examples

A mid-sized manufacturing company decides to connect their on-premises ERP system to a new AWS-hosted analytics platform. Their CIO wants it live within a week — a timeline that makes Direct Connect impossible. The network team provisions a Site-to-Site VPN in an afternoon: they create a Customer Gateway with their Cisco ASR's public IP, create a Virtual Private Gateway, attach it to their analytics VPC, create the VPN connection, and download the Cisco-specific configuration file from the AWS console. After applying 30 lines of IOS configuration to their ASR router, two IPsec tunnels come up and BGP establishes adjacency. The analytics EC2 instances can now reach the on-premises ERP over private IP addresses. Monthly cost: approximately $75 for the VPN connection plus data transfer. The entire setup took four hours. Six months later, when they see inconsistent throughput during month-end batch jobs, they start the Direct Connect procurement process — but the VPN gave them immediate value while the physical circuit is ordered.

A video streaming platform processes petabytes of media. Their editorial team in their Los Angeles office needs to upload 4K source files (200 GB each) to S3 for transcoding, but Site-to-Site VPN over their 1 Gbps internet connection was delivering only 200–400 Mbps with high variance, causing upload jobs to fail unpredictably. They provisioned a 10 Gbps Dedicated Direct Connect connection through the Equinix LA colocation facility. Six weeks after ordering, the cross-connect was installed and a Public VIF to S3 was configured. Uploads now consistently deliver 8–9 Gbps with latency under 3 ms, and per-GB data transfer rates are 40% lower than internet pricing. The predictability transformed their production scheduling — jobs that previously had a 20% failure rate due to timeout run reliably. The $5,000/month DX port cost was justified against the operational cost of failed jobs and engineer time spent managing retries.

A global bank runs Direct Connect as their primary hybrid connectivity for all production workloads. Their risk team requires a documented failover capability for regulatory compliance. They configure their on-premises BGP routers to advertise on-premises routes to both the DX connection (with higher BGP LOCAL_PREF, making it the preferred path) and a Site-to-Site VPN (with lower LOCAL_PREF). On the AWS side, VGW route propagation populates VPC route tables with both paths; the DX-learned routes are preferred. During a planned maintenance window, they simulate a DX failure by shutting down the DX port — within 90 seconds, BGP reconverges and all production traffic fails over to the VPN path at reduced throughput. When DX is restored, BGP prefers the DX routes again and traffic automatically migrates back. This pattern — DX primary with VPN backup and BGP for automatic failover — is the gold-standard hybrid resilience architecture documented in the AWS Direct Connect resilience recommendations.

## Think About It

1. Site-to-Site VPN provides up to 1.25 Gbps per tunnel, but the AWS documentation says "actual throughput may be lower based on factors such as packet size, jitter, and packet loss." Explain why public internet routing creates these variables that a Direct Connect circuit avoids. What specific mechanisms of internet routing (BGP path selection, congestion, multi-hop latency) create throughput variability for VPN that DX eliminates?

2. A company has a single Direct Connect connection and wants to ensure that if DX fails, their production workloads maintain some connectivity to AWS. They are evaluating: (a) a second DX connection to the same DX location, (b) a second DX connection to a different DX location, and (c) a Site-to-Site VPN backup. For each option, which failure scenarios are protected and which are not? Which option is most cost-effective for moderate resilience requirements?

3. You need to connect one Direct Connect circuit to VPCs in three AWS regions (us-east-1, eu-west-1, ap-southeast-1). Walk through the architecture using Direct Connect Gateway: what resources do you create, in what order, and how does the routing work when on-premises traffic is destined for a VPC in eu-west-1?

4. BGP is used for dynamic routing in both VPN and Direct Connect configurations. What are the advantages of BGP dynamic routing over static routing for hybrid AWS connectivity? Describe a specific scenario where a static routing configuration would fail but BGP would handle correctly — for example, adding a new subnet to the on-premises network, or failing over from a primary to a backup path.

5. AWS Client VPN and Site-to-Site VPN both use VPN technology. Your company has 300 remote employees who need access to an internal AWS-hosted application, and a data center that needs a persistent connection to AWS for database replication. Which VPN product would you use for each requirement, and what are the architectural differences that make each appropriate for its use case?

## Quick Check

**Q1.** A company uses AWS Direct Connect as its primary hybrid connectivity. For resilience, they have a second Direct Connect connection at the same DX location. A power outage occurs at the DX location. What is the impact on connectivity?

- A) Connectivity is maintained because the second connection provides failover
- B) Both connections fail because they share the same physical facility; connectivity to AWS is lost
- C) One connection fails over to the other automatically via BGP
- D) AWS reroutes traffic over the public internet automatically until DX is restored

**Answer: B** — Two DX connections at the same location share the facility's physical infrastructure (power, cooling, network equipment). A facility-level outage affects both connections simultaneously. Maximum resilience requires connections at two geographically separate DX locations — not two connections at the same location.

**Q2.** A company needs to connect their on-premises network to VPCs in three different AWS regions using a single Direct Connect circuit. Which combination of AWS services enables this architecture?

- A) One Virtual Private Gateway per region, each with a separate Direct Connect virtual interface
- B) A Direct Connect Gateway associated with Virtual Private Gateways in each of the three regions, connected via a single Private VIF
- C) A Transit Gateway in each region, each requiring its own Direct Connect connection
- D) AWS Global Accelerator with Direct Connect to route traffic to each region

**Answer: B** — A Direct Connect Gateway is a global resource that can be associated with VGWs (or TGWs) in multiple AWS regions. One Private VIF connects to the DXGW, and the DXGW connects to VGWs in us-east-1, eu-west-1, and ap-southeast-1. This provides connectivity to VPCs in all three regions from a single DX circuit.

**Q3.** A company wants to implement automatic failover from Direct Connect to Site-to-Site VPN when the DX connection goes down. Which routing protocol enables this automatic failover, and how is the preference for DX over VPN configured?

- A) OSPF, with lower metric values configured on the DX path
- B) BGP, with higher LOCAL_PREF values or shorter AS paths configured for DX routes to make them preferred
- C) Static routes, with the DX route having a lower IP metric than the VPN route
- D) AWS automatically prefers DX over VPN without any configuration required

**Answer: B** — BGP is the routing protocol used for both Direct Connect and dynamic VPN routing on AWS. To make DX the preferred path, configure higher BGP LOCAL_PREF values for routes received over DX (or use AS path prepending to make VPN routes appear longer and thus less preferred). When DX fails and BGP withdraws those routes, the VPN-learned routes become the best path and traffic fails over automatically within BGP convergence time (~90 seconds).

## What's Next

Next up: VPC Endpoints — private connectivity to AWS services like S3 and DynamoDB without requiring a NAT Gateway or internet path.
