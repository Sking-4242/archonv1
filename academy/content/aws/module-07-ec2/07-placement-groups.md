---
title: "Placement Groups and Elastic IPs"
type: content
estimated_minutes: 7
cert_tags: ["aws_saa", "aws_soa"]
---

# Placement Groups and Elastic IPs

## Overview

Placement Groups control where EC2 instances are placed within the AWS infrastructure — on the same hardware for performance or spread across hardware for fault tolerance. Elastic IPs provide static public IPv4 addresses that remain yours until you release them, surviving instance stops and restarts.

## Placement Group Types

**Cluster Placement Group:** Packs instances close together in a single AZ, on hardware with low-latency 10 Gbps or 100 Gbps networking between instances. Use for HPC workloads, distributed ML training, or any application that requires extremely low network latency between instances. Risk: if the underlying hardware fails, all instances in the cluster are affected. Single-AZ only.

**Spread Placement Group:** Places each instance on distinct hardware (different racks with separate power and networking). Maximum 7 instances per AZ, can span multiple AZs. Use for small numbers of critical instances where each must survive independent hardware failure — primary/secondary database pairs, cluster of management nodes.

**Partition Placement Group:** Divides instances into logical partitions, each on its own set of racks. Up to 7 partitions per AZ, hundreds of instances total. Use for distributed systems (Hadoop, Kafka, Cassandra) that are partition-aware — you can place each replica in a separate partition.

## Elastic IPs

An Elastic IP (EIP) is a static public IPv4 address allocated to your account. Unlike a regular public IP (which changes when you stop and start an instance), an Elastic IP is stable — it doesn't change when you reassign it to a different instance.

Use cases: when you need a fixed IP for DNS records that can't update quickly, IP allowlisting by partners who need your IP to remain stable, or failover (reassign the EIP from a failed instance to a replacement).

Cost: Elastic IPs are free when attached to a running instance. When not attached, or attached to a stopped instance, they incur a small hourly charge (~$0.005/hour) — this discourages IP hoarding. AWS limits accounts to 5 EIPs by default (can be increased).

**Modern alternative:** Use Route 53 DNS names (which can point to any IP) or ALBs (which have stable DNS names) instead of EIPs wherever possible. EIPs are a limited resource (IPv4 addresses are scarce globally).

## Summary

Cluster Placement Groups co-locate instances for low-latency networking (HPC, distributed training). Spread Placement Groups separate instances across distinct hardware for maximum fault tolerance (up to 7 per AZ). Partition Placement Groups support partition-aware distributed systems (Hadoop, Kafka). Elastic IPs provide static public IPv4 — free when attached to a running instance, charged when idle. Use DNS names and ALBs instead of EIPs where possible.

## Examples

A startup running a distributed deep learning training job across 8 GPU instances on EC2 notices that inter-node gradient synchronization is taking longer than the actual compute steps — a classic sign of network-bottlenecked distributed training. They move all 8 instances into a Cluster Placement Group. Suddenly the instances share 100 Gbps low-latency networking on the same physical rack, and synchronization time drops by 80%. Their total training job wall-clock time decreases by 40%. This is the most common entry point into placement groups: high-performance computing workloads that are network-latency-sensitive.

A SaaS company runs a three-node Elasticsearch cluster (primary + two replicas). They initially deploy all three nodes on whatever hardware AWS selects by default. A hardware failure in one rack takes out all three nodes simultaneously, causing a full outage. After the incident, they move each node into a Spread Placement Group — each node on a distinct rack with independent power and networking. The next rack failure only takes down one Elasticsearch node; the cluster degrades gracefully and self-heals. Seven instances per AZ is the limit, but for a three-node cluster that constraint is irrelevant.

A data platform team runs a 60-node Kafka cluster with a replication factor of 3 — meaning each message is stored on 3 different brokers. They want to ensure that the 3 replicas of any given partition land on physically separate infrastructure. They create a Partition Placement Group with 3 partitions and distribute Kafka broker assignment so replicas always span partitions. Now a rack-level failure can take out an entire partition of hardware, but no topic loses more than one of its three replicas — the cluster remains fully available. This is the Partition Placement Group's purpose: mapping infrastructure failure domains to application-layer replication topology.

## Think About It

1. Cluster Placement Groups provide the lowest network latency between instances but put all instances at risk if the underlying hardware fails. How would you weigh this trade-off for a distributed ML training job that takes 72 hours to complete?
2. Spread Placement Groups limit you to 7 instances per AZ. Why does this constraint exist, and what would you do if your fault-tolerant cluster required 10 instances — all with independent hardware failure domains?
3. Partition Placement Groups are described as "partition-aware" — meaning the application must be designed to use partition information. What would happen if you placed a Kafka cluster in a Partition Placement Group but assigned brokers randomly without considering which partition they belong to?
4. Elastic IPs are charged when not attached to a running instance. What problem does this pricing model solve from AWS's perspective, and what alternative architectures eliminate the need for EIPs entirely?
5. If a company uses Route 53 with a short TTL instead of an Elastic IP for failover, what are the trade-offs? Under what conditions would DNS-based failover be unacceptably slow compared to EIP reassignment?

## Quick Check

**Q1.** A company needs the lowest possible network latency between a group of EC2 instances running an HPC simulation. Which placement group type should they use?
- A) Spread Placement Group
- B) Partition Placement Group
- C) Cluster Placement Group
- D) No placement group — default placement is sufficient

**Answer: C** — Cluster Placement Groups co-locate instances on the same physical rack within a single AZ, enabling 10–100 Gbps low-latency networking that is ideal for HPC and tightly coupled parallel workloads.

**Q2.** What is the maximum number of EC2 instances per Availability Zone in a Spread Placement Group?
- A) 2
- B) 7
- C) 20
- D) Unlimited

**Answer: B** — Spread Placement Groups allow a maximum of 7 instances per AZ, because each instance must reside on distinct hardware (separate rack, power, and networking), and this places a physical limit on the group size per AZ.

**Q3.** When does an Elastic IP address incur a charge?
- A) Always — EIPs are billed per hour regardless of attachment
- B) When attached to a running instance
- C) When not attached to a running instance (idle or attached to a stopped instance)
- D) Only when traffic is passing through the EIP

**Answer: C** — AWS charges for Elastic IPs that are not actively attached to a running instance (~$0.005/hour), incentivizing users to release unused IPs and discouraging IP hoarding in a scarce IPv4 address space.

## What's Next

Module 7 theory is complete. Two labs follow: launching and connecting to an EC2 instance, then attaching and resizing an EBS volume.
