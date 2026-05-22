---
title: "Custom Machine Types & Spot VMs"
type: content
estimated_minutes: 9
cert_tags: ["ace", "pca"]
---

# Custom Machine Types & Spot VMs

## Overview

In AWS and Azure, you are locked into rigid t-shirt sizes. If an application requires 6 vCPUs and 20 GB of RAM, but the cloud provider only offers a "4 CPU / 16 GB" size or an "8 CPU / 32 GB" size, you are forced to over-provision and buy the larger instance, wasting money on unused resources.

Google Cloud solves this architectural inefficiency natively with **Custom Machine Types**.

## Custom Machine Types

When provisioning an N1, N2, or E2 Virtual Machine in GCP, you do not have to pick from a dropdown menu of pre-defined sizes. You can select "Custom" and literally drag two sliders: one for the number of vCPUs, and one for the amount of Memory.

* *The Impact:* You tailor the hardware to fit the exact specifications of the application. If your legacy software needs exactly 6 vCPUs and 24 GB of RAM, you build exactly that. You stop paying for "dead" compute capacity.

## Spot VMs (Preemptible Compute)

All cloud providers have massive amounts of unused hardware sitting idle in their data centers. To monetize this, Google offers **Spot VMs** (formerly known as Preemptible VMs) at discounts of up to 90% off the standard on-demand price.

**The Catch (Preemption):**
Spot VMs come with zero availability guarantees. If a customer paying full price requests compute capacity, Google will instantly terminate (preempt) your Spot VM to free up the hardware. You are given a mere **30-second warning** before the server is destroyed. 

**Architectural Use Cases:**
You must never run a database or a single point-of-failure web server on a Spot VM. They are designed exclusively for stateless, fault-tolerant workloads:
* Big data batch processing jobs.
* Video rendering farms.
* Worker nodes in a Kubernetes cluster (where the orchestrator will automatically spin up a replacement node when one is terminated).

## Summary

GCP allows architects to tightly control OpEx through Custom Machine Types, enabling precise CPU and Memory configurations to eliminate wasted capacity. For massive, fault-tolerant batch workloads, architects leverage Spot VMs to achieve up to 90% cost savings, designing the application logic to gracefully handle sudden, 30-second preemption notices.