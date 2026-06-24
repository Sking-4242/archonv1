---
title: "Other AWS Services Survey"
type: content
estimated_minutes: 13
cert_tags: ["CLF-C02"]
---

# Other AWS Services Survey

## Overview

The Cloud Practitioner exam is, more than anything, a breadth exam — it expects you to recognize a wide range of AWS services and know what each one is for. Domain 3, Task 3.8 ("Identify services from other in-scope AWS service categories") explicitly tests this breadth across categories the core compute/storage/database/network lessons don't cover: application integration, business applications, developer tools, end-user computing, frontend and mobile services, and the Internet of Things. None of these requires deep knowledge — just the ability to hear a need and name the service that meets it.

This breadth matters because real solutions combine many services, and the exam reflects that by sampling widely. A question might describe sending a notification, building a contact center, automating a deployment pipeline, delivering a virtual desktop, or managing IoT devices — and ask which service fits. A practitioner who knows the one-line purpose of each service answers quickly; one who only studied the headline services gets caught off guard by these category questions. Because this task statement spans so many services, the goal is efficient recognition: group them by category and learn the tell for each.

This lesson surveys the in-scope services across these categories at recognition depth. After it you will be able to match a described need — messaging, business application, developer tooling, virtual desktop, web/mobile backend, or IoT — to the right AWS service.

---

## Core Concepts

### Application Integration: EventBridge, SNS, SQS

These services connect components so they communicate without being tightly coupled. **Amazon SQS (Simple Queue Service)** is a **message queue** that buffers messages between components so one can produce work and another consume it at its own pace (covered in depth in the shared messaging lessons). **Amazon SNS (Simple Notification Service)** is a **pub/sub** service that pushes notifications to many subscribers at once and sends alerts (email, SMS, etc.). **Amazon EventBridge** is an **event bus** that routes events between AWS services and applications based on rules, enabling event-driven architectures. Tells: buffer/queue work → SQS; fan-out notifications/alerts → SNS; route events between services → EventBridge.

### Business Applications: Connect and SES

Two services deliver ready-made business capabilities. **Amazon Connect** is a cloud **contact center** — it lets a company run a customer service call center (phone, chat) without on-premises hardware. **Amazon Simple Email Service (SES)** is a service for **sending and receiving email** at scale — transactional emails, marketing messages, and notifications from applications. Tells: run a contact/call center → Connect; send bulk or transactional email → SES.

### Developer Tools: CodeBuild, CodePipeline, X-Ray

These help teams build, deploy, and troubleshoot applications. **AWS CodeBuild** compiles source code, runs tests, and produces deployable artifacts (the "build" step). **AWS CodePipeline** orchestrates a **continuous integration/continuous delivery (CI/CD)** pipeline, automating the steps from code change to deployment. **AWS X-Ray** helps you **analyze and debug** applications by tracing requests as they travel through distributed services, revealing performance bottlenecks and errors. Tells: build/test code → CodeBuild; automate the release pipeline → CodePipeline; trace/debug distributed requests → X-Ray.

### End-User Computing: WorkSpaces and AppStream 2.0

These deliver desktops and applications to users over the network. **Amazon WorkSpaces** provides **virtual desktops** (Desktop-as-a-Service) — fully managed cloud desktops users can access from anywhere. **Amazon WorkSpaces Secure Browser** delivers a secure, browser-based way to access internal web content. **Amazon AppStream 2.0** **streams individual applications** to users' devices without installing them locally. Tells: full virtual desktop → WorkSpaces; stream a specific application → AppStream 2.0; secure browser access to web apps → WorkSpaces Secure Browser.

### Frontend and Mobile: Amplify and AppSync

These accelerate building web and mobile app front ends and backends. **AWS Amplify** is a set of tools to **build and deploy full-stack web and mobile applications** quickly, handling hosting, authentication, and backend integration. **AWS AppSync** provides managed **GraphQL APIs**, making it easy for apps to fetch and combine data from multiple sources and support real-time updates. Tells: build/deploy a web or mobile app fast → Amplify; managed GraphQL/data API for apps → AppSync.

### Internet of Things: IoT Core

**AWS IoT Core** connects and manages **Internet of Things (IoT) devices** at scale — letting fleets of sensors and devices securely connect to the cloud, send telemetry, and be managed remotely. Tell: connect/manage IoT devices → AWS IoT Core.

### Customer Enablement and Support

The exam also groups **customer enablement** services here, the headline being **AWS Support** (plans covered in Domain 4) along with services like AWS Professional Services and Managed Services that help customers adopt and operate AWS. For this task, recognize that AWS provides assistance offerings to enable customers, with AWS Support as the central one.

### A Strategy for Breadth

You will not be asked to configure any of these. The efficient approach is to memorize the **category and one-line tell** for each: integration (SQS/SNS/EventBridge), business apps (Connect/SES), dev tools (CodeBuild/CodePipeline/X-Ray), end-user computing (WorkSpaces/AppStream), frontend/mobile (Amplify/AppSync), and IoT (IoT Core). When a scenario describes a need, map it to the category, then to the service.

---

## Configuration Reference

Services by category and purpose:

```text
Category              Service              One-line purpose
--------------------- -------------------- ----------------------------------
Integration           Amazon SQS           message queue (buffer work)
                      Amazon SNS           pub/sub notifications & alerts
                      Amazon EventBridge   event bus (route events by rules)
Business apps         Amazon Connect       cloud contact/call center
                      Amazon SES           send/receive email at scale
Developer tools       AWS CodeBuild        build & test code
                      AWS CodePipeline     CI/CD release automation
                      AWS X-Ray            trace/debug distributed apps
End-user computing    Amazon WorkSpaces    virtual desktops (DaaS)
                      Amazon AppStream 2.0 stream individual applications
Frontend / mobile     AWS Amplify          build/deploy web & mobile apps
                      AWS AppSync          managed GraphQL data APIs
IoT                   AWS IoT Core         connect & manage IoT devices
Customer enablement   AWS Support          support plans & assistance
```

---

## How to Decide

- **Deliver messages / alerts / route events?** → SQS (queue), SNS (notifications), EventBridge (event routing).
- **Run a call center?** → Connect. **Send email?** → SES.
- **Build/test code, automate releases, debug distributed apps?** → CodeBuild, CodePipeline, X-Ray.
- **Give users virtual desktops or streamed apps?** → WorkSpaces, AppStream 2.0.
- **Build a web/mobile app fast, or a GraphQL API?** → Amplify, AppSync.
- **Connect IoT devices?** → AWS IoT Core.

---

## How This Connects

This lesson completes Domain 3's services breadth, building on the messaging lessons (SQS/SNS) from the shared library and connecting to Domain 4 (AWS Support). The developer tools relate to infrastructure-as-code and automation themes, and EventBridge ties to the event-driven and analytics (Kinesis) topics. Together with the compute, storage, database, and network lessons, this gives the full service catalog the exam samples from.

---

## Exam Traps

- **Confusing SQS, SNS, and EventBridge.** SQS queues messages for one consumer; SNS fans out notifications to many; EventBridge routes events by rules.
- **Confusing WorkSpaces and AppStream.** WorkSpaces delivers a full virtual desktop; AppStream streams a single application.
- **Confusing CodeBuild and CodePipeline.** CodeBuild builds/tests code; CodePipeline orchestrates the whole CI/CD release.
- **Confusing Connect and SES.** Connect is a contact center (calls/chat); SES sends and receives email.
- **Over-studying these.** Recognition of the one-line purpose is enough; don't memorize configuration.

---

## Summary

The Cloud Practitioner exam samples widely, so Domain 3.8 tests recognition of services across many categories: application integration (SQS queues, SNS notifications, EventBridge event routing), business applications (Connect contact center, SES email), developer tools (CodeBuild builds, CodePipeline CI/CD, X-Ray tracing), end-user computing (WorkSpaces virtual desktops, AppStream application streaming), frontend and mobile (Amplify full-stack apps, AppSync GraphQL APIs), and IoT (IoT Core). The efficient strategy is to learn each service's category and one-line purpose so you can map any described need to the right service quickly.

---

## Examples

**Example 1 — EventBridge.** A team wants an action to trigger automatically whenever a specific AWS service event occurs → **Amazon EventBridge**.

**Example 2 — Connect.** A company wants to launch a customer-service call center without buying telephony hardware → **Amazon Connect**.

**Example 3 — WorkSpaces.** A firm needs to give remote employees secure, managed desktops accessible from anywhere → **Amazon WorkSpaces**.

**Example 4 — IoT Core.** A manufacturer must connect thousands of factory sensors to the cloud securely → **AWS IoT Core**.

---

## Think About It

A startup is building a mobile app and needs to: send users push notifications, run a CI/CD pipeline for releases, and expose a flexible data API to the app. Name an AWS service for each need, and explain how grouping services by category (integration, developer tools, frontend) helps you recall the right one under exam time pressure.

---

## Quick Check

1. Which integration service routes events between services by rules, and which fans out notifications to many subscribers?
2. What does Amazon Connect do, and what does Amazon SES do?
3. What is the difference between Amazon WorkSpaces and Amazon AppStream 2.0?
4. Which service connects and manages IoT devices?

*Answers: (1) Amazon EventBridge routes events by rules; Amazon SNS fans out notifications to many subscribers; (2) Connect provides a cloud contact/call center, SES sends and receives email at scale; (3) WorkSpaces delivers full virtual desktops, while AppStream 2.0 streams individual applications to users; (4) AWS IoT Core.*

---

## What's Next

Next: **AWS Support, Partners, and Technical Resources** — the AWS Support plans, the Partner Network and Marketplace, and the technical resources and tools (Trusted Advisor, Health Dashboard, re:Post) available to customers.
