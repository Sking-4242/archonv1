---
title: "Canvas Lab: Build a Three-Tier VPC"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "CLF-C02"]
canvas_type: starter
---

# Canvas Lab: Build a Three-Tier VPC

## Challenge

A pre-configured VPC shell (10.0.0.0/16) exists with no subnets, no gateways, and no routing. Design and build a production-ready three-tier VPC with public subnets (load balancers), private app subnets (application servers), and private data subnets (database). Deploy the architecture across two AZs. All outbound internet access from private subnets must flow through NAT Gateways.

## Learning Objectives

- Create subnets in two AZs for each of the three tiers (6 subnets total)
- Configure an Internet Gateway for public subnet internet access
- Deploy NAT Gateways in each public subnet for private subnet egress
- Configure route tables correctly for each subnet tier
- Apply appropriate security groups for each tier using security group chaining

## Steps

1. Open the pre-placed VPC (10.0.0.0/16) and plan the subnet CIDRs: Public AZ-A /24, Public AZ-B /24, App AZ-A /22, App AZ-B /22, Data AZ-A /24, Data AZ-B /24
2. Create the 6 subnets with the appropriate CIDRs and AZ assignments
3. Attach an Internet Gateway to the VPC
4. Create a Public Route Table: add route 0.0.0.0/0 → IGW, associate both public subnets
5. Drag two NAT Gateways onto the canvas — one in each public subnet (each with an Elastic IP)
6. Create two Private Route Tables (one per AZ): add route 0.0.0.0/0 → NAT GW in the same AZ, associate the App and Data subnets in that AZ
7. Create three Security Groups: ALB-SG (allow 443 from 0.0.0.0/0), App-SG (allow 8080 from ALB-SG), DB-SG (allow 5432 from App-SG)
8. Drag representative resources: ALB in public subnets, EC2 Auto Scaling Group in app subnets, RDS in data subnets
9. Verify: App subnets have no direct route to IGW; Data subnets have only local route and NAT route

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.