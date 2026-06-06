---
title: "Canvas Lab: CloudWatch Dashboard, Alarms, and Log Metric Filters"
type: canvas
estimated_minutes: 35
cert_tags: ["SAA-C03", "DVA-C02"]
canvas_type: starter   # "starter" for guided, "open" for design challenge
---

# Canvas Lab: CloudWatch Dashboard, Alarms, and Log Metric Filters

## Challenge

An operations team running a web application on EC2 has no visibility into application health. There is no alerting when the server is under load, and HTTP 5xx errors go undetected until users complain. You will install the CloudWatch agent to collect memory metrics, build a multi-widget dashboard, create CPU and error-rate alarms with SNS notifications, and combine them into a composite alarm.

## Learning Objectives

- Create a multi-metric CloudWatch dashboard with CPU, memory, network, and custom metric widgets
- Configure a CloudWatch alarm with SNS notification targeting a threshold over multiple evaluation periods
- Create a log metric filter on a CloudWatch Log Group to count HTTP 5xx errors
- Build a composite alarm that fires when either the CPU alarm or the error-rate alarm is in ALARM state
- Understand the three CloudWatch alarm states: OK, ALARM, and INSUFFICIENT_DATA

## Steps

1. Connect to the EC2 instance via Session Manager and install the CloudWatch agent using the SSM Run Document `AWS-ConfigureAWSPackage` with action `Install` and name `AmazonCloudWatchAgent`
2. Create a CloudWatch agent configuration file that collects the `mem_used_percent` metric from the `CWAgent` namespace with a 60-second collection interval
3. Start the agent: `sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json`
4. In the CloudWatch console, choose **Dashboards** -> **Create dashboard** named `WebApp-Operations`
5. Add four widgets: (a) CPU Utilization from `AWS/EC2` for the instance, (b) `mem_used_percent` from the `CWAgent` namespace, (c) `NetworkIn` from `AWS/EC2`, (d) a text widget with instance metadata
6. Create an SNS topic named `ops-alerts` and subscribe your email address; confirm the subscription in your inbox
7. Create a metric alarm: namespace `AWS/EC2`, metric `CPUUtilization`, threshold **greater than 80**, for **3 consecutive 5-minute periods**; set the alarm action to notify the `ops-alerts` SNS topic
8. In **Log groups**, select your application log group (e.g., `/var/log/httpd/access_log`); choose **Metric filters** -> **Create metric filter**
9. Define the filter pattern: `[ip, id, user, timestamp, request, status_code=5**, size]`; test the pattern against a sample log line, then create the filter with metric name `HTTP5xxErrors` in namespace `WebApp`
10. Create a second alarm on the `HTTP5xxErrors` metric: threshold **greater than 5** over **1 period of 1 minute**; SNS action to `ops-alerts`
11. Create a composite alarm named `WebApp-Critical` using the rule expression: `ALARM("cpu-high-alarm") OR ALARM("http-5xx-alarm")`; set the SNS action on the composite alarm as well
12. Trigger the CPU alarm by running `sudo yum install stress -y && stress --cpu 4 --timeout 300` on the EC2 instance
13. Monitor the alarm state in the CloudWatch console -- watch it transition from OK -> ALARM -- and verify the SNS email notification arrives
14. Stop the stress command and confirm the alarm returns to OK state

## Archon Canvas Lab

Open the Archon canvas to complete this lab. Use the component palette on the left to drag services onto the canvas, connect them, and configure their properties.
