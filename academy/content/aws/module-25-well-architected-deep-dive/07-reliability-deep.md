---
title: "Reliability Pillar Deep Dive"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Reliability Pillar Deep Dive

## Overview

The Well-Architected Reliability pillar defines how to build workloads that perform their intended function correctly and consistently, even in the face of failures. Reliability is not about preventing all failures — failures in distributed systems are inevitable. It is about ensuring that your system can detect failures, respond to them automatically, and continue to serve customers without requiring manual intervention. The measure of reliability is availability: the percentage of time a system is serving requests correctly. Nines of availability (99.9%, 99.99%, 99.999%) translate directly into permitted minutes of downtime per year, and achieving each additional nine is exponentially harder and more expensive than the last.

The problem the Reliability pillar addresses is the gap between "it works when everything is healthy" and "it continues to work when things fail." Distributed systems fail in unexpected, partial, and cascading ways. A single AZ loses power. A database replica lags under write pressure and serves stale reads. A downstream API becomes slow rather than failing outright, holding threads and exhausting connection pools upstream. A deployment introduces a memory leak that manifests only under production load. Systems that were designed only for the happy path collapse under these conditions. Reliability engineering requires designing for failure explicitly: assuming failures will occur, designing the system to detect and route around them, and verifying through regular testing that the recovery mechanisms actually work.

For SAA-C03, expect questions on RDS Multi-AZ vs. Multi-AZ Cluster vs. Read Replicas, Route 53 routing policies for failover, SQS dead-letter queues, and ALB health checks. SAP-C02 goes deeper into chaos engineering, regional failover architectures (active-active vs. active-passive), DynamoDB Global Tables, Aurora Global Database, RTO/RPO trade-offs, and the design of resilient deployment pipelines. After this lesson, you will be able to calculate composite availability, choose the right failure isolation boundary for a given RTO, and design automated recovery architectures for component, AZ, and region-level failures.

---

## Core Concepts

### The 5 Reliability Design Principles

Understanding why each principle exists is more useful than memorizing the list.

**1. Automatically recover from failure.** Manual recovery is slow, inconsistent, and unavailable at 3 AM. Automatic recovery requires two things: detection (health checks, alarms, monitoring) and action (ASG replacement, Route 53 failover, RDS Multi-AZ promotion). The system must be able to detect the failed component and route around it without a human in the loop. The key insight is that recovery automation must be tested — if the automation has never run in production, it is a hypothesis, not a recovery mechanism.

**2. Test recovery procedures.** Runbooks that have never been executed are fiction. Chaos engineering formalizes the practice of testing recovery: inject failure deliberately, in a controlled way, and observe whether the recovery mechanisms work as expected. The goal is to find recovery failures during a scheduled experiment, not during an actual incident. AWS Fault Injection Simulator (FIS) enables this at the infrastructure level.

**3. Scale horizontally to increase workload availability.** A single large resource is a single point of failure. Ten small resources — spread across AZs — mean that the failure of any one resource removes 10% of capacity, not 100%. Horizontal scaling also means the system can absorb traffic spikes without degraded availability. Stateless components that don't share local state can scale horizontally; stateful components (databases, caches) require additional design (read replicas, ElastiCache clusters, connection pooling).

**4. Stop guessing capacity.** Over-provisioning wastes money; under-provisioning causes availability failures during traffic spikes. AWS's answer is dynamic scaling: EC2 Auto Scaling groups that grow and shrink with load, Lambda that scales automatically to concurrency demand, RDS Serverless v2 that adjusts ACUs (Aurora Capacity Units) based on workload. The reliability risk of under-provisioning is as real as any infrastructure failure.

**5. Manage change through automation.** Manual configuration changes are a leading cause of availability incidents ("the outage was caused by an engineer who accidentally modified the production security group"). All changes — infrastructure, configuration, deployments — should go through automated pipelines with health checks, canary stages, and automated rollback. Change automation reduces the human error rate to near zero; it does not eliminate errors, but it detects and reverses them faster than a human can.

---

### Availability Mathematics

Understanding how to calculate composite availability is an exam and design skill that clarifies exactly where reliability investment should be focused.

**Series components** (all must succeed for the system to function): availability multiplies.
- Component A: 99.9% × Component B: 99.9% = 99.8% system availability
- Three 99.9% components in series: 0.999³ = 99.7%
- Each component added in series reduces total availability. This is why eliminating single points of failure matters: a system with a 99.5% component can never exceed 99.5% regardless of how reliable everything else is.

**Parallel components** (any one can fail without system failure — redundancy): availability calculation is the probability that NOT ALL fail simultaneously.
- P(at least one available) = 1 - P(all fail) = 1 - (1 - A)^n
- Two 99% components in parallel: 1 - (0.01)² = 99.99%
- Two 99.9% components in parallel: 1 - (0.001)² = 99.9999%

**Practical implication:** The weakest link in your series path is your availability ceiling. Adding redundancy (parallel) is the most powerful tool for improving availability. Multi-AZ is a parallel pattern — two AZs each with 99.99% availability gives 1 - (0.0001)² = 99.999999% AZ-level availability.

**Nines to downtime table:**
| Availability | Annual Downtime | Monthly Downtime |
|---|---|---|
| 99% (two nines) | 87.6 hours | 7.3 hours |
| 99.9% (three nines) | 8.76 hours | 43.8 minutes |
| 99.99% (four nines) | 52.6 minutes | 4.4 minutes |
| 99.999% (five nines) | 5.25 minutes | 26.3 seconds |

---

### Failure Tiers and Recovery Patterns

Reliability design should address failures at multiple tiers because the probability, blast radius, and recovery strategy differ at each tier.

**Tier 1 — Component failure** (single instance, single process): Auto Scaling Groups with EC2 health checks replace failed instances automatically. ALB health checks stop routing to unhealthy targets within seconds. For databases, RDS Multi-AZ synchronously replicates to a standby and performs automatic failover in 60–120 seconds. Design ECS services and Lambda functions to be stateless so any instance can handle any request.

**Tier 2 — Availability Zone failure** (rare but must be designed for): Every redundant resource must span multiple AZs. ALB with instances in three AZs, RDS Multi-AZ deployment, ElastiCache with replication across AZs. ASG AZ rebalancing ensures that if instances are lost in one AZ, new instances are launched in surviving AZs. The AZ-awareness of your architecture must be tested — it is common to discover that a "multi-AZ" deployment has a single-AZ session store or cache.

**Tier 3 — Region failure** (low probability, highest impact): Two strategies exist depending on RTO/RPO targets:
- **Active-passive (warm/cold standby)**: primary region serves all traffic; secondary region has infrastructure deployed but idle or at reduced scale. Recovery requires DNS failover (Route 53 health check + failover routing) and data synchronization (Aurora Global Database with typical RPO < 5 seconds and RTO < 1 minute). Cold standby has lower cost but higher RTO (minutes to hours to scale up).
- **Active-active**: both regions serve traffic simultaneously. Traffic distribution via Route 53 latency-based routing or AWS Global Accelerator. Data must be replicated bidirectionally — DynamoDB Global Tables (multi-active, eventual consistency with last-writer-wins), or Aurora Global Database with application-level write routing to the primary. Active-active reduces RTO to near-zero (traffic shifts immediately) but requires resolving write conflicts and accepting eventual consistency trade-offs.

**Tier 4 — Application-layer failure** (bad deployment, dependency failure): Circuit breakers prevent a slow downstream service from holding resources indefinitely. Retry with exponential backoff and jitter prevents thundering herd when a service recovers. Dead-letter queues (SQS DLQ, EventBridge DLQ) capture messages that cannot be processed so they are not lost. Bulkhead pattern uses separate SQS queues, thread pools, or Lambda function instances to prevent a failure in one consumer path from cascading to another.

---

### Retry Patterns: Backoff and Jitter

When a service call fails transiently, the naive response is to retry immediately. This creates a thundering herd: all clients retry simultaneously, compounding the load on the recovering service and turning a brief outage into a sustained one.

**Exponential backoff** increases the wait time between retries geometrically: 1s, 2s, 4s, 8s, 16s. This gives the service time to recover before being hit with another wave of requests.

**Jitter** adds randomness to the backoff delay. Without jitter, all clients using the same backoff schedule retry at the same times, producing synchronized request waves. With jitter (e.g., `random(0, min(cap, base * 2^attempt))`), retries are spread across the backoff window, smoothing load.

AWS SDKs implement exponential backoff with jitter by default for retriable errors. This is the "correct retry" for AWS API calls, DynamoDB operations, SQS receive calls, and any service-to-service call in your architecture.

**Dead-letter queues** handle non-transient failures. If a message fails processing after the maximum number of retries (`maxReceiveCount`), SQS moves it to the DLQ rather than dropping it or blocking the queue. The DLQ allows inspection, debugging, and reprocessing once the issue is resolved. Every SQS queue that drives a critical workload should have a DLQ with a CloudWatch alarm on `ApproximateNumberOfMessagesVisible`.

---

### Chaos Engineering with AWS FIS

AWS Fault Injection Simulator (FIS) enables controlled fault injection experiments to validate that recovery mechanisms actually work. FIS is the operationalization of the insight that "if you haven't tested your recovery path, you don't know if it works."

An FIS **experiment template** defines:
- **Targets**: which resources to act on (by tag, ARN, or random selection from a pool)
- **Actions**: what fault to inject (terminate EC2 instances, inject CPU stress, interrupt Spot instances, inject network latency, pause ECS tasks, fail RDS instances, impair an AZ via network connectivity disruption)
- **Stop conditions**: CloudWatch alarms that immediately halt the experiment if blast radius exceeds expected bounds. The stop condition is the safety valve — if your application's error rate exceeds 5% during the experiment, FIS aborts the fault injection.

Supported fault actions include: `aws:ec2:terminate-instances`, `aws:ec2:inject-api-internal-error`, `aws:ec2:stop-instances`, `aws:ecs:stop-task`, `aws:rds:failover-db-cluster`, `aws:ssm:send-command` (for OS-level stress injection), `aws:network:disrupt-connectivity` (AZ impairment simulation), and `aws:fis:inject-api-throttle-error`.

The rigor of chaos engineering comes from the scientific method applied to systems: state a hypothesis ("if one AZ fails, traffic re-routes within 30 seconds with no customer-visible error"), run the experiment, observe the result, update your understanding if the hypothesis fails. FIS experiments should run in production (with stop conditions) because staging environments rarely replicate production's traffic patterns and dependencies.

---

### Change Management: Safe Deployments

Deployment failures are a leading cause of availability incidents. Safe deployment patterns limit blast radius and enable fast rollback.

**Blue/green deployments**: two identical environments exist simultaneously. The new version ("green") is deployed and tested before any production traffic is switched. Traffic switches from blue to green (DNS, load balancer weights, or Elastic Beanstalk environment swap). Rollback is switching traffic back to blue. Cost: maintaining two environments during the transition window. Best for: stateless applications, Lambda functions, ECS services.

**Canary deployments** (CodeDeploy, API Gateway stage weights, CloudFront continuous deployment): route a small fraction of traffic (1–10%) to the new version. Monitor error rates, latency, and business metrics for a bake period. Automatically complete or roll back based on CloudWatch alarms. Best for: high-traffic services where a full blue/green transition is too risky. The canary percentage limits impact to a small user segment.

**Rolling deployments with health checks**: replace instances or containers in batches, waiting for each batch to pass health checks before proceeding. Slower than blue/green but requires fewer resources. Risk: partially deployed state exists during the rollout. CodeDeploy, ECS rolling update, and Kubernetes rolling update all implement this pattern.

**Feature flags** (LaunchDarkly, AWS AppConfig) decouple deployment from release. Code is deployed to all instances but the feature is disabled by default. The flag is enabled for a subset of users, then progressively rolled out. Rollback is turning the flag off without redeploying. Feature flags enable instant rollback of business logic changes without a deployment pipeline.

---

## Configuration Reference

### AWS FIS Experiment: AZ Impairment with CloudWatch Stop Condition

This experiment template simulates an Availability Zone failure by injecting network connectivity disruption to EC2 instances in a target AZ. A CloudWatch stop condition automatically aborts the experiment if application error rates exceed a threshold.

```json
// fis-experiment-az-impairment.json
// AWS FIS experiment template: simulate AZ failure by disrupting network
// connectivity for all tagged EC2 instances in the target AZ.
//
// Prerequisites:
//   - An IAM role for FIS with permissions to act on EC2 instances and
//     publish to CloudWatch. See fis-iam-role.json below.
//   - A CloudWatch alarm (AZ-Impairment-ErrorRate-Alarm) that fires when
//     the application 5xx error rate exceeds 5%.
//   - EC2 instances tagged with Env=production and AZ=us-east-1a.
{
  "description": "AZ impairment experiment: disrupt network connectivity for instances in us-east-1a and verify traffic re-routes to healthy AZs within 30 seconds",

  "targets": {
    // Target all production EC2 instances in the specific AZ being impaired
    "ProductionInstancesAZ1a": {
      "resourceType": "aws:ec2:instance",
      "resourceTags": {
        "Env": "production",
        "AZ": "us-east-1a"
      },
      // "ALL" means every matching instance — for an AZ impairment test
      // this is intentional; for component tests, use "COUNT" with resourceArns
      "selectionMode": "ALL"
    }
  },

  "actions": {
    // Action 1: Inject network disruption to simulate AZ failure
    // This action uses SSM to run a network disruption command on the instances.
    // Duration: 5 minutes (PT5M) — long enough to verify failover but short
    // enough to limit impact if stop condition doesn't trigger.
    "DisruptAZ1aNetwork": {
      "actionId": "aws:network:disrupt-connectivity",
      "description": "Disrupt all network connectivity on instances in us-east-1a",
      "parameters": {
        // Duration of the network disruption in ISO 8601 format
        "duration": "PT5M",
        // Scope: which traffic to disrupt. "all" disrupts all network I/O.
        // Other options: "ingress" (inbound only), "egress" (outbound only)
        "scope": "all"
      },
      "targets": {
        "Instances": "ProductionInstancesAZ1a"
      }
    }
  },

  "stopConditions": [
    {
      // Abort the experiment if the application error rate exceeds 5%.
      // This protects customers: if re-routing isn't working, we stop the test.
      // The alarm must be in ALARM state to trigger the stop condition.
      "source": "aws:cloudwatch:alarm",
      "value": "arn:aws:cloudwatch:us-east-1:123456789012:alarm:AZ-Impairment-ErrorRate-Alarm"
    }
  ],

  // IAM role that FIS assumes to execute the experiment actions.
  // This role needs ec2:DescribeInstances and ssm:SendCommand permissions.
  "roleArn": "arn:aws:iam::123456789012:role/FIS-ExperimentRole",

  // Tags applied to the experiment for tracking and cost allocation
  "tags": {
    "Purpose": "ReliabilityTesting",
    "ExperimentType": "AZImpairment",
    "Owner": "platform-team"
  },

  // Log configuration: send experiment events to CloudWatch Logs for audit
  "logConfiguration": {
    "cloudWatchLogsConfiguration": {
      "logGroupArn": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/fis/experiments:*"
    },
    // "all" captures both start/stop events and individual action events
    "logSchemaVersion": 2
  }
}
```

```json
// fis-iam-role-trust-policy.json
// Trust policy: allows the FIS service to assume this role
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "fis.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

```json
// fis-iam-role-permissions.json
// Permissions policy for the FIS execution role.
// Principle of least privilege: only the permissions FIS needs to run
// the AZ impairment experiment.
{
  "Version": "2012-10-17",
  "Statement": [
    {
      // Allow FIS to describe and modify EC2 instances for network disruption
      "Sid": "EC2InstanceActions",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "ec2:StopInstances",        // Needed if using aws:ec2:stop-instances action
        "ec2:TerminateInstances"    // Needed if using aws:ec2:terminate-instances action
      ],
      "Resource": "*",
      "Condition": {
        // Only allow FIS to act on instances tagged for reliability testing.
        // This prevents accidentally targeting production resources not opted in.
        "StringEquals": {
          "ec2:ResourceTag/Env": "production"
        }
      }
    },
    {
      // SSM SendCommand is used by FIS to inject network disruption scripts
      "Sid": "SSMSendCommand",
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand",
        "ssm:GetCommandInvocation",
        "ssm:ListCommandInvocations"
      ],
      "Resource": [
        "arn:aws:ssm:*:*:document/AWSFIS-Run-Network-Disruption",
        "arn:aws:ec2:*:*:instance/*"
      ]
    },
    {
      // CloudWatch: read alarm state (for stop conditions) and publish metrics
      "Sid": "CloudWatchAlarmAccess",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:DescribeAlarms",
        "cloudwatch:GetMetricData"
      ],
      "Resource": "*"
    },
    {
      // CloudWatch Logs: write experiment events for audit trail
      "Sid": "CloudWatchLogsWrite",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogDelivery",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups"
      ],
      "Resource": "arn:aws:logs:*:123456789012:log-group:/aws/fis/experiments:*"
    }
  ]
}
```

```bash
# CLI: start the FIS experiment after creating the template
# Step 1: create the experiment template from the JSON file
aws fis create-experiment-template \
  --cli-input-json file://fis-experiment-az-impairment.json \
  --region us-east-1

# Step 2: capture the template ID from the response
TEMPLATE_ID=$(aws fis list-experiment-templates \
  --query "experimentTemplates[?tags.ExperimentType=='AZImpairment'].id" \
  --output text \
  --region us-east-1)

# Step 3: start the experiment
# This will immediately begin network disruption on the targeted instances.
# Monitor your application dashboard and ALB 5xx metrics while the experiment runs.
EXPERIMENT_ID=$(aws fis start-experiment \
  --experiment-template-id "$TEMPLATE_ID" \
  --region us-east-1 \
  --query "experiment.id" \
  --output text)

echo "Experiment started: $EXPERIMENT_ID"

# Step 4: poll experiment state until it completes or stop condition triggers
aws fis get-experiment \
  --id "$EXPERIMENT_ID" \
  --region us-east-1 \
  --query "experiment.state"

# Expected outcomes to verify during the experiment:
#   - ALB stops routing to instances in us-east-1a within 30 seconds
#   - Application error rate stays below 1% as measured by the stop condition alarm
#   - After 5 minutes, network connectivity restores automatically
#   - Instances in us-east-1a re-register with the ALB target group
```

---

## How to Decide

### Choosing a Failover Architecture by RTO and RPO

| Failure scope | Target RTO | Target RPO | Architecture |
|---|---|---|---|
| EC2 instance | < 60 seconds | 0 | Auto Scaling Group with ALB health checks; EC2 replacement |
| RDS instance | 60–120 seconds | 0 (synchronous replication) | RDS Multi-AZ (automated failover to standby) |
| AZ failure | < 60 seconds | 0 | Multi-AZ ASG + Multi-AZ RDS + Multi-AZ ElastiCache |
| Region failure (low criticality) | Hours | Hours | Backup and restore; CloudFormation + AMI cross-region copy |
| Region failure (medium criticality) | 15–60 minutes | Minutes | Pilot light / warm standby + Route 53 failover + Aurora Global |
| Region failure (high criticality) | < 5 minutes | < 1 second | Active-active + DynamoDB Global Tables or Aurora Global DB |
| Region failure (near-zero tolerance) | < 60 seconds | 0 | Active-active + Global Accelerator + DynamoDB Global Tables |

### Choosing Between Deployment Safety Patterns

| Requirement | Pattern | Key advantage |
|---|---|---|
| Zero-downtime, immediate rollback | Blue/green | Instant cutover and rollback; parallel environments |
| Limit blast radius to small % of traffic | Canary | Monitor on a small cohort before full rollout |
| Limited extra capacity available | Rolling update | Uses existing instances; no parallel environment cost |
| Rollback without redeployment | Feature flags (AppConfig) | Toggle business logic at runtime |
| Database schema changes with rollback | Expand/contract pattern + feature flags | Backward-compatible schema changes before code cutover |

---

## How This Connects

- **Route 53** is the primary regional failover mechanism for active-passive architectures. Route 53 health checks poll endpoints (HTTP, HTTPS, TCP) and automatically switch DNS records from primary to secondary when the primary becomes unhealthy. Combined with Aurora Global Database, this achieves sub-5-minute RTO for full region failover with RPO of typically less than 1 second.
- **SQS and EventBridge** implement the bulkhead and DLQ patterns at the application tier. SQS decouples producers from consumers, absorbs traffic bursts, and routes failed messages to DLQs without losing data. EventBridge DLQ captures events that couldn't be delivered to a target, enabling retry and inspection. These services eliminate tight temporal coupling between components.
- **AWS Auto Scaling** implements horizontal scaling and automatic component recovery simultaneously. ASG health checks (EC2 status checks or ELB health checks) detect failed instances; replacement instances launch automatically. Target tracking scaling policies prevent under-provisioning under traffic spikes — addressing both availability (no overload) and cost (no over-provisioning).
- **AWS CloudFormation / CDK** is the foundation of change management reliability. Infrastructure deployed as code can be re-deployed identically in a secondary region in minutes. Drift detection identifies manual changes that have deviated from the stack definition. Stack policies prevent accidental updates to stateful resources (RDS, DynamoDB) during deployments.

---

## Exam Traps

**Trap 1: "RDS Multi-AZ improves read performance."**
RDS Multi-AZ (standard, not Multi-AZ Cluster) does not serve read traffic from the standby. The standby replica is idle — it exists solely for failover. Read scaling requires Read Replicas. RDS Multi-AZ Cluster (newer; up to 2 readable standbys) is the exception, but the standard exam answer for "high availability" is Multi-AZ and "read scaling" is Read Replicas.

**Trap 2: "A 99.99% SLA from AWS means your application will be 99.99% available."**
AWS service SLAs define credit thresholds, not actual uptime guarantees. More importantly, your application's availability is determined by the composite availability of all components, not any single service's SLA. If your application chains three services each at 99.9%, your composite availability is ~99.7%. The weakest link in series defines your ceiling.

**Trap 3: "Exponential backoff without jitter is sufficient to prevent thundering herd."**
Without jitter, clients on the same backoff schedule retry in synchrony. All clients see the same failure at T=0, wait 1 second, retry simultaneously at T=1, fail again, wait 2 seconds, retry simultaneously at T=3, etc. The thundering herd is delayed but not eliminated. Full jitter (random value between 0 and the backoff ceiling) spreads retries across the window and eliminates synchronization.

**Trap 4: "Aurora Global Database provides active-active writes in all regions."**
Aurora Global Database has one primary region (read/write) and up to five secondary regions (read-only replicas). Writes must go to the primary region. For active-active writes, the correct answer is DynamoDB Global Tables (which uses last-writer-wins conflict resolution). Aurora Global Database is active-passive for writes; it is not the right answer when the scenario requires both regions to accept writes simultaneously.

**Trap 5: "Chaos engineering is too dangerous to run in production."**
The purpose of FIS stop conditions is precisely to make production chaos engineering safe. A well-designed experiment has a stop condition alarm that aborts the fault injection if blast radius exceeds expected bounds. Running experiments only in staging misses production-specific failure modes (real traffic patterns, real dependencies, real scale). The exam reflects the AWS position: test in production with stop conditions, because staging doesn't replicate production.

---

## Summary

- Reliability is about automatic recovery from failures that are assumed inevitable — not about preventing all failures. The measure is availability, calculated as composite availability across all series components.
- AWS reliability architecture organizes by failure tier: component (ASG, health checks), AZ (multi-AZ deployments), region (Route 53 failover + Aurora Global or DynamoDB Global Tables), and application (circuit breakers, DLQs, retry with jitter).
- Availability math reveals your weakest link: any single-point-of-failure component defines the system availability ceiling regardless of how reliable everything else is.
- Chaos engineering with AWS FIS is the only way to verify that recovery mechanisms work — runbooks that have never been exercised are hypotheses, not recovery procedures.
- Safe deployment patterns (blue/green, canary, feature flags) treat deployments as a reliability concern — a bad deployment is as dangerous as a hardware failure, and rollback must be as automated as any other recovery.
- The active-active vs. active-passive choice is driven by RTO and write-conflict tolerance: active-active achieves near-zero RTO but requires accepting eventual consistency or last-writer-wins semantics; active-passive accepts minutes of RTO in exchange for simpler consistency.

---

## Examples

**Beginner:** A web application runs on a single EC2 instance with an RDS MySQL database. After a disk failure takes down the EC2 instance for six hours, the team wants to improve reliability. They migrate to an Auto Scaling Group with a minimum of two instances across two AZs, put an ALB in front of it, and enable RDS Multi-AZ. The ASG health checks (ELB-based) now detect a failed instance within 30 seconds and replace it. RDS Multi-AZ means a standby replica exists in a second AZ and failover is automatic within 60–120 seconds. This moves the application from a single AZ, single instance architecture to one that tolerates both EC2 instance failure and AZ-level failure.

**Intermediate:** A financial services platform needs 99.99% availability for its order processing service. The team models composite availability: the ALB (99.99%), three EC2 instances in an ASG across three AZs (parallel = much higher), RDS Multi-AZ (99.95% per AWS SLA), and an ElastiCache Redis cluster. The series calculation reveals that RDS Multi-AZ is the limiting factor. They upgrade to RDS Multi-AZ Cluster and add a read replica to offload reporting queries. They run an FIS experiment: terminate all instances in one AZ. The ALB stops routing to the impaired AZ within 15 seconds, error rate peaks at 0.3% during the transition, and the ASG launches replacement instances in the surviving AZs within 3 minutes. The stop condition alarm at 5% does not trigger, confirming the hypothesis.

**Advanced:** A global e-commerce platform requires near-zero RTO and RPO for their product catalog and shopping cart services across three AWS regions (us-east-1, eu-west-1, ap-southeast-1). The catalog service uses DynamoDB Global Tables (multi-active writes, last-writer-wins, typical replication lag under 1 second). The shopping cart service uses an application that routes writes to the user's home region and reads locally — last-writer-wins is acceptable because concurrent cart edits by the same user are an edge case. AWS Global Accelerator routes users to the nearest healthy regional endpoint, with automatic health-check-based failover under 30 seconds. Deployments use CodePipeline with a canary stage that routes 5% of traffic to the new version for 15 minutes before completing the rollout; CodeDeploy monitors a custom CloudWatch metric (order-success-rate) and automatically rolls back if it drops below the baseline. Monthly FIS experiments test regional failover by simulating 100% packet loss to one region and verifying that Global Accelerator routes all traffic away within 60 seconds.

---

## Think About It

1. Your e-commerce application has a composite availability of 99.9%, which translates to about 8.7 hours of downtime per year. Your CEO wants 99.99%. What is the first question you would ask before proposing an architecture change, and why does the answer change the recommendation?

2. An SQS queue processes payment confirmation messages. The DLQ has 500 messages. Before you start debugging and reprocessing them, what information do you need about those messages, and what could go wrong if you reprocess all 500 at once?

3. Your team runs a chaos experiment: terminate all EC2 instances in us-east-1b. The application error rate jumps to 40% for two minutes before recovering. The stop condition alarm (at 5% error rate) should have aborted the experiment at second 15. Why might the stop condition not have triggered, and what would you check?

4. You are designing a multi-region active-active architecture using DynamoDB Global Tables. Two users in different regions simultaneously update the same DynamoDB item (e.g., the available quantity of a product drops from 1 to 0). What conflict resolution strategy does DynamoDB apply, and what application-level design would prevent the consistency problem this creates?

5. A developer proposes that all reliability testing can happen in the staging environment, saving money and risk. What specific failure modes would staging testing miss that production testing with FIS would catch?

---

## Quick Check

**Question 1:** A company runs a three-tier web application. Each tier has the following availability: load balancer 99.99%, application tier 99.95% (three instances in parallel across AZs), database 99.95% (RDS Multi-AZ). What is the approximate end-to-end availability of the system?

A. 99.99%  
B. 99.95%  
C. 99.89%  
D. 99.94%  

**Answer: C (approximately 99.89%).** Components in series multiply. The load balancer (99.99% = 0.9999), application tier (99.95% = 0.9995), and database (99.95% = 0.9995) in series: 0.9999 × 0.9995 × 0.9995 ≈ 0.9989 = 99.89%. The weakest links are the app tier and database at 99.95% each. Note: the application tier's three-instance parallel configuration raises its actual availability above 99.95%, but for exam purposes the advertised service availability is the typical input.

---

**Question 2:** Your application processes orders via an SQS queue. An upstream service occasionally sends malformed messages that cause the consumer Lambda function to throw an exception. After several retries, these messages block the queue. Which configuration correctly handles this scenario?

A. Set the SQS `VisibilityTimeout` to 0 so failed messages are immediately retried by another consumer  
B. Configure a dead-letter queue on the SQS queue with `maxReceiveCount` set to 3, and add a CloudWatch alarm on the DLQ's `ApproximateNumberOfMessagesVisible` metric  
C. Enable SQS FIFO queues to ensure ordered processing eliminates failures  
D. Increase the Lambda function timeout so it has more time to process malformed messages  

**Answer: B.** A DLQ with `maxReceiveCount` = 3 moves messages to the DLQ after 3 failed processing attempts, preventing them from blocking the queue. The CloudWatch alarm on DLQ depth alerts the team to investigate. Setting VisibilityTimeout to 0 (A) causes the message to be visible to other consumers immediately — creating an infinite retry loop, not a solution. FIFO queues (C) enforce ordering but do not solve the malformed message problem; they can make it worse by blocking all messages behind the failed one. Increasing Lambda timeout (D) does not address malformed data — the function will still fail, just more slowly.

---

**Question 3:** A company wants to implement regional failover for their application. Their RPO must be less than 30 seconds and RTO less than 5 minutes. Which combination of services best meets these requirements?

A. Amazon S3 cross-region replication with manual Route 53 record updates  
B. Aurora Global Database (primary in us-east-1, secondary in us-west-2) with Route 53 health check-based failover routing  
C. RDS Multi-AZ in us-east-1 with a manual snapshot copy to us-west-2 every 30 minutes  
D. DynamoDB on-demand backup with cross-region restore and Application Load Balancer in both regions  

**Answer: B.** Aurora Global Database provides typical RPO of under 1 second via its dedicated replication network (data written in us-east-1 replicates to us-west-2 typically within 1 second). Route 53 health checks detect primary region failure and automatically update DNS within 60–90 seconds; combined with the Aurora Global Database managed failover (promote secondary to primary), RTO is typically under 1–2 minutes. S3 CRR with manual DNS (A) is manual, violating the RTO requirement. RDS with snapshots every 30 minutes (C) violates the 30-second RPO. DynamoDB restore (D) has a multi-hour RTO for a large table, violating the 5-minute RTO.

---

## What's Next

The next lesson covers the Cost Optimization Pillar deep dive — FinOps practices, Savings Plans vs. Reserved Instances, Spot interruption handling, right-sizing with Compute Optimizer, and the data transfer cost patterns that surprise most teams at scale.
