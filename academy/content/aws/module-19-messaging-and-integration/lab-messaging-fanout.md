---
title: "Canvas Lab: Event-Driven Fan-Out Pipeline"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: starter
---

# Canvas Lab: Event-Driven Fan-Out Pipeline

## Challenge

An e-commerce platform has been pre-configured with a Lambda order placement function. When an order is placed, three independent services must be notified: an inventory service, a fulfillment service, and an analytics pipeline. Design the fan-out messaging architecture that decouples the order service from its consumers and ensures that a failure in one downstream service does not affect the others.

## Learning Objectives

- Use SNS and SQS to implement reliable fan-out to three independent consumers
- Configure Dead Letter Queues to capture failed messages in each consumer queue
- Ensure the analytics pipeline receives all events, even during consumer downtime
- Apply message filtering to route only relevant message types to each subscriber

## Steps

1. Create an SNS Standard Topic: 'order-events'
2. In the pre-placed order Lambda, add SNS Publish call to 'order-events' with message attributes: order_type (domestic/international) and event_type (placed/cancelled/shipped)
3. Create SQS Standard Queue: 'inventory-queue' with a DLQ (max receive count = 3)
4. Create SQS Standard Queue: 'fulfillment-queue' with a DLQ (max receive count = 3)
5. Create Kinesis Firehose Delivery Stream → S3 bucket for analytics archival
6. Subscribe inventory-queue to SNS with filter policy: {event_type: [placed, cancelled]}
7. Subscribe fulfillment-queue to SNS with filter policy: {event_type: [placed]}
8. Subscribe Firehose to SNS (no filter — receives all events)
9. Connect Lambda consumers to inventory-queue and fulfillment-queue as event sources with batch size 10, long polling
10. Annotate: show that if fulfillment Lambda fails, inventory Lambda is unaffected; messages queue in SQS until fulfillment recovers

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.