---
title: "Scaling Policies"
type: content
estimated_minutes: 8
cert_tags: ["aws_saa", "aws_soa"]
---

# Scaling Policies

## Overview

A Scaling Policy defines when and how the ASG adjusts capacity. AWS provides several policy types — each with different characteristics, use cases, and exam relevance. Choosing the right policy type (or combination) is key to both cost efficiency and availability.

## Target Tracking Scaling

Target Tracking is the simplest and most recommended scaling policy type. You specify a metric and a target value — the ASG automatically adds or removes instances to maintain that target. Examples: maintain average CPU utilization at 50%, maintain request count per target at 1,000/minute.

Target tracking is analogous to a thermostat: you set the desired temperature (target metric value) and the ASG adds or removes 'heat' (instances) to maintain it. AWS manages the scale-in/scale-out math automatically based on the metric's actual vs. target value and a cool-down period.

**Best for:** Most web application scaling scenarios. Set CPU target at 50-70% to leave headroom for traffic spikes before the next scaling event completes.

## Step and Simple Scaling

Simple Scaling (legacy) adds or removes a fixed number of instances when a CloudWatch alarm triggers, then waits for a cooldown before evaluating again. The fixed adjustment and cooldown make it slow to respond to large traffic spikes.

Step Scaling improves on this by defining multiple steps: if CPU > 50% add 2 instances; if CPU > 80% add 5 instances. This enables proportional response — bigger deviations trigger bigger adjustments. Step scaling doesn't enforce cooldowns between steps for large jumps, making it more responsive than Simple.

**Best for:** Workloads with predictable relationship between a metric and required capacity, or where you need more control than target tracking provides.

## Scheduled and Predictive Scaling

**Scheduled Scaling** adjusts capacity at specific times: increase to 10 instances at 8am weekdays, reduce to 2 at 6pm weekdays. Useful for predictable traffic patterns (business-hours-only workloads, known batch jobs, planned events).

**Predictive Scaling** uses machine learning to analyze historical traffic patterns and proactively scale before demand arrives. Unlike reactive scaling (which adds instances after demand spikes), predictive scaling ensures instances are ready before the spike. It forecasts 48 hours ahead and creates scheduled scaling actions. Requires 2+ weeks of historical CloudWatch data to generate meaningful forecasts.

## Summary

Target Tracking is the default recommendation for most workloads — set a metric target and ASG manages scaling automatically. Step Scaling provides proportional response for workloads where metric deviation correlates to required capacity. Scheduled Scaling handles predictable peaks. Predictive Scaling proactively scales ahead of forecasted demand using ML. Combine policies: predictive or scheduled as a baseline, target tracking for reactive adjustment.

## Examples

A B2B SaaS company runs an API with highly variable CPU usage. They configure a Target Tracking policy targeting 60% average CPU across the ASG. During a normal afternoon, 4 instances run at 55–65% CPU — the ASG holds steady. A large customer runs a bulk export job that spikes CPU to 85% across all instances. Within 3 minutes, the ASG adds 3 more instances and CPU settles back to 62%. When the export finishes, CPU drops to 30%; after the scale-in cooldown, the ASG removes the extra instances. The team set the target at 60% rather than 80% specifically to leave headroom — a 20-point buffer ensures new instances are provisioned before existing ones saturate.

A tax preparation software company knows with certainty that traffic spikes every April 14–15. They configure Scheduled Scaling: at midnight on April 14, increase desired capacity from 6 to 40; at midnight on April 16, return to 6. Combined with a Target Tracking policy, the scheduled action pre-provisions the base fleet before the traffic arrives (reactive scaling alone would lag behind the spike), and the target tracking handles any variance within the event window. Using both together is explicitly the recommended pattern for predictable peaks.

A media streaming company has run their platform on AWS for three years and has rich CloudWatch metrics. They enable Predictive Scaling and let it analyze 14 days of historical data. The model identifies that traffic climbs every weekday morning starting at 7:45 AM. Rather than waiting for CPU to spike at 8:00 AM and then spending 3–4 minutes launching instances, Predictive Scaling schedules a capacity increase at 7:30 AM. Instances are warm and registered with the ALB before the traffic wave arrives. The cold-start latency that used to affect the first 200 users each morning disappears.

## Think About It

1. Target Tracking sets a CPU target of 50%. Why is 50% often recommended rather than 80% or 90%? What happens to user experience during the minutes it takes to launch and warm a new instance, and how does headroom mitigate this?
2. Step Scaling lets you define multiple steps: add 2 instances if CPU > 60%, add 5 if CPU > 85%. What scenario makes this more useful than Target Tracking, and what does it reveal about the relationship between metric deviation and the actual capacity you need?
3. Scheduled Scaling and Predictive Scaling both pre-provision capacity before demand arrives. Why would you choose Predictive over Scheduled? What would need to be true about your traffic pattern for Scheduled to be better?
4. A cooldown period prevents an ASG from launching more instances immediately after a scaling event. What problem does this solve, and what problem does it create if set too long? How does Target Tracking's built-in cooldown differ from Simple Scaling's fixed cooldown?
5. Imagine your application's bottleneck is not CPU but database connection pool exhaustion — each instance holds 50 connections and your RDS instance supports 500 total. How would you design a scaling policy that prevents overloading the database as the ASG scales out, and what metric would you track?

## Quick Check

**Q1.** Which scaling policy type requires you to specify a metric and a desired target value, and then automatically manages scale-out and scale-in to maintain that value?

- A) Simple Scaling
- B) Step Scaling
- C) Target Tracking Scaling
- D) Scheduled Scaling

**Answer: C** — Target Tracking Scaling works like a thermostat: you declare the metric target (e.g., 50% CPU) and AWS automatically adds or removes instances to maintain it, handling the math and cooldown periods for you.

**Q2.** A news website knows their traffic will spike heavily every Sunday at 9 PM when a popular TV show airs. Which scaling approach best ensures capacity is ready before the spike begins?

- A) Target Tracking Scaling set to 50% CPU
- B) Simple Scaling triggered by a CloudWatch CPU alarm
- C) Scheduled Scaling configured to increase capacity at 8:45 PM on Sundays
- D) Step Scaling with three alarm thresholds

**Answer: C** — Scheduled Scaling pre-provisions capacity at a specific time, ensuring instances are fully launched and registered with the load balancer before the predictable traffic spike arrives, rather than reacting after CPU has already climbed.

**Q3.** What minimum amount of historical CloudWatch data does Predictive Scaling require to generate meaningful traffic forecasts?

- A) 24 hours
- B) 3 days
- C) 1 week
- D) 2 weeks

**Answer: D** — Predictive Scaling uses machine learning to analyze at least 2 weeks of historical metric data to identify recurring patterns and generate 48-hour-ahead capacity forecasts.

## What's Next

Module 8 theory is complete. The lab covers building an ASG behind an ALB and triggering a scale-out event to verify it works.
