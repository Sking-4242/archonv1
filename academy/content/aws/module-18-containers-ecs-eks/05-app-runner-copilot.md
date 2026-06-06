---
title: "AWS App Runner and AWS Copilot"
type: content
estimated_minutes: 11
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS App Runner and AWS Copilot

## Overview

ECS and EKS provide full control over container orchestration — but that control comes with configuration complexity. Task definitions, service deployments, ALB integrations, VPC networking, IAM roles, CloudFormation templates — a team new to containers can spend weeks on infrastructure before shipping any application code. AWS App Runner and AWS Copilot address this by raising the abstraction level: App Runner eliminates infrastructure configuration entirely for simple containerized web applications, while Copilot makes ECS/Fargate accessible through a developer-friendly CLI that generates all the required infrastructure automatically.

The positioning of these tools on the AWS container spectrum is important. App Runner is the simplest option — deploy from source code or a container image, get an HTTPS endpoint with auto-scaling and zero idle cost. Copilot sits above raw ECS: you still deploy to ECS and Fargate with their full feature set, but Copilot generates and manages the CloudFormation templates, task definitions, and environments through structured CLI commands. Direct ECS or EKS configuration is for teams that need the full control surface: custom placement, blue/green deployments, GPU instances, advanced networking.

For the SAA exam, understand what App Runner provides and when it is appropriate versus ECS/Lambda. SAP adds App Runner VPC integration (private endpoints, outbound VPC connectivity), Copilot pipeline integration, and the graduation path from App Runner to ECS. After this lesson, you will be able to select the right container abstraction layer for a team's operational maturity and workload requirements.

---

## Core Concepts

### AWS App Runner

App Runner is a fully managed service for running containerized web applications and APIs. It accepts either a container image (from ECR or a public registry) or source code directly from a GitHub or Bitbucket repository. For source deployments, App Runner builds the container using a runtime-specific build process and deploys it automatically.

What App Runner manages automatically (that ECS does not):
- **Build pipeline**: for source deployments, builds the container on each push to the connected repository branch
- **Load balancing**: traffic is automatically distributed across multiple instances
- **HTTPS endpoint**: App Runner provisions an SSL certificate and provides a public HTTPS URL with no ACM or Route 53 configuration
- **Auto-scaling**: scales out instances based on request volume and scales to zero when idle (no traffic = no cost)
- **Health checks and restarts**: monitors instance health and restarts unhealthy instances

App Runner supports VPC connectivity — you can configure App Runner to connect to private VPC resources (RDS, ElastiCache, internal services) via a VPC connector, giving it access to resources not exposed to the public internet.

**App Runner vs. Lambda**: both can run event-driven, stateless HTTP workloads. The key differences: App Runner runs container images (arbitrary runtimes, custom OS packages, larger dependencies); Lambda has more restrictive runtime constraints but has deeper event-source integrations (SQS, DynamoDB Streams, S3). App Runner is HTTP-only (request/response); Lambda supports any event source. For containerized HTTP APIs that don't fit Lambda constraints, App Runner is the right choice.

---

### AWS Elastic Beanstalk Comparison

Elastic Beanstalk is often mentioned alongside App Runner. The key distinction: Beanstalk provisions and manages EC2 instances, Auto Scaling Groups, and load balancers — you always have at least one running EC2 instance, even at zero traffic. App Runner scales to zero — no instances run when there is no traffic, and you pay nothing for idle time.

Beanstalk is appropriate for: workloads that cannot tolerate the latency of scaling from zero, applications requiring specific EC2 instance types (memory-optimized, GPU), and teams with existing Beanstalk deployments that are not worth migrating. App Runner is appropriate for: modern containerized applications, teams prioritizing operational simplicity, and workloads tolerant of brief scaling latency from zero.

---

### AWS Copilot

Copilot is an open-source CLI tool (not a managed AWS service) that simplifies deploying containerized applications to ECS and Fargate. Copilot introduces three organizing concepts:

**Application**: a group of related services sharing a name and environment configuration (e.g., `my-ecommerce-app`).

**Environment**: a deployment target — typically `test`, `staging`, and `production`. Each environment gets its own VPC, ECS cluster, and isolated resources. Promoting a release from staging to production is a single Copilot command.

**Service**: a containerized workload within the application — a Load Balanced Web Service (public-facing API behind an ALB), a Backend Service (internal service, no public endpoint), or a Worker Service (SQS consumer).

When you run `copilot svc deploy`, Copilot: builds the container image, pushes it to ECR, updates the ECS task definition, and updates the ECS service — a complete end-to-end deploy in one command. Copilot generates and manages CloudFormation stacks for all resources it creates, and the generated CloudFormation is visible and customizable via `copilot svc override`.

Copilot is a starting point and developer productivity tool. As teams grow and require custom configurations beyond Copilot's abstractions, they typically adopt the underlying CloudFormation or CDK directly, potentially keeping Copilot for simpler services while managing complex ones directly.

---

### The Container Abstraction Spectrum

From highest abstraction to lowest:

| Service | Who manages infrastructure | Best for |
|---|---|---|
| App Runner | AWS manages everything | Teams wanting zero infrastructure config, simple HTTP APIs |
| Copilot | AWS manages via generated CloudFormation | Teams wanting ECS power with developer-friendly CLI |
| ECS + Fargate | Team manages task defs, services, ALB | Teams needing full ECS control (blue/green, custom scaling) |
| EKS + Fargate | Team manages Kubernetes resources | Teams with Kubernetes expertise, K8s ecosystem needs |
| ECS/EKS + EC2 | Team manages nodes + orchestration | Dense workloads, GPUs, Reserved Instance savings |

The common graduation path: App Runner → ECS + Copilot → ECS/EKS directly.

---

## Configuration Reference

### Deploying to App Runner

```bash
# Deploy a containerized API from an ECR image
aws apprunner create-service \
  --service-name prod-api \
  --source-configuration '{
    "ImageRepository": {
      "ImageIdentifier": "123456789012.dkr.ecr.us-east-1.amazonaws.com/my-api:v1.2.3",
      "ImageRepositoryType": "ECR",
      "ImageConfiguration": {
        "Port": "8080",
        "RuntimeEnvironmentVariables": {
          "ENV": "production"
        }
      }
    },
    "AutoDeploymentsEnabled": true
  }' \
  --instance-configuration '{
    "Cpu": "1 vCPU",
    "Memory": "2 GB",
    "InstanceRoleArn": "arn:aws:iam::123456789012:role/AppRunnerInstanceRole"
  }' \
  --health-check-configuration '{
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 20,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 5
  }' \
  --region us-east-1

# Connect App Runner to a VPC for private resource access (RDS, ElastiCache)
aws apprunner create-vpc-connector \
  --vpc-connector-name prod-vpc-connector \
  --subnets subnet-0private1 subnet-0private2 \
