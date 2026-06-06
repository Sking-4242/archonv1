---
title: "Canvas Lab: Deploy a Containerized Application on ECS Fargate with an ALB"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: Deploy a Containerized Application on ECS Fargate with an ALB

## Challenge

A development team has a Docker image stored in ECR and needs to run it on Fargate behind an Application Load Balancer for high availability across two Availability Zones. No EC2 instances should be managed. You will configure the ECS task definition, create a service with a desired count of 2, wire up the ALB target group, and verify that traffic is load-balanced and that ECS automatically replaces stopped tasks.

## Learning Objectives

- Create an ECS cluster and Fargate task definition with CPU, memory, and logging configured
- Configure an ECS service with a desired count of 2 spread across two Availability Zones
- Attach an ALB target group (type IP) to the ECS service for load balancing
- Configure security groups so that only the ALB can reach the Fargate tasks directly
- Verify container health checks, ALB routing, and ECS self-healing behavior

## Steps

1. In ECR, create a repository named `webapp`; authenticate Docker and push the nginx image: `docker pull nginx:latest && docker tag nginx:latest <account>.dkr.ecr.<region>.amazonaws.com/webapp:latest && docker push <account>.dkr.ecr.<region>.amazonaws.com/webapp:latest`
2. In the ECS console, create a cluster named `webapp-cluster` using the **AWS Fargate** infrastructure option (no EC2 instances)
3. Create a task definition named `webapp-task`: launch type **Fargate**, OS/architecture **Linux/X86_64**, CPU **0.5 vCPU**, memory **1 GB**
4. Add a container named `webapp`: image URI from ECR, port mapping **80/tcp**; under **Logging**, enable **awslogs** driver with log group `/ecs/webapp` (create the log group if it does not exist)
5. In the EC2 console, create a security group `alb-sg` in your VPC: inbound rule allowing **HTTP port 80** from `0.0.0.0/0`
6. Create a second security group `task-sg`: inbound rule allowing **port 80** from **source `alb-sg`** only (no direct internet access to tasks)
7. Create an Application Load Balancer named `webapp-alb` in the **public subnets** of two AZs; assign `alb-sg`; create a listener on port 80
8. Create a target group named `webapp-tg`: target type **IP**, protocol **HTTP**, port **80**; set the health check path to `/`
9. Attach the target group to the ALB listener as the default action (forward to `webapp-tg`)
10. In ECS, create a service on the `webapp-cluster`: launch type **Fargate**, task definition `webapp-task`, desired count **2**; under **Networking**, select the **private subnets** of two AZs and assign `task-sg`
11. Under **Load balancing**, select the ALB `webapp-alb`, container `webapp` port 80, and target group `webapp-tg`
12. Create the service and wait for both tasks to reach **RUNNING** status (this takes 1-2 minutes)
13. Copy the ALB DNS name from the EC2 console and open it in a browser — you should see the nginx welcome page
14. In the ECS console, select one running task and choose **Stop**; watch the service event log and confirm ECS automatically launches a replacement task to maintain the desired count of 2

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
