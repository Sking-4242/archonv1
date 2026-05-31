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

## Examples

A media startup stores user-uploaded profile photos in S3. Each photo is an object with a key like `users/12345/avatar.jpg`, a value (the image bytes), and system metadata like `Content-Type: image/jpeg`. This is the textbook bucket-and-object model: the "folder" in the key is an illusion — S3 has no real directories, just a flat namespace of keys inside a bucket.

A regional bank wants to store loan application documents and needs to know the data won't leave their chosen AWS region. When they create their S3 bucket in `us-east-1` and do nothing else, that data stays in `us-east-1`. S3's regional data residency guarantee is not an add-on feature — it's the default behavior, and it satisfies many data sovereignty requirements without extra configuration.

A data engineering team writes a pipeline that reads an S3 object immediately after another service writes it. Before December 2020 they had to build in retry logic because S3 offered only eventual consistency — a fresh GET might return stale data. With S3's current strong read-after-write consistency model, the read immediately after a successful PUT is guaranteed to return the new data, removing an entire class of race-condition bugs from distributed pipeline design.

## Think About It

1. Why does S3 use a flat key namespace instead of a real directory tree, and what does that mean for operations like "delete a folder"?
2. What would happen if two applications tried to PUT to the same S3 key at exactly the same time? Which version wins, and how would you design around this?
3. S3 offers 11 nines of durability but only 99.99% availability. What is the difference between durability and availability, and why might a highly durable store still be temporarily unavailable?
4. How would you decide whether to store a 6 TB dataset as a single object (if that were allowed) versus many smaller objects? What trade-offs in key design, retrieval, and partial access would drive that decision?
5. A bucket name is globally unique across all AWS accounts. Why do you think AWS made this choice, and what problems does it create for organizations with many teams?

## Quick Check

**Q1.** What is the maximum size of a single S3 object?
- A) 100 MB
- B) 5 GB
- C) 5 TB
- D) Unlimited

**Answer: C** — A single S3 object can be up to 5 TB; objects over 5 GB must use multipart upload.

**Q2.** Which statement about S3 consistency is correct as of 2021 and later?
- A) S3 provides eventual consistency for all operations
- B) S3 provides strong consistency only for GET operations
- C) S3 provides strong read-after-write consistency for all operations
- D) S3 consistency depends on the storage class

**Answer: C** — Since December 2020, S3 provides strong read-after-write consistency for PUTs, DELETEs, and list operations across all storage classes.

**Q3.** A bucket named `my_bucket_01` fails to be created. What is the most likely reason?
- A) The bucket already exists in another region
- B) The name contains an underscore, which is not allowed
- C) The name is too short
- D) Buckets can only be created from the AWS CLI

**Answer: B** — S3 bucket names must be lowercase letters, numbers, and hyphens only; underscores are not permitted in bucket names.

## What's Next

Next up: S3 Storage Classes — how to match cost to access patterns and move data automatically through tiers.