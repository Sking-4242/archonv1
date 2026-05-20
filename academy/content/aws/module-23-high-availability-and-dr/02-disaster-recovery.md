---
title: "Disaster Recovery Strategies"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Disaster Recovery Strategies

## Overview

Disaster Recovery (DR) prepares for complete regional failures — uncommon but catastrophic without preparation. DR strategy is characterized by RPO (how much data can you lose?) and RTO (how long can you be down?). AWS provides four standard DR patterns with different cost/recovery tradeoffs.

## RPO and RTO

Recovery Point Objective (RPO): the maximum amount of data loss acceptable, measured in time. If RPO is 1 hour, you must snapshot or replicate data at least every hour. Recovery Time Objective (RTO): the maximum time to restore service after a disaster. If RTO is 4 hours, you must be able to recover the full application within 4 hours. Lower RPO and RTO = higher cost. The correct DR strategy depends on business impact of downtime — calculate the cost of downtime per hour and compare to DR infrastructure cost.

## Backup and Restore

The simplest DR strategy: take regular backups (snapshots, exports) and restore them in another region if disaster strikes. RPO = backup frequency (e.g., daily = up to 24 hours data loss). RTO = hours to days (restore from backup, reconfigure, restart). Lowest cost (no standby infrastructure). Use for non-critical workloads that can tolerate significant downtime and data loss. AWS Backup centrally manages backup policies across RDS, EC2, EFS, S3, DynamoDB, and more with cross-region copy.

## Pilot Light

A minimal version of the environment runs in the DR region — only the most critical components (typically data replication — RDS read replica or Aurora Global Database secondary). Other infrastructure (EC2, ECS) is not running. If disaster strikes: scale up the data tier, deploy the application tier from CloudFormation/AMIs, update DNS. RPO = data replication lag (near-zero with synchronous replication). RTO = 1-4 hours (time to provision and deploy remaining infrastructure). Moderate cost.

## Warm Standby

A scaled-down but fully functional version of the production environment runs continuously in the DR region. Application servers run at minimum capacity, database is live. At DR time: scale up the application tier to production capacity, switch Route 53 to the DR region. RPO = minutes (from replication lag). RTO = minutes to under 1 hour (scale up + DNS switch). Higher cost than Pilot Light. Best for systems requiring fast recovery but where active-active cost is prohibitive.

## Multi-Site Active-Active

Both regions serve production traffic simultaneously. Route 53 or Global Accelerator distributes load between regions. No recovery steps needed — if one region fails, the other handles 100% of traffic (with auto-scaling). RPO = 0 (no data loss). RTO = near-zero (automatic traffic rerouting). Highest cost — full production capacity in both regions. Required for systems with near-zero tolerance for downtime or data loss (financial systems, critical healthcare).

## Summary

DR strategies from cheapest to most resilient: Backup-Restore (hours to days RTO), Pilot Light (data only standby, hours RTO), Warm Standby (scaled-down active standby, minutes RTO), Multi-Site Active-Active (zero RTO/RPO). Choose based on business impact of downtime vs. DR cost. Use Aurora Global Database, DynamoDB Global Tables, S3 CRR, and Route 53 failover as the building blocks.

## What's Next

Next up: Auto Scaling deep dive — scaling policies, predictive scaling, and scaling for resilience.