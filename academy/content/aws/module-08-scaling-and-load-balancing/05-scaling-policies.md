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

## What's Next

Module 8 theory is complete. The lab covers building an ASG behind an ALB and triggering a scale-out event to verify it works.
