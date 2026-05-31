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

## Examples

A small e-commerce startup runs their entire platform on a single RDS instance with daily automated snapshots copied to a second region via AWS Backup. Their products are non-perishable goods and their site handles modest traffic — if the site went down for six hours, the business would survive. They choose the Backup and Restore strategy: lowest cost, acceptable RPO of 24 hours, RTO of a few hours. This is the right fit for the risk tolerance and budget of an early-stage company that has not yet justified the cost of standby infrastructure.

A healthcare software company operates an appointment scheduling system used by clinic staff during business hours. Losing the last four hours of data — newly booked appointments — would create real patient-care disruption, but a two-hour recovery window is acceptable. They implement the Pilot Light strategy: an Aurora Global Database secondary runs continuously in us-west-2, keeping replication lag under one second. EC2 and ECS infrastructure is defined in CloudFormation but not running. If us-east-1 fails, the team promotes the Aurora secondary, deploys the app tier from CloudFormation, and updates Route 53. RTO of roughly 90 minutes meets the business requirement at a fraction of Warm Standby cost.

A global investment bank operates trading systems where one minute of downtime costs millions of dollars and any data loss is a regulatory violation. They run Multi-Site Active-Active across us-east-1 and eu-west-1 using DynamoDB Global Tables for data and Global Accelerator for traffic distribution. Both regions handle live trading simultaneously. When us-east-1 experiences a power event, Global Accelerator shifts 100% of traffic to eu-west-1 in under 30 seconds with zero data loss. The cost of running full production capacity in two regions is trivial compared to the cost of even a brief outage — this is the business case for Active-Active.

## Think About It

1. Why does a lower RPO almost always imply a lower RTO, even though they measure different things? Can you construct a realistic scenario where RPO is near-zero but RTO is several hours?
2. A company claims they have a Pilot Light setup, but their CloudFormation templates haven't been tested in 18 months and their AMIs haven't been updated. What is their actual RTO likely to be, and why?
3. How would you decide between Warm Standby and Multi-Site Active-Active for a payment processing system that processes $10,000 per minute? What financial and technical factors drive that decision?
4. What trade-offs does Aurora Global Database introduce compared to standard RDS Multi-AZ when used as the replication mechanism for a Pilot Light or Warm Standby strategy?
5. Your business says the RTO target is four hours. You design a Pilot Light solution that you believe can recover in two hours. Should you present that as meeting the requirement, or should you push for a more demanding target? What risks does the two-hour estimate carry?

## Quick Check

**Q1.** A company takes nightly RDS snapshots and copies them to a DR region. Which DR strategy are they using, and what is the approximate RPO?
- A) Pilot Light; minutes
- B) Warm Standby; hours
- C) Backup and Restore; up to 24 hours
- D) Multi-Site Active-Active; zero

**Answer: C** — Nightly snapshots mean data created since the last snapshot is lost in a disaster, giving an RPO of up to 24 hours — the defining characteristic of Backup and Restore.

**Q2.** Which DR strategy has the lowest RTO and RPO but the highest cost?
- A) Backup and Restore
- B) Pilot Light
- C) Warm Standby
- D) Multi-Site Active-Active

**Answer: D** — Multi-Site Active-Active runs full production capacity in multiple regions simultaneously, delivering near-zero RTO and RPO at the highest infrastructure cost.

**Q3.** In a Pilot Light DR setup, which component is typically kept running continuously in the DR region?
- A) The full application and database tier at production scale
- B) Only the data replication layer (e.g., an RDS read replica or Aurora Global Database secondary)
- C) A scheduled Lambda that restores backups on demand
- D) Nothing — all infrastructure is provisioned from scratch during recovery

**Answer: B** — Pilot Light keeps only the most critical component — data replication — running continuously, so data is current when a disaster requires the remaining infrastructure to be provisioned and started.

## What's Next

Next up: Auto Scaling deep dive — scaling policies, predictive scaling, and scaling for resilience.