---
title: "Log Analytics Workspaces & KQL"
type: content
estimated_minutes: 12
cert_tags: ["az_104", "az_305", "az_500"]
---

# Log Analytics Workspaces & KQL

## Overview

When you configure a Virtual Machine, a Network Security Group, or a Key Vault to start emitting diagnostic logs, that data has to land somewhere. While you *could* dump it into a cheap Azure Storage Account, searching through petabytes of raw text files is practically impossible. 

The architectural standard in Azure is to route all telemetry to a **Log Analytics Workspace (LAW)**. Understanding the LAW is critical not just for operations, but because it acts as the underlying data engine for Azure's highest-tier security tools, including Microsoft Defender for Cloud and Microsoft Sentinel.

## What is a Log Analytics Workspace?

A Log Analytics Workspace is a unique, highly scalable Azure environment designed specifically to ingest, store, and query massive volumes of log data. Under the hood, it is powered by Azure Data Explorer.

**The Centralization Strategy:**
In a multi-account AWS architecture, collecting CloudWatch logs across different accounts can be complex. In Azure, the best practice is to deploy a single, centralized Log Analytics Workspace in your Hub subscription. You then configure the Diagnostic Settings of every resource across all your Spoke subscriptions to route their telemetry to that one centralized workspace. This provides your NOC (Network Operations Center) and SOC (Security Operations Center) with a single pane of glass.

## Kusto Query Language (KQL)

You cannot use standard SQL to query a Log Analytics Workspace. Microsoft developed a specific language for this engine called **Kusto Query Language (KQL)**. 

While AWS engineers might be familiar with CloudWatch Logs Insights syntax, KQL is significantly more powerful. It is a read-only request language that uses a data-flow model similar to PowerShell or bash pipelines (`|`). 

**A Basic KQL Example:**
If an application goes down and you want to find all the Error events on a specific VM over the last 24 hours, the KQL query looks like this:

```kusto
Event                             // The starting table
| where TimeGenerated > ago(24h)  // Filter by time
| where Computer == "Prod-Web-01" // Filter by specific VM
| where EventLevelName == "Error" // Filter by severity
| project TimeGenerated, Source, EventID, RenderedDescription // Select specific columns to display
| sort by TimeGenerated desc      // Order the results