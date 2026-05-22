---
title: "Azure Functions: Event-Driven Serverless Compute"
type: content
estimated_minutes: 11
cert_tags: ["az_104", "az_305"]
---

# Azure Functions: Event-Driven Serverless Compute

## Overview

In the Compute module, we explored Virtual Machines (IaaS) and App Services (PaaS). Both models require a server to be running 24/7, waiting for HTTP requests. If no requests come in at 3 AM, you are still paying for idle CPU cycles.

**Azure Functions** represents the next evolution: Serverless Compute (Function as a Service, or FaaS). It is the direct equivalent of AWS Lambda. With Azure Functions, you write a small block of code (C#, Python, Node.js) and configure it to execute only when a specific event occurs. You are billed precisely for the memory used and the milliseconds of execution time. When the function isn't running, it costs nothing.

## Triggers and Bindings (The Azure Difference)

Writing serverless code in AWS Lambda requires importing the AWS SDK and writing boilerplate code to connect to other services (e.g., writing the connection logic to pull a message from SQS or write a file to S3).

Azure eliminates this boilerplate using **Triggers and Bindings**. This is the architectural superpower of Azure Functions.

* **The Trigger (The "When"):** Every function must have exactly one Trigger. This is the event that wakes the function up. It could be an HTTP request, a new file landing in Blob Storage, a message arriving on a Service Bus queue, or a simple timer (cron job).
* **Input/Output Bindings (The "What"):** Bindings declaratively connect your function to other Azure services without writing connection strings or SDK code. 
  * *Example:* You define an Input Binding to an Azure Cosmos DB database, and an Output Binding to a Storage Account queue. 
  * Your code simply reads a variable (which Azure automatically populated with the Cosmos DB data) and returns a value. Azure's backend platform silently handles authenticating to Cosmos DB, retrieving the data, and writing the final result to the queue. 

## The Cold Start Challenge

Because serverless functions scale down to zero instances when idle, they face the "Cold Start" problem. 

If your function hasn't been triggered in 20 minutes, Azure deallocates the underlying container. When a new request arrives, Azure must allocate a new container, inject your code, and spin up the language runtime (like the .NET CLR or Node engine). This can add 1 to 3 seconds of latency to the request. 

For background tasks (like resizing an image), a 3-second delay is irrelevant. For an HTTP API serving a live user interface, a 3-second delay is unacceptable.

## Hosting Plans

To solve the Cold Start problem and control billing, Azure offers three primary hosting plans for Functions. Choosing the right plan is a staple of the AZ-305 exam.

1. **Consumption Plan:** The default serverless model. You pay per execution millisecond. It scales automatically to thousands of instances, but it suffers from Cold Starts. Maximum execution time is 10 minutes.
2. **Premium Plan:** Designed for production APIs. You pay a higher base monthly fee, but Azure keeps a pre-warmed instance of your function running at all times, completely eliminating Cold Starts. It also allows your function to connect to private Virtual Networks (VNets), which the Consumption plan cannot do.
3. **App Service Plan:** If you already have an App Service Plan running your web applications (as discussed in Module 3) with excess CPU capacity, you can deploy your Functions onto that same plan at no additional cost. It runs 24/7, so there are no cold starts, but it loses the "scale to infinity" elasticity of the true serverless plans.

## Summary

Azure Functions provide event-driven, serverless compute billed by the millisecond. They differentiate themselves from AWS Lambda by using declarative Triggers and Bindings, which eliminate the need to write SDK boilerplate code to connect to other Azure resources. Architects must evaluate the impact of Cold Starts on the workload to choose between the cost-effective Consumption plan and the performance-guaranteed Premium plan.

## What's Next

Functions handle individual blocks of code. But what happens when you need to string five different functions together in a specific order with error handling? Next, we explore Azure Logic Apps.