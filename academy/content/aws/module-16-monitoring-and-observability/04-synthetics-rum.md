---
title: "CloudWatch Synthetics, RUM, and ServiceLens"
type: content
estimated_minutes: 8
cert_tags: ["SAA-C03", "DVA-C02"]
---

# CloudWatch Synthetics, RUM, and ServiceLens

## Overview

Reactive monitoring (alerts when things break) is necessary but not sufficient. Proactive monitoring tests your endpoints from the outside before users notice problems. CloudWatch Synthetics runs scripted canary checks; CloudWatch RUM measures real user experience in the browser; ServiceLens unifies metrics, logs, and traces in one view.

## CloudWatch Synthetics Canaries

Canaries are scripts (Node.js or Python) that run on a schedule in Lambda and test your endpoints from the outside. A canary might: send an HTTP GET to your health endpoint and assert a 200 response, run a Selenium-based browser automation that logs in and checks a specific page element, or test an API workflow. Failed canaries trigger CloudWatch Alarms. Use canaries for: uptime monitoring, regression detection, multi-step workflow testing, and external-perspective availability measurement.

## CloudWatch RUM (Real User Monitoring)

RUM collects performance data from actual user browsers: page load times, JavaScript errors, HTTP request performance, Core Web Vitals (LCP, FID, CLS). You add a small JavaScript snippet to your web pages, and CloudWatch RUM aggregates anonymized performance data across all sessions. Provides a real-world view of user experience separate from synthetic canaries (which test ideal conditions). Use RUM to identify performance issues affecting subsets of users (specific browsers, geographies, slow connections).

## ServiceLens

ServiceLens is a CloudWatch feature that correlates metrics, logs, and traces from X-Ray in one view for a specific service. The service map shows relationships with health overlays. Clicking a node drills into CloudWatch metrics and filtered logs for that service, and links directly to relevant X-Ray traces. ServiceLens is the 'single pane of glass' for operational debugging — the starting point for on-call investigations.

## SLOs and Error Budgets

Well-implemented observability answers: 'Are we meeting our SLO?' A Service Level Objective (SLO) is a measurable target (e.g., 99.9% of requests under 300ms). An error budget is the allowed failure rate ((1 - SLO) × time). CloudWatch doesn't have native SLO tracking, but you can approximate with metric math: calculate the ratio of successful requests to total requests over a rolling window. When the error budget is running low, reduce risk — pause deployments, do incident postmortems.

## Summary

Synthetics canaries proactively test endpoints on a schedule. RUM captures real user performance from browsers. ServiceLens unifies metrics, logs, and traces for per-service operational views. Together these provide proactive detection (synthetics), real-world performance visibility (RUM), and fast root cause analysis (ServiceLens + X-Ray). Build the full observability stack before you need it.

## Examples

A travel booking website wanted to know immediately if their checkout flow broke — not when the first customer called support. They created a CloudWatch Synthetics canary (using the built-in Selenium blueprint) that runs every five minutes, navigates to their site, searches for a flight, adds it to cart, and asserts the booking confirmation page loads within two seconds. When a bad deployment broke the cart API, the canary fired a CloudWatch Alarm within five minutes — 30 minutes before any real user attempted checkout during off-peak hours. This is synthetic monitoring's defining advantage: constant, external, scripted coverage independent of actual user traffic.

A large media company launched a redesigned video streaming page and wanted to understand whether real users on mobile devices in Southeast Asia experienced different load times than their internal testing suggested. They added the CloudWatch RUM JavaScript snippet to the page and within 48 hours had Core Web Vitals data (LCP, CLS) broken down by geography, browser, and connection type. The data revealed that users on slower mobile networks in Thailand experienced 6-second LCP times — invisible in canary tests run from AWS infrastructure. RUM filled the gap between synthetic ideal conditions and real-world user diversity.

An on-call engineer at a payments company received a PagerDuty alert about elevated error rates. They opened ServiceLens, found the affected service node on the service map (red health indicator), clicked through to its CloudWatch metrics (request count drop, latency spike), then followed the embedded X-Ray trace links to see the exact DynamoDB call that was timing out — all without switching tools or writing queries. ServiceLens compressed a typical 20-minute triage into under three minutes by correlating signals that previously lived in separate consoles.

## Think About It

1. A synthetic canary tests your API every minute and shows it as "up," but RUM data shows 15% of real users are experiencing JavaScript errors. What does this discrepancy reveal about the limitations of synthetic monitoring, and how should you respond?
2. Why might an error budget framework (SLO + error budget) be more useful than a simple "uptime percentage" metric when communicating reliability to business stakeholders?
3. What trade-offs would you consider when deciding how frequently to run a canary that simulates a full multi-step checkout workflow versus a simple HTTP health check?
4. CloudWatch doesn't have native SLO tracking. How would you use metric math and a CloudWatch Dashboard to approximate SLO compliance for an API that must respond successfully to 99.9% of requests?
5. How would the observability stack described in this lesson (canaries + RUM + ServiceLens) change if you were monitoring a mobile app rather than a web app — what would you need to replace or supplement?

## Quick Check

**Q1.** What runtime environment does CloudWatch Synthetics use to execute canary scripts?
- A) EC2 instances with a dedicated monitoring AMI
- B) ECS Fargate tasks running in the customer's VPC
- C) Lambda functions running Node.js or Python scripts on a schedule
- D) CloudWatch Events that directly call target HTTP endpoints

**Answer: C** — CloudWatch Synthetics runs canary scripts as Lambda functions in Node.js or Python, executing them on a configurable schedule and reporting results as CloudWatch metrics and alarms.

**Q2.** What is the primary difference between CloudWatch Synthetics and CloudWatch RUM?
- A) Synthetics monitors server-side metrics; RUM monitors database query performance
- B) Synthetics runs scripted tests from AWS infrastructure on a schedule; RUM collects performance data from real user browsers
- C) Synthetics requires a dedicated EC2 instance; RUM runs entirely serverless
- D) Synthetics is for internal APIs; RUM is only for public-facing endpoints

**Answer: B** — Synthetics proactively simulates user actions from AWS-controlled infrastructure; RUM passively collects actual experience data (page load, JavaScript errors, Core Web Vitals) from real user browsers via an injected JavaScript snippet.

**Q3.** What does ServiceLens provide that viewing CloudWatch metrics, CloudWatch Logs, and X-Ray separately does not?
- A) A lower-cost alternative to X-Ray for distributed tracing
- B) A unified view that correlates metrics, logs, and traces for a specific service from a single console
- C) The ability to create alarms based on X-Ray trace data directly
- D) Automatic remediation of performance issues detected in traces

**Answer: B** — ServiceLens acts as a single pane of glass, correlating the service map from X-Ray with CloudWatch metrics and logs for each node, so on-call engineers can move from alert to root cause without context-switching between separate consoles.

## What's Next

Next up: AWS Systems Manager — operational management for EC2 and hybrid servers.