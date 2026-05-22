---
title: "Alerts, Action Groups, & Automation"
type: content
estimated_minutes: 10
cert_tags: ["az_104", "az_305"]
---

# Alerts, Action Groups, & Automation

## Overview

A mature cloud operation does not rely on humans staring at dashboards waiting for lines to turn red. It relies on automated alerting and self-healing systems. When a metric crosses a threshold, or a specific error appears in the logs, the cloud should automatically page the on-call engineer or trigger a script to fix the problem.

In Azure, this workflow is handled by pairing **Alert Rules** with **Action Groups**. This pairing acts as the equivalent to AWS CloudWatch Alarms triggering AWS SNS (Simple Notification Service).

## The Anatomy of an Alert

Creating an automated response requires defining an Alert Rule. An Alert Rule consists of three components:

**1. The Scope (What are we watching?)**
This defines the target resource. It could be a single Virtual Machine, an entire Resource Group, or a centralized Log Analytics Workspace.

**2. The Condition (When do we fire?)**
This is the logic. There are two primary types of conditions:
* **Metric Alerts:** "Trigger if CPU Percentage > 85% for a sustained 5 minutes." These evaluate almost instantly.
* **Log Alerts:** "Run this KQL query every 10 minutes. Trigger if the query returns more than 5 results containing 'Failed Login'." These have a slight delay due to log ingestion times.

**3. The Action Group (What do we do about it?)**
An Action Group is a reusable collection of notification preferences and automated actions. It is completely decoupled from the Alert Rule. You can have 50 different Alert Rules all pointing to the exact same "Tier 1 DevOps" Action Group.

## Inside the Action Group

When an Action Group is triggered, it can execute multiple actions simultaneously across two categories:

**Notifications (Humans):**
* Send an Email (e.g., to the NOC distribution list).
* Send an SMS text message to the on-call engineer.
* Push a notification to the Azure Mobile App.
* *Note:* Azure places strict rate limits on SMS and Email to prevent spamming during massive outages (e.g., no more than 1 SMS every 5 minutes).

**Actions (Systems):**
* **Webhook:** POST a JSON payload to a third-party system (like PagerDuty, Slack, or a ServiceNow ticketing system).
* **Azure Functions/Logic Apps:** Trigger serverless code to run complex remediation logic.
* **Azure Automation Runbooks:** The most powerful operational tool. You can trigger a PowerShell or Python script hosted in Azure Automation. For example, if an alert fires stating a VM's `C:\` drive is at 99% capacity, the Action Group can trigger a Runbook that connects to the VM, deletes temporary files, clears the logs, and closes the ticket—all without human intervention.

## Summary

Azure Monitor enables automated operations through Alert Rules and Action Groups. The Alert Rule defines the scope and the condition (Metric thresholds or KQL Log queries). When triggered, it fires an Action Group. Action Groups separate the notification logic (Email, SMS) from the remediation logic (Webhooks, Azure Automation Runbooks), allowing architects to build self-healing cloud environments that respond instantly to failures.