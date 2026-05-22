---
title: "Microsoft Defender for Cloud: CSPM and CWPP"
type: content
estimated_minutes: 12
cert_tags: ["az_500", "az_305"]
---

# Microsoft Defender for Cloud: CSPM and CWPP

## Overview

Modern cloud environments consist of thousands of dynamic resources changing every hour. A Security Operations Center (SOC) cannot manually audit every single NSG, Storage Account, and App Service to ensure they remain secure. 

**Microsoft Defender for Cloud** is Azure's centralized security management system. If you are familiar with AWS, it effectively combines the compliance auditing of AWS Security Hub with the active threat detection of Amazon GuardDuty. It provides two distinct functions: Cloud Security Posture Management (CSPM) and Cloud Workload Protection Platform (CWPP).

## Cloud Security Posture Management (CSPM)

CSPM is about **prevention and hygiene**. It continuously scans your Azure subscriptions (and connected AWS/GCP accounts) to find misconfigurations before an attacker does. 

* **The Secure Score:** Defender for Cloud gamifies security by providing a "Secure Score" (a percentage). It assesses your environment against Microsoft's best practices and gives you actionable recommendations. 
* **Example Recommendations:** "Enable MFA for accounts with owner permissions," "Restrict RDP/SSH access from the internet," or "Enable transparent data encryption on SQL databases."
* Implementing these recommendations raises your score. For architects and security analysts, keeping the Secure Score high is a primary Key Performance Indicator (KPI) for the health of the cloud footprint.

## Cloud Workload Protection Platform (CWPP)

While CSPM is about prevention, CWPP is about **active threat detection and response**. It analyzes behavioral telemetry to identify active attacks taking place in your environment right now.

CWPP requires enabling specific Defender plans for different resource types (which incurs additional OpEx):

* **Defender for Servers:** Monitors VMs for malicious processes, unauthorized registry changes, and lateral movement attempts. It provides Just-In-Time (JIT) VM access, locking down management ports (3389/22) at the network level until an administrator explicitly requests access.
* **Defender for Storage:** Analyzes telemetry to detect unusual access patterns, such as a massive exfiltration of data to a foreign IP address, or malware being uploaded into a Blob container.
* **Defender for Key Vault:** Detects anomalous access to your secure vaults, such as an application suddenly requesting every single cryptographic key it has access to in under a minute (indicative of credential theft).

## Multi-Cloud and Hybrid Support

Threat actors do not care about your organizational boundaries; they exploit the weakest link. Therefore, Defender for Cloud is not limited to Azure. Using **Azure Arc**, you can install the Defender agent on physical servers in your on-premises datacenter, or on VMs running in AWS and GCP. This provides the SOC with a single pane of glass to monitor security posture across the entire multi-cloud enterprise.

## Summary

Microsoft Defender for Cloud is the command center for your security posture. It utilizes CSPM to proactively identify and remediate misconfigurations (like exposed ports or missing encryption) via the Secure Score. It utilizes CWPP to actively detect behavioral anomalies and threats (like malware execution or data exfiltration) across Azure, AWS, GCP, and on-premises infrastructure. 

## What's Next

Defender for Cloud tells you when you have made a mistake. But what if you want to prevent the mistake from happening in the first place? Next, we look at Azure Policy, the engine for Governance as Code.