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

## What's Next

Module 7 theory is complete. Two labs follow: launching and connecting to an EC2 instance, then attaching and resizing an EBS volume.
