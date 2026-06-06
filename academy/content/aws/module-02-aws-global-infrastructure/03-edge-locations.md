---
title: "Edge Locations and the AWS Global Network"
type: content
estimated_minutes: 14
cert_tags: ["CLF-C02", "SAA-C03"]
---

# Edge Locations and the AWS Global Network

## Overview

AWS Regions and Availability Zones are where your compute and storage workloads live. Edge Locations are something different: they are the global network of points where AWS brings its infrastructure closest to end users for content delivery and DNS resolution. AWS operates 600+ Edge Locations — also called Points of Presence (POPs) — spread across hundreds of cities worldwide, and this count grows regularly as AWS expands its CDN footprint. Always verify the current count at **infrastructure.aws** rather than memorizing a specific number. That number is more than fifteen times the number of AWS Regions. Edge Locations are primarily used by two services: Amazon CloudFront (AWS's content delivery network, or CDN) and Amazon Route 53 (AWS's DNS service). When your users load a webpage, watch a video, or download a file served through CloudFront, the content typically comes from an Edge Location in their city — not from a data center thousands of miles away.

Edge Locations exist because physics imposes an unavoidable tax on data traveling long distances. Even at the speed of light, a round-trip between a user in Tokyo and a server in Virginia takes roughly 150–200 milliseconds. For loading a webpage composed of dozens of individual assets (images, scripts, stylesheets), those delays stack up. A CDN solves this problem by storing copies of frequently requested content in local caches — the Edge Locations — so that users retrieve content from a location that might be just a few miles away, reducing latency from hundreds of milliseconds to single digits. The origin server (your S3 bucket or EC2 application) only gets contacted when an Edge Location does not have a fresh cached copy, dramatically reducing load on your infrastructure as well.

For the Cloud Practitioner exam, you need to understand what Edge Locations are, which services use them, why there are so many more of them than Regions, and how the caching hierarchy works. You also need to recognize that Edge Locations are not a scaled-down version of a Region — they are a different kind of infrastructure serving a completely different purpose. A common exam trap is conflating Edge Locations with Regions or AZs. They are separate layers of the AWS global infrastructure and should be understood as such.

## Core Concepts

### What an Edge Location Actually Is

An Edge Location is not a mini-Region. It does not run general-purpose compute (you cannot launch an EC2 instance in an Edge Location). It does not have the full AWS service catalog. An Edge Location is purpose-built infrastructure designed for one job: getting content or DNS responses to users as fast as possible.

Physically, Edge Locations are often located in Internet Exchange Points (IXPs) — facilities where major internet service providers interconnect with each other. This placement is strategic: by sitting at the junction of multiple ISPs, an Edge Location can reach users on almost any internet service provider with minimal hops. An Edge Location in Frankfurt might serve users across Germany, Austria, and Switzerland, all of whom are on different carriers, because the Edge Location is connected at a level of the internet where those carriers all meet. This is fundamentally different from how a Region is positioned — Regions are chosen for compliance, latency to a broad geographic area, and service availability. Edge Locations are positioned for last-mile delivery speed.

### Amazon CloudFront: Content Delivery at the Edge

Amazon CloudFront is AWS's CDN service, and it is the primary consumer of Edge Location infrastructure. When you configure a CloudFront distribution, you define an origin (where the original content lives — an S3 bucket, an Application Load Balancer, or any HTTP server) and a set of behaviors (rules governing what gets cached, for how long, and how cache misses are handled). CloudFront automatically routes user requests to the nearest Edge Location based on network conditions.

The caching logic works as follows: a user in Singapore requests a JPEG image. CloudFront routes the request to the Singapore Edge Location. If the image is in the Edge Location's cache (a "cache hit"), it is returned immediately — the request never leaves Singapore. If the image is not cached (a "cache miss"), the Edge Location fetches it from the origin, stores it in cache, and returns it to the user. The next user in Singapore requesting the same image gets a cache hit. The time-to-live (TTL) setting on your cache behavior controls how long items stay in cache before the Edge Location revalidates them against the origin.

CloudFront supports both static content (images, videos, files) and dynamic content (API responses, personalized pages). Dynamic content typically cannot be cached, but CloudFront still provides a performance benefit by routing the request over AWS's private global backbone — a network AWS controls end-to-end — rather than the public internet, which has less predictable routing.

### Regional Edge Caches: The Middle Layer

Between your Edge Locations and your origin, CloudFront maintains a second, larger tier of caches called Regional Edge Caches. As of 2024, there are approximately 13 Regional Edge Caches worldwide — fewer than Edge Locations, but each one is larger in storage capacity.

The purpose of Regional Edge Caches is to serve as a buffer for content that is popular enough to justify caching but not so popular that every individual Edge Location will have it. Imagine a moderately popular product image on an e-commerce site: it gets requested thousands of times per day across a whole continent, but not so frequently in any single city that each city's Edge Location always has it cached. The Regional Edge Cache for that continent might have it cached even when individual Edge Locations have evicted it to make room for more frequently requested content.

The full request hierarchy: **User → Edge Location → Regional Edge Cache → Origin.** Each step is only reached if the previous layer's cache does not have the content. This hierarchy minimizes origin load by catching requests at the earliest possible layer. Understanding this hierarchy helps you design CloudFront cache TTLs: setting TTLs too short defeats the purpose of the middle layers; setting them too long causes stale content to be served after updates.

### Route 53 and Anycast DNS

Amazon Route 53 is AWS's DNS service, and it also uses the global Edge Location network — but in a fundamentally different way than CloudFront does. Route 53 does not cache content; it resolves domain names to IP addresses.

Route 53 uses anycast routing for DNS resolution. Anycast is a network architecture where the same IP address is announced from multiple physical locations simultaneously, and the internet automatically routes your query to whichever location is closest (by network topology). When your laptop queries a Route 53 DNS record, that query is answered by whichever Edge Location is nearest to you — not by a central Route 53 server. For users in Mumbai, the DNS response comes from an Indian Edge Location. For users in São Paulo, it comes from a South American Edge Location. The result is DNS resolution in single-digit milliseconds almost anywhere in the world, even under heavy load.

This is meaningful because DNS is the first step in almost every internet connection. Before your browser can connect to a server, it must resolve the domain name to an IP address. Slow DNS resolution delays everything downstream. By using Edge Locations for DNS, Route 53 ensures that this first step is as fast as possible, globally.

### Other Services That Use Edge Infrastructure

Several additional AWS services leverage the global edge network, extending what the infrastructure can do beyond content delivery:

**AWS WAF (Web Application Firewall)** can be attached to CloudFront distributions. When it is, WAF rules are evaluated at the Edge Location before any traffic reaches your origin — potentially blocking malicious requests from SQL injection, cross-site scripting, or known bad IP ranges before they ever enter your network.

**AWS Shield** provides DDoS (Distributed Denial of Service) protection using Edge Location infrastructure. Shield Standard is automatically active for all CloudFront and Route 53 traffic. When a volumetric DDoS attack targets your CloudFront distribution, malicious traffic first hits the Edge Locations, which collectively have enormous aggregate bandwidth capacity — far more than any single origin server. Shield analyzes and absorbs the attack traffic at the edge, and only legitimate traffic flows through to your origin.

**Lambda@Edge** is an advanced feature that allows you to run AWS Lambda functions at CloudFront Edge Locations. Instead of a round-trip to an AWS Region for dynamic processing, Lambda@Edge executes your code at the Edge Location that received the user's request. This enables use cases like A/B testing (serve different content to different users based on a cookie), URL rewriting (redirect users to language-specific pages based on their location), and request authentication at the edge — all without the latency of a full round-trip to a Region.

## Configuration Reference

### Creating a CloudFront Distribution via Console

To set up CloudFront for an S3 bucket (a common beginner use case):

1. Navigate to the **CloudFront Console** — search "CloudFront" in the top search bar, or go to console.aws.amazon.com/cloudfront.
2. Click **"Create distribution"**.
3. In the **Origin** section:
   - For **"Origin domain"**: start typing the name of your S3 bucket and select it from the dropdown. CloudFront will populate the rest.
   - For **"Origin access"**: select **"Origin access control settings (recommended)"** for secure S3 access without making your bucket public. CloudFront will prompt you to create an OAC (Origin Access Control) policy.
4. In the **Default cache behavior** section:
   - **"Viewer protocol policy"**: select "Redirect HTTP to HTTPS" to enforce encrypted connections.
   - **"Cache policy"**: select "CachingOptimized" as a starting point for static content. This is an AWS-managed policy that sets reasonable TTLs.
   - **"Origin request policy"**: leave as "None" for basic S3 use cases.
5. In the **Settings** section:
   - **"Price class"**: choose which Edge Locations to use. "Use all edge locations (best performance)" uses all 450+ POPs globally. "Use North America and Europe" uses a subset and costs less. "Use North America, Europe, Asia, Middle East, and Africa" is the middle option.
   - **"Default root object"**: enter `index.html` if you are hosting a static website.
   - **"WAF"**: optionally attach an AWS WAF web ACL for request filtering.
6. Click **"Create distribution"**. CloudFront takes 5–10 minutes to deploy your configuration to all Edge Locations worldwide.
7. Once deployed, you are given a CloudFront domain name like `d1234abcdef8.cloudfront.net`. This is what users will access (or you can add a CNAME from your own domain using Route 53).

### Checking Which Edge Location Served Your Request

Once a CloudFront distribution is active, you can inspect HTTP response headers to see which Edge Location handled your request. In a browser's developer tools (Network tab), look for the `x-amz-cf-pop` response header on any CloudFront-served resource. Its value will be an airport code plus a number, identifying the specific Edge Location POP that served the request — for example, `SIN2` (Singapore), `LHR62` (London Heathrow), or `IAD89` (Washington Dulles, close to us-east-1).

From the terminal, use curl:

```bash
curl -I https://d1234abcdef8.cloudfront.net/your-file.jpg
```

The `-I` flag fetches HTTP headers only (HEAD request). In the response, look for:
- `x-amz-cf-pop: SIN2` — the Edge Location POP that served this response.
- `x-cache: Hit from cloudfront` — indicates a cache hit (content was served from Edge Location cache).
- `x-cache: Miss from cloudfront` — indicates a cache miss (content was fetched from origin or Regional Edge Cache).
- `age: 3600` — number of seconds the object has been in cache at this location.

### Console Navigation: Viewing Edge Location Coverage

To see the global distribution of CloudFront Edge Locations:

1. Go to **aws.amazon.com/cloudfront/features/** in a web browser.
2. AWS publishes an interactive map showing all current Edge Location POPs by city. This map is updated as AWS opens new Edge Locations.
3. Alternatively, visit **infrastructure.aws** for an interactive global view of all AWS infrastructure layers — Regions, AZs, and Edge Locations — on a single map.

## How to Decide

The key judgment call with Edge Locations is whether your workload benefits from CloudFront (and therefore from Edge Location infrastructure) or whether direct access to your origin is sufficient.

| Scenario | Use CloudFront? | Reasoning |
|----------|----------------|-----------|
| **Static website assets (images, CSS, JS, video)** | Yes, strongly | These are ideal caching candidates. Cache hit rates of 90%+ are common, dramatically reducing origin load and latency. |
| **API responses that are the same for all users** | Yes | Public API responses (product catalogs, pricing, sports scores with short TTL) can be cached at the edge. Set short TTLs to balance freshness with performance. |
| **Personalized or authenticated API responses** | Usually no, or use carefully | Content unique per user cannot be shared across users in a cache. CloudFront still provides backbone routing benefits but caching is irrelevant. |
| **Users distributed globally** | Yes | The latency benefit of Edge Locations is greatest when users are far from your origin Region. Even a 50ms improvement per page element compounds across dozens of assets. |
| **Users concentrated in one city, origin in same city** | Optional | If your users and origin are already geographically close, the edge latency benefit is smaller. CloudFront still adds security (WAF, Shield) and simplifies SSL. |
| **Real-time streaming (live video)** | Yes, with specific configuration | CloudFront supports live HLS/DASH streaming. Edge Locations reduce viewer-to-ingest latency and handle fan-out to millions of simultaneous viewers. |
| **Software downloads, large file distribution** | Yes | Edge Locations cache large files efficiently. Downloads that would saturate origin bandwidth instead distribute across hundreds of POPs. |

## How This Connects

- **Amazon S3** is the most common CloudFront origin for static content. Rather than making your S3 bucket public, you use CloudFront with Origin Access Control (OAC) so that the bucket remains private and only CloudFront can read from it — a security improvement that Edge Locations enable.
- **AWS Regions and AZs** are where your origin infrastructure lives. CloudFront does not replace your Regional infrastructure; it sits in front of it and reduces how often users need to go all the way to your Region. The origin is still there, still essential, but handling far fewer requests.
- **Amazon Route 53** uses Edge Locations for DNS resolution (via anycast), meaning users' DNS queries are answered locally before CloudFront even enters the picture. Fast DNS → fast first connection → fast content delivery: Route 53 and CloudFront together optimize the full request path end-to-end.
- **AWS WAF and Shield** integrate with CloudFront at Edge Locations, creating a security perimeter that sits in front of your origin infrastructure. Attacks are absorbed or blocked at the edge before they can reach and overwhelm your application servers — a non-obvious but critical security architecture benefit.
- **Lambda@Edge** allows you to run serverless code at Edge Locations, blurring the line between content delivery and compute. This enables advanced patterns like edge authentication, real-time personalization, and A/B testing without any round-trip to a Region for each user request.

## Exam Traps

- **Students often confuse the count of Edge Locations (450+) with the count of Regions (~34), but they describe completely different infrastructure layers.** Regions are full-service geographic deployments with compute, storage, and databases. Edge Locations are CDN/DNS delivery points. The exam frequently presents these numbers in answer choices to see if you can keep them straight.
- **Students often think Edge Locations can run general-purpose AWS workloads like EC2, but they cannot.** Edge Locations run CloudFront caching, Route 53 anycast DNS, Shield, WAF, and Lambda@Edge. You cannot deploy a virtual machine or a database to an Edge Location. For ultra-low-latency compute close to users, AWS Local Zones are the relevant product (not Edge Locations).
- **Students often think CloudFront caches content only at Edge Locations, missing the Regional Edge Cache middle layer.** The correct hierarchy is User → Edge Location → Regional Edge Cache → Origin. The 13 Regional Edge Caches are their own distinct layer between the 450+ Edge Locations and the origin.
- **Students often think Route 53 is just a "database" for DNS records, missing that it uses Edge Locations for resolution.** Route 53's use of anycast across Edge Locations is what makes it globally fast and resilient — not a centralized DNS server somewhere in us-east-1.
- **Students often think that attaching CloudFront to an application always reduces costs, but data transfer pricing requires analysis.** CloudFront's data transfer out pricing is often lower than direct EC2 or S3 data transfer pricing, but it is not free. For applications with very low traffic or users concentrated in one Region, CloudFront may add cost without a meaningful performance benefit.

## Summary

- Edge Locations (450+) are AWS's content delivery and DNS infrastructure, geographically separate from and far more numerous than AWS Regions (~34) — they exist to get content and DNS responses to users with minimum latency.
- Amazon CloudFront uses Edge Locations to cache content close to users; when a cached object is requested, it is served directly from the nearest Edge Location without a round-trip to the origin server.
- CloudFront uses a two-tier caching hierarchy: Edge Locations (450+) serve as the first cache layer, and Regional Edge Caches (13) serve as a larger intermediate cache between Edge Locations and the origin.
- Amazon Route 53 uses Edge Locations via anycast routing to resolve DNS queries from whichever POP is geographically closest to the user, achieving single-digit millisecond DNS resolution globally.
- AWS WAF, Shield, and Lambda@Edge extend CloudFront Edge Locations beyond caching to include request filtering, DDoS mitigation, and serverless edge compute respectively.
- The correct hierarchy for a CloudFront cache miss is: User → Edge Location → Regional Edge Cache → Origin — a common exam scenario question.

## Examples

**Beginner:** A media company streams video tutorials to learners across 60 countries. Without CloudFront, every request would travel from the learner's browser all the way to the origin S3 bucket in us-east-1 — adding 150–300 milliseconds of latency for users in Asia or Africa, and causing rebuffering on slower connections. By placing their video assets behind a CloudFront distribution with caching enabled, requests are served from the nearest Edge Location. A learner in Mumbai retrieves content from an Indian Edge Location, not Virginia — cutting latency from ~180ms to under 20ms. Their S3 bill drops because CloudFront's data transfer pricing is lower, and origin request volume drops by over 90% because the cache handles repeat requests. This is the most direct, beginner-accessible illustration of what Edge Locations actually do and why they exist.

**Intermediate:** An e-commerce platform uses Route 53 to manage DNS for its storefront domain. During Black Friday, DNS query volume spikes by 30x as millions of shoppers simultaneously load the site for the first time. Because Route 53 uses anycast across its global Edge Location network, DNS queries from shoppers in Chicago, London, and Seoul are each answered by their nearest Edge Location — not by a central DNS server that would become a bottleneck. Each response comes back in under 5 milliseconds. The platform's engineers do not have to provision DNS capacity or worry about DNS becoming a chokepoint under load; Route 53's edge-based architecture handles the spike automatically. Slow DNS resolution — something most developers never think about — would have added perceptible delay to every single page load on the busiest day of the year.

**Advanced:** A security-focused SaaS company operates a web application that handles sensitive customer data. They configured CloudFront with AWS WAF and Shield Standard attached. During a quarter, they were targeted by three separate attack patterns: a volumetric UDP flood, a Layer 7 HTTP flood designed to exhaust application server connections, and a scanner probing for exposed admin paths. For the volumetric flood, Shield Standard absorbed the attack at Edge Locations before it reached the origin — the aggregate bandwidth of 450+ Edge Locations absorbed what would have overwhelmed their Regional infrastructure. For the HTTP flood, WAF rate-limiting rules blocked IPs exceeding request thresholds, stopping the attack at the edge. For the path scanner, WAF rules matching admin-path patterns returned 403 responses directly from CloudFront without the requests ever reaching the application servers. All three mitigations happened at Edge Locations, not in the Region. This architecture demonstrates that Edge Locations are not just a performance tool — they are a distributed security perimeter.

## Think About It

1. CloudFront caches content at Edge Locations to reduce origin load. What happens when content changes frequently — like a live sports scoreboard updating every 30 seconds, or a personalized homepage unique to each logged-in user? How does that change whether and how you would configure CloudFront caching?
2. There are 450+ Edge Locations but only ~34 Regions. Why does AWS maintain so many more Edge Locations than Regions? What would concretely be lost if Edge Locations were consolidated into Regions, and what would be gained?
3. Lambda@Edge lets you run serverless code at CloudFront Edge Locations. What are the trade-offs of running business logic at the edge versus in a central Region? Can you think of a scenario where running code at the edge would actually make your system harder to manage or debug?
4. If a Regional Edge Cache already reduces origin load by serving content that individual Edge Locations have evicted, why do Edge Locations still exist as a separate layer? What does the Edge Location layer add that the Regional Edge Cache alone cannot provide?
5. A startup says they do not need CloudFront because their users are "mostly in the US" and their servers are in us-east-1. Under what specific conditions would this reasoning hold, and under what conditions would it break down — even for a US-only user base?

## Quick Check

**Q1.** Approximately how many CloudFront Edge Locations (Points of Presence) does AWS operate globally?

- A) 33
- B) 100
- C) 13
- D) 450+

**Answer: D** — AWS operates 600+ Edge Locations worldwide (the count grows regularly; check infrastructure.aws for the current number). 33+ is the number of full AWS Regions. 13 is the approximate number of Regional Edge Caches, which are a separate middle layer between Edge Locations and origin servers.

---

**Q2.** What is the correct order of the CloudFront request hierarchy when a user requests an object that is not cached at the nearest Edge Location?

- A) User → Origin → Regional Edge Cache → Edge Location
- B) User → Regional Edge Cache → Edge Location → Origin
- C) User → Edge Location → Regional Edge Cache → Origin
- D) User → Origin → Edge Location → Regional Edge Cache

**Answer: C** — Requests flow from the user to the nearest Edge Location first. If not cached there, CloudFront checks the Regional Edge Cache. Only if neither layer has the content does the request travel all the way to the origin server.

---

**Q3.** Which AWS service uses Edge Locations to answer DNS queries from the location geographically nearest to the requesting user?

- A) Amazon VPC
- B) AWS Direct Connect
- C) Amazon Route 53
- D) AWS CloudTrail

**Answer: C** — Route 53 uses anycast routing across the global Edge Location network to resolve DNS queries from whichever Point of Presence is closest to the user, achieving globally fast and resilient DNS resolution without a central DNS server bottleneck.

## What's Next

Next lesson: How to Choose a Region — a structured four-factor framework for making the Region selection decision correctly, including how to check service availability and compare pricing across candidate Regions.
