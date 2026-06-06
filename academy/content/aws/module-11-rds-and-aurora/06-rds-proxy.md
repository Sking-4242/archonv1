---
title: "RDS Proxy: Connection Pooling and IAM Auth"
type: content
estimated_minutes: 16
cert_tags: ["SAA-C03", "DVA-C02"]
---

# RDS Proxy: Connection Pooling and IAM Auth

## Overview

RDS Proxy is a fully managed, highly available database proxy that sits between your application tier and an RDS or Aurora database. Its primary job is connection pooling: instead of each application thread or Lambda invocation opening its own TCP connection to the database, all application connections go to the proxy, and the proxy maintains a smaller pool of persistent backend connections to the actual database instance. The database only sees connections from the proxy — not from hundreds or thousands of individual application processes. This architecture directly solves the connection exhaustion problem that occurs when serverless or containerized workloads scale horizontally and each process creates its own database connection.

Beyond connection pooling, RDS Proxy delivers two additional capabilities that address common enterprise requirements. First, it acts as an intelligent intermediary during Multi-AZ failovers: instead of application connections breaking and waiting for DNS TTL to expire (60–120 seconds), the proxy absorbs the failover by holding incoming queries briefly, reconnects its backend pool to the new primary, and resumes execution. Application-visible downtime drops from 60–120 seconds to typically 10–30 seconds. Second, it enforces IAM database authentication — applications authenticate to the proxy using an AWS IAM role and a short-lived auth token, eliminating static database passwords from application configuration entirely.

RDS Proxy is a standard pattern for any architecture that combines Lambda with RDS or Aurora. It appears frequently on both the SAA-C03 and DVA-C02 exams, typically as the solution to a scenario involving Lambda connection exhaustion, failover time reduction, or credential security. The exam expects you to know not just that RDS Proxy exists, but the specific problems it solves and the architectural constraints: it lives in your VPC, it is not publicly accessible, it requires IAM authentication or Secrets Manager, and it supports a specific set of database engines.

## Core Concepts

### The Connection Problem — Why max_connections Matters

Every connection to a relational database consumes server-side resources: a dedicated OS thread or process (in some engines), memory for the connection state and client buffers, and bookkeeping overhead in the connection manager. MySQL and PostgreSQL both have a `max_connections` parameter that limits the total number of simultaneous connections. Typical values range from 100 (for small instance classes) to a few thousand (for large instances). Exceeding this limit produces a `FATAL: connection limit exceeded` (PostgreSQL) or `Too many connections` (MySQL) error — the database refuses new connections and the application fails.

Traditional three-tier web applications rarely exhaust connection limits because a fixed-size thread pool maintains a fixed number of database connections. The problem emerges with Lambda and containerized workloads: Lambda scales from 0 to 1,000 concurrent invocations automatically. Each invocation opens a connection on cold start and holds it for the duration of the invocation. If 500 Lambda functions invoke simultaneously, that is 500 simultaneous database connections — often more than the database's `max_connections` limit for the instance class chosen. Connection errors cascade, Lambda retries, and the problem worsens.

RDS Proxy solves this by multiplexing application connections onto a smaller pool. If 500 Lambda functions connect to the proxy simultaneously, the proxy may maintain only 20–50 persistent backend connections to the database, multiplexing the Lambda connections across them. The database sees 20–50 connections; the application sees 500 available connections. The proxy is the only entity that actually holds backend connection slots.

### How RDS Proxy Multiplexes Connections

The proxy operates in two modes: pinning and multiplexing. In multiplexing mode, the proxy shares a single backend connection across multiple application connections when those connections are not in the middle of a transaction. When an application connection sends a query, the proxy assigns it a backend connection for the duration of that query, then returns the backend connection to the pool when the query completes. Many application connections share a smaller number of backend connections over time.

In pinning mode, the proxy dedicates a backend connection to a specific application connection for the life of that application connection. Pinning occurs when the proxy detects session state that cannot safely be shared — for example, SET statements that modify session variables, prepared statements, or certain MySQL-specific behaviors. Excessive pinning reduces the efficiency of connection pooling. When designing applications for RDS Proxy, avoid session-level state changes (SET SESSION) and prefer query-level parameterization.

### Failover Improvement

During an RDS Multi-AZ failover — whether triggered by an AZ failure, host failure, or manual action — the standby is promoted to primary and the DNS record for the cluster endpoint is updated to point to the new primary. Applications that resolve the DNS record directly must wait for the DNS TTL (typically 5 seconds, but caches vary) and then reconnect. This total process takes 60–120 seconds for the application to resume normal operation.

RDS Proxy holds the DNS record resolution itself. During failover, the proxy detects that the primary is unavailable, temporarily queues or pauses incoming queries, waits for the new primary to accept connections, reconnects its backend pool, and resumes forwarding queries — all within 10–30 seconds. Application connections to the proxy endpoint do not break; they experience a brief pause but do not need to reconnect. This makes RDS Proxy a failover optimization tool even for non-serverless workloads.

### IAM Database Authentication

With IAM database authentication enabled, applications do not use a static username/password to authenticate to the proxy. Instead, the application calls the `generate-db-auth-token` API, which generates a pre-signed URL-like token signed with the application's IAM credentials. The token is valid for 15 minutes. The application passes this token as the database password when connecting to the proxy endpoint. The proxy validates the token against IAM and, if valid, allows the connection.

The actual backend credentials (the database master user or a dedicated proxy user) are stored in AWS Secrets Manager. The proxy retrieves them from Secrets Manager and uses them for backend connections to the database. The application never sees or handles the backend database password. This design achieves several security properties simultaneously: no static passwords in application code or environment variables, automatic credential rotation via Secrets Manager, short-lived tokens that cannot be reused after 15 minutes, and access control governed entirely by IAM policies.

### Supported Engines and Constraints

RDS Proxy supports the following engines: RDS MySQL, RDS PostgreSQL, RDS MariaDB, RDS SQL Server (limited), Aurora MySQL, and Aurora PostgreSQL. It does not support Oracle. The proxy endpoint is accessible only from within the VPC — it cannot be made publicly accessible. Each proxy is associated with a target group that specifies the database instance or cluster it fronts. A proxy can front a Multi-AZ RDS instance or an Aurora cluster; when the cluster fails over, the proxy updates its backend target automatically.

## Configuration Reference

### Create an RDS Proxy via CLI

```bash
# Step 1: Create an IAM role for the proxy to access Secrets Manager
# (Assume the role and trust policy are already created)
# The role must allow: secretsmanager:GetSecretValue on the DB credential secret

# Step 2: Store the DB credentials in Secrets Manager
aws secretsmanager create-secret \
  --name my-db-credentials \
  --description "RDS master credentials for proxy" \
  --secret-string '{"username":"admin","password":"MySecurePassword123!"}'
  # The proxy fetches this secret to authenticate backend connections to the DB
  # Secrets Manager rotation can update this secret; the proxy picks up the new value automatically

# Step 3: Create the proxy
aws rds create-db-proxy \
  --db-proxy-name my-rds-proxy \
  --engine-family MYSQL \
  --auth '[
    {
      "AuthScheme": "SECRETS",
      "SecretArn": "arn:aws:secretsmanager:us-east-1:123456789012:secret:my-db-credentials",
      "IAMAuth": "REQUIRED"
    }
  ]' \
  --role-arn arn:aws:iam::123456789012:role/rds-proxy-role \
  --vpc-subnet-ids subnet-0abc123 subnet-0def456 subnet-0ghi789 \
  --vpc-security-group-ids sg-0proxy123
  # --engine-family: MYSQL or POSTGRESQL (must match the target DB engine)
  # "IAMAuth": "REQUIRED" enforces IAM auth — no password-only connections allowed
  # "IAMAuth": "DISABLED" allows password auth in addition to IAM auth
  # vpc-subnet-ids: proxy is deployed into your VPC subnets — NOT publicly accessible

# Step 4: Register the target (associate proxy with a specific DB cluster or instance)
aws rds register-db-proxy-targets \
  --db-proxy-name my-rds-proxy \
  --db-cluster-identifiers my-aurora-cluster
  # For RDS Multi-AZ instance: --db-instance-identifiers my-rds-instance
  # The proxy automatically handles failover within the target cluster
```

### Retrieve the Proxy Endpoint

```bash
aws rds describe-db-proxies \
  --db-proxy-name my-rds-proxy \
  --query 'DBProxies[0].Endpoint'

# Output: "my-rds-proxy.proxy-abc123.us-east-1.rds.amazonaws.com"
# Application connection strings use this endpoint instead of the DB cluster endpoint
# The proxy endpoint is accessible only from within the VPC
```

### IAM Policy for Application to Connect via Proxy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "rds-db:connect",
      "Resource": "arn:aws:rds-db:us-east-1:123456789012:dbuser:prx-0abc123def456/admin"
    }
  ]
}
```
```
Resource format: arn:aws:rds-db:<region>:<account>:dbuser:<proxy-resource-id>/<db-username>
- prx-0abc123def456 is the proxy resource ID (from describe-db-proxies --query 'DBProxies[0].DBProxyArn')
- /admin refers to the database username the token is issued for
- Attach this policy to the IAM role used by the Lambda function or ECS task
```

### Generate a Database Auth Token (Application Code)

```python
import boto3
import pymysql

# Generate the auth token using the AWS SDK
rds_client = boto3.client('rds', region_name='us-east-1')

auth_token = rds_client.generate_db_auth_token(
    DBHostname='my-rds-proxy.proxy-abc123.us-east-1.rds.amazonaws.com',
    Port=3306,
    DBUsername='admin',
    Region='us-east-1'
)
# auth_token is a pre-signed string valid for 15 minutes
# It is passed as the password when connecting to the proxy

connection = pymysql.connect(
    host='my-rds-proxy.proxy-abc123.us-east-1.rds.amazonaws.com',
    user='admin',
    password=auth_token,  # IAM token used as password
    database='mydb',
    ssl={'ssl': True}     # TLS required for IAM auth
)
# The proxy validates the token against IAM
# If the IAM role has rds-db:connect permission, the connection is allowed
# The proxy then uses Secrets Manager credentials for its backend connection to the DB
```

### Lambda Function Using RDS Proxy

```python
import os
import boto3
import pymysql

# Environment variable set in Lambda configuration — not the DB endpoint directly
PROXY_ENDPOINT = os.environ['DB_PROXY_ENDPOINT']
DB_USER = os.environ['DB_USER']
DB_NAME = os.environ['DB_NAME']

def get_connection():
    rds_client = boto3.client('rds', region_name=os.environ['AWS_REGION'])
    token = rds_client.generate_db_auth_token(
        DBHostname=PROXY_ENDPOINT,
        Port=3306,
        DBUsername=DB_USER
    )
    return pymysql.connect(
        host=PROXY_ENDPOINT,
        user=DB_USER,
        password=token,
        database=DB_NAME,
        ssl={'ssl': True},
        connect_timeout=5
    )

def lambda_handler(event, context):
    conn = get_connection()
    # Lambda reuses the execution environment across warm invocations
    # The proxy holds the backend connection even when Lambda is idle
    # This prevents connection exhaustion: many Lambdas → proxy → few DB connections
    with conn.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM orders")
        result = cursor.fetchone()
    conn.close()
    return {'count': result[0]}
```

### Console Path

To create an RDS Proxy in the console:
```
RDS Console → Proxies (left navigation) → Create proxy
  → Engine family: MySQL / PostgreSQL
  → Database: select target RDS instance or Aurora cluster
  → Connectivity: select VPC, subnets, security group
  → Authentication: Secrets Manager secret → IAM role
  → IAM authentication: Required (recommended) or Allowed
→ Create proxy
```

## How to Decide

| Scenario | Use RDS Proxy? | Reason |
|---|---|---|
| Lambda functions connecting to RDS/Aurora | Yes | Connection exhaustion is virtually guaranteed at scale without proxy |
| ECS Fargate tasks with variable concurrency | Yes | Containers scale horizontally; same connection exhaustion risk as Lambda |
| Traditional EC2 app with fixed thread pool | Optional | Connection pooling already handled by app-layer pool (HikariCP, pgBouncer, etc.) |
| Need to eliminate static DB passwords | Yes | IAM auth + Secrets Manager rotation replaces passwords |
| Reduce Multi-AZ failover time | Yes | Proxy absorbs failover; app sees 10–30s pause vs 60–120s outage |
| Need Oracle database proxying | No | Oracle is not supported by RDS Proxy |
| Public-facing DB endpoint (external access) | No | Proxy is VPC-only, not publicly accessible |
| Serverless Aurora with Lambda and low latency | Yes | Proxy + Serverless v2 is the canonical serverless DB pattern |

**Proxy vs. application-layer pooling:** Tools like PgBouncer (PostgreSQL) and ProxySQL (MySQL) provide similar connection pooling at the application layer. RDS Proxy is the managed AWS option — no infrastructure to manage, integrates with IAM and Secrets Manager, and supports automatic failover routing. Choose RDS Proxy for new architectures; pgBouncer/ProxySQL may exist in migrations from on-premises environments.

## How This Connects

- RDS Proxy is the standard bridge between Lambda and any RDS or Aurora database — it appears in almost every serverless architecture diagram on the exam.
- Aurora Serverless v2 (lesson 04) and RDS Proxy are complementary: Serverless v2 scales compute up and down, and Proxy manages the connection layer so Lambda functions do not exhaust the scaled-down instance's connection limit.
- IAM database authentication via Proxy uses the same short-lived token mechanism as pre-signed S3 URLs and Cognito identity tokens — understanding the pattern of time-limited, signed credentials generalizes across AWS services.
- Secrets Manager integration for credential rotation is a recurring pattern: RDS Proxy, Parameter Store, Lambda environment secrets, and ECS task definitions all benefit from centralized secret management.
- RDS Proxy's failover improvement is additive on top of Aurora's own fast failover — Aurora fails over in under 30 seconds (lesson 04), and RDS Proxy reduces application-visible time further because applications do not need to reconnect.

## Exam Traps

**Trap 1: "RDS Proxy eliminates database connections entirely."**
RDS Proxy reduces the number of backend database connections — it does not eliminate them. The proxy itself maintains a pool of persistent connections to the database. If you configure the proxy for 50 backend connections, the database still has 50 open connections from the proxy. The benefit is that 500 Lambda functions share those 50 backend connections instead of each holding their own.

**Trap 2: "RDS Proxy is publicly accessible."**
RDS Proxy endpoints are VPC-only. There is no option to make a proxy endpoint publicly accessible. If an application outside the VPC needs to reach a proxied database, it must do so via VPC peering, AWS PrivateLink, or a VPN/Direct Connect connection into the VPC. An application connecting from the public internet cannot use RDS Proxy directly.

**Trap 3: "RDS Proxy supports all RDS database engines."**
Oracle is not supported. The supported engines are MySQL, PostgreSQL, MariaDB, SQL Server (limited features), Aurora MySQL, and Aurora PostgreSQL. If a question involves an Oracle workload and asks about connection pooling, RDS Proxy is not the answer.

**Trap 4: "RDS Proxy and connection pooling libraries like HikariCP are equivalent solutions."**
They overlap but are not equivalent. Application-layer connection pools (HikariCP, c3p0, pgBouncer) work at the application process level — each application server maintains its own pool. If you have 50 ECS tasks each with a 10-connection HikariCP pool, that is still 500 database connections. RDS Proxy centralizes pooling across all application instances, so the database sees only the proxy's pool regardless of how many application instances are running.

**Trap 5: "IAM auth tokens generated for RDS Proxy are long-lived."**
Auth tokens generated by `generate-db-auth-token` expire after 15 minutes. Applications must generate a new token for each connection (or refresh before establishing a new connection after the previous token expires). This is not a problem for Lambda, which typically holds a connection for seconds to minutes, but it means long-lived application connections must be prepared to re-authenticate when reconnecting.

## Summary

- RDS Proxy sits between application and database, maintaining a pool of persistent backend connections and multiplexing many application connections onto fewer backend connections — solving the Lambda/ECS connection exhaustion problem.
- The proxy reduces Multi-AZ failover application-visible time from 60–120 seconds to 10–30 seconds by absorbing the backend reconnection transparently without breaking application-side connections.
- IAM database authentication via RDS Proxy uses time-limited tokens (15 minutes) signed by IAM, with actual database credentials stored and rotated in Secrets Manager — eliminating static passwords from application code.
- RDS Proxy is VPC-only, not publicly accessible, and supports MySQL, PostgreSQL, MariaDB, SQL Server, Aurora MySQL, and Aurora PostgreSQL — not Oracle.
- For Lambda-to-RDS architectures, RDS Proxy is the standard solution and appears in nearly every AWS reference architecture for serverless database access.
- Excessive session pinning (SET SESSION statements, prepared statements) reduces proxy multiplexing efficiency — design applications to minimize session-level state for best proxy performance.

## Examples

A startup launches a REST API built entirely on AWS Lambda, with a backend RDS PostgreSQL database on a db.t3.medium instance (max_connections = 85). During a marketing launch, Lambda concurrency spikes to 400 simultaneous invocations. Each Lambda function opens a database connection on cold start — 400 connections attempt to open against an 85-connection limit. The database rejects connections with `FATAL: remaining connection slots are reserved`, and the API returns 500 errors to users. After adding RDS Proxy in front of the PostgreSQL instance, the proxy maintains 15 persistent backend connections to the database and multiplexes all 400 Lambda connections across them. The database sees 15 connections; users see no errors. This is the textbook Lambda-to-RDS connection exhaustion scenario that RDS Proxy was designed to solve.

A financial services company runs a three-tier application on ECS Fargate with an Aurora PostgreSQL backend. Multi-AZ failovers during maintenance windows cause 75-second outages visible to end users — long enough to fail health checks and trigger incident alerts. The team adds RDS Proxy between the ECS tasks and the Aurora cluster. During the next planned failover, the proxy detects the primary switch, pauses query routing for 18 seconds while it reconnects the backend pool to the new primary, and resumes — total application-visible pause is 18 seconds, within the acceptable threshold for their SLA. Additionally, the team migrates from hardcoded database passwords in ECS task definition environment variables to IAM database authentication via the proxy, eliminating the password rotation compliance finding that had been open for six months.

A DevOps team at a healthcare company undergoes a SOC 2 audit. An auditor flags that database passwords are stored as plaintext environment variables in Lambda function configuration, and that credential rotation requires manual code deployments. The team deploys RDS Proxy with `IAMAuth = REQUIRED` in front of their Aurora MySQL cluster. They store the database master credentials in Secrets Manager with a 30-day automatic rotation policy. Lambda functions are updated to generate short-lived auth tokens via `generate-db-auth-token` using their existing IAM execution roles. The audit finding is closed: no static passwords in application code, credentials rotate automatically, and IAM policies provide auditable, least-privilege access control to database connections. The proxy becomes the single enforcement point for database access policy across all Lambda functions in the account.

## Think About It

1. RDS Proxy reduces backend database connections by multiplexing application connections onto a smaller pool. If your Lambda function uses SET SESSION statements to configure the database session before running queries, what happens to the proxy's ability to multiplex — and how would you redesign the Lambda to avoid this?
2. The proxy reduces Multi-AZ failover time from 60–120 seconds to 10–30 seconds. Aurora on its own fails over in under 30 seconds. If you deploy RDS Proxy in front of an Aurora Multi-AZ cluster, what is the combined expected failover behavior — and is there a scenario where the proxy makes failover slower?
3. IAM database authentication tokens expire after 15 minutes. If a Lambda function is kept warm in a low-traffic period and its database connection persists for longer than 15 minutes, what happens when the token expires — and how should the Lambda handle reconnection?
4. RDS Proxy is not publicly accessible. If you have a microservice deployed on an EC2 instance in a public subnet that needs to reach a proxied Aurora database, what network configuration changes are required — and why does the proxy's VPC-only constraint exist from a security perspective?
5. A team migrates from a self-managed PgBouncer connection pooler on EC2 to RDS Proxy. What operational advantages do they gain — and what capabilities of PgBouncer might they lose or have to redesign around?

## Quick Check

**Q1.** A company runs 500 concurrent Lambda functions, each opening a direct connection to an RDS MySQL db.t3.medium instance. The database is rejecting new connections with "Too many connections." What is the correct architectural solution?

- A) Increase max_connections in the RDS parameter group to 1000
- B) Upgrade to a larger RDS instance class
- C) Place RDS Proxy between the Lambda functions and the database
- D) Switch to Aurora MySQL, which supports more connections

**Answer: C** — RDS Proxy solves the connection exhaustion problem by multiplexing hundreds of Lambda connections onto a small pool of persistent backend connections. Increasing max_connections or upgrading instance class shifts the threshold but does not solve the root cause — thousands of Lambda functions will eventually exceed any limit. Aurora does not inherently support more connections; it has the same per-instance connection limits.

**Q2.** Which combination of AWS services does RDS Proxy use to enable IAM database authentication with automatic credential rotation?

- A) AWS Certificate Manager for TLS + AWS Config for compliance tracking
- B) AWS Secrets Manager for credential storage + IAM for authentication tokens
- C) AWS KMS for encryption + AWS Systems Manager Parameter Store for credentials
- D) Amazon Cognito for identity + AWS CloudTrail for audit

**Answer: B** — RDS Proxy stores backend database credentials in AWS Secrets Manager, which handles automatic rotation. Applications authenticate using short-lived IAM-signed tokens generated by `generate-db-auth-token`. The proxy validates the IAM token and retrieves actual credentials from Secrets Manager to authenticate backend connections.

**Q3.** An application team reports that after adding RDS Proxy, they are not seeing the expected connection multiplexing benefit — the proxy is pinning most connections instead of sharing them. What is the most likely cause?

- A) The proxy is deployed in the wrong VPC subnet
- B) The application is using SET SESSION statements that modify session state, forcing the proxy to pin backend connections
- C) The RDS instance class is too small to support proxy connections
- D) IAM authentication is interfering with connection pooling

**Answer: B** — Connection pinning occurs when the proxy detects session-level state that cannot safely be shared across clients, such as SET SESSION variable assignments, certain prepared statement usage, or MySQL-specific session behaviors. Applications must minimize session-level state changes and use query-level configuration to allow the proxy to multiplex connections effectively.

## What's Next

Next up: the Module 11 Canvas Lab — designing a highly available RDS and Aurora architecture with RDS Proxy for a serverless workload.
