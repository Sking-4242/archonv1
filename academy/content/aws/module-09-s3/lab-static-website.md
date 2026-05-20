---
title: "Canvas Lab: S3 Static Website with CloudFront"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "CLF-C02"]
canvas_type: open
---

# Canvas Lab: S3 Static Website with CloudFront

## Challenge

Your team is launching a marketing site that must serve static assets globally with low latency. Design a complete static hosting architecture on AWS: an S3 bucket for content storage and a CloudFront distribution for global delivery. Configure the architecture so the bucket is not publicly accessible — all traffic must flow through CloudFront using an Origin Access Control (OAC) policy.

## Learning Objectives

- Create an S3 bucket for website content with Block Public Access fully enabled
- Attach a CloudFront distribution with an Origin Access Control and a bucket policy that allows only CloudFront to read from S3
- Configure a default root object and custom error page on the CloudFront distribution
- Add a Route 53 alias record pointing a custom domain to the CloudFront distribution
- Explain how you would enable CloudFront caching behavior differences between HTML (short TTL) and static assets (long TTL)

## Steps

1. Drag an S3 bucket onto the canvas and set Block Public Access to fully enabled
2. Drag a CloudFront Distribution and connect it to the S3 bucket as the origin
3. Configure an Origin Access Control on the CloudFront → S3 connection
4. Add a Bucket Policy to the S3 bucket granting CloudFront OAC read access
5. Drag a Route 53 Hosted Zone and Alias Record pointing to the CloudFront distribution
6. Add a Certificate Manager (ACM) certificate attached to the CloudFront distribution (us-east-1 region)
7. Annotate your cache behaviors: short TTL for index.html, long TTL for /assets/*

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.