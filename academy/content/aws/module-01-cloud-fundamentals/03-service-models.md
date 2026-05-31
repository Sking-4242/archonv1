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

## Examples

A small digital agency building client websites represents a straightforward PaaS use case. Their developers push code to AWS Elastic Beanstalk and let AWS handle the rest — provisioning EC2 instances, configuring load balancers, running health checks, and swapping in new versions with zero downtime. The agency has no sysadmin on staff and no interest in learning Linux administration. PaaS gives them a production-grade deployment pipeline without the operational overhead of IaaS, and they're productive on day one.

A financial services company migrating a legacy risk-calculation platform illustrates why IaaS is sometimes the right answer even when more managed options exist. Their platform runs on a custom-compiled version of a Linux kernel with specific memory settings and security modules that no PaaS environment supports. They lift the system to EC2, maintaining full control over the OS and configuration, and accept the operational burden in exchange for the flexibility to run software that could not exist in a PaaS or SaaS model. The migration saves them data center costs without requiring an expensive rewrite.

Consider a company evaluating whether to build their own video conferencing tool versus buying Zoom (SaaS). Building it themselves on IaaS or PaaS would require months of engineering, ongoing maintenance, global CDN infrastructure, and real-time protocol expertise. Zoom — which itself runs on AWS — handles all of that and delivers the finished product for a monthly per-seat fee. The company's competitive advantage is not video conferencing software, so SaaS is the obvious choice. The insight here is that the right service model depends on whether the capability is differentiating for your business.

## Think About It

1. AWS Lambda is often described as "serverless," but it's actually PaaS — you deploy code and AWS manages the execution environment. Why do you think AWS markets it differently from Elastic Beanstalk, even though both are PaaS? What does the distinction reveal about how customers think about operational responsibility?

2. If a company uses Amazon RDS (managed database), they don't patch the database engine — AWS does. But if there's a data breach because of a misconfigured security group (their responsibility), who is liable? How does the service model affect your security posture, not just your operational burden?

3. As you move from IaaS to PaaS to SaaS, you gain convenience but lose customization. Describe a scenario where a company started with SaaS, hit a wall because of customization limits, and had to move back toward IaaS or PaaS. What does this "reverse migration" cost?

4. Many organizations run all three models simultaneously — EC2 for legacy apps (IaaS), Lambda for new microservices (PaaS), and Salesforce for CRM (SaaS). What governance and security challenges does this multi-model reality create that a purely IaaS shop wouldn't face?

5. The shared responsibility model says security is "in" the cloud versus "of" the cloud. How does that division shift as you move from EC2 (IaaS) to RDS (PaaS) to WorkMail (SaaS)? Which model gives the customer the smallest attack surface to manage?

## Quick Check

**Q1.** A company deploys their application to Amazon EC2 and is responsible for patching the operating system. Which service model does this represent?
- A) SaaS
- B) PaaS
- C) IaaS
- D) FaaS

**Answer: C** — EC2 is IaaS: AWS manages the physical infrastructure and hypervisor, but the customer is responsible for the operating system and everything above it, including patching.

**Q2.** Which of the following best describes the customer's responsibility when using a SaaS product?
- A) Managing the operating system and runtime
- B) Managing application code and deployment
- C) Managing data (and sometimes user configuration)
- D) Managing physical servers and networking

**Answer: C** — With SaaS, the provider manages everything from infrastructure through the application itself. The customer typically only controls their own data and user-level settings.

**Q3.** AWS Elastic Beanstalk and AWS Lambda are both examples of which service model?
- A) IaaS
- B) PaaS
- C) SaaS
- D) DaaS

**Answer: B** — Both are PaaS: developers deploy code (or functions), and AWS manages the underlying infrastructure, OS, runtime, and scaling, freeing developers from operational tasks.

## What's Next

Next, we cover cloud deployment models: public cloud, private cloud, hybrid cloud, and community cloud — and when each applies.
