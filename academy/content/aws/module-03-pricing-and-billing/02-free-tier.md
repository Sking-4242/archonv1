---
title: "The AWS Free Tier"
type: content
estimated_minutes: 17
cert_tags: ["CLF-C02"]
---

# The AWS Free Tier

## Overview

The AWS Free Tier is a collection of service-specific usage allowances that let you run real AWS workloads at zero cost, within defined monthly limits. AWS created it to eliminate the financial barrier to getting started — you can explore services, run experiments, build projects, and work through certifications without worrying about a bill, as long as you understand what the limits are and stay within them. The free tier is not a promotional gimmick. Services like AWS Lambda and Amazon DynamoDB offer permanent Always Free tiers that make lightweight serverless applications genuinely free to run indefinitely, at any account age, for as long as your usage stays within the monthly caps.

The free tier is also not a blanket free cloud platform. It is a set of per-service, per-month usage caps. Exceed any cap — even by a small amount — and the excess usage is charged at standard AWS rates and billed to the payment method on your account. Many first-time AWS users receive a surprise bill not because they were reckless, but because they did not understand that running two EC2 instances simultaneously burns through the 750-hour monthly pool twice as fast, or because they forgot that data transfer out to the internet is charged even during the 12-month free tier period. The mechanics matter. Knowing them precisely is the difference between a free learning environment and an unwelcome charge on your credit card.

This lesson matters for the CLF-C02 exam because AWS tests specific free tier knowledge: which offer types exist, which services fall under each type, what the EC2 and RDS hour limits actually mean when multiple instances are running, and which console tools to use to monitor consumption before it overruns. It also matters practically — if you are using a personal AWS account to practice for this certification, this lesson tells you exactly how to study safely without generating charges.

## Core Concepts

### Free Tier Type 1: Always Free

Always Free offers never expire and apply to every AWS account — new accounts, old accounts, and accounts well past their 12-month window. These are not introductory rates. They represent the designed pricing model for those services at low usage levels, and they remain in effect indefinitely regardless of account age. Always Free is the most architecturally significant tier because it enables genuinely cost-free production workloads at small scale.

The most exam-relevant Always Free offers are:

- **AWS Lambda**: 1 million free requests per month, plus 400,000 GB-seconds of compute time. A function allocated 512 MB of memory running for 1 second uses 0.5 GB-seconds. At that rate, 400,000 GB-seconds supports approximately 800,000 one-second invocations per month — enough to run many lightweight production APIs at zero Lambda cost.
- **Amazon DynamoDB**: 25 GB of storage, 25 provisioned read capacity units, and 25 write capacity units per month — enough for roughly 200 million small requests per month on a modest table.
- **Amazon CloudWatch**: 10 custom metrics, 10 alarms, 5 GB of log data ingestion, and 1 million API requests per month.
- **AWS IAM**: Identity and access management — always free with no usage limits. Creating users, roles, groups, and policies costs nothing.
- **Amazon VPC**: The virtual private cloud construct itself is always free. Note that NAT Gateways and certain VPC endpoints carry hourly charges — the VPC container is free, but some components within it are not.
- **Amazon SNS**: 1 million publishes per month to HTTP/HTTPS endpoints; email delivery fees apply per message at higher volumes.

Always Free offers matter architecturally because they enable permanently free lightweight workloads. A serverless API built on Lambda and DynamoDB — fewer than 1 million requests per month, fewer than 25 GB of data — can run at zero cost indefinitely. This is not a special arrangement; it is the pricing model for those services at that scale, available to every account forever.

### Free Tier Type 2: 12 Months Free

Twelve-month free offers apply to new AWS accounts and expire 12 months from the account creation date, regardless of when you start using the specific services. These are the offers most people mean when they say "the AWS free tier." They are generous enough to support real learning projects and small applications, but they carry meaningful limits that require active monitoring.

The most exam-relevant 12-months-free offers are:

- **Amazon EC2**: 750 hours per month of t2.micro or t3.micro instances running Linux, UNIX, or Windows.
- **Amazon S3**: 5 GB of Standard storage, 20,000 GET requests, and 2,000 PUT/COPY/POST/LIST requests per month.
- **Amazon RDS**: 750 hours per month of db.t2.micro or db.t3.micro Single-AZ database instances, plus 20 GB of database storage and 20 GB of automated backup storage.
- **Amazon CloudFront**: 1 TB of data transfer out per month and 10 million HTTP and HTTPS requests.
- **AWS Elastic Load Balancing**: 750 hours per month of Classic or Application Load Balancer usage.

Critical detail: the 12-month clock starts when the AWS account is created, not when you first use any service. If you create an account today and use it lightly for the first six months, you have only six months of 12-month benefits remaining when you begin serious usage. Plan your learning and study timeline accordingly — do not create an account months before you intend to use it seriously.

### Free Tier Type 3: Short-Term Trials

Trial offers are service-specific free periods that begin the moment you first enable or activate a service in a given AWS Region. Trial durations are typically 30 or 90 days from first activation — not from account creation.

Important trial-based offers include:

- **Amazon GuardDuty**: 30-day free trial per Region. GuardDuty continuously monitors your AWS account for malicious activity and anomalous behavior using threat intelligence and machine learning. After 30 days, billing begins based on the volume of events analyzed.
- **Amazon Inspector**: 90-day free trial. Inspector automatically scans EC2 instances and container images for software vulnerabilities and unintended network exposure.
- **Amazon Macie**: 30-day free trial. Macie uses machine learning to discover, classify, and protect sensitive data stored in S3.
- **AWS Security Hub**: 30-day free trial per Region. Security Hub aggregates security findings from multiple AWS services and third-party tools into a centralized dashboard.

Important nuance: trial periods run independently per Region. If you enable GuardDuty in us-east-1 on January 1 and then also enable it in eu-west-1 on January 15, the us-east-1 trial ends January 30 while the eu-west-1 trial ends February 13. Post-trial billing begins at different times in each Region. If you enable a trial service for learning purposes, set a calendar reminder to disable it before the trial ends — or accept that billing will begin automatically when it expires.

### The EC2 750-Hour Rule: The Most Misunderstood Free Tier Limit

The EC2 free tier grants 750 hours per month of t2.micro or t3.micro instance time across your entire AWS account. This is the most commonly misunderstood limit in the free tier, and understanding it precisely prevents the most common free tier billing surprise for new AWS users.

A calendar month contains approximately 720–744 hours (30 days × 24 hours = 720; 31 days × 24 hours = 744). The 750-hour monthly allowance is designed to let you run exactly one qualifying instance continuously, around the clock, for a full month without charge. The word "one" is load-bearing. The 750 hours are an account-wide pool shared across all concurrently running instances of eligible types. Every clock-hour that an instance runs consumes one hour from the pool — regardless of how many instances are running simultaneously.

When you run two t2.micro instances simultaneously, both consume from the same 750-hour pool. Two instances running for 1 clock-hour consume 2 pool hours. At that rate, the 750-hour pool is exhausted in 375 hours — roughly 15.6 days into a 30-day month. For the remaining 14 or 15 days, all running instances incur on-demand charges at the standard t2.micro rate.

Three t2.micro instances running simultaneously would exhaust the pool in 250 hours — about 10.4 days — leaving approximately 20 days of on-demand charges for all three instances. The math is linear: N simultaneous instances exhaust the pool in (750 ÷ N) hours. The practical implication is simple: stop instances when you are not actively working on them, and never leave multiple instances running overnight unattended unless you are prepared to pay for those hours.

### Common Free Tier Traps That Generate Charges

Several free tier behaviors generate unexpected bills for new users, and the CLF-C02 exam specifically tests awareness of these traps.

**Data transfer out is not free.** Even within the 12-month free tier period, serving data from EC2 or S3 to internet users incurs data transfer out charges. The only exception is the CloudFront allowance of 1 TB per month. If you build any public-facing application — a website, an API, a file server — that generates meaningful outbound traffic, you will see data transfer charges regardless of your free tier status.

**EBS volumes bill whether or not their instance is running.** When you stop an EC2 instance, the per-second compute charge stops. The EBS volume attached to that instance continues to exist and continues to incur storage charges at the EBS rate. The free tier includes 30 GB of EBS General Purpose SSD (gp2/gp3) storage per month. If your instance root volume is 30 GB or less, stopping the instance keeps you within the EBS free tier limit. But if you provisioned a 50 GB or 100 GB root volume, you are billed for the overage even when the instance is stopped. Only terminating the instance — which deletes the root volume by default — stops all charges.

**RDS Multi-AZ is not free tier eligible.** The RDS free tier covers only Single-AZ deployments of db.t2.micro or db.t3.micro instances. Multi-AZ deployments — which maintain a synchronous standby in a second Availability Zone for high availability — are billed at Multi-AZ rates from the first minute, regardless of free tier status. If you accidentally enable Multi-AZ when creating a learning RDS instance, you will be charged even if you notice and correct it immediately.

**Elastic IP addresses charge when not associated with a running instance.** AWS provides one Elastic IP address per running EC2 instance at no charge. However, if you allocate an Elastic IP and then stop or terminate the associated instance — or allocate Elastic IPs beyond the number of running instances — each idle Elastic IP incurs approximately $0.005 per hour ($3.60/month). Always release Elastic IP addresses you are no longer actively using.

## Configuration Reference

### Finding the Free Tier Usage Tracker in the Billing Dashboard

AWS provides a built-in tracker that displays your free tier consumption against each service's monthly limit, updated once daily. This is the primary tool for verifying that usage is staying within free tier bounds before charges accumulate.

**Step 1: Open the Billing and Cost Management console.** Sign in to the AWS Management Console. Click your account name in the upper-right corner of the navigation bar and select "Billing and Cost Management" from the dropdown. Alternatively, type "Billing" in the top search bar and select the result.

**Step 2: Navigate to the Free Tier page.** In the left navigation panel, look for "Free Tier" under the "AWS Cost Management" section. Click it. The Free Tier page loads a table of every AWS service that has a free tier offer active on your account.

**Step 3: Read the usage table.** The Free Tier table contains the following columns: Service Name (for example, "Amazon EC2 running Linux/UNIX"), Offer Type (Always Free, 12-Month Free, or Trial), Monthly Usage Limit (for example, "750 Hrs"), Current Usage (how much you have consumed so far this month), and Forecasted Usage (projected end-of-month consumption based on your current daily rate). A progress bar accompanies each row — green means you are well within the limit, yellow means you are approaching it, and red means you have exceeded the limit and additional charges are accruing.

**Step 4: Identify services approaching their limits.** Sort the table by the Forecasted Usage percentage column to surface services trending toward overuse. If the EC2 row shows forecasted usage of 900 hours against a 750-hour limit, you can expect approximately 150 hours of on-demand EC2 charges at month-end. Take action now — stop instances you are not actively using — rather than waiting for the bill to arrive.

**Step 5: Account for the daily update delay.** The free tier usage data updates once per day, not in real time. Usage from earlier today may not appear until tomorrow morning. If you just launched multiple EC2 instances this afternoon, the usage tracker will not reflect that new consumption until its next daily update. Keep this delay in mind — early detection requires awareness of what you launched, not just what the tracker currently shows.

### Setting Up a Zero-Dollar Budget Alert in AWS Budgets

A zero-spend budget alert is the safety net for free tier accounts. It fires the moment any charge appears on your account — immediately signaling that something has exceeded free tier limits. Here is how to configure one.

**Step 1: Navigate to AWS Budgets.** From the Billing and Cost Management Dashboard, click "Budgets" in the left navigation panel. The Budgets page shows any existing budgets and a "Create budget" button in the upper right. Click "Create budget."

**Step 2: Choose the Zero spend budget template.** The first screen offers two setup modes: "Use a template (simplified)" and "Customize (advanced)." Select "Use a template (simplified)." In the template list, select "Zero spend budget." This template is purpose-built for free tier accounts — it creates a cost budget with a $0.01 threshold designed to alert you the moment any actual charge appears on the account. Click "Next."

**Step 3: Configure alert recipients.** The configuration screen shows the pre-filled budget name "My Zero-Spend Budget" and the $0.01 threshold. In the "Email recipients" field, enter the email address where you want alerts delivered. Multiple addresses can be added separated by commas. Review the configuration and click "Create budget."

**Step 4: Confirm the budget is active.** After creation, the Budgets dashboard lists your new budget with its name, the budgeted amount ($0.01), current actual spend, and current status. The status shows green until any charge — however small — appears on the account, at which point it flips to alert status and sends an email.

**Step 5: Understand alert timing.** AWS Budgets evaluates actual spend once per day and sends alerts when thresholds are crossed. Because AWS billing data finalizes with some delay, you may receive the email alert within 24 hours of a charge first appearing rather than instantly. For faster detection of significant unexpected usage, also consider enabling a billing alarm in Amazon CloudWatch — found under CloudWatch → Alarms → Billing — which can check account charges every 6 hours and send an SNS notification. Use both tools together: Budgets for daily email alerts and CloudWatch for faster notification on large unexpected charges.

### Enabling Free Tier Usage Alerts via Billing Preferences

AWS also offers a simpler free tier alert setting that proactively emails you when your account is forecasted to exceed any free tier limit.

**Step 1: Open Billing Preferences.** In the Billing and Cost Management Dashboard, click "Billing preferences" in the left navigation panel.

**Step 2: Enable Free Tier alerts.** Under "Alert preferences," find "AWS Free Tier alerts." Toggle this setting to On. Enter the email address to receive the alerts. Click "Save preferences."

With this setting enabled, AWS automatically emails you when your current usage rate is on track to exceed the monthly free tier limit for any service. This is lower-effort than creating an explicit Budget, but it is less configurable. Use both together: the billing preference alert for automatic first-warning emails, and the Free Tier usage tracker for detailed per-service investigation when an alert fires.

## How to Decide

Use this framework to assess whether a planned activity will stay within the free tier or generate charges:

| Scenario | Free Tier Behavior | Action to Avoid Charges |
|---|---|---|
| Running one t2.micro EC2 instance continuously for one full month | Within free tier (750 hrs ÷ 1 instance = ~750 hrs consumed) | No action needed; stop the instance at month-end if you don't need it in Month 2 |
| Running two t2.micro instances simultaneously for a full month | Exceeds free tier (~1,488 hrs consumed vs. 750-hr pool) | Stop the second instance when not in use; never run both overnight unattended |
| Running three t2.micro instances simultaneously for a full 31-day month | Far exceeds free tier (~2,232 hrs consumed vs. 750-hr pool) | Shut down all but one; use only what you are actively working on at any moment |
| Storing 4 GB of files in S3 | Within free tier (5 GB limit) | No action needed |
| Storing 4 GB in S3 and serving 200 GB of downloads to internet users | Storage within free tier; data transfer out is NOT free tier covered | Keep downloads minimal or accept transfer charges; use CloudFront's 1 TB free tier to offset |
| Deploying a Single-AZ db.t3.micro RDS instance | Within free tier (750 hrs for first 12 months) | Verify it is Single-AZ on the configuration screen before launching |
| Deploying a Multi-AZ RDS instance | NOT free tier eligible — billed at Multi-AZ rates from minute one | Switch to Single-AZ for all learning and test environments |
| Keeping an Elastic IP while the associated EC2 instance is stopped | Charged ~$0.005/hr (~$3.60/month) for idle Elastic IPs | Release the Elastic IP before stopping the instance if you don't need it later |
| Calling Lambda 800,000 times per month | Within Always Free tier (1 million requests per month) | No action needed |
| Enabling GuardDuty and keeping it active for 45 days | First 30 days free; days 31–45 billed at standard rates | Disable GuardDuty before day 31 if you enabled it only for learning |

## How This Connects

- The **AWS Billing Dashboard Free Tier tracker** is the primary monitoring tool for free tier consumption — it shows current-month usage against limits for every eligible service, updated daily, with color-coded indicators for services approaching their caps.
- **AWS Budgets** is the proactive safety net — a zero-spend ($0.01) budget sends an email the moment any charge appears on the account, catching free tier overruns before they compound over multiple days.
- **Amazon EC2 and Amazon RDS** both use the same 750-hour shared-pool free tier model — understanding this mechanic for EC2 makes it immediately transferable to RDS: two db.t3.micro instances running simultaneously exhaust the RDS 750-hour pool at double speed, just like EC2.
- **AWS Lambda and Amazon DynamoDB** demonstrate the practical value of the Always Free tier — these two services together can power a real, lightweight serverless API permanently within free tier limits, regardless of account age or how long ago the account was created.
- **AWS Cost Explorer** can be enabled on free tier accounts and provides historical cost charts and service breakdowns — if unexpected charges do appear, Cost Explorer is the tool to diagnose which service and usage type caused them, with filters by service, usage type, and date range.

## Exam Traps

**Trap 1: Thinking 750 hours means 750 hours per instance.** Students often think each t2.micro instance gets its own 750-hour allowance, but the 750 hours is an account-wide monthly pool shared across all concurrently running eligible instances. Two simultaneous t2.micro instances consume that pool at twice the rate. This is the single most commonly tested free tier misconception on the CLF-C02 exam.

**Trap 2: Assuming Always Free offers apply only to new accounts.** Students often think Always Free is just a more generous version of the 12-month offer, but Always Free services — Lambda 1 million requests/month, DynamoDB 25 GB of storage, CloudWatch 10 alarms — apply to all AWS accounts indefinitely. An account that is two years old still gets the full Always Free allowances for these services every single month.

**Trap 3: Assuming data transfer out is covered by the free tier.** Students often think the free tier covers all charges during the first 12 months, but data transfer out to the internet is NOT included in the EC2 or RDS 12-month free tier. Only the CloudFront free tier includes 1 TB of outbound data transfer. A student running a web server on a free tier EC2 instance and serving 20 GB of content to visitors will see data transfer charges on their bill regardless of free tier status.

**Trap 4: Confusing stopping an instance with terminating it.** Students often think stopping an EC2 instance stops all charges, but stopping halts only the per-second instance compute charge — it does NOT stop EBS storage charges for the attached volume. Only terminating the instance — which deletes the root volume by default — stops all charges associated with that instance.

**Trap 5: Thinking Multi-AZ RDS is covered by the free tier.** Students often think the RDS free tier covers the entire db.t3.micro family, but Multi-AZ RDS deployments are not free tier eligible under any condition. Only Single-AZ db.t2.micro or db.t3.micro instances qualify. Any exam scenario involving "high availability" or "Multi-AZ" in the context of RDS and free tier describes a configuration that will incur full Multi-AZ charges from minute one.

## Summary

- The AWS Free Tier has three offer types: Always Free (permanent, all accounts — Lambda 1M requests/month, DynamoDB 25 GB), 12 Months Free (first-year new accounts only — EC2 750 hrs/month, S3 5 GB, RDS 750 hrs/month), and Trials (service-specific start date — GuardDuty 30 days, Inspector 90 days).
- The EC2 750-hour monthly limit is an account-wide pool shared across all concurrently running eligible instances — two simultaneous t2.micro instances exhaust the pool in roughly 15.6 days, not 30.
- Data transfer out to the internet is not covered by the EC2 or RDS free tier and is charged at standard rates even within the 12-month window; CloudFront's 1 TB per month is the only free tier data transfer out allowance.
- Stopping an EC2 instance stops the compute charge but does not stop EBS storage charges for attached volumes — over-provisioned root volumes continue incurring storage costs until the instance is terminated.
- Multi-AZ RDS deployments are not free tier eligible under any condition — always verify Single-AZ when launching a learning database instance.
- Monitor free tier consumption using the Billing Dashboard Free Tier tracker (updated daily), and set up a zero-spend AWS Budget to receive email notification the moment any charge appears on the account.

## Examples

A computer science student creates an AWS account to study for the CLF-C02 exam. They launch a single t2.micro EC2 instance running Amazon Linux 2, configure an Apache web server, and practice deployment and configuration over a full 31-day month — 744 hours of instance run time. Their S3 usage is 1.8 GB for test files. Their Lambda function runs a few hundred test invocations during the month. End-of-month bill: $0.00. This is the free tier working exactly as designed — one instance, modest storage, minimal transfer, every metric well inside its monthly limit. The student's only future cost will come when their 12-month window expires and they continue running workloads.

A developer at a startup is building an MVP web application for an early customer demo. Three weeks into development, they launch a second t2.micro instance to set up a staging environment — they want to test a new feature deployment before pushing to production. Both instances run simultaneously for 10 days. During those 10 days, the two-instance setup consumes 480 hours of free tier credit (2 instances × 240 hours). Adding the 360 hours consumed during the first 20 days when only one instance ran, the month totals 840 hours — 90 hours over the 750-hour pool. The end-of-month bill shows $1.04 in EC2 charges for the 90 overage hours. The developer is surprised — they assumed that having "a free tier account" meant each instance had its own 750-hour allocation. This is the most common free tier misunderstanding in practice, and it appears on the CLF-C02 exam precisely because it is so counterintuitive on first encounter.

A senior solutions architect at a consulting firm has held the same personal AWS account for more than five years — well past any 12-month free tier window. Every month, they run several lightweight internal tools at exactly zero cost: a Lambda function that processes daily project reports (approximately 600,000 invocations — within the 1 million Always Free limit), a DynamoDB table storing client configuration data (9 GB — within the 25 GB Always Free limit), and CloudWatch dashboards with 8 custom metrics and 9 alarms (within the Always Free metric and alarm limits). Their bill for these tools: $0.00, month after month. The Always Free tier functions as a permanent foundation for lightweight tooling regardless of account age. This is the architecturally significant implication of the Always Free category — Lambda and DynamoDB are built to be genuinely free at small scale, not just during a promotional period.

## Think About It

1. The EC2 free tier provides 750 hours per month — just enough for one instance running continuously for a full month. Why do you think AWS designed it this way rather than providing, say, 250 hours per instance across up to 3 instances? What behavior does the pooled-hours model encourage, and what behavior does it discourage?
2. Data transfer out incurs charges even during the free tier period. If you are building a public-facing demo project to share with friends while practicing for your exam, what architectural decisions would you make to stay within free tier limits while still making the application accessible from a browser?
3. The Always Free tier includes Lambda at 1 million requests per month and DynamoDB at 25 GB of storage. What kinds of real-world applications could run entirely within these limits indefinitely, and at what point would a growing application start incurring charges — what would be the trigger event?
4. AWS Budgets set to $0 alerts you the instant any charge appears. Why might some developers prefer this over the Free Tier usage tracker in the Billing Dashboard — what does the Budgets approach catch that the tracker's daily update cycle might miss or report too late?
5. If you accidentally ran a Multi-AZ RDS instance for four days before noticing the mistake, what exact steps would you take to investigate the charge, correct the configuration, and prevent it from happening again — and which AWS tools would you use at each step?

## Quick Check

**Q1.** Which type of AWS Free Tier offer is available to all AWS accounts indefinitely, not just during the first 12 months?

- A) 12 Months Free
- B) Trial
- C) Always Free
- D) Reserved Free

**Answer: C** — Always Free offers (such as Lambda's 1 million requests/month and DynamoDB's 25 GB of storage) never expire and apply to all AWS accounts regardless of age. 12 Months Free applies only to new accounts for the first year. Trials begin at first service activation and expire after 30 or 90 days. "Reserved Free" is not a category in the AWS Free Tier.

**Q2.** A new AWS account runs three t2.micro EC2 instances simultaneously for an entire 30-day month. Approximately how many of those hours are covered by the free tier, and what happens to the rest?

- A) All 2,160 hours are covered — the free tier provides 750 hours per instance
- B) The first 750 hours are free; the remaining approximately 1,410 hours are billed at on-demand rates
- C) Only one instance is covered from the start; the other two are billed at on-demand rates from minute one
- D) The free tier does not apply at all when running more than one instance

**Answer: B** — The 750-hour pool is shared across all running instances. Three simultaneous instances consume 3 hours of pool credit per clock-hour. The pool exhausts in 250 hours (about 10.4 days), after which all three instances incur on-demand charges for the remaining approximately 20 days. The first 750 hours of total instance-time are free; the remainder is charged at on-demand rates.

**Q3.** A free tier account enables Amazon GuardDuty for the first time on January 1. On February 14, what is the billing status for GuardDuty?

- A) GuardDuty is Always Free and never incurs charges
- B) GuardDuty provided a 30-day free trial from January 1; the account has been billed at standard rates since January 31
- C) GuardDuty is covered by the 12-month free tier window for new accounts
- D) GuardDuty charges begin only after 90 days

**Answer: B** — GuardDuty offers a 30-day free trial that begins the moment you first enable it. In this case, the trial ran from January 1 through January 30. Standard GuardDuty billing began on January 31, based on the volume of events analyzed. By February 14, the account has accrued 15 days of standard GuardDuty charges.

## What's Next

Next: EC2 pricing models in depth — On-Demand, Reserved Instances (Standard vs. Convertible, 1-year vs. 3-year, all/partial/no upfront), Savings Plans (Compute vs. EC2 Instance), and Spot Instances. Learn when each model applies, how to quantify the savings, and how to purchase them in the AWS console.
