---
title: "Placement Groups and Elastic IPs"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SOA-C02"]
---

# Placement Groups and Elastic IPs

## Overview

Most EC2 workloads don't need to think about where AWS physically places their instances — the default placement is reliable, multi-AZ capable, and suitable for the vast majority of applications. But some workloads have specific hardware placement requirements that the default cannot satisfy: a distributed ML training job where inter-node network latency determines how fast gradient synchronization runs, a small cluster of critical nodes where each must survive independent hardware failure, or a large distributed database where you need to ensure replicas never share the same physical rack.

Placement Groups are EC2's mechanism for communicating your placement preferences to AWS's infrastructure scheduler. Three types serve distinct goals: Cluster for lowest latency (co-location risk accepted), Spread for maximum fault isolation (7-instance limit accepted), and Partition for mapping infrastructure failure domains to application replication topology (partition-aware application required).

Elastic IPs are a separate but related operational topic — static public IPv4 addresses that persist when you stop, restart, or re-IP an instance. They solve the specific problem of dynamic public IP assignment on EC2, where stopping and restarting an instance changes its public IP and breaks any external references to that address. This lesson covers both concepts because they often appear together in architecture decisions about how to make EC2-based systems both performant and reliably addressable.

---

## Core Concepts

### Cluster Placement Groups: Co-Location for Performance

A Cluster Placement Group instructs AWS to place all member instances on hardware within the same physical rack, or on adjacent racks within the same AZ connected by the highest-bandwidth networking available. The result: instances in a Cluster Placement Group can communicate with each other at up to 100 Gbps bandwidth with significantly lower latency than default placement.

**When to use Cluster Placement Groups:**
- HPC (High Performance Computing) simulations with MPI collective operations
- Distributed deep learning training where gradient synchronization latency limits throughput
- Real-time analytics requiring extremely fast inter-node communication
- Any tightly-coupled parallel workload where network latency is the bottleneck

**The trade-off**: co-locating instances on the same hardware maximizes performance but concentrates risk. If the physical rack experiences a hardware failure (power supply, top-of-rack switch, motherboard), all instances in the cluster may be affected simultaneously. For workloads where this risk is acceptable (the training job can restart), the performance benefit justifies it. For critical production services, it is not.

**Constraints**: Cluster Placement Groups are single-AZ. You cannot span a Cluster Placement Group across AZs. Not all instance types support Cluster Placement Groups — compute-optimized (C), memory-optimized (R), and accelerated computing (P, G) families typically support it; check the instance type documentation.

---

### Spread Placement Groups: Maximum Fault Isolation

A Spread Placement Group instructs AWS to place each member instance on entirely distinct hardware — separate physical rack, separate power supply, and separate network switch. A failure in any one piece of hardware can only affect one instance in the group.

**When to use Spread Placement Groups:**
- A small number of critical instances where each must survive independent hardware failure
- Primary/secondary database pairs (each must not share hardware)
- Management nodes or master nodes in distributed systems
- Any cluster where you can afford no correlated hardware failures

**The constraint**: Spread Placement Groups allow a maximum of **7 instances per Availability Zone**. This limit exists because "distinct hardware" means distinct physical rack, and AWS cannot guarantee more than 7 racks of distinct hardware per AZ for placement group purposes. You can span multiple AZs within a Region in a single Spread Placement Group, giving you up to 7 instances per AZ across multiple AZs.

For fleets larger than 7 per AZ, use **Partition Placement Groups** instead — Partition groups provide fault domain isolation at scale.

---

### Partition Placement Groups: Failure Domain Awareness at Scale

A Partition Placement Group divides instances into logical partitions, where each partition is guaranteed to run on a distinct set of racks from all other partitions. AWS guarantees no two partitions share underlying hardware. You can have up to **7 partitions per Availability Zone** and thousands of instances distributed across those partitions.

Crucially, instances in a Partition Placement Group can query AWS metadata to discover which partition they belong to. Partition-aware distributed systems (Kafka, Cassandra, HDFS) use this information to ensure replicas are distributed across partitions, which maps to distribution across physical failure domains.

**The Kafka example:** A Kafka cluster with replication factor 3 means each message has 3 copies on 3 different brokers. With 3 partitions in a Partition Placement Group, you can configure Kafka's rack-awareness feature to place the 3 replicas of each partition on brokers in 3 different Partition Placement Group partitions. A complete rack failure (one partition of hardware) loses one replica of each Kafka partition — the cluster continues serving traffic because 2 replicas remain. Without partition awareness, a rack failure might take out 2 or 3 replicas of the same Kafka partition simultaneously, causing data loss.

**When to use Partition Placement Groups:**
- HDFS clusters (distribute DataNode replicas across partitions)
- Apache Kafka (use rack-awareness to spread replicas across partitions)
- Apache Cassandra (use snitch configuration to map partitions to failure domains)
- Any large distributed system with a built-in replication/sharding mechanism

---

### Elastic IP Addresses: Static Public IPv4

When you launch an EC2 instance with "Auto-assign Public IP" enabled, AWS assigns a public IPv4 address dynamically from its pool. This address is released when you stop the instance and a new one is assigned when you start it again. For most use cases, this is fine — you reference the instance by DNS name, and DNS resolves to whatever IP it currently has.

The problem arises when external parties reference your IP directly rather than by DNS:
- A partner's firewall allowlist that specifies your IP and cannot be updated quickly
- A third-party SaaS integration that whitelists a specific IP
- A DNS record with a long TTL that takes hours to propagate after an IP change
- A legacy system that hardcodes your IP address

An **Elastic IP (EIP)** is a static public IPv4 address allocated to your AWS account. Once allocated, it belongs to you until you explicitly release it — it does not change when you stop and restart an instance, and it can be re-associated to a different instance (for failover scenarios).

**EIP costs (as of February 2024):**
- **$0.005/hour** for every EIP associated with a running instance — AWS now charges for all public IPv4 addresses, including the first one per instance
- **$0.005/hour** when not associated with any running instance (idle, or associated with a stopped instance) — charges apply regardless of use
- There is no longer a free-tier EIP for the first address on a running instance; the pricing change applies to all accounts

**EIP limits:** 5 per Region per account by default. This limit can be raised via a service quota increase request, but AWS will ask for justification — EIPs are deliberately limited because IPv4 addresses are scarce globally.

**Failover with EIPs:** If you have a standby instance pre-configured and ready to replace a failed primary, you can reassign the EIP from the failed instance to the standby in seconds — much faster than DNS TTL-based failover. This is a valid pattern for single-instance failover, though Auto Scaling is the more resilient solution for production fleets.

---

### When Not to Use Elastic IPs

The modern answer to most EIP use cases is a better architecture:

- **Use an Application Load Balancer (ALB)**: ALBs have a stable DNS name (not IP) that always resolves to healthy instances. Partners and integrations reference the DNS name, not an IP. The ALB handles instance replacement transparently.
- **Use Route 53 with health checks**: For internet-facing endpoints, Route 53 with failover routing and health checks can redirect traffic to a healthy instance faster than DNS propagation alone when combined with a short TTL.
- **Use Global Accelerator**: Provides two static Anycast IP addresses that remain stable regardless of what instances sit behind them — useful for global applications where a static IP is genuinely required.

EIPs are appropriate when you genuinely need a specific IP address (e.g., a legacy partner whitelist) and cannot use a DNS-based alternative. They are not a general-purpose solution for EC2 addressability.

---

## Configuration Reference

### Creating and Using Placement Groups

**In the console:**
1. Navigate to **EC2 → Network & Security → Placement Groups**
2. Click **Create placement group**
3. Choose a name (e.g., `hpc-cluster`, `db-spread`, `kafka-partition`)
4. Select the **Strategy**: Cluster, Spread, or Partition
5. For Partition: set **Number of partitions** (up to 7 per AZ)
6. Click **Create placement group**

**Launch an instance into a placement group:**
In the EC2 launch wizard under **Advanced details → Placement group**, select your group. For Partition Placement Groups, you can also specify which partition number to assign the instance to.

---

### Placement Groups via the AWS CLI

```bash
# Create a Cluster Placement Group
aws ec2 create-placement-group \
  --group-name "ml-training-cluster" \
  --strategy cluster \
  --tag-specifications 'ResourceType=placement-group,Tags=[{Key=Purpose,Value=ml-training}]'

# Create a Spread Placement Group
aws ec2 create-placement-group \
  --group-name "db-nodes-spread" \
  --strategy spread

# Create a Partition Placement Group with 3 partitions
aws ec2 create-placement-group \
  --group-name "kafka-brokers-partition" \
  --strategy partition \
  --partition-count 3

# Launch an instance into a Cluster Placement Group
aws ec2 run-instances \
  --image-id ami-0abc1234567890def \
  --instance-type p4d.24xlarge \              # GPU instance for ML training
  --count 8 \                                 # Launch 8 instances for distributed training
  --placement '{"GroupName": "ml-training-cluster"}' \
  --key-name my-key-pair \
  --security-group-ids sg-0abc12345

# Launch into a specific partition of a Partition Placement Group
aws ec2 run-instances \
  --image-id ami-0abc1234567890def \
  --instance-type m7i.4xlarge \
  --count 1 \
  --placement '{"GroupName": "kafka-brokers-partition", "PartitionNumber": 1}' \
  --key-name my-key-pair \
  --security-group-ids sg-0abc12345

# Describe placement groups in your account
aws ec2 describe-placement-groups \
  --query 'PlacementGroups[*].{Name:GroupName,Strategy:Strategy,State:State,Partitions:PartitionCount}' \
  --output table
```

---

### Allocating and Managing Elastic IPs

```bash
# Allocate an Elastic IP to your account
aws ec2 allocate-address \
  --domain vpc \                              # Required for VPC (all modern accounts)
  --tag-specifications 'ResourceType=elastic-ip,Tags=[{Key=Name,Value=my-web-server-eip}]'
# Returns: {"PublicIp": "203.0.113.42", "AllocationId": "eipalloc-0abc12345"}

# Associate the EIP with a running instance
aws ec2 associate-address \
  --instance-id i-0abc1234567890def \
  --allocation-id eipalloc-0abc12345

# Disassociate an EIP from an instance (without releasing it)
aws ec2 disassociate-address \
  --association-id eipassoc-0abc12345

# Re-associate the same EIP to a different instance (failover pattern)
aws ec2 associate-address \
  --instance-id i-0newinstanceid \            # Failover to replacement instance
  --allocation-id eipalloc-0abc12345 \
  --allow-reassociation                       # Required if EIP is already associated

# List all Elastic IPs in your account
aws ec2 describe-addresses \
  --query 'Addresses[*].{IP:PublicIp,AllocationId:AllocationId,InstanceId:InstanceId,State:AssociationId}' \
  --output table

# Release an EIP (stop all charges — cannot recover this specific IP)
aws ec2 release-address \
  --allocation-id eipalloc-0abc12345
```

---

### Placement Group Capability Reference

| Placement Group Type | Max Instances | AZ Scope | Use Case | Key Constraint |
|---|---|---|---|---|
| Cluster | No hard limit | Single AZ | HPC, distributed ML training | All instances share correlated failure risk |
| Spread | 7 per AZ | Multi-AZ | Small critical clusters | Hard 7-instance-per-AZ limit |
| Partition | Thousands | Single AZ | Kafka, HDFS, Cassandra | Application must be partition-aware |

---

## How to Decide

**Which Placement Group type:**

| Scenario | Type | Why |
|---|---|---|
| 16-instance distributed GPU training job | Cluster | Latency between nodes is the bottleneck |
| 3-node Elasticsearch cluster (primary + 2 replicas) | Spread | Each node on distinct hardware |
| 200-node Kafka cluster, RF=3 | Partition (3 partitions) | Map rack failure domains to replica topology |
| Standard web server fleet behind ALB | None | Default placement is sufficient |
| 10 critical management nodes requiring fault isolation | Partition (7 partitions, 2 AZs) or Spread across AZs | Spread hits 7-per-AZ limit for 10 nodes |

**When to use Elastic IPs vs. alternatives:**

| Scenario | Recommendation |
|---|---|
| Web server behind an ALB | Use ALB DNS name — no EIP needed |
| Internet-facing API, partner firewall allowlist | EIP on the instance (or ALB with fixed IP via Global Accelerator) |
| Single-instance database with failover to standby | EIP reassignment for fast failover |
| Multi-instance fleet with Auto Scaling | No EIP — use ALB or Route 53 |
| Global application requiring two static IPs | AWS Global Accelerator (provides static Anycast IPs) |

---

## How This Connects

- **Auto Scaling Groups** — ASGs work poorly with Cluster Placement Groups (ASG may not be able to launch instances if the cluster hardware is full) and are not compatible with the EIP-per-instance model. For fleets managed by ASGs, use ALBs and Route 53 for addressing rather than EIPs.
- **Elastic Load Balancing** — ALBs have stable DNS names that survive any IP changes behind them. For most internet-facing use cases, an ALB DNS name is a better alternative to an EIP, because it provides both stable addressing and load distribution.
- **AWS Global Accelerator** — Provides two static Anycast IPv4 addresses that remain stable regardless of backend changes. For applications that genuinely need a static IP at global scale (not just a stable DNS name), Global Accelerator is the modern EIP alternative.
- **EC2 Enhanced Networking** — Cluster Placement Groups deliver their full performance benefit only when combined with instances that have Enhanced Networking enabled (SR-IOV / Elastic Network Adapter). Most current-generation instance types support ENA by default.
- **Amazon VPC** — Elastic IPs exist within VPC's public IP address space. They require an Internet Gateway in the VPC to route traffic. Private-subnet instances cannot use EIPs without a NAT Gateway for outbound traffic.

---

## Exam Traps

- **Cluster Placement Groups are single-AZ only.** You cannot span a Cluster Placement Group across AZs. If a question asks about multi-AZ + low latency, the answer is not a Cluster Placement Group.
- **Spread Placement Groups max out at 7 instances per AZ.** If a question describes a cluster that needs more than 7 instances with independent hardware failure domains, the answer is a Partition Placement Group, not a Spread group.
- **EIPs charge when NOT attached to a running instance.** A common mistake: you stop an instance and assume EIPs are free because "the instance is off." The EIP itself incurs charges when idle — you must either release it or keep it attached to a running instance to avoid charges.
- **Moving an instance into a Placement Group after launch.** You generally cannot add a running instance to a Placement Group. The instance must be stopped, then moved (for existing instances) or the Placement Group must be specified at launch time. Starting an already-running instance to move it may fail if the target hardware can't accommodate the group.
- **Partition Placement Groups require application-level awareness.** The Partition Group itself does not automatically distribute replicas — the application (Kafka, Cassandra, HDFS) must be configured to use the partition metadata. Just placing instances in a partition group without configuring the application achieves nothing from a fault-tolerance perspective.

---

## Summary

- Cluster Placement Groups co-locate instances on adjacent hardware in a single AZ for maximum network performance (up to 100 Gbps, low latency) — ideal for HPC and distributed ML training, with the trade-off of correlated hardware failure risk.
- Spread Placement Groups place each instance on distinct hardware (separate rack, power, and networking) for maximum fault isolation, limited to 7 instances per AZ — ideal for small critical clusters.
- Partition Placement Groups divide instances into up to 7 partitions per AZ, each on distinct hardware, supporting thousands of instances — used by partition-aware distributed systems (Kafka, HDFS, Cassandra) to map infrastructure failure domains to replication topology.
- Elastic IPs are static public IPv4 addresses that persist through instance stops and restarts; as of February 2024, AWS charges $0.005/hour for all EIPs — whether associated with a running instance, a stopped instance, or unattached.
- For most use cases, ALB DNS names, Route 53, or Global Accelerator are better alternatives to EIPs — they provide stable addressing without consuming scarce IPv4 addresses.
- EIP reassignment (moving an EIP from a failed instance to a standby) enables fast failover without waiting for DNS TTL propagation.

---

## Examples

A startup running distributed deep learning training across 8 GPU instances finds that inter-node gradient synchronization takes longer than the actual compute steps — a sign of network-bottlenecked distributed training. They move all 8 instances into a Cluster Placement Group. The instances now share 100 Gbps low-latency networking on adjacent hardware, and synchronization time drops by 80%. Total training job wall-clock time decreases by 40%. The cost: all 8 instances share correlated hardware failure risk. For a training job that checkpoints to S3 every 30 minutes and can restart from the last checkpoint, this is an acceptable trade-off — the performance gain is worth the rare possibility of a checkpoint-recovery restart.

A SaaS company runs a three-node Elasticsearch cluster — a primary and two replicas — initially deployed with default AWS placement. A hardware failure takes out all three nodes simultaneously (they happened to land on the same physical rack during initial provisioning). After the 4-hour outage, they move each node into a Spread Placement Group — one instance per distinct rack with independent power and networking. The next rack failure only affects one Elasticsearch node. The cluster degrades to two nodes, triggers an alert, and the on-call engineer provisions a replacement — but search continues serving traffic throughout. The operational discipline of using Spread for small critical clusters is now a platform standard.

A data platform team runs a 60-node Kafka cluster with a replication factor of 3. Without placement group configuration, a rack failure might take out 3 consecutive Kafka brokers, all of which hold replicas of the same set of partitions — causing data loss even with RF=3. They create a Partition Placement Group with 3 partitions and configure Kafka's `broker.rack` setting to map each partition number to a Kafka rack ID. Now the 3 replicas of every Kafka partition are distributed across the 3 infrastructure partitions. A complete rack failure (one Partition Group partition) loses one replica of each Kafka partition — the cluster remains fully available. The application-level configuration was the critical piece; the Placement Group alone does nothing without the Kafka rack-awareness setting.

---

## Think About It

1. Cluster Placement Groups provide the lowest network latency between instances but concentrate all instances on adjacent hardware with correlated failure risk. For a 72-hour distributed ML training job that checkpoints to S3 every 30 minutes, how would you evaluate whether this trade-off is acceptable? What is the actual cost of a hardware failure under this design?
2. Spread Placement Groups limit you to 7 instances per AZ. Why does this constraint exist at exactly 7? If you needed 10 instances with independent hardware failure domains, what would your options be?
3. Partition Placement Groups require the application to be "partition-aware" — it must read instance metadata to discover its partition and use that information to guide replica placement. What would happen if you placed a Kafka cluster in a Partition Placement Group but assigned brokers without considering partition membership?
4. Elastic IPs solve the problem of dynamic public IP assignment on EC2, but Application Load Balancers with DNS names also solve this problem for internet-facing applications. Under what specific conditions is an EIP genuinely the right tool, and when should you use an ALB instead?
5. EIP reassignment — moving an EIP from a failed primary instance to a standby — can complete in seconds, while DNS-based failover waits for TTL expiration. For what types of applications is seconds of IP-failover latency meaningfully better than minutes of DNS propagation, and for what applications does the distinction not matter?

---

## Quick Check

**Q1.** A company runs an HPC simulation that requires the lowest possible network latency between 12 EC2 instances. Which placement group type should they use, and what is an important limitation to understand?
- A) Spread Placement Group — provides the lowest latency by isolating instances
- B) Partition Placement Group — allows up to 12 instances per partition
- C) Cluster Placement Group — co-locates instances for maximum performance, but all instances share correlated hardware failure risk and the group is limited to one AZ
- D) No Placement Group — default placement provides sufficient network performance for HPC

**Answer: C** — Cluster Placement Groups co-locate instances on adjacent hardware within a single AZ for up to 100 Gbps low-latency networking, but the trade-off is that all instances share correlated hardware failure risk.

**Q2.** An architect needs to ensure that each of 5 critical EC2 instances (primary database nodes) runs on entirely separate hardware with independent power and networking. Which placement group type satisfies this requirement?
- A) Cluster Placement Group
- B) Spread Placement Group (max 7 per AZ, each on distinct hardware)
- C) Partition Placement Group
- D) No placement group — use multiple Availability Zones instead

**Answer: B** — Spread Placement Groups guarantee each instance runs on distinct hardware (separate rack, power, and networking), up to 7 per AZ. For 5 instances, this fits within the limit and provides exactly the required fault isolation.

**Q3.** A developer allocated an Elastic IP, associated it with an EC2 instance, then stopped the instance for the weekend. Which of the following best describes the billing for the EIP during the weekend?
- A) The EIP is free because it is still associated with an instance
- B) The EIP incurs hourly charges because the associated instance is stopped, not running
- C) The EIP is free because the instance is in the same account
- D) The EIP incurs charges only if traffic is routed through it

**Answer: B** — AWS charges for Elastic IPs that are not associated with a *running* instance. An EIP associated with a stopped instance is considered idle and incurs the standard idle charge (~$0.005/hour) to discourage IP hoarding.

---

## What's Next

Module 7 content is complete. Two hands-on labs follow: launching and connecting to an EC2 instan