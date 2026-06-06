---
title: "S3 Overview: Buckets and Objects"
type: content
estimated_minutes: 14
cert_tags: ["SAA-C03", "CLF-C02"]
---

# S3 Overview: Buckets and Objects

## Overview

Amazon Simple Storage Service (S3) is the foundational object storage service on AWS — it is the place where data lives in the cloud before it is processed, after it is processed, and everywhere in between. S3 stores virtually unlimited data as discrete objects inside containers called buckets. Unlike databases, which impose schema constraints, or file systems, which organize data in directories, S3 treats every item as an independent object identified by a flat key. This architectural simplicity is what allows S3 to scale to exabytes while remaining fully managed.

S3 exists because the cloud computing model requires a durable, globally accessible, and cost-effective place to store data that is decoupled from any specific compute resource. Before services like S3, applications had to provision disk space on servers, size that disk at peak rather than average demand, and manually manage redundancy. S3 turns storage into an on-demand utility: you pay only for what you store, AWS handles replication and hardware failure, and your application treats storage as an API call rather than a server configuration.

Every AWS architect needs S3 fluency because almost every AWS service integrates with it. Lambda functions read configuration from S3. EC2 instances bootstrap from S3-hosted scripts. CloudFormation reads templates from S3. CloudFront serves content from S3 origins. Data lakes, ML pipelines, backups, static websites, and disaster recovery archives are all built on S3. Understanding how buckets, objects, URLs, consistency, and the flat namespace work is the prerequisite for understanding dozens of downstream AWS patterns.

## Core Concepts

### Object Storage vs. Block Storage vs. File Storage

AWS offers three storage paradigms, and choosing the wrong one is a common architectural mistake. Block storage (EBS) presents raw disk partitions that an operating system formats and mounts as a drive — it has low latency, allows random byte-level writes, and is required for databases and OS volumes. File storage (EFS, FSx) presents a POSIX-compatible shared file system that multiple compute instances can mount simultaneously — it is designed for workloads that expect a directory tree and shared file locks.

Object storage (S3) is neither of those. Objects are stored and retrieved as complete, immutable units. You cannot open an S3 object and change byte 512 without re-uploading the entire object. There is no mount point, no file locking, and no directory. What you gain is massive scalability, high durability through automatic redundancy, and the ability to access objects from any internet-connected client without managing servers. Object storage is the right choice when you are storing entire files — images, videos, documents, logs, archives — and accessing them by name rather than by byte offset.

### Buckets: The Globally Unique Namespace Container

A bucket is the top-level organizational container for objects in S3. Every bucket is created in a specific AWS Region — this is your data residency choice, and it is binding. Once created, the bucket's Region cannot be changed. Data written to a bucket in `us-west-2` stays in `us-west-2` data centers unless you explicitly configure Cross-Region Replication.

Bucket names occupy a single global namespace shared across every AWS account in every Region. This means you cannot create a bucket named `my-company-assets` if any other AWS customer has already used that name anywhere in the world. The naming rules exist precisely because bucket names appear in public DNS hostnames: names must be 3–63 characters, lowercase letters, numbers, and hyphens only — no underscores, no capital letters, no IP-address-format names like `192.168.1.1`. The global uniqueness requirement creates naming challenges for large organizations but ensures that every bucket URL is globally unambiguous without any routing prefix.

### Objects: Keys, Values, and Metadata

An object is the fundamental unit stored in S3. Every object has four components. The key is a UTF-8 string up to 1,024 bytes that uniquely identifies the object within its bucket — it is the full "path" like `reports/2024/q4/summary.pdf`. The value is the sequence of bytes that make up the data, from 0 bytes to a maximum of 5 TB per object. System metadata is automatically maintained by S3 and includes properties like `Content-Type`, `Content-Length`, `ETag` (an MD5-like fingerprint), and `Last-Modified`. User-defined metadata is an optional set of key-value string pairs you attach at upload time, useful for tagging objects with application-level attributes without embedding that information in the key name.

Objects over 100 MB should use the Multipart Upload API, which splits the object into parts uploaded in parallel and assembled by S3. Objects over 5 GB require multipart upload — it is not optional at that size. The AWS CLI automatically uses multipart upload for objects over a configurable threshold (default 8 MB), so in practice you rarely invoke the multipart API directly.

### The Flat Key Namespace and the "Folder" Illusion

S3 has no real directory structure. The key `images/logos/header.png` is a single string — S3 has no concept of a folder named `images` containing a folder named `logos`. The slash characters are part of the key name, not directory separators. The AWS Console and many tools render shared key prefixes as if they were folders, which is a UI convenience that obscures the underlying model.

This matters operationally. Deleting a "folder" in the Console does not atomically remove a directory entry — it lists all objects whose keys share the prefix and deletes each one individually. If a bucket contains 1 million objects under the `logs/` prefix and you "delete the folder," you are issuing 1 million delete requests. Understanding the flat namespace also helps you design key names for performance: S3 historically partitioned keyspace by prefix, so using random prefixes (hashes, dates) rather than sequential prefixes like `log-0001`, `log-0002` helps distribute I/O across partitions at high request rates.

### S3 URL Structure

Every S3 object is addressable via HTTPS using a path-style or virtual-hosted-style URL. The modern standard is virtual-hosted style: `https://bucket-name.s3.region.amazonaws.com/object-key`. For example, an object with key `images/cat.jpg` in a bucket named `media-assets-prod` in `us-east-1` is accessed at `https://media-assets-prod.s3.us-east-1.amazonaws.com/images/cat.jpg`. The bucket name is part of the hostname, not the path.

The older path-style URL format (`https://s3.amazonaws.com/bucket-name/key`) is deprecated and being phased out. Regional endpoints (`s3.us-east-1.amazonaws.com`) should be preferred over the global endpoint (`s3.amazonaws.com`) to avoid unnecessary cross-region latency and to ensure requests reach the correct Region. S3 also offers a static website endpoint (`bucket-name.s3-website-region.amazonaws.com`) when static website hosting is enabled, which differs from the regular endpoint in that it serves index documents and custom error pages.

### Strong Consistency (Added December 2020)

Before December 2020, S3 offered only eventual consistency for certain operations: a GET immediately after a PUT might return stale data, and a LIST might not include a recently created object. This forced distributed application developers to build retry logic and delay loops to handle the window where S3 might not reflect the latest state.

Since December 2020, S3 provides strong read-after-write consistency for all operations including GET, PUT, DELETE, HEAD, and LIST. A successful PUT guarantees that any subsequent GET on that key returns the new data. A successful DELETE guarantees that subsequent GETs return a 404. LIST operations reflect all previous successful PUT and DELETE operations. This change eliminates an entire category of race-condition bugs in S3-backed pipelines and means you can treat S3 with the same consistency expectations you would have for a local file system. Any exam material or study guide that describes S3 as eventually consistent is outdated.

### Durability, Availability, and the 11 Nines

S3 Standard achieves 99.999999999% (eleven nines) durability by automatically and synchronously storing objects redundantly across multiple devices in multiple Availability Zones within the chosen Region. To put this in context: eleven nines of durability means that if you stored 10 million objects, you would expect to lose one object every 10,000 years. Durability is about whether data survives long-term — it means AWS has multiple copies so that hardware failures, disk corruption, and even AZ outages do not result in data loss.

Availability (99.99% for S3 Standard) is different — it measures whether you can successfully make requests right now. A service can be highly durable but temporarily unavailable during a brief outage. S3 does not replicate across AWS Regions by default. An object in `eu-west-1` is protected against AZ failures in `eu-west-1` but is not automatically copied to any other Region. Cross-region durability requires you to configure S3 Cross-Region Replication explicitly.

## Configuration Reference

### AWS CLI: Create a Bucket

```bash
aws s3api create-bucket \
  --bucket my-company-assets-prod \        # Must be globally unique; lowercase, hyphens only
  --region us-west-2 \                     # Region where bucket and data will reside
  --create-bucket-configuration LocationConstraint=us-west-2
  # LocationConstraint is REQUIRED for any region other than us-east-1
  # us-east-1 is the default; omit LocationConstraint only when targeting us-east-1
```

### AWS CLI: Upload an Object

```bash
aws s3 cp ./report.pdf s3://my-company-assets-prod/reports/2024/q4/report.pdf \
  --storage-class STANDARD \              # Explicit storage class; defaults to STANDARD
  --metadata "project=q4-review,owner=finance" \  # User-defined metadata as key=value pairs
  --content-type "application/pdf"        # Sets the Content-Type system metadata header
```

### AWS CLI: Download an Object

```bash
aws s3 cp s3://my-company-assets-prod/reports/2024/q4/report.pdf ./local-report.pdf
# S3 cp works bidirectionally — s3:// source downloads, s3:// destination uploads
# For recursive downloads (all objects under a prefix):
aws s3 cp s3://my-company-assets-prod/reports/2024/ ./local-reports/ --recursive
```

### AWS CLI: List Bucket Contents

```bash
# High-level list — shows prefix-grouped "folders" and top-level objects
aws s3 ls s3://my-company-assets-prod/

# List all objects under a specific prefix, showing size and modified date
aws s3 ls s3://my-company-assets-prod/reports/2024/ --recursive --human-readable

# Low-level API list with continuation support for large buckets
aws s3api list-objects-v2 \
  --bucket my-company-assets-prod \
  --prefix "reports/2024/" \             # Filter to objects starting with this key prefix
  --max-items 100                        # Pagination size; use --starting-token for next page
```

### AWS CLI: Tag a Bucket

```bash
aws s3api put-bucket-tagging \
  --bucket my-company-assets-prod \
  --tagging 'TagSet=[{Key=Environment,Value=Production},{Key=CostCenter,Value=Engineering}]'
# Tags on the bucket are for cost allocation and resource organization
# Tags on objects (s3api put-object-tagging) are separate from bucket tags
```

### Console Walkthrough: Create a Bucket

Navigate to **S3** in the AWS Console. Click **Create bucket**.

**Bucket name**: Enter your globally unique name. The console validates naming rules in real time — an error appears immediately if you use uppercase, underscores, or a name that is already taken globally.

**AWS Region**: Select the Region where you want data to reside. This choice is permanent for the bucket. Choose based on latency to your application, data residency requirements, and the Region where your other services (EC2, Lambda) run.

**Object Ownership**: Leave as **ACLs disabled (recommended)** unless you have a specific legacy reason to use ACLs. This setting makes the bucket owner own all objects regardless of who uploaded them and disables the ACL system in favor of bucket policies.

**Block Public Access settings**: All four settings are enabled by default. Leave them all on unless this bucket will serve a public website or public downloads. These settings override any bucket policy or ACL that would grant public access.

**Bucket Versioning**: Enable versioning if you need protection against accidental deletion or overwrite. Versioning cannot be disabled once enabled — only suspended. Enable it now if there is any chance you will need it later, because you cannot retroactively version objects uploaded before versioning was enabled.

**Default encryption**: Select **Server-side encryption with Amazon S3 managed keys (SSE-S3)** for the simplest option. Choose **SSE-KMS** if you need audit trails of key usage, key rotation control, or cross-account key management. SSE-S3 is enabled by default on all new buckets as of January 2023.

Click **Create bucket**. The bucket appears in your S3 bucket list within seconds.

## How to Decide

Use this checklist when an exam scenario or real workload asks you to determine the right S3 configuration:

1. **Is the data storage requirement for complete files accessed by name?** If yes, S3 object storage is appropriate. If the workload requires random byte-level writes (database files, OS volumes), use EBS instead. If it requires a shared POSIX file system, use EFS.

2. **What are the data residency requirements?** Choose the AWS Region accordingly. S3 keeps data in the Region you select unless you explicitly configure replication. If you need multi-region redundancy, configure Cross-Region Replication; if you need local-only residency, document the chosen Region and enforce it with an SCP.

3. **Will the bucket ever need to be public?** If no, leave all Block Public Access settings enabled (the default). If yes (static website, public content delivery), you must explicitly disable BPA and add a public-access bucket policy — two deliberate steps by design.

4. **Does the workload need protection against accidental deletion or overwrite?** Enable versioning at bucket creation. Once objects are uploaded without versioning, they have no version history; you cannot retroactively protect them.

5. **Are objects larger than 100 MB?** Use multipart upload. The AWS CLI does this automatically; if you use an SDK directly, invoke the multipart upload API or use the managed upload helper methods.

6. **Does the application need immediate consistency after writes?** No special configuration is needed — S3 provides strong read-after-write consistency by default for all operations as of December 2020.

## How This Connects

- **EC2 and Auto Scaling**: EC2 user data scripts commonly pull configuration files and application artifacts from S3 at boot time, allowing instances to self-configure without baking state into AMIs. S3's regional durability means a bootstrap failure caused by storage unavailability is extraordinarily rare.

- **CloudFront**: CloudFront uses S3 buckets as origins for content delivery. The combination of S3 (durable origin store) and CloudFront (global edge caching) is the canonical pattern for high-performance static asset delivery at global scale.

- **Lambda and Event Notifications**: S3 can trigger Lambda functions on object creation, deletion, or restore events. This makes S3 the entry point for serverless data pipelines — files dropped into a bucket automatically invoke processing logic without polling.

- **Athena and data lakes**: Athena queries data stored in S3 directly using SQL. The flat key namespace and prefix-based organization of S3 maps to Athena's partition scheme. A well-organized S3 key structure (`/year=2024/month=04/day=15/`) translates directly to Athena partition pruning, dramatically reducing query cost and latency.

- **IAM and bucket policies**: S3 access control integrates deeply with IAM for identity-based policies and with resource-based bucket policies for cross-account and service-to-service patterns. Every S3 access decision runs through both policy types, making S3 a central example of AWS's layered authorization model.

## Exam Traps

**Trap 1: S3 is eventually consistent.** This was true before December 2020. As of that date, S3 provides strong read-after-write consistency for all operations. If an exam question describes a scenario requiring retry logic specifically for S3 consistency, the correct answer involves strong consistency — not eventually consistent workarounds. Discard any resource that says otherwise.

**Trap 2: Bucket names are region-specific.** Bucket names are globally unique across all AWS accounts and all Regions. You cannot create a bucket named `data-archive` in `us-east-1` if anyone anywhere has that bucket name in any Region. This is a flat global namespace, not a per-region namespace.

**Trap 3: Deleting a "folder" in S3 is a single atomic operation.** S3 has no real folders. Deleting a prefix in the console issues individual DELETE requests for every object under that prefix. For large prefixes, this can take significant time and consume DELETE request quota. Lifecycle expiration rules are more efficient for bulk deletion at scale.

**Trap 4: S3 data replicates across Regions by default.** S3 Standard replicates across multiple AZs within a single Region. It does NOT automatically replicate to other Regions. Cross-region redundancy requires explicitly configuring S3 Cross-Region Replication (CRR) and choosing a destination bucket in another Region.

**Trap 5: You can partially update an S3 object.** You cannot. S3 objects are immutable after upload. Updating a single byte requires downloading the full object, modifying it locally, and re-uploading the entire object. This is a fundamental characteristic of object storage and distinguishes it from block storage where byte-range writes are the norm.

## Summary

- S3 is AWS's managed object storage service, storing data as key-value objects in regional buckets with virtually no capacity limits.
- Bucket names are globally unique across all AWS accounts and all Regions; the Region chosen at creation time determines data residency permanently.
- Objects consist of a key (up to 1,024 bytes), a value (0 bytes to 5 TB), system metadata, and optional user-defined metadata; objects over 5 GB require multipart upload.
- S3 has no real directory structure — slashes in key names create the appearance of folders, but S3 is a flat namespace of keys within a bucket.
- Since December 2020, S3 provides strong read-after-write consistency for all operations — PUTs, DELETEs, and LISTs — eliminating the eventual-consistency race conditions present in earlier designs.
- S3 Standard achieves eleven nines (99.999999999%) of durability by synchronously replicating objects across multiple devices in multiple Availability Zones within the bucket's Region.

## Examples

A media startup stores user-uploaded profile photos in S3. Each photo is an object with a key like `users/12345/avatar.jpg`, a value containing the image bytes, and system metadata like `Content-Type: image/jpeg`. The application never manages storage servers, never pre-allocates disk space, and never worries about what happens if a single hard drive fails. This is the textbook bucket-and-object model: the "folder" in the key is an illusion — S3 has no real directories, just a flat namespace of keys inside a bucket, and the startup gets 11 nines of durability without any storage administration.

A regional bank wants to store loan application documents and must guarantee the data never leaves their chosen AWS Region to satisfy data sovereignty regulations. When they create their S3 bucket in `us-east-1` and do nothing else, that data stays in `us-east-1` by default — no additional configuration needed for regional containment. The bank's compliance team can reference this as a built-in control: S3 regional data residency is the default behavior, not an add-on feature, and it satisfies many data sovereignty requirements without extra configuration. If they later want a disaster recovery copy in another Region, they would explicitly configure Cross-Region Replication, making the cross-region movement a deliberate opt-in rather than a silent default.

A data engineering team writes a distributed pipeline where one service writes processed results to S3 and a downstream service reads those results within milliseconds. Before December 2020, the team maintained a retry loop with exponential backoff because S3 offered only eventual consistency — a fresh GET immediately after a PUT could return stale data or a 404. After AWS's 2020 consistency upgrade, the team removed 80 lines of retry boilerplate. The downstream reader now issues a GET immediately after the upstream writer's PUT completes, and the result is guaranteed to reflect the new data. Understanding this change is important on the exam: scenarios that describe S3 read-after-write failures are testing outdated knowledge.

## Think About It

1. Why does S3 use a flat key namespace instead of a real directory tree, and what does that mean for operations like "delete a folder"? How would you write a script to safely delete all objects under a prefix without accidentally deleting objects outside it?

2. What would happen if two applications issued concurrent PUTs to the same S3 key at exactly the same millisecond? Which version wins, and how would you design around this if your application requires deterministic last-writer-wins behavior?

3. S3 offers 11 nines of durability but only 99.99% availability. What is the difference between durability and availability? Can you construct a scenario where data is perfectly durable but temporarily unavailable, and how would your application handle that?

4. Bucket names are globally unique across all AWS accounts. What organizational problems does this create for a large enterprise with 50 teams all wanting a bucket named `artifacts`? How would you design a bucket naming convention that scales across teams without collisions and conveys ownership?

5. A developer proposes storing a 6 TB dataset as one object per record versus storing the entire dataset as a single 6 TB file. What trade-offs in retrieval cost, parallelism, partial access, and downstream processing would drive that key design decision?

## Quick Check

**Q1.** What is the maximum size of a single S3 object?

- A) 100 MB
- B) 5 GB
- C) 5 TB
- D) Unlimited

**Answer: C** — A single S3 object can be up to 5 TB. Objects between 100 MB and 5 GB can technically use single-part upload but should use multipart for performance; objects over 5 GB require multipart upload and cannot be uploaded as a single part.

**Q2.** Which statement about S3 consistency is correct as of 2021 and later?

- A) S3 provides eventual consistency for all operations
- B) S3 provides strong consistency only for GET operations on newly created objects
- C) S3 provides strong read-after-write consistency for all operations including LIST
- D) S3 consistency model depends on the selected storage class

**Answer: C** — Since December 2020, S3 provides strong read-after-write consistency for PUTs, DELETEs, and list operations across all storage classes. Any answer describing eventual consistency for S3 reflects the pre-2020 model and is no longer correct.

**Q3.** A bucket named `my_bucket_01` fails to be created. What is the most likely reason?

- A) The bucket name already exists in the same AWS Region under a different account
- B) The name contains an underscore, which is not permitted in S3 bucket names
- C) The name is too short at under 10 characters
- D) Buckets can only be created using the AWS CLI, not through other methods

**Answer: B** — S3 bucket names must consist of lowercase letters, numbers, and hyphens only. Underscores are explicitly prohibited by the naming rules, because bucket names appear in DNS hostnames where underscores are invalid characters.

## What's Next

Next up: S3 Storage Classes — how to match storage cost to access patterns and automate data movement through tiers using Lifecycle policies.
