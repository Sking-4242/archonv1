---
title: "Canvas Lab: Infrastructure as Code with CloudFormation"
type: canvas
estimated_minutes: 20
cert_tags: ["DVA-C02", "SAA-C03"]
canvas_type: open
---

# Canvas Lab: Infrastructure as Code with CloudFormation

## Challenge

Design a CloudFormation stack architecture for a three-tier web application. The architecture should use separate stacks for networking, data, and application layers that share outputs via CloudFormation exports. Document the stack organization, key resources, and how the stacks reference each other.

## Learning Objectives

- Organize resources into stacks by lifecycle (networking changes rarely; application changes frequently)
- Use CloudFormation Outputs and cross-stack references (Fn::ImportValue)
- Apply DeletionPolicy: Retain to stateful resources
- Design Parameters for environment-specific values

## Steps

1. Create a Networking Stack: VPC, subnets, IGW, NAT GWs, route tables — export VpcId, SubnetIds, SecurityGroupIds
2. Create a Data Stack: RDS Multi-AZ with DeletionPolicy: Retain, ElastiCache cluster — import from Networking; export DatabaseEndpoint, CacheEndpoint
3. Create an Application Stack: ECS cluster, task definitions, ALB, ECS service — import from both Networking and Data stacks
4. Add a CodePipeline that deploys the Application Stack on each build (CloudFormation deploy action)
5. Annotate the dependency order: Networking must be deployed first, Data second, Application last
6. Show the Outputs/Exports section of each stack with the values shared downstream
7. Add a change set preview step in the pipeline before deploying the Data stack to prevent accidental destructive changes
8. Note: DeletionPolicy: Retain on RDS ensures data survives if the stack is accidentally deleted

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.