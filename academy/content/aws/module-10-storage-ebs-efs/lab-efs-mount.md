---
title: "Canvas Lab: Shared EFS Mount Across Multiple EC2 Instances"
type: canvas
estimated_minutes: 20
cert_tags: ["SAA-C03", "CLF-C02"]
canvas_type: starter
---

# Canvas Lab: Shared EFS Mount Across Multiple EC2 Instances

## Challenge

A web application tier needs a shared file system so multiple EC2 instances can read and write the same uploads directory. A VPC with two public subnets in different AZs has been pre-configured. Design the EFS filesystem, mount targets, and security group rules that allow all EC2 instances in the web tier to mount and share the filesystem. Ensure traffic between EC2 instances and the EFS mount targets is encrypted in transit.

## Learning Objectives

- Create an EFS filesystem with Elastic Throughput and Intelligent Tiering enabled
- Create mount targets in each AZ where EC2 instances run
- Configure security groups so EC2 instances can reach EFS on port 2049
- Mount EFS on EC2 instances using the EFS mount helper with TLS enabled

## Steps

1. In the pre-placed VPC, identify the two public subnets and their AZs
2. Drag an EFS Filesystem onto the canvas, enable Elastic Throughput, enable Intelligent Tiering lifecycle (30 days)
3. Create an EFS Security Group that allows inbound NFS (port 2049) from the EC2 security group
4. Add EFS Mount Targets in each of the two subnets, attached to the EFS Security Group
5. Connect two EC2 instances (one per AZ) to the EFS filesystem via the mount targets
6. Annotate the connection with the mount command: `mount -t efs -o tls,iam fs-XXXXX:/ /mnt/efs`
7. Add an IAM Instance Profile granting the EC2 instances `elasticfilesystem:ClientMount` permission

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.