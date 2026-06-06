---
title: "Canvas Lab: Enable GuardDuty and Build an Automated Finding Response"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: starter
---

# Canvas Lab: Enable GuardDuty and Build an Automated Finding Response

## Challenge

A security team wants to enable continuous threat detection in their AWS account and ensure that high-severity findings trigger immediate email notifications to the on-call team — without requiring anyone to manually check the GuardDuty console. You need to enable GuardDuty, use the built-in sample finding generator to simulate real threats (cryptocurrency mining, unauthorized API access), create an EventBridge rule that captures only HIGH and CRITICAL severity findings, and route those findings through SNS to deliver an email alert. You will verify the end-to-end pipeline works before any real threats occur.

## Learning Objectives

- Enable Amazon GuardDuty in a region and understand what data sources it analyzes (VPC Flow Logs, CloudTrail, DNS logs, S3 data events)
- Generate and interpret sample findings by severity and finding type, distinguishing between Recon, UnauthorizedAccess, CryptoCurrency, and Backdoor finding families
- Create an EventBridge rule with a GuardDuty finding event pattern filtered to severity >= 7 (HIGH and CRITICAL)
- Route GuardDuty findings to an SNS email subscription and verify end-to-end alert delivery
- Understand the anatomy of a GuardDuty finding — including instance ID, remote IP, finding type, and severity score

## Steps

1. Navigate to **GuardDuty** in the console — click **Get Started** then **Enable GuardDuty**; confirm the service shows status **Enabled** and note which data sources are active by default (VPC Flow Logs, CloudTrail management events, DNS logs)
2. In the GuardDuty left navigation, go to **Settings → Sample findings → Generate sample findings**; this creates one sample finding for every finding type GuardDuty supports (approximately 30+ findings)
3. Navigate to **Findings** — in the filter bar, add a filter for **Severity: HIGH** and **Severity: CRITICAL** (severity >= 7.0); review 2-3 findings in detail, noting the finding type name (e.g., `CryptoCurrency:EC2/BitcoinTool.B!DNS`), the severity score, the affected resource, and the action detail
4. Navigate to **SNS → Topics → Create topic** — choose **Standard**, name it `guardduty-high-severity-alerts`
5. Click **Create subscription** on the new topic — protocol **Email**, endpoint = your email address; check your inbox and click the confirmation link in the AWS SNS subscription confirmation email
6. Navigate to **EventBridge → Rules → Create rule** — name it `guardduty-high-severity`, event bus = **default**, rule type = **Rule with an event pattern**
7. In the event pattern editor, choose **Custom pattern (JSON editor)** and enter the following pattern:
   ```json
   {
     "source": ["aws.guardduty"],
     "detail-type": ["GuardDuty Finding"],
     "detail": {
       "severity": [{"numeric": [">=", 7]}]
     }
   }
   ```
8. On the next screen, set the target to **SNS topic** and select `guardduty-high-severity-alerts`; complete rule creation
9. Return to **GuardDuty → Settings → Generate sample findings** and generate samples again; wait 1-2 minutes and check your email inbox — confirm you receive alert emails containing the finding JSON payload
10. Open one of the received finding JSON payloads and identify: the `type` field (finding family and technique), the `severity` numeric value, the `resource.instanceDetails.instanceId`, and the `service.action` block describing what triggered the finding
11. On the canvas, diagram the event flow: GuardDuty data sources → GuardDuty service → EventBridge (with severity filter rule) → SNS topic → Email subscriber; annotate where the severity threshold filter is applied and what finding types would be suppressed by the >= 7 filter

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
