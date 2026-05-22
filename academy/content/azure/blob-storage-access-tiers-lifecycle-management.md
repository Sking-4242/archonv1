---
title: "Blob Storage: Access Tiers & Lifecycle Management"
type: content
estimated_minutes: 10
cert_tags: ["az_104", "az_305", "az_500"]
---

# Blob Storage: Access Tiers & Lifecycle Management

## Overview

Storing a petabyte of data is easy; doing it without bankrupting your IT department requires architectural discipline. Data has a natural lifecycle. A security video from yesterday is highly relevant and likely to be viewed. A security video from four years ago is only kept for compliance and will likely never be watched again. 

Azure Blob Storage provides **Access Tiers** to map your storage costs directly to this data lifecycle. This is the exact Azure equivalent to AWS S3 Standard, S3 Infrequent Access, and S3 Glacier.

## The Financial Dynamics of Storage

Before learning the tiers, you must understand the financial seesaw of cloud storage:
* **Storage Cost:** What you pay per GB per month just to let the data sit there.
* **Transaction/Access Cost:** What you pay every time you read, write, or retrieve that data.

As you move to "colder" tiers, the storage cost drops drastically, but the transaction cost rises sharply. If you put highly active data into a cold tier, your transaction penalties will result in a massive monthly bill.

## The Three Access Tiers

**1. Hot Tier**
* **Use Case:** Data that is accessed frequently (e.g., website images, actively editing documents, application databases).
* **Cost Profile:** Highest storage costs, lowest access and transaction costs.

**2. Cool Tier (and Cold Tier)**
* **Use Case:** Data that is accessed infrequently but must be immediately available when requested (e.g., short-term backups, telemetry data, media content awaiting processing). 
* **Cost Profile:** Lower storage costs, higher access costs. 
* *Gotcha:* Data placed in the Cool tier has an early deletion penalty if deleted before 30 days (Cold tier is 90 days).

**3. Archive Tier**
* **Use Case:** Long-term compliance, archival data, and historical backups that are rarely, if ever, accessed.
* **Cost Profile:** Almost free to store. Extremely expensive to read.
* *The Rehydration Penalty:* Archive storage is literally offline (often on magnetic tape). You cannot immediately read an archived blob. You must issue a "rehydrate" command, and it can take up to **15 hours** for the data to be moved back to the Hot/Cool tier before you can download it. 

## Automating the Flow: Lifecycle Management

No cloud administrator has the time to manually move millions of files from Hot to Cool to Archive every month. 

**Lifecycle Management Policies** allow you to automate this progression using a declarative JSON rules engine. You define conditions based on the blob's creation date, last modified date, or last accessed date.

*Example Policy:*
1. If a blob has not been modified in 30 days $\rightarrow$ Move to Cool Tier.
2. If a blob has not been modified in 90 days $\rightarrow$ Move to Archive Tier.
3. If a blob has not been modified in 7 years $\rightarrow$ Delete the blob.

## Summary

Cost-optimizing unstructured data requires utilizing Blob Access Tiers. The Hot tier is for active data, the Cool tier is for infrequently accessed data, and the Archive tier is for long-term retention. Never put data requiring immediate access into the Archive tier due to the 15-hour rehydration delay. To minimize OpEx without administrative overhead, always implement automated Lifecycle Management policies.

## What's Next

Blob storage is for unstructured objects. But what about the `C:\` drive of your Virtual Machine? Next, we will explore Managed Disks, the block storage architecture for Azure compute.