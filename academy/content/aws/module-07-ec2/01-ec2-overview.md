---
title: "EC2 Overview"
type: content
estimated_minutes: 12
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C02", "DVA-C02"]
---

# EC2 Overview

## Overview

Amazon Elastic Compute Cloud (EC2) is the foundational compute service of AWS — virtual machines you can provision in minutes, configure precisely, and scale elastically. Launched in 2006 as one of AWS's two original services (alongside S3), EC2 solved a problem that every business with a web presence understood intimately: you had to buy servers before you knew how many you needed, and once you bought them, the cost was sunk whether you used them or not. EC2 flipped that model entirely — you pay by the second, for exactly the compute you use, and you can have more capacity running within minutes of deciding you need it.

Understanding EC2 is non-negotiable for every AWS certification. It is the service most SAA, SOA, and DVA questions reference either directly or as the compute layer of a larger architecture. Even the CCP exam expects you to understand the EC2 launch process, the instance lifecycle, pricing models, and how EC2 fits into the broader AWS compute landscape. More practically, EC2 is the service you will interact with most often in real AWS environments — whether you're running it directly or using services like ECS, EMR, or SageMaker that use EC2 underneath.

EC2 instances are virtual machines running on AWS's custom Nitro hypervisor. You choose the operating system (via an AMI), the hardware profile (via instance type), the network placement (via VPC and subnet), and the storage (via EBS volumes or instance store). AWS manages the physical host, the hypervisor, and the underlying hardware. You manage everything above the hypervisor: the OS, the runtime, the application, the data, and the network configuration. This is the IaaS (Infrastructure as a Service) model in practice.

---

## Core Concepts

### The Nitro Hypervisor and Why It Matters

Traditional hypervisors run on general-purpose CPUs and handle virtualization tasks — emulating hardware, managing I/O, isolating instances — in software. This introduces overhead: CPU cycles spent on virtualization are cycles not spent on your workload. AWS's Nitro System addresses this by offloading virtualization functions to dedicated hardware: the Nitro Card handles network I/O and EBS I/O, and the Nitro Security Chip handles boot integrity verification.

The practical result is near bare-metal performance. EC2 instances on Nitro-based hosts show effectively zero CPU steal time — a metric that on older hypervisors would reflect CPU cycles "stolen" by the hypervisor for virtualization overhead. For I/O-intensive workloads, this matters significantly. Nitro-based instances can sustain much higher EBS and network throughput than older Xen-based instances could.

Nitro also provides enhanced security. The Nitro Security Chip cryptographically verifies the hypervisor and firmware on every boot, preventing tampering. AWS engineers cannot access the memory of a running EC2 instance — even at the hardware level — because the Nitro architecture enforces isolation at the chip level, not just in software. For regulated industries, this hardware-rooted isolation is a meaningful security property.

Nearly all current-generation EC2 instance types use Nitro. You will see "Nitro-based" listed in instance type descriptions in the console.

---

### The Six Decisions Required to Launch an Instance

Every EC2 launch requires six explicit configuration choices. Understanding each one and why it exists is the foundation for all EC2 knowledge:

**1. AMI (Amazon Machine Image)** — The template that defines the operating system, pre-installed software, and initial disk contents. AWS provides hundreds of AMIs (Amazon Linux, Ubuntu, Windows Server, RHEL, etc.), AWS Marketplace offers third-party AMIs, and you can create your own custom AMIs from existing instances. AMIs are region-specific — an AMI in us-east-1 cannot be directly used in eu-west-1 without copying it first.

**2. Instance type** — The hardware configuration: how many vCPUs, how much RAM, what networking bandwidth, and whether local NVMe storage is included. Instance types are organized into families (compute-optimized, memory-optimized, general purpose, etc.) and sizes (micro, small, medium, large, xlarge, and so on). This is covered in depth in the next lesson.

**3. Network settings (VPC and subnet)** — Which Virtual Private Cloud the instance lives in, and which subnet within that VPC. The subnet determines the Availability Zone. Whether the instance gets a public IP address (needed if it must be reachable from the internet) is also set here.

**4. IAM role** — An IAM role attached to an EC2 instance allows the instance to make AWS API calls without requiring hardcoded credentials. For example, an instance with a role that allows `s3:GetObject` can read from S3 without any AWS access keys on the machine. This is the right way to give EC2 access to other AWS services.

**5. Storage (EBS volumes)** — Every EC2 instance has a root EBS volume containing the operating system. You can add additional EBS volumes for data. You configure their size, type (gp3, io2, etc.), and whether they are encrypted and whether they are deleted when the instance terminates.

**6. Security group** — The virtual firewall attached to the instance's network interface. It controls which inbound traffic is allowed (by port and source) and which outbound traffic is allowed. Security groups are stateful — return traffic for allowed inbound connections is automatically permitted.

---

### The EC2 Instance Lifecycle

EC2 instances move through well-defined states, and the billing implications of each state matter for both the exam and your AWS bill:

**Pending** — The instance is booting. Compute billing has not started. You are not charged while the instance is pending.

**Running** — The instance is active and compute billing is occurring. This is the only state where your workload can run.

**Stopping** — A transitional state while the instance is shutting down its OS. Brief, not billed.

**Stopped** — The instance is powered off. **Compute billing stops.** However, attached EBS volumes continue to be charged at their normal storage rate. The instance retains its private IP address within the VPC, but its public IP address is released (unless you have associated an Elastic IP address).

**Terminated** — The instance is permanently and irrecoverably deleted. The root EBS volume is deleted by default (if the "Delete on Termination" flag is set, which is the default). Additional attached EBS volumes are retained by default. A terminated instance cannot be restarted — this is the exam trap that catches people.

**Hibernate** is an additional capability that saves the in-memory state (RAM contents) to the root EBS volume before stopping, enabling the instance to resume exactly where it left off rather than performing a full boot. Useful for instances that take a long time to initialize — loading large ML models, warming caches, initializing complex application state. Hibernate requires the root volume to have sufficient free space to store the RAM contents.

---

### Stopped vs. Terminated: The Most Common Confusion

The distinction between stopping and terminating an EC2 instance is one of the most tested concepts on every AWS exam. Stopped instances can be restarted — they retain their EBS volumes, their IAM role attachment, their security group association, and their private IP address. Terminated instances are gone permanently.

The risk: if you set the root EBS volume's "Delete on Termination" flag to true (the default), terminating the instance deletes the OS volume. If you haven't taken a snapshot, that data is unrecoverable. The safest practice for instances running important workloads is to (a) disable Delete on Termination for important volumes, (b) take regular EBS snapshots, and (c) never terminate instances interactively without double-checking which instance you've selected.

---

### Public IP Addresses and Elastic IPs

When you launch an instance in a public subnet with auto-assign public IP enabled, AWS assigns a public IP address dynamically. This IP address is released when the instance is stopped and a new one is assigned when it restarts. This means the public IP of a stopped-and-restarted instance changes — which breaks any DNS entries, firewall rules, or partner integrations that reference the old IP.

An Elastic IP address (EIP) solves this: it is a static public IPv4 address you own in your AWS account that can be associated with an EC2 instance and will persist through stops, restarts, and even re-associations to different instances. You are charged for EIPs that are allocated but not associated with a running instance — AWS charges for EIPs to discourage hoarding of the limited IPv4 address pool.

---

## Configuration Reference

### Launching an EC2 Instance via the Console

Navigate to **EC2** in the AWS Console (search "EC2" in the top search bar), then click **Launch instances** (orange button, top right).

**Step 1 — Name and tags**
Give the instance a descriptive name. This creates a `Name` tag. Tags are key-value pairs that appear throughout the console and billing reports — use them consistently from the start.

**Step 2 — Application and OS Images (AMI)**
The Quick Start tab shows common AMIs. For most learning and web workloads, choose **Amazon Linux 2023 (Free tier eligible)**. Note the AMI ID (e.g., `ami-0abcdef1234567890`) — this ID is region-specific. If you need a custom AMI, click "My AMIs" or "AWS Marketplace."

**Step 3 — Instance type**
The default is `t2.micro` or `t3.micro` (free tier eligible). The instance type panel shows vCPUs and memory. Click "Compare instance types" to open a searchable table of all instance families.

**Step 4 — Key pair**
A key pair is used for SSH access (Linux) or password decryption (Windows). Create a new key pair if you don't have one — download the `.pem` file and store it securely. Without this file, you cannot SSH into a Linux instance. (Systems Manager Session Manager can provide console access without a key pair as a more secure alternative.)

**Step 5 — Network settings**
- VPC: select your VPC (the default VPC works for learning)
- Subnet: select a public subnet for internet-accessible instances
- Auto-assign public IP: Enable if the instance needs a public IP
- Security group: Create a new security group or select existing. For a web server, allow inbound TCP port 80 (HTTP) and 443 (HTTPS) from `0.0.0.0/0`, and port 22 (SSH) from your IP only.

**Step 6 — Configure storage**
The root volume defaults to 8 GB gp3. You can increase the size here. Check "Delete on termination" behavior — it is enabled by default, meaning the root volume is deleted if the instance is terminated.

**Step 7 — Advanced details (optional but important)**
- IAM instance profile: select a role to attach to the instance
- User data: a shell script that runs on first boot — use this for automatic software installation and configuration

Click **Launch instance**. The instance will appear in the EC2 Instances list within 30–60 seconds in "Running" state.

---

### Launching an EC2 Instance via the AWS CLI

```bash
# Launch a t3.micro Amazon Linux 2023 instance
aws ec2 run-instances \
  --image-id ami-0abcdef1234567890 \     # AMI ID (region-specific — get from console or describe-images)
  --instance-type t3.micro \             # Instance family and size
  --key-name my-key-pair \               # Key pair name (must already exist in this region)
  --security-group-ids sg-0abc12345 \    # Security group ID
  --subnet-id subnet-0def67890 \         # Subnet ID (determines AZ and VPC)
  --iam-instance-profile Name=MyRole \   # IAM role to attach (optional but recommended)
  --count 1 \                            # Number of instances to launch
  --tag-specifications \
    'ResourceType=instance,Tags=[{Key=Name,Value=my-web-server}]' \
  --region us-east-1

# Check instance state
aws ec2 describe-instances \
  --instance-ids i-0abc1234567890def \   # Replace with your instance ID
  --query 'Reservations[0].Instances[0].{State:State.Name,PublicIP:PublicIpAddress,PrivateIP:PrivateIpAddress}' \
  --output table

# Stop an instance (preserves EBS, releases public IP)
aws ec2 stop-instances --instance-ids i-0abc1234567890def

# Start a stopped instance
aws ec2 start-instances --instance-ids i-0abc1234567890def

# Terminate an instance (permanent — root EBS deleted by default)
aws ec2 terminate-instances --instance-ids i-0abc1234567890def
```

> **Important:** The AMI ID in `--image-id` is region-specific. An AMI that exists in `us-east-1` does not automatically exist in `eu-west-1`. Use `aws ec2 describe-images` or the console to find the correct AMI ID for your target region.

---

### Viewing Instance Metadata from Inside the Instance

Every running EC2 instance can query its own metadata — its instance ID, instance type, public IP, IAM role credentials, and more — from a special link-local address:

```bash
# From inside a running EC2 instance (IMDSv2 — the secure method):

# Get a token first (required for IMDSv2)
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 21600")

# Query instance metadata using the token
curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-id        # e.g., i-0abc1234567890def

curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/instance-type      # e.g., t3.micro

curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/public-ipv4        # Current public IP

curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
  http://169.254.169.254/latest/meta-data/iam/security-credentials/  # Role name
```

The Instance Metadata Service (IMDS) is how applications running on EC2 discover their own configuration and retrieve temporary credentials from an attached IAM role — without any hardcoded keys.

---

## How to Decide

EC2 is one of several compute options on AWS. Use this framework to determine when EC2 is the right choice:

**Choose EC2 when:**
- You need full control of the operating system (kernel, drivers, custom packages)
- Your application has specific CPU or memory requirements that map to a particular instance type
- You need persistent, long-running processes (web servers, databases, background workers)
- You need instance store (NVMe local SSD) for temporary high-speed scratch storage
- You are lifting and shifting an existing on-premises server workload

**Consider Lambda instead when:**
- Your workload is event-driven and short-lived (under 15 minutes per invocation)
- You want zero capacity management — no instance sizing, no scaling configuration
- Your workload is spiky and unpredictable in traffic pattern

**Consider ECS/Fargate instead when:**
- Your application is containerized
- You want container-level isolation without managing EC2 instances yourself

**Consider Elastic Beanstalk instead when:**
- You want to deploy a web application without managing the EC2 infrastructure explicitly — Beanstalk provisions and manages EC2 for you

| Workload | Best Compute Choice | Why |
|---|---|---|
| Traditional web app, always-on | EC2 (with Auto Scaling) | Predictable load, need OS control |
| Event-driven function, <15min | Lambda | No idle cost, no capacity management |
| Containerized microservice | ECS Fargate | Container isolation, no EC2 management |
| ML training job, GPU required | EC2 p-family or g-family | Specific GPU hardware needed |
| Burst workload, stateless | EC2 Spot + Auto Scaling | 70–90% cost savings on interruptible work |
| Lift-and-shift server migration | EC2 | Closest match to existing server model |

---

## How This Connects

- **Amazon Machine Images (AMIs)** — AMIs are the snapshot templates that define what software an EC2 instance starts with. You can build custom AMIs from a configured instance and use them to launch identical instances quickly — the foundation of automated, repeatable deployments.
- **Amazon EBS (Elastic Block Store)** — Every EC2 instance uses EBS as its primary storage. EBS volumes persist independently of the instance lifecycle — you can detach a volume, attach it to another instance, and all data is intact. EBS snapshots back up to S3 and can be used to create new volumes or AMIs.
- **VPC and Security Groups** — EC2 instances live inside a VPC, and their network access is controlled by security groups (stateful, instance-level firewall) and optionally network ACLs (stateless, subnet-level). Understanding EC2 deeply requires understanding VPC networking.
- **IAM Roles** — The recommended way to give EC2 instances access to other AWS services is via an IAM instance profile (a role attached to the instance). The instance retrieves temporary credentials from the Instance Metadata Service automatically — no keys needed in the application code.
- **Auto Scaling Groups** — EC2 instances are almost never managed individually in production. Auto Scaling Groups manage fleets of EC2 instances, automatically launching new ones when demand increases and terminating them when demand drops — all while maintaining the minimum and maximum boundaries you define.

---

## Exam Traps

- **Terminated ≠ Stopped.** Stopped instances can be restarted and retain their EBS volumes. Terminated instances are permanently gone. If the root EBS volume had "Delete on Termination" enabled (the default), that data is unrecoverable. This distinction appears on every exam level.
- **EBS volumes are charged even when the instance is stopped.** You only avoid compute charges when stopped — storage charges for attached EBS volumes continue. To avoid all charges, you must terminate the instance (or detach and delete the volumes).
- **Public IP addresses are released on stop.** When a stopped instance restarts, it gets a new public IP. If your DNS record or firewall rules reference the old IP, they break. Use an Elastic IP address if you need a persistent public IP.
- **AMIs are region-specific.** An AMI created in us-east-1 cannot be directly launched in eu-west-1. You must copy the AMI to the target region first. The AMI ID will be different in each region even for the same image.
- **IAM roles, not access keys, on EC2.** Hardcoding AWS access keys inside EC2 instances (in environment variables, config files, or application code) is insecure and wrong. The correct pattern is attaching an IAM role via an instance profile — the IMDS delivers temporary, automatically rotating credentials.

---

## Summary

- EC2 is AWS's core IaaS compute service — virtual machines on AWS-managed Nitro hypervisors with near bare-metal performance and hardware-rooted security.
- Every EC2 launch requires six decisions: AMI, instance type, network settings (VPC/subnet), IAM role, storage (EBS), and security group.
- Instances have five states: Pending, Running, Stopping, Stopped, and Terminated. Stopped instances do not incur compute charges but EBS storage charges continue. Terminated instances are permanently deleted and cannot be recovered.
- The Nitro System offloads virtualization to dedicated hardware, delivering near-zero overhead, enhanced isolation between instances, and hardware-verified boot integrity.
- IAM roles (instance profiles) are the correct way to grant EC2 instances access to AWS services — never store access keys on an instance.
- AMIs are region-specific; public IP addresses are released on stop; Elastic IPs provide a persistent static public IPv4 address across instance restarts.

---

## Examples

A small e-commerce startup wants to run a WordPress store on AWS. They launch a single `t3.micro` EC2 instance, selecting the Amazon Linux 2023 AMI, placing it in a public subnet, assigning a public IP, and attaching a 20 GB gp3 EBS volume. To save money, they stop the instance overnight and restart it each morning. Their first surprise: the public IP address changes every morning. They solve this by allocating an Elastic IP and associating it with the instance — now the IP persists across stops and restarts, and their DNS record stays valid. This is the most common first-week EC2 lesson: plan for IP address behavior from the start.

A fintech company runs a payment-processing API that needs to call DynamoDB, KMS, and S3 from EC2 instances. Their initial implementation stored AWS access keys in environment variables on each instance — until a developer accidentally committed a `.env` file to a public GitHub repository, exposing the keys. They immediately rotated the keys and switched to IAM instance profiles: each instance now has a role with exactly the permissions needed, and temporary credentials are delivered automatically via the IMDS. No secrets on disk, no environment variables to leak, automatic rotation. This is why IAM roles on EC2 exist — the IMDS makes it operationally trivial and vastly more secure than any key-based approach.

A machine learning team runs inference servers that load a 12 GB model into GPU memory at startup — a process that takes 11 minutes. During a deployment window, they previously terminated and relaunched instances, which meant 11 minutes of unavailability per instance per deployment. By enabling EC2 Hibernate, they stop instances (saving RAM to the EBS root volume), perform OS-level maintenance, then restart — the model is already in memory when the instance resumes, and the application is serving requests within 30 seconds. The tradeoff: their root EBS volume must be large enough to hold the RAM contents (24 GB for a 24 GB RAM instance), which increases storage cost slightly. For an 11-minute cold start, that tradeoff is easily justified.

---

## Think About It

1. AWS charges for EBS volumes even when the EC2 instance they're attached to is stopped. Why does this make sense from an infrastructure perspective — what is AWS actually keeping provisioned and available for you while the instance is stopped?
2. The Nitro Security Chip prevents AWS engineers from accessing the memory of a running EC2 instance, even at the hardware level. What are the security implications of this for regulated industries like healthcare or finance? Are there scenarios where this guarantee could also be a disadvantage?
3. The default behavior when terminating an EC2 instance is to delete the root EBS volume but retain additional attached volumes. Why do you think AWS chose these as the defaults? Would you change them for a production environment, and how?
4. An application developer proposes storing AWS access keys in an EC2 instance's `/etc/environment` file so the application can access S3 and DynamoDB. You suggest using an IAM instance profile instead. What specific failure modes does the developer's approach introduce that the IAM role approach eliminates?
5. A startup CTO asks why they should use EC2 at all when AWS Lambda "just runs code" without any server management. How would you explain the legitimate cases where EC2 is the better choice — not just defensively, but with specific scenarios where Lambda genuinely cannot serve as a substitute?

---

## Quick Check

**Q1.** An EC2 instance is stopped overnight to save money. Which charges continue while the instance is in the Stopped state?
- A) Compute charges only
- B) EBS storage charges only
- C) Both compute and EBS storage charges
- D) No charges at all — stopped instances are completely free

**Answer: B** — Stopped instances do not incur compute (CPU/memory) charges, but attached EBS volumes are still provisioned and continue to be charged at their normal storage rate (e.g., $0.08/GB-month for gp3).

**Q2.** A developer launches an EC2 instance, stops it, and when it restarts notices the public IP address has changed. What is the correct solution to ensure the instance always has the same public IP?
- A) Use a larger instance type — larger instances get permanent IP addresses
- B) Allocate an Elastic IP address and associate it with the instance
- C) Enable Enhanced Networking on the instance
- D) Place the instance in a dedicated VPC

**Answer: B** — Dynamic public IP addresses are released when an instance is stopped and reassigned on restart. An Elastic IP (EIP) is a static public IPv4 address you own that persists through stops and restarts.

**Q3.** What is the correct and most secure way to allow an EC2 instance to read objects from an S3 bucket?
- A) Store AWS access keys in the instance's `/etc/environment` file
- B) Embed the access key and secret in the application's source code
- C) Attach an IAM role with S3 read permissions to the instance via an instance profile
- D) Share the root account credentials with the instance via user data

**Answer: C** — IAM instance profiles attach a role to the EC2 instance. The Instance Metadata Service (IMDS) delivers temporary, automatically rotating credentials to the application — no static keys on disk, no credentials in code, and no manual rotation required.

---

## What's Next

Next up: EC2 instance types and families — how to read instance type names, understand the trade-offs between compute-optimized, memory-optimized, and general-purpose families, and choose the right hardware configuration for your workload. This is one of the most-tested EC2 topics on the SAA exam.
