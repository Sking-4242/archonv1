---
title: "VPC Service Controls (Data Exfiltration Defense)"
type: content
estimated_minutes: 12
cert_tags: ["pca", "pcse"]
---

# VPC Service Controls (Data Exfiltration Defense)

## Overview

Identity and Access Management (IAM) controls *who* can access a resource. But what happens if an authorized user with legitimate IAM credentials goes rogue? 

Imagine a data scientist with `BigQuery Data Viewer` access to a table of sensitive patient records. With standard IAM, nothing stops them from querying the data and exporting the results into a completely different GCP project that they personally own. 

This is data exfiltration. IAM cannot stop it, because the user *is* authorized to read the data. To stop it, you must use **VPC Service Controls (VPC-SC)**.

## The Invisible Security Perimeter

VPC Service Controls creates an invisible, identity-aware security perimeter around Google's managed PaaS services (like Cloud Storage, BigQuery, and Cloud Spanner). It acts like a firewall for API calls.

**How it works:**
1. You define a perimeter and place your highly sensitive Project inside it.
2. You specify which Google APIs are restricted by the perimeter.
3. **The Result:** Even if a user has valid IAM credentials, if their API request originates from *outside* the perimeter (like their home Wi-Fi or an unauthorized project), the GCP Control Plane blocks the request. Furthermore, data *inside* the perimeter cannot be copied or exported to a project *outside* the perimeter.

## Context-Aware Access

You still need legitimate users to be able to do their jobs. You cannot block everyone. You solve this by configuring **Access Levels** via the Access Context Manager.

Instead of a hard wall, Access Levels create secure doors in the perimeter. You can define a rule that says: "Allow the API call to cross the perimeter **IF** the user is on the corporate VPN IP address, **AND** their device is managed by the company MDM, **AND** their operating system is fully patched." 

## The Dry Run Approach

Implementing VPC-SC in an existing environment will almost certainly break production applications if done blindly. GCP provides a **Dry Run** mode. In this mode, the perimeter logs every request that *would* have been blocked without actually blocking the traffic. Architects analyze these logs for weeks, identifying legitimate traffic flows and building Access Levels, before switching the perimeter to "Enforced" mode.

## Summary

While IAM controls authentication and authorization, it cannot prevent data exfiltration by authorized users. VPC Service Controls mitigates this by placing a virtual boundary around GCP PaaS APIs, preventing data from leaving the approved perimeter. Architects utilize Context-Aware Access to allow legitimate traffic through the perimeter based on IP address, device health, and identity.