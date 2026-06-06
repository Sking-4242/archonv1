---
title: "Auto Scaling Groups"
type: content
estimated_minutes: 14
cert_tags: ["CLF-C02", "SAA-C03", "SOA-C02"]
---

# Auto Scaling Groups

## Overview

An Auto Scaling Group (ASG) is the fundamental EC2 fleet management primitive in AWS. It maintains a specified number of EC2 instances by continuously monitoring their health state and automatically launching replacements when instances fail. Beyond baseline reliability, an ASG adjusts the fleet size up or down in response to scaling policies — adding instances during traffic peaks and terminating them during quiet periods to control cost. Every production EC2 architecture should use an ASG, even if dynamic scaling is never needed, because the automatic instance replacement alone justifies the overhead.

The ASG works from a Launch Template — a versioned specification that defines every attribute of the instances it creates: which AMI to use, the instance type, the IAM instance profile, the security groups, the key pair, the user data bootstrap script, and EBS volume configuration. When the ASG needs to launch a new instance (for replacement or scale-out), it uses the current version of the Launch Template exactly, ensuring every instance in the fleet is identical. This eliminates configuration drift — a failure mode where manually managed instances diverge over time and behave differently from one another.

Three capacity numbers define an ASG's operating envelope: minimum, maximum, and desired. The ASG never drops below minimum (protecting availability) and never exceeds maximum (protecting cost). Desired is the target the ASG actively maintains when no scaling policy is adjusting it — it represents the fleet size right now. Scaling policies modify desired capacity, but only within the min/max bounds. Understanding the interplay between these three values is central to both designing ASG configurations and answering exam questions correctly.

## Core Concepts

### Launch Templates

A Launch Template is the blueprint for every instance the ASG creates. It captures all instance-level configuration in a versioned document, so updating the template creates a new version without modifying the old one. You can specify a default version (the one ASG uses unless told otherwise) and compare versions to audit changes.

Launch Templates support parameter overrides at the ASG level — you can define a base template and then specify alternative instance types in the ASG's mixed instances policy without modifying the template itself. Launch Templates also support `$Default` and `$Latest` version aliases, though using `$Latest` in production is risky because a template update would immediately affect future instance launches.

Launch Configurations are the older equivalent. They are functionally similar but immutable (cannot be edited, only replaced), do not support mixed instances policies, and AWS has deprecated them for new workloads. If an exam question contrasts the two, Launch Templates are always the correct modern answer.

### Min / Max / Desired Capacity

- **Minimum** is a hard floor. No scaling policy, no manual adjustment, and no termination can reduce the fleet below this number. Set minimum to the number of instances required to maintain availability under zero load — typically 2 for multi-AZ redundancy.
- **Maximum** is a hard ceiling. It prevents runaway scaling from consuming unbounded capacity and cost during a traffic anomaly or a scaling policy misconfiguration. Set maximum to the largest fleet you could afford and operationally support.
- **Desired** is the current target. At rest, the ASG actively works to match actual running instances to desired capacity. Setting desired to 5 when 3 instances are running causes the ASG to launch 2 more. Scaling policies work by adjusting desired capacity up or down — the ASG then reconciles the actual count.

The relationship between these values: `min ≤ desired ≤ max`. If a scaling policy attempts to set desired below min or above max, the request is silently clamped to the nearest boundary.

### Health Checks: EC2 vs. ELB

An ASG must decide which instances are healthy and which need replacement. Two health check types exist:

**EC2 health check (default):** The ASG checks the EC2 instance status. An instance is marked unhealthy only if it has a hardware problem — the underlying host has failed, the instance has stopped, or the EC2 API reports a system status check failure. EC2 health checks cannot see inside the operating system or application.

**ELB health check:** The ASG delegates health assessment to the Application Load Balancer's target group health check. If the ALB's health check fails — the application returns a 5xx error, the health check endpoint times out, or the process listening on the port crashes — the ASG considers the instance unhealthy and replaces it.

**Why ELB health checks are better for applications:** EC2 health checks miss application-layer failures. An instance where the web server process has crashed, the application is deadlocked, or the disk is full will pass EC2 health checks (the hardware is fine) but fail ELB health checks (the HTTP endpoint is unreachable). Only ELB health checks detect these application-level failures. For any ASG behind a load balancer, always enable ELB health checks.

To enable ELB health checks on an ASG, the ASG must be associated with a target group (which requires a load balancer). The health check grace period (default 300 seconds) gives a newly launched instance time to complete its bootstrap before health check failures begin — set this to slightly longer than your slowest application startup time.

### Instance Refresh (Rolling Replacement)

An instance refresh replaces all instances in an ASG with new ones from the current Launch Template version. This is the standard mechanism for deploying a new AMI, a new instance type, or a new user data script across a running fleet — the ASG-native equivalent of a rolling deployment.

You configure a minimum healthy percentage (e.g., 90%) and the ASG replaces instances in batches. It terminates a batch, waits for replacements to pass health checks, then proceeds to the next batch. If a replacement instance fails its health check, the refresh pauses and the remaining old instances keep serving traffic. This makes instance refresh safe: it cannot accidentally replace a healthy running instance with a failing one.

Instance refresh also supports a warm-up period per instance — the time the ASG waits after a new instance passes its health check before counting it toward the minimum healthy percentage and proceeding with the next batch. This prevents the ASG from moving too fast for your application's readiness.

### Lifecycle Hooks

Lifecycle hooks intercept instance state transitions and hold the instance in a wait state while custom logic runs. Two transition points are available:

**Pending → Pending:Wait (launch hook):** When a new instance is launched (for scale-out or replacement), it enters `Pending:Wait` before it is registered with the load balancer and starts receiving traffic. Your hook runs: install monitoring agents, pull secrets from Secrets Manager, register the instance with an external service registry, run a cache warm-up job. When the hook logic completes successfully, you send a `CONTINUE` signal and the instance transitions to `InService`. If initialization fails, you send an `ABANDON` signal and the ASG terminates the instance.

**Terminating → Terminating:Wait (termination hook):** When an instance is scheduled for termination (scale-in or instance refresh), it enters `Terminating:Wait` before the ASG terminates it. Your hook runs: drain in-flight database transactions, flush a write-back cache, upload logs to S3, deregister from external services. When complete, signal `CONTINUE` and the instance terminates cleanly.

The default wait timeout is one hour; if neither `CONTINUE` nor `ABANDON` arrives within the timeout, the ASG proceeds with the default result (configurable as `CONTINUE` or `ABANDON`). Hooks are triggered via EventBridge events, which can invoke a Lambda function, an SSM automation document, or an SNS notification for custom processing.

### Mixed Instances Policy and Warm Pools

**Mixed instances policy** allows an ASG to launch instances from a pool of instance types rather than a single type. This is critical for Spot instance workloads — by specifying multiple instance types (e.g., `m5.large`, `m5a.large`, `m4.large`), the ASG can fulfill Spot capacity from whichever instance type has availability in the current AZ, dramatically reducing the risk of capacity interruptions.

You configure a base On-Demand count (guaranteed minimum On-Demand instances for availability) and an On-Demand percentage above the base (e.g., 20% On-Demand, 80% Spot for the remaining capacity). The ASG manages the mix automatically, including replacing Spot instances that are interrupted with new capacity from the next-available instance type.

**Warm pools** pre-initialize instances so they are ready to join the fleet instantly when a scale-out is needed. Instances in the warm pool are in a stopped or running state (your choice), have already completed their user data bootstrap, and are waiting. When a scaling event fires, the ASG moves warm pool instances to InService in seconds rather than the typical 3–5 minutes for a cold launch. Warm pools are particularly valuable when your application has a long startup time (JVM warm-up, large model loading, cache hydration) that makes reactive scaling too slow.

## Configuration Reference

### Create an ASG with a Launch Template (CLI)

```bash
# Step 1: Create a Launch Template
aws ec2 create-launch-template \
  --launch-template-name "web-app-template" \
  --version-description "Initial version - Amazon Linux 2023 + nginx" \
  --launch-template-data '{
    "ImageId": "ami-0abcdef1234567890",       # Amazon Linux 2023 AMI
    "InstanceType": "t3.medium",
    "KeyName": "my-ec2-keypair",
    "SecurityGroupIds": ["sg-0abc123"],
    "IamInstanceProfile": {
      "Name": "WebAppInstanceProfile"          # IAM role for SSM, CloudWatch, S3 access
    },
    "UserData": "IyEvYmluL2Jhc2gK...",        # Base64-encoded bootstrap script
    "BlockDeviceMappings": [
      {
        "DeviceName": "/dev/xvda",
        "Ebs": {
          "VolumeSize": 30,                    # 30 GB root volume
          "VolumeType": "gp3",
          "DeleteOnTermination": true,
          "Encrypted": true                    # Always encrypt in production
        }
      }
    ],
    "MetadataOptions": {
      "HttpTokens": "required",               # Require IMDSv2 (security best practice)
      "HttpPutResponseHopLimit": 1
    }
  }'

# Step 2: Create the ASG
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name "web-app-asg" \
  --launch-template "LaunchTemplateName=web-app-template,Version=$Default" \
  --min-size 2 \                              # Never fewer than 2 instances (multi-AZ floor)
  --max-size 20 \                             # Cap at 20 to control cost
  --desired-capacity 4 \                      # Start with 4
  --vpc-zone-identifier "subnet-aaa,subnet-bbb,subnet-ccc" \  # One subnet per AZ
  --target-group-arns "arn:aws:elasticloadbalancing:us-east-1:123456789012:targetgroup/web-app/abc" \
  --health-check-type ELB \                   # Use ALB health checks, not EC2 status checks
  --health-check-grace-period 120 \           # 120s for app to start before health checks begin
  --tags '[
    {"Key": "Environment", "Value": "production", "PropagateAtLaunch": true},
    {"Key": "Application", "Value": "web-app", "PropagateAtLaunch": true}
  ]'
```

### Instance refresh (rolling deployment of new AMI)

```bash
# Update the Launch Template to a new AMI version first
aws ec2 create-launch-template-version \
  --launch-template-name "web-app-template" \
  --source-version 1 \
  --version-description "Updated AMI with patched OS" \
  --launch-template-data '{"ImageId": "ami-0newpatchedami123"}'

# Set the new version as default
aws ec2 modify-launch-template \
  --launch-template-name "web-app-template" \
  --default-version 2

# Trigger an instance refresh — replaces instances in rolling batches
aws autoscaling start-instance-refresh \
  --auto-scaling-group-name "web-app-asg" \
  --preferences '{
    "MinHealthyPercentage": 90,     # Never drop below 90% of desired during rollout
    "InstanceWarmup": 60,           # Wait 60s after new instance passes health check before next batch
    "CheckpointPercentages": [20, 50, 100],   # Pause for review at 20%, 50%, 100% complete
    "CheckpointDelay": 300          # Wait 5 minutes at each checkpoint before auto-proceeding
  }'

# Monitor refresh status
aws autoscaling describe-instance-refreshes \
  --auto-scaling-group-name "web-app-asg"
# Look for: Status = "InProgress" → "Successful"
# If Status = "Failed", the ASG stops and leaves remaining instances on the old AMI
```

### Create a lifecycle hook (launch hook for initialization)

```bash
# Create a hook that pauses new instances before they enter InService
aws autoscaling put-lifecycle-hook \
  --auto-scaling-group-name "web-app-asg" \
  --lifecycle-hook-name "InitializationHook" \
  --lifecycle-transition "autoscaling:EC2_INSTANCE_LAUNCHING" \  # Fires on launch
  --default-result "ABANDON" \           # If timeout expires with no signal, ABANDON (terminate the instance)
  --heartbeat-timeout 300 \              # 5-minute window for initialization to complete
  --notification-target-arn "arn:aws:sns:us-east-1:123456789012:instance-init-topic" \
  --role-arn "arn:aws:iam::123456789012:role/AutoScalingHookRole"

# When initialization completes (from Lambda or SSM), send the CONTINUE signal:
aws autoscaling complete-lifecycle-action \
  --auto-scaling-group-name "web-app-asg" \
  --lifecycle-hook-name "InitializationHook" \
  --lifecycle-action-result "CONTINUE" \    # CONTINUE = proceed to InService
  --instance-id "i-0abc123def456"

# If initialization fails, send ABANDON to terminate the instance and try again:
aws autoscaling complete-lifecycle-action \
  --auto-scaling-group-name "web-app-asg" \
  --lifecycle-hook-name "InitializationHook" \
  --lifecycle-action-result "ABANDON" \
  --instance-id "i-0abc123def456"
```

### Mixed instances policy (Spot + On-Demand)

```bash
aws autoscaling create-auto-scaling-group \
  --auto-scaling-group-name "mixed-fleet-asg" \
  --min-size 2 \
  --max-size 30 \
  --desired-capacity 10 \
  --vpc-zone-identifier "subnet-aaa,subnet-bbb,subnet-ccc" \
  --mixed-instances-policy '{
    "LaunchTemplate": {
      "LaunchTemplateSpecification": {
        "LaunchTemplateName": "web-app-template",
        "Version": "$Default"
      },
      "Overrides": [
        {"InstanceType": "m5.large"},       # Primary instance type
        {"InstanceType": "m5a.large"},      # AMD equivalent — same performance, ~10% cheaper
        {"InstanceType": "m4.large"},       # Previous gen — available when m5 Spot is scarce
        {"InstanceType": "t3.large"}        # Burstable — fallback for low-traffic periods
      ]
    },
    "InstancesDistribution": {
      "OnDemandBaseCapacity": 2,            # Always keep 2 On-Demand for baseline availability
      "OnDemandPercentageAboveBaseCapacity": 20,  # 20% On-Demand, 80% Spot above the base
      "SpotAllocationStrategy": "capacity-optimized"  # Pick the Spot pool least likely to be interrupted
    }
  }'
# Cost result: 80% of scale-out capacity runs at Spot pricing (~70% discount vs. On-Demand)
# Availability result: Multiple instance type pool greatly reduces Spot interruption risk
```

## How to Decide

| Situation | Configuration Choice |
|---|---|
| Need instances to be replaced if the application crashes | Health check type: ELB (not EC2) |
| Need to deploy a new AMI to all instances safely | Instance refresh with MinHealthyPercentage ≥ 90% |
| New instances need custom software before serving traffic | Launch lifecycle hook (Pending:Wait) |
| Instances need to drain gracefully before termination | Termination lifecycle hook (Terminating:Wait) |
| Want to reduce compute costs significantly | Mixed instances policy with Spot + On-Demand |
| Application has a long startup time and reactive scaling is too slow | Warm pool |
| Running multiple instance types for cost/availability optimization | Mixed instances policy with multiple Overrides |
| Need guaranteed minimum availability regardless of scaling | Set min ≥ 2 across at least 2 AZs |

**When to use ELB health checks over EC2:** Always, when the ASG is behind a load balancer. EC2 health checks only detect hypervisor-level failures. ELB health checks detect application-level failures (process crashes, port not listening, HTTP errors) that EC2 health checks cannot see.

**When to set a longer health check grace period:** Set it longer than your slowest application startup. If your Java application takes 90 seconds to start up, set the grace period to 120+ seconds to avoid the ASG terminating a healthy instance that just hasn't finished starting yet.

## How This Connects

- **ALB listener rules** forward traffic to target groups, and ASGs automatically register and deregister instances with those target groups. The two systems work together to make scale-out transparent — a new instance appears in the target group and starts receiving traffic without any manual intervention.
- **Scaling policies** (next lesson) work by modifying the ASG's desired capacity. Target tracking, step scaling, and scheduled scaling all ultimately tell the ASG to increase or decrease desired, and the ASG handles the mechanics of launching or terminating instances.
- **Launch Templates** feed directly into Systems Manager (SSM) Fleet Manager for inventory and patching — instances launched via Launch Template with the correct IAM profile are automatically visible in SSM without any additional registration.
- **IAM instance profiles** in the Launch Template grant the EC2 instances credentials to call AWS services. A missing or incorrect IAM profile in the Launch Template is a common reason newly launched instances fail their initialization hooks — they cannot call Secrets Manager, S3, or SSM.
- **CloudWatch** collects CPU, network, and custom application metrics from instances and feeds them to scaling policies. The ELB health check integration means CloudWatch Alarms can trigger both scaling actions (via scaling policies) and instance replacement (via ASG health check failures) from the same set of metrics.

## Exam Traps

**"EC2 health checks are sufficient for production ASGs behind a load balancer"** — This is the most impactful misconception. EC2 health checks only detect hardware failures. Application-layer failures — crashes, deadlocks, disk-full errors, misconfigured ports — pass EC2 health checks and cause the ASG to keep routing traffic to a broken instance. ELB health checks are required to detect these application failures. Always enable ELB health checks for ASGs behind a load balancer.

**"Desired capacity can be set to any value"** — Desired capacity is always clamped to the min/max range. If you set desired to 1 and min is 2, the ASG immediately launches an additional instance to reach the minimum. If a scaling policy tries to set desired to 25 and max is 20, the ASG caps at 20. Exam questions often test whether you understand that min and max are hard boundaries.

**"Launch Configurations and Launch Templates are interchangeable"** — Launch Templates are the current standard. Launch Configurations are immutable (you cannot edit them; you must replace them) and do not support mixed instances policies or newer features. For any question about ASG configuration best practices, Launch Template is the correct answer.

**"Instance refresh is the same as terminating all instances and relaunching them"** — Instance refresh is controlled and safe: it replaces instances in batches while maintaining a minimum healthy percentage. Manually terminating all instances simultaneously would violate the ASG's min capacity setting and likely cause a brief or extended outage. The distinction matters for questions about zero-downtime deployments.

**"Lifecycle hook ABANDON terminates the instance but the ASG doesn't replace it"** — When a launch hook completes with ABANDON, the instance is terminated AND the ASG counts this against desired capacity, so it immediately launches a new instance to maintain desired count. The ASG is always working toward desired; ABANDON just means "this particular instance failed, give me a fresh one."

## Summary

- ASGs maintain a fleet of EC2 instances between configurable min and max bounds, automatically replacing unhealthy instances without operator intervention.
- Launch Templates define the blueprint for every instance launched — versioned, with support for mixed instance types and all modern EC2 features.
- ELB health checks detect application-level failures that EC2 health checks cannot see; always enable ELB health checks for ASGs behind a load balancer.
- Instance refresh performs a controlled rolling replacement of all instances for deployments of new AMIs or configuration changes, with configurable minimum healthy percentage and per-instance warm-up.
- Lifecycle hooks pause instances in `Pending:Wait` (before InService) or `Terminating:Wait` (before termination) to run custom initialization or shutdown logic via Lambda, SSM, or SNS.
- Mixed instances policies combine Spot and On-Demand capacity across multiple instance types, dramatically reducing cost while maintaining availability through diversification.

## Examples

A retail company configures their ASG with min=2, max=20, desired=4. On an ordinary Tuesday, four instances run at steady state. One instance fails an EC2 status check — the underlying hardware has developed a fault. But the company has also enabled ELB health checks: a few minutes earlier, before the EC2 check caught the fault, the ALB's health check had already stopped sending traffic to that instance because its application was returning 502 errors. The ASG detects the ELB health failure, terminates the degraded instance, and launches a replacement. By the time the on-call engineer checks Slack, the ASG has already restored the fleet to four healthy instances. This is why ELB health checks matter: they catch application failures before hardware failures become visible.

A financial data processing company needs every new instance to install a custom compliance monitoring agent, retrieve database credentials from Secrets Manager, and complete a 90-second model warm-up before it can serve accurate results. They configure a launch lifecycle hook with a 300-second timeout. When the ASG launches a new instance, it enters `Pending:Wait`. An EventBridge rule triggers a Lambda function that uses SSM Run Command to execute the initialization sequence over the instance's SSM agent. The Lambda polls until the warm-up script exits successfully, then calls `complete-lifecycle-action` with `CONTINUE`. The instance enters `InService` and joins the ALB only when it is genuinely ready. A cold-start that used to produce inaccurate results for the first minute of an instance's life is eliminated.

A startup running a batch image processing service wants to cut costs without sacrificing reliability. They configure a mixed instances policy with `m5.large`, `m5a.large`, and `m4.large` as the instance type pool, set `OnDemandBaseCapacity` to 2 (two On-Demand instances always running for availability), and `OnDemandPercentageAboveBaseCapacity` to 0 (all scale-out capacity is Spot). With `SpotAllocationStrategy` set to `capacity-optimized`, the ASG chooses the Spot pool with the most available capacity, minimizing interruption risk. During peak batch processing, the fleet scales from 2 to 18 instances — 2 On-Demand, 16 Spot — at approximately 30% of the cost of a fully On-Demand fleet. When Spot instances are interrupted, the ASG immediately requests replacement capacity from the next instance type in the pool.

## Think About It

1. An ASG is configured with min=2, max=10, desired=6. A scaling policy fires and attempts to scale in to 1 instance. What actually happens, and what does this reveal about the role of the min capacity setting as an availability guarantee?
2. You need to deploy a new AMI to a production ASG serving live traffic. Compare the trade-offs of using instance refresh (rolling) vs. creating a second ASG with the new AMI and shifting the ALB target group weights (blue/green). When would you prefer each approach?
3. Your ASG uses EC2 health checks and one instance has a process crash — the web server stops listening on port 80 but the EC2 instance hardware is fine. What happens? What would happen differently if you had enabled ELB health checks?
4. A lifecycle hook has a 300-second timeout. Your initialization Lambda function contains a bug that causes it to hang indefinitely. What happens after 300 seconds? How does `DefaultResult` control the outcome, and why is `ABANDON` a safer default than `CONTINUE` for launch hooks?
5. You configure a mixed instances policy with 80% Spot capacity. AWS sends a Spot interruption notice for 4 of your instances. Describe the sequence of events the ASG goes through to restore desired capacity, including how the instance type diversification setting affects the outcome.

## Quick Check

**Q1.** An ASG has min=3, max=15, desired=8. A scale-in policy fires and requests a desired capacity of 2. What is the actual resulting fleet size?

- A) 2 instances — the scaling policy overrides the minimum
- B) 3 instances — the ASG enforces the minimum as a hard floor
- C) 8 instances — scale-in requests are ignored
- D) 0 instances — the ASG terminates all instances before recalculating

**Answer: B** — Minimum capacity is a hard boundary. The ASG clamps the desired capacity to min=3, ensuring the fleet never drops below the configured availability floor.

**Q2.** An ASG is behind an ALB. An instance's web server process crashes but the EC2 hardware is functioning normally. Which health check configuration correctly detects this failure and triggers replacement?

- A) EC2 health check only — it monitors instance status at the hypervisor level
- B) ELB health check — it detects that the HTTP endpoint is no longer responding
- C) Both EC2 and ELB health checks detect application process crashes equally
- D) Neither — ASG cannot detect application-level failures without a custom Lambda function

**Answer: B** — EC2 health checks evaluate hardware and hypervisor-level status. An application process crash is invisible to EC2 health checks. ELB health checks send HTTP probes to the instance; if the process has crashed and the port is no longer listening, the health check fails and the ASG triggers replacement.

**Q3.** Which ASG feature holds a newly launched instance in `Pending:Wait` so that custom initialization logic (installing agents, warming a cache) can complete before the instance receives traffic?

- A) Target tracking scaling policy
- B) Health check grace period
- C) Instance refresh with MinHealthyPercentage
- D) Launch lifecycle hook

**Answer: D** — A launch lifecycle hook intercepts the instance at the `autoscaling:EC2_INSTANCE_LAUNCHING` transition and holds it in `Pending:Wait`. Custom logic runs via Lambda, SSM, or SNS; the hook sends a `CONTINUE` signal when complete, allowing the instance to transition to `InService` and join the load balancer.

## What's Next

Next: Scaling Policies — how ASGs decide when and by how much to change desired capacity, including target tracking, step scaling, scheduled scaling, and ML-powered predictive scaling.
