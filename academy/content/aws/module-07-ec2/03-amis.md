---
title: "AMIs and Launch Templates"
type: content
estimated_minutes: 8
cert_tags: ["aws_saa", "aws_soa", "aws_dva"]
---

# AMIs and Launch Templates

## Overview

An Amazon Machine Image (AMI) is a template that contains the software configuration required to launch an EC2 instance: the operating system, application server, and applications. AMIs are the blueprint for your EC2 fleet. Launch Templates extend AMIs by capturing the full launch configuration — instance type, network settings, security groups, IAM role, user data — into a versioned, reusable template.

## AMI Types and Sources

AMIs can be: **AWS-provided** (Amazon Linux 2023, Ubuntu, Windows Server, Red Hat — maintained and patched by AWS or the OS vendor), **AWS Marketplace** (pre-configured solutions from vendors — databases, security tools, commercial software — often with licensing included in the per-hour price), **Community** (public AMIs shared by other AWS users — use with caution, as they're not AWS-vetted), and **Your own** (custom AMIs you create from running instances or from a build pipeline).

AMIs are Region-specific — an AMI in us-east-1 must be copied to us-west-2 before it can be used there. AMI IDs differ by Region even for the same OS version. AMI copying preserves the snapshot data and can include encryption.

## Creating Custom AMIs

Creating a custom AMI (also called "golden AMI" or "machine image") lets you bake your configuration into the image so that new instances launch pre-configured: OS hardened, agents installed (CloudWatch Agent, SSM Agent, security scanner), application deployed, environment-specific configuration applied.

The process: launch an instance, configure it as desired, create an AMI from it (the instance's root EBS volume is snapshotted), and use that AMI to launch all future instances of that type. When you need to update the configuration, update an instance, create a new AMI version, and roll it out to your fleet.

**EC2 Image Builder** automates this process: define a pipeline that builds, tests, and distributes AMIs on a schedule or when triggered by OS patches. The result: always-current, pre-tested AMIs for your fleet.

## Launch Templates

Launch Templates capture the complete configuration for launching EC2 instances: AMI ID, instance type, key pair, security groups, subnet, IAM instance profile, user data script, storage configuration, and advanced options like placement groups and Nitro Enclave settings. They support versioning — update the template while keeping old versions for rollback.

Launch Templates are required for advanced EC2 features: Spot Instance diversification across instance types, EC2 Fleet and Spot Fleet configurations, and Auto Scaling Groups (ASGs) that can span multiple instance types. They're the evolution of the older Launch Configurations (which didn't support versioning and are being deprecated).

## Summary

AMIs are OS and software templates for launching EC2 instances. Sources: AWS-provided (Amazon Linux, Windows), Marketplace (vendor software), community, or your own custom AMIs. Use EC2 Image Builder to automate AMI creation and patching. Launch Templates capture the full instance launch configuration with versioning — required for Auto Scaling Groups and advanced Spot configurations.

## Examples

A small SaaS company deploys its web application by SSHing into a fresh Amazon Linux instance, running a bash script to install dependencies and clone the repo, then manually configuring the app. It works — until an Auto Scaling event launches a new instance and the startup script fails silently, leaving a broken node in the load balancer pool. They switch to a Golden AMI workflow: bake the fully configured app into a custom AMI, and ASG launches produce pre-configured, immediately healthy instances with no startup scripts. Boot time drops from 4 minutes to 45 seconds.

A security-conscious healthcare company needs HIPAA-compliant base images on all EC2 instances — OS hardening, CloudWatch Agent, SSM Agent, and a vulnerability scanner pre-installed. They set up an EC2 Image Builder pipeline that triggers weekly, applies OS patches, runs a CIS benchmark test suite, and distributes the resulting AMI to all three of their AWS Regions. Every new instance in every Region starts from a tested, patched, compliant image — with no manual intervention and a full audit trail in Image Builder's console.

A platform engineering team at a large retailer manages 14 microservices, each with slightly different runtime dependencies. Rather than maintaining 14 separate AMI pipelines, they create a single hardened base AMI and layer service-specific configuration via Launch Template user data scripts. Each microservice has its own Launch Template that references the shared base AMI and injects a short cloud-init script for service-specific setup. When the base AMI is updated (e.g., a kernel patch), all 14 Launch Templates pick it up automatically because the AMI ID is resolved via SSM Parameter Store — not hardcoded.

## Think About It

1. Why are AMIs Region-specific rather than global? What would the implications be for a multi-Region architecture if you forgot to copy an updated AMI before a deployment?
2. What are the trade-offs between baking everything into a Golden AMI versus using a minimal base AMI and running configuration at startup via user data? Under what conditions would each approach break down?
3. Launch Templates support versioning, but Launch Configurations (now deprecated) did not. Why does versioning matter for operational safety — specifically in the context of Auto Scaling Groups?
4. If a community AMI is free and already has the software you need pre-installed, why might a security team reject it? What controls would you put in place if you had to use it?
5. How would you design an AMI update rollout strategy for a fleet of 500 running EC2 instances without causing downtime?

## Quick Check

**Q1.** A team creates a custom AMI in us-east-1 and tries to launch instances from it in eu-west-1, but the AMI is not available. What must they do?
- A) Create a new AMI from scratch in eu-west-1
- B) Copy the AMI from us-east-1 to eu-west-1
- C) Change the AMI's Region setting in the console
- D) Use a Launch Template to make it Region-agnostic

**Answer: B** — AMIs are Region-specific; to use an AMI in a different Region you must explicitly copy it there, which replicates the underlying EBS snapshot.

**Q2.** Which service automates the building, testing, and distribution of custom AMIs on a schedule?
- A) AWS CodeBuild
- B) AWS Systems Manager Patch Manager
- C) EC2 Image Builder
- D) AWS Config

**Answer: C** — EC2 Image Builder provides a managed pipeline for creating, testing, and distributing AMIs automatically, eliminating the need to manually build and maintain Golden AMIs.

**Q3.** What is the key advantage of Launch Templates over the older Launch Configurations?
- A) Launch Templates support more instance types
- B) Launch Templates are free; Launch Configurations cost extra
- C) Launch Templates support versioning and are required for advanced features like Spot diversification
- D) Launch Templates automatically choose the cheapest instance type

**Answer: C** — Launch Templates support versioning (enabling rollback) and are required for advanced EC2 features including Spot Instance diversification, EC2 Fleet, and Auto Scaling Groups with multiple instance types.

## What's Next

Next: EC2 pricing models — when to use on-demand, reserved, spot, and dedicated options for different workload characteristics.
