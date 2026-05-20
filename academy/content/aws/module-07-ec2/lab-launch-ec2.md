---
title: "Lab: Launch and Connect to an EC2 Instance"
type: canvas
estimated_minutes: 30
cert_tags: ["aws_ccp", "aws_saa"]
---

# Lab: Launch and Connect to an EC2 Instance

## Challenge

In this lab you'll launch a t3.micro EC2 instance running Amazon Linux 2023, connect to it using SSH (and optionally via Session Manager), and explore the EC2 console. You'll also diagram the networking components in Archon.

## Learning Objectives

- Launch an EC2 instance with a custom security group
- Connect to the instance via SSH using a key pair
- Connect via Systems Manager Session Manager (no SSH key required)
- Diagram the VPC, subnet, security group, and EC2 instance in Archon

## Steps

1. In EC2 → Launch Instance: name it 'web-server-1', choose Amazon Linux 2023 AMI, t3.micro instance type
2. Create a new key pair named 'lab-key', download the .pem file (store it safely)
3. In Security Group settings: allow SSH (port 22) from your IP only, and allow HTTP (port 80) from anywhere
4. Launch the instance and wait for it to reach 'running' state
5. Connect using SSH: `ssh -i lab-key.pem ec2-user@<public-IP>`
6. Run `sudo dnf update -y` and `sudo dnf install -y httpd` then `sudo systemctl start httpd`
7. Visit the instance's public IP in a browser — you should see the Apache test page
8. In EC2 → Connect → Session Manager tab: click Connect (requires SSM Agent, pre-installed on AL2023)
9. In the Session Manager terminal, run `whoami` and `curl http://169.254.169.254/latest/meta-data/instance-id`
10. Open Archon canvas: diagram VPC → Public Subnet → EC2 instance, with Security Group rules shown and IGW connecting to the internet

## Archon Canvas Lab

Open the Archon canvas to diagram the architecture you built. Label EC2 instance types, EBS volumes, security group rules, and VPC configuration.
