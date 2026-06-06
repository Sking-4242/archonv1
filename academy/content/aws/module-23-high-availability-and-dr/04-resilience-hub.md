---
title: "AWS Resilience Hub and Chaos Engineering"
type: content
estimated_minutes: 11
cert_tags: ["SAA-C03", "SAP-C02"]
---

# AWS Resilience Hub and Chaos Engineering

## Overview

Designing for resilience is necessary but not sufficient. An architecture that looks resilient on a diagram may have configuration gaps (health checks not enabled, DLQ missing, Lambda timeout too short), operational gaps (runbooks not tested, alarm thresholds misconfigured), or dependency gaps (a third-party API that is a silent SPOF). These gaps do not appear in architecture reviews — they only appear when systems fail. AWS Resilience Hub and AWS Fault Injection Service (FIS) exist to surface these gaps before production failures do.

AWS Resilience Hub performs automated static analysis of your deployed AWS resources, comparing them against your defined RTO and RPO targets and generating a prioritized list of resilience improvements. FIS enables controlled chaos engineering experiments — deliberately injecting failures (terminated instances, injected latency, simulated Spot interruptions, RDS failovers) under controlled conditions with safety stops, so you can observe and measure your system's actual behavior under failure rather than theorizing about it.

For the SAA exam, understand what Resilience Hub assesses, FIS's basic mechanism and stop conditions, and the concept of chaos engineering for resilience validation. SAP adds Resilience Hub integration into CI/CD pipelines, FIS experiment templates, multi-fault injection across services, and the operational discipline of GameDays. After this lesson, you will be able to explain how to validate an HA architecture beyond the design phase.

---

## Core Concepts

### AWS Resilience Hub

Resilience Hub analyzes a defined **application** — a logical grouping of AWS resources (EC2, RDS, ECS, Lambda, DynamoDB, SQS, etc.) that together implement a workload. You define the application in Resilience Hub, set your RTO and RPO targets, and run an assessment.

**What the assessment evaluates:**
- **HA gaps**: single-instance EC2, single-AZ RDS without Multi-AZ, missing read replicas, Lambda with no DLQ, SQS without DLQ
- **Backup coverage**: RDS automated backups, DynamoDB point-in-time recovery, EBS snapshot policies, EFS backup policies
- **Recovery configuration**: missing Route 53 health checks, Lambda reserved concurrency too low, ECS minimum healthy percent
- **Well-Architected alignment**: specific reliability best practices from the Reliability Pillar

**Output**: a **resiliency score** (0–100) and a prioritized list of improvements organized by risk level. Each recommendation links to the specific resource and the exact configuration change needed.

**CI/CD integration**: run Resilience Hub assessments via API as a pipeline stage in CodePipeline. When infrastructure changes are deployed, an assessment runs automatically. If the resiliency score drops below a configured threshold (e.g., falls below 75 after a developer removes Multi-AZ from a CloudFormation template), the pipeline fails — preventing a resilience regression from reaching production.

---

### AWS Fault Injection Service (FIS)

FIS runs **controlled chaos engineering experiments** on AWS infrastructure. An experiment defines:
- **Targets**: which resources to affect (all EC2 instances tagged `Env=prod`, a specific RDS cluster, a specific ECS service)
- **Actions**: what failure to inject (terminate instances, add network latency, inject CPU stress, interrupt Spot instances, initiate RDS failover, stop ECS tasks)
- **Stop conditions**: CloudWatch alarms that automatically halt the experiment if impact exceeds safe bounds

**Pre-built action types:**
- `aws:ec2:terminate-instances`: terminate EC2 instances matching the target filter
- `aws:ec2:inject-api-internal-error`: inject 5xx errors on EC2 API calls (tests SDK retry behavior)
- `aws:elasticloadbalancing:inject-unhealthy-targets`: mark ALB targets as unhealthy (tests ALB failover without actually terminating instances)
- `aws:rds:failover-db-cluster`: trigger RDS Multi-AZ or Aurora failover
- `aws:ecs:stop-task`: stop ECS tasks (tests ECS service recovery)
- `aws:fis:inject-latency`: inject network latency on EC2 network traffic
- `aws:ec2:send-spot-instance-interruptions`: simulate Spot instance interruption notice (sends 2-minute warning and terminates)

**Stop conditions**: CloudWatch alarms attached to the experiment. If a specified alarm enters ALARM state during the experiment, FIS terminates all actions immediately. This is the safety boundary that makes FIS safe for controlled use in production environments — you define the impact ceiling (e.g., "if 5xx error rate exceeds 1%, stop the experiment") and FIS enforces it automatically.

---

### GameDays

A **GameDay** is a planned failure exercise where the operations team simulates a failure scenario (AZ failure, database failover, traffic spike, Spot interruption wave) and tests their response — both automated and human. FIS provides the failure injection mechanism; the GameDay provides the organizational exercise.

**What GameDays reveal that architecture reviews miss:**
- Alarm thresholds set too conservatively (alerting on noise, not signal) or too aggressively (missing real failures)
- Runbooks that were accurate 18 months ago but have drifted from current architecture
- Alert routing that goes to someone who no longer carries the pager
- Dependency on one on-call engineer's institutional knowledge to execute recovery
- Actual RTO (measured in the GameDay) vs. theoretical RTO (estimated in the DR plan) — these often differ significantly

**GameDay process:**
1. Define the failure scenario and expected system behavior
2. Configure FIS experiment with appropriate stop conditions
3. Execute during a planned maintenance window (or a replica environment for first runs)
4. Measure actual recovery time, alert timing, and any customer impact
5. Document gaps and create remediation action items
6. Test again after remediation to verify improvements

---

### The Well-Architected Reliability Pillar

The Reliability Pillar's five design principles define the operational discipline that Resilience Hub and FIS support:
1. **Automatically recover from failure**: health checks, Auto Scaling, and CloudWatch alarms — not humans — detect and respond to failures
2. **Test recovery procedures**: use FIS and GameDays to validate that recovery works; do not assume it will
3. **Scale horizontally**: distributed, redundant components instead of single large components
4. **Stop guessing capacity**: Auto Scaling instead of manual sizing
5. **Manage change through automation**: IaC, CI/CD pipelines, and automated testing — not console click-ops

---

## Configuration Reference

### Example: FIS Experiment — EC2 Instance Termination with Stop Condition

```json
{
  "description": "Terminate 50% of prod-app instances to test ASG self-healing",
  "targets": {
    "prod-instances": {
      "resourceType": "aws:ec2:instance",
      "resourceTags": {
        "Environment": "prod",
        "Application": "api"
      },
      "selectionMode": "PERCENT(50)"
    }
  },
  "actions": {
    "terminate-half": {
      "actionId": "aws:ec2:terminate-instances",
      "parameters": {},
      "targets": {
        "Instances": "prod-instances"
      }
    }
  },
  "stopConditions": [
    {
      "source": "aws:cloudwatch:alarm",
      "value": "arn:aws:cloudwatch:us-east-1:123456789012:alarm/ProdApp-5xx-ErrorRate-High"
    }
  ],
  "roleArn": "arn:aws:iam::123456789012:role/fis-experiment-role",
  "tags": {
    "Purpose": "ASG-selfhealing-validation"
  }
}
```

```bash
# Create and run the FIS experiment
EXPERIMENT_ID=$(aws fis create-experiment-template \
  --cli-input-json file://fis-terminate-instances.json \
  --query id --output text \
  --region us-east-1)

# Start the experiment (during a planned maintenance window)
aws fis start-experiment \
  --experiment-template-id $EXPERIMENT_ID \
  --region us-east-1

# Monitor experiment status
aws fis get-experiment \
  --id $EXPERIMENT_ID \
  --query 'experiment.state' \
  --region us-east-1
# Watch: RUNNING → COMPLETED (if stop conditions not breached)
#        RUNNING → STOPPED (if a stop condition alarm breached — review impact)
```

> **Note:** The stop condition alarm (`ProdApp-5xx-ErrorRate-High`) should be configured with a tight threshold — 1–2% error rate is appropriate for most production systems. If the alarm fires, FIS stops immediately. This safety boundary is what enables FIS experiments in production environments rather than restricting them to staging.

---

### Example: Resilience Hub Assessment via API (CI/CD Integration)

```bash
# Create a Resilience Hub application
APP_ARN=$(aws resiliencehub create-app \
  --name prod-api-app \
  --description "Production API application" \
  --policy-arn arn:aws:resiliencehub:us-east-1:123456789012:resiliency-policy/high-availability-policy \
  --query app.appArn --output text \
  --region us-east-1)

# Import resources from a CloudFormation stack
aws resiliencehub import-resources-to-draft-app-version \
  --app-arn $APP_ARN \
  --terraform-sources '[{
    "s3StateFileUrl": "s3://my-terraform-state/prod/api/terraform.tfstate"
  }]' \
  --region us-east-1

# Publish the app version
aws resiliencehub publish-app-version \
  --app-arn $APP_ARN \
  --region us-east-1

# Run an assessment and wait for results
ASSESSMENT_ARN=$(aws resiliencehub start-app-assessment \
  --app-arn $APP_ARN \
  --app-version "release" \
  --assessment-name "post-deployment-check" \
  --query assessment.assessmentArn --output text \
  --region us-east-1)

# Wait and retrieve the score
aws resiliencehub describe-app-assessment \
  --assessment-arn $ASSESSMENT_ARN \
  --query 'assessment.{Score:resiliencyScore,ComplianceStatus:complianceStatus}' \
  --region us-east-1
# If ComplianceStatus is "PolicyBreached" — score is below the policy threshold
# Fail the CI/CD pipeline at this stage to prevent deploying a resilience regression
```

---

## How to Decide

**When to use Resilience Hub vs. FIS:**

| Tool | Use when |
|---|---|
| Resilience Hub | Static analysis: identify configuration gaps, validate architecture against RTO/RPO, integrate into CI/CD for automated checks |
| FIS | Dynamic testing: validate that recovery mechanisms actually work under real failure conditions, measure actual RTO, discover operational gaps |

Both are needed — Resilience Hub finds configuration gaps; FIS finds execution gaps. A perfect Resilience Hub score does not guarantee that your runbooks are current, your alarms are tuned, or that your team can execute recovery within the RTO.

**FIS experiment progression:**

Start with non-production environments, then promote to production:
1. First run: isolated dev/staging environment — validate experiment design and stop conditions
2. Second run: production during off-peak hours (low traffic reduces blast radius)
3. Ongoing: production during peak hours (maximum validation, maximum risk management)

**GameDay frequency:**

- Major workloads: quarterly
- Immediately after significant architecture changes
- After new team members join the on-call rotation
- After any production incident where the recovery took longer than the RTO target

---

## How This Connects

- **CloudFormation / CDK** — Resilience Hub imports resource definitions from CloudFormation stacks or Terraform state files to analyze the as-deployed architecture. Keeping IaC current ensures Resilience Hub assessments reflect actual deployed state.
- **CloudWatch** — FIS stop conditions are CloudWatch alarms. All FIS experiment safety boundaries are implemented via CloudWatch. Properly tuned CloudWatch alarms are a prerequisite for safe FIS production experiments.
- **Auto Scaling Groups** — The primary target of EC2 instance termination experiments. FIS validates that the ASG detects the terminated instances via health checks and replaces them within the expected timeframe. The experiment measures the actual self-healing time.
- **CodePipeline** — Resilience Hub API integration in a pipeline stage validates that infrastructure changes don't regress the resiliency score. A failing assessment blocks the deployment before it reaches production.
- **SNS / EventBridge** — FIS publishes experiment lifecycle events to EventBridge. Use these events to: notify the on-call engineer when an experiment starts, trigger runbook automation when a stop condition fires, or log experiment results to a tracking system.
- **AWS Well-Architected Tool** — Resilience Hub assessments align with the Reliability Pillar questions in the Well-Architected Tool. Running both tools provides complementary views: WAT for qualitative design review, Resilience Hub for quantitative configuration analysis.

---

## Exam Traps

- **Resilience Hub scores are relative to your RTO/RPO targets — not absolute**: a score of 75 on an application with RTO=4 hours might indicate full compliance; the same score on an application with RTO=5 minutes likely indicates significant gaps. The score is meaningful only in the context of the policy (RTO/RPO targets) attached to the application.
- **FIS stop conditions are required for safe production experiments**: an FIS experiment without stop conditions has no automatic safety boundary — if impact exceeds expectations, it continues until the experiment duration expires. Always configure stop conditions before running experiments in production.
- **Chaos engineering is not the same as randomly breaking things**: a GameDay is a structured, planned exercise with defined scope, success criteria, rollback plans, and stop conditions. "We'll just break something and see what happens" is not chaos engineering — it is an outage waiting to happen.
- **Resilience Hub assesses deployed resources, not CloudFormation templates**: Resilience Hub analyzes what is actually running in your account, not what is defined in your IaC templates. If your CloudFormation template specifies Multi-AZ but the deployment failed silently and the RDS instance is single-AZ, Resilience Hub will flag the gap — the template will not.
- **A passing FIS experiment does not prove your RTO**: an FIS experiment validates that specific recovery mechanisms work (ASG replaces instances, RDS fails over, etc.). Your overall RTO includes all recovery steps: detection time, decision time, execution time, validation time, and DNS propagation. Measure all of these during GameDays, not just the technical recovery of individual components.

---

## Summary

- AWS Resilience Hub performs automated static analysis of deployed AWS resources against defined RTO/RPO targets, generating a prioritized remediation list — use in CI/CD pipelines to catch resilience regressions.
- AWS Fault Injection Service (FIS) runs controlled chaos engineering experiments with stop conditions tied to CloudWatch alarms — enabling validated failure testing from dev/staging up to production.
- FIS pre-built actions cover EC2 termination, RDS failover, ECS task stopping, network latency injection, Spot interruption simulation, and ALB target unhealthy marking.
- Stop conditions are the safety mechanism that makes FIS safe for production use — always configure at least one CloudWatch alarm stop condition before running any experiment.
- GameDays are structured exercises that combine FIS failure injection with operational team response — measuring actual RTO, discovering alarm and runbook gaps, and validating that recovery works under realistic conditions.
- The Reliability Pillar's core principle: test recovery procedures, don't assume they work. An untested DR plan is a hypothesis; a tested one is a known capability.

---

## Examples

A startup team builds their first multi-tier web application with Multi-AZ RDS, an ALB, and an ASG (minimum 2). Before go-live, they run their application through Resilience Hub with a 1-hour RTO and 15-minute RPO policy. The assessment flags two gaps: their EFS file system has no backup policy (RPO violation) and their ASG minimum is 1 rather than 2 (HA gap). Both gaps were invisible in their architecture diagram. After fixing both issues, the assessment passes. Without Resilience Hub, the missing backup policy would have been an undiscovered vulnerability until a disaster revealed it.

A platform engineering team integrates Resilience Hub into their CodePipeline infrastructure pipeline. Every time a Terraform change is merged to the `main` branch, the pipeline runs a Resilience Hub assessment as a gating stage. When a developer accidentally removes the `multi_az = true` flag from an RDS module while cutting staging costs and forgets to revert before merging, the pipeline assessment detects the resulting single-AZ RDS configuration and fails — the resiliency score drops from 91 to 63, below the team's 75-point threshold. The deployment is blocked and the developer is notified within minutes of their commit.

A senior SRE team at a financial services company runs monthly FIS GameDays simulating AZ failures. They configure an experiment that terminates all EC2 instances in `us-east-1a` and injects 100ms of latency on all traffic from the remaining AZs. Stop conditions are tied to an alarm on 5xx error rate > 0.5%. During the first GameDay, the experiment reveals that their Route 53 health check interval was 30 seconds — meaning DNS failover lagged behind actual instance failure by nearly a minute, producing a 55-second window of elevated errors before healthy instances absorbed the traffic. They tune the health check interval to 10 seconds. The second GameDay shows the error window reduced to 18 seconds. The difference between the designed and proven RTO was 37 seconds — a gap that only a chaos experiment could reveal.

---

## Think About It

1. Why is an untested DR plan described as "just a hypothesis"? Name three specific types of failure that a real-world disaster drill reveals that a design review or documentation review cannot.
2. Resilience Hub gives your application a resiliency score of 72 out of 100. Your application still meets its stated RTO and RPO targets. Is 72 a problem? What does the score tell you that the RTO/RPO targets do not?
3. How would you design FIS stop conditions for a production chaos experiment on an e-commerce checkout service? What CloudWatch metrics would you use, what thresholds would you set, and why?
4. A GameDay reveals that your actual RTO is 3.5 hours against a 2-hour target. You have two options: invest in Warm Standby infrastructure (expensive) or revise the RTO target upward (free). How would you structure the conversation with business stakeholders to make this decision?
5. What trade-offs do you accept when you integrate Resilience Hub assessments into CI/CD pipelines for every deployment versus running them only during periodic quarterly reviews?

---

## Quick Check

**Q1.** AWS Resilience Hub analyzes your application and identifies that an RDS database is configured without Multi-AZ. Your defined RTO is 1 hour and RPO is 30 minutes. What does Resilience Hub generate?

- A) An automatic remediation that enables Multi-AZ on the RDS instance
- B) A compliance failure and a prioritized recommendation to enable RDS Multi-AZ, because the single-AZ configuration cannot meet the defined RTO/RPO
- C) An SLA breach report sent to AWS Support
- D) A CloudWatch alarm that triggers when RDS fails

**Answer: B** — Resilience Hub performs static analysis and generates prioritized findings — it does not automatically remediate. It surfaces the single-AZ RDS configuration as a risk to the defined RTO/RPO and recommends enabling Multi-AZ. Actual remediation is the customer's responsibility.

---

**Q2.** An FIS experiment is running and terminates 50% of production EC2 instances. Thirty seconds later, the application's 5xx error rate CloudWatch alarm enters ALARM state (above the 1% threshold). What happens?

- A) FIS continues the experiment and logs the alarm state for post-experiment analysis
- B) FIS immediately stops all experiment actions because the stop condition alarm breached
- C) FIS pauses the experiment and waits for human approval to continue
- D) FIS rolls back the terminated instances

**Answer: B** — When a stop condition alarm breaches during a running FIS experiment, FIS immediately terminates all active experiment actions. This is the safety boundary mechanism. FIS does not pause-and-wait or roll back terminated resources — the stop condition halts injection, but already-terminated instances remain terminated. The on-call team takes over from that point.

---

**Q3.** Which statement best describes the relationship between Resilience Hub and AWS Fault Injection Service (FIS)?

- A) They are redundant — using one eliminates the need for the other
- B) Resilience Hub identifies static configuration gaps; FIS validates whether recovery mechanisms actually work under real failure conditions
- C) Resilience Hub runs chaos experiments; FIS analyzes the results
- D) Both tools perform the same analysis using different algorithms — use whichever is cheaper

**Answer: B** — Resilience Hub is a static analysis tool — it identifies configuration issues by examining resource properties. FIS is a dynamic testing tool — it injects real failures to validate actual system behavior. A perfect Resilience Hub score confirms good configuration; FIS confirms that the configuration actually produces correct behavior when components fail. Both are needed for complete resilience validation.

---

## What's Next

This completes Module 23: High Availability and Disaster Recovery. You now understand the full resilience picture — from eliminating single points of failure (HA Fundamentals), planning for regional failures (Disaster Recovery), scaling dynamically (Auto Scaling), to validating that resilience assumptions hold under real failure conditions (Resilience Hub and FIS). The next module covers cost optimization — the discipline that ensures your architecture is not only resilient but also economically sustainable.
