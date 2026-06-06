---
title: "VPC Endpoints: Private AWS Service Access"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "SAP-C02"]
---

# VPC Endpoints: Private AWS Service Access

## Overview

When an EC2 instance in a private subnet calls the S3 API, where does that traffic go? By default it travels out through a NAT Gateway, crosses the public internet, hits the S3 public endpoint, and returns the same way. Every gigabyte processed through NAT Gateway costs $0.045. For a data workload reading terabytes from S3 daily, that becomes a significant recurring charge — and every packet crosses the public internet even though both the instance and the S3 bucket are in AWS's own network. VPC Endpoints exist to eliminate that path entirely. With the right endpoint type in place, traffic from your private subnet to S3 never leaves the AWS network and never passes through NAT at all.

There are two fundamentally different endpoint types and they work through different mechanisms. Gateway Endpoints are free and work only for S3 and DynamoDB — they inject a route into your route table that redirects traffic to those services via an AWS-internal path. Interface Endpoints, built on AWS PrivateLink, work for over 100 AWS services and for third-party SaaS products — they provision an Elastic Network Interface (ENI) with a private IP address directly inside your subnet, giving service APIs a private address that your instances can reach without any internet path. Understanding which type to use, how they differ under the hood, and how to restrict them with endpoint policies are all high-frequency exam topics and essential production architecture knowledge.

Beyond cost and security, VPC Endpoints solve a category of architecture problem that NAT Gateway cannot: enabling AWS API access from a VPC that has no internet connectivity whatsoever. Highly regulated environments — healthcare, finance, government — often require that private EC2 instances have zero internet exposure, inbound or outbound. Without VPC Endpoints, those instances cannot call the Secrets Manager API, cannot push CloudWatch metrics, cannot retrieve SSM parameters. Interface Endpoints give those services a private address reachable from an air-gapped VPC. This is the architectural pattern that makes fully private, internet-free deployments possible.

---

## Core Concepts

### Gateway Endpoints — Free, Route-Table Based, S3 and DynamoDB Only

A Gateway Endpoint is not a network device — it has no IP address and no ENI. It is a route table entry. When you create a Gateway Endpoint for S3, AWS adds a route to your specified route tables with a destination of the S3 prefix list (a managed group of S3's IP ranges) and a target of the endpoint ID (e.g., `vpce-0abc1234`). When an instance sends a packet to an S3 public IP, the route table hits this entry before the default route to the NAT Gateway or internet gateway, and traffic is redirected to AWS's internal network via the endpoint.

This is why Gateway Endpoints are free: there is no dedicated infrastructure. AWS is simply saying "for traffic matching these IP ranges, use our internal path instead of the internet." No ENI is provisioned, no availability zone placement is required, no hourly charge accrues. The route table change takes seconds and there is no performance impact. The correct production posture is: every VPC that has private subnets using S3 or DynamoDB should have Gateway Endpoints enabled. There is no reason not to — the only cost is creating the endpoint and updating route tables.

Gateway Endpoints are regional. The S3 endpoint in us-east-1 keeps traffic on the AWS network within that region; it does not help you reach S3 buckets via a cross-region path. Also important: Gateway Endpoints do not extend to on-premises networks over Direct Connect or VPN. Traffic originating from on-premises cannot use a Gateway Endpoint in your VPC — that requires Interface Endpoints.

### Interface Endpoints (AWS PrivateLink) — ENI in Your Subnet, Covers 100+ Services

An Interface Endpoint creates one or more ENIs — one per Availability Zone you select — inside your subnets. Each ENI gets a private IP address from that subnet's CIDR range. AWS also creates private DNS entries that override the service's public DNS name. When your instance resolves `secretsmanager.us-east-1.amazonaws.com`, DNS returns the private IP of the Interface Endpoint ENI instead of the public endpoint IP. The API call goes to that private IP, travels entirely on the AWS network, and reaches the service. No internet. No NAT. No public IP required on the instance.

The cost model: approximately $0.01 per ENI per hour per AZ, plus $0.01 per GB of data processed. For multi-AZ deployments you typically create endpoint ENIs in all AZs to avoid cross-AZ data transfer charges. A single Interface Endpoint in one AZ for a low-traffic service costs roughly $7/month — affordable for most use cases, but something to track when you have dozens of interface endpoints across dozens of VPCs.

Interface Endpoints work for a long list of AWS services: EC2 API, CloudWatch (logs and metrics), Secrets Manager, SSM, Systems Manager Session Manager, SQS, SNS, Kinesis, KMS, ECR, ECS, Lambda, Step Functions, CodeBuild, Glue, Athena, SageMaker, and many more. The practical test: if your private VPC needs to call any AWS service API other than S3 or DynamoDB, you need an Interface Endpoint or you need a NAT path.

### DNS Resolution for Interface Endpoints

When you create an Interface Endpoint with private DNS enabled (the default), AWS automatically creates a private hosted zone in Route 53 that overrides the service's regional DNS name. For example, an Interface Endpoint for Secrets Manager in us-east-1 causes `secretsmanager.us-east-1.amazonaws.com` to resolve to the private IP of the endpoint ENI for queries originating within the VPC. No application code changes are needed — the AWS SDK resolves the same hostname it always did, and DNS transparently routes to the private endpoint.

For this DNS override to work, the VPC must have `enableDnsHostnames` and `enableDnsSupport` both set to true. These are enabled by default on VPCs created through the console but may be disabled in older VPCs or those created via certain automation tools. A common debugging scenario: Interface Endpoint is created, but API calls still go to the public endpoint — almost always caused by DNS settings being disabled.

### Endpoint Policies — Restricting What Can Pass Through

Both Gateway and Interface Endpoints support endpoint policies: IAM-style JSON documents attached to the endpoint itself that control which principals, actions, and resources can use the endpoint. An endpoint policy is evaluated in addition to IAM policies — both must allow the action for it to succeed.

Endpoint policies add a layer of defense that IAM alone cannot provide. Consider an S3 Gateway Endpoint: without an endpoint policy, any principal whose IAM role allows S3 access can use the endpoint to reach any S3 bucket — including buckets in other AWS accounts. An attacker who compromises an EC2 instance's IAM credentials could exfiltrate data to a personal S3 bucket through your endpoint. By adding an endpoint policy that restricts access to only your organization's buckets (using `aws:ResourceOrgID`) or specific bucket ARNs, you close this exfiltration path at the network layer, independent of what the IAM policies say.

### aws:sourceVpce in Bucket Policies — Enforcing the Endpoint Path

The inverse of endpoint policies is the `aws:sourceVpce` condition key, which you add to S3 bucket policies. A bucket policy with `"Condition": {"StringEquals": {"aws:sourceVpce": "vpce-0abc1234"}}` says: requests to this bucket are only permitted if they arrive through this specific VPC endpoint. This means that even if someone gets valid AWS credentials, they cannot access the bucket by calling S3 from a laptop, another VPC, or any network path other than through your designated endpoint. This is a powerful data perimeter control used in regulated industries to ensure data can only be accessed from within your VPC.

You can combine `aws:sourceVpce` with `aws:sourceVpc` (allows any endpoint in a VPC) or `aws:PrincipalOrgID` (allows any principal in your AWS Organization). These condition keys together form the building blocks of an AWS data perimeter strategy.

### Cross-Account PrivateLink and SaaS Access

PrivateLink is not limited to AWS-managed services. Any AWS customer can expose their own services via PrivateLink by putting a Network Load Balancer in front of their application and creating a VPC Endpoint Service. Other accounts (or other VPCs in the same account) can then create Interface Endpoints pointing at that Endpoint Service. This enables B2B SaaS integrations where a vendor exposes their API as a PrivateLink service — your application calls the vendor's API through a private IP in your own subnet, with no internet traversal and no IP allowlisting required.

This model is also used for cross-account shared services within large organizations: a central authentication service, a shared logging pipeline, or an internal tool built by one team that other teams need to consume. Instead of VPC Peering (which gives broad IP-level access), PrivateLink gives fine-grained service-level access — the consumer can only reach the specific service behind the NLB, not everything in the provider's VPC.

---

## Configuration Reference

### Create an S3 Gateway Endpoint (CLI)

```bash
# Step 1: Find your route table IDs for private subnets
aws ec2 describe-route-tables \
  --filters "Name=vpc-id,Values=vpc-0abc12345def67890" \
  --query "RouteTables[*].{ID:RouteTableId,Name:Tags[?Key=='Name']|[0].Value}" \
  --output table

# Step 2: Create the Gateway Endpoint for S3
# --vpc-endpoint-type Gateway  <-- free type, route table only
# --service-name format: com.amazonaws.<region>.s3
# --route-table-ids: attach to private subnet route tables (NOT public — NAT still handles those)
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0abc12345def67890 \
  --vpc-endpoint-type Gateway \
  --service-name com.amazonaws.us-east-1.s3 \
  --route-table-ids rtb-0111aaa rtb-0222bbb \
  --policy-document file://s3-endpoint-policy.json

# Step 3: Verify the route was added to private route tables
aws ec2 describe-route-tables \
  --route-table-ids rtb-0111aaa \
  --query "RouteTables[0].Routes[*].{Dest:DestinationPrefixListId,Target:GatewayId}" \
  --output table
# Expect: pl-63a5400a (S3 prefix list) -> vpce-0abc...
```

**s3-endpoint-policy.json** — restrict endpoint to your org's buckets only:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowOrgBucketsOnly",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:ResourceOrgID": "o-exampleorgid"
        }
      }
    }
  ]
}
```
> The endpoint policy blocks S3 access to any bucket outside your AWS Organization — even if IAM allows it. This closes the S3 exfiltration vector through the endpoint.

---

### Create an SSM Interface Endpoint (CLI)

```bash
# Interface endpoints require subnet IDs (one per AZ for HA)
# and a security group that allows HTTPS inbound from your VPC CIDR

# Step 1: Create a security group for the endpoint ENIs
aws ec2 create-security-group \
  --group-name "vpce-ssm-sg" \
  --description "Allow HTTPS from VPC to SSM Interface Endpoint" \
  --vpc-id vpc-0abc12345def67890

aws ec2 authorize-security-group-ingress \
  --group-id sg-0endpoint \
  --protocol tcp \
  --port 443 \
  --cidr 10.0.0.0/16   # your VPC CIDR

# Step 2: Create the Interface Endpoint
# --vpc-endpoint-type Interface  <-- creates ENI in subnet, costs ~$0.01/hr/AZ
# --private-dns-enabled          <-- overrides public DNS name in this VPC (requires VPC DNS settings enabled)
# Systems Manager needs 3 endpoints: ssm, ec2messages, ssmmessages
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-0abc12345def67890 \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.ssm \
  --subnet-ids subnet-private-1a subnet-private-1b \
  --security-group-ids sg-0endpoint \
  --private-dns-enabled

# Repeat for ec2messages and ssmmessages service names
# (SSM requires all three endpoints for Session Manager to work)

# Step 3: Verify DNS override is active
aws ec2 describe-vpc-endpoints \
  --filters "Name=service-name,Values=com.amazonaws.us-east-1.ssm" \
  --query "VpcEndpoints[0].DnsEntries"
# Returns private DNS entries that override ssm.us-east-1.amazonaws.com within the VPC
```

> **Why three endpoints for SSM?** Session Manager uses `ssm` for control plane, `ec2messages` for the SSM agent polling, and `ssmmessages` for the interactive session data channel. All three must be present for Session Manager to work in a fully private VPC.

---

### Console Path

**VPC → Endpoints → Create endpoint**
- Service category: AWS services
- Search: type the service name (e.g., `s3`, `ssm`, `secretsmanager`)
- Endpoint type shown: Gateway (for S3/DynamoDB) or Interface (all others)
- For Gateway: select route tables to update
- For Interface: select subnets, security group, enable private DNS
- Attach policy document or use Full Access default

---

## How to Decide

| Situation | Endpoint Type | Notes |
|---|---|---|
| Private subnet EC2 accessing S3 | **Gateway** | Free. Always do this. |
| Private subnet EC2 accessing DynamoDB | **Gateway** | Free. Always do this. |
| Private VPC (no internet) needs Secrets Manager | **Interface** | ~$0.01/hr/AZ |
| Private VPC (no internet) needs SSM Session Manager | **Interface** | Requires ssm + ec2messages + ssmmessages |
| Private VPC (no internet) needs CloudWatch Logs | **Interface** | logs + monitoring endpoints |
| On-premises server needs private S3 access via DX | **Interface** | Gateway endpoints don't work for on-premises |
| Cross-account SaaS integration | **Interface** (PrivateLink) | Provider creates Endpoint Service via NLB |
| Need to restrict which buckets are reachable through endpoint | **Endpoint Policy** | Attach to Gateway or Interface endpoint |
| Need to ensure bucket only accessible from your VPC | **Bucket Policy** with aws:sourceVpce | Complements endpoint policy |
| Multiple AWS accounts, shared internal service | **PrivateLink Endpoint Service** | Cross-account PrivateLink via NLB |

**Key decision rule:** Gateway Endpoints = S3 and DynamoDB, free, no DNS, route-table based. Interface Endpoints = everything else, costs money, creates ENI, DNS-overridden.

---

## How This Connects

- **NAT Gateway** is the alternative path for AWS service access from private subnets. VPC Endpoints eliminate the need for NAT Gateway for covered services, reducing both cost and attack surface. A VPC with Gateway Endpoints for S3 and DynamoDB can eliminate most NAT Gateway traffic for data-heavy workloads.
- **Security Groups** must be attached to Interface Endpoint ENIs. The SG must allow HTTPS (port 443) inbound from the VPC CIDR. This means endpoint ENIs participate in the VPC's security group model like any other ENI.
- **IAM** and **endpoint policies** are both evaluated for calls through endpoints. The intersection of permissions applies — endpoint policies can restrict IAM, but they cannot grant access beyond what IAM allows.
- **AWS PrivateLink** underlies all Interface Endpoints. The same PrivateLink mechanism used for AWS-managed service endpoints is available to customers building cross-account shared services — making it a general-purpose private connectivity primitive, not just an AWS-specific feature.
- **Transit Gateway and Direct Connect** allow on-premises networks to use Interface Endpoints in your VPC to reach AWS services privately. This is a critical pattern for hybrid architectures where on-premises servers need to call AWS APIs without internet connectivity. Gateway Endpoints do not support this use case.

---

## Exam Traps

**"Gateway Endpoints work for all AWS services."** False. Gateway Endpoints support only Amazon S3 and Amazon DynamoDB. Every other AWS service requires an Interface Endpoint. This is one of the most commonly tested distinctions in VPC networking questions.

**"Gateway Endpoints cost money like Interface Endpoints."** False. Gateway Endpoints are completely free — no hourly charge, no data processing charge. Interface Endpoints cost approximately $0.01 per hour per AZ plus $0.01 per GB. On exams, Gateway Endpoints are the "cost-saving" answer for S3/DynamoDB traffic.

**"Enabling an Interface Endpoint is all you need for private DNS to work."** Not quite. Private DNS override requires that the VPC has both `enableDnsHostnames` and `enableDnsSupport` set to true. If either is disabled, the DNS override does not function even though the endpoint exists and has an ENI.

**"Endpoint policies replace IAM policies."** False. Endpoint policies and IAM policies are both evaluated, and both must allow the action. An endpoint policy that allows everything doesn't bypass restrictive IAM policies, and a permissive IAM policy doesn't bypass a restrictive endpoint policy. The more restrictive combination applies.

**"On-premises traffic can use Gateway Endpoints via Direct Connect."** False. Gateway Endpoints are local to the VPC routing domain and cannot be extended to on-premises networks over Direct Connect or VPN. On-premises access to AWS services via private connectivity requires Interface Endpoints, which have ENIs with private IPs that are routable over DX or VPN.

---

## Summary

- **Gateway Endpoints** cover S3 and DynamoDB only. They are free, work by adding a route table entry, require no DNS changes, and should be enabled in every production VPC with private subnets.
- **Interface Endpoints** (PrivateLink) cover 100+ AWS services. They create ENIs with private IPs in your subnets, cost ~$0.01/hr/AZ plus data, and override public DNS names so applications need no code changes.
- **Endpoint policies** restrict which principals, actions, and resources can use an endpoint — providing a network-layer data perimeter that complements IAM policies.
- **aws:sourceVpce** in S3 bucket policies enforces that access must come through a specific endpoint — preventing credential theft from enabling access outside your VPC.
- **PrivateLink** is the mechanism under Interface Endpoints and is also available for cross-account shared services and third-party SaaS integrations via Endpoint Services backed by NLBs.
- On-premises networks can use Interface Endpoints over Direct Connect or VPN to access AWS services privately — Gateway Endpoints cannot be extended off-VPC.

---

## Examples

A data engineering team runs Apache Spark on EMR clusters in private subnets. Their jobs read and write tens of terabytes to S3 daily. Before VPC endpoints, all S3 traffic was routing through a NAT Gateway pair, incurring $0.045 per GB of data processed — thousands of dollars per month. Their engineer creates an S3 Gateway Endpoint, attaches it to the private subnet route tables, and verifies via VPC Flow Logs that S3-bound traffic now shows the endpoint prefix list as the destination rather than the NAT Gateway. NAT Gateway data processing charges drop by over 90% within the first billing cycle. The setup takes 15 minutes and requires zero application changes — the S3 client continues calling the same S3 DNS name and the route table silently redirects the traffic. This is the canonical Gateway Endpoint use case: a free, immediate cost reduction with no architectural trade-offs.

A healthcare technology company builds a HIPAA-compliant workload processing medical records on EC2 instances in a VPC with no NAT Gateway and no internet gateway — there is no outbound internet path at all. Their compliance requirement is that PHI never traverses the public internet. The application needs to retrieve database credentials from Secrets Manager, push metrics to CloudWatch, and allow engineers to access instances via Session Manager (no bastion hosts, no SSH over internet). They create Interface Endpoints for `secretsmanager`, `monitoring` (CloudWatch Metrics), `logs` (CloudWatch Logs), `ssm`, `ec2messages`, and `ssmmessages`. Each endpoint provisions ENIs in two AZs with a security group allowing port 443 from the VPC CIDR. Private DNS is enabled, so the application code calls `secretsmanager.us-east-1.amazonaws.com` as normal and DNS resolves to the endpoint ENI's private IP. Engineers can open Session Manager sessions in the AWS Console and get a shell — traffic flows from the browser to the SSM service, through the Interface Endpoint ENIs, to the instance. The VPC has no internet connectivity whatsoever, yet all AWS service integrations function normally.

An enterprise security team conducts a threat model on their S3 data access patterns. They identify a risk: if an attacker compromises an EC2 instance's IAM role, they could use the VPC's S3 Gateway Endpoint to exfiltrate data to an attacker-controlled S3 bucket in a different AWS account. Their mitigation is two-layered. First, they add an endpoint policy to the Gateway Endpoint restricting all actions to resources within their AWS Organization (`aws:ResourceOrgID`). Second, they add a bucket policy condition `aws:sourceVpce` to their sensitive S3 buckets, requiring all requests to originate from their designated endpoint. Now an attacker with compromised credentials faces two independent controls: the endpoint policy blocks access to buckets outside the org, and the bucket policy blocks access from any network path other than the designated endpoint. Neither control alone is sufficient — together they form a data perimeter that limits both the source (must use the endpoint) and the destination (must be an org-owned resource) of any S3 access.

---

## Think About It

1. Gateway Endpoints are free and Interface Endpoints cost money. The underlying reason is infrastructure: Gateway Endpoints inject a route and use AWS's internal routing fabric, while Interface Endpoints provision actual ENIs that consume IP addresses and require dedicated capacity. Given this, why does AWS still charge for Interface Endpoints when the same traffic (e.g., to S3 via an Interface Endpoint instead of a Gateway Endpoint) stays entirely on the AWS network either way?

2. An EC2 instance in a private subnet can access S3 through a NAT Gateway, an S3 Gateway Endpoint, or an S3 Interface Endpoint. All three work. Walk through the cost profile, security posture, and operational complexity of each path. Are there any scenarios where routing S3 traffic through NAT is actually preferable to a Gateway Endpoint?

3. Endpoint policies and IAM policies must both allow an action — but they are evaluated independently and neither is "primary." Design an endpoint policy for an S3 Gateway Endpoint and an IAM policy for an EC2 instance role that together implement least-privilege access to a single S3 bucket prefix (`s3://company-data/team-a/`) with read-only permissions. What goes in each policy, and why can't you achieve the same result with just one of them?

4. AWS PrivateLink allows a SaaS vendor to expose their service as an Interface Endpoint in your VPC. Compare this to the traditional approach of whitelisting the vendor's IP ranges in security group ingress rules. What does PrivateLink provide that IP allowlisting cannot — in terms of security, operational burden, and network behavior?

5. An Interface Endpoint is created in a VPC but DNS resolution of the service hostname still returns the public IP address. What are the three most likely causes of this failure, and how would you diagnose each one?

---

## Quick Check

**Q1.** A solutions architect needs to enable EC2 instances in private subnets to access Amazon DynamoDB without routing traffic through a NAT Gateway. Which endpoint type should they use and what is the cost?

- A) Interface Endpoint — approximately $0.01/hour per AZ plus data transfer costs
- B) Gateway Endpoint — free; implemented via route table entries
- C) Interface Endpoint — free for DynamoDB specifically
- D) Gateway Endpoint — $0.01/hour per endpoint

**Answer: B** — DynamoDB is one of only two services (along with S3) supported by Gateway Endpoints. Gateway Endpoints are completely free — no hourly charge and no data processing charge. They work by adding a route table entry, not by provisioning an ENI.

---

**Q2.** A private EC2 instance in a VPC with an Interface Endpoint for Secrets Manager is still resolving `secretsmanager.us-east-1.amazonaws.com` to the public IP address. The endpoint was created with private DNS enabled. What is the most likely cause?

- A) The Interface Endpoint security group is blocking port 443 outbound
- B) The VPC does not have `enableDnsHostnames` and `enableDnsSupport` both set to true
- C) Private DNS override is not supported for Secrets Manager endpoints
- D) The endpoint ENI is in the wrong Availability Zone

**Answer: B** — Private DNS override for Interface Endpoints requires both `enableDnsHostnames` and `enableDnsSupport` to be enabled on the VPC. If either attribute is disabled, the DNS override does not take effect and the hostname resolves to the public endpoint IP.

---

**Q3.** An S3 bucket policy includes the condition `"aws:sourceVpce": "vpce-0abc1234"`. A developer with valid IAM credentials tries to access the bucket from their laptop using the AWS CLI. What happens?

- A) Access succeeds because IAM credentials take precedence over bucket policy conditions
- B) Access is denied because the request does not originate from the specified VPC endpoint
- C) Access succeeds if the developer's IAM role has s3:GetObject permission
- D) Access depends on whether the bucket's ACL permits the request

**Answer: B** — The `aws:sourceVpce` condition in a bucket policy restricts access to requests originating from the specified VPC endpoint. A request from a laptop does not arrive through that endpoint, so the bucket policy denies it regardless of the IAM permissions held by the developer.

---

## What's Next

Next: AWS Network Firewall — stateful traffic inspection, domain filtering, and the centralized inspection VPC pattern with Transit Gateway.
