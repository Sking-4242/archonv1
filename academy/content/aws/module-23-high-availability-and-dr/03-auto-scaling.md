---
title: "Auto Scaling: Dynamic Capacity Management"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SAP-C02"]
---

# Auto Scaling: Dynamic Capacity Management

## Overview

Auto Scaling automatically adjusts compute capacity in response to demand — adding instances when load increases, removing them when it decreases, and replacing unhealthy instances without human intervention. It serves two distinct purposes: cost optimization (don't pay for idle capacity during off-peak hours) and high availability (maintain desired capacity even when instances fail). These two purposes are served by the same mechanism, which is what makes Auto Scaling one of the most important concepts in AWS architecture.

The problem Auto Scaling solves is static provisioning. Without it, you provision for peak load and pay for that capacity 24/7 — even when most of it sits idle. Or you under-provision for cost and suffer performance degradation during peaks. Auto Scaling eliminates the binary choice by making capacity dynamic: the fleet is exactly the right size for current demand, adjusting continuously.

For the SAA exam, understand ASG structure (min, max, desired), the three scaling policy types (Target Tracking, Step, Scheduled), Predictive Scaling, and how ASGs integrate with ALBs for self-healing fleets. SAP adds detailed scaling policy configuration (cooldowns, warmup, instance refresh), mixing On-Demand and Spot in a single ASG, and lifecycle hooks for graceful scale-in. After this lesson, you will be able to select the right scaling policy for a given traffic pattern and design a self-healing, cost-optimized compute fleet.

---

## Core Concepts

### Auto Scaling Groups (ASG)

An ASG is a logical grouping of EC2 instances that Auto Scaling manages. Three capacity bounds define the fleet's operating range:

- **Minimum capacity**: the floor — the ASG will never reduce below this count even during extended low traffic. Set to at least 2 (across 2+ AZs) for any production workload.
- **Maximum capacity**: the ceiling — the ASG will never exceed this count regardless of demand. Prevents runaway scaling from cost overruns or infinite-loop scaling conditions.
- **Desired capacity**: the current target. The ASG continuously works to maintain this count — launching new instances when actual count < desired, terminating instances when actual > desired.

**Launch Templates** define the instance configuration: AMI, instance type, security groups, IAM instance profile, user data script, key pair, and tags. Launch Templates replace the older Launch Configurations (which are being phased out) and are required for mixed instance fleets (combining instance types) and Spot integration.

**AZ distribution**: the ASG attempts to keep instances evenly distributed across configured AZs. If one AZ has fewer instances than others (e.g., after an AZ failure termination), the ASG launches replacements in other AZs to restore balance.

---

### Scaling Policy Types

**Target Tracking Scaling** is the recommended default. You specify a metric and a target value; the ASG calculates the required capacity change to maintain that target. The policy handles both scale-out and scale-in automatically:
- `ASGAverageCPUUtilization`: scale to keep average CPU at 50% — the most common choice
- `ALBRequestCountPerTarget`: scale to keep the number of ALB requests per target below a threshold — better for request-rate scaling
- `ASGAverageNetworkIn/Out`: scale based on network bytes processed

The algorithm adds a 300-second cooldown by default after scale-out (preventing thrashing) and a 300-second cooldown after scale-in (preventing premature removal of recently added instances). Adjust `EstimatedInstanceWarmup` to match your application's actual startup time.

**Step Scaling** defines explicit step adjustments at multiple threshold breaches:
- CPU 60–80%: add 2 instances
- CPU 80–100%: add 5 instances
- CPU < 30%: remove 2 instances

Step Scaling gives more control over scaling magnitude at different severity levels. Use when Target Tracking's automatic calculation produces too-aggressive or too-conservative scale-out.

**Scheduled Scaling** sets desired capacity on a time schedule (cron expression). Use for workloads with known, predictable traffic patterns: scale out every Monday morning, scale in Friday evening. Scheduled scaling runs before the demand arrives — eliminating the lag of reactive policies.

---

### Predictive Scaling

Predictive Scaling analyzes your ASG's 14-day historical traffic pattern using ML to forecast demand 48 hours ahead. It schedules capacity proactively based on the forecast — ensuring instances are available when demand spikes, not minutes after.

**Why reactive scaling has a timing problem**: Target Tracking responds to the current metric value. By the time CPU reaches 70% and the scale-out trigger fires, it takes 1–3 minutes to launch new instances (AMI initialization, user data, health check warm-up). During that window, the existing instances absorb the spike — often badly.

**Predictive Scaling eliminates the lag** by pre-provisioning before the spike. For a workload that spikes to peak every weekday at 9 AM, Predictive Scaling begins adding instances at 8:45 AM so they are fully initialized and healthy by 9 AM.

**Combining Predictive and Target Tracking**: this is the recommended production configuration. Predictive handles anticipated patterns; Target Tracking handles unexpected spikes or patterns the ML model hasn't seen. Neither policy alone covers both scenarios.

**Forecast modes**: `ForecastOnly` (observe predictions without acting — use for tuning) and `ForecastAndScale` (act on predictions). Start with `ForecastOnly` for two weeks to validate accuracy before enabling `ForecastAndScale`.

---

### Lifecycle Hooks

Lifecycle hooks pause instance launch or termination while custom actions execute:

**`EC2_INSTANCE_LAUNCHING`**: instance is launched, pending in-service. Hook runs before the instance joins the ALB target group. Use for: pull application code or configuration, install agents, run health pre-checks, register with service discovery. Instance joins the fleet only after the hook completes (or times out).

**`EC2_INSTANCE_TERMINATING`**: instance is scheduled for termination. Hook runs before the instance is terminated. Use for: drain in-flight requests, deregister from service discovery, ship final logs, complete running jobs. The instance is terminated only after the hook completes.

Hooks deliver events to an SQS queue, SNS topic, or Lambda function. The action (CONTINUE or ABANDON) is sent back to the ASG via the `complete-lifecycle-action` API call within the hook timeout (default 1 hour, configurable).

---

## Configuration Reference

### Example: ASG with Target Tracking and Scheduled Scaling

```bash
# Create an ASG with a Launch Template
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name prod-app-asg \
  --launch-template 'LaunchTemplateId=lt-abc123,Version=$Latest' \
  --min-size 2 \
  --max-size 40 \
  --desired-capacity 4 \
  --availability-zones us-east-1a us-east-1b us-east-1c \
  --target-group-arns arn:aws:elasticloadbalancing:...:targetgroup/prod-app/... \
  --health-check-type ELB \
  --health-check-grace-period 120 \
  --default-cooldown 300 \
  --region us-east-1

# Attach Target Tracking policy (keep average CPU at 50%)
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name prod-app-asg \
  --policy-name cpu-target-tracking \
  --policy-type TargetTrackingScaling \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 50.0,
    "EstimatedInstanceWarmup": 180,
    "DisableScaleIn": false
  }' \
  --region us-east-1
# EstimatedInstanceWarmup: tell Auto Scaling how long new instances take to be "warm"
# During warmup, new instances are not counted in the scaling metric average
# This prevents the policy from seeing artificially low utilization and scaling in prematurely

# Add a Scheduled Scaling action for known peak traffic (Monday mornings)
aws autoscaling put-scheduled-update-group-action \
  --auto-scaling-group-name prod-app-asg \
  --scheduled-action-name monday-morning-scale-out \
  --recurrence "0 8 * * MON" \
  --desired-capacity 12 \
  --min-size 12 \
  --region us-east-1
# Note: also set min-size — if only desired-capacity is set and the metric is low,
# Target Tracking can override the scheduled scale-out by scaling back in

aws autoscaling put-scheduled-update-group-action \
  --auto-scaling-group-name prod-app-asg \
  --scheduled-action-name friday-evening-scale-in \
  --recurrence "0 20 * * FRI" \
  --desired-capacity 4 \
  --min-size 2 \
  --region us-east-1
```

---

### Example: Mixed Instance ASG with Spot for Cost Optimization

```bash
# Create an ASG that blends On-Demand (baseline) with Spot (additional capacity)
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name prod-worker-mixed \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {
        "LaunchTemplateId": "lt-abc123",
        "Version": "$Latest"
      },
      "Overrides": [
        {"InstanceType": "m5.2xlarge"},
        {"InstanceType": "m5a.2xlarge"},
        {"InstanceType": "m4.2xlarge"},
        {"InstanceType": "r5.xlarge"}
      ]
    },
    "InstancesDistribution": {
      "OnDemandBaseCapacity": 2,
      "OnDemandPercentageAboveBaseCapacity": 20,
      "SpotAllocationStrategy": "capacity-optimized"
    }
  }' \
  --min-size 2 \
  --max-size 50 \
  --desired-capacity 10 \
  --availability-zones us-east-1a us-east-1b us-east-1c \
  --region us-east-1
# OnDemandBaseCapacity 2: always run at least 2 On-Demand for stability
# OnDemandPercentageAboveBaseCapacity 20: of scale-out above the base, 20% On-Demand, 80% Spot
# capacity-optimized strategy: choose the Spot pool least likely to be interrupted
# Multiple instance types: if one Spot pool is interrupted, use another type
```

> **Note:** `capacity-optimized` is the recommended Spot allocation strategy. It selects the Spot instance pool with the most available capacity, reducing interruption probability. `lowest-price` maximizes cost savings but concentrates instances in the cheapest pool, which is also the most frequently interrupted.

---

## How to Decide

**Scaling policy selection by traffic pattern:**

| Traffic pattern | Primary policy | Supplementary policy |
|---|---|---|
| Unpredictable, variable | Target Tracking (CPU or ALB RPC) | None needed |
| Strong daily/weekly pattern | Scheduled (scale before spike) | Target Tracking (for unexpected spikes) |
| Known daily pattern + unknown spikes | Predictive Scaling | Target Tracking |
| Multiple severity levels require different scale magnitudes | Step Scaling | Scheduled |

**Target Tracking metric selection:**

- **ASGAverageCPUUtilization**: default choice for CPU-bound applications. Simple, reliable.
- **ALBRequestCountPerTarget**: better than CPU for applications where request complexity varies — a CPU target can be thrown off by a mix of cheap and expensive requests.
- **Custom metric** (e.g., queue depth from SQS): the best choice for worker ASGs consuming from SQS. Scale on `ApproximateNumberOfMessagesVisible` to match worker count to backlog depth.

**Setting the Target Tracking target value:**

50% CPU is the standard starting point — it leaves 50% headroom for the time it takes new instances to launch. If your application's peak CPU averages 80%, a 50% target means the fleet scales out before hitting saturation. Adjust based on your instance warm-up time and acceptable performance degradation during scale-out lag.

---

## How This Connects

- **Application Load Balancer** — The integration partner that makes ASGs self-healing. The ALB performs health checks on ASG members; unhealthy members are removed from the target group and the ASG health check integration terminates and replaces them. ASG registers/deregisters instances from the ALB automatically as they scale.
- **CloudWatch** — Provides the metrics that scaling policies evaluate (CPU, network, ALB request rate) and alarms that can trigger additional manual scaling actions. CloudWatch also monitors the ASG itself — `GroupInServiceInstances`, `GroupDesiredCapacity` — for capacity alerting.
- **SQS** — A natural source for custom scaling metrics. Worker ASGs consuming SQS queues should scale on `ApproximateNumberOfMessagesVisible` (backlog depth) rather than CPU — a metric that directly represents work remaining rather than a proxy.
- **Elastic Load Balancing (ALB/NLB)** — The traffic distributor that makes multiple ASG instances useful. Without a load balancer, adding instances doesn't help because clients don't know about them.
- **EC2 Spot / On-Demand mix** — Mixed instance ASGs use Launch Template overrides and `InstancesDistribution` to blend Spot and On-Demand capacity in a single ASG, achieving significant cost savings while maintaining an On-Demand baseline for stability.
- **Lifecycle Hooks + Lambda** — Lambda functions triggered by lifecycle hook events perform graceful shutdown (drain connections, complete in-flight requests, write final state) before instances are terminated — critical for stateful or long-running jobs that cannot safely be killed mid-execution.

---

## Exam Traps

- **Minimum capacity of 1 is not HA**: with `min-size=1`, if the sole instance is replaced (by a health check failure), there is a period with zero healthy instances in the fleet. Always set `min-size` to at least 2 across 2+ AZs for production HA.
- **Scheduled Scaling must also update `min-size` to prevent Target Tracking override**: if you schedule `desired-capacity=12` for Monday morning but leave `min-size=2`, Target Tracking may scale back down to the steady-state level if CPU is low (e.g., traffic hasn't arrived yet). Set both `desired-capacity` and `min-size` in scheduled actions.
- **`EstimatedInstanceWarmup` prevents premature scale-in**: if this value is too short (or at default zero for some metrics), new instances are counted in the average metric immediately. A freshly launched instance with low CPU artificially lowers the ASG average — the policy thinks it is overprovisionedn and scales back in before the traffic hits. Set warmup to the actual application startup time.
- **Target Tracking creates CloudWatch alarms on your behalf**: when you attach a Target Tracking policy, AWS creates CloudWatch alarms with names like `TargetTracking-prod-app-asg-AlarmHigh-...`. Do not delete these alarms — deleting them breaks the scaling policy.
- **`capacity-optimized` is preferred over `lowest-price` for Spot**: `lowest-price` concentrates instances in the cheapest pool, which is also the pool with the most competition and highest interruption rate. `capacity-optimized` trades slightly higher cost for significantly lower interruption rate — the correct default for production Spot workloads.

---

## Summary

- An ASG maintains desired capacity, replaces unhealthy instances, and distributes across configured AZs — the foundational self-healing compute tier. Set minimum capacity to at least 2 (across 2+ AZs) for production HA.
- Target Tracking is the recommended default scaling policy — specify a metric and target value; the ASG adjusts capacity automatically. ALBRequestCountPerTarget is often better than CPU for web tiers.
- Scheduled Scaling pre-provisions for known traffic patterns; Predictive Scaling uses ML to forecast and pre-provision for recurring patterns. Combining Predictive with Target Tracking covers both anticipated and unexpected demand.
- Lifecycle hooks pause instance launch or termination while custom actions execute — critical for graceful shutdown and pre-launch configuration.
- Mixed instance ASGs blend On-Demand (stable baseline) with Spot (variable, cost-optimized capacity). Use `capacity-optimized` allocation strategy and multiple instance types/AZs for interruption resilience.
- Set `EstimatedInstanceWarmup` accurately to prevent new instances from affecting metric averages before they are ready to serve traffic.

---

## Examples

A small media company runs a blog that normally receives 2,000 requests per hour. They configure an ASG with minimum 2 instances and Target Tracking at 50% average CPU. When a post goes viral and traffic triples in 10 minutes, the ASG detects CPU rising above 50% and begins launching additional instances. Within 4 minutes, four new instances are healthy and serving traffic. An hour later, traffic normalizes and the ASG scales back in over 15 minutes, respecting the scale-in cooldown to avoid oscillation. The engineering team did nothing during the event — this is the self-managing property of Target Tracking.

An ed-tech platform serving K-12 schools knows traffic spikes every weekday morning at 8:00 AM sharp when students log in. Target Tracking alone consistently produced a 3-minute lag at the start of the school day because instance warm-up took 2.5 minutes and the policy didn't trigger until CPU was already high. After enabling Predictive Scaling with two weeks of historical data, the ML model identified the daily 8 AM pattern. Predictive Scaling now begins launching instances at 7:45 AM; by 8:00 AM the fleet is fully warmed and ready. Combined with Target Tracking for unexpected afternoon usage spikes, the platform serves the morning rush without any cold-start performance degradation.

A batch video transcoding fleet processes jobs from an SQS queue. Initially configured with Target Tracking on CPU, the ASG would scale out during heavy jobs and scale in during light jobs in a pattern that didn't reflect the actual work backlog — a few very CPU-intensive jobs could hold scale-out even when 10,000 messages were queued. Switching the scaling metric to `ApproximateNumberOfMessagesVisible` with a target of 100 messages per instance transformed the behavior: the ASG now scales directly in proportion to the queue depth. When 5,000 new jobs arrive, the fleet immediately scales to 50 instances; when the queue drains, instances scale in proportionally. Processing cost dropped 40% because the fleet is no longer oversized for light workloads.

---

## Think About It

1. Why does setting the minimum capacity of an ASG to 1 undermine high availability — even if the ASG spans two AZs? Walk through the exact failure scenario that illustrates the gap.
2. Your Target Tracking policy is set to 50% average CPU. You observe that the ASG scales out during periods when there is no user traffic, triggered by background jobs on the instances. How would you diagnose this, and what change would fix the false-positive scaling?
3. The default cooldown is 300 seconds. Your application experiences sharp, brief traffic spikes lasting about 60 seconds. How might the default cooldown hurt you — and what risk does lowering it introduce in the opposite direction?
4. A colleague proposes using Target Tracking on CPU alone for a worker fleet that processes messages from an SQS queue. What is the failure mode of this approach under a large job backlog, and what metric would you use instead?
5. Your ASG is attached to an ALB. An instance fails its ALB health check at 2:47 PM. Walk through exactly what happens next — which service does what, in what order, and what is the earliest time a replacement instance could be serving traffic?

---

## Quick Check

**Q1.** An Auto Scaling Group is configured with `--health-check-type ELB`. An EC2 instance in the group is healthy at the OS level but the application on it is returning HTTP 503 responses. What does the ASG do?

- A) Nothing — EC2 health checks pass, so the ASG considers the instance healthy
- B) The ASG marks the instance unhealthy based on the ALB health check failure, terminates it, and launches a replacement
- C) The ALB removes the instance from rotation but the ASG keeps it running
- D) The ASG sends an SNS alert but does not terminate the instance

**Answer: B** — With `--health-check-type ELB`, the ASG uses the ALB's health check results. The ALB marks the instance unhealthy after the configured number of consecutive HTTP 503 responses, and the ASG then terminates and replaces it automatically. A is the behavior of `--health-check-type EC2` — the wrong choice for detecting application failures.

---

**Q2.** A scheduled scaling action sets `desired-capacity=20` for Monday at 8 AM but does not update `min-size`. Target Tracking is also active with a CPU target of 50%. Traffic hasn't arrived yet at 8:05 AM and CPU is 5%. What is the likely outcome?

- A) The fleet stays at 20 instances because scheduled actions override Target Tracking
- B) Target Tracking scales the fleet back down toward the capacity needed to maintain 50% CPU on low traffic, because min-size was not updated
- C) Both policies are suspended until traffic arrives
- D) The ASG triggers a scale-in cooldown that prevents any action for 300 seconds

**Answer: B** — Target Tracking sees very low CPU utilization (5%) and determines that fewer instances are needed to maintain the 50% target. Because `min-size` was not changed from its baseline value, the policy scales back in. To prevent this, the scheduled action must also update `min-size` to 20 so Target Tracking cannot scale below the scheduled floor.

---

**Q3.** Which Spot Instance allocation strategy is recommended for production Auto Scaling Groups that require high availability?

- A) `lowest-price` — maximizes cost savings
- B) `price-capacity-optimized` / `capacity-optimized` — balances cost with lower interruption probability
- C) `diversified` — spreads instances evenly across all Spot pools regardless of price
- D) `on-demand-first` — uses Spot only when On-Demand capacity is unavailable

**Answer: B** — `capacity-optimized` (and `price-capacity-optimized` in newer API versions) selects Spot pools with the most available capacity, which correlates with lower interruption rates. `lowest-price` concentrates instances in the cheapest (most competed) pool, maximizing interruption risk. For production workloads where interruptions have operational impact, reducing interruption probability is more valuable than the marginal cost savings of `lowest-price`.

---

## What's Next

The next lesson covers AWS Resilience Hub and chaos engineering with AWS Fault Injection Service — the tools that validate whether your HA and auto-scaling configurations actually work under real failure conditions. Designing for resilience is necessary; proving it works requires deliberate testing.
