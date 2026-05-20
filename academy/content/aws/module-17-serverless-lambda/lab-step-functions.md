---
title: "Canvas Lab: Order Processing with Step Functions"
type: canvas
estimated_minutes: 25
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: open
---

# Canvas Lab: Order Processing with Step Functions

## Challenge

Design a Step Functions workflow for an e-commerce order processing pipeline. When an order is received via API, the workflow must: (1) validate the order, (2) charge the payment method (if validation passes), (3) update inventory and send confirmation email in parallel, (4) schedule shipping. If payment fails, trigger a notification and end. If any step fails unexpectedly, route to an error handler. The workflow must handle retries and the full process may take up to 5 minutes.

## Learning Objectives

- Model the workflow with appropriate state types (Task, Choice, Parallel, Fail)
- Implement retry logic for transient failures in external service calls
- Use parallel execution where steps are independent
- Handle payment failure as a business exception (not a system error)

## Steps

1. Drag a Step Functions Standard Workflow onto the canvas
2. Add state: ValidateOrder → Task (Lambda: validate order data)
3. Add state: PaymentDecision → Choice (if payment_required=true → ChargePayment, else → FulfillOrder)
4. Add state: ChargePayment → Task (Lambda: call payment provider), configure Retry (3 attempts, 2x backoff) and Catch (PaymentDeclined → NotifyFailure)
5. Add state: FulfillOrder → Parallel with two branches: (1) UpdateInventory Task → Lambda, (2) SendConfirmation Task → SES API call directly
6. Add state: ScheduleShipping → Task (Lambda: create shipping record)
7. Add state: NotifyFailure → Task (Lambda: send customer notification of failed payment) → Fail state
8. Add a global Catch block routing unhandled errors to an ErrorHandler Lambda → SNS alert
9. Connect the workflow: API Gateway → Lambda (start execution) → Step Functions ARN
10. Annotate: Standard workflow chosen because individual steps may take minutes and execution history is required

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.