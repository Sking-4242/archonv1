---
title: "AMIs and Launch Templates"
type: content
estimated_minutes: 12
cert_tags: ["SAA-C03", "SOA-C02", "DVA-C02"]
---

# AMIs and Launch Templates

## Overview

An Amazon Machine Image (AMI) is the blueprint for every EC2 instance — it defines the operating system, the pre-installed software, the initial disk contents, and the launch permissions. When you launch an EC2 instance, you are essentially saying "give me a virtual machine that starts from this blueprint." Everything the instance is at boot time comes from the AMI.

AMIs solve a fundamental problem in operating fleets of servers: consistency. If you manually configure each server, configuration drift is inevitable — servers accumulate differences over time through patches applied at different times, manual changes, and dependency version mismatches. The result is a fleet where "identical" servers behave differently, making debugging unpredictable and scaling unreliable. A custom AMI — often called a "Golden AMI" — bakes your entire desired configuration into a single, tested, versioned image. Every instance launched from it is byte-for-byte identical at boot time.

Launch Templates extend the AMI concept by capturing not just what runs on the instance but how it is launched: instance type, network placement, security groups, IAM role, storage configuration, and user data. A Launch Template is a versioned, reusable launch configuration that makes EC2 fleet management repeatable, auditable, and safe to update. For the SAA, SOA, and DVA exams, understanding AMIs and Launch Templates is essential — they are the foundation of Auto Scaling, immutable infrastructure patterns, and automated deployment pipelines.

---

## Core Concepts

### AMI Sources and Types

AMIs come from four sources, each with different trust and maintenance implications:

**AWS-provided AMIs** are maintained by AWS or the OS vendor and updated regularly with security patches. Amazon Linux 2023 (AL2023) is AWS's current flagship Linux distribution, optimized for EC2 with the AWS CLI, SSM Agent, and CloudWatch Agent pre-installed. Ubuntu, Red Hat, Windows Server, and SUSE are available as AWS-provided AMIs. These are the safest starting point for most workloads.

**AWS Marketplace AMIs** are commercial or open-source software images provided by third-party vendors. The per-hour price includes both the EC2 compute cost and any software licensing fees. Examples include Palo Alto Networks firewalls, Fortinet security appliances, Bitnami application stacks, and commercial databases. Marketplace AMIs are AWS-vetted at the listing level but not audited by AWS for security.

**Community AMIs** are public AMIs shared by other AWS users. They are not AWS-vetted and carry real security risk — a community AMI could contain malicious software, outdated packages, or intentional backdoors. Use community AMIs only from known, trusted publishers and always scan them before use.

**Your own custom AMIs** are images you create from running instances or automated build pipelines. These are the foundation of scalable, consistent EC2 fleets. Custom AMIs encode your organization's specific configuration choices — hardened OS, installed agents, application binaries, compliance settings — into a reusable, versioned artifact.

---

### AMI Internals: EBS Snapshots and Regions

Under the hood, an AMI is a registration record that points to one or more EBS snapshots. When you create an AMI from a running instance, AWS snapshots the root EBS volume (and any additional volumes you specify) and registers the resulting snapshot set as an AMI. The AMI record stores:

- The AMI ID (e.g., `ami-0abcdef1234567890`)
- The root device type (EBS-backed or instance store — nearly all modern AMIs are EBS-backed)
- The architecture (x86_64 or arm64)
- Launch permissions (private to your account, shared with specific accounts, or public)
- Block device mappings (which snapshots map to which device names)

**AMIs are Region-specific.** The AMI ID `ami-0abcdef1234567890` exists only in the Region where it was created. To use an AMI in a different Region, you must explicitly copy it there using the Copy AMI function. The copy creates new EBS snapshots in the target Region and registers a new AMI with a different ID. This is a frequently tested exam point: AMI IDs differ between Regions even for the same software image.

AMI copies can include encryption changes — you can copy an unencrypted AMI and produce an encrypted copy in the destination Region, which is a useful migration pattern when moving workloads to encrypted storage.

---

### Creating Custom AMIs (The Golden AMI Pattern)

The process for creating a custom AMI:

1. **Launch a base instance** from an AWS-provided or Marketplace AMI
2. **Configure the instance**: install OS updates, apply hardening (disable root SSH, enable auditd, configure firewall), install agents (CloudWatch Agent, SSM Agent, vulnerability scanner), deploy application binaries or runtimes
3. **Optionally stop the instance** before creating the AMI — this ensures filesystem consistency (a running instance can have in-flight I/O that produces an inconsistent snapshot, though AWS does offer no-reboot AMI creation with minor caveats)
4. **Create the AMI** from the instance via the console or CLI — this snapshots the EBS volumes and registers the AMI
5. **Test the AMI** by launching a test instance from it and running your test suite
6. **Distribute the AMI** to other Regions if needed using AMI copy
7. **Retire old versions** — old AMIs and their underlying snapshots consume storage and cost money; deregister and delete AMIs you no longer need

The key discipline: treat your AMI like code. Version it, test it, and have a documented process for updating it. An AMI that hasn't been patched in six months is a security liability.

---

### EC2 Image Builder: Automating AMI Pipelines

Manually creating and updating AMIs is error-prone and doesn't scale. **EC2 Image Builder** is a managed service that automates the entire AMI lifecycle:

- **Image recipes** define what to install and configure (AWS-provided build components, custom scripts, or third-party components)
- **Infrastructure configurations** define the build environment (instance type, subnet, security group for the build process)
- **Distribution settings** define which Regions to distribute the finished AMI to and what permissions to set
- **Pipelines** tie recipes, infrastructure, and distribution together and can be scheduled (e.g., weekly) or triggered manually

Image Builder handles the build instance lifecycle automatically: it launches a temporary EC2 instance, applies the recipe, runs validation tests, creates the AMI, distributes it, and terminates the build instance. The process is fully logged in CloudWatch and auditable in Image Builder's console.

The most important Image Builder use case is **automated patching**: configure a pipeline to run weekly, start from the latest AWS-provided Amazon Linux 2023 AMI (which changes as AWS releases patches), apply your organization's customizations, and produce a freshly patched custom AMI. Your Auto Scaling Groups then use the new AMI for future instance launches via an Instance Refresh.

---

### Launch Templates

A Launch Template is a versioned document that captures the complete configuration for launching EC2 instances:

- **AMI ID** — which image to use
- **Instance type** — hardware profile
- **Key pair** — for SSH access
- **Security groups** — firewall rules
- **Subnet** — network placement (or left to the ASG to determine)
- **IAM instance profile** — role to attach
- **User data** — a script to run at first boot
- **Storage** — EBS volume sizes, types, and encryption settings
- **Advanced options** — Nitro Enclave, Placement Group, Tenancy, Hibernation

Launch Templates support **versioning**. Each update creates a new version; the template retains all previous versions. You designate one version as the "default." This makes rollback safe: if a new Launch Template version causes problems, roll back to the previous version and launch new instances from it.

Launch Templates are required (not optional) for:
- **Auto Scaling Groups** — ASGs require Launch Templates (Launch Configurations are deprecated)
- **Spot Instance diversification** — a mixed-instances policy in an ASG or EC2 Fleet specifies multiple instance types in a single template
- **EC2 Fleet** — launching and managing pools of On-Demand and Spot capacity
- **EC2 Capacity Reservations with templates**

**Launch Configurations** were the predecessor to Launch Templates and did not support versioning, multiple instance types, or mixed purchase options. They are being deprecated — if you see them in the console, migrate to Launch Templates.

---

## Configuration Reference

### Creating an AMI from the Console

1. Navigate to **EC2 → Instances**, select the instance you want to image
2. Click **Actions → Image and templates → Create image**
3. Configure:
   - **Image name**: use a naming convention that includes the date and version (e.g., `myapp-base-2024-01-15-v3`)
   - **Image description**: describe what this AMI contains and what changed from the previous version
   - **No reboot**: unchecked by default — the instance is rebooted before snapshotting for filesystem consistency. Check this only if you understand the consistency implications.
   - **Instance volumes**: review and configure additional EBS volumes to include
4. Click **Create image** — the AMI enters "pending" state while the EBS snapshot completes
5. Monitor progress in **EC2 → AMIs** — the AMI moves from `pending` to `available` when ready

---

### Creating an AMI with the AWS CLI

```bash
# Create an AMI from a running instance
aws ec2 create-image \
  --instance-id i-0abc1234567890def \       # Instance to snapshot
  --name "myapp-base-2024-01-15-v3" \        # AMI name (must be unique in the Region)
  --description "Hardened AL2023, CloudWatch agent, myapp v2.4.1" \
  --no-reboot \                              # Remove this flag for filesystem-consistent snapshot
  --tag-specifications \
    'ResourceType=image,Tags=[{Key=Version,Value=v3},{Key=App,Value=myapp}]' \
  --region us-east-1

# Wait for the AMI to become available
aws ec2 wait image-available \
  --image-ids ami-0newamiidfromabove \
  --region us-east-1

# Copy the AMI to another Region
aws ec2 copy-image \
  --source-image-id ami-0newamiidfromabove \  # Source AMI ID
  --source-region us-east-1 \                # Source Region
  --name "myapp-base-2024-01-15-v3" \
  --encrypted \                              # Optionally encrypt the copy
  --region eu-west-1                         # Destination Region

# List your AMIs
aws ec2 describe-images \
  --owners self \                            # Only your own AMIs
  --query 'Images[*].{Name:Name,ID:ImageId,State:State,Created:CreationDate}' \
  --output table \
  --region us-east-1

# Deregister (delete) an old AMI
aws ec2 deregister-image \
  --image-id ami-0oldamiid \
  --region us-east-1

# Delete the underlying snapshot after deregistering the AMI
aws ec2 delete-snapshot \
  --snapshot-id snap-0underlyingsnapshotid \
  --region us-east-1
```

---

### Creating a Launch Template

```bash
# Create a Launch Template
aws ec2 create-launch-template \
  --launch-template-name "myapp-web-server" \
  --version-description "Initial version — myapp v2.4.1 on Graviton" \
  --launch-template-data '{
    "ImageId": "ami-0abc123graviton",         
    "InstanceType": "m7g.large",             
    "KeyName": "my-key-pair",                
    "SecurityGroupIds": ["sg-0abc12345"],     
    "IamInstanceProfile": {
      "Name": "MyAppInstanceRole"             
    },
    "BlockDeviceMappings": [{
      "DeviceName": "/dev/xvda",
      "Ebs": {
        "VolumeSize": 30,                     
        "VolumeType": "gp3",                  
        "Encrypted": true,                    
        "DeleteOnTermination": true           
      }
    }],
    "UserData": "IyEvYmluL2Jhc2gKZWNobyAiSGVsbG8gV29ybGQi",
    "TagSpecifications": [{
      "ResourceType": "instance",
      "Tags": [{"Key": "App", "Value": "myapp"}, {"Key": "Env", "Value": "prod"}]
    }]
  }'

# Create a new version of an existing Launch Template
aws ec2 create-launch-template-version \
  --launch-template-name "myapp-web-server" \
  --version-description "v2 — upgraded to myapp v2.5.0" \
  --source-version 1 \                       # Copy settings from version 1, override below
  --launch-template-data '{"ImageId": "ami-0neweramiv25"}'

# Set the default version
aws ec2 modify-launch-template \
  --launch-template-name "myapp-web-server" \
  --default-version 2
```

> **User data note:** The `UserData` field must be base64-encoded. To encode a script: `base64 -w 0 my-script.sh`. User data runs as root on first boot and is ideal for injecting environment-specific configuration into a general-purpose AMI.

---

## How to Decide

**When to use AWS-provided AMIs vs. custom AMIs:**

| Scenario | Choice | Why |
|---|---|---|
| Learning / experimenting | AWS-provided AMI | No maintenance burden, always current |
| One-off instance, no fleet | AWS-provided + user data | Not worth building an AMI for a single instance |
| Fleet of identical servers | Custom Golden AMI | Consistent boot, no startup script failures |
| Compliance requirements (CIS, HIPAA) | Custom AMI via Image Builder | Bake compliance config in; audit trail in Image Builder |
| Commercial software with license | Marketplace AMI | License cost included, vendor-maintained |
| Faster boot times critical | Custom AMI (fat image) | Pre-installed software avoids install time at launch |
| Application deploys frequently | Base AMI + user data or containers | Too slow to rebuild AMI per deploy |

**Golden AMI vs. base AMI + user data:**
- **Golden AMI** (fat image): Everything pre-installed. Boot time is fast, no network dependencies at launch, consistent. Update requires rebuilding the AMI. Good for stable, infrequently changing software stacks.
- **Base AMI + user data** (thin image): Minimal OS only. User data script installs and configures at boot. Flexible and easy to update (change the script), but boot is slower and dependent on network/package repos. Good for frequently changing application code.
- **Hybrid**: OS hardening and agents in the AMI; application-specific configuration injected via user data. Best of both approaches.

---

## How This Connects

- **Auto Scaling Groups** — ASGs use Launch Templates to define what instances to launch. When you update an AMI (e.g., after patching), you create a new Launch Template version referencing the new AMI ID and run an **Instance Refresh** to replace running instances with the new AMI in a rolling or canary fashion.
- **EC2 Image Builder** — The managed service for automating AMI build, test, and distribution pipelines. Connects to Systems Manager Parameter Store to publish new AMI IDs automatically, so Launch Templates can reference the current AMI by parameter name rather than hardcoded AMI ID.
- **AWS Systems Manager Parameter Store** — A common pattern: store the current approved AMI ID in an SSM Parameter. Launch Templates and CloudFormation reference the SSM Parameter rather than a hardcoded AMI ID. When Image Builder produces a new AMI, it updates the SSM Parameter — all future launches automatically use the new AMI with no template changes.
- **AWS Marketplace** — Source for commercial software AMIs. Some Marketplace AMIs require accepting terms before launch and may have subscription costs on top of EC2 compute costs — worth checking before building architectures around a specific Marketplace AMI.
- **EBS Snapshots** — AMIs are backed by EBS snapshots. Deregistering an AMI does not delete the underlying snapshots — you must delete them separately to avoid ongoing storage charges.

---

## Exam Traps

- **AMIs are Region-specific — the ID changes per Region.** An AMI created in us-east-1 does not automatically exist in eu-west-1. You must copy it, and the copy will have a different AMI ID. Hardcoding AMI IDs in multi-Region deployments is a common mistake.
- **Deregistering an AMI does not delete the underlying snapshot.** After deregistering, you must separately delete the EBS snapshot to stop paying for it. A deregistered AMI can no longer launch instances, but the snapshot remains and continues to accrue charges.
- **Launch Configurations are deprecated — use Launch Templates.** Old exam materials and real-world accounts may reference Launch Configurations. The correct current answer is always Launch Templates for new configurations. Launch Templates support versioning; Launch Configurations do not.
- **User data runs only on the first boot.** User data scripts execute once when an instance is first launched. If you update the user data in a Launch Template and replace an instance, the new instance runs the updated user data — but the original instance will not re-run it.
- **Community AMIs are not AWS-vetted.** The exam may present a scenario where a team saves time by using a community AMI. The security-correct answer is to use an AWS-provided AMI or build a custom AMI from a known-good source — never use unvetted community AMIs in production.

---

## Summary

- AMIs are Region-specific blueprints for EC2 instances containing the OS, pre-installed software, and initial EBS snapshot; the AMI ID differs between Regions even for the same image.
- AMI sources: AWS-provided (safest, maintained by AWS), Marketplace (commercial software with included licensing), Community (unvetted, use with caution), and your own custom AMIs (Golden AMI pattern for fleet consistency).
- Creating a custom (Golden) AMI bakes your full configuration into a tested, versioned image, eliminating startup script failures and configuration drift across a fleet.
- EC2 Image Builder automates AMI build, test, and distribution pipelines on a schedule, enabling fully automated AMI patching without manual intervention.
- Launch Templates capture the complete EC2 launch configuration with versioning, enabling safe rollbacks and are required for Auto Scaling Groups, Spot diversification, and EC2 Fleet.
- Deregistering an AMI does not delete its underlying EBS snapshots — you must delete snapshots separately to stop incurring storage costs.

---

## Examples

A small SaaS company deploys its web application by SSHing into a fresh Amazon Linux instance, running a bash script to install dependencies and clone the repo, then manually configuring the app. It works — until an Auto Scaling event launches a new instance during a package repository outage. The startup script fails silently, the instance passes its health check (the health check only tests port 80, not application functionality), and the broken node enters the load balancer pool. Users start seeing errors. The fix: switch to a Golden AMI workflow where the fully configured app is baked into a custom AMI. ASG launches now produce immediately healthy instances with no network dependencies, boot time drops from 4 minutes to 45 seconds, and startup failures become impossible.

A security-conscious healthcare company needs HIPAA-compliant base images on all EC2 instances — OS hardening per CIS Level 1, CloudWatch Agent, SSM Agent, and a vulnerability scanner pre-installed, with root SSH disabled. They set up an EC2 Image Builder pipeline that runs every Monday at 2 AM. It starts from the latest Amazon Linux 2023 AMI (automatically tracking AWS's patches), applies their CIS hardening recipe, runs a CIS benchmark validation test, and on success distributes the new AMI to all three of their AWS Regions. The resulting AMI ID is automatically published to an SSM Parameter (`/mycompany/amis/base/latest`). All their Launch Templates reference this parameter rather than a hardcoded AMI ID — so the next Auto Scaling launch automatically uses the freshly patched image, with no manual changes to any template.

A platform engineering team at a large retailer manages 14 microservices, each with slightly different runtime dependencies but sharing a common OS hardening baseline. Rather than maintaining 14 separate AMI pipelines, they create one hardened base AMI and layer service-specific configuration via Launch Template user data scripts. Each microservice has its own Launch Template that references the shared base AMI via SSM Parameter Store and injects a cloud-init script installing only the service-specific packages and configuration. When the base AMI is updated (e.g., a critical kernel patch), all 14 Launch Templates automatically pick it up on their next launch — the SSM parameter updates and all future instances use the new image. This hybrid approach captures the consistency of a Golden AMI while preserving the flexibility of user data for service-specific differences.

---

## Think About It

1. AMIs are Region-specific, meaning a multi-Region deployment requires copying AMIs to each target Region. What does this imply for an automated deployment pipeline that needs to deploy a new application version simultaneously to three Regions? What failure modes exist if the copy hasn't completed before the deployment starts?
2. What are the trade-offs between baking everything into a fat Golden AMI versus using a minimal base AMI with a configuration-heavy user data script? Under what specific failure conditions would each approach fail, and which failure mode is worse in production?
3. EC2 Image Builder can automate AMI patching, but automated patching can also introduce regressions — a new OS package version might break your application. How would you design a patching pipeline that balances security (apply patches quickly) against stability (don't break production)?
4. Launch Templates support versioning, but many teams don't use the rollback capability because they don't have a documented process for deciding when to roll back. What specific observable conditions would you use as triggers for rolling back to a previous Launch Template version?
5. If a community AMI is free and already has the software you need pre-installed, why might a security team reject it even for a non-production environment? What controls would you put in place if leadership overruled the security team and required its use?

---

## Quick Check

**Q1.** A team creates a custom AMI in us-east-1 and needs to use it to launch instances in eu-west-1. What must they do?
- A) Change the AMI's Region attribute in the console
- B) Copy the AMI from us-east-1 to eu-west-1 — it will have a different AMI ID in the destination
- C) Launch a new instance from scratch and reconfigure it in eu-west-1
- D) Use a Launch Template to make the AMI Region-agnostic

**Answer: B** — AMIs are Region-specific; using one in a different Region requires an explicit copy operation, which creates new EBS snapshots in the destination Region and registers a new AMI with a different ID.

**Q2.** An operations team deregisters an old AMI they no longer need but notices they are still being charged for storage. What did they forget to do?
- A) Terminate all instances that were launched from the AMI
- B) Delete the EBS snapshots that the AMI was backed by
- C) Remove the AMI from all Launch Templates
- D) Revoke the AMI's launch permissions

**Answer: B** — Deregistering an AMI removes it from the AMI list and prevents new instances from being launched from it, but the underlying EBS snapshots remain and continue to incur storage charges until explicitly deleted.

**Q3.** Which of the following is a key advantage of Launch Templates over the deprecated Launch Configurations?
- A) Launch Templates support more AWS Regions
- B) Launch Templates are less expensive to store
- C) Launch Templates support versioning and multiple instance types for Spot diversification
- D) Launch Templates automatically patch the AMI when updates are available

**Answer: C** — Launch Templates support versioning (enabling safe rollbacks), multiple instance types in a single configuration (enabling Spot diversification), and are required for modern Auto Scaling Group features; Launch Configurations supported none of these.

---

## What's Next

Next: EC2 Pricing Models — when to use On-Demand, Reserved Instances, Spot, Savings Plans, and Dedicated options, and how to choose the right model for different workload characteristics.
