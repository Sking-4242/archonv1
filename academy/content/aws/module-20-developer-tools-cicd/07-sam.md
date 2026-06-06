---
title: "AWS SAM (Serverless Application Model)"
type: content
estimated_minutes: 30
cert_tags: ["DVA-C02", "SAA-C03"]
---

## Overview

AWS SAM (Serverless Application Model) is an open-source framework that simplifies the definition, local testing, and deployment of serverless applications on AWS. SAM is an extension of AWS CloudFormation — a SAM template is a valid CloudFormation template that adds a `Transform: AWS::Serverless-2016-10-31` directive at the top, which instructs CloudFormation's transform engine to expand SAM shorthand resource types into their full CloudFormation equivalents before deployment. A single line of SAM can represent what would otherwise be dozens of lines of CloudFormation.

The two main components of SAM are the template specification and the SAM CLI. The template specification defines shorthand resource types like `AWS::Serverless::Function`, `AWS::Serverless::Api`, and `AWS::Serverless::SimpleTable` that bundle together the Lambda function, its IAM role, its event source mappings, and its CloudWatch log group into one concise declaration. The SAM CLI provides commands for initializing project scaffolding, building and packaging the application, running Lambda functions locally using Docker, and deploying to AWS with interactive guidance.

For the DVA-C02 exam in particular, SAM is a frequently tested topic. Exam questions cover the CLI commands, the template shorthand types, the `Globals` section, local testing behavior, and how SAM relates to CloudFormation, CDK, and the Serverless Framework. Understanding that SAM templates are CloudFormation templates with a transform applied — not a separate deployment system — is the conceptual foundation that makes all other SAM details easier to reason about.

## Core Concepts

### The Transform Declaration

The `Transform: AWS::Serverless-2016-10-31` line at the top of a SAM template is what activates SAM processing. When CloudFormation receives a template containing this transform, it passes the template to the SAM transform macro, which replaces all `AWS::Serverless::*` resource types with their equivalent standard CloudFormation resources. A `AWS::Serverless::Function`, for example, expands into an `AWS::Lambda::Function`, an `AWS::IAM::Role` with appropriate Lambda execution policies, an `AWS::Lambda::Version`, and any `AWS::Lambda::EventSourceMapping` resources implied by the `Events` property. This expansion happens transparently during deployment — you write the shorthand, CloudFormation deploys the full resources. You can observe what SAM generates by running `sam validate --lint` or by inspecting the change set that CloudFormation creates before executing a deployment.

### Serverless Resource Types

SAM defines six primary shorthand resource types. `AWS::Serverless::Function` represents a Lambda function along with its IAM execution role, event source mappings, and optional destination configuration. `AWS::Serverless::Api` creates an API Gateway REST API with a stage and deployment, including support for OpenAPI definitions inline or from an external file. `AWS::Serverless::HttpApi` creates an API Gateway HTTP API, which is faster and cheaper than REST API for simple proxy use cases. `AWS::Serverless::SimpleTable` creates a DynamoDB table with a single hash key — a deliberate simplification for the common case where you do not need the full range of DynamoDB options. `AWS::Serverless::StateMachine` creates a Step Functions state machine with its IAM role, triggered by events defined in the `Events` property. `AWS::Serverless::LayerVersion` creates a Lambda layer that can be shared across multiple functions. For resources that do not have a SAM shorthand — VPCs, S3 buckets, SQS queues — you include standard CloudFormation resource types directly in the same template alongside your SAM resources.

### The Globals Section

The `Globals` section in a SAM template defines properties that apply to all resources of a given type, eliminating repetition across many function definitions. Globals can be set for `Function`, `Api`, `HttpApi`, `SimpleTable`, and `StateMachine`. For Lambda functions, common globals include `Runtime` (so every function uses the same Python or Node version), `MemorySize`, `Timeout`, `Environment` variables (merged with per-function environment variables), `Tracing` (to enable X-Ray tracing on all functions), `Tags`, and `CodeUri`. When a global and a per-resource property conflict, the per-resource property wins. The `Globals` section is purely a SAM-level convenience — it is resolved at transform time and does not appear in the resulting CloudFormation template. Using `Globals` keeps templates DRY and ensures consistent configuration across all functions in a service without copy-paste errors.

### SAM CLI Commands

The SAM CLI provides a complete workflow from scaffold to production. `sam init` creates a new project from one of the official starter templates, prompting you to choose a runtime, package type (ZIP or container), and project structure. `sam build` compiles your application code, installs dependencies, and stages the artifacts into a `.aws-sam/build` directory. For Python it runs `pip install`, for Node it runs `npm install`, and for compiled languages it runs the appropriate build tool. `sam local invoke` invokes a single Lambda function locally using Docker to simulate the Lambda execution environment — you pass an event JSON file as input and see the response and logs. `sam local start-api` starts a local HTTP server that simulates API Gateway, letting you send real HTTP requests to your functions with `curl` or a browser. `sam deploy --guided` packages the built artifacts, uploads them to S3, and deploys the CloudFormation stack, prompting you interactively for stack name, region, and deployment parameters, then saving those choices to a `samconfig.toml` file for future non-interactive deployments. `sam logs` streams or queries CloudWatch Logs for a deployed Lambda function. `sam sync` is a newer command that watches for local code changes and pushes them to AWS without a full CloudFormation deployment cycle — useful for rapid iteration in a personal development environment.

### Local Testing with Docker

`sam local invoke` and `sam local start-api` use Docker to pull and run the official AWS Lambda runtime container images, providing a faithful simulation of the Lambda execution environment. This means your function runs with the same operating system, the same glibc version, and the same runtime as it would in AWS. Environment variables defined in the template are injected, and you can override them with a `--env-vars` file. For functions that call other AWS services (DynamoDB, S3, SQS), you can point the function at LocalStack or a real AWS endpoint by setting the appropriate environment variables or SDK endpoint overrides. One important limitation: `sam local` does not simulate IAM permissions — your local function runs with the credentials of your local AWS CLI profile, not with the IAM role defined in the template. Test IAM behavior with actual deployments, not with `sam local`.

### SAM vs CDK vs CloudFormation

These three tools overlap in purpose but serve different use cases. SAM is optimized specifically for serverless — it has the shortest path from code to deployed Lambda function and is the only one that provides local Lambda testing via Docker. It is less expressive for non-serverless infrastructure. CloudFormation is the most complete and low-level — every AWS resource type and every configuration option is available — but it is verbose and has no local testing capability. CDK lets you define infrastructure in a real programming language (TypeScript, Python, Java, Go, C#), which means you can use loops, conditionals, abstractions, and third-party libraries. CDK generates CloudFormation templates under the hood and has strong constructs for serverless, but it has a steeper learning curve and does not have SAM's built-in local invoke capability (though it can integrate with SAM CLI for local testing). For exam questions: SAM when the scenario is serverless-first with local testing; CDK when the scenario is complex infrastructure with programming language constructs; CloudFormation when the scenario is raw template control or legacy compatibility.

## Configuration Reference

```yaml
# -------------------------------------------------------
# Complete SAM template.yaml
# Demonstrates Function, Api, HttpApi, SimpleTable,
# Globals, Layers, and environment configuration
# -------------------------------------------------------
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31   # Required: activates SAM transform
Description: E-commerce order processing service

# Global properties applied to ALL functions unless overridden per-function
Globals:
  Function:
    Runtime: python3.12
    MemorySize: 256
    Timeout: 30
    Tracing: Active              # Enable AWS X-Ray tracing on all functions
    Environment:
      Variables:
        LOG_LEVEL: INFO
        POWERTOOLS_SERVICE_NAME: order-service
    Layers:
      - !Ref PowertoolsLayer     # Attach a shared layer to every function
  Api:
    TracingEnabled: true
    Cors:
      AllowMethods: "'GET,POST,PUT,DELETE,OPTIONS'"
      AllowHeaders: "'Content-Type,Authorization'"
      AllowOrigin: "'*'"

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues: [dev, staging, prod]
    Description: Deployment environment

Resources:

  # -------------------------------------------------------
  # Shared Lambda Layer (e.g., AWS Lambda Powertools)
  # -------------------------------------------------------
  PowertoolsLayer:
    Type: AWS::Serverless::LayerVersion
    Properties:
      LayerName: !Sub "powertools-layer-${Environment}"
      Description: AWS Lambda Powertools for Python
      ContentUri: layers/powertools/
      CompatibleRuntimes:
        - python3.12
      RetentionPolicy: Retain   # Keep old versions when a new one is published

  # -------------------------------------------------------
  # DynamoDB table (SimpleTable = single hash key only)
  # -------------------------------------------------------
  OrdersTable:
    Type: AWS::Serverless::SimpleTable
    Properties:
      TableName: !Sub "orders-${Environment}"
      PrimaryKey:
        Name: orderId
        Type: String
      ProvisionedThroughput:
        ReadCapacityUnits: 5
        WriteCapacityUnits: 5
      Tags:
        Environment: !Ref Environment

  # -------------------------------------------------------
  # REST API (API Gateway REST API with stage)
  # Use for advanced features: usage plans, API keys, caching
  # -------------------------------------------------------
  OrdersApi:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub "orders-api-${Environment}"
      StageName: !Ref Environment
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn

  # -------------------------------------------------------
  # Lambda function: Create an order
  # Events property defines the API Gateway trigger
  # -------------------------------------------------------
  CreateOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "create-order-${Environment}"
      CodeUri: src/create_order/           # Path to function code (relative to template)
      Handler: app.lambda_handler          # module.function format
      # Runtime and MemorySize inherited from Globals
      # Timeout overridden here to allow longer DB writes
      Timeout: 60
      Description: Creates a new order and persists it to DynamoDB
      Environment:
        Variables:
          TABLE_NAME: !Ref OrdersTable     # Inject table name at deploy time
          # LOG_LEVEL inherited from Globals and merged here
      Policies:
        # SAM policy templates — shorthand for common IAM patterns
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable
        - CloudWatchLogsFullAccess
      Events:
        CreateOrder:
          Type: Api
          Properties:
            RestApiId: !Ref OrdersApi
            Path: /orders
            Method: POST

  # -------------------------------------------------------
  # Lambda function: Get an order by ID
  # -------------------------------------------------------
  GetOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "get-order-${Environment}"
      CodeUri: src/get_order/
      Handler: app.lambda_handler
      Description: Retrieves a single order by orderId
      Environment:
        Variables:
          TABLE_NAME: !Ref OrdersTable
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref OrdersTable
      Events:
        GetOrder:
          Type: Api
          Properties:
            RestApiId: !Ref OrdersApi
            Path: /orders/{orderId}
            Method: GET

  # -------------------------------------------------------
  # Lambda function: Process order events from SQS
  # -------------------------------------------------------
  ProcessOrderFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub "process-order-${Environment}"
      CodeUri: src/process_order/
      Handler: app.lambda_handler
      Timeout: 120
      ReservedConcurrentExecutions: 10    # Limit concurrency for this function
      Description: Processes order fulfillment tasks from the queue
      Environment:
        Variables:
          TABLE_NAME: !Ref OrdersTable
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref OrdersTable
        - SQSPollerPolicy:
            QueueName: !GetAtt OrderQueue.QueueName
      Events:
        OrderQueueEvent:
          Type: SQS
          Properties:
            Queue: !GetAtt OrderQueue.Arn
            BatchSize: 10                  # Process up to 10 messages per invocation
            BisectBatchOnFunctionError: true  # On error, split batch and retry halves
      # Dead-letter config for async invocations (not SQS — SQS has its own DLQ)
      EventInvokeConfig:
        MaximumRetryAttempts: 2
        DestinationConfig:
          OnFailure:
            Type: SQS
            Destination: !GetAtt ProcessingDLQ.Arn

  # -------------------------------------------------------
  # SQS queue for order processing (standard CloudFormation type)
  # SAM has no shorthand for SQS — use AWS::SQS::Queue directly
  # -------------------------------------------------------
  OrderQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "order-queue-${Environment}"
      VisibilityTimeout: 360    # Must be >= 6x Lambda timeout
      RedrivePolicy:
        deadLetterTargetArn: !GetAtt ProcessingDLQ.Arn
        maxReceiveCount: 3

  ProcessingDLQ:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: !Sub "order-processing-dlq-${Environment}"
      MessageRetentionPeriod: 1209600   # 14 days

  # -------------------------------------------------------
  # Cognito User Pool (standard CloudFormation type)
  # Referenced by the API authorizer above
  # -------------------------------------------------------
  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub "order-service-users-${Environment}"

Outputs:
  ApiEndpoint:
    Description: API Gateway endpoint URL
    Value: !Sub "https://${OrdersApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}/"
    Export:
      Name: !Sub "${AWS::StackName}-ApiEndpoint"

  OrdersTableName:
    Description: DynamoDB table name
    Value: !Ref OrdersTable
    Export:
      Name: !Sub "${AWS::StackName}-OrdersTableName"

  CreateOrderFunctionArn:
    Description: ARN of the CreateOrder Lambda function
    Value: !GetAtt CreateOrderFunction.Arn
```

```bash
# -------------------------------------------------------
# SAM CLI: Complete development workflow
# -------------------------------------------------------

# Initialize a new SAM project from a template
sam init \
  --runtime python3.12 \
  --dependency-manager pip \
  --app-template hello-world \
  --name my-order-service

# Build the application (installs dependencies, stages artifacts)
# Output goes to .aws-sam/build/
sam build

# Build in a Docker container (matches Lambda execution environment exactly)
# Use this if your dependencies include native C extensions
sam build --use-container

# -------------------------------------------------------
# Local testing
# -------------------------------------------------------

# Invoke a single function with a test event from a file
sam local invoke CreateOrderFunction \
  --event events/create-order-event.json

# Invoke with environment variable overrides
sam local invoke CreateOrderFunction \
  --event events/create-order-event.json \
  --env-vars env-overrides.json

# Start a local API Gateway server on port 3000
sam local start-api

# Start on a custom port and allow remote connections
sam local start-api --port 8080 --host 0.0.0.0

# Generate a sample event payload for a given event type
# Useful for creating test event files
sam local generate-event apigateway aws-proxy \
  --body '{"orderId": "test-123"}' \
  --method POST \
  --path /orders > events/create-order-event.json

# Validate the SAM template for errors
sam validate

# Validate with extended lint checks
sam validate --lint

# -------------------------------------------------------
# Deployment
# -------------------------------------------------------

# First-time guided deployment — prompts for all parameters
# and saves settings to samconfig.toml
sam deploy --guided

# Subsequent deployments using saved samconfig.toml settings
sam deploy

# Deploy with explicit parameters (non-interactive, for CI/CD)
sam deploy \
  --stack-name order-service-prod \
  --s3-bucket my-deployment-artifacts \
  --parameter-overrides "Environment=prod" \
  --capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND \
  --region us-east-1 \
  --no-confirm-changeset

# -------------------------------------------------------
# Observability and cleanup
# -------------------------------------------------------

# Stream live logs from a deployed function
sam logs \
  --name CreateOrderFunction \
  --stack-name order-service-dev \
  --tail

# Filter logs by time range
sam logs \
  --name CreateOrderFunction \
  --stack-name order-service-dev \
  --start-time "2024-01-15T10:00:00" \
  --end-time "2024-01-15T11:00:00"

# Delete the deployed stack and all its resources
sam delete \
  --stack-name order-service-dev \
  --region us-east-1

# -------------------------------------------------------
# samconfig.toml — auto-generated by sam deploy --guided
# Stores deployment configuration for repeatable deployments
# -------------------------------------------------------
# version = 0.1
# [default.deploy.parameters]
# stack_name = "order-service-dev"
# s3_bucket = "my-deployment-artifacts-us-east-1"
# s3_prefix = "order-service"
# region = "us-east-1"
# confirm_changeset = true
# capabilities = "CAPABILITY_IAM CAPABILITY_AUTO_EXPAND"
# parameter_overrides = "Environment=dev"
```

## How to Decide

Use this framework when choosing between SAM, CDK, and CloudFormation:

| Requirement | Best Choice | Reason |
|---|---|---|
| Serverless-first (Lambda + API Gateway + DynamoDB) | SAM | Minimal boilerplate; shorthand resource types purpose-built for serverless |
| Local Lambda testing before deploying | SAM CLI | `sam local invoke` / `sam local start-api` use Docker for faithful simulation |
| Complex infrastructure with loops, conditions, OOP abstractions | CDK | Real programming language; constructs encapsulate multi-resource patterns |
| Need to share infrastructure patterns as reusable libraries | CDK | CDK Constructs can be published as npm/PyPI packages |
| Full control over every CloudFormation property | CloudFormation | SAM and CDK both produce CloudFormation; use raw CF for maximum fidelity |
| CI/CD pipeline with parameterized, repeatable deployments | SAM (`samconfig.toml`) or CDK | Both support non-interactive deployment modes |
| Third-party framework (open-source community plugins) | Serverless Framework | Not an AWS tool; consider for existing Serverless Framework projects |
| Mixed serverless and non-serverless in one stack | SAM + standard CF types | SAM templates accept all standard CloudFormation resource types |

**Key rule:** SAM is not mutually exclusive with CloudFormation — they are the same thing. You can use SAM shorthand for your Lambda functions and standard CloudFormation for everything else in the same template.

## How This Connects

- **AWS CloudFormation:** SAM is a CloudFormation transform. When you run `sam deploy`, it calls `aws cloudformation deploy` under the hood. Every SAM deployment creates and manages a CloudFormation stack, meaning you get all CloudFormation features — change sets, drift detection, stack policies, rollback — for free.
- **Amazon API Gateway:** `AWS::Serverless::Api` expands to an API Gateway REST API with stage, deployment, and optional OpenAPI definition. `AWS::Serverless::HttpApi` expands to an HTTP API. SAM handles the Lambda integration, permission grants, and deployment lifecycle that would take many lines of raw CloudFormation.
- **AWS CodePipeline / CodeBuild:** SAM applications are a natural fit for CI/CD pipelines. `sam build` runs in CodeBuild, and `sam deploy` deploys to CloudFormation from the pipeline. `sam pipeline init` generates a starter pipeline definition that integrates SAM with CodePipeline automatically.
- **AWS X-Ray:** Setting `Tracing: Active` in the `Globals.Function` section enables X-Ray tracing on every Lambda function in the template with a single line. This is much simpler than enabling tracing per-function in raw CloudFormation, and it ensures no function is accidentally left without observability.

## Exam Traps

**Trap 1: Thinking SAM is separate from CloudFormation.**
SAM is CloudFormation with a transform applied. There is no separate SAM deployment engine. When you run `sam deploy`, it packages your code, uploads it to S3, and calls the CloudFormation API with your template. The `Transform: AWS::Serverless-2016-10-31` directive tells CloudFormation to expand the SAM shorthand before creating resources. If you understand this, you will never be confused about whether SAM supports a particular CloudFormation feature — it supports all of them.

**Trap 2: Confusing `sam local invoke` IAM behavior.**
`sam local invoke` runs your Lambda function locally using Docker, but it does NOT simulate IAM permissions. The function runs with your local AWS CLI credentials (the profile configured in `~/.aws/credentials`), not with the IAM role defined in the SAM template. If you need to verify that your IAM role has the correct permissions, you must deploy to AWS and test there. Local testing validates business logic; deployed testing validates IAM.

**Trap 3: Forgetting `CAPABILITY_AUTO_EXPAND` for SAM deployments.**
Because SAM uses a CloudFormation transform, deploying a SAM template requires the `CAPABILITY_AUTO_EXPAND` capability in addition to `CAPABILITY_IAM`. If you deploy via `sam deploy`, the CLI handles this automatically. If you deploy a SAM template directly through the CloudFormation console or API, you must explicitly acknowledge `CAPABILITY_AUTO_EXPAND` or the deployment will fail with a capabilities error.

**Trap 4: Assuming `AWS::Serverless::SimpleTable` supports complex DynamoDB features.**
`SimpleTable` only creates a DynamoDB table with a single hash key (partition key) and basic provisioned or on-demand capacity. It does not support sort keys, global secondary indexes (GSIs), local secondary indexes (LSIs), streams, TTL, or point-in-time recovery. For any DynamoDB table that needs these features, use `AWS::DynamoDB::Table` (the standard CloudFormation type) in the same SAM template.

**Trap 5: Confusing `sam build` with `sam package`.**
`sam build` compiles code, installs dependencies, and stages artifacts in `.aws-sam/build/`. `sam package` (legacy) was a separate step that uploaded artifacts to S3 and produced a packaged template. In modern SAM workflows, `sam deploy` performs the package and upload automatically after `sam build`, so you rarely need `sam package` as a separate command. On older exam questions or documentation, you may see a `sam package` + `sam deploy` two-step workflow — understand both patterns.

## Summary

- A SAM template is a CloudFormation template with `Transform: AWS::Serverless-2016-10-31` at the top; SAM shorthand resource types expand to full CloudFormation resources at deploy time.
- The six SAM shorthand types are `AWS::Serverless::Function`, `Api`, `HttpApi`, `SimpleTable`, `StateMachine`, and `LayerVersion`; all other AWS resources use standard CloudFormation types in the same template.
- The `Globals` section defines shared properties across all resources of a given type, eliminating repetition and ensuring consistent configuration without per-function copy-paste.
- `sam local invoke` and `sam local start-api` use Docker to simulate the Lambda execution environment locally but do not simulate IAM permissions.
- `sam deploy --guided` prompts for deployment configuration and saves it to `samconfig.toml` for repeatable non-interactive deployments in CI/CD pipelines.
- SAM is the right choice for serverless-first projects with local testing needs; CDK for complex multi-service infrastructure in real programming languages; raw CloudFormation for maximum template control.

## Examples

**Beginner:** A developer is building their first Lambda function and wants to test it locally before deploying. They run `sam init`, choose Python 3.12 and the "Hello World" template, and get a working project with a `template.yaml`, `src/` folder, and `events/` folder containing a sample event. They run `sam build` to install dependencies, then `sam local invoke HelloWorldFunction --event events/event.json` to run the function locally with Docker. The function output and logs appear in the terminal. No AWS account interaction happens — all testing is local. When they are satisfied, `sam deploy --guided` walks them through the first deployment interactively.

**Intermediate:** A backend team has three Lambda functions that all use Python 3.12, need 512 MB memory, 60-second timeouts, and X-Ray tracing. Without SAM's `Globals`, they would copy these four properties into each function definition. With `Globals`, they define them once under `Globals.Function` and all three functions inherit them automatically. One function needs a 120-second timeout for a long-running database operation — they override `Timeout: 120` on that function only, leaving the others at 60 seconds. The `Globals` value is the default; the per-function value always takes precedence when both are set.

**Advanced:** A platform engineering team is building a multi-environment serverless platform for 15 development teams. They create a SAM template that accepts an `Environment` parameter (`dev`, `staging`, `prod`) and uses `!Sub` to suffix all resource names with the environment name. They configure `samconfig.toml` with separate profiles for each environment pointing to different AWS accounts. Their CodePipeline runs `sam build --use-container` in CodeBuild (to ensure native dependencies compile correctly), then runs `sam deploy` with the appropriate profile for each environment stage. They use `sam pipeline init` to generate the initial CodePipeline definition, which they then check into their infrastructure repository. The result is a self-service serverless platform where teams submit a SAM template PR, and the pipeline automatically deploys to dev, runs integration tests with `sam local start-api` against the deployed endpoint, and promotes to staging and prod on approval.

## Think About It

1. SAM templates are valid CloudFormation templates. If you deployed a SAM template directly through the CloudFormation console (without using the SAM CLI), what would happen? What extra step would you need to take, and why?

2. A teammate argues that because CDK can also deploy Lambda functions, there is no reason to learn SAM. How would you respond? For what specific development workflow does SAM provide value that CDK does not?

3. `sam local invoke` does not simulate IAM permissions — your function runs with your local AWS credentials. What are the practical implications of this for testing? What category of bugs would local testing catch, and what category would require a real deployment to find?

4. The `Globals` section lets you define default properties for all functions. What are the risks of over-using `Globals`? Are there properties that should NOT be set globally, and why?

5. Consider a scenario where you have a SAM application with 10 Lambda functions, all sharing the same DynamoDB table. The table needs a sort key and a GSI. You start using `AWS::Serverless::SimpleTable` but realize it does not support GSIs. How do you handle this in the same SAM template, and what does this tell you about the relationship between SAM and CloudFormation?

## Quick Check

**Question 1:** A developer runs `sam deploy` but gets an error: "Requires capabilities: [CAPABILITY_IAM, CAPABILITY_AUTO_EXPAND]". What is the most likely cause and fix?

- A) The template uses SAM shorthand types, which require `CAPABILITY_AUTO_EXPAND` because CloudFormation must run the SAM transform macro. Add `--capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND` to the deploy command.
- B) The template is missing the `Transform: AWS::Serverless-2016-10-31` line. Add the transform and redeploy.
- C) The template creates IAM roles, which always causes this error regardless of SAM. This is expected behavior and can be ignored.
- D) `CAPABILITY_AUTO_EXPAND` is only required for nested stacks, not SAM templates.

**Answer: A** — SAM templates use CloudFormation transforms (`AWS::Serverless-2016-10-31`), and deploying a template with a transform requires explicitly acknowledging `CAPABILITY_AUTO_EXPAND`. This tells CloudFormation you understand that a macro will expand the template before resources are created. The `CAPABILITY_IAM` requirement exists because SAM creates IAM roles automatically for Lambda functions. The SAM CLI's `sam deploy --guided` adds both capabilities automatically; when running `sam deploy` directly (e.g., in CI/CD), you must pass `--capabilities CAPABILITY_IAM CAPABILITY_AUTO_EXPAND`.

---

**Question 2:** Which SAM CLI command should you use to run a Lambda function locally and pass it a specific JSON event file as input?

- A) `sam run --function MyFunction --input event.json`
- B) `sam local invoke MyFunction --event event.json`
- C) `sam local start-api --event event.json`
- D) `sam test MyFunction --payload event.json`

**Answer: B** — `sam local invoke` is used for one-off invocations of a Lambda function with a specific event payload. The `--event` flag points to a JSON file containing the event. `sam local start-api` starts a local HTTP server for API Gateway testing but does not accept a single event file — it waits for HTTP requests. The other options are not real SAM CLI commands.

---

**Question 3:** A SAM template has the following `Globals` section: `Runtime: python3.12`, `Timeout: 30`, `MemorySize: 128`. One function in the template has `Timeout: 90` and `MemorySize: 512` defined explicitly. What are the effective values for that function's Runtime, Timeout, and MemorySize?

- A) Runtime: python3.12, Timeout: 30, MemorySize: 128 (Globals always win)
- B) Runtime: python3.12, Timeout: 90, MemorySize: 512 (per-function values always win)
- C) Runtime: python3.12, Timeout: 90, MemorySize: 512 (per-function values override Globals; Runtime is inherited from Globals since not overridden)
- D) Runtime: not set (must be defined per-function), Timeout: 90, MemorySize: 512

**Answer: C** — In SAM, per-function property values always override `Globals` values when both are specified. Properties defined in `Globals` but not overridden in the function definition are inherited. In this case: `Timeout` is overridden to 90, `MemorySize` is overridden to 512, and `Runtime` is inherited from `Globals` as `python3.12` because the function does not define its own Runtime.

## What's Next

Next, explore AWS CodePipeline and CodeBuild to understand how SAM applications are deployed in CI/CD pipelines. The `sam pipeline init` command generates a CodePipeline definition with CodeBuild stages for `sam build` and `sam deploy`, and understanding that integration shows how serverless development workflows connect to the broader DevOps toolchain.
