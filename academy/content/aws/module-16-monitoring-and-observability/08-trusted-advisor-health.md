---
title: "AWS Trusted Advisor & AWS Health"
type: content
estimated_minutes: 22
cert_tags: ["SAA-C03", "CLF-C02"]
---

## Overview

AWS Trusted Advisor and AWS Health are two distinct monitoring services that work at different layers of your AWS relationship. Trusted Advisor acts as an automated best-practice consultant — it continuously scans your account configuration and compares it against AWS-recommended standards across five categories: cost optimization, performance, security, fault tolerance, and service limits. It tells you what is misconfigured or suboptimal in your account right now, before those issues cause problems.

AWS Health, by contrast, is an event notification service. It tells you when something is happening to AWS infrastructure that affects your specific resources. If an EC2 host is scheduled for maintenance, if a service is degraded in your region, or if your account has crossed a limit threshold, AWS Health delivers that signal through your Personal Health Dashboard and, critically, through Amazon EventBridge so you can automate responses.

For AWS certification exams, the key skill is distinguishing these two services from each other and from similar-sounding services like AWS Config, Security Hub, and CloudTrail. Each serves a different purpose: Trusted Advisor checks current best-practice compliance; Config tracks resource configuration history and evaluates rules; Security Hub aggregates security findings from multiple services; CloudTrail logs API calls. Knowing precisely where each service fits prevents the single-answer elimination mistakes that commonly trip up exam candidates.

## Core Concepts

### Trusted Advisor Check Categories

Trusted Advisor organizes its checks into five categories, and each category maps to a real operational concern. Cost Optimization checks look for idle or underutilized resources — unattached EBS volumes, low-utilization EC2 instances, reserved instance purchase opportunities. Performance checks identify configuration choices that limit throughput or increase latency, such as EBS volumes with high utilization or CloudFront distributions without compression. Security checks highlight dangerous configurations: S3 buckets with open access, security groups with unrestricted ports, IAM use of the root account, and missing MFA. Fault Tolerance checks look for single points of failure — EC2 instances not spread across Availability Zones, RDS instances without Multi-AZ, EBS volumes without recent snapshots. Service Limits checks compare your current usage against AWS account limits and warn you when you are approaching thresholds. Understanding these five categories helps you predict which type of check will surface which type of finding on the exam.

### Support Plan Tiers and Check Access

The number of checks available through Trusted Advisor depends entirely on your AWS Support plan. With the Basic or Developer Support plans, you receive access to approximately six core checks, all of which fall in the Security and Service Limits categories — things like S3 bucket permissions and IAM use of root credentials. To unlock the full catalog of 535+ checks across all five categories, you need Business Support or Enterprise Support. This distinction matters on exams because a scenario that describes "checking for underutilized EC2 instances" or "identifying low-utilization RDS instances" assumes a Business or Enterprise support tier. Programmatic access to Trusted Advisor check results is available via the AWS Support API using calls like `describe-trusted-advisor-checks` and `describe-trusted-advisor-check-result`. This API is only available in the `us-east-1` region, regardless of which region you are managing.

### AWS Health: Service Health vs. Personal Health Dashboard

AWS Health has two conceptually distinct views. The Service Health Dashboard (accessible at status.aws.amazon.com) shows current and historical status of AWS services globally — it is a public page that shows what anyone can see. The Personal Health Dashboard (PHD) is account-specific and shows only events that affect resources in your account. If AWS is performing maintenance on the physical host underlying your EC2 instance, the PHD shows that event; the public Service Health Dashboard would not surface that level of detail. This distinction is important: the Personal Health Dashboard is personalized — it filters the global AWS event stream down to what is relevant to your specific resources, accounts, and regions. You access it through the AWS Management Console under "AWS Health" or via the `aws health` CLI commands.

### Health Event Types

Every AWS Health event carries a type classification: `issue`, `scheduledChange`, or `accountNotification`. An `issue` event means something is currently wrong — an ongoing service disruption, degraded performance, or an active incident. A `scheduledChange` event means AWS has planned maintenance that will affect your resources — for example, host retirement or a database engine upgrade. An `accountNotification` event is informational — it might tell you about security notifications, billing alerts, or policy changes that apply to your account. When building automated responses, you filter on event type to decide how urgently to respond. A `scheduledChange` on an EC2 instance, for example, should trigger automation that migrates workloads before the maintenance window, while an `issue` event might trigger immediate incident response.

### EventBridge Integration for Automated Responses

AWS Health integrates directly with Amazon EventBridge, which is what makes it operationally powerful rather than just a notification dashboard. Every health event is published as an EventBridge event on the default event bus in `us-east-1` (Health events are always routed through us-east-1 regardless of the affected region). You can write EventBridge rules that match specific health event types and automatically trigger Lambda functions, SNS notifications, Systems Manager Automation runbooks, or other targets. For example, when a health event indicates an EC2 instance is scheduled for retirement, an EventBridge rule can automatically stop the instance, create a new AMI, and launch a replacement — without any human intervention. This event-driven automation pattern is the architectural pattern AWS exams test heavily.

### Trusted Advisor vs. AWS Config vs. Security Hub

Three services often appear together in exam questions because they all relate to "compliance" or "security posture" at a surface level. Trusted Advisor runs its own built-in checks against best practices — you cannot define custom checks. AWS Config evaluates your resources against rules you define (or use from the managed rule library), and it records the full configuration history of every resource so you can answer "what did this resource look like six months ago?" Security Hub aggregates security findings from multiple sources — GuardDuty, Inspector, Macie, Firewall Manager, and partner solutions — into a single normalized view scored against security standards like CIS AWS Foundations or AWS Foundational Security Best Practices. When a scenario says "automatically detect non-compliant resources," Config is the answer. When it says "aggregate security findings," it is Security Hub. When it says "identify cost savings opportunities," it is Trusted Advisor.

## Configuration Reference

```bash
# -------------------------------------------------------
# TRUSTED ADVISOR: List all available checks
# Note: Support API is only available in us-east-1
# -------------------------------------------------------
aws support describe-trusted-advisor-checks \
  --language en \
  --region us-east-1

# Get the result for a specific check
# checkId for "Security Groups - Unrestricted Access" is HCP4007jGY
aws support describe-trusted-advisor-check-result \
  --check-id HCP4007jGY \
  --language en \
  --region us-east-1

# Refresh a check before reading results (results can be up to 24 hours stale)
aws support refresh-trusted-advisor-check \
  --check-id HCP4007jGY \
  --region us-east-1

# Get a summary of all check statuses (ok, warn, error, not_available)
aws support describe-trusted-advisor-checks-summary \
  --check-ids HCP4007jGY Hs4Ma3G013 \
  --region us-east-1

# -------------------------------------------------------
# AWS HEALTH: Query events affecting your account
# Note: Health API is only available in us-east-1
# -------------------------------------------------------

# List all open health events affecting your account
aws health describe-events \
  --filter '{"eventStatusCodes": ["open", "upcoming"]}' \
  --region us-east-1

# Filter events by service and region
aws health describe-events \
  --filter '{
    "services": ["EC2"],
    "regions": ["us-east-1", "us-west-2"],
    "eventTypeCategories": ["scheduledChange", "issue"]
  }' \
  --region us-east-1

# Get detailed description of a specific health event
aws health describe-event-details \
  --event-arns "arn:aws:health:us-east-1::event/EC2/AWS_EC2_INSTANCE_RETIREMENT_SCHEDULED/AWS_EC2_INSTANCE_RETIREMENT_SCHEDULED_abc123" \
  --region us-east-1

# List affected resources for a health event
aws health describe-affected-entities \
  --filter '{
    "eventArns": ["arn:aws:health:us-east-1::event/EC2/AWS_EC2_INSTANCE_RETIREMENT_SCHEDULED/AWS_EC2_INSTANCE_RETIREMENT_SCHEDULED_abc123"]
  }' \
  --region us-east-1
```

```json
// -------------------------------------------------------
// EventBridge event pattern: catch EC2 retirement events
// Create this rule in us-east-1 only
// -------------------------------------------------------
{
  "source": ["aws.health"],
  "detail-type": ["AWS Health Event"],
  "detail": {
    "service": ["EC2"],
    "eventTypeCategory": ["scheduledChange"],
    "eventTypeCode": ["AWS_EC2_INSTANCE_RETIREMENT_SCHEDULED"]
  }
}
```

```json
// Full EventBridge rule in CloudFormation format
// Must be deployed in us-east-1 — Health events always route there
{
  "Type": "AWS::Events::Rule",
  "Properties": {
    "Name": "ec2-retirement-auto-remediate",
    "Description": "Trigger Lambda when EC2 instance scheduled for retirement",
    "EventPattern": {
      "source": ["aws.health"],
      "detail-type": ["AWS Health Event"],
      "detail": {
        "service": ["EC2"],
        "eventTypeCategory": ["scheduledChange"],
        "eventTypeCode": ["AWS_EC2_INSTANCE_RETIREMENT_SCHEDULED"]
      }
    },
    "State": "ENABLED",
    "Targets": [
      {
        "Arn": { "Fn::GetAtt": ["RemediationLambda", "Arn"] },
        "Id": "RetirementRemediation",
        "InputTransformer": {
          "InputPathsMap": {
            "instanceId": "$.detail.affectedEntities[0].entityValue",
            "eventArn": "$.detail.eventArn"
          },
          "InputTemplate": "{\"instanceId\": \"<instanceId>\", \"eventArn\": \"<eventArn>\", \"action\": \"replace\"}"
        }
      }
    ]
  }
}
```

## How to Decide

Use this framework when a scenario asks which monitoring service to use:

| Scenario | Service |
|---|---|
| "We want to find underutilized EC2 instances to save money" | Trusted Advisor (Cost Optimization) |
| "We need to be notified when an AWS service is degraded in our region" | AWS Health (PHD) |
| "We need to ensure S3 buckets are not publicly readable and get alerted on violations" | AWS Config + Config Rules |
| "We want to aggregate GuardDuty and Inspector findings in one place" | AWS Security Hub |
| "We need to auto-respond when a host is scheduled for maintenance" | AWS Health + EventBridge |
| "We need to check if our account is approaching VPC limits" | Trusted Advisor (Service Limits) |
| "We need audit history of who changed a security group" | AWS CloudTrail |
| "We need a compliance report showing historical resource configurations" | AWS Config |
| "We need all 535+ Trusted Advisor checks, not just 6" | Business or Enterprise Support plan required |

**Key decision rule:** If the scenario says "proactive scanning of current configuration" — think Trusted Advisor. If the scenario says "event happened to your resources" — think AWS Health.

## How This Connects

- **Amazon EventBridge:** AWS Health events are published to EventBridge on the default bus in `us-east-1`. Every health event type can trigger automated workflows — Lambda, Step Functions, Systems Manager Runbooks. Without EventBridge, Health is only a notification dashboard; with it, Health becomes an operational automation trigger.
- **AWS Support API:** Trusted Advisor check results are exposed via the Support API, enabling you to pull findings into your own dashboards, ticketing systems, or reporting tools. Combined with EventBridge, you can alert on Trusted Advisor status changes automatically.
- **AWS Organizations:** Both services have Organizations-level features. Trusted Advisor has an Organizational view that aggregates check results across all member accounts. AWS Health has AWS Health Organizational View that shows health events affecting any account in your organization — useful for central cloud operations teams.
- **Amazon SNS / AWS Chatbot:** Trusted Advisor integrates with CloudWatch to trigger SNS notifications on check status changes. AWS Health works best with EventBridge to SNS to Slack/Teams via AWS Chatbot for human-readable incident notifications alongside automated responses.

## Exam Traps

**Trap 1: Confusing Trusted Advisor with AWS Config.**
Trusted Advisor runs AWS-defined best-practice checks and cannot be customized. AWS Config evaluates resources against rules you define (or from the managed library) and records full configuration history. If the scenario mentions "custom compliance rules" or "configuration history," the answer is Config, not Trusted Advisor.

**Trap 2: Thinking Trusted Advisor is free for all checks.**
The ~6 checks available on Basic/Developer support plans are only in the Security and Service Limits categories. Cost optimization, performance, and fault tolerance checks (and hundreds more security/limit checks) require Business or Enterprise Support. An exam scenario that mentions "checking for idle load balancers" is implicitly assuming Business/Enterprise support.

**Trap 3: Confusing the Service Health Dashboard with the Personal Health Dashboard.**
The Service Health Dashboard at status.aws.amazon.com is a public page showing AWS service status globally — it is not account-specific. The Personal Health Dashboard shows events affecting YOUR resources specifically. For exam scenarios about "notify our team when AWS maintenance affects our EC2 instances," the answer is the Personal Health Dashboard with EventBridge, not the public Service Health Dashboard.

**Trap 4: Thinking Health API works in any region.**
The AWS Health API (`aws health describe-events`) is only available in `us-east-1`. Even if the affected resource is in `ap-southeast-1`, you still call the Health API endpoint in `us-east-1`. EventBridge rules for Health events must also be created in `us-east-1`.

**Trap 5: Confusing Trusted Advisor with Security Hub.**
Security Hub aggregates findings from GuardDuty, Inspector, Macie, and third-party tools. Trusted Advisor runs its own independent checks. They are not the same. Security Hub has no cost optimization or service limits awareness; Trusted Advisor has no cross-service finding aggregation.

## Summary

- Trusted Advisor is a proactive best-practice scanner across five categories (cost, performance, security, fault tolerance, service limits); full access requires Business or Enterprise Support.
- AWS Health provides personalized event notifications when AWS infrastructure changes affect your specific resources, distinguishing between issues, scheduled changes, and account notifications.
- The AWS Health API and EventBridge integration operate exclusively through `us-east-1`, regardless of which region the affected resources reside in.
- Trusted Advisor is for "what is wrong with my configuration right now"; AWS Health is for "what is AWS doing to my resources right now or soon."
- AWS Config, not Trusted Advisor, is the answer when a scenario requires custom compliance rules or configuration history tracking.
- EventBridge transforms AWS Health from a passive dashboard into an active automation trigger, enabling self-healing infrastructure responses to maintenance and incident events.

## Examples

**Beginner:** A startup running their first production workload wants to make sure they haven't accidentally left any S3 buckets publicly accessible. They open the AWS Trusted Advisor console and navigate to the Security category. Even on the free Basic Support plan, the "Amazon S3 Bucket Permissions" check is available and highlights any buckets with public read or write access enabled. This is a zero-configuration safety net — no rules to write, no agents to install.

**Intermediate:** A company's operations team is tired of manually checking the AWS console for maintenance notifications. Their EC2 instances occasionally get retirement notices hours before the maintenance window, giving little time to react. They create an EventBridge rule in `us-east-1` that matches `aws.health` events with event type `AWS_EC2_INSTANCE_RETIREMENT_SCHEDULED`. The rule targets a Lambda function that reads the affected instance ID from the event payload, creates a new AMI, launches a replacement instance from that AMI, updates the relevant Auto Scaling group, and sends a Slack message via SNS and Chatbot. The entire response now happens within minutes of the notification, automatically.

**Advanced:** A large enterprise with 200 AWS accounts under AWS Organizations wants centralized visibility into both configuration best practices and service health across all accounts. They enable Trusted Advisor Organizational View to aggregate check results from all member accounts into the management account, then push results to an S3 bucket and query them with Athena to generate weekly cost optimization reports by business unit. They separately enable AWS Health Organizational View, configure EventBridge in `us-east-1` in the management account to receive health events from all member accounts, and route critical `issue`-type events to PagerDuty via an API Gateway target. This architecture gives their cloud center of excellence both a proactive scanning layer and a reactive incident signal layer, each purpose-built for its role.

## Think About It

1. If you had to explain to a colleague why Trusted Advisor and AWS Config both exist when they seem to do similar things, how would you describe the distinct purpose of each? What can one do that the other cannot?

2. Consider the requirement to automatically replace an EC2 instance when it receives a retirement notice. What services would you chain together, in what order, and why does the region constraint on the Health API matter for your architecture?

3. A new AWS account is on the Basic Support plan. A security team asks "is Trusted Advisor useful for us?" How would you answer — what can they access, what can't they access, and what would change if they upgraded to Business Support?

4. Why do you think AWS Health events are always routed through `us-east-1` even for resources in other regions? What architectural implications does this have when building multi-region monitoring systems?

5. If you were building a cloud governance dashboard for an organization with 50 AWS accounts, how would you use Trusted Advisor Organizational View and AWS Health Organizational View together? What gap would still exist that you might fill with another service?

## Quick Check

**Question 1:** Your company is on the Basic AWS Support plan. A security engineer asks whether Trusted Advisor can identify EC2 instances with low CPU utilization to reduce costs. What is the correct answer?

- A) Yes, Trusted Advisor's Cost Optimization checks are available on all support plans
- B) No, low CPU utilization checks require Business or Enterprise Support
- C) Yes, but you must enable the check manually in the Trusted Advisor console
- D) No, EC2 utilization checks are only available in AWS Cost Explorer, not Trusted Advisor

**Answer: B** — Cost Optimization checks, including low-utilization EC2 instances, are only available with Business or Enterprise Support. The Basic and Developer plans provide access to approximately six checks, limited to core Security and Service Limits categories. Cost Explorer does show utilization data, but the Trusted Advisor check specifically is gated behind paid support tiers.

---

**Question 2:** An EC2 instance in `eu-west-1` is scheduled for retirement. You want EventBridge to automatically trigger a Lambda function to replace it. In which region must you create the EventBridge rule?

- A) `eu-west-1`, because that is where the affected resource is located
- B) `us-east-1`, because the AWS Health API and its EventBridge events only route through that region
- C) Any region, because EventBridge rules are globally replicated
- D) `us-west-2`, because that is the AWS Health service's primary region

**Answer: B** — AWS Health events are always published to the default EventBridge event bus in `us-east-1`, regardless of where the affected resources are located. Your EventBridge rule and any targets must be deployed in `us-east-1` to receive Health events. The Lambda itself can then operate cross-region on the `eu-west-1` resource.

---

**Question 3:** A compliance team wants to enforce that all S3 buckets have server-side encryption enabled. When a bucket is created without encryption, they want an automated alert within minutes. Which service is the best fit?

- A) AWS Trusted Advisor, using the S3 security checks
- B) AWS Health, using account notification events
- C) AWS Config, using a managed rule like `s3-bucket-server-side-encryption-enabled`
- D) Amazon Inspector, which scans S3 for configuration vulnerabilities

**Answer: C** — AWS Config with the `s3-bucket-server-side-encryption-enabled` managed rule evaluates every S3 bucket against the encryption requirement in near-real time and can trigger remediation via SNS or Systems Manager Automation. Trusted Advisor checks S3 bucket permissions but does not evaluate encryption configuration. AWS Health covers infrastructure events, not configuration compliance. Inspector focuses on EC2 and container vulnerability scanning, not S3 configuration.

## What's Next

Next, explore AWS Config in depth — specifically Config Rules, conformance packs, and the auto-remediation integration with Systems Manager Automation, which gives you programmable compliance enforcement rather than just notification. You will also want to understand how Security Hub builds on top of Config, GuardDuty, and Inspector to create a unified security posture management layer.
