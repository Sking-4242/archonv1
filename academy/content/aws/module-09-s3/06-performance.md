---
title: "S3 Performance Optimization"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "SAP-C02"]
---

# S3 Performance Optimization

## Overview

S3 scales automatically to high request rates, but understanding the underlying performance model helps you design uploads and retrieval for maximum throughput. This lesson covers multipart upload, byte-range fetches, Transfer Acceleration, and how to maximize S3 request throughput.

## S3 Request Rate Scaling

S3 automatically scales to handle high request rates per prefix. Each prefix in a bucket supports at least 3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second. By spreading objects across multiple prefixes (e.g., using a hash prefix on the key), you can multiply your total throughput linearly. This prefix-per-3,500-rps model is fundamental for high-throughput workloads.

## Multipart Upload

For objects larger than 100 MB, use multipart upload: divide the object into parts (minimum 5 MB each, up to 10,000 parts), upload parts in parallel, then complete the upload to assemble the final object. Benefits: faster throughput via parallel uploads, ability to resume failed uploads, and the ability to begin uploading before you know the final object size. Objects over 5 GB require multipart upload.

## Byte-Range Fetches

Instead of downloading an entire object, you can request specific byte ranges using the `Range` HTTP header. This enables parallel downloads of different parts of the same object, and lets you retrieve just the header of a file to check metadata. Combine byte-range fetches with multiple threads to maximize download throughput.

## S3 Transfer Acceleration

Transfer Acceleration routes uploads through CloudFront's edge network. Instead of uploading directly to the S3 bucket's region, data enters the nearest CloudFront edge PoP and travels to S3 over AWS's high-throughput backbone. This improves speeds when users are far from the bucket region. There's an additional per-GB cost; measure your actual improvement before enabling.

## Summary

S3 scales per-prefix to thousands of requests/second. Use multipart upload for large files, byte-range fetches for parallel downloads, and spread keys across prefixes for write-heavy workloads. Transfer Acceleration helps geographically distributed users upload faster over the AWS backbone.

## What's Next

Next up: S3 Event Notifications — triggering Lambda, SQS, and SNS from bucket events.