---
title: "AWS Pricing Model"
type: content
estimated_minutes: 7
cert_tags: ["aws_ccp"]
---

# AWS Pricing Model

## Overview

AWS pricing is based on three fundamental principles: pay for what you use, pay less when you reserve, and pay less when AWS grows. These principles underpin every pricing model across all AWS services, from the most basic S3 storage to the most complex machine learning services.

Understanding these principles — and the specific pricing dimensions of compute, storage, and data transfer — is a core CCP exam topic and essential for real-world cost management.

## The Three Pricing Fundamentals

**Pay for what you use:** You're billed for exactly the resources you consume, with no minimum fees (for most services). An EC2 instance running for 30 minutes costs exactly half of one hour's rate. An S3 bucket with no objects stored costs nothing for storage (though API calls have minimal fees).

**Pay less when you reserve:** Committing to use a resource for one or three years (Reserved Instances, Savings Plans) yields discounts of 30–72% compared to on-demand pricing. The trade-off is commitment — you pay for the reservation whether you use it or not.

**Pay less as AWS grows:** AWS's economies of scale are passed on to customers through price reductions. AWS has lowered prices over 100 times since 2006. As compute hardware gets cheaper and AWS becomes more efficient, costs decrease over time — a rare arrangement where your costs may drop without any action on your part.

## The Three Pillars of AWS Costs

Most AWS bills can be explained by three cost dimensions:

**Compute:** Priced per hour or per second (EC2, Lambda, Fargate, ECS). The rate depends on instance type, Region, and pricing model. Lambda is priced per request and per GB-second of execution.

**Storage:** Priced per GB per month (S3, EBS, EFS, Glacier). Different storage classes have different rates. EBS is priced by provisioned capacity, not used capacity — you pay for the volume size you requested.

**Data transfer out:** Data transferred from AWS to the internet (or between Regions) is charged per GB. Data transferred into AWS (inbound) is typically free. Data transfer within a Region between AZs has a small per-GB charge. This is why architects keep compute and data in the same Region and minimize cross-Region traffic.

## AWS Pricing Calculator

The AWS Pricing Calculator (calculator.aws) lets you estimate the cost of a specific architecture before building it. You add services, configure them with your expected usage, and get a monthly estimate.

The calculator is useful for: pre-project budgeting, comparing architecture options by cost, producing TCO analyses, and creating cost estimates for stakeholder presentations. It's also a great learning tool — exploring the pricing configuration of each service teaches you what drives cost for that service.

For the CCP exam, you don't need to memorize specific prices (they change). You do need to understand the pricing model (on-demand vs. reserved vs. spot), what dimensions drive cost (compute hours, storage GB, data transfer GB), and what tools are available for cost management.

## Summary

AWS pricing is built on three principles: pay for what you use, pay less when you reserve, and pay less as AWS grows. The three main cost drivers are compute (per hour/second), storage (per GB/month), and data transfer out (per GB). Use the AWS Pricing Calculator to estimate costs before building, and use Cost Explorer to understand costs after building.

## What's Next

Next: The AWS Free Tier — what's included, for how long, and how to use it to learn AWS without incurring charges.
