---
title: "Canvas Lab: Event-Driven Pipeline with EventBridge"
type: canvas
estimated_minutes: 20
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: open
---

# Canvas Lab: Event-Driven Pipeline with EventBridge

## Challenge

Design an event-driven order processing pipeline. When an order is placed (event from the application), the pipeline must: (1) send an order confirmation email via SES, (2) update the inventory service, (3) trigger a fulfillment workflow in Step Functions, and (4) log the event to S3 for analytics. All four actions must happen in parallel, decoupled from the application that placed the order.

## Learning Objectives

- Use EventBridge to decouple the order placement event from downstream consumers
- Fan out to multiple targets from a single event rule
- Ensure the S3 logging path is reliable and captures all events

## Steps

1. Create a Custom EventBridge Event Bus named 'orders'
2. In the order placement Lambda, add PutEvents to send an `order.placed` event to the custom bus
3. Create an EventBridge Rule: source=myapp, detail-type=order.placed → 4 targets:
4.   Target 1: Lambda function (calls SES to send confirmation email)
5.   Target 2: Lambda function (calls inventory service to decrement stock)
6.   Target 3: Step Functions state machine (starts the fulfillment workflow)
7.   Target 4: Kinesis Firehose delivery stream → S3 bucket (event archive for analytics)
8. Add a Dead Letter Queue (SQS) to the EventBridge rule for failed target invocations
9. Add EventBridge Archive on the orders bus with 30-day retention
10. Annotate the fanout behavior: all 4 targets receive the event simultaneously

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.