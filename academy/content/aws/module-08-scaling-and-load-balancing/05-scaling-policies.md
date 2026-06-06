---
title: "Scaling Policies"
type: content
estimated_minutes: 13
cert_tags: ["SAA-C03", "SOA-C02"]
---

# Scaling Policies

## Overview

A scaling policy is the decision engine that tells an Auto Scaling Group when to add or remove instances and by how much. Without scaling policies, an ASG maintains a fixed desired capacity — useful for reliability (auto-replacement) but not for elasticity. Scaling policies connect CloudWatch metrics to capacity adjustments, closing the loop between observed application load and the fleet size required to handle it. AWS offers five distinct policy types, each designed for a different load pattern and level of operator control.

The core tension in scaling policy design is reaction time versus stability. Scaling out too slowly means users experience degraded performance while instances are being launched. Scaling in too aggressively means you terminate instances during a brief lull and have to launch them again when load returns — paying both the cost of cold starts and the time penalty of insufficient capacity. Every policy type addresses this tension differently: target tracking optimizes for metric stability; step scaling optimizes for proportional response; scheduled and predictive scaling eliminate the reaction delay entirely by pre-provisioning capacity before demand arrives.

Understanding the trade-offs between policy types is both operationally important and heavily tested on the SAA and SOA exams. The key insight is that policy types are not mutually exclusive — AWS explicitly recommends combining them. Predictive or scheduled scaling as a baseline pre-provisions expected capacity; target tracking fills in reactive headroom for unexpected variance. A well-designed ASG typically uses two or three policies together.

## Core Concepts

### Target Tracking Scaling

Target tracking is the simplest and most recommended policy type for most workloads. You declare a metric and a target value; the ASG automatically adds or removes instances to maintain that target. You do not write CloudWatch alarms, define adjustment amounts, or manage cooldown periods — AWS handles all of that internally.

The analogy is a thermostat: you set the desired temperature (target value) and the system adds or removes heating (instances) to maintain it. The math behind the scaling decisions is handled by AWS using a proportional controller — larger deviations from target produce larger capacity changes.

**Predefined metrics for target tracking:**
- `ASGAverageCPUUtilization` — average CPU across all instances in the ASG
- `ASGAverageNetworkIn` / `ASGAverageNetworkOut` — average bytes in/out per instance
- `ALBRequestCountPerTarget` — requests per minute per target in an ALB target group (requires the ASG to be attached to an ALB)

**Custom metrics:** You can target any CloudWatch metric that correlates to required capacity (active connections, queue depth, request latency, etc.) using a custom metric specification.

**Why set the target below 100%:** Target tracking needs headroom to respond. If you set CPU target at 90% and a traffic spike fires, existing instances will hit 100% CPU while new instances spend 3–4 minutes launching. Setting the target at 50–60% means instances have runway before saturation, buying time for scale-out to complete before users see degraded performance.

Scale-in behavior: target tracking automatically creates a scale-in alarm (in addition to the scale-out alarm) and disables scale-in during periods of rapid load change to prevent oscillation. You can also set `DisableScaleIn: true` to prevent the policy from ever scaling in — useful when you manage scale-in through a separate scheduled policy.

### Step Scaling

Step scaling defines a CloudWatch alarm and a set of "steps" — threshold ranges that produce different adjustment amounts. When the alarm fires, the specific step corresponding to the current metric value determines how many instances to add or remove.

Example step configuration for a CPU alarm:
- Alarm threshold: CPU > 50% for 2 minutes
- Step 1: CPU between 50% and 70% → add 2 instances
- Step 2: CPU between 70% and 90% → add 5 instances
- Step 3: CPU > 90% → add 10 instances

This proportional response is the key advantage over Simple Scaling: a mild CPU increase adds a few instances; a severe spike adds many more. Step scaling also does not enforce a fixed cooldown between adjustments — if the metric jumps from 55% to 95% while the first adjustment is still completing, the ASG can immediately apply the higher step rather than waiting for a cooldown to expire.

Step scaling requires you to explicitly create and manage the CloudWatch alarm that triggers it. This gives you more control (you can tune alarm evaluation periods, data points to alarm, and breach duration) but more operational overhead than target tracking.

### Simple Scaling (Legacy)

Simple scaling is the original ASG scaling mechanism. A CloudWatch alarm triggers the policy, which adds or removes a fixed number of instances and then enters a cooldown period during which no further scaling can occur.

The cooldown period (default 300 seconds) is the primary limitation: if a traffic spike causes the ASG to add 2 instances and CPU is still high, the policy waits out the cooldown before evaluating again. During a fast-moving spike, this delay can mean sustained degraded performance.

Simple scaling is effectively superseded by step scaling (which is more responsive) and target tracking (which is simpler). AWS still supports it, and it appears on exams, but the recommendation is to use step or target tracking for new policies. The exam primarily tests simple scaling to contrast its cooldown behavior with step scaling's more dynamic response.

### Scheduled Scaling

Scheduled scaling adjusts desired capacity at a specific time using a cron expression or a one-time date. It is the correct tool when you know in advance that demand will change at a predictable time — a business-hours workload, a weekly batch job, a product launch, or a recurring event.

The critical advantage is that scheduled scaling is proactive: it adjusts capacity before demand changes, not in response to it. Reactive policies (target tracking, step) detect demand through metrics, which means the metric must rise before scaling begins. Scheduled scaling adds instances before the traffic arrives, so the fleet is warm and registered with the load balancer when users actually show up.

Scheduled scaling uses `min`, `max`, and `desired` — you can adjust any or all of them on the schedule. A common pattern is to raise `min` at the start of business hours (ensuring at least N instances are always running during the day) and lower it after hours, while a target tracking policy handles intra-day variance.

### Predictive Scaling

Predictive scaling uses machine learning to analyze historical CloudWatch metric data and forecast future demand. Based on the forecast, it creates scheduled scaling actions in advance — scaling out before the predicted demand arrives, not after.

Unlike scheduled scaling (which requires you to manually define when peaks occur), predictive scaling discovers recurring patterns automatically. If your traffic reliably spikes every weekday at 9 AM and drops on weekends, predictive scaling will find this pattern and pre-provision capacity at 8:45 AM without any manual configuration.

**Requirements:**
- At least 2 weeks of CloudWatch metric history for meaningful forecasts (AWS recommends 14 days minimum)
- The metric must have a recurring pattern; random or one-time spikes are not predictable
- You can run predictive scaling in "forecast only" mode first to evaluate forecast accuracy before enabling actual scaling

Predictive scaling can be combined with target tracking: predictive scaling handles the baseline forecast (scaling to the expected level), and target tracking handles any variance above the forecast.

### Cooldown Periods and Scale-In Protection

**Cooldown periods** prevent an ASG from responding to metrics while newly launched instances are still initializing. During the cooldown, new CloudWatch alarm triggers for scale-out are ignored. After the cooldown expires, if the metric is still above the threshold, scaling resumes. The default cooldown is 300 seconds; the correct value for your workload is slightly longer than your instance's startup time (user data execution + application warm-up).

Target tracking manages its own cooldown internally and adjusts it dynamically. Simple scaling uses a fixed, configurable cooldown. Step scaling ignores the cooldown for scale-out (it responds immediately to escalating alarms) but respects a separate scale-in cooldown.

**Scale-in protection** marks individual instances as protected from scale-in. The ASG will not terminate a protected instance during a scale-in event, even if desired capacity is reduced. This is useful for instances running a long-running job that must complete before the instance can be safely terminated. You enable protection per instance via the console or CLI, and remove it when the job completes.

## Configuration Reference

### Target tracking policy (CLI)

```bash
# Target 50% average CPU across the ASG
# AWS creates and manages the CloudWatch alarms automatically

aws autoscaling put-scaling-policy \
  --auto-scaling-group-name "web-app-asg" \
  --policy-name "cpu-target-tracking" \
  --policy-type "TargetTrackingScaling" \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ASGAverageCPUUtilization"
    },
    "TargetValue": 50.0,           # Maintain 50% average CPU — leaves headroom for scale-out lag
    "ScaleInCooldown": 300,        # Wait 300s after scale-in before scaling in again
    "ScaleOutCooldown": 60,        # Wait 60s after scale-out before scaling out again
    "DisableScaleIn": false        # Allow scale-in (set true if you manage scale-in separately)
  }'

# ALB request count per target — useful when CPU doesn't correlate to load
# Requires the ASG to be attached to an ALB target group
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name "web-app-asg" \
  --policy-name "request-count-tracking" \
  --policy-type "TargetTrackingScaling" \
  --target-tracking-configuration '{
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ALBRequestCountPerTarget",
      "ResourceLabel": "app/my-alb/abc123/targetgroup/web-app/def456"
      # ResourceLabel must point to the specific ALB and target group
    },
    "TargetValue": 1000.0          # Keep requests-per-minute-per-target at or below 1000
  }'
```

### Step scaling with a CloudWatch alarm (CLI)

```bash
# Step 1: Create the CloudWatch alarm that triggers the policy
aws cloudwatch put-metric-alarm \
  --alarm-name "web-app-high-cpu" \
  --metric-name "CPUUtilization" \
  --namespace "AWS/EC2" \
  --statistic "Average" \
  --dimensions "Name=AutoScalingGroupName,Value=web-app-asg" \
  --period 60 \                    # Evaluate every 60 seconds
  --evaluation-periods 2 \         # Must breach for 2 consecutive periods (2 minutes total)
  --threshold 50 \                 # Alarm fires when CPU > 50%
  --comparison-operator "GreaterThanThreshold" \
  --alarm-actions "arn:aws:autoscaling:us-east-1:123456789012:scalingPolicy:abc:autoScalingGroupName/web-app-asg:policyName/step-scale-out"
  # --alarm-actions is filled in after the policy is created (ARN of the policy)

# Step 2: Create the step scaling policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name "web-app-asg" \
  --policy-name "step-scale-out" \
  --policy-type "StepScaling" \
  --adjustment-type "ChangeInCapacity" \  # Add/remove N instances
  --step-adjustments '[
    {
      "MetricIntervalLowerBound": 0,       # CPU is 0–20% above alarm threshold (50–70% CPU)
      "MetricIntervalUpperBound": 20,
      "ScalingAdjustment": 2              # Add 2 instances for mild overload
    },
    {
      "MetricIntervalLowerBound": 20,      # CPU is 20–40% above alarm threshold (70–90% CPU)
      "MetricIntervalUpperBound": 40,
      "ScalingAdjustment": 5              # Add 5 instances for moderate overload
    },
    {
      "MetricIntervalLowerBound": 40,      # CPU is 40%+ above alarm threshold (90%+ CPU)
      "ScalingAdjustment": 10             # Add 10 instances for severe overload
    }
  ]' \
  --estimated-instance-warmup 90          # Ignore new instances' metrics for 90s during warmup
```

### Simple scaling with CloudWatch alarm (legacy pattern)

```bash
# Create the alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "web-app-simple-cpu" \
  --metric-name "CPUUtilization" \
  --namespace "AWS/EC2" \
  --statistic "Average" \
  --dimensions "Name=AutoScalingGroupName,Value=web-app-asg" \
  --period 300 \                   # 5-minute evaluation period
  --evaluation-periods 1 \
  --threshold 70 \
  --comparison-operator "GreaterThanThreshold" \
  --alarm-actions "arn:aws:autoscaling:..."

# Create the simple scaling policy
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name "web-app-asg" \
  --policy-name "simple-scale-out" \
  --policy-type "SimpleScaling" \
  --adjustment-type "ChangeInCapacity" \
  --scaling-adjustment 3 \         # Always add exactly 3 instances when alarm fires
  --cooldown 300                   # Wait 300s before this policy can fire again
# Limitation: if CPU is still high after 300s, it fires again and adds 3 more.
# During a fast-moving spike, you're scaling in fixed 3-instance increments with 5-minute gaps.
```

### Scheduled scaling actions (CLI)

```bash
# Scale up for business hours every weekday (9 AM UTC)
aws autoscaling put-scheduled-update-group-action \
  --auto-scaling-group-name "web-app-asg" \
  --scheduled-action-name "business-hours-scale-up" \
  --recurrence "0 9 * * MON-FRI" \     # Cron: 9:00 AM UTC, Monday through Friday
  --min-size 4 \                        # Raise the floor to 4 during business hours
  --desired-capacity 8 \                # Pre-provision 8 instances before morning traffic
  --max-size 30

# Scale down after business hours (7 PM UTC)
aws autoscaling put-scheduled-update-group-action \
  --auto-scaling-group-name "web-app-asg" \
  --scheduled-action-name "after-hours-scale-down" \
  --recurrence "0 19 * * MON-FRI" \    # 7:00 PM UTC, Monday through Friday
  --min-size 2 \                        # Lower the floor after hours
  --desired-capacity 2 \                # Scale back to minimal footprint
  --max-size 30

# One-time scale-up for a product launch event
aws autoscaling put-scheduled-update-group-action \
  --auto-scaling-group-name "web-app-asg" \
  --scheduled-action-name "product-launch-2026-06-15" \
  --start-time "2026-06-15T13:00:00Z" \  # Run once at this specific time
  --desired-capacity 40 \
  --max-size 50
```

### Predictive scaling policy (CLI)

```bash
aws autoscaling put-scaling-policy \
  --auto-scaling-group-name "web-app-asg" \
  --policy-name "predictive-cpu" \
  --policy-type "PredictiveScaling" \
  --predictive-scaling-configuration '{
    "MetricSpecifications": [
      {
        "TargetValue": 50.0,               # Same target as target tracking — 50% CPU
        "PredefinedMetricPairSpecification": {
          "PredefinedMetricType": "ASGCPUUtilization"
          # AWS uses both the load metric and the capacity metric to generate the forecast
        }
      }
    ],
    "Mode": "ForecastAndScale",            # ForecastOnly to test without scaling; ForecastAndScale to act
    "SchedulingBufferTime": 300,           # Pre-provision 5 minutes before forecasted demand
    "MaxCapacityBreachBehavior": "IncreaseMaxCapacity",  # Allow max to expand if forecast exceeds it
    "MaxCapacityBuffer": 10                # Allow up to 10% above max when needed to meet forecast
  }'
# AWS generates a 48-hour forecast and creates scheduled actions automatically.
# Requires minimum 14 days of CloudWatch data to generate meaningful patterns.
```

## How to Decide

| Load Pattern | Recommended Policy |
|---|---|
| Unpredictable load, simple setup | Target Tracking (set CPU target 50–60%) |
| Load spikes with severity levels that require proportional response | Step Scaling |
| Known daily/weekly schedule (business hours, batch jobs) | Scheduled Scaling |
| Recurring traffic patterns identified from weeks of history | Predictive Scaling |
| Predictable baseline + variable peaks | Scheduled or Predictive + Target Tracking |
| Legacy workload, existing alarm infrastructure | Simple Scaling (acceptable, not preferred) |

**Combining policies:** AWS allows multiple scaling policies on one ASG. The recommended combination for most production workloads: Predictive Scaling (baseline forecast) + Target Tracking (reactive headroom). For workloads with strict known schedules: Scheduled Scaling to set `min`/`desired` + Target Tracking for variance.

**Scale-out vs. scale-in thresholds:** For step and simple scaling, set scale-out alarms at a lower threshold than scale-in alarms. Example: scale out at CPU > 60%, scale in at CPU < 30%. This dead band prevents oscillation — the ASG won't repeatedly add and remove the same instance as CPU bounces around a single threshold.

## How This Connects

- **CloudWatch Alarms** are the trigger for step and simple scaling policies. The alarm evaluates metric data, and when it enters ALARM state, the scaling policy fires. Target tracking and predictive scaling create and manage their own alarms internally.
- **ASG desired capacity** is the lever that all scaling policies manipulate. Every policy type ultimately calls an internal "set desired to N" operation; the ASG then handles launching or terminating instances to match. Understanding that policies modify desired capacity explains why min/max bounds still apply.
- **Launch Templates and instance warm-up** directly affect how fast scale-out capacity becomes usable. A scaling policy fires immediately, but new instances aren't serving traffic until they complete user data, pass health checks, and exit the warmup period. The `EstimatedInstanceWarmup` parameter in step and target tracking policies tells the ASG not to count new instances' metrics during this period.
- **ALB target groups** are the destination for scaled-out instances. New instances from a scale-out are automatically registered with the target group; the health check grace period ensures they pass their health check before the ALB routes requests to them. Scaling policy effectiveness depends on the ALB correctly distributing load across the growing fleet.
- **Cost Explorer and Compute Optimizer** analyze ASG scaling patterns after the fact. Compute Optimizer can recommend right-sizing (smaller instance type, fewer instances) if your scaling policies consistently maintain low utilization, while scale-out frequency data in Cost Explorer helps you tune scheduled scaling schedules.

## Exam Traps

**"Target tracking and step scaling both require you to create CloudWatch alarms"** — Target tracking creates and manages its CloudWatch alarms automatically and you cannot directly modify them. You do not create alarms for target tracking policies. Step scaling requires you to create the alarms yourself and link them to the policy. This is a frequently tested distinction.

**"Simple scaling and step scaling behave the same during rapid metric increases"** — They are critically different. Simple scaling enters a cooldown after each adjustment, delaying the next scaling action. Step scaling does not enforce a cooldown between upward scaling steps — if the metric jumps from the first step threshold to the third in seconds, the ASG can immediately apply the larger adjustment. For fast-moving spikes, simple scaling underreacts; step scaling responds proportionally.

**"Predictive scaling can predict any traffic pattern after one day of data"** — Predictive scaling requires at least 14 days of historical metric data to identify recurring patterns. With less data, the forecast is unreliable. Additionally, predictive scaling only forecasts patterns that recur — a one-time spike, a new product launch with no history, or truly random traffic cannot be predicted.

**"Scheduled scaling replaces the need for reactive scaling policies"** — Scheduled scaling is proactive but cannot handle unexpected deviations. If your 9 AM scheduled scale-up to 8 instances encounters an unusually heavy load day, you need a target tracking or step policy to handle the excess. Scheduled scaling sets the expected baseline; reactive policies handle variance above it.

**"Cooldown periods prevent all scaling during their duration"** — Cooldown periods prevent the same policy from firing again, but a different policy can still fire. Also, cooldown periods apply to scale-in and scale-out separately; you can configure different cooldowns for each direction. Target tracking uses dynamic internal cooldowns that are different from the fixed cooldowns in simple and step scaling.

## Summary

- Target tracking is the recommended default: specify a metric and target value, and AWS manages scale-out and scale-in automatically, including alarm creation and cooldown management.
- Step scaling provides proportional response — larger metric deviations trigger larger capacity adjustments — and does not block consecutive scale-out steps with cooldowns, making it more responsive than simple scaling during rapid spikes.
- Simple scaling is a legacy policy type: one fixed adjustment per alarm trigger, blocked by a cooldown period between firings; prefer step or target tracking for new workloads.
- Scheduled scaling pre-provisions capacity before predictable demand changes (business hours, weekly patterns, known events), eliminating the reaction lag of metric-based policies.
- Predictive scaling uses ML to forecast demand from at least 14 days of history and creates scheduled actions automatically, surfacing recurring patterns without manual schedule configuration.
- Combining policy types is explicitly recommended: use scheduled or predictive scaling for the expected baseline, and target tracking for reactive headroom during unexpected variance.

## Examples

A B2B SaaS API company configures a target tracking policy targeting 60% average CPU. During a normal afternoon, 4 instances run at 55–65% CPU — the ASG holds steady. A large customer triggers a bulk data export that spikes CPU to 87% across all instances. Within 3 minutes, the ASG adds 3 instances and CPU drops to 61%. When the export finishes an hour later, CPU falls to 22%; after the scale-in cooldown, the ASG removes the 3 extra instances. The company intentionally set the target at 60% rather than 80% — that 20-point buffer is the headroom that allowed the spike to be absorbed during the 3-minute launch window. Had they set it at 80%, users would have hit saturated instances while waiting for scale-out.

A tax software company knows with certainty that traffic spikes every April 14–15. They configure two scheduled actions: at midnight on April 14, desired capacity jumps from 6 to 40; at midnight on April 16, it returns to 6. Simultaneously, a target tracking policy at 60% CPU handles any variance within the event window. The scheduled action pre-provisions the fleet before the expected traffic wave; the target tracking policy handles the difference between expected and actual demand. Without the scheduled action, reactive-only scaling would spend the first 15–20 minutes of the peak scrambling to launch instances while real users experience slowdowns.

A media streaming company enables Predictive Scaling after two years of CloudWatch data accumulation. The ML model identifies that viewership spikes every weekday at 7:45 PM when a popular evening news block begins. Rather than waiting for CPU to climb at 7:50 PM and spending 4 minutes launching instances, Predictive Scaling schedules a capacity increase at 7:30 PM. Instances are fully warm and registered with the ALB when the traffic wave arrives at 7:45 PM. The cold-start latency spike that used to affect the first few hundred concurrent viewers each evening — a constant source of viewer complaints and social media noise — disappears entirely.

## Think About It

1. Target tracking sets a CPU target of 50%. Why is 50% recommended over 80% or 90%? What specifically happens to users during the 3–5 minutes it takes to launch and warm a new instance, and how does the headroom between 50% and 100% mitigate this problem?
2. Step scaling lets you add 2 instances at 60% CPU, 5 at 75%, and 10 at 90%. Compare this to a target tracking policy targeting 50% CPU during a rapid spike from 55% to 95%. Which policy results in more instances being added, and which policy gets there faster? What does this reveal about when step scaling is more appropriate than target tracking?
3. Scheduled scaling and predictive scaling both pre-provision capacity before demand arrives. Describe a scenario where scheduled scaling is clearly the better choice over predictive, and a scenario where predictive is clearly better. What property of the traffic pattern drives the decision?
4. A cooldown period prevents a simple scaling policy from firing immediately after a scaling event. If the cooldown is set to 600 seconds and a large traffic spike hits 30 seconds after a small scale-out event, what happens during the remaining 570 seconds? How does step scaling's behavior differ in this exact scenario?
5. Your application's bottleneck is not CPU but database connection pool exhaustion — each instance opens 50 connections and your RDS instance supports 500 total. How would you design a custom target tracking policy to scale based on database connection count, and what CloudWatch metric would you publish to make this work?

## Quick Check

**Q1.** Which scaling policy type automatically creates and manages its own CloudWatch alarms, requiring you only to specify a metric and a target value?

- A) Simple Scaling
- B) Step Scaling
- C) Scheduled Scaling
- D) Target Tracking Scaling

**Answer: D** — Target tracking creates, manages, and owns the CloudWatch alarms that drive scale-out and scale-in. You declare the desired metric target; AWS handles alarm creation, threshold calculation, and cooldown management automatically.

**Q2.** A news website experiences a traffic spike every Sunday at 9 PM when a popular live event airs. Which scaling approach ensures capacity is ready before the spike begins?

- A) Target Tracking Scaling at 50% CPU — reacts within minutes of the spike starting
- B) Simple Scaling triggered by a 70% CPU alarm
- C) Scheduled Scaling configured to increase desired capacity at 8:45 PM every Sunday
- D) Step Scaling with three alarm thresholds

**Answer: C** — Scheduled scaling pre-provisions capacity at a configured time, ensuring instances are launched, warm, and registered with the load balancer before the predictable traffic spike arrives. Reactive policies (A, B, D) would all detect the spike only after CPU climbs, spending 3–5 minutes launching instances while users experience degraded performance.

**Q3.** What is the minimum amount of historical CloudWatch metric data Predictive Scaling requires to generate meaningful demand forecasts?

- A) 24 hours
- B) 3 days
- C) 1 week
- D) 2 weeks

**Answer: D** — Predictive Scaling analyzes at least 14 days of historical metric data to identify recurring patterns and generate reliable 48-hour-ahead capacity forecasts. With less data, the model cannot distinguish signal from noise.

## What's Next

Module 8 theory is complete. The lab covers deploying an ASG behind an ALB, attaching a target tracking policy, and manually triggering a CPU spike to observe scale-out in real time — including watching instances register with the target group and begin receiving traffic.
