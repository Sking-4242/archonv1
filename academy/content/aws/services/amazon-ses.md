---
title: "Amazon SES"
type: content
estimated_minutes: 14
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C03"]
---

# Amazon SES

## Overview

Amazon Simple Email Service (SES) is a scalable, cost-effective **email service** for sending and receiving email — transactional messages (receipts, password resets, notifications), marketing campaigns, and bulk mail — as well as inbound email processing. It handles the hard parts of running email infrastructure: deliverability, authentication, and scale. This *service reference* lesson covers sending and receiving, deliverability and authentication, the sandbox, and what each certification expects.

SES matters because sending email reliably at scale is deceptively hard: messages must authenticate properly or they land in spam, sender reputation must be protected, and bounces/complaints must be handled. SES provides managed sending with built-in authentication support, reputation management, and high throughput at low cost, integrated with the rest of AWS. The core mental model is an **API/SMTP endpoint** you send through, with **verified identities**, **authentication (SPF/DKIM/DMARC)**, and **reputation/feedback** mechanisms that determine whether your mail is delivered — plus optional **inbound** email receiving into S3/Lambda/SNS.

---

## How It Works

- **Sending** — applications send email via the SES **API** or **SMTP** interface. You must verify the **identities** (domains or email addresses) you send from, and configure authentication so receivers trust your mail:
  - **SPF** (authorizes sending servers), **DKIM** (cryptographically signs messages so they can't be tampered with and prove they came from your domain), and **DMARC** (a policy tying SPF/DKIM together) — proper setup is the key to deliverability.
- **Sandbox vs. production** — new accounts start in a **sandbox** (can only send to verified addresses, low limits). You request production access to send to anyone at higher **sending quotas** (daily volume and rate), which grow with good sending behavior.
- **Reputation and feedback** — SES tracks **bounces** and **complaints**; you must process these (via SNS notifications or event destinations) and suppress bad addresses to protect your sender reputation, or sending may be paused.
- **Receiving** — SES can accept inbound email for your domain and trigger **receipt rules** that deliver to **S3**, invoke **Lambda**, or publish to **SNS** for processing.

---

## Key Features

- **High-scale sending** via API/SMTP with **DKIM/SPF/DMARC** authentication support.
- **Configuration sets** and **event destinations** to track sends, deliveries, opens, clicks, bounces, and complaints (to CloudWatch, Kinesis Firehose, SNS).
- **Dedicated IPs** (and IP pools) for high-volume senders who want to manage their own reputation, plus shared IPs by default.
- **Suppression list** to automatically avoid re-sending to addresses that bounced/complained.
- **Inbound email** receiving with receipt rules to S3/Lambda/SNS.
- **Virtual Deliverability Manager** for deliverability insights.

---

## Configuration Reference

- **Verify your domain/email identities** and set up **DKIM** (and SPF/DMARC DNS records) — essential for deliverability.
- **Request production access** to leave the sandbox; monitor and stay within **sending quotas**.
- **Configure bounce/complaint handling** via SNS or configuration-set event destinations, and rely on the **suppression list**.
- **Use dedicated IPs/pools** for large, reputation-sensitive volume; set up **receipt rules** for inbound processing.

---

## Operations and Troubleshooting

- **Mail landing in spam.** Almost always an **authentication** problem — verify DKIM/SPF/DMARC are correctly configured and aligned.
- **Can only send to verified addresses.** The account is still in the **sandbox**; request production access.
- **Sending paused / reputation issues.** High **bounce/complaint** rates harm reputation; process feedback, suppress bad addresses, and clean lists.
- **Throttling.** You're hitting the **sending rate/quota**; quotas increase with good behavior or via a request.

---

## Integrations

SES sends via API/**SMTP**, authorizes with **IAM**, emits send/bounce/complaint events to **CloudWatch**, **SNS**, and **Kinesis Data Firehose** (for analytics), and processes inbound mail into **S3**, **Lambda**, and **SNS**. It's commonly invoked by applications and **Lambda** for transactional email, and is distinct from **SNS** (which can send simple notifications/SMS but is not a full email service with deliverability, templates, and inbound handling). It pairs with **Route 53** for the DNS records that enable authentication.

---

## Pricing and Cost Considerations

SES is **low-cost, pay-per-use**: priced per **thousand emails sent** (and received), plus data/attachment transfer, with **dedicated IPs** billed monthly. Sending from EC2 has a generous free tier. The cost is generally modest; the main considerations are choosing dedicated vs. shared IPs based on volume/reputation needs and keeping lists clean to avoid wasted sends to bad addresses. Exact prices vary by Region.

---

## Exam Relevance

**CLF-C02:** Know SES as AWS's scalable, cost-effective email-sending (and receiving) service for transactional and bulk email. Foundational.

**SAA-C03:** Know SES for transactional/bulk email in architectures, the sandbox-vs-production model, DKIM/SPF/DMARC for deliverability, and SES vs. SNS (full email vs. simple notifications). Design depth.

**SOA-C03:** Operate email — bounce/complaint handling, quotas/throttling, dedicated IPs, and deliverability troubleshooting. Operations depth.

---

## Summary

Amazon SES is a scalable, low-cost email service for sending transactional and bulk email (via API/SMTP) and receiving inbound email. Deliverability depends on verified identities and **DKIM/SPF/DMARC** authentication; new accounts begin in a **sandbox** (verified recipients only) before getting production access and growing **sending quotas**. SES tracks **bounces and complaints**, maintains a suppression list to protect reputation, offers dedicated IPs/pools for high-volume senders, and routes inbound mail to S3/Lambda/SNS via receipt rules. The recurring exam points are authentication for deliverability, sandbox vs. production, and SES (full email service) vs. SNS (simple notifications).

---

## Quick Check

1. Which three authentication mechanisms are key to SES deliverability, and what does DKIM specifically do?
2. What is the SES sandbox, and how do you send to arbitrary recipients?
3. Why must you handle bounces and complaints, and what protects you from re-sending to bad addresses?
4. When would you use dedicated IPs?
5. How does SES differ from SNS for sending messages?

---

## What's Next

Pair this with **Amazon SNS** (notifications comparison), **AWS Lambda** (sending/processing email), **Amazon S3** (inbound storage), and **Amazon Route 53** (authentication DNS records).
