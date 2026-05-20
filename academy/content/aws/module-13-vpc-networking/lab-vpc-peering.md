---
title: "Canvas Lab: Multi-VPC Peering and Route Configuration"
type: canvas
estimated_minutes: 20
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: open
---

# Canvas Lab: Multi-VPC Peering and Route Configuration

## Challenge

Your organization runs three VPCs: a Production VPC (10.1.0.0/16), a Shared Services VPC with centralized tools like logging and monitoring (10.2.0.0/16), and a Dev VPC (10.3.0.0/16). Production and Dev must both access Shared Services, but Production and Dev must NOT be able to communicate with each other. Design the VPC peering configuration, route tables, and security groups to enforce this topology.

## Learning Objectives

- Configure VPC peering connections to allow the required communication paths
- Update route tables in each VPC to route traffic over the correct peering connection
- Demonstrate understanding of peering non-transitivity to enforce the isolation requirement
- Explain why Transit Gateway would be a better solution if the number of VPCs grows significantly

## Steps

1. Create a VPC Peering connection between Production VPC and Shared Services VPC
2. Create a VPC Peering connection between Dev VPC and Shared Services VPC
3. Do NOT create a peering between Production and Dev — annotate why this is correct (non-transitive, and isolation requirement)
4. Add route table entries in Production VPC: 10.2.0.0/16 → peering-prod-shared
5. Add route table entries in Shared Services VPC: 10.1.0.0/16 → peering-prod-shared; 10.3.0.0/16 → peering-dev-shared
6. Add route table entries in Dev VPC: 10.2.0.0/16 → peering-dev-shared
7. Add a security group on the Shared Services resources allowing access from both 10.1.0.0/16 and 10.3.0.0/16
8. Annotate the canvas: explain what would happen if a Dev instance tried to ping a Production instance and why it fails

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.