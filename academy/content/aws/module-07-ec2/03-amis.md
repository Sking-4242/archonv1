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

## What's Next

Next: EC2 pricing models — when to use on-demand, reserved, spot, and dedicated options for different workload characteristics.
