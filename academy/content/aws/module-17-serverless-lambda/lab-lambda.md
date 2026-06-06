---
title: "Canvas Lab: Lambda with Environment Variables, Dead-Letter Queue, and X-Ray Tracing"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: Lambda with Environment Variables, Dead-Letter Queue, and X-Ray Tracing

## Challenge

A developer needs to deploy a Lambda function that processes S3 upload events, validates the file format, and writes metadata to DynamoDB. Configuration such as the target table name must not be hardcoded — it must be injected via environment variables. Failed invocations must be captured on an SQS dead-letter queue for later inspection, and execution must be traceable with X-Ray so the team can identify latency bottlenecks across DynamoDB calls.

## Learning Objectives

- Deploy a Lambda function with an S3 event trigger scoped to a key prefix
- Configure environment variables for runtime configuration without hardcoding resource names
- Attach an SQS standard queue as a Dead Letter Queue to capture failed asynchronous invocations
- Enable X-Ray active tracing and interpret the service map and trace details
- Test the full event flow with a real S3 upload and verify the DynamoDB write and DLQ behavior

## Steps

1. In the DynamoDB console, create a table named `FileMetadata` with partition key `fileKey` (String)
2. In the SQS console, create a standard queue named `lambda-file-processor-dlq`; note the queue ARN
3. Create a Lambda function named `file-processor` (Python 3.12, 256 MB memory, 30-second timeout)
4. Under **Configuration** -> **Environment variables**, add key `TABLE_NAME` with value `FileMetadata`
5. Under **Configuration** -> **Asynchronous invocation**, set the **Dead-letter queue** to the SQS queue ARN created in step 2
6. Under **Configuration** -> **Monitoring and operations tools**, enable **Active tracing** (X-Ray)
7. Update the Lambda execution role to include permissions: `dynamodb:PutItem` on the FileMetadata table, `sqs:SendMessage` on the DLQ, and `xray:PutTraceSegments` plus `xray:PutTelemetryRecords`
8. Write the Lambda handler to: read `TABLE_NAME` from `os.environ`; extract the S3 bucket and key from the event; validate the file extension is `.csv` or `.json`; call `dynamodb.put_item` with the file key, bucket, size, and timestamp; raise an exception for unsupported file types
9. Add an S3 trigger on a bucket of your choice, **prefix** `uploads/`, **event type** `s3:ObjectCreated:*`
10. Upload a valid file: `aws s3 cp test.csv s3://<bucket>/uploads/test.csv`
11. In CloudWatch Logs, open the `/aws/lambda/file-processor` log group and confirm the invocation succeeded and the item appears in DynamoDB
12. In the X-Ray console, open **Service map** and verify segments for Lambda and DynamoDB appear; click a trace to view the subsegment timeline
13. Simulate a failure: temporarily change the `TABLE_NAME` environment variable to `WrongTable`, then upload another file; after 2 async retries, the failed event should appear in the SQS DLQ
14. Fix the environment variable back to `FileMetadata`, re-upload, and confirm the function succeeds again

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
