---
title: "S3 Storage Classes and Cost Optimization"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "CLF-C02"]
---

# S3 Storage Classes and Cost Optimization

## Overview

S3 offers multiple storage classes designed for different access frequencies and retrieval time requirements. Choosing the right class can reduce storage costs by up to 95% compared to keeping everything in Standard. This lesson maps each class to its use case and explains how Intelligent-Tiering automates the decision.

## S3 Standard

The default class. Stores data across at least 3 AZs, offers 99.99% availability, and has no retrieval fee. Use Standard for frequently accessed data — active application assets, content being processed, popular downloads. Cost: ~$0.023/GB/month in us-east-1.

## S3 Standard-IA and One Zone-IA

Infrequent Access (IA) classes charge lower storage rates but add a per-GB retrieval fee and a 30-day minimum storage duration. Standard-IA replicates across 3+ AZs (same durability as Standard). One Zone-IA stores in a single AZ — cheaper but data is lost if that AZ fails. Use IA for backups, disaster recovery copies, or data accessed monthly or less.

## S3 Glacier Instant, Flexible, and Deep Archive

The Glacier tier is for archival. Instant Retrieval delivers millisecond access with the lowest storage cost for data accessed once a quarter. Flexible Retrieval offers retrieval in minutes to hours (expedited, standard, bulk). Deep Archive is the cheapest AWS storage at ~$0.00099/GB/month with 12-hour retrieval — for compliance archives and cold backups.

## S3 Intelligent-Tiering

Intelligent-Tiering monitors access patterns and automatically moves objects between Frequent Access, Infrequent Access, Archive Instant, and Archive tiers. There is a small monitoring fee (~$0.0025/1,000 objects/month) but no retrieval fee. Best for workloads with unpredictable or changing access patterns where you don't want to manually manage lifecycle rules.

## Lifecycle Policies

You configure lifecycle rules at the bucket or prefix level to automatically transition objects between classes or expire them. A typical rule: transition to Standard-IA after 30 days, to Glacier after 90 days, delete after 365 days. Lifecycle actions fire once daily, not in real time.

## Summary

S3's storage classes let you match cost to access frequency. Standard for hot data, IA for warm, Glacier tiers for cold and frozen. Intelligent-Tiering automates class selection. Lifecycle policies enforce transitions and expiration automatically — set them and save money without manual intervention.

## What's Next

Next up: S3 Versioning — how to protect objects from accidental deletion and overwrites.