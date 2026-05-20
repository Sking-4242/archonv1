---
title: "S3 Overview: Buckets and Objects"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "CLF-C02"]
---

# S3 Overview: Buckets and Objects

## Overview

Amazon S3 (Simple Storage Service) is AWS's foundational object storage service, capable of storing virtually unlimited amounts of data. This lesson covers how S3 organizes data, how buckets and objects work, and the key properties that make S3 the backbone of data storage on AWS.

## What Is Object Storage?

Unlike block storage (EBS) or file storage (EFS), S3 stores data as objects — self-contained units of data combined with metadata and a unique key. There is no directory hierarchy; the key name `images/logos/header.png` just looks hierarchical. Each object can be up to 5 TB. Objects are stored in buckets, which act as the top-level namespace.

## Bucket Fundamentals

A bucket is a globally unique namespace container in a specific AWS region. Bucket names must be lowercase, 3–63 characters, no underscores, no IP-format names. When you create a bucket you choose a region — data stays there unless you configure replication. The bucket URL format is `https://bucket-name.s3.region.amazonaws.com/object-key`.

## Object Properties

Every S3 object has a key (its full path name), value (the data bytes), metadata (system metadata like Content-Type, plus user-defined key-value pairs), and optionally a version ID if versioning is enabled. Object size ranges from 0 bytes to 5 TB; objects over 100 MB should use multipart upload.

## Strong Consistency

Since December 2020, S3 provides strong read-after-write consistency for all operations — PUTs, DELETEs, and list operations. This means after a successful write you immediately see the new data on any subsequent read. Older exam materials may reference eventual consistency; that is no longer accurate.

## S3 Durability and Availability

S3 Standard offers 99.999999999% (11 9s) durability by redundantly storing objects across at least 3 AZs. Availability targets vary by storage class — S3 Standard offers 99.99% availability. S3 does not replicate across regions by default; that requires Cross-Region Replication.

## Summary

S3 is a regional, globally-named object store with strong consistency, 11 nines of durability, and the ability to store objects up to 5 TB. Buckets are unique containers; objects are key-value pairs with metadata. Understanding these fundamentals is the foundation for every S3 feature that follows.

## What's Next

Next up: S3 Storage Classes — how to match cost to access patterns and move data automatically through tiers.