---
title: "Lab: Explore the AWS Infrastructure Map"
type: canvas
estimated_minutes: 15
cert_tags: ["aws_ccp"]
---

# Lab: Explore the AWS Infrastructure Map

## Challenge

In this lab you'll explore the AWS global infrastructure through the AWS console and the interactive infrastructure map. You'll check service availability by region and diagram a simple multi-region architecture in Archon.

## Learning Objectives

- Navigate the AWS global infrastructure map and identify all Regions and AZs
- Check which services are available in at least three different Regions
- Understand the difference between Regions, AZs, and Edge Locations
- Diagram a two-region, multi-AZ architecture in the Archon canvas

## Steps

1. Go to aws.amazon.com/about-aws/global-infrastructure/ and explore the interactive map
2. Count the number of Regions, AZs, and Edge Locations currently listed
3. In the AWS Console, change the Region dropdown (top right) to three different Regions and note which services appear/disappear
4. Go to aws.amazon.com/about-aws/global-infrastructure/regional-product-services/ and find a service available in us-east-1 but not in a smaller Region
5. In the AWS Console (any Region), go to EC2 → Availability Zones and list the AZs in your selected Region
6. Open the Archon canvas and build a diagram showing: two Regions, two AZs per Region, with a sample EC2 instance in each AZ and CloudFront at the edge

## Archon Canvas Lab

Open the Archon canvas to diagram the architecture you built or will build in this lab. Use the Archon component library to place and connect AWS services. Label each resource with its configuration details.
