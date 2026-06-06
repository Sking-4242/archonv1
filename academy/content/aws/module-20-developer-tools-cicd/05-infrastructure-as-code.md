---
title: "Infrastructure as Code: CloudFormation and CDK"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "DVA-C02", "SAP-C02"]
---

# Infrastructure as Code: CloudFormation and CDK

## Overview

Infrastructure as Code (IaC) is the practice of defining cloud resources in version-controlled files rather than creating them through the console or CLI. CloudFormation is AWS's native IaC service — you declare resources in JSON or YAML templates and CloudFormation provisions, updates, and deletes them as an atomic unit called a **stack**. The AWS CDK (Cloud Development Kit) generates CloudFormation templates from higher-level code written in TypeScript, Python, Java, Go, or .NET.

The problem IaC solves is repeatability and auditability. Without IaC, nobody knows exactly what is running in production, configuration drift accumulates silently, and creating a second identical environment requires days of manual effort. With IaC, your entire infrastructure is code — version-controlled, peer-reviewed, diffable. Creating a staging environment identical to production is a single command.

For the SAA and DVA exams, understand CloudFormation stacks, change sets, drift detection, DeletionPolicy, cross-stack references, and the CDK synthesize/deploy workflow. SAP adds StackSets for multi-account/multi-region deployments, nested stacks, custom resources, and CDK Aspects for policy enforcement. After this lesson, you will be able to design an IaC strategy for a multi-environment AWS deployment and explain the trade-offs between CloudFormation, CDK, and Terraform.

---

## Core Concepts

### AWS CloudFormation: Stacks and Templates

A CloudFormation **template** (JSON or YAML) declares resources as named logical resources with their configuration properties. CloudFormation resolves dependencies between resources automatically — if an ECS service depends on an ALB, CloudFormation creates the ALB first without you specifying the order.

A **stack** is a deployed instance of a template. The stack manages the complete lifecycle of its resources: create, update, delete. All resources in a stack are created and deleted together — you manage the collection, not individual resources. Every stack has a name, a region, and a status (CREATE_COMPLETE, UPDATE_IN_PROGRESS, ROLLBACK_COMPLETE, etc.).

**Parameters** make templates reusable across environments: `EnvironmentName`, `InstanceType`, `RDSMultiAZ`. Pass different parameter values to create a `prod` stack and a `staging` stack from the same template.

**Outputs and cross-stack references**: a stack can export values (`Export: Name`) for other stacks to import (`Fn::ImportValue`). This is how stacks share resource attributes (VPC ID, ALB ARN) without hardcoding them.

---

### Change Sets and Drift Detection

**Change sets** preview exactly what will change before a stack update is applied. A change set shows: which resources will be added, modified, or replaced (replacement means the resource is deleted and recreated — a destructive operation). Always create and review a change set before updating a production stack — a change set prevents surprises like an RDS instance being replaced when you only intended to update a security group.

**Drift detection** identifies resources that were modified outside CloudFormation (via the console, CLI, or Terraform). When drift is detected, CloudFormation shows exactly which properties changed and what their out-of-stack values are. Options for reconciling drift: update the template to match the drifted state (adopt the change), or update the resource to match the template (revert the change). CloudFormation does not automatically remediate drift — it only detects it.

**Stack rollback**: if any resource creation or update fails during a stack operation, CloudFormation rolls back all changes made during that operation to return the stack to its previous state. For new stacks (CREATE), this means all partially-created resources are deleted. For updates (UPDATE), this means the stack reverts to the previous successful state.

---

### DeletionPolicy and Stack Protection

**`DeletionPolicy`** on a resource controls what happens to that resource when the stack is deleted:
- `Delete` (default): resource is deleted with the stack — appropriate for stateless resources (ECS services, Lambda functions, security groups)
- `Retain`: resource is preserved when the stack is deleted — required for stateful resources (RDS databases, S3 buckets with data, Elasticsearch domains)
- `Snapshot`: creates a snapshot of the resource before deleting it — available for RDS, ElastiCache, and Redshift

**Stack termination protection**: enable on production stacks to prevent accidental `delete-stack` operations. With termination protection, a delete attempt returns an error and the stack is unchanged. Disable it explicitly before deleting.

**Best practice**: always set `DeletionPolicy: Retain` on RDS instances and S3 buckets in production stacks. Losing production data because someone ran `aws cloudformation delete-stack` is a well-documented and avoidable disaster.

---

### Nested Stacks and StackSets

**Nested stacks**: reference another CloudFormation template as a resource (`AWS::CloudFormation::Stack`) within a parent template. Used to: decompose large templates into manageable components, share common sub-templates (network stack reused across apps), and work around CloudFormation's 500-resource-per-stack limit.

**StackSets**: deploy a single template to multiple accounts and/or regions simultaneously. Used for: deploying baseline security controls (GuardDuty, CloudTrail, Config) across an organization's accounts, deploying applications to multiple regions for HA, and enforcing account-level configuration standards at scale. StackSets can deploy to an entire AWS Organization or to specific organizational units (OUs).

---

### AWS CDK

The CDK lets you define infrastructure using a full programming language (TypeScript, Python, Java, Go, .NET) with all language features: loops, conditionals, functions, classes, and type checking. The CDK compiles to CloudFormation — `cdk synth` outputs a CloudFormation template, `cdk deploy` synthesizes and deploys it.

**Constructs** are the CDK's building blocks:
- **L1 (CfnX)**: raw CloudFormation resource — `new ec2.CfnSecurityGroup(...)`. One-to-one mapping with CloudFormation resources.
- **L2**: opinionated constructs with sensible defaults and helper methods — `new ec2.SecurityGroup(...)` automatically generates ingress/egress rules, IAM permissions, and adds useful methods like `.addIngressRule()`.
- **L3 (Patterns)**: high-level architectural patterns — `new ecsPatterns.ApplicationLoadBalancedFargateService(...)` creates an entire ECS service, ALB, target group, security groups, IAM roles, CloudWatch alarms, and auto-scaling policies from a few parameters.

**CDK advantages over raw CloudFormation**: loops to create multiple similar resources, conditional logic, type-checked configuration (catch errors before deployment), and reusable organizational constructs that encode company standards.

---

## Configuration Reference

### Example: CloudFormation Template — ECS Service with ALB

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Description: ECS Fargate service behind an Application Load Balancer

Parameters:
  EnvironmentName:
    Type: String
    Default: staging
    AllowedValues: [staging, prod]
  ContainerImage:
    Type: String
    Description: ECR image URI including tag

Resources:
  # ECS Task Definition
  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      Family: !Sub "${EnvironmentName}-api"
      Cpu: "256"
      Memory: "512"
      NetworkMode: awsvpc
      RequiresCompatibilities: [FARGATE]
      ExecutionRoleArn: !GetAtt TaskExecutionRole.Arn
      ContainerDefinitions:
        - Name: api
          Image: !Ref ContainerImage
          PortMappings:
            - ContainerPort: 8080
          LogConfiguration:
            LogDriver: awslogs
            Options:
              awslogs-group: !Sub "/ecs/${EnvironmentName}-api"
              awslogs-region: !Ref AWS::Region
              awslogs-stream-prefix: api

  # RDS Database — must NEVER be deleted accidentally
  Database:
    Type: AWS::RDS::DBInstance
    DeletionPolicy: Retain          # CRITICAL: retain data if stack is deleted
    UpdateReplacePolicy: Retain     # CRITICAL: retain data if this resource must be replaced
    Properties:
      DBInstanceClass: db.t3.micro
      Engine: postgres
      EngineVersion: "15.4"
      MasterUsername: "{{resolve:secretsmanager:prod/rds/credentials:SecretString:username}}"
      MasterUserPassword: "{{resolve:secretsmanager:prod/rds/credentials:SecretString:password}}"
      MultiAZ: !If [IsProd, true, false]   # Multi-AZ in prod only

Conditions:
  IsProd: !Equals [!Ref EnvironmentName, prod]

Outputs:
  TaskDefinitionArn:
    Value: !Ref TaskDefinition
    Export:
      Name: !Sub "${EnvironmentName}-TaskDefinitionArn"
      # Export allows other stacks to import this value with Fn::ImportValue
```

> **Note:** `UpdateReplacePolicy: Retain` is separate from `DeletionPolicy: Retain`. `DeletionPolicy` applies when the stack is deleted. `UpdateReplacePolicy` applies when a stack update would require replacing (not just modifying) the resource. Both are needed for complete RDS protection.

---

### Example: AWS CDK (TypeScript) — ECS Service Pattern

```typescript
import * as cdk from 'aws-cdk-lib';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';

export class ApiStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc: /* imported VPC */,
      containerInsights: true,           // enable CloudWatch Container Insights
    });

    const repo = ecr.Repository.fromRepositoryName(this, 'Repo', 'prod-api');

    // L3 Pattern: creates ECS service + ALB + target group + security groups
    // + auto-scaling + CloudWatch alarms — from ~10 lines of code
    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
      cluster,
      cpu: 256,
      memoryLimitMiB: 512,
      desiredCount: 2,
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(repo, 'latest'),
        containerPort: 8080,
        logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'api' }),
      },
      publicLoadBalancer: true,
    });

    // Add auto-scaling — L2 method on the returned service construct
    const scaling = service.service.autoScaleTaskCount({ maxCapacity: 20 });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 70,      // scale when CPU > 70%
    });
  }
}
```

```bash
# CDK CLI commands
cdk synth                    # synthesize CloudFormation template — inspect before deploying
cdk diff                     # show what will change compared to deployed stack — like a change set
cdk deploy ApiStack          # synthesize and deploy
cdk destroy ApiStack         # delete the stack (and its resources, respecting DeletionPolicy)
```

---

## How to Decide

**CloudFormation vs. CDK:**

| Factor | CloudFormation (YAML/JSON) | AWS CDK |
|---|---|---|
| Team language skills | YAML comfortable | Prefer TypeScript/Python |
| Complexity | Simple to moderate stacks | Complex parameterized infra |
| Reusability | Copy-paste or nested stacks | L2/L3 constructs, easy reuse |
| Type checking | None (runtime errors only) | Full IDE type checking |
| Learning curve | Lower | Higher (requires language knowledge) |
| Production use | ✅ Common | ✅ Increasingly common |

CDK compiles to CloudFormation — at deployment time, CDK IS CloudFormation. Any CloudFormation feature is accessible from CDK (via L1 constructs if no L2 exists). Choose CDK when complex parameterization, looping, or reusable constructs justify the language knowledge investment.

**CloudFormation vs. Terraform:**

| Factor | CloudFormation / CDK | Terraform |
|---|---|---|
| Multi-cloud / multi-provider | AWS only | ✅ Any provider |
| AWS service coverage | Day-one for new services | Slight lag for new services |
| State management | AWS-managed (no state file) | Local or remote state file |
| Change preview | Change sets | `terraform plan` |
| Module ecosystem | CDK Construct Library | Terraform Registry |
| AWS exam focus | ✅ Tested | Not on AWS exams |

Choose Terraform when multi-cloud or multi-provider (Datadog, PagerDuty, GitHub) configuration is required. Choose CloudFormation/CDK for AWS-only environments where AWS-managed state and day-one service support matter.

**Stack organization strategy:**

Organize stacks by **lifecycle and ownership**, not by technology type. A single team owning a service should own one stack (or a small set of nested stacks) for that service. Cross-cutting infrastructure (VPC, IAM, logging) lives in separate stacks owned by the platform team, with Outputs exported for application stacks to import.

---

## How This Connects

- **CodePipeline** — CloudFormation is a native CodePipeline Deploy stage action. Pipelines can create stacks, create change sets (for review), execute change sets, or deploy via CDK in a CodeBuild action. This enables IaC to be deployed with the same safety gates as application code.
- **CodeBuild** — CDK synthesis (`cdk synth`) runs in CodeBuild as part of the pipeline. The synthesized CloudFormation template becomes the pipeline artifact passed to the Deploy stage.
- **IAM** — CloudFormation needs an IAM role (CloudFormation service role) with permissions to create the resources in the template. The CDK automatically creates a minimal IAM role scoped to the stack's resources during bootstrapping.
- **S3** — Large CloudFormation templates (>50 KB) and CDK assets (Lambda zip files, Docker images used as CDK assets) are stored in S3 and referenced by the template.
- **Service Catalog** — CloudFormation templates can be published as Service Catalog products, allowing platform teams to offer pre-approved, self-service infrastructure configurations to application teams without giving them direct CloudFormation access.
- **Config** — AWS Config rules can detect when deployed resources drift from CloudFormation-defined state and trigger automated remediation or compliance alerts.

---

## Exam Traps

- **Change sets preview changes; they don't apply them**: creating a change set does not change anything. You must explicitly execute the change set to apply the changes. Students sometimes create a change set thinking the update has been applied.
- **`DeletionPolicy: Retain` on RDS is not the same as backups**: `Retain` means the RDS instance survives stack deletion as a standalone resource, no longer managed by CloudFormation. It is not a backup mechanism — the instance keeps running and incurring cost. Always retain AND set up automated RDS snapshots.
- **CDK synthesizes to CloudFormation — CloudFormation limits still apply**: the CDK does not bypass CloudFormation limits. A CDK application that generates a single stack with 600 resources will fail at the CloudFormation 500-resource limit. Use nested stacks or split CDK apps to work around this.
- **StackSets require trust relationships for cross-account deployment**: StackSets deploying to member accounts require either an AWS Organizations-based trust (automatic for organization-managed StackSets) or manual IAM role setup (`AWSCloudFormationStackSetAdministrationRole` in the administrator account, `AWSCloudFormationStackSetExecutionRole` in each target account).
- **`Fn::ImportValue` creates a hard dependency between stacks**: a stack that imports an exported value from another stack cannot be deleted before the exporting stack, and the exporting stack's exported value cannot be modified while another stack imports it. This can create deployment ordering problems. Design exports carefully and prefer passing values as parameters for intra-team stacks.

---

## Summary

- CloudFormation deploys infrastructure from declarative JSON or YAML templates as atomic stacks, with automatic dependency resolution, change sets for pre-update review, drift detection, and rollback on failure.
- Always set `DeletionPolicy: Retain` (and `UpdateReplacePolicy: Retain`) on stateful resources (RDS, S3) in production stacks to prevent accidental data loss.
- Change sets are the IaC equivalent of code review — always create and review a change set before applying a stack update to production.
- AWS CDK generates CloudFormation from TypeScript, Python, or other languages, using L1/L2/L3 constructs to encode best practices, reduce boilerplate, and enable reusable infrastructure patterns.
- StackSets deploy a single template across multiple accounts and regions simultaneously — the standard mechanism for organization-wide baseline controls.
- Terraform is the most widely used multi-cloud IaC tool; CloudFormation/CDK is the right choice for AWS-only environments where AWS-managed state and same-day support for new services matter.

---

## Examples

A startup's infrastructure began as a handful of resources clicked together in the console. After six months, nobody could answer "what exactly is running in production?" confidently. A new DevOps engineer migrated everything to CloudFormation: VPC, subnets, RDS, and ECS each became separate stacks with cross-stack references. The next time they needed a staging environment, they ran `aws cloudformation deploy` with `EnvironmentName=staging` — fifteen minutes later, a fully isolated copy of production was running. When staging was no longer needed, `aws cloudformation delete-stack` removed it completely. This is the foundational IaC value: reproducible, disposable environments on demand.

A platform engineering team at a SaaS company uses CDK TypeScript to define a standard microservice pattern: ECS Fargate service behind an ALB, with a CloudWatch dashboard, auto-scaling policy, and IAM task role — bundled as an L3 Construct called `StandardMicroservice`. When a new product team deploys a service, they import the construct, pass four parameters, and run `cdk deploy`. Twenty lines of TypeScript replaces 400 lines of CloudFormation YAML. The construct enforces organizational standards (minimum 2 desired tasks, CloudWatch alarms on error rate, IAM least-privilege task role) automatically — teams benefit from platform best practices without needing to understand CloudFormation resource internals.

A large enterprise with 200 AWS accounts needs GuardDuty, CloudTrail, and AWS Config enabled in every account in every region. Using individual CloudFormation deployments would require 200 × N-regions manual operations. Instead, they use CloudFormation StackSets with AWS Organizations integration: one StackSet deployment propagates the security baseline template to every account automatically. When a new account joins the Organization, the StackSet deploys to it within minutes — no manual action required. The security team manages one template in one place; compliance is enforced organization-wide.