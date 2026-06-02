---
title: "IaaS, PaaS, and SaaS"
type: content
estimated_minutes: 18
cert_tags: ["aws_ccp", "clf-c02"]
---

# IaaS, PaaS, and SaaS

## Overview

Cloud services come in three fundamental models, and each one represents a different answer to the same question: how much of the technology stack do you want to manage yourself? Infrastructure as a Service (IaaS) gives you the most control and the most operational responsibility. Software as a Service (SaaS) gives you the least of both. Platform as a Service (PaaS) sits between them — abstracting away the infrastructure layer without locking you out of the application layer. Understanding these three models is not an academic exercise: the model you choose directly determines which AWS services you'll use, what your security responsibilities are, how large your operations team needs to be, and how fast you can ship.

The three service models exist because different customers have genuinely different needs. A team of experienced infrastructure engineers building a custom application with unusual requirements needs IaaS — they want full control over the operating system, networking stack, exact software versions, and kernel configuration. A small startup that wants to deploy a web application without hiring a dedicated operations engineer needs PaaS — they want to push code and have it run, without caring what Linux version is underneath. A business that needs email, CRM, or video conferencing doesn't want to build or operate that software at all — they need SaaS, where a fully functional, maintained application is delivered ready to use over the internet.

For the CLF-C02 exam, you must be able to classify AWS services into these three categories, explain what the customer is responsible for under each model, and recognize the Shared Responsibility Model implications of each choice. These concepts appear in the Cloud Concepts domain and are reinforced throughout the Security domain when the Shared Responsibility Model is discussed explicitly. In real-world work, choosing the right service model for each workload is one of the most impactful architectural decisions you make — the gap between IaaS and PaaS for the same workload can mean the difference between needing a dedicated operations team and needing none at all.

## Core Concepts

### Infrastructure as a Service (IaaS)

Infrastructure as a Service is the most foundational cloud service model. The cloud provider manages the physical layer: the data center buildings, power systems, cooling infrastructure, networking hardware, and the physical servers themselves, plus the virtualization layer (called a hypervisor) that turns physical machines into isolated virtual ones. You receive access to a virtual machine. Everything above the hypervisor — the operating system, middleware, runtime, application code, and data — is yours to manage.

Amazon EC2 (Elastic Compute Cloud) is the canonical IaaS service. When you launch an EC2 instance, AWS provides a virtual machine running on their hardware inside their data center. You choose the operating system from a catalog of pre-built images (Amazon Linux, Ubuntu, Windows Server, Red Hat Enterprise Linux, Debian, and many others). You configure the network settings. You install software. You patch the OS when vulnerabilities are discovered. You manage the security of everything running on that machine. AWS never touches your operating system after you launch. AWS never sees your application code. The responsibility boundary sits at the hypervisor: below that line is AWS, above that line is you.

IaaS gives you maximum flexibility. You can run any software stack, configure networking to your exact requirements, use custom OS builds, install proprietary software, and access the full capabilities of the underlying virtual hardware. The trade-off is operational burden. With IaaS, your team must patch operating systems, monitor disk space, respond to performance degradation, harden security configurations, and manage all the routine infrastructure administration that managed services handle automatically. IaaS is ideal for lift-and-shift migrations (moving existing applications from on-premises to cloud without redesigning them), custom software stacks with requirements that don't fit managed platform constraints, and workloads that require specific OS-level configuration.

### Platform as a Service (PaaS)

Platform as a Service abstracts away the infrastructure layer and gives you a managed environment in which to deploy and run your application. The provider manages the operating system, runtime, middleware, networking configuration, and scaling. You manage your application code and your data. You don't install software, patch operating systems, or configure servers — you deploy code and the platform handles the rest.

**AWS Elastic Beanstalk** is a PaaS service for web applications. You write a web application in Python, Node.js, Java, Ruby, PHP, Go, or .NET, package it according to Beanstalk's conventions, and deploy it. AWS automatically provisions EC2 instances, configures a load balancer, sets up a health-check system, creates an auto-scaling group, and handles rolling deployments when you push new versions. You never directly access the underlying EC2 instances unless you choose to — your interface with the system is at the application level.

**AWS Lambda** is PaaS for individual units of compute — discrete functions that execute in response to events. You write a function in Python, JavaScript, Java, Go, Ruby, or other supported languages, upload it to Lambda, and configure triggers (an HTTP request via API Gateway, a file being uploaded to S3, a message arriving in a queue, a scheduled time). AWS executes the function, manages the entire runtime environment, allocates compute resources, scales automatically from zero to thousands of concurrent executions, and bills you in milliseconds for the actual execution time. Lambda is often called "serverless" in marketing — technically, servers still run it, but you are completely abstracted from them.

**Amazon RDS (Relational Database Service)** is PaaS for relational databases. You choose a database engine (MySQL, PostgreSQL, Oracle, SQL Server, MariaDB, or Amazon Aurora), specify an instance size, and RDS creates and manages the database for you. AWS handles OS patching, database engine version updates, automated backups (configurable retention up to 35 days), Multi-AZ replication for high availability, automated failover if the primary instance fails, and performance monitoring. You manage your schema, your queries, your data, and your database user permissions — but there is no server to SSH into, because RDS abstracts the server away entirely.

PaaS dramatically reduces the operational overhead your team carries. Developers focus entirely on writing code and managing data. The trade-off is reduced flexibility: you're constrained to the runtimes, versions, and configurations the platform supports. If you need a custom Linux kernel module or a library with unusual system-level dependencies, PaaS likely won't work. But for the vast majority of web applications, APIs, microservices, and data processing workloads, these constraints are not a practical limitation — most applications fit comfortably within what managed platforms support.

### Software as a Service (SaaS)

Software as a Service delivers a fully functional, complete application over the internet. The provider manages everything: infrastructure, operating system, runtime, middleware, the application code itself, data storage, and ongoing maintenance. You consume the application through a web browser or an API. You don't install anything, configure any servers, or make any architectural decisions about the underlying technology.

AWS delivers some SaaS products directly: **Amazon WorkMail** (managed business email and calendar that integrates with Microsoft Outlook clients), **Amazon Chime** (video conferencing and messaging for teams), and **Amazon Connect** (a fully managed cloud contact center). AWS Marketplace hosts thousands of third-party SaaS applications — antivirus, monitoring tools, BI platforms, security software — that run on AWS infrastructure and are delivered as finished products. Many well-known SaaS products used by businesses everywhere — Salesforce, Slack, Zoom, Dropbox, Workday — run on AWS infrastructure, though their customers never interact with AWS directly.

From the customer's perspective, SaaS means zero operational responsibility for the application stack. You don't patch, scale, configure infrastructure, or respond to outages in the underlying platform. Your responsibilities are limited to: managing your own data (ensuring it's accurate, appropriately categorized, and handled in compliance with your regulatory obligations) and managing user access (provisioning accounts, setting roles and permissions within the application, and deprovisioning users who leave the organization).

SaaS is appropriate for commodity business functions — email, CRM, HR systems, accounting software, video conferencing, document management — where the software itself is not a source of competitive differentiation. If your competitive advantage does not come from how your email server is configured, you should be using SaaS for email. Every hour your engineers spend operating email infrastructure is an hour they're not building the product capabilities that actually differentiate your business.

### The Shared Responsibility Spectrum

The most important practical implication of the three service models is their effect on your security responsibilities. AWS formalizes this through the Shared Responsibility Model: AWS is responsible for security *of* the cloud — the physical infrastructure, hardware, and foundational software. Customers are responsible for security *in* the cloud — what they configure and deploy on top of that infrastructure. The service model you choose determines where that line falls.

Here is the full responsibility matrix across all four scenarios — on-premises included for context:

| Layer | On-Premises | IaaS (EC2) | PaaS (RDS / Lambda) | SaaS (WorkMail) |
|---|---|---|---|---|
| Physical data center | **You** | AWS | AWS | AWS |
| Hardware and networking | **You** | AWS | AWS | AWS |
| Hypervisor / virtualization | **You** | AWS | AWS | AWS |
| Operating system | **You** | **You** | AWS | AWS |
| Runtime and middleware | **You** | **You** | AWS | AWS |
| Application code | **You** | **You** | **You** | AWS |
| Data | **You** | **You** | **You** | **You** (mostly) |
| User access control | **You** | **You** | **You** | **You** |

Notice that data and user access are your responsibility in every model, including SaaS. Even with a fully managed SaaS application, you are responsible for ensuring the right people have access to your data, that data handling meets your regulatory obligations, and that sensitive data is not inadvertently exposed through misconfigured sharing settings or over-permissioned user roles. AWS secures the infrastructure the data lives on; you control who can get to the data.

### Choosing the Right Model

The decision between IaaS, PaaS, and SaaS reduces to three questions: How much control do you actually need? How much operational responsibility can your team realistically carry? Is this capability a source of competitive differentiation for your business?

If you need maximum control and have the engineering team to manage it — IaaS is the right foundation. If you want to focus on writing application code and can work within a managed platform's runtime constraints — PaaS reduces your team's operational burden significantly. If you're implementing a commodity business function where the software is not your differentiator — SaaS is almost certainly the most efficient choice.

In practice, most organizations use all three models simultaneously. They might use EC2 (IaaS) for a legacy application that can't be changed, RDS and Lambda (PaaS) for new microservices, and Salesforce or Zoom (SaaS) for sales and communications. The architectural skill is matching the service model to the workload's actual requirements, not choosing one model for every workload.

## Configuration Reference

The clearest way to understand IaaS, PaaS, and SaaS differences concretely is to walk through the setup experience for each in the AWS Console. The provisioning wizard tells you immediately which layer of abstraction you're working at.

**IaaS Experience — Launching an EC2 Instance:**
Navigate to console.aws.amazon.com, type "EC2" in the search bar, and select EC2 from the results. On the EC2 Dashboard, click "Launch instance." The wizard asks you to:
1. Name your instance
2. Choose an AMI (Amazon Machine Image) — this is the operating system. You'll see a long list: Amazon Linux 2023, Ubuntu Server 22.04 LTS, Windows Server 2022, Red Hat Enterprise Linux 9, Debian 12, and dozens of others. You choose the OS.
3. Choose an instance type — the hardware specification: t3.micro (2 vCPU, 1 GB RAM), t3.medium (2 vCPU, 4 GB RAM), c6i.large (2 vCPU, 4 GB RAM optimized for compute), and hundreds of others. You choose the hardware profile.
4. Create or select a key pair for SSH access — so you can log into the server later.
5. Configure network settings, security group firewall rules, and storage.

This wizard is giving you a virtual machine to configure as you choose. You are responsible for everything you do with it after it launches.

**PaaS Experience — Creating an Elastic Beanstalk Application:**
In the console, search for "Elastic Beanstalk" and open the service. Click "Create application." The wizard asks you to:
1. Name your application
2. Choose a platform: Python, Node.js, Java, PHP, Ruby, Go, .NET, or Docker. You pick a language runtime — not an operating system.
3. Upload your application code or use the provided sample application.

Notice what you are *not* asked: you do not choose an operating system. You do not configure SSH keys. You do not set up a network interface. You do not configure an auto-scaling group manually. The platform absorbs all of that. Your interface with the system is at the code level.

**PaaS Experience — Creating an RDS Database:**
Search for "RDS" in the console and click "Create database." The wizard asks you to:
1. Choose a database engine: MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, or Amazon Aurora
2. Choose an edition and version
3. Choose an instance class (the amount of CPU and RAM)
4. Configure high availability (Multi-AZ deployment or not)
5. Set a database name, master username, and password

What you are *not* asked: you do not provision a Linux server. You do not install the database software. You do not configure replication manually. You do not write backup scripts. The database itself appears ready to use within a few minutes of completing this form.

**Comparison Summary:**

| Service Model | AWS Service | What the Setup Wizard Shows You | What It Hides From You |
|---|---|---|---|
| IaaS | Amazon EC2 | OS selection, SSH keys, network config, security groups | Physical hardware, hypervisor |
| IaaS | Amazon VPC | Subnets, route tables, CIDR blocks, gateways | Physical network hardware |
| PaaS | Elastic Beanstalk | Language runtime, app code upload, environment size | OS, web server, load balancer, scaling config |
| PaaS | AWS Lambda | Function code, runtime version, memory allocation, triggers | OS, compute allocation, server management |
| PaaS | Amazon RDS | Database engine, instance class, backup settings | OS, DB installation, replication, failover logic |
| PaaS | Amazon DynamoDB | Table name, key schema, capacity mode | All storage, replication, partitioning |
| SaaS | Amazon WorkMail | Users, mailboxes, domain configuration | Email servers, spam filtering, storage, uptime |

## How to Decide

Use this step-by-step framework when choosing a service model for a given workload:

**Step 1: Does a SaaS product already exist for this function?**
- If YES and this function is not a competitive differentiator → use SaaS. Stop evaluating.
- If YES but you need deep integration, custom behavior, or regulatory control that SaaS doesn't provide → evaluate PaaS.
- If NO or the capability is core to your product → continue to Step 2.

**Step 2: Can the workload fit within a managed platform's constraints?**

| Workload Characteristic | Recommended Model |
|---|---|
| Standard web framework (Django, Rails, Express, Spring Boot) | PaaS (Elastic Beanstalk or Lambda) |
| Event-driven processing, discrete functions, APIs | PaaS (Lambda) |
| Relational database with no exotic engine requirements | PaaS (RDS) |
| Custom OS kernel requirements or system-level libraries | IaaS (EC2) — PaaS cannot support this |
| Proprietary or licensed software requiring custom installation | IaaS (EC2) |
| Existing application being lifted directly from on-premises | IaaS (EC2) |
| Team has no dedicated operations engineers | PaaS — reduces operational overhead sharply |
| Team requires maximum control over every configuration | IaaS may be appropriate |

**Step 3: Verify shared responsibility implications before finalizing.**
- IaaS: Does your team have capacity to handle OS patching, security hardening, and compliance audit evidence for every instance? If not, PaaS reduces this burden significantly.
- PaaS: Confirm that your application code and data handling meet your compliance requirements — AWS handles infrastructure compliance, but your code and its configuration remain your responsibility.
- SaaS: Verify the provider's compliance certifications match your regulatory framework and review your data handling obligations within the application's terms of service.

**The guiding principle:** Move as far toward PaaS or SaaS as your technical requirements allow. Every layer you hand off to AWS is a layer your team no longer needs to patch, monitor, and respond to at 3am.

## How This Connects

- **The AWS Shared Responsibility Model** (Module 5) is the security formalization of the IaaS/PaaS/SaaS distinction — the service model you choose literally defines the boundary of your security responsibilities. This lesson is foundational to understanding why security posture changes with architectural choices, not just security configuration changes.
- **AWS Lambda** represents the logical endpoint of PaaS — sometimes called "serverless" — where not just the OS but the entire execution environment is ephemeral and invisible. Understanding the PaaS abstraction sets up the mental model for understanding event-driven and serverless architectures that appear throughout later modules.
- **EC2 Auto Scaling** brings elasticity to the IaaS layer — demonstrating that IaaS workloads can achieve cloud-like scaling without moving to PaaS, at the cost of managing more of the scaling configuration yourself.
- **AWS Fargate** is a notable bridge service worth knowing: you run containerized applications (more control than Lambda, since you control the container image) without managing the underlying EC2 instances (closer to PaaS in operational burden). It shows that the IaaS/PaaS boundary is a spectrum, not a hard line.
- **Vendor lock-in** is a real long-term trade-off of PaaS and SaaS that sophisticated architects consider: the more managed the service, the more your architecture depends on AWS-specific APIs and behaviors. Lambda functions use AWS-specific trigger types. RDS configurations use AWS-specific parameter groups. Moving to a different provider requires more rework with PaaS than with a portable IaaS deployment. Understanding this trade-off is part of mature cloud architecture thinking.

## Exam Traps

- Students often think Amazon S3 is IaaS because it is described as "storage infrastructure." S3 is actually closer to PaaS or managed service — you interact with it through an API, AWS manages all underlying storage hardware, replication across multiple facilities, and eleven-nines of durability. You never configure a storage server. S3 behaves as a managed service with no infrastructure surface for you to administer.
- Students often think "serverless" is a fourth service model distinct from IaaS, PaaS, and SaaS. It is not — serverless is a marketing term for a subset of PaaS where the execution environment is fully managed and ephemeral. Lambda is PaaS. The CLF-C02 exam uses the IaaS/PaaS/SaaS classification system, not "serverless" as a separate category.
- Students often think that using PaaS means they have no security responsibilities. They do — specifically for application code, data handling, and access control configuration. If you misconfigure an RDS security group to be publicly accessible, that misconfiguration is your responsibility even though AWS manages the database engine itself. The line of responsibility shifts upward; it does not disappear.
- Students often think SaaS customers have no responsibility for their data. This is incorrect. Data classification, access control within the application, ensuring users have only appropriate permissions, and meeting your regulatory obligations for data you store in SaaS products all remain your responsibility. A misconfigured Salesforce sharing rule that exposes customer records to the wrong team is not Salesforce's fault — it is a customer configuration problem.
- Students often classify Lambda as IaaS because the word "infrastructure" appears in the parent category name "AWS Lambda" or in the broader "AWS Compute" section. Lambda is PaaS — you provide only function code, and AWS manages the OS, runtime, compute allocation, and scaling completely. The category label does not determine the service model.

## Summary

- IaaS (Infrastructure as a Service) provides virtualized compute, storage, and networking — you manage everything from the operating system upward. Core AWS IaaS examples: EC2, EBS, VPC.
- PaaS (Platform as a Service) provides a managed environment where you deploy code or use managed services — AWS manages OS, runtime, and infrastructure. Core AWS PaaS examples: Elastic Beanstalk, Lambda, RDS, DynamoDB.
- SaaS (Software as a Service) delivers a complete, ready-to-use application — you manage only your data and user access. AWS SaaS examples: WorkMail, Chime; third-party SaaS on AWS: Salesforce, Zoom, Slack.
- Moving from IaaS to SaaS increases operational simplicity and reduces your team's maintenance burden, but reduces control and customization — neither extreme is universally correct.
- Data and user access control are your responsibility in every service model, including SaaS. The Shared Responsibility line moves up the stack as you move from IaaS to SaaS, but it never eliminates your responsibility for data.
- Most organizations use all three models simultaneously — the skill is matching each model to each workload based on control needs, team capabilities, and whether the capability is a source of competitive differentiation.

## Examples

A small digital agency building client websites represents a straightforward PaaS use case. Their developers write Python Django applications, and they want to deploy to production without hiring a systems administrator. They use AWS Elastic Beanstalk: they push code via the CLI or the console, and AWS automatically provisions the EC2 instances, configures the Application Load Balancer, sets up the auto-scaling group, and deploys the application with zero-downtime version swaps. The agency pays only for the underlying EC2 instances running their application — the Beanstalk management layer adds no additional charge — and their developers never SSH into a server unless they want to debug something. Their operational overhead is near zero compared to running their own servers. The trade-off they've accepted is that their stack must fit within the Beanstalk platform's supported runtime configurations — if they needed a custom compiled C extension that requires a specific OS library, they would need to migrate to EC2 or use a Docker-based approach. For standard web applications, this is not a constraint that matters in practice.

A financial services company migrating a legacy risk-calculation platform illustrates why IaaS is sometimes the right answer even when more managed options exist. Their platform runs on a custom-compiled version of a Linux kernel with specific memory allocation settings, a modified TCP stack for high-frequency data ingestion, and security kernel modules required by their compliance framework. No PaaS environment — not Elastic Beanstalk, not Lambda — supports custom kernel configurations. They migrate the system to EC2, maintaining full control over every OS-level parameter, and accept the operational burden in exchange for the flexibility to run software that couldn't exist on any managed platform. The migration still saves them substantial data center cost and gives them the ability to scale compute during market volatility without waiting for hardware procurement — all without requiring an expensive and high-risk rewrite of software that processes hundreds of millions of dollars in trades daily.

A company deciding whether to build their own video conferencing tool versus buying Zoom illustrates the SaaS decision at its most fundamental level. Building video conferencing themselves on EC2 (IaaS) would require: real-time protocol expertise, global CDN infrastructure for low-latency media delivery, echo cancellation and noise suppression algorithms, mobile clients for iOS and Android, browser-based WebRTC support, and a team to maintain all of it across ongoing platform updates. Implementing it on managed AWS services (PaaS) would reduce infrastructure burden but still require building all the application-layer functionality from scratch — months of engineering work and ongoing staff to operate it. Zoom, a SaaS product that runs on AWS infrastructure, delivers all of this as a finished, continuously maintained application for a monthly per-seat fee. Unless video conferencing is your business model — meaning your competitive advantage comes from how you deliver video — SaaS is obviously correct. The broader insight: service model selection should always begin with the question of whether the capability is a source of competitive differentiation. If not, move as far toward SaaS as possible.

## Think About It

1. AWS Lambda is often marketed as "serverless," but it's technically PaaS — you deploy code and AWS manages the execution environment. Why do you think AWS markets Lambda differently from Elastic Beanstalk, even though both are PaaS? What does this marketing distinction reveal about how customers actually think about operational responsibility?

2. If a company uses Amazon RDS (PaaS), AWS patches the database engine automatically. But if there's a data breach caused by a misconfigured security group that allows public internet access to the database, who is responsible? How does the choice of service model affect your security posture, not just your operational workload?

3. As you move from IaaS to PaaS to SaaS, you gain convenience but lose customization. Describe a realistic scenario where a company started with a SaaS solution, hit the limits of what the SaaS product could do, and had to build their own solution using PaaS or IaaS. What are the true costs of that transition?

4. Many organizations simultaneously use EC2 for legacy apps, Lambda for new microservices, and Salesforce for CRM. What governance, security audit, and compliance challenges does this multi-model reality create that a purely IaaS shop wouldn't face?

5. The Shared Responsibility Model says security is divided between "in" the cloud versus "of" the cloud. How does that boundary shift as you move from EC2 (IaaS) to RDS (PaaS) to WorkMail (SaaS)? Which model gives the customer the smallest attack surface to manage personally — and what risks does that reduced surface area introduce?

## Quick Check

**Q1.** A company deploys their application to Amazon EC2 and is responsible for patching the operating system. Which service model does this represent?
- A) SaaS
- B) PaaS
- C) IaaS
- D) FaaS

**Answer: C** — EC2 is IaaS. AWS manages the physical infrastructure and hypervisor, but the customer is responsible for the operating system and everything above it — including OS patching, security hardening, and application deployment.

**Q2.** A developer uploads a Python function to AWS Lambda. AWS manages the runtime, scales the function automatically, and the developer never configures a server. Which service model does this represent?
- A) IaaS — because Lambda involves compute infrastructure
- B) SaaS — because the developer doesn't see any servers
- C) PaaS — because the developer manages code and AWS manages the execution environment
- D) On-premises — because the developer controls the code

**Answer: C** — Lambda is PaaS. The developer manages the function code (application layer) and AWS manages everything below: the OS, runtime, compute allocation, scaling, and execution environment. "Serverless" is a marketing term for this specific flavor of PaaS.

**Q3.** Which of the following is ALWAYS the customer's responsibility regardless of whether they are using IaaS, PaaS, or SaaS?
- A) Operating system patching
- B) Runtime and middleware management
- C) Physical server maintenance
- D) Data and user access control

**Answer: D** — Data and user access control remain the customer's responsibility in all three service models. AWS manages progressively more of the stack as you move from IaaS to SaaS, but the customer is always responsible for their own data and for controlling who can access it within the application.

## What's Next

Next, we cover cloud deployment models — public cloud, private cloud, hybrid, and community cloud — including specific AWS services that enable each model and the real-world scenarios where each approach is the right architectural choice.
