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

## What's Next

Next up: the Module 20 Canvas Labs — build a CI/CD pipeline for an ECS application.