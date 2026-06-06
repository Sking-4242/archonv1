---
title: "Security Groups and Key Pairs"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SOA-C02", "DVA-C02"]
---

# Security Groups and Key Pairs

## Overview

Security Groups are the virtual firewall mechanism that controls what network traffic can reach your EC2 instances and what traffic they can send. Every EC2 instance must have at least one security group. Without a security group, an instance would be both inaccessible (no inbound rules) and fully open to send traffic anywhere (default outbound). Security groups define the network boundary for everything you run on EC2.

Key Pairs are the authentication mechanism for direct console access — SSH for Linux instances and RDP password decryption for Windows. They provide a cryptographic proof of identity that is stronger than passwords, but they come with their own management challenges: private keys that must be kept secure, rotated regularly, and distributed carefully across a team. Modern practice increasingly replaces key pairs with AWS Systems Manager Session Manager, which provides shell access without any open ports, any stored keys, or any key management overhead.

Both security groups and key pairs appear heavily on the SAA, SOA, and DVA exams. Security groups in particular are foundational to every VPC architecture — understanding stateful behavior, rule evaluation, and security group chaining is essential for designing secure multi-tier applications.

---

## Core Concepts

### Security Groups: Stateful Virtual Firewalls

A Security Group is a stateful virtual firewall attached to an EC2 instance's network interface (ENI). "Stateful" means that if an inbound connection is allowed, the return traffic for that connection is automatically permitted — you don't need to write an outbound rule to allow the response. This is in contrast to Network ACLs (NACLs), which are stateless and require explicit rules in both directions.

Security groups work on an **allow-only model**: you write rules that permit specific traffic, and everything else is denied by default. There is no way to write an explicit deny rule in a security group. If you need to block a specific IP address, you must use a Network ACL or a WAF rule instead.

**Default behavior for new security groups:**
- All inbound traffic is **denied** by default (you must add Allow rules for any inbound traffic you want)
- All outbound traffic is **allowed** by default (you can restrict outbound by modifying or removing the default allow-all outbound rule)

**Rule components:**
- **Protocol**: TCP, UDP, ICMP, or All
- **Port range**: A single port (e.g., 443) or a range (e.g., 1024–65535 for ephemeral ports)
- **Source (inbound) or Destination (outbound)**: An IPv4 CIDR block (e.g., `0.0.0.0/0` for all IPv4), an IPv6 CIDR, or another Security Group ID

Security group rules take effect **immediately** — adding or removing a rule applies to all existing connections within seconds, with no instance restart required.

---

### Security Group Chaining: IP-Agnostic Access Control

The most powerful security group capability is referencing another security group ID as the source or destination of a rule, rather than an IP CIDR. This is called **security group chaining** or **security group references**.

Consider a three-tier application:
- **Load balancer**: Security group `sg-alb` allows inbound 443 from `0.0.0.0/0`
- **App tier**: Security group `sg-app` allows inbound 8080 from `sg-alb` (the load balancer's SG)
- **Database tier**: Security group `sg-db` allows inbound 5432 from `sg-app` (the app tier's SG)

The power: when an Auto Scaling event launches a new app instance, it's assigned `sg-app` and immediately gains database access — with no IP address tracking, no rule updates, and no manual configuration. When a compromised instance is terminated, its `sg-app` membership disappears and so does its database access. The security policy is expressed in terms of *roles* (which security group an instance belongs to) rather than *addresses* (which IP it happens to have).

This pattern is fundamental to building secure, scalable architectures on AWS. In an Auto Scaling environment where instance IP addresses change constantly, IP-based rules are impractical. Security group chaining makes the security policy robust to dynamic infrastructure.

---

### Multiple Security Groups on One Instance

An EC2 instance can have **up to 5 security groups** attached simultaneously (this limit can be increased via a service quota). The effective security policy is the **union** of all attached security groups' rules — if any security group allows the traffic, it is allowed, regardless of what other security groups say.

This means you can design modular security policies:
- A "base" security group applied to all instances (e.g., allow outbound HTTPS, allow CloudWatch, allow SSM)
- A "web" security group for web-tier instances (allow inbound 80 and 443)
- A "ssh-admin" security group applied only to jump boxes (allow inbound 22 from admin CIDR)
- A "db-client" security group for instances that need database access (referenced by the DB security group)

This modular approach is easier to manage than one large security group per instance and more auditable — you can see exactly which capabilities each security group grants.

---

### Key Pairs: SSH and RDP Authentication

A Key Pair is an RSA or ED25519 asymmetric key pair:
- **Public key**: stored on the EC2 instance in `~/.ssh/authorized_keys` (Linux) or used to encrypt the Windows Administrator password (Windows)
- **Private key**: a `.pem` file (Linux/Mac) or `.ppk` file (Windows/PuTTY) that you download **once** at creation time and must keep secure

When you SSH to a Linux instance, you present your private key. The instance validates it against the stored public key — if they match, you're authenticated without a password.

**Critical limitation**: AWS stores only the public key. If you lose the private key, you cannot recover it — there is no way to download it again from AWS. If you lose the private key to a running instance, your options are limited (connect via Session Manager if the SSM Agent is installed, or stop the instance and attach the root volume to another instance to manually edit `authorized_keys`).

**Key pair best practices:**
- Create one key pair per environment (dev, staging, prod) — not one key pair for everything
- Store private keys in a secure secrets management system, not on individual laptops
- Consider using EC2 Instance Connect as an alternative — it generates a temporary public key and pushes it to the instance for a single connection, avoiding persistent key management entirely

---

### AWS Systems Manager Session Manager: The Modern Alternative to SSH

Session Manager provides interactive shell access to EC2 instances through the AWS Console or CLI, without requiring:
- Any inbound security group rules (port 22 is not needed)
- A key pair on the instance
- A bastion host or VPN for private instances
- SSH client software on the administrator's machine

Session Manager works by having the SSM Agent on the instance connect outbound to the Systems Manager service over HTTPS (port 443 outbound, which is typically already allowed). You initiate sessions through the console or CLI; the SSM service proxies the connection.

**Security advantages over SSH:**
- No persistent keys to manage, rotate, or potentially compromise
- Authentication is via IAM — you can use IAM policies to control who can start sessions on which instances
- Every command typed and every output line is logged to CloudWatch Logs and optionally to S3 — creating a full audit trail
- Private instances with no public IP are accessible without a bastion host

For new deployments, Session Manager should be the default access method. The security group change is simple: remove the inbound port 22 rule entirely.

---

## Configuration Reference

### Creating and Managing Security Groups in the Console

Navigate to **EC2 → Security Groups** in the left sidebar:

1. Click **Create security group**
2. **Name**: use a descriptive name that encodes the role (e.g., `myapp-web-tier`, `myapp-db-tier`)
3. **Description**: required — describe what this SG is for
4. **VPC**: select the VPC this SG lives in — security groups are VPC-specific
5. **Inbound rules**: click **Add rule**:
   - Type: select a protocol preset (HTTP, HTTPS, SSH, MySQL/Aurora, PostgreSQL, etc.) or Custom TCP/UDP
   - Port range: auto-filled for presets, or enter manually
   - Source: `0.0.0.0/0` for public, your IP for SSH, or select a security group for chaining
6. **Outbound rules**: the default allows all outbound — leave as is unless you need egress restriction
7. **Tags**: add a Name tag for easier identification
8. Click **Create security group**

To add a security group to a running instance: **EC2 → Instances → select instance → Actions → Security → Change security groups**.

---

### Security Group Rules via the AWS CLI

```bash
# Create a security group
aws ec2 create-security-group \
  --group-name "myapp-web-tier" \
  --description "Web tier: allows HTTP/HTTPS from internet, app traffic from ALB" \
  --vpc-id vpc-0abc12345 \
  --tag-specifications 'ResourceType=security-group,Tags=[{Key=Name,Value=myapp-web-tier}]'
# Returns: { "GroupId": "sg-0abc12345newsgid" }

# Add an inbound rule: HTTPS from anywhere
aws ec2 authorize-security-group-ingress \
  --group-id sg-0abc12345newsgid \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0

# Add an inbound rule: app traffic only from the ALB security group (chaining)
aws ec2 authorize-security-group-ingress \
  --group-id sg-0apptiergroupid \
  --protocol tcp \
  --port 8080 \
  --source-group sg-0albsecuritygroupid \   # Reference ALB SG by ID, not CIDR

# Add an inbound rule: PostgreSQL only from the app tier (chaining)  
aws ec2 authorize-security-group-ingress \
  --group-id sg-0dbgroupid \
  --protocol tcp \
  --port 5432 \
  --source-group sg-0apptiergroupid

# Remove an inbound rule (revoke SSH from all IPs — migration to Session Manager)
aws ec2 revoke-security-group-ingress \
  --group-id sg-0abc12345 \
  --protocol tcp \
  --port 22 \
  --cidr 0.0.0.0/0

# Describe a security group and its rules
aws ec2 describe-security-groups \
  --group-ids sg-0abc12345 \
  --query 'SecurityGroups[0].{Name:GroupName,Inbound:IpPermissions,Outbound:IpPermissionsEgress}' \
  --output json
```

---

### Three-Tier Security Group Architecture

This is the canonical pattern for a web application with a load balancer, application servers, and a database:

```
Internet
    │
    ▼ (TCP 443 from 0.0.0.0/0)
[sg-alb] Application Load Balancer
    │
    ▼ (TCP 8080 from sg-alb)
[sg-app] App Server EC2 instances
    │
    ▼ (TCP 5432 from sg-app)
[sg-db] RDS PostgreSQL
```

Security group rules:

| Security Group | Direction | Protocol | Port | Source/Destination | Purpose |
|---|---|---|---|---|---|
| sg-alb | Inbound | TCP | 443 | 0.0.0.0/0 | HTTPS from internet |
| sg-alb | Inbound | TCP | 80 | 0.0.0.0/0 | HTTP (for redirect) |
| sg-app | Inbound | TCP | 8080 | sg-alb | App traffic from ALB only |
| sg-app | Inbound | TCP | 443 | sg-mgmt | HTTPS management (optional) |
| sg-db | Inbound | TCP | 5432 | sg-app | DB access from app tier only |
| sg-mgmt | Inbound | TCP | 22 | 203.0.113.0/24 | SSH from admin CIDR |

Notice: the database has no inbound rule allowing internet traffic of any kind. The only way to reach it is from an instance in `sg-app`. This is defense-in-depth through security group layering.

---

### Starting a Session Manager Session

```bash
# Install the Session Manager plugin for AWS CLI (one-time setup)
# macOS: brew install --cask session-manager-plugin
# Linux: follow docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html

# Start an interactive session (like SSH, but through SSM)
aws ssm start-session \
  --target i-0abc1234567890def \      # Instance ID
  --region us-east-1

# Port forwarding (forward local port 5432 to RDS endpoint through the instance)
aws ssm start-session \
  --target i-0abc1234567890def \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{"host":["mydb.cluster-abc.us-east-1.rds.amazonaws.com"],"portNumber":["5432"],"localPortNumber":["5432"]}'

# Requirement: the instance must have the SSM Agent installed and an IAM role with
# AmazonSSMManagedInstanceCore policy attached
```

---

## How to Decide

**Security group design decisions:**

| Scenario | Rule Design | Why |
|---|---|---|
| Public web server | Inbound 80/443 from `0.0.0.0/0` | Must accept traffic from any browser |
| SSH access for admins | Inbound 22 from `<admin-CIDR>/32` | Limit to known IPs; never open to `0.0.0.0/0` |
| App tier behind ALB | Inbound app port from ALB security group | Only ALB should reach app servers |
| Database tier | Inbound DB port from app-tier security group | DB should never be directly internet-accessible |
| Outbound restriction needed | Remove default allow-all outbound, add specific rules | Prevents data exfiltration from compromised instance |
| Block a specific attacker IP | Cannot use security group — use NACL or WAF | Security groups have no Deny rules |

**Key pair vs. Session Manager:**

| Situation | Choice |
|---|---|
| New deployment, SSM Agent available | Session Manager (no port 22, full audit trail) |
| Instance must be accessible without internet (private subnet, no NAT) | Session Manager via VPC endpoint for SSM |
| Emergency access to instance where SSM Agent is not running | Key pair + bastion host (last resort) |
| Windows instance, need RDP | Key pair for password decryption, then RDP |
| Regulated environment requiring full session logging | Session Manager with CloudWatch Logs enabled |

---

## How This Connects

- **Network ACLs (NACLs)** — Security groups work at the instance level (stateful, allow-only). NACLs work at the subnet level (stateless, allow and deny). They complement each other: use security groups for instance-level access control and NACLs for subnet-level explicit deny rules (blocking known bad IP ranges, for example).
- **Application Load Balancer** — ALBs have their own security group. The canonical pattern: allow internet traffic into the ALB security group, then allow the ALB security group as the source in the app-tier security group. This ensures app instances only accept traffic that has been processed by the load balancer.
- **AWS Systems Manager** — Session Manager requires the SSM Agent on the instance and an IAM role with `AmazonSSMManagedInstanceCore` policy. It replaces the need for port 22 entirely and provides CloudTrail-logged session history.
- **Amazon RDS** — RDS instances use security groups just like EC2 instances. The database security group should allow inbound on the database port only from the application tier's security group — never from the internet.
- **VPC Endpoints** — If your instances need to reach AWS services (S3, SSM, CloudWatch) without going through the internet, you need VPC endpoints. Interface endpoints for SSM allow Session Manager to work for instances in private subnets with no internet access.

---

## Exam Traps

- **Security groups cannot deny traffic — only allow.** If a question asks how to block a specific IP address from an EC2 instance, the answer is a Network ACL (which supports explicit deny rules) or a WAF rule — not a security group.
- **Security groups are stateful — return traffic is automatic.** You do not need an outbound rule to allow the return traffic for an inbound connection. This is one of the most tested differences between security groups (stateful) and NACLs (stateless).
- **Security group rules are union, not intersection.** If an instance has two security groups, and SG1 allows port 22 while SG2 does not mention port 22, port 22 is still allowed. All security groups are evaluated together; any Allow wins.
- **Security groups are VPC-specific.** You cannot attach a security group from one VPC to an instance in another VPC. Security groups do not span VPCs (or accounts) — cross-VPC access requires NACLs, route tables, and peering/Transit Gateway configurations.
- **The default security group allows all traffic between members.** Every VPC has a default security group that allows all inbound traffic from other instances in the same security group. This is a common source of unintended access in development environments.

---

## Summary

- Security groups are stateful, allow-only virtual firewalls attached to EC2 instances — all inbound traffic is denied by default, all outbound is allowed by default, and return traffic for allowed connections is automatically permitted.
- Security group chaining references another security group ID as a rule source/destination, enabling dynamic IP-agnostic access control that automatically tracks Auto Scaling and instance replacement.
- An EC2 instance can have up to 5 security groups simultaneously; effective policy is the union of all attached groups — any Allow in any group permits the traffic.
- Key pairs use asymmetric cryptography for SSH/RDP authentication; if the private key is lost, it cannot be recovered from AWS.
- AWS Systems Manager Session Manager is the modern, preferred alternative to SSH: no inbound port 22, no keys to manage, authenticated via IAM, and every session command is logged to CloudTrail and CloudWatch.
- Security groups cannot deny traffic — for explicit deny rules, use Network ACLs (stateless, subnet-level) or AWS WAF.

---

## Examples

A developer building a personal project opens port 22 (SSH) in their EC2 instance's security group to `0.0.0.0/0` — all IPv4. Within hours, automated internet scanners find the open port and begin brute-forcing authentication attempts. CloudWatch Logs show thousands of failed authentication attempts per minute. Because the developer used a key pair and disabled password authentication, no breach occurs — but the noise is alarming and the CloudWatch Logs bill is growing. Restricting the SSH inbound rule to their home IP (`203.0.113.42/32`) eliminates the noise immediately. The lesson: `0.0.0.0/0` for SSH is never appropriate; narrow inbound rules to the smallest possible source set.

A three-tier e-commerce application uses security group chaining throughout its architecture. The ALB security group allows port 443 from `0.0.0.0/0`. The app-tier security group allows port 8080 only from the ALB security group ID — no IP addresses, no CIDRs. The database security group allows port 3306 only from the app-tier security group ID. When Black Friday traffic triggers Auto Scaling to launch 40 additional app instances, each new instance is assigned the app-tier security group and immediately has database access — no IP tracking, no rule updates, no on-call pages. When the scale-in event terminates those instances, their database access disappears automatically. This is why security group chaining is the standard pattern for multi-tier applications: it makes security policy robust to dynamic infrastructure.

A platform engineering team at a healthcare company eliminates all bastion hosts and SSH access as part of a security hardening initiative. They ensure the SSM Agent is installed and running on all EC2 instances (it's pre-installed on Amazon Linux 2023), attach the `AmazonSSMManagedInstanceCore` IAM policy to all instance roles, and remove all inbound port 22 rules from all security groups. Engineers now access instances via `aws ssm start-session --target i-xxx` or the Session Manager console — authenticated via their IAM identities, with every command logged to CloudWatch Logs for their SOC team. The audit finding that triggered the project (no instance access logging) is now resolved without any operational complexity added.

---

## Think About It

1. Security groups are stateful while Network ACLs are stateless. This means a security group automatically allows return traffic for established connections, but a NACL requires explicit rules in both directions. In what scenarios would you want to apply both a security group and a NACL to the same traffic path, and what does using both give you that using either alone does not?
2. Security groups can only Allow traffic — there is no Deny rule. This is a design choice by AWS. What is the advantage of this constraint? What problem does it prevent compared to a firewall that supports both Allow and Deny rules in the same rule set?
3. A colleague argues that opening port 22 to `0.0.0.0/0` is acceptable if the instance uses key pair authentication (no passwords), because brute-forcing a 4096-bit RSA key is computationally infeasible. What are the actual attack vectors that make exposing port 22 to the internet dangerous even with key pair authentication?
4. Your company is evaluating Session Manager as a replacement for SSH/bastion hosts. What objections might operations engineers raise, and how would you address each? What would the transition plan look like for a fleet of 200 instances currently accessed via SSH?
5. An instance has three security groups attached: SG-A allows port 443 inbound, SG-B allows port 22 inbound from a specific CIDR, and SG-C has no inbound rules. An administrator assumes that because SG-C has no inbound rules, the instance should reject all inbound traffic. Is this correct? Explain the actual behavior.

---

## Quick Check

**Q1.** A security engineer needs to block all traffic from a specific IP range (`192.0.2.0/24`) that is attempting to access an EC2 instance. The instance's security group currently allows port 443 from `0.0.0.0/0`. What is the correct way to block this specific range?
- A) Add a Deny rule to the security group for `192.0.2.0/24`
- B) Create a Network ACL with an explicit Deny rule for `192.0.2.0/24` on the subnet
- C) Remove the port 443 Allow rule from the security group entirely
- D) Create a new security group with no rules and attach it to the instance

**Answer: B** — Security groups only support Allow rules — there is no way to add a Deny for a specific source. Network ACLs support explicit Deny rules and operate at the subnet level, making them the correct tool for blocking specific IP ranges.

**Q2.** An application server needs to connect to a database server. Both are EC2 instances in the same VPC. Which approach provides the most dynamic and operationally efficient access control as the application tier scales with Auto Scaling?
- A) Allow the database's port from the application server's Elastic IP in the database security group
- B) Allow the database's port from the application subnet's CIDR block in the database security group
- C) Allow the database's port from the application tier's security group ID in the database security group
- D) Attach the same security group to both the application and database instances

**Answer: C** — Referencing the application tier's security group ID automatically includes any instance that joins the group (from Auto Scaling) and excludes any instance that leaves, without any rule changes or IP address tracking.

**Q3.** A developer creates a new security group with no inbound rules but leaves the default outbound rule (allow all). An EC2 instance is launched with only this security group. What best describes the instance's network accessibility?
- A) The instance can receive inbound traffic on any port and send traffic to any destination
- B) The instance cannot receive any inbound traffic but can initiate outbound connections to any destination
- C) The instance can neither send nor receive any traffic
- D) The instance can only communicate with other instances in the same security group

**Answer: B** — With no inbound rules, all inbound traffic is denied (default behavior). The outbound allow-all rule means the instance can initiate connections outward — useful for downloading packages, calling APIs, or connecting to AWS services.

---

## What's Next

Next: EBS volumes and snapshots — the persistent block storage attached to EC2 instances, including volume types, performance characteristics, and data protection through snapshots.
