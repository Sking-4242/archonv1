---
title: "S3 Performance Optimization"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# S3 Performance Optimization

## Overview

S3 is built to scale automatically, but "automatically" does not mean "infinitely, regardless of how you design your key namespace and upload patterns." The S3 performance model is based on prefixes: each unique prefix in a bucket independently supports up to 3,500 PUT/COPY/POST/DELETE requests per second and 5,500 GET/HEAD requests per second. If all of your objects share the same prefix — for example, every key starts with `data/` — you are constrained by a single prefix's quota. If you spread objects across dozens of prefixes, each prefix contributes its own quota and your total throughput scales linearly.

For large objects, single-threaded sequential PUT requests are the bottleneck. Multipart upload breaks a large file into independently uploadable parts that can be sent in parallel across multiple connections. This is not just a performance feature — for objects larger than 5 GB, multipart upload is required by the S3 API. For objects over 100 MB, it is strongly recommended because the parallel upload benefit is significant and because failed parts can be retried individually without restarting the entire upload. Byte-range fetches apply the same parallel principle to downloads: instead of streaming an entire object sequentially, multiple threads each request a different byte range, fully utilizing available bandwidth.

For workloads where data must travel across continents or congested internet paths, S3 Transfer Acceleration routes uploads through the nearest CloudFront edge location and then over AWS's private, optimized backbone network to the destination bucket. This sidesteps congested public internet paths and can dramatically improve upload speeds for geographically distributed users. At the analytics layer, S3 Select and Glacier Select push SQL filtering into the S3 service itself so that only matching rows — not the entire object — traverse the network, turning what would be a multi-GB download into a targeted extraction of exactly the data your application needs.

## Core Concepts

### Per-Prefix Request Rate Scaling

S3 scales throughput per prefix, not per bucket. A prefix is simply the portion of the key before the last `/` separator — or any consistent leading substring you treat as a partition boundary. The limits are:

- **3,500 requests/second** for write operations: PUT, COPY, POST, DELETE
- **5,500 requests/second** for read operations: GET, HEAD

These are per-prefix, per-second, per-bucket. If you need 22,000 GET/s, you need at least four prefixes with objects distributed across them. The prefix does not need to be meaningful — a two-character hash prefix (e.g., `a3/`, `7f/`, `c1/`) is enough to distribute load. Modern S3 auto-partitions better than it did a few years ago, but for predictably high-throughput workloads, explicit prefix distribution remains the right design.

Why per-prefix? Internally, S3 uses the prefix as a sharding dimension. Objects under different prefixes can be served by different S3 partitions. Concentrating everything under one prefix means all requests compete for the same internal partition's capacity.

### Multipart Upload

Multipart upload splits an object into parts that are uploaded independently and reassembled by S3 after all parts are confirmed. Key rules:

- Each part (except the last) must be at least **5 MB**
- Maximum part count: **10,000 parts**
- Maximum individual part size: **5 GB**
- Objects larger than **5 GB require** multipart upload — single PUT is not allowed
- Objects larger than **100 MB should use** multipart upload for performance

The workflow has three API calls: `CreateMultipartUpload` (returns an upload ID), one `UploadPart` per part (each returns an ETag), and `CompleteMultipartUpload` (assembles the final object using the upload ID and ETag list). If a part upload fails, only that part is retried — not the entire file. This is critical for multi-gigabyte files over unreliable connections.

**Operational trap**: If `CompleteMultipartUpload` is never called (application crash, unhandled exception), the uploaded parts remain in the bucket and accumulate storage charges. You cannot see incomplete multipart uploads with a normal `ListObjects`. Configure a lifecycle rule with `AbortIncompleteMultipartUploads` set to expire after 7 days to automatically clean up orphaned parts.

### S3 Transfer Acceleration

Transfer Acceleration routes uploads through CloudFront edge locations instead of directly to the S3 endpoint in the bucket's region. The upload enters the nearest edge PoP, then travels over AWS's private, high-bandwidth backbone to the S3 bucket. This works because the public internet path between a client and a distant AWS region can be slow and variable, but the AWS backbone between edge locations and S3 is consistently fast.

Transfer Acceleration is per-bucket — you enable it on the bucket and the bucket gets a new hostname: `bucketname.s3-accelerate.amazonaws.com`. All uploads to that hostname use acceleration; uploads to the standard endpoint do not. There is an additional per-GB charge (approximately $0.04/GB for acceleration traffic). AWS provides a speed comparison tool at `s3-accelerate-speedtest.s3-accelerate.amazonaws.com` that lets you measure actual improvement before paying for it. If the test shows less than 20% improvement, Transfer Acceleration is unlikely to be worth the cost for that particular route.

### Byte-Range Fetches

A byte-range fetch uses the standard HTTP `Range` header to request only a specific portion of an object. S3 supports this on any object and any storage class. The primary use cases are:

1. **Parallel download**: Split a large object into N ranges, launch N threads each downloading a different range, reassemble client-side. Full bandwidth utilization.
2. **Header extraction**: Request only the first few hundred bytes of a file to read a file header (TIFF, HDF5, Parquet footer) without downloading the entire object.
3. **Resume-capable downloads**: Record the last downloaded byte offset and resume from there after a connection failure.

Byte-range fetches do not require any bucket configuration — it is a client-side technique using a standard HTTP feature.

### S3 Select and Glacier Select

S3 Select lets you run a SQL expression against a single S3 object and receive only the matching subset of data. Instead of: download entire 50 GB CSV → filter locally → discard 99% of the data, you do: send SQL to S3 → receive matching rows. The computation runs inside S3's infrastructure; you pay for the data scanned and the data returned, both of which are metered separately.

Supported formats: CSV, JSON, Parquet. Supported compression: GZIP and BZIP2 (on CSV and JSON). Parquet is natively columnar so S3 Select can skip entire column groups not referenced in your SQL.

Glacier Select works the same way against objects in S3 Glacier — you submit a query job rather than a real-time API call because Glacier retrieval is asynchronous.

S3 Select is not a replacement for Athena. It operates on one object at a time and supports a limited SQL subset. For querying across thousands of objects in a data lake, Athena (or Redshift Spectrum) is the right tool.

### S3 Batch Operations

Batch Operations lets you run a single action across millions of S3 objects by submitting a job with a manifest. Supported operations include: copy, invoke Lambda, restore from Glacier, apply tags, apply ACL, and replicate (for backfilling existing objects to a replication destination). Batch Operations reports per-object success/failure to a result bucket so you have a full audit trail.

## Configuration Reference

### Enable Transfer Acceleration

```bash
# Enable Transfer Acceleration on the bucket
aws s3api put-bucket-accelerate-configuration \
  --bucket my-bucket \
  --accelerate-configuration Status=Enabled
# After this, uploads to my-bucket.s3-accelerate.amazonaws.com use acceleration

# Verify the setting
aws s3api get-bucket-accelerate-configuration \
  --bucket my-bucket
# Output: {"Status": "Enabled"}

# Upload using the accelerated endpoint (AWS CLI respects the setting automatically
# when you add --endpoint-url, or use the --sse flag with the accelerate endpoint)
aws s3 cp largefile.zip s3://my-bucket/ \
  --endpoint-url https://s3-accelerate.amazonaws.com
# Alternatively, configure the AWS CLI profile to use Transfer Acceleration by default
```

### Multipart Upload — Full Lifecycle

```bash
# Step 1: Initiate the multipart upload, get back an UploadId
aws s3api create-multipart-upload \
  --bucket my-bucket \
  --key "videos/raw/film-4k.mp4" \
  --storage-class STANDARD
# Response includes "UploadId": "VXBsb2FkIElEIGZvciA2aWWpbmcncyBteS1tb3ZpZS5tMnRz"
# Save this UploadId — you need it for every subsequent call

# Step 2: Upload each part (repeat for every part, tracking part number and ETag)
# Part numbers must be 1–10000; parts can be uploaded in any order or in parallel
aws s3api upload-part \
  --bucket my-bucket \
  --key "videos/raw/film-4k.mp4" \
  --upload-id "VXBsb2FkIElEIGZvciA2aWWpbmcncyBteS1tb3ZpZS5tMnRz" \
  --part-number 1 \
  --body part-001.bin
# Response: {"ETag": "\"d8e8fca2dc0f896fd7cb4cb0031ba249\""}
# Store each part number + ETag — required for the CompleteMultipartUpload call

# Step 3: Complete the upload — assembles the final object from parts
aws s3api complete-multipart-upload \
  --bucket my-bucket \
  --key "videos/raw/film-4k.mp4" \
  --upload-id "VXBsb2FkIElEIGZvciA2aWWpbmcncyBteS1tb3ZpZS5tMnRz" \
  --multipart-upload '{
    "Parts": [
      {"PartNumber": 1, "ETag": "\"d8e8fca2dc0f896fd7cb4cb0031ba249\""},
      {"PartNumber": 2, "ETag": "\"b026324c6904b2a9cb4b88d6d61c81d1\""},
      {"PartNumber": 3, "ETag": "\"26ab0db90d72e28ad0ba1e22ee510510\""}
    ]
  }'
# Parts must be listed in ascending PartNumber order
# S3 assembles the final object and makes it available immediately

# Abort an incomplete multipart upload (manual cleanup)
aws s3api abort-multipart-upload \
  --bucket my-bucket \
  --key "videos/raw/film-4k.mp4" \
  --upload-id "VXBsb2FkIElEIGZvciA2aWWpbmcncyBteS1tb3ZpZS5tMnRz"
# Best practice: configure a lifecycle rule to auto-abort after N days
```

### Lifecycle Rule to Auto-Abort Incomplete Multipart Uploads

```json
// lifecycle-abort-incomplete-mpu.json
{
  "Rules": [
    {
      "ID": "abort-incomplete-multipart-uploads",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      // Empty prefix = applies to all objects in the bucket

      "AbortIncompleteMultipartUploads": {
        "DaysAfterInitiation": 7
        // Any multipart upload not completed within 7 days is automatically aborted
        // and its parts are deleted, preventing ongoing storage charges
      }
    }
  ]
}
```

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket my-bucket \
  --lifecycle-configuration file://lifecycle-abort-incomplete-mpu.json
```

### Byte-Range GET Request

```bash
# Download bytes 0–9999999 (first ~10 MB) of a large object
aws s3api get-object \
  --bucket my-bucket \
  --key "datasets/large-dataset.parquet" \
  --range "bytes=0-9999999" \
  part-000.bin
# The --range parameter maps directly to the HTTP Range header
# Response includes Content-Range: bytes 0-9999999/5368709120

# Read only the Parquet file footer (last 8 bytes contain the magic number,
# preceding bytes contain row group metadata) to inspect schema without full download
aws s3api get-object \
  --bucket my-bucket \
  --key "datasets/large-dataset.parquet" \
  --range "bytes=-8" \
  footer.bin
# bytes=-8 is a suffix range: last 8 bytes of the object
```

### S3 Select Query

```bash
# Filter a CSV file server-side — retrieve only rows where status = 'ERROR'
aws s3api select-object-content \
  --bucket my-bucket \
  --key "logs/app-2024-01-15.csv.gz" \
  --expression "SELECT * FROM S3Object WHERE status = 'ERROR'" \
  --expression-type SQL \
  --input-serialization '{
    "CSV": {
      "FileHeaderInfo": "USE",
      "FieldDelimiter": ",",
      "RecordDelimiter": "\n"
    },
    "CompressionType": "GZIP"
  }' \
  --output-serialization '{
    "CSV": {
      "FieldDelimiter": ",",
      "RecordDelimiter": "\n"
    }
  }' \
  /tmp/errors-only.csv
# S3 decompresses the GZIP, evaluates the SQL expression,
# and streams only matching rows back to the client
# Data scanned and data returned are billed separately

# S3 Select also works on JSON (Lines format) and Parquet
aws s3api select-object-content \
  --bucket my-bucket \
  --key "events/2024-01-15.json" \
  --expression "SELECT s.userId, s.eventType FROM S3Object s WHERE s.eventType = 'purchase'" \
  --expression-type SQL \
  --input-serialization '{"JSON": {"Type": "LINES"}}' \
  --output-serialization '{"JSON": {"RecordDelimiter": "\n"}}' \
  /tmp/purchases.json
```

## How to Decide

| Problem | Solution | Why |
|---|---|---|
| Single prefix receiving > 5,500 GET/s | Distribute keys across multiple prefixes | S3 quota is per-prefix; more prefixes = more capacity |
| Uploading objects > 5 GB | Multipart upload (required) | S3 API enforces this — single PUT fails above 5 GB |
| Uploading objects > 100 MB | Multipart upload (recommended) | Parallel parts saturate bandwidth; failed parts retry cheaply |
| Users in Asia uploading to us-east-1 bucket | Transfer Acceleration | Routes via nearest edge PoP over AWS backbone |
| Downloading 20 GB file as fast as possible | Byte-range fetches (parallel threads) | Multiple threads each pull a range simultaneously |
| Reading 10 rows from a 50 GB CSV | S3 Select | Only matching rows transfer; saves egress and compute |
| Querying across 10,000 CSV files | Athena, not S3 Select | S3 Select is per-object; Athena spans entire prefixes |
| Large-scale object operation (tag, copy, replicate millions) | S3 Batch Operations | Single job with manifest; auditable per-object results |
| Incomplete MPU parts accumulating silently | Lifecycle: AbortIncompleteMultipartUploads | Auto-cleans orphaned parts before they accumulate charges |

## How This Connects

- **S3 Replication (Lesson 05)**: Large objects being replicated cross-region also benefit from multipart upload — replication internally uses parallel part transfers for efficiency. Batch Operations for backfilling existing objects is the same service used for large-scale S3 Select or tag operations.
- **S3 Event Notifications (Lesson 07)**: A Batch Operations job can invoke Lambda on each object at scale, bridging bulk operations and event-driven processing.
- **CloudFront (Module 10)**: Transfer Acceleration uses CloudFront edge infrastructure for the ingress path. CloudFront itself is the read-side counterpart — caching S3 objects at the edge for low-latency GET performance globally.
- **EC2 and Network (Module 07)**: Byte-range fetches are most valuable when EC2 instances are processing large S3 objects. Instance network bandwidth, not S3 API limits, is often the bottleneck for in-region access.
- **Cost Optimization**: S3 Select charges per GB scanned and per GB returned. For workloads where you consistently read a small fraction of a large object, S3 Select directly reduces both data transfer costs and downstream compute costs compared to full-object download and client-side filtering.

## Exam Traps

1. **"Objects over 100 MB require multipart upload."** False — the 100 MB threshold is a recommendation, not a requirement. The hard requirement is 5 GB: objects larger than 5 GB cannot be uploaded with a single PUT. Objects between 100 MB and 5 GB can technically use single PUT but should use multipart for reliability and speed.

2. **"Transfer Acceleration uses Route 53 for routing."** False. Transfer Acceleration routes uploads through CloudFront edge locations. Route 53 is the DNS service; it is not involved in Transfer Acceleration's traffic routing. MRAP (Multi-Region Access Points) uses Global Accelerator, which is yet another distinct service.

3. **"S3 Select can query across multiple objects in one call."** False. S3 Select operates on exactly one object per API call. If you need to query across many objects in a data lake, use Athena (which uses S3 Select internally, per-object, but abstracts the iteration and parallelism).

4. **"S3 scales throughput per bucket."** Misleading. The unit of throughput scaling is the prefix, not the bucket. A bucket can have effectively unlimited throughput if objects are distributed across enough prefixes. Concentrating everything under one prefix creates a bottleneck regardless of how large or well-provisioned the bucket is.

5. **"Orphaned multipart upload parts don't cost anything until the upload is completed."** False. Parts uploaded to S3 as part of an incomplete multipart upload are billed for storage immediately, even if `CompleteMultipartUpload` is never called. Without a lifecycle rule to abort incomplete uploads, orphaned parts silently accumulate charges indefinitely.

## Summary

- S3 throughput scales per prefix: 3,500 write requests/sec and 5,500 read requests/sec per prefix. Distribute keys across prefixes to multiply total throughput.
- Multipart upload is required for objects > 5 GB and recommended for objects > 100 MB. Parts upload in parallel; failed parts retry individually without restarting the entire upload.
- Incomplete multipart uploads accumulate storage charges silently. Always configure an `AbortIncompleteMultipartUploads` lifecycle rule.
- Transfer Acceleration routes uploads through CloudFront edge locations and the AWS backbone — measurable benefit for users far from the bucket region; additional per-GB cost.
- Byte-range fetches enable parallel downloads and partial object retrieval using the standard HTTP `Range` header — no bucket configuration required.
- S3 Select runs SQL against a single object server-side (CSV, JSON, Parquet) and returns only matching data, reducing transfer cost and latency for selective reads.

## Examples

A video production company uploads raw footage files averaging 8 GB each from editing suites in Los Angeles, London, and Tokyo to a central S3 bucket in `us-east-1`. Their upload client breaks each file into 500 MB parts and uploads up to 10 parts in parallel. A dropped network connection in Tokyo mid-upload doesn't discard the work — only the in-flight part is retried. They also enable Transfer Acceleration so uploads from London and Tokyo enter nearby CloudFront edge PoPs before traveling over AWS's backbone. Without Transfer Acceleration, a Tokyo editor uploading over the public internet to Virginia averaged 45 minutes per file. With it, the same upload takes under 12 minutes because the public internet leg is reduced to the short hop from the studio to the nearest edge PoP in Tokyo.

A data analytics team runs nightly jobs against a 50 GB JSON log file compressed with GZIP stored in S3. Their original approach was to download the full file to an EC2 instance and filter locally — roughly 40 minutes of download time per job before any processing began. They rewrote the job to use S3 Select with a SQL expression targeting only `level = 'ERROR'` records. The matching records are typically 300–600 MB. Download time dropped from 40 minutes to under 2 minutes. They pay for 50 GB scanned per job plus the returned data — the cost is higher than a pure GET on a small file, but far lower than the EC2 time that was previously bottlenecked on a 40-minute download.

A gaming company's leaderboard service stores player score records as objects with keys under a single prefix `scores/`. At peak hours, their read traffic exceeds 30,000 GET requests per second and the single prefix becomes a bottleneck. They redesign the key structure: instead of `scores/player-{uuid}`, they switch to `{first-2-chars-of-uuid}/scores/player-{uuid}` — a hash-based prefix distribution that spreads load across 256 possible two-character hex prefixes. Each prefix now handles well under 5,500 requests/second at peak. No S3 configuration change is needed; the fix is purely in how keys are named. Read latency at p99 drops from 180 ms to 22 ms because requests are no longer competing for a single internal S3 partition.

## Think About It

1. S3 scales throughput per prefix, not per bucket. If all objects share the same prefix, what is the maximum theoretical GET throughput? How would you redesign the key structure to achieve 100,000 GET/s, and what operational trade-offs does that create for prefix-based listing operations?

2. Multipart upload requires a `CompleteMultipartUpload` API call. What happens to uploaded parts if your application crashes before sending that final call? How would you detect orphaned uploads programmatically, and what lifecycle rule would you set to auto-clean them?

3. Byte-range fetches enable parallel downloads of the same object. What types of file formats benefit most from byte-range access? Are there file formats where byte-range access would require understanding internal structure (like Parquet footers) before issuing meaningful range requests?

4. Transfer Acceleration adds per-GB cost and routes through CloudFront. Under what geographic or network conditions would you expect Transfer Acceleration to provide little or no benefit, even for distant users? How would you use the AWS speed comparison tool to validate your hypothesis before enabling it?

5. How would you decide between optimizing an S3-heavy read workload using prefix distribution, Transfer Acceleration, or a read-through cache like CloudFront? What workload characteristics — request patterns, object sizes, geography, cache hit rates — would guide each choice?

## Quick Check

**Q1.** A company needs to upload a 12 GB file to S3. What upload method is required by the S3 API?
- A) Standard single PUT request
- B) Multipart upload
- C) Transfer Acceleration
- D) S3 Batch Operations

**Answer: B** — The S3 API does not permit single PUT requests for objects larger than 5 GB. Multipart upload is required. Transfer Acceleration affects routing, not the upload method; Batch Operations is for bulk actions on existing objects.

**Q2.** An S3 bucket receives 20,000 GET requests per second, all targeting keys under the prefix `logs/2024/`. Latency is degrading. What is the most effective fix?
- A) Enable Transfer Acceleration on the bucket
- B) Switch the storage class to S3 Standard-IA
- C) Distribute keys across multiple prefixes so no single prefix exceeds the per-prefix GET limit
- D) Enable S3 Intelligent-Tiering to reduce request overhead

**Answer: C** — S3 supports ~5,500 GET/s per prefix. Concentrating 20,000 requests/second under one prefix creates a bottleneck that prefix distribution directly resolves by multiplying available capacity. Storage class changes do not affect request rate limits.

**Q3.** What is the minimum part size for a multipart upload part (except for the last part)?
- A) 1 MB
- B) 5 MB
- C) 100 MB
- D) 500 MB

**Answer: B** — Each multipart upload part (except the final one) must be at least 5 MB. This is enforced by the S3 API. The 100 MB threshold is the recommended minimum file size for using multipart upload, not the part size itself.

## What's Next

Next up: S3 Event Notifications — triggering Lambda, SQS, SNS, and EventBridge from bucket events, and S3 Object Lambda for on-the-fly data transformation.
