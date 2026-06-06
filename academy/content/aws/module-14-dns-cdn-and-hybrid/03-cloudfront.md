---
title: "Amazon CloudFront: CDN and Edge Caching"
type: content
estimated_minutes: 14
cert_tags: ["CLF-C02", "SAA-C03", "SAP-C02"]
---

# Amazon CloudFront: CDN and Edge Caching

## Overview

Amazon CloudFront is AWS's global Content Delivery Network — a network of 600+ Points of Presence (PoPs) distributed across 100+ cities in 50+ countries. When a user in Tokyo requests your application, CloudFront serves the response from a PoP in Tokyo rather than from your origin server in us-east-1. The round-trip latency drops from 200ms to 5ms. For cached content, the origin never sees the request at all.

CloudFront exists because the internet is geographically large and physically slow. The speed of light is not negotiable — a packet from New York to Sydney takes at minimum 80ms just to traverse the distance. CloudFront moves copies of your content to the edges of the internet, near your users, so most requests never need to make that long journey. For content that can be cached (images, videos, JavaScript, CSS, API responses), CloudFront turns global latency into local latency. For content that cannot be cached (user-specific dynamic responses), CloudFront still helps by routing requests over the AWS private backbone rather than the unpredictable public internet.

For the CCP exam, understand what CloudFront does (CDN, edge caching, global distribution) and its basic components (distributions, origins, edge locations). For the SAA exam, the depth extends to cache behaviors, Origin Access Control, Lambda@Edge vs. CloudFront Functions, Origin Groups for failover, and security integration with WAF and Shield.

---

## Core Concepts

### Distributions, Origins, and Behaviors

A **CloudFront distribution** is the configuration object that defines how CloudFront delivers your content. Every distribution has:

- **Origins**: where CloudFront fetches content when it's not cached. Supported origins: S3 buckets, Application Load Balancers, EC2 instances, API Gateway, or any publicly accessible HTTP/HTTPS server (including on-premises).
- **Cache behaviors**: rules that determine how CloudFront handles requests matching specific URL patterns. Each behavior specifies: which origin to use, TTL settings, what to include in the cache key (query strings, headers, cookies), viewer protocol policy (HTTP only, redirect to HTTPS, or HTTPS only), and compression settings.
- **Default behavior**: the fallback that applies to requests not matched by any other behavior pattern.

When a user requests a URL, CloudFront evaluates behaviors in precedence order (most specific path pattern first), then either serves from edge cache or fetches from the configured origin.

---

### How Caching Works: Cache Keys and TTL

CloudFront's caching logic is built around the **cache key** — the set of request attributes that determine whether two requests share a cached response. By default, the cache key is just the URL path (`/images/logo.png`). Two requests for the same URL path hit the same cache entry.

You can extend the cache key to include query strings, HTTP headers, and cookies. This enables serving different cached content to different users (e.g., cache by `Accept-Language` header to serve localized content from cache). The trade-off: more cache key components = lower cache hit ratio, because more combinations result in more distinct cache entries.

**TTL (Time to Live)** controls how long CloudFront keeps a cached object before checking the origin for a fresher version. Longer TTL = better cache hit ratio = fewer origin requests. Shorter TTL = more current content = more origin requests and cost.

**Cache hit ratio** is the percentage of requests served from CloudFront's cache without going to the origin. A ratio above 90% is generally good. Low cache hit ratios indicate either: short TTLs, highly dynamic content with unique cache keys, or cache keys that are too broad/narrow. CloudFront reports this metric in CloudWatch.

---

### Cache Invalidation vs. Versioned File Names

When you update content on your origin, CloudFront continues serving the old cached version until the TTL expires. To force CloudFront to fetch fresh content before TTL:

**Option 1 — Cache Invalidation**: Submit an invalidation request specifying path patterns (e.g., `/images/*` or `/app.js`). CloudFront removes those objects from all edge caches. Charged per invalidation path after the first 1,000 paths per month. Takes 1–5 minutes to propagate to all edges.

**Option 2 — Versioned file names** (recommended): Build your deployment pipeline to append a version hash to static asset filenames (`app.a3f9b2.js`, `styles.b8c4d1.css`). When the file changes, the hash changes, and CloudFront treats it as a completely new object — no cache to invalidate, instant propagation, zero cost. This is the industry-standard approach for web asset deployment.

For HTML files that reference hashed assets, use short TTLs (60–300 seconds) or no-cache headers, since the HTML must reflect the latest asset filenames. For the hashed assets themselves, set TTL to one year — they never change by definition.

---

### Origin Access Control (OAC): Keeping S3 Buckets Private

When using an S3 bucket as a CloudFront origin, you want CloudFront to be the only entity that can read from the bucket — not the public internet. **Origin Access Control (OAC)** is the mechanism for this:

1. Create an OAC in CloudFront settings
2. Attach it to the S3 origin in your distribution
3. Update the S3 bucket policy to allow `s3:GetObject` from the CloudFront service principal (with your distribution's ARN as a condition)
4. Set the bucket's Block Public Access to block all public access

With OAC configured, direct S3 URL requests (`s3.amazonaws.com/mybucket/file.jpg`) are blocked. Only requests routed through CloudFront succeed. This protects your content and prevents users from bypassing CloudFront (and its caching, security rules, and cost) by accessing S3 directly.

OAC replaced the older Origin Access Identity (OAI) mechanism. OAC supports SSE-KMS encrypted buckets (OAI did not), supports all S3 regions, and is the current recommended approach.

---

### Lambda@Edge and CloudFront Functions

CloudFront supports executing code at edge locations to transform requests and responses before they reach the origin or the user:

**CloudFront Functions**: lightweight JavaScript functions that run at sub-millisecond execution time at every CloudFront edge location. Designed for simple, high-volume transformations:
- URL normalization and rewriting (remove trailing slashes, canonicalize paths)
- Request header manipulation (add security headers, remove sensitive headers)
- Simple redirects (country-based redirect based on `CloudFront-Viewer-Country` header)
- Cache key normalization (normalize query string parameter order)

Limitations: JavaScript only, no network access, no file system access, 2MB code limit, 1ms maximum execution time.

**Lambda@Edge**: full Lambda functions (Node.js or Python) that run at CloudFront Regional Edge Caches (not at every PoP, but at ~13 regional locations close to users). More powerful and flexible:
- A/B testing (modify request based on user cohort cookie)
- JWT authentication and authorization before request reaches origin
- Dynamic content personalization based on user attributes
- Database queries or external API calls (network access available)
- Complex URL routing logic

Lambda@Edge runs at 4 event types: Viewer Request (before CloudFront checks cache), Origin Request (after cache miss, before hitting origin), Origin Response (after origin response, before caching), Viewer Response (before returning to user).

**Choosing between them**: CloudFront Functions for anything simple, cheap, and high-volume. Lambda@Edge for anything requiring network access, complex logic, or more than 1ms execution time. Lambda@Edge is ~6× more expensive than CloudFront Functions.

---

### Security Integration: HTTPS, WAF, and Shield

**HTTPS and TLS**: CloudFront terminates HTTPS at the edge. For custom domain names, you must provision an ACM certificate **in us-east-1** — this is a hard requirement regardless of where your origin or users are. CloudFront is a global service that pulls certificates from us-east-1 only.

**AWS WAF**: attach a WAF Web ACL to a CloudFront distribution to filter malicious requests at the edge before they reach your origin. WAF rules run on every edge PoP — bots, SQL injection, XSS, and rate-limited IPs are blocked globally before touching your servers.

**AWS Shield**: CloudFront automatically includes Shield Standard, providing always-on DDoS mitigation at the network and transport layer. Shield Advanced can be added for higher-level protection with SRT (Shield Response Team) support.

**Signed URLs and Signed Cookies**: restrict access to private CloudFront content by requiring a cryptographic signature on each request. Signed URLs control access to individual objects; Signed Cookies control access to multiple files (e.g., all content in `/premium/`). Use cases: paid media delivery, time-limited download links, gated access to video content.

---

## Configuration Reference

### Creating a CloudFront Distribution via the Console

1. Navigate to **CloudFront** → **Create distribution**
2. **Origin settings**:
   - Origin domain: select your S3 bucket or enter your ALB/API Gateway URL
   - For S3: set Origin access → Origin access control settings (OAC) → Create new OAC
   - Protocol: HTTPS only for ALB origins
3. **Default cache behavior**:
   - Viewer protocol policy: Redirect HTTP to HTTPS (recommended)
   - Cache policy: CachingOptimized (for S3 static content) or CachingDisabled (for fully dynamic API responses)
   - Origin request policy: forward what the origin needs (headers, query strings)
4. **Settings**:
   - Alternate domain name (CNAME): your custom domain (e.g., `cdn.example.com`)
   - Custom SSL certificate: select your ACM certificate (must be in us-east-1)
   - Price class: All edge locations, or restrict to lower-cost regions
5. Click **Create distribution** — deployment takes 5–15 minutes

After creation: update your S3 bucket policy to allow OAC access, and add a CNAME or Alias record in Route 53 pointing your domain to the CloudFront distribution domain.

---

### CloudFront CLI Operations

```bash
# Get the CloudFront distribution domain name after creation
aws cloudfront list-distributions \
  --query 'DistributionList.Items[*].{ID:Id,Domain:DomainName,Status:Status,Origins:Origins.Items[0].DomainName}' \
  --output table

# Create a cache invalidation (use sparingly — first 1000 paths/month are free)
aws cloudfront create-invalidation \
  --distribution-id EDFDVBD6EXAMPLE \
  --paths '/images/*' '/app.js' '/index.html'

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id EDFDVBD6EXAMPLE \
  --id I2J0I21PCUYOIK

# S3 bucket policy granting OAC access (add to bucket policy after creating OAC)
# Replace DISTRIBUTION-ARN with your actual distribution ARN
cat << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontServicePrincipal",
    "Effect": "Allow",
    "Principal": {
      "Service": "cloudfront.amazonaws.com"      
    },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::my-bucket/*",
    "Condition": {
      "StringEquals": {
        "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/EDFDVBD6EXAMPLE"
      }
    }
  }]
}
EOF

# Update a distribution to add a WAF Web ACL
aws cloudfront get-distribution-config --id EDFDVBD6EXAMPLE > dist-config.json
# Edit dist-config.json to add "WebACLId": "arn:aws:wafv2:us-east-1:123456789012:global/webacl/my-acl/..."
# Then update:
aws cloudfront update-distribution \
  --id EDFDVBD6EXAMPLE \
  --distribution-config file://dist-config.json \
  --if-match <ETag-from-get-config>
```

---

## How to Decide

| Scenario | CloudFront Configuration |
|---|---|
| Static S3 website with private bucket | S3 origin + OAC + Block Public Access on bucket |
| Global API with caching | ALB/API Gateway origin + custom cache policy + short TTL |
| Static assets with long cache | Versioned filenames + TTL 1yr (not cache invalidation) |
| HTML files referencing versioned assets | Short TTL (60–300s) or no-cache |
| Block bots and SQLi at edge | Attach WAF Web ACL to distribution |
| A/B testing at edge | Lambda@Edge on Viewer Request |
| URL normalization at edge | CloudFront Functions (simpler, cheaper) |
| Private media for paid users | Signed URLs or Signed Cookies |
| Failover if primary origin fails | Origin Group with primary + secondary origin |

**CloudFront Functions vs Lambda@Edge:**
- Simple header/URL manipulation, no network calls, needs sub-ms speed → CloudFront Functions
- Needs network calls, external auth, complex logic, or >1ms execution → Lambda@Edge

---

## How This Connects

- **Amazon S3** — the most common CloudFront origin for static content. OAC keeps the bucket completely private while CloudFront serves content globally. CloudFront + S3 is the standard architecture for static websites, single-page apps, and media assets.
- **Application Load Balancer** — for dynamic content, CloudFront in front of an ALB provides global edge presence, HTTPS termination, WAF integration, and DDoS protection for ALB-backed applications.
- **AWS WAF** — WAF rules attached to CloudFront distributions block malicious traffic at the edge globally, before it reaches any AWS compute resource.
- **AWS Certificate Manager (ACM)** — CloudFront requires ACM certificates in us-east-1 for custom domain HTTPS. The certificate must be valid for the custom domain and provisioned in the correct region.
- **Route 53** — custom domains on CloudFront distributions use Alias records in Route 53 pointing to the distribution's CloudFront.net domain name.

---

## Exam Traps

- **ACM certificates for CloudFront must be in us-east-1.** This is a hard requirement regardless of where your origin or users are. If your certificate is in us-west-2 or eu-west-1, CloudFront cannot use it. This is one of the most-tested CloudFront gotchas.
- **Origin Access Control (OAC), not OAI, is the current standard.** The older Origin Access Identity (OAI) mechanism is being deprecated. OAC supports SSE-KMS encrypted S3 buckets; OAI does not. New deployments should use OAC.
- **Cache invalidation costs money and is slower than versioned filenames.** After the first 1,000 paths per month, each invalidation path is charged. Versioned/hashed filenames are instant, free, and the industry standard.
- **Lambda@Edge runs at Regional Edge Caches, not every PoP.** Lambda@Edge functions execute at ~13 regional locations, not at all 400+ edge PoPs like CloudFront Functions do. CloudFront Functions run at every PoP but have much tighter constraints.
- **CloudFront is a global service — it is not Region-specific.** CloudFront distributions are global by default. There is no "select a Region" for CloudFront itself. Origins can be regional (an ALB in us-east-1), but the CloudFront layer is worldwide.

---

## Summary

- CloudFront is AWS's global CDN with 600+ Points of Presence across 100+ cities in 50+ countries that caches content near users, reducing latency and offloading origin servers from repetitive requests.
- Distributions have origins (S3, ALB, custom HTTP) and cache behaviors (URL pattern rules specifying TTL, cache key components, and origin selection).
- Origin Access Control (OAC) keeps S3 buckets fully private by allowing only CloudFront to read from them — the recommended approach over the deprecated OAI.
- Use versioned/hashed filenames instead of cache invalidation for static assets: instant propagation, no charge, and a higher cache hit ratio.
- ACM certificates for CloudFront custom domains must be provisioned in us-east-1 — a hard requirement regardless of origin or user location.
- CloudFront Functions (simple, sub-ms, cheap) vs. Lambda@Edge (full Lambda, network access, regional) for edge compute — choose based on complexity and whether network access is needed.

---

## Examples

A marketing agency hosts a global campaign microsite on S3 — HTML, images, CSS, and JavaScript. They create a CloudFront distribution with the S3 bucket as the origin, enable OAC so the bucket has zero public access, and attach an ACM certificate (provisioned in us-east-1) for their custom domain. During a viral campaign moment, CloudFront absorbs millions of requests from users in every region. The S3 origin handles only cache misses — a small fraction of total traffic. Origin costs stay flat regardless of traffic spikes. The entire architecture costs less than $20/month for moderate traffic.

A SaaS platform deploys a React single-page application through CloudFront. Their CI/CD pipeline appends a content hash to every JavaScript and CSS filename at build time: `main.a3f9b2.js`, `vendor.c91d4e.js`. These files have a one-year TTL in CloudFront — they never change by definition, since any code change produces a new hash. The `index.html` file, which references the hashed assets, has a 5-minute TTL. On each deploy, the new `index.html` propagates within minutes and references the new hashed filenames. CloudFront fetches the new assets on first request and caches them for a year. Zero invalidations, zero charges, instant propagation for new content.

A media company wants to A/B test a new homepage layout for 10% of users without any origin-side changes. They deploy a Lambda@Edge function on the Viewer Request event. The function reads an `experiment-group` cookie: users without the cookie are randomly assigned to group A (90%) or B (10%), the cookie is set, and for group B the request path is rewritten from `/` to `/experiment/homepage-v2/`. The function executes in 3ms at a Regional Edge Cache. No requests reach the origin for routing decisions. The experiment runs for two weeks and group B shows a 12% improvement in conversion — without a single code change to the origin application.

---

## Think About It

1. CloudFront caches content at edge locations to reduce latency, but this means users might receive stale content after an update. What are the architectural strategies for managing cache freshness, and what are the trade-offs between TTL length, cache invalidation, and versioned filenames for different content types?
2. A high cache hit ratio is desirable, but improving it often means including fewer attributes in the cache key. What are the risks of an overly simplified cache key, and what types of content problems could it cause that would be difficult to debug?
3. CloudFront Functions run at every edge PoP with sub-millisecond execution, while Lambda@Edge runs at Regional Edge Caches with full Lambda capabilities. Describe two specific use cases — one where CloudFront Functions is clearly the right choice and one where Lambda@Edge is required — and explain the decision criteria.
4. If a user bypasses CloudFront and accesses your S3 bucket directly using its S3 URL, Origin Access Control prevents access. But what happens if they access your ALB origin directly using the ALB's DNS name? How would you prevent direct ALB access and force all traffic through CloudFront?
5. CloudFront serves as a DDoS mitigation layer via Shield Standard. A large DDoS attack successfully absorbs your CloudFront capacity and your origin starts receiving traffic. What architectural options does AWS provide to enhance protection beyond Shield Standard, and what are their trade-offs?

---

## Quick Check

**Q1.** A company wants to serve their S3-hosted website through CloudFront while ensuring the S3 bucket cannot be accessed directly from the internet. Which feature enables this?
- A) Signed URLs
- B) Origin Access Identity (OAI)
- C) Origin Access Control (OAC)
- D) Field-Level Encryption

**Answer: C** — Origin Access Control (OAC) is the current recommended mechanism that allows CloudFront to access an S3 bucket while blocking all direct public S3 access. OAC supports SSE-KMS encrypted buckets and is the replacement for the deprecated OAI.

**Q2.** A developer provisions an ACM certificate in eu-west-1 for their custom CloudFront domain and cannot attach it to the CloudFront distribution. What is the cause?
- A) CloudFront requires certificates to be provisioned in us-east-1 regardless of origin region
- B) The certificate must be provisioned in the same region as the S3 bucket
- C) ACM certificates cannot be used with CloudFront — only IAM certificates work
- D) The certificate must be in the same region as the majority of the distribution's users

**Answer: A** — CloudFront is a global service that only integrates with ACM certificates provisioned in us-east-1. This is a hard requirement with no exceptions — the certificate must be in us-east-1 regardless of where the origin or users are located.

**Q3.** An engineering team frequently invalidates CloudFront cache paths to push content updates. They are concerned about costs. What is the recommended alternative that eliminates invalidation entirely?
- A) Set all cache TTLs to zero to ensure content is always fresh
- B) Use versioned or hashed filenames for assets so each new version is a distinct cache object
- C) Deploy a Lambda@Edge function that bypasses the cache on every request
- D) Use S3 event notifications to trigger automatic invalidations on object updates

**Answer: B** — Versioned filenames (e.g., `app.a3f9b2.js`) make each deployed version a distinct URL, which CloudFront treats as a new object. No invalidation is needed, propagation is instant, and there is no charge. This is the industry-standard approach for static asset deployment.

---

## What's Next

Next: AWS Global Accelerator — a network-layer acceleration service that routes traffic over the AWS private backbone using two static Anycast IP addresses, providing faster failover and lower latency than DNS-