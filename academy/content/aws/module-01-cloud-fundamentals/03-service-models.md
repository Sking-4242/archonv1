---
title: "IaaS, PaaS, and SaaS"
type: content
estimated_minutes: 8
cert_tags: ["aws_ccp"]
---

# IaaS, PaaS, and SaaS

## Overview

Cloud services are delivered in three fundamental models, each representing a different division of responsibility between the cloud provider and the customer. Understanding these models is essential for the Cloud Practitioner exam and for making architectural decisions about which AWS services to use for a given problem.

The three models are Infrastructure as a Service (IaaS), Platform as a Service (PaaS), and Software as a Service (SaaS). They exist on a spectrum — at one end, you manage everything; at the other, you consume a finished product. The further you move toward SaaS, the less you manage but also the less you can customize.

## Infrastructure as a Service (IaaS)

IaaS provides virtualized computing resources over the internet. The provider manages the physical infrastructure (hardware, networking, data center), and you manage everything above the hypervisor: operating systems, middleware, runtime, data, and applications.

**AWS IaaS examples:** Amazon EC2 (virtual machines), Amazon EBS (block storage), Amazon VPC (virtual networking), Amazon S3 (object storage — technically fits here, though it's a managed API).

IaaS gives you maximum flexibility and control. You choose your operating system, patch it yourself, configure the networking, and decide how the application is deployed. The trade-off is operational burden — you're responsible for OS updates, security hardening, and availability. IaaS is ideal for lift-and-shift migrations, custom software stacks, and workloads that require specific OS configurations.

## Platform as a Service (PaaS)

PaaS provides a platform — a managed environment where developers deploy applications without managing the underlying infrastructure. The provider handles the OS, runtime, middleware, and scaling. You manage only your application code and data.

**AWS PaaS examples:** AWS Elastic Beanstalk (deploy code, AWS handles EC2/scaling/load balancing), AWS Lambda (deploy functions, AWS handles the execution environment), Amazon RDS (managed database — you manage schema and queries, AWS manages the engine, patching, and backups), AWS Amplify (front-end hosting with managed CI/CD).

PaaS reduces operational overhead dramatically. Developers focus on writing code, not managing servers. The trade-off is reduced flexibility — you're constrained to the runtimes and configurations the platform supports. PaaS is ideal for web application development, microservices, and teams that want to move fast without deep infrastructure expertise.

## Software as a Service (SaaS)

SaaS delivers a fully functional application over the internet. The provider manages everything — infrastructure, platform, and the application itself. You consume the service through a web browser or API.

**AWS SaaS-delivered products:** Amazon WorkMail (email), Amazon Chime (video conferencing), AWS Marketplace SaaS listings. Many third-party SaaS products (Salesforce, Slack, Zoom) run on AWS infrastructure, though their customers don't interact with AWS directly.

SaaS requires no deployment, no management, and no infrastructure knowledge. Users sign up and start using the product. The trade-off is maximum constraint — you use the software as designed, with limited customization options. SaaS is ideal for commodity functions (email, CRM, HR) where differentiation comes from how you use the tool, not the tool itself.

## Shared Responsibility at Each Layer

The service model you choose determines what you're responsible for securing and managing. A useful mental model is the "managed stack" spectrum:

**IaaS:** You manage OS, middleware, runtime, apps, data. Provider manages hypervisor, network, physical.
**PaaS:** You manage apps and data. Provider manages OS through physical.
**SaaS:** You manage data (sometimes). Provider manages everything else.

This layering maps directly to the AWS Shared Responsibility Model, which we cover in Module 5. Understanding it at this level means you can quickly identify what falls in your security perimeter for any given AWS service.

## Summary

IaaS, PaaS, and SaaS represent increasing levels of abstraction and decreasing levels of management responsibility. EC2 is IaaS — you manage the OS and above. Lambda and RDS are PaaS — you manage only code and data. SaaS products like WorkMail deliver finished applications. Choosing the right model means balancing control against operational overhead. On the CCP exam, you'll often be asked to classify AWS services into these categories.

## What's Next

Next, we cover cloud deployment models: public cloud, private cloud, hybrid cloud, and community cloud — and when each applies.
