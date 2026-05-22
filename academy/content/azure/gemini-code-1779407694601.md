---
title: "Logic Apps: Visual Workflow Orchestration"
type: content
estimated_minutes: 9
cert_tags: ["az_104", "az_305"]
---

# Logic Apps: Visual Workflow Orchestration

## Overview

Azure Functions are perfect for executing a single, stateless task. However, enterprise business processes are rarely single tasks. 

Imagine an employee onboarding process: 
1. HR adds a record to Salesforce.
2. Create an Entra ID user account.
3. If the user is an executive, email the CEO for approval.
4. If approved, provision a software license.
5. If denied, notify HR.

If you try to write this entire workflow in a single Azure Function, you create a massive, brittle, hard-coded monolith. If you break it into five separate Functions, you have to write complex tracking logic to pass state between them.

**Azure Logic Apps** solves this. It is a cloud-based platform for creating and running automated workflows. It is the Azure equivalent of AWS Step Functions, but with a massive focus on visual, low-code integration.

## Declarative vs. Imperative

* **Azure Functions are imperative:** You write code (C#, Python) that tells the computer exactly *how* to execute a task.
* **Logic Apps are declarative:** You use a visual drag-and-drop designer in the Azure Portal to define *what* should happen, and Azure handles the underlying execution, state management, and retries. Under the hood, the visual designer generates a massive JSON file.

[Image of Azure Logic Apps visual designer showing workflow steps and conditional branches]

## Connectors: The Integration Superpower

The defining feature of Logic Apps is its library of over 1,000 pre-built **Connectors**. 

In AWS Step Functions, you are mostly orchestrating other AWS services. Logic Apps is designed for enterprise B2B (Business-to-Business) and SaaS integration. There are native connectors for Salesforce, Office 365, Twitter, SAP, ServiceNow, and Google Drive. 

Without writing a single line of code, an architect can build a Logic App that:
* **Triggers** when a new row is added to a SQL Database.
* Parses the data and sends an adaptive card to a **Microsoft Teams** channel.
* Waits for a user to click "Approve" in Teams.
* Creates a ticket in **Jira**.

## State Management and Retries

Unlike Azure Functions, Logic Apps are deeply stateful. The Logic App engine tracks the precise state of every single step in the workflow. 

If step 3 of a 10-step workflow fails because a third-party API is temporarily down, the Logic App doesn't crash and lose the data. It automatically pauses, applies an exponential backoff retry policy, and tries again. You can view the execution history in the portal, see exactly which step failed, fix the API, and click "Resubmit" to resume the workflow from the exact point of failure.

## Summary

When designing complex, multi-step business processes, architects should prefer Azure Logic Apps over Azure Functions. Logic Apps provide a visual, low-code designer that generates stateful workflows with built-in retry logic. Their massive library of pre-built Connectors makes them the ultimate tool for orchestrating communication between Azure resources and external SaaS platforms like Salesforce, Microsoft 365, and SAP.

## What's Next

Both Functions and Logic Apps need to be triggered by events. But how do those events travel through the cloud? Our final integration lesson covers the three major messaging architectures in Azure: Service Bus, Event Grid, and Event Hubs.