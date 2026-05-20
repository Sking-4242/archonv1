---
title: "Lab: Build an ASG Behind an ALB"
type: canvas
estimated_minutes: 45
cert_tags: ["aws_saa", "aws_soa"]
---

# Lab: Build an ASG Behind an ALB

## Challenge

In this lab you'll build a horizontally scalable web application: an Application Load Balancer distributing traffic to an Auto Scaling Group of EC2 instances. You'll trigger a scaling event and watch the ASG add instances automatically. This is the fundamental pattern for production web applications on AWS.

## Learning Objectives

- Create a Launch Template with a user data script that installs and starts a web server
- Create an Auto Scaling Group spanning multiple AZs using the launch template
- Create an ALB with a target group pointing to the ASG
- Verify the ALB distributes traffic across multiple instances
- Trigger a scale-out using a manual capacity change and observe the process
- Diagram the full architecture in Archon

## Steps

1. Create a Launch Template: Amazon Linux 2023, t3.micro, security group allowing HTTP from the ALB
2. Add User Data script: `#!/bin/bash\ndnf install -y httpd\nsystemctl start httpd\necho '<h1>Instance: '$(TOKEN=`curl -s -X PUT -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" http://169.254.169.254/latest/api/token` && curl -s -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/instance-id)'</h1>' > /var/www/html/index.html`
3. Create an ALB in a public subnet (at least 2 AZs), listener on port 80, new target group (type: instance)
4. Create ASG using the launch template, min=2, desired=2, max=6, across the same 2+ subnets
5. Attach the ASG to the ALB target group
6. Wait for both instances to pass health checks and appear in the target group
7. Open the ALB DNS name in a browser — refresh to see requests round-robin between instances (different instance IDs)
8. Create a Target Tracking scaling policy: target CPU at 50%
9. Manually change desired capacity to 4 — watch ASG launch 2 more instances and register them with the ALB
10. Open Archon canvas: diagram the full stack — Internet → ALB → Target Group → 2+ AZs → ASG instances

## Archon Canvas Lab

Open the Archon canvas to diagram the architecture you built. Label EC2 instance types, EBS volumes, security group rules, and VPC configuration.
