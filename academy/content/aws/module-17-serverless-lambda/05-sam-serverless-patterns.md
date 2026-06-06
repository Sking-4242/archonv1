---
title: "AWS SAM and Serverless Application Patterns"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS SAM and Serverless Application Patterns

## Overview

Lambda functions, API Gateway APIs, DynamoDB tables, SQS queues, and Step Functions state machines work together in serverless architectures — but deploying and connecting them manually through the console or raw CloudFormation is verbose and error-prone. The AWS Serverless Application Model (SAM) is an open-source framework built on top of CloudFormation that provides a concise syntax specifically for serverless resources, plus a CLI for local development and testing. A Lambda function with an API trigger and execution role that takes 200 lines of CloudFormation takes 15 lines of SAM.

Beyond tooling, this lesson addresses the architectural patterns that underpin the majority of serverless applications: the REST API pattern, async queue processing, event-driven fan-out, and scheduled jobs. These patterns are composable — most real applications combine two or three of them. Understanding the canonical form of each pattern lets you recognize it in exam scenarios, apply it in designs, and explain the trade-offs clearly.

For the SAA exam, know the core serverless patterns and when Lambda is the right compute choice versus ECS/EKS. SAP adds SAM template structure, nested applications, and the trade-offs between SAM, CDK, and Terraform for serverless infrastructure. After this lesson, you will be able to design a complete serverless architecture using standard patterns and select the right compute service for workload characteristics that disqualify Lambda.

---

## Core Concepts

### AWS SAM: Concise Serverless Infrastructure

SAM adds four resource types to CloudFormation that map to commonly needed serverless combinations:

- `AWS::Serverless::Function` — a Lambda function, automatically creating its IAM execution role and any configured triggers (API Gateway routes, SQS event source mappings, S3 notifications, EventBridge rules)
- `AWS::Serverless::Api` — an API Gateway REST API with stages
- `AWS::Serverless::HttpApi` — an API Gateway HTTP API
- `AWS::Serverless::SimpleTable` — a DynamoDB table with a single hash key
- `AWS::Serverless::StateMachine` — a Step Functions state machine

SAM templates are valid CloudFormation templates — they include a `Transform: AWS::Serverless-2016-10-31` declaration that tells CloudFormation to process SAM resources before deployment. `sam deploy` packages your code, uploads it to S3, and deploys the resulting CloudFormation stack.

The **Serverless Application Repository (SAR)** is a catalog of pre-built SAM applications — you can discover, deploy, and compose them into your own applications. Lambda Power Tuning, from the previous lesson, is deployed from SAR.

---

### SAM CLI: Local Development

The SAM CLI accelerates the development loop by running Lambda functions locally using Docker containers that match the production Lambda runtime:

- `sam local invoke FunctionName -e event.json` — invokes a single function with a test event payload
- `sam local start-api` — starts a local API Gateway and Lambda runtime, accessible at `http://localhost:3000`
- `sam local generate-event s3 put` — generates a realistic sample event payload for any AWS event source (S3, SQS, DynamoDB, SNS, EventBridge, etc.)
- `sam build` — packages the application, resolving dependencies
- `sam deploy --guided` — interactive first-time deployment with prompts for stack name, region, and parameters

Local testing with `sam local` is not a perfect emulation of the production environment — IAM policies, VPC networking, environment variables, and some AWS API behaviors are only exercised in real deployments. But it catches the large class of bugs involving incorrect event parsing, wrong JSON paths, missing libraries, and handler logic errors, without any deployment round-trip.

---

### Core Serverless Patterns

**REST API pattern**: API Gateway → Lambda → DynamoDB (or RDS via RDS Proxy). The canonical serverless web API. Lambda handles request processing and business logic; DynamoDB provides a scalable, serverless data store. Add Cognito for authentication and Secrets Manager for any third-party API keys.

**Async queue processing**: SQS → Lambda (with SQS event source mapping). Work items are placed in an SQS queue by producers; Lambda polls and processes them in configurable batches. Benefits: natural buffering, automatic retry on failure (message returns to queue on Lambda error), DLQ for exhausted retries. Scale Lambda concurrency with queue depth. Use this pattern when processing time is variable and producers should not block waiting for completion.

**Event-driven fan-out**: SNS → multiple SQS queues → multiple Lambda consumers. A single event (new order, user registration) triggers multiple independent workflows simultaneously. SNS delivers to all subscribed SQS queues in parallel; each queue/Lambda pair scales and fails independently. No consumer blocks another.

**Event-driven pipeline**: S3 upload → Lambda → Step Functions → downstream services. Raw data lands in S3, triggering a Lambda that starts an orchestrated processing pipeline. Used for ETL, ML inference pipelines, document processing, and image analysis workflows.

**Scheduled jobs**: EventBridge scheduled rule → Lambda. The serverless cron replacement — no EC2 needed for batch jobs that run on a schedule.

---

### Lambda vs. Containers: Choosing Compute

Lambda is the right choice for workloads that are: event-driven and short-lived, stateless between invocations, tolerant of cold start latency (or using Provisioned Concurrency to eliminate it), and under 15 minutes in duration.

ECS/EKS is the right choice for workloads that: maintain persistent TCP connections, run continuously rather than in response to events, require more than 10 GB of memory, need complex or large dependency environments that don't fit in Lambda layers, run longer than 15 minutes, or require control over the underlying runtime environment.

In practice, most production applications use both: Lambda for API handlers, event processors, and scheduled tasks; ECS for long-running services, WebSocket connection handlers, and compute-intensive background workers.

---

## Configuration Reference

### SAM Template: REST API + Lambda + DynamoDB

```yaml
# template.yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31

Globals:
  Function:
    Runtime: python3.12
    MemorySize: 512
    Timeout: 10
    Tracing: Active                          # X-Ray tracing on all functions
    Environment:
      Variables:
        ORDERS_TABLE: !Ref OrdersTable
        LOG_LEVEL: INFO

Resources:
  # HTTP API — automatically created by SAM from the Events on the function
  OrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: orders.handler
      CodeUri: src/orders/
      Events:
        GetOrders:
          Type: HttpApi                      # Creates an HTTP API route automatically
          Properties:
            Path: /orders
            Method: GET
            Auth:
              Authorizer: CognitoAuthorizer
        CreateOrder:
          Type: HttpApi
          Properties:
            Path: /orders
            Method: POST
      Policies:
        - DynamoDBCrudPolicy:               # SAM policy template — no manual IAM required
            TableName: !Ref OrdersTable

  OrdersTable:
    Type: AWS::Serverless::SimpleTable      # DynamoDB table with hash key "id"
    Properties:
      PrimaryKey:
        Name: id
        Type: String
      BillingMode: PAY_PER_REQUEST

  # Async queue processing function
  OrderProcessorFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: processor.handler
      CodeUri: src/processor/
      Events:
        OrderQueue:
          Type: SQS                         # SAM creates the event source mapping
          Properties:
            Queue: !GetAtt OrderQueue.Arn
            BatchSize: 10
            FunctionResponseTypes:
              - ReportBatchItemFailures     # Report individual