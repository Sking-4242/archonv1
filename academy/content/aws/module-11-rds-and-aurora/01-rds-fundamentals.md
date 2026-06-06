---
title: "RDS Fundamentals: Managed Relational Databases"
type: content
estimated_minutes: 18
cert_tags: ["SAA-C03", "CLF-C02", "SAP-C02"]
---

# RDS Fundamentals: Managed Relational Databases

## Overview

Amazon RDS (Relational Database Service) is AWS's managed relational database platform. It lets you run MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, or IBM Db2 without owning or operating the infrastructure that supports those engines. When you launch an RDS instance, AWS provisions EC2 compute, attaches EBS storage, configures networking, installs the database engine, and handles all ongoing operational work — OS patching, engine patching, automated backups, storage monitoring, and replication configuration for high availability. You connect using standard database clients and protocols exactly as you would with a self-managed server, but you never touch the underlying Linux or Windows host.

The reason RDS exists is that database operations are expensive, high-risk, and largely undifferentiated. Patching Oracle on a Tuesday night at 2 AM, testing that a PostgreSQL minor version upgrade doesn't break your application, extending a disk before it fills up at 3 AM — none of this creates business value. AWS industrialized these operations so that engineering teams can focus entirely on schema design, query optimization, and application development. The managed model also raises the baseline: AWS's patching cadence, backup reliability, and failover testing are better than what most organizations can achieve independently.

For the AWS Solutions Architect exam, RDS fundamentals establish the vocabulary for everything that follows. You need to understand what AWS manages versus what you manage, the supported engines and their use cases, how instance classes affect performance, how storage types differ in IOPS and cost, and how parameter groups and option groups let you configure the engine without server access. Every advanced RDS topic — Multi-AZ, Read Replicas, Aurora — builds on these primitives.

## Core Concepts

### The Managed Boundary: What AWS Owns vs. What You Own

RDS operates under the AWS shared responsibility model, but the boundary sits higher up the stack than EC2. AWS manages: the physical host, the hypervisor, the operating system, OS patching, the database engine software, engine minor-version patching (when auto minor version upgrade is enabled), automated backup execution and storage, Multi-AZ replication infrastructure, and failover mechanics. You manage: the database schema and data, user accounts and privileges, database configuration (via parameter groups), optional feature enablement (via option groups), network placement (subnet groups, security groups), encryption settings at creation time, and the maintenance window schedule.

The practical consequence is that you cannot SSH into an RDS instance. There is no key pair, no EC2 console access, no shell. This boundary is intentional — it enforces the managed contract. When you need engine-level configuration, you use parameter groups. When you need to enable specific engine features, you use option groups. The boundary also defines your exam strategy: if a question asks about OS-level configuration, root access, or custom kernel modules, RDS is the wrong answer and EC2 running a database is the right one.

### Supported Engines

RDS supports six database engines. **MySQL** and **PostgreSQL** are the most widely adopted on AWS — they are open-source, have strong ecosystem support, and are the source compatibility targets for Aurora. **MariaDB** is a community fork of MySQL with a compatible wire protocol and similar use cases. **Oracle Database** supports enterprise features like advanced queuing, Data Guard, and Oracle-specific extensions; it uses either License Included (AWS charges the license cost) or Bring Your Own License (BYOL) billing. **Microsoft SQL Server** is required for Windows-native workloads and .NET applications with T-SQL dependencies; it also offers License Included or BYOL. **IBM Db2** was added for customers with existing Db2 workloads who want to move to managed infrastructure without re-platforming.

Engine choice matters because it determines which parameter group parameters are available, which option group features apply, which AWS services integrate natively (e.g., Aurora is only MySQL and PostgreSQL-compatible), and what the licensing cost model is. For most greenfield projects, PostgreSQL is the default recommendation — it supports JSON, full-text search, geospatial extensions, and a wide range of indexing types, and it is the closest to Aurora PostgreSQL-compatible.

### DB Instance Classes

RDS instance classes map directly to EC2 instance families. There are three categories you need to understand for both architecture and exam purposes.

**Burstable (T family — db.t4g, db.t3)**: These instances earn CPU credits during idle periods and spend them during bursts. They are cost-effective for workloads with low average CPU utilization — dev/test databases, small internal tools, staging environments. The risk is CPU credit exhaustion: if a burstable instance runs at high CPU for an extended period, it will throttle to the baseline CPU performance of the instance size. Never use T-family for production workloads with sustained CPU requirements.

**General Purpose (M family — db.m7g, db.m6g, db.m6i)**: Balanced CPU and memory. These are the right default for most production relational workloads — OLTP applications, e-commerce, SaaS backends. The `g` suffix denotes AWS Graviton (ARM-based) processors, which typically offer 10–20% better price-to-performance than Intel equivalents (`i` suffix) for the same workload.

**Memory Optimized (R family — db.r7g, db.r6g, db.r6i)**: High memory-to-CPU ratio. Use these when your working set must fit in RAM — large caches, high connection counts, analytics queries that sort large result sets in memory. For PostgreSQL, `shared_buffers` and `work_mem` both benefit from more RAM. For MySQL, `innodb_buffer_pool_size` should be sized to your working set, which requires memory-optimized instances on large databases.

### Storage Types

RDS uses EBS volumes for storage. Three types exist:

**gp3 (General Purpose SSD, generation 3)**: The default and recommended type for most workloads. Key differentiator: IOPS and throughput are configurable independently of storage size. You can have a 100 GB volume with 6,000 IOPS without paying for more storage. Baseline is 3,000 IOPS and 125 MB/s throughput; you can provision up to 16,000 IOPS and 1,000 MB/s. Cost-efficient for most production databases.

**io1 (Provisioned IOPS SSD)**: For workloads requiring sustained, consistent high IOPS — typically above 16,000 IOPS or I/O-critical transactional databases. Supports up to 64,000 IOPS. More expensive than gp3 per GB and per IOPS. Use only when you have measured an IOPS requirement that exceeds gp3 maximums.

**Magnetic (standard)**: Legacy spinning-disk storage. Lower cost per GB but unpredictable IOPS, no autoscaling support, and significantly worse latency. AWS recommends against it for all new databases. It appears on the exam as a wrong answer trap.

**Storage Auto Scaling**: An optional feature that automatically increases your storage volume when free space drops below a configurable threshold (default: 10% free space, or 5 GB, whichever is larger). This prevents the emergency of a full disk killing your database at 3 AM. Important constraint: storage can only expand — you cannot shrink an RDS volume. Plan your initial size accordingly and enable autoscaling.

### Parameter Groups

Parameter groups are the mechanism for configuring the database engine. They contain named key-value pairs that map directly to engine configuration directives — for example, `max_connections`, `innodb_buffer_pool_size`, `shared_buffers`, `log_min_duration_statement`, `character_set_server`. When you create an RDS instance, it is associated with a default parameter group containing AWS-recommended values. You create custom parameter groups when you need to deviate from defaults.

Parameters are classified as **static** (require a DB instance reboot to take effect) or **dynamic** (apply immediately to running connections or at next connection). Understanding this distinction matters operationally: changing a static parameter during business hours means you need to plan a reboot window. A parameter group can be associated with multiple instances, making it a reusable configuration artifact — useful for ensuring that all instances in an environment share the same engine configuration.

### Option Groups

Option groups are engine-specific bundles of additional features that go beyond standard configuration. They exist because some database features require installing additional binaries or enabling privileged capabilities that AWS controls. Examples: Oracle Transparent Data Encryption (TDE), Oracle statspack, SQL Server Audit, MySQL memcached integration. Option groups are associated with DB instances at creation or modification time. Not all engines use option groups — PostgreSQL and MariaDB have few or no supported options. For the exam, Oracle and SQL Server are the engines where option groups matter most.

### DB Subnet Groups

A DB Subnet Group is an RDS-specific construct that specifies which VPC subnets RDS can place instances in. When you create a subnet group, you select at least two subnets in different Availability Zones. This is what allows Multi-AZ deployments to place the primary and standby in different AZs — RDS chooses from the AZs covered by the subnet group. Best practice: create a dedicated set of private subnets for databases (no route to the internet) and build your subnet group from those. The subnet group also determines which VPC the RDS instance lives in, since RDS instances are not deployed to a default VPC automatically.

## Configuration Reference

### AWS CLI: Creating an RDS Instance

```bash
aws rds create-db-instance \
  --db-instance-identifier prod-postgres-01 \      # Unique name for the instance in your account/region
  --db-instance-class db.m7g.large \               # General Purpose Graviton, 2 vCPU / 8 GB RAM
  --engine postgres \                              # Engine: mysql | postgres | mariadb | oracle-ee | sqlserver-ee | db2-ae
  --engine-version 16.2 \                          # Specific engine version; check available versions per engine
  --master-username dbadmin \                      # Initial superuser account
  --master-user-password "MyS3cureP@ssword!" \     # Min 8 chars; use Secrets Manager in practice
  --allocated-storage 100 \                        # Initial storage size in GiB
  --storage-type gp3 \                             # gp3 | io1 | standard (avoid standard)
  --iops 3000 \                                    # For gp3: 3000–16000; for io1: 1000–64000
  --storage-encrypted \                            # Enable encryption at rest with KMS
  --kms-key-id alias/aws/rds \                     # Default RDS KMS key; use customer-managed for compliance
  --db-subnet-group-name prod-db-subnet-group \    # DB Subnet Group covering at least 2 AZs
  --vpc-security-group-ids sg-0abc123def456789 \   # Security group controlling inbound DB port access
  --db-parameter-group-name prod-postgres16-params \  # Custom parameter group; omit to use default
  --backup-retention-period 7 \                    # Automated backup retention: 1–35 days (0 disables)
  --preferred-backup-window "03:00-04:00" \        # UTC window for daily backup snapshot
  --preferred-maintenance-window "sun:05:00-sun:06:00" \  # Window for patching/maintenance
  --multi-az \                                     # Enable synchronous standby in a second AZ
  --auto-minor-version-upgrade \                   # Auto-apply minor engine version patches
  --enable-performance-insights \                  # Enable Performance Insights for query-level monitoring
  --performance-insights-retention-period 7 \      # Free tier: 7 days; paid: up to 731 days
  --deletion-protection \                          # Prevent accidental deletion via console or CLI
  --no-publicly-accessible                         # Do NOT attach a public IP — keep in private subnet
```

### Creating a Custom Parameter Group

```bash
# Step 1: Create the parameter group
aws rds create-db-parameter-group \
  --db-parameter-group-name prod-postgres16-params \
  --db-parameter-group-family postgres16 \          # Family must match engine version family
  --description "Production PostgreSQL 16 parameters"

# Step 2: Modify specific parameters
aws rds modify-db-parameter-group \
  --db-parameter-group-name prod-postgres16-params \
  --parameters \
    "ParameterName=max_connections,ParameterValue=500,ApplyMethod=pending-reboot" \
    "ParameterName=shared_buffers,ParameterValue={DBInstanceClassMemory/4},ApplyMethod=pending-reboot" \
    "ParameterName=log_min_duration_statement,ParameterValue=1000,ApplyMethod=immediate" \
    "ParameterName=work_mem,ParameterValue=65536,ApplyMethod=immediate"
# ApplyMethod=pending-reboot for static params; immediate for dynamic params
# {DBInstanceClassMemory/4} is an RDS formula — evaluates to 25% of instance RAM at runtime
```

### Console Walkthrough: Standard Create

Navigate to: **RDS → Databases → Create database**

1. **Creation method**: Choose "Standard create" (not Easy Create) — this exposes all configuration options.
2. **Engine options**: Select engine (e.g., PostgreSQL), then select the minor version from the dropdown. AWS marks one version as the default; for production, choose the latest supported minor version of your target major version.
3. **Templates**: "Production" pre-selects Multi-AZ and gp3 storage with reasonable defaults. "Dev/Test" disables Multi-AZ and uses smaller instance sizes. "Free tier" restricts to t3.micro and single-AZ.
4. **Settings**: Set DB instance identifier, master username, and master password. For production, consider enabling "Manage master credentials in AWS Secrets Manager" — RDS will create and rotate the secret automatically.
5. **Instance configuration**: Select instance class. Toggle "Include previous generation classes" to see older families.
6. **Storage**: Set allocated storage. Enable "Storage autoscaling" and set a maximum threshold (e.g., 1000 GiB). Choose gp3; configure IOPS separately if you need above 3,000.
7. **Connectivity**: Select VPC, DB Subnet Group, and whether to allow public access (choose No for production). Select or create a security group. Choose the availability zone for the primary (or leave as "No preference").
8. **Database authentication**: Password authentication, IAM database authentication (for IAM-to-DB auth without hardcoded passwords), or Kerberos.
9. **Additional configuration**: Set initial database name, parameter group, option group, backup retention and window, maintenance window, enable deletion protection.
10. Review the **Estimated monthly costs** panel at the bottom before creating.

## How to Decide

Use the following criteria to make RDS configuration decisions:

1. **Engine**: Use PostgreSQL for new projects — broadest feature set, Aurora compatibility, strong extensions. Use MySQL if migrating existing MySQL workloads. Use Oracle/SQL Server only for existing commercial engine dependencies.
2. **Instance class — Burstable vs. General Purpose**: Use T family only for dev/test or workloads with measured low average CPU. If you cannot guarantee CPU usage stays below the baseline for a T instance, use M family. In production, default to M family.
3. **Instance class — General vs. Memory Optimized**: Measure or estimate your working set size and connection count. If your database working set fits comfortably in M-family RAM, use M. If your PostgreSQL `shared_buffers` requirement or MySQL `innodb_buffer_pool_size` requirement exceeds ~50% of M-family RAM at your target size, move to R family.
4. **Storage — gp3 vs. io1**: Start with gp3. Calculate required IOPS from your workload benchmarks. If you require sustained IOPS above 16,000 or need consistent sub-millisecond latency, upgrade to io1. Never use magnetic.
5. **Multi-AZ**: Enable for all production databases. Cost is approximately double the instance cost (you are paying for a standby). The RPO is zero (synchronous) and the RTO is 60–120 seconds for automatic failover. For dev/test, disable to save cost.
6. **Parameter Group**: Always create a custom parameter group before launch — even if you don't change any parameters immediately. This avoids needing to reboot to apply future changes (default parameter groups cannot be modified).
7. **Storage Auto Scaling**: Enable for all instances. Set max storage to a realistic upper bound. The cost of autoscaling is lower than the cost of a production outage due to a full disk.

## How This Connects

- **Amazon VPC**: RDS instances live inside a VPC in subnets defined by a DB Subnet Group. Security groups control which resources can reach the DB port. VPC flow logs can capture RDS connection traffic for security auditing.
- **AWS KMS**: Encryption at rest uses KMS keys. Encrypted snapshots and Read Replicas inherit the encryption of the source. For cross-region operations, you need KMS keys in each region.
- **AWS Secrets Manager**: Stores and rotates RDS master credentials automatically. Applications retrieve credentials at runtime rather than hardcoding them — RDS natively integrates with Secrets Manager for managed credential rotation.
- **Amazon CloudWatch**: RDS publishes dozens of metrics — CPUUtilization, FreeStorageSpace, DatabaseConnections, ReadIOPS, WriteIOPS, FreeableMemory. CloudWatch alarms on FreeStorageSpace and CPUUtilization are the minimum monitoring setup for production.
- **AWS IAM**: IAM policies control who can create, modify, and delete RDS instances. IAM database authentication allows database logins via IAM token rather than a DB password — useful for applications running in EC2 or Lambda with IAM roles.

## Exam Traps

**Trap 1: Option Groups and Parameter Groups are interchangeable.**
They are not. Parameter groups tune the engine's runtime configuration (connection limits, buffer sizes, log settings). Option groups enable specific engine features that require additional software or privileged capabilities (Oracle TDE, SQL Server Audit). An instance has one of each. Confusing them leads to wrong answers on questions about how to tune MySQL buffer sizes (parameter group) or enable Oracle encryption (option group).

**Trap 2: You can SSH into RDS to perform OS-level configuration.**
You cannot. RDS is a managed service — you have no OS access. If a question requires OS-level access, custom kernel parameters, or installing software on the database host, the answer involves EC2 running a self-managed database, not RDS. This boundary is a core concept of the managed model.

**Trap 3: Magnetic storage is a viable cost-saving option.**
It is not. Magnetic (standard) storage is legacy, has unpredictable IOPS, cannot use Storage Auto Scaling, and AWS actively recommends against it. On the exam, magnetic is almost always a distractor. gp3 is the correct default.

**Trap 4: T-family burstable instances are fine for production databases.**
They can be, but only for genuinely low-CPU workloads. The failure mode is CPU credit exhaustion — the instance silently drops to its baseline CPU level (e.g., 20% of a vCPU for a t4g.small) and stays there until credits recover. For any database serving production traffic with variable or sustained query load, use M or R family.

**Trap 5: A DB Subnet Group and a VPC subnet are the same thing.**
A VPC subnet is a network construct. A DB Subnet Group is an RDS-level object that selects which VPC subnets RDS is allowed to use. A subnet group must span at least two AZs to support Multi-AZ. When troubleshooting "RDS can't find a subnet in my VPC," the issue is usually the subnet group, not the VPC subnets themselves.

## Summary

- RDS is a managed relational database service where AWS handles OS patching, engine patching, automated backups, and failover — you manage schema, data, and configuration via parameter/option groups.
- Supported engines are MySQL, PostgreSQL, MariaDB, Oracle, SQL Server, and IBM Db2; PostgreSQL is the default choice for new greenfield projects.
- Instance classes divide into Burstable (T family — dev/test), General Purpose (M family — production default), and Memory Optimized (R family — large working sets); Graviton (`g` suffix) instances offer better price-to-performance.
- Storage defaults to gp3, which allows independent IOPS and throughput configuration; io1 is for sustained high-IOPS requirements above gp3 limits; magnetic storage should never be used.
- Parameter groups configure engine runtime behavior (buffer sizes, connection limits); option groups enable engine-specific features (Oracle TDE, SQL Server Audit); a DB Subnet Group defines which AZs RDS can place instances in.
- Storage Auto Scaling should always be enabled to prevent disk-full incidents; you can only expand RDS storage, not shrink it.

## Examples

A small startup migrates from a self-hosted MySQL 8.0 instance on an EC2 t3.medium to RDS MySQL on a db.t4g.medium with gp3 storage (100 GB, 3,000 IOPS), Storage Auto Scaling enabled up to 500 GB, automated backups set to 7-day retention, and deletion protection on. The migration takes a weekend: they use mysqldump to export, restore to RDS, update their application connection string, and point DNS at the RDS endpoint. Immediately, the team stops writing runbooks for nightly backup verification, OS patch testing, and disk monitoring — those now belong to AWS. This is the foundational RDS value proposition for small teams: trading infrastructure operations for database development focus.

A mid-size SaaS company discovers their PostgreSQL RDS instance on db.m6g.xlarge is running at 85% memory utilization. Their working set has grown beyond what the general-purpose instance can cache in `shared_buffers`. They create a custom parameter group with `shared_buffers = {DBInstanceClassMemory/4}` and `work_mem = 65536`, then resize the instance to db.r7g.xlarge (Memory Optimized, Graviton3, 32 GB RAM). After the resize and parameter group association (requiring a reboot for static params), query latency drops 40% because more of the hot data fits in the buffer cache and sort operations no longer spill to disk. This illustrates why instance class selection and parameter tuning are linked — more RAM is only useful if the engine is configured to use it.

A financial services firm running Oracle Database on-premises must migrate to AWS while retaining Oracle Advanced Security (TDE) for compliance. They choose RDS Oracle with their existing BYOL license, create a custom Option Group with the `TDE` option enabled, and associate it at launch. Their existing Oracle application clients connect to the RDS endpoint unchanged — the wire protocol, SQL syntax, and stored procedure behavior are identical. For compliance auditing, they also add the Oracle Audit option to the option group and configure parameter group settings to write audit logs to an S3 bucket via an RDS audit log feature. This demonstrates that RDS is not just for open-source engines — it supports complex commercial database configurations through the option group and parameter group system.

## Think About It

1. You cannot SSH into an RDS instance. How does this constraint change the way you would diagnose a performance problem compared to a self-managed database on EC2?
2. Storage Auto Scaling only expands storage — it never shrinks it. If you start a database at 100 GB but autoscaling grows it to 2 TB during a data import you later delete, what options do you have to reclaim cost?
3. A parameter group change to `max_connections` is classified as static — it requires a reboot. In a production environment running 24/7, how would you plan and execute this change with minimum impact?
4. The M family and R family both support Graviton (`g` suffix) and Intel (`i` suffix). Given that Graviton offers better price-to-performance, under what circumstances would you choose an Intel instance instead?
5. If you are building a multi-tenant SaaS application with 500 customers and need to isolate their data, does one RDS instance with a schema per tenant, or one RDS instance per tenant, make more sense — and what RDS configuration choices change depending on which approach you take?

## Quick Check

**Q1.** A solutions architect needs to ensure that an RDS MySQL instance can scale storage without manual intervention when free space drops below 10%. Which feature should they enable at launch?

- A) Provisioned IOPS (io1)
- B) Storage Auto Scaling with a maximum storage threshold
- C) Multi-AZ deployment
- D) Read Replica in the same AZ

**Answer: B** — Storage Auto Scaling monitors free storage and automatically increases the allocated storage up to the configured maximum. This is the correct feature to prevent disk-full incidents without manual intervention. Multi-AZ (C) provides high availability, not storage scaling. Read Replicas (D) scale reads, not storage.

**Q2.** A developer needs to set `innodb_buffer_pool_size` on an RDS MySQL 8.0 instance and enable Oracle TDE encryption on a separate RDS Oracle instance. Which RDS features do they use, respectively?

- A) Option Group for MySQL; Parameter Group for Oracle
- B) Parameter Group for MySQL; Option Group for Oracle
- C) Parameter Group for both
- D) Option Group for both

**Answer: B** — `innodb_buffer_pool_size` is an engine configuration parameter managed by Parameter Groups. Oracle TDE is a feature bundle requiring additional software, managed by Option Groups. The two features use different mechanisms — this is a commonly tested distinction.

**Q3.** A team must run a workload that requires custom Linux kernel parameters and direct file system access to the database host. Which approach is correct?

- A) Use RDS with a custom Option Group to enable OS access
- B) Use RDS with a custom Parameter Group to expose OS-level settings
- C) Use EC2 with a self-managed database engine
- D) Use RDS and connect via AWS Systems Manager Session Manager

**Answer: C** — RDS provides no OS access under any configuration. Custom kernel parameters and direct filesystem access require a self-managed database on EC2. Options A, B, and D are incorrect because no RDS mechanism grants OS-level access.

## What's Next

Next up: RDS Multi-AZ and Read Replicas — how synchronous standby replication delivers high availability, and how asynchronous read replicas scale read throughput horizontally.
