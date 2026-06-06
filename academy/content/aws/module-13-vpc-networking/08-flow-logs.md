---
title: "VPC Flow Logs"
type: content
estimated_minutes: 10
cert_tags: ["SAA-C03", "SOA-C02", "SCS-C02"]
---

# VPC Flow Logs

## Overview

VPC Flow Logs capture metadata about the IP traffic flowing through your network interfaces in AWS. Every connection attempt — accepted or rejected — is recorded: who initiated it, which port, which protocol, how many bytes, and whether your security groups or NACLs allowed or denied it. This metadata is the foundation of network security analysis, compliance auditing, and traffic debugging in AWS.

Flow logs do not capture packet contents — you're getting connection records, not a packet capture. Think of them as the network equivalent of a web server access log: not the full HTTP body, but a precise record of every request. That distinction matters both for privacy compliance (no PII in the logs unless it's in the IP headers) and for understanding what they can and cannot tell you.

For the SAA exam, Flow Logs appear in architecture questions about network monitoring, security incident investigation, and compliance. For the SOA and SCS exams, the depth goes further: how to enable them, how to query them, how to detect specific attack patterns, and the billing implications of high-volume flow log destinations.

---

## Core Concepts

### What Flow Logs Capture

Each flow log record is a space-delimited line containing fields about a single network flow. The default format captures 14 fields:

- **version** — log format version
- **account-id** — AWS account of the ENI
- **interface-id** — the ENI (elastic network interface) the traffic passed through
- **srcaddr** — source IP address
- **dstaddr** — destination IP address
- **srcport** — source port
- **dstport** — destination port
- **protocol** — IANA protocol number (6=TCP, 17=UDP, 1=ICMP)
- **packets** — number of packets in the flow
- **bytes** — number of bytes in the flow
- **start** — start of the capture window (Unix timestamp)
- **end** — end of the capture window
- **action** — ACCEPT or REJECT (based on security group or NACL evaluation)
- **log-status** — OK, NODATA (no traffic during window), or SKIPDATA (records skipped due to capacity constraints)

You can add custom fields beyond the default 14, including the VPC ID, subnet ID, instance ID, TCP flags, and traffic type. Custom formats are defined when you create the flow log.

The `action` field is particularly valuable for security: a `REJECT` means a connection was attempted but blocked by a security group or NACL. A flood of REJECTs from an external IP indicates a port scan or brute-force attempt. A `REJECT` from an unexpected internal IP indicates lateral movement or a misconfigured application.

---

### Flow Log Levels and Scope

Flow logs can be enabled at three levels:

**VPC level** — captures all traffic on all ENIs in the VPC. The broadest scope, catches everything including intra-VPC traffic. Generates the most log volume.

**Subnet level** — captures all traffic on all ENIs in a specific subnet. Useful for visibility into a particular tier (e.g., only the database subnet) without paying for full VPC logging.

**Network Interface (ENI) level** — captures traffic on a single specific ENI. Most targeted option, useful for debugging a specific instance.

You can have multiple flow logs on the same resource pointing to different destinations — for example, a VPC-level log to S3 for long-term retention and a subnet-level log to CloudWatch Logs for real-time alerting.

---

### Flow Log Destinations

**Amazon S3** — delivers logs in compressed (gzip) batches every 5–15 minutes. Queryable with Amazon Athena (SQL directly against S3 files). The cheapest destination for high-volume logging at scale.

**Amazon CloudWatch Logs** — delivers to a CloudWatch Log Group, enabling real-time Metric Filters and CloudWatch Insights queries. More expensive than S3 for storage, but enables live alerting (CloudWatch Alarm triggered by a metric filter counting REJECTs). Best for operational monitoring.

**Amazon Kinesis Data Firehose** — streams flow logs to Firehose for delivery to S3, Redshift, OpenSearch, or Splunk. Useful for integrating with an existing SIEM pipeline.

Flow logs are **not real-time** regardless of destination — there is a capture window aggregation delay before records are published. They are not suitable for real-time blocking decisions; use AWS Network Firewall for that.

---

### Traffic That Flow Logs Do Not Capture

Flow logs have specific exclusions worth knowing for the exam:

- **Traffic to/from the instance metadata service** (169.254.169.254)
- **Traffic to/from the Amazon DNS resolver** (the VPC+2 address) — use Route 53 Resolver Query Logs for DNS visibility
- **AWS license activation traffic**
- **Amazon Time Sync Service** (169.254.169.123)
- **DHCP traffic**
- **Traffic to the default VPC router**

The most exam-relevant exclusion: **DNS queries to the VPC resolver are not captured in flow logs**.

---

### Querying Flow Logs with Athena

For flow logs stored in S3, Amazon Athena is the standard query tool — SQL queries run directly against S3 files with no ETL needed. Partitioning flow logs by account/Region/year/month/day dramatically reduces query cost and speed.

Common query patterns:
- Find all REJECT records to a specific port in the last 24 hours
- Find the top 10 source IPs by byte volume to a specific instance
- Find traffic on unexpected protocols from internal app servers
- Identify resources with unusually high outbound byte volumes (potential data exfiltration)

---

## Configuration Reference

### Enabling Flow Logs via the Console

1. Navigate to **VPC** → **Your VPCs** (or Subnets / Network Interfaces for narrower scope)
2. Select the resource → **Actions → Create flow log**
3. Configure:
   - **Filter**: All traffic, Accepted only, or Rejected only
   - **Maximum aggregation interval**: 1 minute (faster detection) or 10 minutes (lower cost)
   - **Destination**: S3 bucket, CloudWatch Logs, or Kinesis Data Firehose
   - **Log record format**: AWS default or Custom (add VPC ID, subnet ID, instance ID, TCP flags, etc.)

---

### Enabling Flow Logs via the AWS CLI

```bash
# VPC-level flow logs to S3 with custom format including vpc-id and tcp-flags
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-0abc1234567890def \
  --traffic-type ALL \                          # ALL, ACCEPT, or REJECT
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::my-flow-logs-bucket/vpc-logs/ \
  --max-aggregation-interval 600 \              # 60 or 600 seconds
  --log-format '${version} ${account-id} ${interface-id} ${srcaddr} ${dstaddr} ${srcport} ${dstport} ${protocol} ${packets} ${bytes} ${start} ${end} ${action} ${log-status} ${vpc-id} ${subnet-id} ${instance-id} ${tcp-flags}' \
  --region us-east-1

# Subnet-level REJECT-only logs to CloudWatch Logs for real-time alerting
aws ec2 create-flow-logs \
  --resource-type Subnet \
  --resource-ids subnet-0def67890 \
  --traffic-type REJECT \                       # Only rejected traffic for security alerting
  --log-destination-type cloud-watch-logs \
  --log-group-name /vpc/flow-logs/db-subnet \
  --deliver-logs-permission-arn arn:aws:iam::123456789012:role/FlowLogsRole \
  --max-aggregation-interval 60 \              # 1-minute for faster alerting
  --region us-east-1

# List existing flow logs
aws ec2 describe-flow-logs \
  --query 'FlowLogs[*].{ID:FlowLogId,Resource:ResourceId,Status:FlowLogStatus,Destination:LogDestination}' \
  --output table

# Delete a flow log
aws ec2 delete-flow-logs --flow-log-ids fl-0abc1234567890def
```

---

### IAM Role for CloudWatch Logs Destination

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:PutLogEvents",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams"
    ],
    "Resource": "*"
  }]
}
```

Trust policy allowing the flow logs service to assume the role:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Service": "vpc-flow-logs.amazonaws.com" },
    "Action": "sts:AssumeRole"
  }]
}
```

---

### Querying Flow Logs with Athena

```sql
-- Create Athena table (run once after enabling flow logs to S3)
CREATE EXTERNAL TABLE IF NOT EXISTS vpc_flow_logs (
  version       int,    account_id   string,  interface_id string,
  srcaddr       string, dstaddr      string,  srcport      int,
  dstport       int,    protocol     bigint,  packets      bigint,
  bytes         bigint, start        bigint,  end          bigint,
  action        string, log_status   string,  vpc_id       string,
  subnet_id     string, instance_id  string,  tcp_flags    int
)
PARTITIONED BY (dt string)
ROW FORMAT DELIMITED FIELDS TERMINATED BY ' '
LOCATION 's3://my-flow-logs-bucket/vpc-logs/AWSLogs/123456789012/vpcflowlogs/us-east-1/'
TBLPROPERTIES ("skip.header.line.count"="1");

-- Top rejected sources (port scan / brute force detection)
SELECT srcaddr, dstport, COUNT(*) as attempts
FROM vpc_flow_logs
WHERE action = 'REJECT'
  AND dt >= date_format(current_date - interval '1' day, '%Y/%m/%d')
GROUP BY srcaddr, dstport
ORDER BY attempts DESC LIMIT 20;

-- Top talkers by bytes (potential data exfiltration)
SELECT srcaddr, dstaddr, SUM(bytes) as total_bytes
FROM vpc_flow_logs
WHERE action = 'ACCEPT'
  AND dt = date_format(current_date, '%Y/%m/%d')
GROUP BY srcaddr, dstaddr
ORDER BY total_bytes DESC LIMIT 10;

-- Unexpected outbound traffic on non-standard ports
SELECT interface_id, srcaddr, dstaddr, dstport, bytes
FROM vpc_flow_logs
WHERE action = 'ACCEPT'
  AND srcaddr LIKE '10.%'           -- internal source
  AND dstaddr NOT LIKE '10.%'       -- external destination
  AND dstport NOT IN (80, 443, 53)  -- not HTTP/HTTPS/DNS
ORDER BY bytes DESC;
```

---

## How to Decide

| Goal | Configuration |
|---|---|
| Security audit / compliance evidence | VPC level, ALL traffic, S3, 10-min aggregation |
| Real-time intrusion detection | Subnet level, REJECT only, CloudWatch Logs, 1-min + alarm |
| Debug a specific instance | ENI level, ALL traffic, CloudWatch Logs |
| SIEM integration | VPC level, Kinesis Firehose → Splunk/Datadog |
| Cost-conscious at scale | S3, 10-min aggregation, REJECT only if security-focused |
| DNS query logging | Use Route 53 Resolver Query Logs — not flow logs |

**Aggregation interval trade-off:** 1 minute gives faster detection of short-lived attacks; 10 minutes reduces cost and is adequate for compliance and trend analysis.

---

## How This Connects

- **Amazon Athena** — the standard query engine for flow logs in S3; serverless SQL directly against log files, with partitioning to minimize scanned data and cost.
- **Amazon CloudWatch Logs Insights** — for flow logs in CloudWatch Logs, Insights provides a query language with time-series aggregation for operational dashboards without needing Athena.
- **Amazon GuardDuty** — automatically analyzes VPC Flow Logs, DNS logs, and CloudTrail on your behalf to detect threats. Enabling GuardDuty means it reads your flow logs — you don't need to query them manually for threat detection. GuardDuty findings feed into Security Hub.
- **Route 53 Resolver Query Logs** — the companion for DNS visibility. Flow logs capture TCP/UDP metadata; Resolver Query Logs capture which domain names resources are querying — critical for detecting DNS-based C2 communication.
- **AWS Network Firewall** — provides real-time traffic blocking that flow logs cannot. Flow logs are retrospective analysis; Network Firewall is active enforcement.

---

## Exam Traps

- **Flow logs do not capture DNS queries to the VPC resolver.** The VPC+2 DNS resolver address is explicitly excluded. For DNS query visibility use Route 53 Resolver Query Logs.
- **Flow logs are not real-time** — 1- or 10-minute aggregation windows always exist. They cannot drive real-time blocking decisions.
- **`REJECT` means a security group or NACL blocked it — not that the destination was unreachable.** `ACCEPT` means the network policy allowed the packets through, but the application may still have refused the connection at a higher layer.
- **Flow logs have real cost.** CloudWatch Logs ingestion, S3 storage, and Athena query costs all apply. High-traffic VPCs can generate gigabytes of flow logs per hour — use filtering and 10-minute aggregation to control costs.
- **Flow logs don't capture packet contents.** For packet-level inspection use VPC Traffic Mirroring. Flow logs give you connection metadata only.

---

## Summary

- VPC Flow Logs capture IP traffic metadata (source/dest IP, ports, protocol, bytes, ACCEPT/REJECT) at the VPC, subnet, or ENI level — not packet contents.
- The `action` field (ACCEPT/REJECT) indicates whether security groups or NACLs permitted or blocked the traffic, making flow logs essential for network security analysis.
- Three destinations: S3 (cheapest, queryable with Athena), CloudWatch Logs (real-time alerting via metric filters), and Kinesis Firehose (streaming to SIEM).
- Flow logs explicitly exclude traffic to the VPC DNS resolver (VPC+2), instance metadata service (169.254.169.254), and DHCP — use Route 53 Resolver Query Logs for DNS visibility.
- Aggregation interval is 1 or 10 minutes; logs are never real-time. For real-time blocking, use Network Firewall.
- Amazon Athena with partitioned S3 tables is the standard approach for querying flow logs at scale.

---

## Examples

A security engineer investigating a suspected port scan opens CloudWatch Logs Insights on the database subnet's flow log group and queries for REJECT records in the past hour. The results show 4,200 rejected connections from a single external IP across ports 22, 3306, 5432, and 1433 — the classic signature of an automated vulnerability scanner. All were blocked (hence REJECT), so no breach occurred. The engineer creates a CloudWatch Metric Filter to alarm on more than 100 REJECTs from a single source IP in 5 minutes, turning the investigation into an automated detection rule going forward.

A compliance team at a financial services company needs to demonstrate to auditors that all production database traffic flows only from the application tier. They enable VPC-level flow logs to S3 and run a nightly Athena query: find any ACCEPT records where the destination is the database subnet CIDR and the source is not the application subnet CIDR. For 90 days, the query returns zero results — confirming no unexpected sources have accessed the databases. The Athena query output, timestamped and stored in S3, becomes the compliance evidence artifact. Flow logs used not for incident detection, but for continuous compliance verification.

A platform team troubleshooting intermittent connection drops enables 1-minute aggregation flow logs on the application subnet ENIs and looks for TCP flows with `tcp-flags = 4` (RST flag set), indicating connections being reset unexpectedly. They also check for `log-status = SKIPDATA` records, which indicate the flow log service dropped records due to extremely high connection rates. The flow logs reveal 50,000 new connections per minute — exceeding NAT Gateway's per-second connection rate limits. The application's connection pool configuration, not a network failure, is the root cause. Flow logs provided the evidence to make that determination without packet capture.

---

## Think About It

1. GuardDuty automatically analyzes VPC Flow Logs to detect threats without requiring you to set up your own query pipeline. Under what circumstances would you still want to maintain your own flow log pipeline to S3 and query it with Athena?
2. Enabling flow logs on a high-traffic VPC can generate terabytes of data per day with significant storage and query costs. How would you design a cost-conscious flow log strategy that maintains meaningful security visibility without creating runaway costs?
3. The `action = ACCEPT` record means a security group or NACL permitted the traffic. But the application may still have rejected the connection. What are the limitations of using flow logs alone to determine whether an end-to-end connection was truly successful?
4. Flow logs capture metadata but not packet contents. VPC Traffic Mirroring captures actual packets. For which security investigation scenarios is metadata sufficient, and when would you need full packet capture? What are the cost and privacy trade-offs of each?
5. A developer argues that since GuardDuty already monitors flow logs for threats, there is no need for the security team to maintain their own flow log pipeline. What is the strongest argument for keeping your own pipeline even when GuardDuty is enabled?

---

## Quick Check

**Q1.** A security team wants to be alerted in near-real-time when any connection to the database subnet is rejected. Which configuration best supports this?
- A) VPC-level flow logs to S3, queried hourly with Athena
- B) Subnet-level REJECT-only flow logs to CloudWatch Logs, with a Metric Filter and CloudWatch Alarm
- C) ENI-level flow logs to Kinesis Firehose delivered to Redshift
- D) VPC-level flow logs to S3 with 10-minute aggregation

**Answer: B** — CloudWatch Logs with a Metric Filter counting REJECT records enables near-real-time CloudWatch Alarms. The REJECT-only filter reduces volume; subnet scope targets the critical tier; 1-minute aggregation maximizes detection speed.

**Q2.** An auditor asks why DNS queries from EC2 instances do not appear in VPC Flow Logs. What is the correct explanation?
- A) Flow logs only capture TCP traffic, not UDP DNS queries
- B) Traffic to the VPC DNS resolver address is explicitly excluded from flow log capture
- C) DNS traffic is encrypted and cannot be captured by flow logs
- D) Flow logs only capture traffic that crosses subnet boundaries

**Answer: B** — Traffic to the VPC DNS resolver (VPC CIDR +2, e.g., 10.0.0.2) is explicitly excluded from VPC Flow Log capture. To log DNS queries, enable Route 53 Resolver Query Logs separately.

**Q3.** A flow log shows `action = ACCEPT` for a TCP connection from an app server to a database server, but the application reports the connection failed. What does this indicate?
- A) The flow log is incorrect — ACCEPT always means the connection succeeded end-to-end
- B) The security group allowed the network traffic, but the failure occurred at a higher layer such as authentication or the database refusing the connection
- C) The NACL blocked the return traffic, preventing connection completion
- D) The database's security group rejected the return traffic

**Answer: B** — `ACCEPT` means the network policy permitted the traffic to pass. It says nothing about what happened at the application or database layer. The failure occurred after the network allowed the packets — likely an authentication error, wrong credentials, or the service not listening on that port.

---

## What's Next

This completes Module 13's networking content. The labs build a three-tier VPC from scratch, add a NAT Gateway for private subnet egress, and configure multi-VPC peering — putting the concepts from this entire module into practice.
