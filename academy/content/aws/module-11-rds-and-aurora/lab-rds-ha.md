---
title: "Canvas Lab: Highly Available RDS with Read Replica"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "CLF-C02"]
canvas_type: starter
---

# Canvas Lab: Highly Available RDS with Read Replica

## Challenge

A production e-commerce application needs a highly available PostgreSQL database that can handle both transactional writes and read-heavy reporting queries. Design an RDS architecture that achieves HA across AZs, offloads reporting queries from the writer, and includes a Proxy for the Lambda-based API tier. A VPC with public and private subnets has been pre-configured.

## Learning Objectives

- Deploy RDS Multi-AZ for automatic failover and zero-data-loss HA
- Add a Read Replica endpoint for reporting and analytics queries
- Place RDS Proxy between Lambda functions and RDS to manage connection pooling
- Keep all database resources in private subnets with no public access

## Steps

1. In the pre-placed VPC, identify the private subnets in each AZ
2. Create an RDS DB Subnet Group spanning both private subnets
3. Drag an RDS PostgreSQL instance onto the canvas in the primary private subnet, enable Multi-AZ, enable Storage Auto Scaling
4. Connect the standby AZ private subnet to show the Multi-AZ standby placement
5. Add a Read Replica attached to the primary, in the second private subnet
6. Drag an RDS Proxy and attach it to the cluster endpoint (not the read replica)
7. Connect the Lambda function (from the application tier) to the RDS Proxy
8. Connect the reporting service to the Read Replica endpoint directly
9. Annotate security groups: Lambda SG → Proxy SG on port 5432; Proxy SG → RDS SG on port 5432

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.