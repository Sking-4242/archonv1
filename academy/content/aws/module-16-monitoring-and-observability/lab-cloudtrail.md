---
title: "Canvas Lab: Audit IAM Activity with CloudTrail and Athena"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "SAP-C02"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: Audit IAM Activity with CloudTrail and Athena

## Challenge

A security engineer needs to audit who made IAM changes in the last 7 days. CloudTrail is not yet configured to deliver logs to S3, leaving no durable audit record. You will create a multi-region trail that delivers to S3 with log file validation enabled, then use Athena with partition projection to query for specific IAM management events such as CreateUser and AttachUserPolicy.

## Learning Objectives

- Create a multi-region CloudTrail trail that delivers management events to an S3 bucket
- Enable log file validation to detect tampering with stored log files
- Integrate CloudTrail with CloudWatch Logs for real-time alerting
- Create an Athena table over the CloudTrail S3 prefix using the partition projection DDL template
- Query for specific management events by event name and understand the cost difference between management events and data events

## Steps

1. Open the CloudTrail console and choose **Create trail**
2. Name the trail `security-audit-trail`; under **Storage location**, create a new S3 bucket (e.g., `cloudtrail-logs-<account-id>-<region>`)
3. Enable **Log file validation** — this generates a digest file every hour to detect log tampering
4. Under **CloudWatch Logs**, create a new log group `/aws/cloudtrail/security-audit` and allow CloudTrail to create the required IAM role
5. Set **Trail type** to **Apply trail to all regions** to capture multi-region API activity
6. Confirm that **Management events** is set to log both **Read** and **Write** events; note that **Data events** (e.g., S3 object-level) incur additional cost and are not needed here
7. Create the trail and verify the S3 bucket receives the `AWSLogs/` prefix within a few minutes
8. In the IAM console, create a test user named `cloudtrail-test-user` to generate a `CreateUser` event, then attach the `AmazonS3ReadOnlyAccess` managed policy to generate an `AttachUserPolicy` event
9. Wait 5-10 minutes for the events to be delivered to S3
10. Open the Athena console; create a database named `cloudtrail_db` by running: `CREATE DATABASE cloudtrail_db;`
11. Run the CloudTrail partition projection DDL (replace `<bucket>`, `<account-id>`, and `<region>` with your values) to create the external table with partition projection enabled
12. Query for the IAM events you generated:
    ```sql
    SELECT eventTime, userIdentity.arn, eventName, requestParameters
    FROM cloudtrail_db.cloudtrail_logs
    WHERE eventName IN ('CreateUser', 'AttachUserPolicy')
    AND eventTime > '2024-01-01'
    ORDER BY eventTime DESC;
    ```
13. Verify the `cloudtrail-test-user` creation and policy attachment appear in the results
14. In the CloudTrail console, review **Event history** for the same events and compare the response time versus waiting for S3 delivery

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
