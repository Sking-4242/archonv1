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

## What's Next

Next up: AWS Systems Manager — operational management for EC2 and hybrid servers.