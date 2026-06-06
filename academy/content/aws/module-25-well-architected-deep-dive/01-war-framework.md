---
title: "The AWS Well-Architected Framework"
type: content
estimated_minutes: 10
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# The AWS Well-Architected Framework

## Overview

The AWS Well-Architected Framework is a set of architectural best practices distilled from AWS's experience reviewing tens of thousands of customer workloads. It gives architects, developers, and operations teams a consistent language and structured process for evaluating cloud architectures against proven standards — before problems become incidents.

Most architectural mistakes in the cloud follow predictable patterns: hardcoded credentials, no Multi-AZ failover, missing backups, over-provisioned resources, no encryption at rest, manual deployments. These failures recur because teams lack a structured way to ask the right questions early. The Well-Architected Framework encodes those questions into six pillars — Operational Excellence, Security, Reliability, Performance Efficiency, Cost Optimization, and Sustainability — and provides design principles and best practices for each. A review conducted against the framework surfaces high-risk issues systematically, not only after they cause outages.

For the CLF-C02 and SAA-C03 exams, know the six pillars by name, their core purpose, the Well-Architected Tool, and the concept of Lenses. SAP-C02 goes deeper: expect questions on specific design principles within each pillar, Well-Architected Review process, trade-off analysis across pillars, and how to use the tool in multi-account and partner-led reviews. After this lesson, you will be able to apply the framework's structure to identify architectural risks and understand which services and practices each pillar maps to.

---

## Core Concepts

### The Six Pillars

Each pillar addresses a distinct dimension of architectural quality. All six must be considered for a workload to be well-architected — optimizing for one at the expense of another creates a different kind of risk.

**Operational Excellence**: run and monitor systems to deliver business value, and continuously improve processes and procedures. Core concern: can your team operate the system reliably, detect problems quickly, and deploy changes safely?

**Security**: protect data, systems, and assets while delivering business value through risk assessments and mitigation strategies. Core concern: who can access what, and is sensitive data protected at rest and in transit?

**Reliability**: ensure a workload performs its intended function correctly and consistently, and can recover quickly from failures. Core concern: what happens when a component fails, and does the system recover automatically?

**Performance Efficiency**: use computing resources efficiently to meet system requirements, and maintain that efficiency as demand changes. Core concern: are you using the right resource types and sizes for the actual workload?

**Cost Optimization**: deliver business value at the lowest price point. Core concern: are you paying for what you use, using what you pay for, and choosing the right purchasing model?

**Sustainability**: minimize the environmental impact of running cloud workloads. Core concern: are you maximizing utilization, using energy-efficient hardware, and avoiding idle resources?

---

### The Well-Architected Tool and Review Process

The AWS Well-Architected Tool is a free service in the AWS Management Console. You define a workload, answer questions across all six pillars, and the tool generates a prioritized list of findings:

- **High-Risk Issues (HRIs)**: significant gaps that could cause outages, data loss, or security incidents.
- **Medium-Risk Issues (MRIs)**: gaps that represent suboptimal practices with lower immediate risk.
- **Notes and improvements**: recommended actions with links to documentation and AWS services that address each finding.

Reviews should be conducted: when a new workload launches, after major architectural changes, and at least annually for each production workload. AWS Partner Network (APN) Partners certified in the Well-Architected program can conduct formal reviews — useful when you want an independent external assessment.

The tool stores review history, allowing you to track improvement over time and demonstrate remediation to stakeholders and auditors.

---

### Design Principles Across Pillars

Each pillar has specific design principles — prescriptive guidance on how to think about that dimension. Several principles recur across pillars:

**Stop guessing capacity**: provision based on actual load data, use Auto Scaling, and right-size continuously. This appears in both Performance Efficiency and Cost Optimization.

**Test systems at production scale**: use staging environments that mirror production, run load tests, and conduct chaos engineering. Applies to Reliability and Operational Excellence.

**Automate to make architectural experimentation easier**: IaC, CI/CD, and automated testing reduce the cost and risk of change. Appears in Operational Excellence and Reliability.

**Allow for evolutionary architecture**: design for change, not permanence. Use loosely coupled services, abstraction layers, and versioned APIs so the architecture can evolve without complete rebuilds.

**Drive architectures using data**: instrument everything, review metrics, use data to make decisions about scaling, purchasing, and architectural changes.

---

### Well-Architected Lenses

Lenses extend the base framework with additional questions and best practices for specific workload types. AWS provides official Lenses for:

- **Serverless Lens**: Lambda, API Gateway, Step Functions, DynamoDB
- **Container Lens**: ECS, EKS, Fargate
- **SaaS Lens**: multi-tenant architecture, tenant isolation, onboarding, tiering
- **Data Analytics Lens**: data lake, Redshift, EMR, Kinesis, Glue
- **Game Tech Lens**: real-time multiplayer, session management, leaderboards
- **IoT Lens**: device management, message routing, time-series data
- **Machine Learning Lens**: model training, deployment, monitoring, MLOps

Use the base framework for all workloads. Add the relevant lens for the workload's domain. A multi-tenant SaaS platform should use both the base framework and the SaaS Lens — the lens surfaces domain-specific risks (tenant isolation, noisy-neighbor effects, per-tenant metering) that the six base pillars do not ask about directly.

---

## Configuration Reference

### Example: Create a Workload in the Well-Architected Tool (AWS CLI)

```bash
# Create a new workload definition in the Well-Architected Tool
aws wellarchitected create-workload \
  --workload-name "payment-service-prod" \
  --description "Production payment processing service" \
  --review-owner "platform-team@company.com" \
  --environment "PRODUCTION" \
  --aws-regions "us-east-1" "us-west-2" \
  --pillar-priorities \
      "security" \
      "reliability" \
      "operationalExcellence" \
      "performanceEfficiency" \
      "costOptimization" \
      "sustainability" \
  --lenses "wellarchitected" "softwareasaservice"
# environment: PRODU