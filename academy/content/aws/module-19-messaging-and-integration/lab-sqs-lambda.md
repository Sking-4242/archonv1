---
title: "Canvas Lab: SQS-Triggered Lambda Processing Pipeline with Dead Letter Queue"
type: canvas
estimated_minutes: 30
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: SQS-Triggered Lambda Processing Pipeline with Dead Letter Queue

## Challenge

An order processing system receives high-volume order events that must be reliably handled. Lambda processes each order by writing to DynamoDB, but occasionally fails due to malformed data in incoming messages. Build an SQS queue → Lambda → DynamoDB pipeline with a Dead Letter Queue (DLQ) to capture failed orders for manual review. The DynamoDB table and IAM role base permissions are pre-configured.

## Learning Objectives

- Create an SQS standard queue and configure a Lambda event source mapping to trigger processing
- Set maxReceiveCount and a DLQ on the source queue to handle repeated failures
- Write a Lambda function that processes SQS messages and writes order records to DynamoDB
- Test both successful and failed message processing end-to-end
- Verify that failed messages land in the DLQ after exhausting maxReceiveCount retries

## Steps

1. Create an SQS standard queue named `order-processing` with a visibility timeout of 60 seconds
2. Create a second SQS standard queue named `order-processing-dlq` (use default settings)
3. On the `order-processing` queue, configure a redrive policy: set maxReceiveCount=3 and point the Dead Letter Queue to `order-processing-dlq`
4. Create a DynamoDB table named `Orders` with a partition key of `orderId` (String type)
5. Create a Lambda function using the Python 3.12 runtime, set timeout to 30 seconds and memory to 256 MB
6. Attach an execution role to the Lambda function with permissions for DynamoDB PutItem and SQS ReceiveMessage/DeleteMessage/GetQueueAttributes
7. Add an SQS event source mapping to the Lambda function pointing to the `order-processing` queue with a batch size of 10
8. Send 3 test messages to `order-processing` with valid JSON payloads, for example: `{"orderId": "001", "amount": 49.99}`
9. Verify in the DynamoDB console that a corresponding row was created in the `Orders` table for each message
10. Send 1 message with intentionally malformed JSON to `order-processing` (for example, `{orderId: MISSING_QUOTES}`)
11. Open CloudWatch Logs for the Lambda function and confirm a JSON parse error is logged for the bad message
12. Wait for the message to be retried 3 times (per the maxReceiveCount setting) then run `aws sqs receive-message --queue-url <dlq-url>` and confirm the malformed message is now present in `order-processing-dlq`

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
