---
title: "Amazon ECS"
type: content
estimated_minutes: 20
cert_tags: ["SAA-C03", "SOA-C03", "SCS-C03"]
---

# Amazon ECS

## Overview

Amazon Elastic Container Service (ECS) is a fully managed container orchestration service that runs and scales Docker containers on AWS. You package an application as a container image, describe how to run it, and ECS places and manages the containers — handling scheduling, health, deployment, and scaling. This *service reference* lesson covers the ECS object model, the EC2 vs. Fargate launch types, networking and IAM, deployments, and what each certification expects.

ECS matters because containers are the dominant way to package modern applications, and ECS is AWS's native, deeply integrated orchestrator — simpler to operate than self-managed Kubernetes while integrating directly with IAM, ELB, CloudWatch, VPC networking, and ECR. The central mental model is a hierarchy: a **task definition** describes one or more containers (the blueprint); a **task** is a running instance of that definition; a **service** keeps a desired number of tasks running, replaces unhealthy ones, and integrates with load balancing; and all of this runs on a **cluster** whose capacity comes from EC2 instances you manage or from serverless **Fargate**.

---

## How It Works

- **Task definition** — a versioned blueprint specifying container image(s), CPU/memory (at the task and container level), port mappings, environment variables and secrets, the IAM **task role** and **execution role**, the logging driver, volumes, and the network mode.
- **Task** — one running set of containers launched from a task definition; tasks are ephemeral and replaced rather than patched.
- **Service** — maintains a desired task count, registers/deregisters tasks with a load balancer target group, replaces failed tasks, and runs controlled deployments (rolling or blue/green).
- **Cluster** — the logical grouping and the capacity pool (EC2 capacity providers or Fargate).

The defining choice is the **launch type**:

- **Fargate** — serverless: AWS runs the containers with no EC2 hosts to provision, patch, scale, or secure at the OS level. You specify task CPU/memory and pay per task. Best for most workloads wanting minimal operational overhead; **Fargate Spot** cuts cost for interruption-tolerant tasks.
- **EC2** — you run and manage a fleet of container-host instances, giving control over instance types (GPU, ARM, specialized), bin-packing many tasks per host for cost efficiency, and host-level customization, at the cost of managing and patching those hosts.

---

## Key Features

- **Task role vs. execution role.** The **task role** grants the *application's containers* least-privilege permissions to AWS APIs; the **execution role** lets the *ECS agent* pull images from ECR, fetch secrets, and write logs. Confusing the two is a classic mistake.
- **awsvpc network mode** gives each task its own ENI, private IP, and **security group** — first-class VPC networking and task-level isolation (the default and recommended mode, required on Fargate).
- **Service Auto Scaling** (via Application Auto Scaling) adjusts task count on CloudWatch metrics or target tracking; **capacity providers** scale the EC2 cluster.
- **Deployments** — rolling update with min/max healthy percentages, or **blue/green** via CodeDeploy with instant rollback; **circuit breaker** auto-rolls-back failed deployments.
- **Service discovery / Service Connect** for service-to-service communication and load balancing inside the cluster.
- **Secrets injection** from Secrets Manager/SSM Parameter Store as environment variables.

---

## Configuration Reference

- **Choose Fargate** unless you specifically need EC2-level control (GPUs, custom AMIs, maximum bin-packing density).
- **Assign a least-privilege task role per service**; never bake credentials into images.
- **Use awsvpc mode** with task-level security groups for isolation; place tasks in private subnets.
- **Configure logging** with the `awslogs` driver to CloudWatch Logs or **FireLens** to route logs to other destinations.
- **Pull images from Amazon ECR**, with the execution role granting registry and KMS (for encrypted images/secrets) access.

---

## Operations and Troubleshooting

- **Tasks won't start or keep restarting.** Common causes: the **execution role** can't pull the image or read a secret, insufficient cluster capacity (EC2) or **subnet IP exhaustion** (awsvpc tasks each consume an IP), failing **container/ELB health checks**, a too-short health-check grace period, or a bad port mapping. Read **stopped-task reasons** and **service events** for the specific cause.
- **Monitoring.** CloudWatch **Container Insights** provides task/service CPU, memory, and network metrics plus logs; service events explain placement and scaling decisions.
- **Scaling not happening.** Verify the Application Auto Scaling target/policy, the CloudWatch metric, cooldowns, and (EC2) that capacity providers can add hosts.
- **Security findings.** Scan images for CVEs with **Amazon Inspector** (ECR enhanced scanning) and detect runtime threats with **GuardDuty Runtime Monitoring**.

---

## Integrations

ECS integrates with **Amazon ECR** (image registry), **Elastic Load Balancing** (ALB/NLB target registration), **IAM** (task/execution roles), **VPC** (awsvpc networking and security groups), **CloudWatch** (Container Insights and logs), **Secrets Manager/Parameter Store** (secret injection), **Fargate** (serverless capacity), **EFS** (persistent volumes via the EFS integration), and **CodeDeploy** (blue/green). For Kubernetes-specific needs, the sibling service is **Amazon EKS**.

---

## Pricing and Cost Considerations

ECS itself has no additional charge — you pay for the underlying capacity. With **Fargate**, you pay per task for the **vCPU and memory** provisioned for the time it runs (per-second, one-minute minimum), with **Fargate Spot** offering deep discounts for interruption-tolerant tasks. With the **EC2** launch type, you pay for the EC2 instances and can reduce unit cost by bin-packing many tasks per host and using Spot/Savings Plans. The trade-off is operational simplicity (Fargate, no host management) versus potentially lower unit cost at scale with well-utilized EC2 hosts. Exact prices vary by Region and configuration.

---

## Exam Relevance

**SAA-C03:** Know the ECS object model, Fargate vs. EC2 launch types and when to choose each, ALB/NLB integration, task roles, and awsvpc networking. Design depth.

**SOA-C03:** Operate services — Application Auto Scaling, rolling vs. blue/green deployments and the circuit breaker, Container Insights, and diagnosing stopped tasks. Operations depth.

**SCS-C03:** Secure containers — least-privilege task roles (and the task-vs-execution-role distinction), awsvpc isolation with task security groups, secrets injection, ECR image scanning with Inspector, and GuardDuty runtime monitoring. Security depth.

---

## Summary

Amazon ECS orchestrates Docker containers using task definitions, tasks, services, and clusters, with capacity from serverless Fargate (no hosts to manage; Spot available) or self-managed EC2 (control and bin-packing efficiency). Security comes from per-task IAM roles (distinct from the execution role), awsvpc networking with task-level security groups, and secrets injection; scaling from Application Auto Scaling and capacity providers; deployments from rolling/blue-green with a circuit breaker; and observability from Container Insights. Diagnosing failed tasks via stopped-task reasons (image pull, IP/capacity exhaustion, health checks) and the task-vs-execution-role distinction are the recurring exam points. ECS is AWS's native container orchestrator; EKS is the managed-Kubernetes alternative.

---

## Quick Check

1. Put these in order from blueprint to capacity pool: cluster, task, task definition, service.
2. What is the difference between the ECS task role and the execution role, and which one your application uses to call DynamoDB?
3. When would you choose the EC2 launch type over Fargate?
4. What does awsvpc network mode give each task, and what subnet resource can it exhaust?
5. Which services scan container images for vulnerabilities and detect runtime threats?

---

## What's Next

Pair this with **Amazon EKS** (the Kubernetes alternative), **Elastic Load Balancing**, **AWS Secrets Manager**, and **Amazon Inspector**. For deployment automation, see the SOA-C03 operations lessons.
