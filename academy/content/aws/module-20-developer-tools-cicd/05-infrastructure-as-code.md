---
title: "Infrastructure as Code: CloudFormation and CDK"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "DVA-C02", "SAP-C02"]
---

# Infrastructure as Code: CloudFormation and CDK

## Overview

Infrastructure as Code (IaC) means defining cloud resources in version-controlled code files instead of creating them manually in the console. CloudFormation is AWS's native IaC service. The AWS CDK (Cloud Development Kit) generates CloudFormation from higher-level programming language constructs.

## AWS CloudFormation

CloudFormation deploys infrastructure from JSON or YAML templates. Resources are declared with their properties; CloudFormation determines the dependency order and creates, updates, or deletes resources atomically in a stack. Stack updates use change sets — a preview of what will change before committing. Drift detection identifies resources changed outside CloudFormation (console, CLI). Stacks can export values for other stacks to import (cross-stack references). Use nested stacks for large templates and stack sets for multi-account/multi-region deployments.

## CloudFormation Best Practices

Organize by lifecycle and ownership, not by technology: a 'data stack' for RDS and ElastiCache, an 'app stack' for ECS and ALB, a 'networking stack' for VPC and subnets. Use Parameters for environment-specific values (environment name, instance sizes). Use Conditions for optional resources. Always test changes in a staging stack before production. Use `DeletionPolicy: Retain` for stateful resources (RDS, S3) to prevent accidental data loss on stack deletion.

## AWS CDK

The CDK lets you define infrastructure in TypeScript, Python, Java, Go, or .NET using full programming language features: loops, conditionals, functions, and classes. CDK Constructs are reusable components — L1 (raw CloudFormation), L2 (opinionated with sensible defaults), L3 (high-level patterns like a complete ECS service with ALB). `cdk synth` generates CloudFormation YAML; `cdk deploy` deploys. CDK is more expressive than raw CloudFormation YAML for complex parameterized infrastructure, but requires programming language knowledge.

## Terraform on AWS

While not an AWS service, Terraform is widely used for AWS infrastructure. Terraform's HCL (HashiCorp Configuration Language) has state files, plan/apply workflow, a large module ecosystem (Terraform Registry), and native multi-cloud/multi-provider support. Many AWS organizations use Terraform for infrastructure and CDK/CloudFormation for application-layer AWS resources. Know that Terraform exists and why teams choose it — AWS certification exams focus on CloudFormation and CDK, but real-world experience commonly involves Terraform.

## Summary

CloudFormation is the AWS-native IaC service — declarative YAML/JSON templates, atomic stack deployments, change sets, and drift detection. CDK adds programming language expressiveness and reusable constructs on top of CloudFormation. Terraform is the most popular multi-cloud IaC tool with a large AWS module ecosystem. Use IaC for all production infrastructure — never provision production resources by hand.

## Examples

A startup's infrastructure started as a handful of resources clicked together in the AWS console. After six months, nobody could confidently answer "what exactly is running in production?" A new DevOps engineer migrated everything to CloudFormation: VPC, subnets, security groups, RDS, and ECS cluster each became separate YAML stacks with cross-stack references. The next time they needed to spin up a staging environment, they ran `aws cloudformation deploy` with a different `EnvironmentName` parameter — 15 minutes later, a fully isolated copy of production was running. This is the foundational IaC value proposition: reproducibility and the ability to create identical environments on demand.

A platform engineering team at a mid-size SaaS company uses AWS CDK (TypeScript) to define their standard microservice pattern: an ECS Fargate service behind an ALB, with a CloudWatch dashboard, auto-scaling policy, and IAM task role — all bundled into a reusable L3 Construct called `StandardMicroservice`. When a new product team needs to deploy a service, they import the construct, pass four parameters (service name, Docker image URI, desired count, memory), and run `cdk deploy`. Twenty lines of TypeScript replaces what would be 400 lines of CloudFormation YAML. This illustrates CDK's key advantage over raw CloudFormation: the ability to encode organizational standards and best practices as reusable, version-controlled constructs that teams consume without needing to understand every CloudFormation resource detail.

A large enterprise with dozens of AWS accounts and multiple cloud providers uses Terraform as their organization-wide IaC standard. Their AWS accounts use Terraform for networking (VPCs, Transit Gateway, Direct Connect), while application teams use AWS CDK for application-layer resources (ECS, Lambda, DynamoDB) that change more frequently and benefit from CDK's L2/L3 abstractions. The Terraform `plan` output serves as the change set for infrastructure review meetings, mirroring CloudFormation's change sets but with multi-cloud scope. This mixed IaC approach is common in large organizations and highlights a nuanced real-world trade-off: Terraform's multi-provider support and mature state management versus CDK's tighter AWS integration and native programming language expressiveness.

## Think About It

1. CloudFormation updates use change sets to preview changes before committing. Why is this important for production infrastructure, and what is the risk of applying changes without reviewing a change set first?
2. What would happen if a developer manually modified an RDS instance's parameter group through the AWS console after it was created by CloudFormation? How would CloudFormation's drift detection surface this, and what are your options for reconciling it?
3. How would you decide between organizing CloudFormation stacks by technology layer (networking stack, compute stack, data stack) versus by application (app-A stack, app-B stack) for a 10-team organization?
4. CDK synthesizes to CloudFormation under the hood. What are the implications of this for debugging a CDK deployment failure — what would you look at, and in what order?
5. Many AWS organizations use both Terraform and CloudFormation/CDK. What specific factors would lead you to recommend Terraform over CDK for a new project, and vice versa?

## Quick Check

**Q1.** What CloudFormation feature lets you preview exactly which resources will be added, modified, or deleted before applying a stack update?

- A) Drift detection
- B) Stack sets
- C) Change sets
- D) Nested stacks

**Answer: C** — A change set shows a detailed diff of resource changes that will occur when a stack update is executed, allowing teams to review and approve infrastructure changes before they take effect.

**Q2.** In AWS CDK, what does `cdk synth` produce?

- A) A Terraform plan file showing infrastructure changes
- B) A CloudFormation template in YAML or JSON format
- C) A Docker image containing the application and its dependencies
- D) An IAM policy document for the CDK deployment role

**Answer: B** — `cdk synth` compiles the CDK application code and outputs the equivalent CloudFormation template, which can be inspected before deployment or deployed directly via `cdk deploy`.

**Q3.** You have an RDS database created by CloudFormation. What should you set on that resource to prevent it from being deleted if someone runs `aws cloudformation delete-stack`?

- A) `UpdateReplacePolicy: Retain`
- B) `DeletionPolicy: Retain`
- C) `TerminationProtection: true` on the stack
- D) `PreventDeletion: enabled` in the resource properties

**Answer: B** — Setting `DeletionPolicy: Retain` on a CloudFormation resource causes CloudFormation to leave the resource in place (rather than deleting it) when the stack is deleted, protecting stateful resources like RDS instances and S3 buckets from accidental data loss.

## What's Next

Next up: the Module 20 Canvas Labs — build a CI/CD pipeline for an ECS application.