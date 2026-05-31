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

## Examples

A startup team finishes building their first multi-tier web application and believes they've covered HA: Multi-AZ RDS, an ALB, and an ASG. Before launching, they run their application through AWS Resilience Hub with an RTO target of 1 hour and an RPO target of 15 minutes. Resilience Hub flags that their EFS file system has no backup policy and that their ASG has a minimum capacity of 1. They fix both gaps before go-live. Without Resilience Hub, the missing backup policy would have been an invisible vulnerability — this is exactly the architectural-review use case the tool is built for.

A platform engineering team at a mid-size company integrates Resilience Hub into their CI/CD pipeline via the AWS API. Every time infrastructure changes are merged to main, a Resilience Hub assessment runs automatically. When a developer removes a Multi-AZ flag from a Terraform RDS module to cut staging costs and accidentally commits it to the production branch, the pipeline assessment drops the resiliency score below the configured threshold and fails the deployment. The team catches a production resilience regression before it ships — an example of shifting resilience validation left into the development process.

A senior SRE team at a financial services company uses AWS FIS to run a monthly GameDay simulating an AZ failure. They configure an FIS experiment that terminates all EC2 instances in us-east-1a and injects a 200ms network latency increase on the remaining instances. Stop conditions are tied to a CloudWatch alarm on 5xx error rates — if errors exceed 1%, FIS halts the experiment automatically. The first GameDay reveals that their Route 53 health check interval was set to 30 seconds, meaning DNS failover lagged actual instance failure by nearly a minute. They tune it to 10 seconds. This is the gap between designed RTO and proven RTO that only chaos engineering can expose.

## Think About It

1. Why is an untested DR plan described in this lesson as "just a hypothesis"? What specific things can go wrong with a DR plan that has never been executed under realistic conditions?
2. Resilience Hub assigns a resiliency score to your application. If your score is 72 out of 100 but you still meet your stated RTO and RPO targets, should you invest in improving the score? What does the score tell you that the targets don't?
3. How would you design FIS stop conditions to protect a production environment during a chaos experiment? What CloudWatch metrics would you choose, and what thresholds would you set?
4. A GameDay reveals that your actual RTO is 3.5 hours against a target of 2 hours. You have two options: redesign the architecture (expensive) or revise the RTO target upward (free). How would you reason through which path to take?
5. What trade-offs do you accept when you integrate Resilience Hub assessments into a CI/CD pipeline rather than running them only during periodic architecture reviews?

## Quick Check

**Q1.** What does AWS Resilience Hub compare your application architecture against?
- A) AWS pricing benchmarks for similar workloads
- B) Your defined RTO and RPO targets, identifying gaps in your configuration
- C) The AWS Well-Architected Tool's cost optimization recommendations
- D) Industry-standard uptime SLAs for your application type

**Answer: B** — Resilience Hub analyzes your AWS resources and assesses them against the RTO and RPO targets you define, surfacing specific configuration gaps like missing backup policies or single-AZ deployments.

**Q2.** Which feature of AWS Fault Injection Service (FIS) prevents a chaos experiment from causing uncontrolled production impact?
- A) IAM permission boundaries that limit which resources FIS can affect
- B) Stop conditions tied to CloudWatch alarms that automatically halt the experiment
- C) A mandatory approval workflow requiring two engineers to confirm before injection
- D) FIS only runs in non-production accounts by design

**Answer: B** — FIS stop conditions monitor CloudWatch alarms during an experiment and automatically terminate the experiment if the defined impact threshold is breached, providing a safety boundary for controlled chaos testing.

**Q3.** What is the primary gap that GameDays and chaos engineering expose that architecture reviews and documentation cannot?
- A) Missing IAM permissions on service roles
- B) Incorrect CloudFormation template syntax
- C) Operational gaps such as outdated runbooks, misconfigured alarms, and untested recovery procedures
- D) Cost overruns from over-provisioned instances

**Answer: C** — Architecture reviews validate design intent; GameDays test actual execution under realistic failure conditions, surfacing operational issues like stale documentation and alarm thresholds that architects and reviewers typically overlook.

## What's Next

Next up: the Module 23 Canvas Lab — design a warm standby DR architecture.