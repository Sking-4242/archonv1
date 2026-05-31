# Archon Discovery Tool — How-To Guide

The Discovery tool lets you scan your live AWS infrastructure and bring it directly into Archon Pro for documentation, validation, and Terraform generation. It works in two parts: the `archon-cli` command-line tool (which does the scanning) and the Discover tab inside Archon Pro (where you explore and use what was found).

> **Access:** `archon-cli discover` always runs locally with your AWS credentials — no Archon account required. The **Discover tab** in the Professional UI requires you to **sign in** when `ARCHON_OPEN_ACCESS` is enabled (default). Self-hosted use without an account still supports the CLI workflow end-to-end.

---

## Prerequisites

- **Python 3.10 or later** — check with `python --version`
- **AWS credentials configured** on your machine (see [Credential setup](#credential-setup))
- **Archon Pro running** — `docker compose up -d` from the `archonv1` directory

### Credential setup

`archon-cli` uses the standard boto3 credential chain. **Your credentials never leave your machine** — all AWS API calls happen locally. Configure credentials using any of the following methods:

**Option 1 — AWS CLI (recommended)**

```bash
aws configure
```

Enter your Access Key ID, Secret Access Key, and default region. Credentials are stored in `~/.aws/credentials`.

**Option 2 — Environment variables**

```powershell
# Windows PowerShell
$env:AWS_ACCESS_KEY_ID     = "AKIAIOSFODNN7EXAMPLE"
$env:AWS_SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
$env:AWS_DEFAULT_REGION    = "us-east-1"
```

```bash
# macOS / Linux
export AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
export AWS_DEFAULT_REGION="us-east-1"
```

**Option 3 — Named profile**

If you have multiple AWS accounts, use a named profile:

```bash
aws configure --profile my-staging-account
```

Then pass `--profile my-staging-account` to `archon-cli discover`.

---

## Install archon-cli

```bash
pip install -e ./archon-cli
```

Run this from the root of the `archonv1` repository. The `-e` flag installs it in editable mode so any updates to the source are picked up immediately.

Verify the install:

```bash
archon-cli --version
# archon-cli 0.1.0
```

> **Windows PATH note:** If `archon-cli` is not recognized after install, either restart your terminal or run it as `python -m archon_cli.main` instead.

---

## Run a discovery scan

### Basic scan

```bash
archon-cli discover --region us-east-1
```

This scans all 85 AWS canvas palette types in `us-east-1` and prints a summary table to the terminal. The scan typically takes 20–120 seconds depending on how many resources you have.

### Specify a region

```bash
archon-cli discover --region eu-west-1
archon-cli discover -r ap-southeast-2
```

Discovery is always scoped to a single region. Run the command multiple times with different regions to cover multi-region architectures.

### Use a named AWS profile

```bash
archon-cli discover --region us-east-1 --profile production
archon-cli discover -r us-east-1 -p staging
```

### Output formats

**Table (default)** — human-readable summary printed to the terminal:

```bash
archon-cli discover --region us-east-1
```

```
AWS Discovery — us-east-1
──────────────────────────────────────────────────────────────────────────────
  SERVICE          TYPE                   NAME                         STATE
──────────────────────────────────────────────────────────────────────────────
  EC2              Instance               web-server-prod              running
  EC2              Instance               bastion-host                 stopped
  RDS              DBInstance             prod-postgres                available
  Lambda           Function               api-handler                  active
  VPC              VPC                    main-vpc                     available
  VPC              Subnet                 public-subnet-1a             available
──────────────────────────────────────────────────────────────────────────────

  Total: 47 resources

  By type:
    subnet                   ████████████████ 16
    security_group           ████████ 8
    ec2                      ██████ 6
    ...
```

**JSON** — machine-readable, full resource details:

```bash
archon-cli discover --region us-east-1 --format json > discovery.json
```

**Archon format** — structured for import into Archon Pro:

```bash
archon-cli discover --region us-east-1 --format archon > report.json
```

This is the format you'll import into the Discover tab. The file contains canvas-ready node data for every resource found.

### Save output to a file

```bash
# Always use the -o / --output flag rather than shell redirection on Windows
archon-cli discover --region us-east-1 --format archon --output report.json
archon-cli discover -r us-east-1 --format archon -o report.json
```

---

## What gets discovered

The tool scans all 85 AWS canvas palette types across 10 categories:

| Category | Services |
|---|---|
| **Compute** | EC2, Lambda, ECS, EKS, Auto Scaling, ECR, App Runner, Batch, Elastic Beanstalk, Lightsail |
| **Network** | VPC, Subnet, IGW, NAT, Security Groups, Route Tables, EIPs, ALB/NLB, CloudFront, Route 53, Transit Gateway, VPN Gateway, Direct Connect, Global Accelerator, VPC Endpoints, WAF |
| **Storage** | S3, EBS, EFS, FSx, S3 Glacier (vaults + lifecycle), AWS Backup, Storage Gateway |
| **Database** | RDS, Aurora, ElastiCache, DynamoDB, Redshift, DocumentDB, Neptune, OpenSearch, Timestream |
| **Security** | KMS, Secrets Manager, IAM Roles, ACM, Cognito, GuardDuty, Inspector, Security Hub, Shield, Macie, Config, CloudTrail |
| **Integration** | SNS, SQS, EventBridge, Step Functions, Kinesis, Firehose, Amazon MQ, AppSync, API Gateway |
| **Analytics** | Glue, Athena, EMR, QuickSight, Lake Formation, MSK |
| **AI / ML** | SageMaker, Bedrock, Rekognition, Comprehend, Textract, Polly, Translate, Lex |
| **Monitoring** | CloudWatch Alarms, X-Ray, Systems Manager |
| **DevOps** | CodePipeline, CodeBuild, CodeDeploy, CodeCommit, CloudFormation |
| **Global / hybrid** | Route 53 hosted zones, Global Accelerator (us-west-2 API), IAM roles (global), Shield Advanced (us-east-1 API) |

Resources that require permissions you don't have will show in the **Errors** section of the output — this is normal and does not stop the scan.

Imported reports include **inferred relationship edges** (subnet→VPC, EC2→subnet, EC2→security group, transit gateway→VPC, Lambda→VPC, EBS→EC2, etc.) that Archon Pro adds to the canvas when you place resources.

### Required IAM permissions

For a full scan, the IAM user or role running the tool needs read-only permissions on the services above. A minimal policy looks like:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "rds:Describe*",
        "lambda:List*", "lambda:Get*",
        "s3:ListAllMyBuckets", "s3:GetBucketLocation",
        "ecs:List*", "ecs:Describe*",
        "eks:List*", "eks:Describe*",
        "elasticache:Describe*",
        "dynamodb:List*", "dynamodb:Describe*",
        "sns:List*",
        "sqs:List*", "sqs:GetQueueAttributes",
        "kms:List*", "kms:Describe*",
        "secretsmanager:List*",
        "iam:List*", "iam:Get*",
        "cloudwatch:Describe*",
        "autoscaling:Describe*",
        "cloudfront:List*",
        "elasticloadbalancing:Describe*",
        "efs:Describe*",
        "wafv2:ListWebACLs",
        "wafv2:GetWebACL",
        "cloudtrail:DescribeTrails",
        "cloudtrail:GetTrailStatus",
        "apigateway:GET",
        "apigatewayv2:GetApis",
        "events:ListEventBuses",
        "events:DescribeEventBus",
        "route53:ListHostedZones",
        "route53:GetHostedZone",
        "ec2:DescribeVpcEndpoints",
        "ec2:DescribeTransitGateways",
        "ec2:DescribeVpnGateways",
        "directconnect:DescribeConnections",
        "globalaccelerator:ListAccelerators",
        "ecr:DescribeRepositories",
        "apprunner:ListServices",
        "batch:DescribeJobQueues",
        "elasticbeanstalk:DescribeEnvironments",
        "lightsail:GetInstances",
        "fsx:DescribeFileSystems",
        "backup:ListBackupVaults",
        "storagegateway:ListGateways",
        "redshift:DescribeClusters",
        "es:ListDomainNames",
        "es:DescribeDomain",
        "timestream:ListDatabases",
        "acm:ListCertificates",
        "cognito-idp:ListUserPools",
        "guardduty:ListDetectors",
        "guardduty:GetDetector",
        "config:DescribeConfigRules",
        "states:ListStateMachines",
        "kinesis:ListStreams",
        "firehose:ListDeliveryStreams",
        "firehose:DescribeDeliveryStream",
        "mq:ListBrokers",
        "appsync:ListGraphqlApis",
        "glue:GetJobs",
        "glue:GetJob",
        "athena:ListWorkGroups",
        "elasticmapreduce:ListClusters",
        "kafka:ListClustersV2",
        "codepipeline:ListPipelines",
        "codebuild:ListProjects",
        "codedeploy:ListApplications",
        "codecommit:ListRepositories",
        "cloudformation:ListStacks",
        "ssm:DescribeInstanceInformation",
        "sagemaker:ListEndpoints",
        "glacier:ListVaults",
        "glacier:DescribeVault",
        "s3:GetLifecycleConfiguration",
        "inspector2:BatchGetAccountStatus",
        "securityhub:DescribeHub",
        "shield:DescribeSubscription",
        "macie2:GetMacieSession",
        "macie2:ListClassificationJobs",
        "quicksight:ListDashboards",
        "lakeformation:ListResources",
        "bedrock:ListCustomModels",
        "bedrock:ListProvisionedModelThroughputs",
        "rekognition:ListCollections",
        "comprehend:ListDocumentClassifiers",
        "comprehend:ListEntityRecognizers",
        "textract:ListAdapters",
        "polly:ListLexicons",
        "translate:ListTerminologies",
        "lex:ListBots",
        "xray:GetGroups"
      ],
      "Resource": "*"
    }
  ]
}
```

You can also attach the AWS-managed `ReadOnlyAccess` policy, which covers everything above and more.

---

## Import into Archon Pro

Once you have a report file, bring it into Archon Pro through the **Import CLI Report** button.

### Step-by-step

1. Open Archon Pro at [http://localhost:3000](http://localhost:3000)
2. Click **CLI Report** in the top navigation bar (between the Import and Save buttons)
3. In the dialog, click **Choose JSON file…**
4. Select your `report.json` file
5. Archon detects the report type automatically and opens the **Discover tab** in the right sidebar

The import takes less than a second. No data is sent anywhere — the file is parsed entirely in your browser.

---

## Using the Discover tab

After importing, the Discover tab shows all resources found in your AWS account.

### Header area

- **Resource count** — total resources found in the scan
- **Region badge** — the AWS region that was scanned
- **Added count** — how many resources you've placed on the canvas so far
- **+ All button** — adds every visible resource to the canvas in one click
- **Clear button** — removes the loaded report (does not affect the canvas)

### Search

Type any part of a resource name, AWS type, or service name in the search bar to filter the list. The filter applies instantly as you type.

Examples:
- `prod` — shows all resources with "prod" in the name
- `rds` — shows all RDS instances
- `running` — shows all running resources

### Service filter pills

Click a service name (EC2, RDS, Lambda, VPC, etc.) to show only that service's resources. Click **All** to show everything again. The pills appear based on what was found in the scan — if there are no Lambda functions, no Lambda pill appears.

### Resource cards

Each resource shows:
- **Icon** — the Archon canvas icon for that resource type
- **Name** — the resource's Name tag, or its AWS ID if no tag exists
- **AWS type** — the specific resource type (Instance, DBInstance, Function, etc.)
- **State badge** — color-coded current state:
  - 🟢 Green — running / active / available
  - 🔴 Red — stopped / terminated / failed
  - 🟡 Yellow — pending / starting / modifying
  - ⚪ Gray — other states

### Adding resources to the canvas

**Add one resource:** Click the **+** button on any resource card. The node appears on the canvas immediately. The button turns into a green ✓ once placed.

**Add an entire service group:** Click **+ All** next to the service group header (EC2, RDS, etc.) to place all resources in that group at once.

**Add everything:** Click **+ All** in the header to place all currently visible resources (respecting your search/filter).

Resources are placed to the right of your existing canvas content and do not replace anything already there. You can mix discovered resources with manually placed components.

### Collapsing groups

Click the ▼ arrow next to a service group name to collapse it and save space. Click ▶ to expand again.

### Discovery errors

If any AWS services returned errors during the scan (usually due to permissions or regional availability), they appear at the bottom of the Discover tab with a description. These resources were skipped and are not in the list above.

---

## After adding to canvas

Once resources are on the canvas, you can use all of Archon Pro's tools on them:

- **Validate** — run the 200-rule validation engine. Findings are highlighted on the nodes.
- **Compliance** — filter findings by CIS, SOC 2, PCI DSS, HIPAA, or NIST CSF 2.0 standard.
- **Estimate** — get monthly cost estimates for the discovered resources.
- **Generate** — produce Terraform HCL from the discovered architecture.
- **Connect** — draw edges between resources to document relationships.
- **Configure** — click any node to open the Component panel and view/edit its configuration.

---

## Tips for common workflows

### Document an existing architecture

```bash
archon-cli discover -r us-east-1 --format archon -o prod-us-east-1.json
```

Import the file, click **+ All** to place everything, then use **Generate** to produce Terraform HCL that reflects the current state of your account.

### Spot compliance gaps before an audit

```bash
archon-cli discover -r us-east-1 --format archon -o scan.json
```

Import, add all resources to canvas, then open the **Validate** tab. Use the compliance standard pills (CIS, SOC 2, PCI DSS, HIPAA, NIST CSF) to see which resources have gaps for each standard.

### Compare planned vs. live

1. Run `archon-cli discover` and import to the Discover tab
2. Open a separate browser tab and import a `terraform show -json plan.json` via the Import Plan button
3. Compare the two canvases side-by-side

### CI/CD pipeline integration

```bash
# In your CI pipeline — no UI needed
archon-cli validate plan.json --format json > validation.json
archon-cli cost    plan.json --format json > cost.json

# Exit 1 on critical findings (blocks the pipeline)
archon-cli validate plan.json
```

---

## Troubleshooting

**"boto3 is not installed"**
Run `pip install boto3` or reinstall the CLI: `pip install -e ./archon-cli`

**"No credentials found"**
Run `aws configure` or set the `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` environment variables.

**"archon-cli: command not found"** (Windows)
Either add the Python Scripts directory to your PATH, or use:
```bash
python -m archon_cli.main discover --region us-east-1
```

**Resources missing from the scan**
Check the **Errors** section in the table output or at the bottom of the Discover tab. Missing resources usually mean the IAM role lacks `Describe*` or `List*` permissions for that service.

**Scan times out or is very slow**
Accounts with thousands of resources in a single region can take several minutes. The CLI displays a progress message while scanning. Run with `--region` pointing to a region with fewer resources to confirm the tool is working.

**Discovered resources have wrong icons**
The canvas icon is determined by the `canvasType` field (e.g., `ec2`, `rds`, `lambda`). If a resource type is not yet mapped in Archon Pro's node registry it will render as a generic node. This is expected for less-common service types.
