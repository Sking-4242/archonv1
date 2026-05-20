---
title: "AWS Resilience Hub and Chaos Engineering"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Resilience Hub and Chaos Engineering

## Overview

Designing for resilience is necessary but not sufficient — you must test resilience. AWS Resilience Hub provides automated resilience assessment and RTO/RPO recommendations. AWS Fault Injection Service (FIS) enables controlled chaos engineering experiments to validate your resilience assumptions.

## AWS Resilience Hub

Resilience Hub analyzes your application (defined as a set of AWS resources — EC2, RDS, ECS, Lambda, etc.) and assesses it against your defined RTO and RPO targets. It identifies resilience gaps: missing Multi-AZ configurations, unprotected data stores, missing backup policies. It generates specific recommendations and assigns a resiliency score. Use Resilience Hub during architecture review and as part of your CI/CD pipeline (integrate via API) to catch resilience regressions as infrastructure changes.

## AWS Fault Injection Service (FIS)

FIS runs controlled chaos engineering experiments on AWS infrastructure. Pre-built actions: terminate EC2 instances, increase network latency, degrade CPU performance, interrupt Spot instances, inject RDS failover, disrupt ECS tasks. FIS experiments have stop conditions (CloudWatch alarms) that automatically halt the experiment if impact exceeds expected bounds. Use FIS to validate: 'Does my ALB detect the instance failure within 30 seconds? Does Auto Scaling replace it? Does my monitoring alert?'

## GameDays and Resilience Testing

A GameDay is a planned exercise where the operations team simulates a failure scenario (region outage, database failure, traffic spike) and tests their response. FIS provides the failure injection mechanism. Measure actual RTO and RPO against targets. Document gaps and feed them into architecture improvements. GameDays reveal operational gaps that architecture reviews miss: alarm thresholds that aren't tuned, runbooks that are outdated, dependencies on a single on-call person's knowledge.

## The Well-Architected Reliability Pillar

The AWS Well-Architected Framework's Reliability Pillar defines best practices: test recovery procedures (FIS, GameDays), automatically recover from failure (health checks, Auto Scaling), scale horizontally (distribute load), stop guessing capacity (Auto Scaling), manage change in automation (IaC, CI/CD). Regular Well-Architected Reviews using the Reliability lens identify gaps between current architecture and best practices.

## Summary

Resilience Hub assesses your architecture against RTO/RPO targets and identifies gaps. FIS enables controlled chaos engineering experiments to validate resilience under failure conditions. GameDays translate theory into proven operational capability. Testing resilience is as important as designing for it — an untested DR plan is just a hypothesis.

## What's Next

Next up: the Module 23 Canvas Lab — design a warm standby DR architecture.