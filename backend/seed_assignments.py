"""
seed_assignments.py — Seed the Archon Academy architecture lab library (20 labs).

Run inside the backend container:
    docker compose exec backend python seed_assignments.py

Idempotent: matches existing assignments by title and skips them.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.db import Base, SessionLocal, engine
from app.models.academy import Assignment
from app.models.user import AcademyProfile, User
from app.services.auth_service import hash_password

# ---------------------------------------------------------------------------
# Assignment definitions
# Each dict has: title, brief, rubric (list of criterion dicts)
# ---------------------------------------------------------------------------

ASSIGNMENTS = [
    # ── 1 ── Static Website Hosting (Beginner, 50 pts) ────────────────────
    {
        "title": "Assignment 1 — Static Website Hosting",
        "brief": (
            "Design an architecture to serve a static website globally with low latency. "
            "The site should be distributed via a CDN, served over HTTPS using an SSL/TLS "
            "certificate, and use a managed DNS service for custom domain routing. "
            "You do not need any application servers or databases — the content is pre-built "
            "HTML, CSS, and JavaScript. Focus on performance, security, and cost efficiency. "
            "\n\nKey concepts: S3 static hosting, CloudFront distributions, ACM certificates, "
            "Route 53 hosted zones."
        ),
        "rubric": [
            {
                "label": "S3 bucket for static file storage",
                "type": "component_present",
                "params": {"component_type": "s3"},
                "points": 10,
            },
            {
                "label": "CloudFront distribution for global CDN",
                "type": "component_present",
                "params": {"component_type": "cloudfront"},
                "points": 15,
            },
            {
                "label": "Route 53 for DNS and custom domain",
                "type": "component_present",
                "params": {"component_type": "route 53"},
                "points": 10,
            },
            {
                "label": "ACM certificate for HTTPS",
                "type": "component_present",
                "params": {"component_type": "acm"},
                "points": 10,
            },
            {
                "label": "No EC2 instances (static content only)",
                "type": "component_absent",
                "params": {"component_type": "ec2"},
                "points": 5,
            },
        ],
    },

    # ── 2 ── Single Server Web Application (Beginner, 60 pts) ─────────────
    {
        "title": "Assignment 2 — Single Server Web Application",
        "brief": (
            "Deploy a simple web application on a single EC2 instance within a properly "
            "configured Virtual Private Cloud. The server must be isolated in a VPC with its "
            "own subnet, connected to the internet through an Internet Gateway, and protected "
            "by a Security Group that restricts inbound traffic. Draw an edge from the "
            "Internet Gateway to the EC2 instance to show the traffic path. "
            "\n\nKey concepts: VPC design, subnets, Internet Gateways, EC2 instance types, "
            "Security Groups as stateful firewalls."
        ),
        "rubric": [
            {
                "label": "VPC for network isolation",
                "type": "component_present",
                "params": {"component_type": "vpc"},
                "points": 10,
            },
            {
                "label": "Subnet within the VPC",
                "type": "component_present",
                "params": {"component_type": "subnet"},
                "points": 10,
            },
            {
                "label": "Internet Gateway for public access",
                "type": "component_present",
                "params": {"component_type": "internet gateway"},
                "points": 15,
            },
            {
                "label": "EC2 instance for the web server",
                "type": "component_present",
                "params": {"component_type": "ec2"},
                "points": 10,
            },
            {
                "label": "Security Group to control inbound traffic",
                "type": "component_present",
                "params": {"component_type": "security group"},
                "points": 10,
            },
            {
                "label": "Internet Gateway connects to EC2 (traffic path shown)",
                "type": "edge_exists",
                "params": {"source_type": "internet gateway", "target_type": "ec2"},
                "points": 5,
            },
        ],
    },

    # ── 3 ── Serverless REST API (Beginner, 60 pts) ────────────────────────
    {
        "title": "Assignment 3 — Serverless REST API",
        "brief": (
            "Design a fully serverless REST API backend. Client requests arrive through "
            "API Gateway, which invokes Lambda functions to process business logic. "
            "Application state is persisted in DynamoDB — a managed NoSQL database that "
            "scales automatically and requires no server administration. "
            "There must be no EC2 instances in this architecture. "
            "Draw edges to show the request flow: API Gateway → Lambda → DynamoDB. "
            "\n\nKey concepts: serverless compute, event-driven invocation, NoSQL data "
            "modeling, pay-per-request pricing."
        ),
        "rubric": [
            {
                "label": "API Gateway as the public entry point",
                "type": "component_present",
                "params": {"component_type": "api gateway"},
                "points": 15,
            },
            {
                "label": "Lambda for business logic",
                "type": "component_present",
                "params": {"component_type": "lambda"},
                "points": 15,
            },
            {
                "label": "DynamoDB for data persistence",
                "type": "component_present",
                "params": {"component_type": "dynamodb"},
                "points": 15,
            },
            {
                "label": "API Gateway invokes Lambda (request flow shown)",
                "type": "edge_exists",
                "params": {"source_type": "api gateway", "target_type": "lambda"},
                "points": 10,
            },
            {
                "label": "Lambda reads and writes DynamoDB",
                "type": "edge_exists",
                "params": {"source_type": "lambda", "target_type": "dynamodb"},
                "points": 5,
            },
        ],
    },

    # ── 4 ── Highly Available Web Tier (Intermediate, 80 pts) ─────────────
    {
        "title": "Assignment 4 — Highly Available Web Tier",
        "brief": (
            "Design a web tier that handles traffic spikes automatically and survives "
            "an Availability Zone failure without downtime. An Application Load Balancer "
            "distributes requests across EC2 instances that scale out under load and scale "
            "in when traffic drops. Instances must span at least two subnets in separate AZs. "
            "CloudWatch provides the metrics that drive Auto Scaling decisions. "
            "Draw an edge from the ALB to EC2 to show load distribution. "
            "\n\nKey concepts: horizontal scaling, load balancing algorithms, AZ redundancy, "
            "CloudWatch metrics and alarms, Auto Scaling policies."
        ),
        "rubric": [
            {
                "label": "Application Load Balancer for traffic distribution",
                "type": "component_present",
                "params": {"component_type": "alb"},
                "points": 15,
            },
            {
                "label": "Auto Scaling Group for dynamic capacity",
                "type": "component_present",
                "params": {"component_type": "auto scaling group"},
                "points": 15,
            },
            {
                "label": "At least 2 subnets for multi-AZ redundancy",
                "type": "min_count",
                "params": {"component_type": "subnet", "count": 2},
                "points": 15,
            },
            {
                "label": "EC2 instances behind the load balancer",
                "type": "component_present",
                "params": {"component_type": "ec2"},
                "points": 10,
            },
            {
                "label": "ALB routes traffic to EC2",
                "type": "edge_exists",
                "params": {"source_type": "alb", "target_type": "ec2"},
                "points": 15,
            },
            {
                "label": "CloudWatch for monitoring and scaling triggers",
                "type": "component_present",
                "params": {"component_type": "cloudwatch"},
                "points": 10,
            },
        ],
    },

    # ── 5 ── Classic Three-Tier Architecture (Intermediate, 100 pts) ───────
    {
        "title": "Assignment 5 — Classic Three-Tier Architecture",
        "brief": (
            "Design the industry-standard three-tier web application pattern. "
            "The presentation tier uses an ALB to route requests to the application tier "
            "(EC2 instances in a private subnet). The application tier reads and writes to "
            "the data tier — a managed relational database in its own isolated subnet. "
            "Security Groups control which tiers can communicate and on which ports. "
            "No tier should be directly accessible from the internet except through the ALB. "
            "\n\nDraw edges: ALB → EC2, and EC2 → RDS. "
            "\n\nKey concepts: tier isolation, network segmentation, Security Group rules, "
            "managed RDS multi-AZ deployments, defense-in-depth."
        ),
        "rubric": [
            {
                "label": "VPC containing all three tiers",
                "type": "component_present",
                "params": {"component_type": "vpc"},
                "points": 10,
            },
            {
                "label": "At least 2 subnets to isolate tiers",
                "type": "min_count",
                "params": {"component_type": "subnet", "count": 2},
                "points": 10,
            },
            {
                "label": "ALB as the presentation tier",
                "type": "component_present",
                "params": {"component_type": "alb"},
                "points": 15,
            },
            {
                "label": "EC2 as the application tier",
                "type": "component_present",
                "params": {"component_type": "ec2"},
                "points": 15,
            },
            {
                "label": "RDS as the data tier",
                "type": "component_present",
                "params": {"component_type": "rds"},
                "points": 15,
            },
            {
                "label": "Security Group to enforce tier isolation",
                "type": "component_present",
                "params": {"component_type": "security group"},
                "points": 10,
            },
            {
                "label": "ALB routes requests to the application tier",
                "type": "edge_exists",
                "params": {"source_type": "alb", "target_type": "ec2"},
                "points": 15,
            },
            {
                "label": "Application tier reads and writes to the database",
                "type": "edge_exists",
                "params": {"source_type": "ec2", "target_type": "rds"},
                "points": 10,
            },
        ],
    },

    # ── 6 ── Event-Driven Notification System (Intermediate, 80 pts) ───────
    {
        "title": "Assignment 6 — Event-Driven Notification System",
        "brief": (
            "Design an event-driven architecture where application events are published to "
            "multiple consumers using a fan-out pattern. An SNS topic receives events and "
            "broadcasts them to SQS queues, which decouple producers from consumers and "
            "buffer messages during traffic spikes. Lambda functions poll the queues and "
            "process each message asynchronously. This architecture must be fully serverless "
            "— no EC2 instances. "
            "\n\nDraw edges: SNS → SQS, and SQS → Lambda. "
            "\n\nKey concepts: pub/sub vs. point-to-point messaging, fan-out pattern, "
            "dead-letter queues, at-least-once delivery, Lambda event source mappings."
        ),
        "rubric": [
            {
                "label": "SNS topic for event publishing",
                "type": "component_present",
                "params": {"component_type": "sns"},
                "points": 15,
            },
            {
                "label": "SQS queue for reliable message buffering",
                "type": "component_present",
                "params": {"component_type": "sqs"},
                "points": 15,
            },
            {
                "label": "Lambda for asynchronous message processing",
                "type": "component_present",
                "params": {"component_type": "lambda"},
                "points": 15,
            },
            {
                "label": "SNS fans out messages to SQS",
                "type": "edge_exists",
                "params": {"source_type": "sns", "target_type": "sqs"},
                "points": 15,
            },
            {
                "label": "SQS triggers Lambda for processing",
                "type": "edge_exists",
                "params": {"source_type": "sqs", "target_type": "lambda"},
                "points": 10,
            },
            {
                "label": "No EC2 (architecture is fully serverless)",
                "type": "component_absent",
                "params": {"component_type": "ec2"},
                "points": 10,
            },
        ],
    },

    # ── 7 ── Serverless Data Ingestion Pipeline (Intermediate, 90 pts) ─────
    {
        "title": "Assignment 7 — Serverless Data Ingestion Pipeline",
        "brief": (
            "Design a real-time data ingestion pipeline that captures streaming records, "
            "processes them without managing any servers, and stores results in two places: "
            "DynamoDB for low-latency queries and S3 as a durable data lake for long-term "
            "analysis. Kinesis Data Streams handles the ingestion buffer. Lambda consumes "
            "records from the stream and writes to both destinations. "
            "The entire pipeline must be serverless — no EC2 instances. "
            "\n\nDraw an edge from Kinesis to Lambda to show the stream trigger. "
            "\n\nKey concepts: stream processing vs. batch processing, Lambda Kinesis triggers, "
            "fan-out writes, S3 data lake partitioning, DynamoDB hot partitions."
        ),
        "rubric": [
            {
                "label": "Kinesis for real-time data stream ingestion",
                "type": "component_present",
                "params": {"component_type": "kinesis"},
                "points": 20,
            },
            {
                "label": "Lambda for stream record processing",
                "type": "component_present",
                "params": {"component_type": "lambda"},
                "points": 15,
            },
            {
                "label": "DynamoDB for fast-access query results",
                "type": "component_present",
                "params": {"component_type": "dynamodb"},
                "points": 15,
            },
            {
                "label": "S3 for the raw data lake",
                "type": "component_present",
                "params": {"component_type": "s3"},
                "points": 10,
            },
            {
                "label": "Kinesis triggers Lambda (stream processing shown)",
                "type": "edge_exists",
                "params": {"source_type": "kinesis", "target_type": "lambda"},
                "points": 20,
            },
            {
                "label": "No EC2 (pipeline is fully serverless)",
                "type": "component_absent",
                "params": {"component_type": "ec2"},
                "points": 10,
            },
        ],
    },

    # ── 8 ── Containerized Microservices Platform (Advanced, 110 pts) ──────
    {
        "title": "Assignment 8 — Containerized Microservices Platform",
        "brief": (
            "Redesign a monolithic application as containerized microservices running on "
            "ECS Fargate — a serverless container runtime that eliminates EC2 management. "
            "Services run in a private VPC subnet and are reached externally through an "
            "Application Load Balancer. Persistent service data lives in RDS. "
            "ElastiCache provides a shared caching tier to reduce database read load and "
            "improve response times. CloudWatch collects container metrics and logs. "
            "\n\nDraw edges: ALB → ECS Fargate, and ECS Fargate → RDS. "
            "\n\nKey concepts: container orchestration, service discovery, sidecar patterns, "
            "managed vs. self-managed containers, write-through caching strategies."
        ),
        "rubric": [
            {
                "label": "VPC for network isolation",
                "type": "component_present",
                "params": {"component_type": "vpc"},
                "points": 10,
            },
            {
                "label": "ECS Fargate for containerized microservices",
                "type": "component_present",
                "params": {"component_type": "ecs / fargate"},
                "points": 20,
            },
            {
                "label": "ALB for service routing and load balancing",
                "type": "component_present",
                "params": {"component_type": "alb"},
                "points": 15,
            },
            {
                "label": "RDS for persistent relational data",
                "type": "component_present",
                "params": {"component_type": "rds"},
                "points": 15,
            },
            {
                "label": "ElastiCache for shared caching layer",
                "type": "component_present",
                "params": {"component_type": "elasticache"},
                "points": 15,
            },
            {
                "label": "CloudWatch for container observability",
                "type": "component_present",
                "params": {"component_type": "cloudwatch"},
                "points": 10,
            },
            {
                "label": "ALB routes traffic to ECS Fargate services",
                "type": "edge_exists",
                "params": {"source_type": "alb", "target_type": "ecs / fargate"},
                "points": 15,
            },
            {
                "label": "ECS Fargate connects to RDS for data persistence",
                "type": "edge_exists",
                "params": {"source_type": "ecs / fargate", "target_type": "rds"},
                "points": 10,
            },
        ],
    },

    # ── 9 ── Secure Production-Grade Application (Advanced, 120 pts) ───────
    {
        "title": "Assignment 9 — Secure Production-Grade Application",
        "brief": (
            "Design a production-ready application following the security principle of "
            "least privilege and defense-in-depth. Application servers must run in private "
            "subnets with outbound internet access only through a NAT Gateway — they should "
            "never be directly internet-reachable. CloudFront with AWS WAF provides the "
            "public-facing layer and filters malicious traffic. Secrets Manager stores all "
            "credentials so nothing is hardcoded in application code. IAM Roles grant "
            "services only the permissions they need. CloudWatch monitors the system. "
            "\n\nKey concepts: public vs. private subnets, NAT Gateway vs. Internet Gateway, "
            "WAF managed rule groups, Secrets Manager rotation, IAM Role vs. IAM User, "
            "VPC flow logs, CloudTrail auditing."
        ),
        "rubric": [
            {
                "label": "VPC with public/private subnet architecture",
                "type": "component_present",
                "params": {"component_type": "vpc"},
                "points": 10,
            },
            {
                "label": "At least 2 subnets (public for ALB, private for app)",
                "type": "min_count",
                "params": {"component_type": "subnet", "count": 2},
                "points": 10,
            },
            {
                "label": "NAT Gateway for private subnet outbound access",
                "type": "component_present",
                "params": {"component_type": "nat gateway"},
                "points": 20,
            },
            {
                "label": "Application Load Balancer in the public subnet",
                "type": "component_present",
                "params": {"component_type": "alb"},
                "points": 10,
            },
            {
                "label": "CloudFront for global content delivery",
                "type": "component_present",
                "params": {"component_type": "cloudfront"},
                "points": 10,
            },
            {
                "label": "WAF to filter malicious traffic",
                "type": "component_present",
                "params": {"component_type": "aws waf"},
                "points": 15,
            },
            {
                "label": "Secrets Manager for credential storage",
                "type": "component_present",
                "params": {"component_type": "secrets manager"},
                "points": 15,
            },
            {
                "label": "IAM Role for least-privilege service access",
                "type": "component_present",
                "params": {"component_type": "iam role"},
                "points": 10,
            },
            {
                "label": "CloudWatch for monitoring and alerting",
                "type": "component_present",
                "params": {"component_type": "cloudwatch"},
                "points": 10,
            },
            {
                "label": "Managed database (RDS or Aurora)",
                "type": "any_of",
                "params": {"component_types": ["rds", "amazon aurora"]},
                "points": 10,
            },
        ],
    },

    # ── 10 ── Cloud-Native AI-Powered Platform (Expert, 150 pts) ──────────
    {
        "title": "Assignment 10 — Cloud-Native AI-Powered Platform",
        "brief": (
            "Design a comprehensive cloud-native platform that integrates event-driven "
            "microservices, generative AI inference, and enterprise-grade security. "
            "Containerized microservices on ECS Fargate handle the core business logic. "
            "Amazon Bedrock provides managed AI model inference without infrastructure "
            "to manage. EventBridge routes application events to Lambda processors for "
            "asynchronous workflows. CloudFront delivers content globally, WAF hardens "
            "the perimeter, and Secrets Manager ensures credentials are never hardcoded. "
            "CloudWatch gives full observability across every layer. "
            "\n\nYour architecture must have at least 8 components, an ALB routing to "
            "ECS Fargate, and EventBridge triggering Lambda. "
            "\n\nKey concepts: generative AI integration patterns, event-driven microservices, "
            "container orchestration, zero-trust networking, observability pillars "
            "(metrics, logs, traces), FinOps cost allocation tags."
        ),
        "rubric": [
            {
                "label": "At least 8 components (architectural complexity)",
                "type": "min_node_count",
                "params": {"count": 8},
                "points": 10,
            },
            {
                "label": "VPC as the network foundation",
                "type": "component_present",
                "params": {"component_type": "vpc"},
                "points": 5,
            },
            {
                "label": "ECS Fargate for containerized microservices",
                "type": "component_present",
                "params": {"component_type": "ecs / fargate"},
                "points": 15,
            },
            {
                "label": "Amazon Bedrock for AI/ML inference",
                "type": "component_present",
                "params": {"component_type": "amazon bedrock"},
                "points": 15,
            },
            {
                "label": "EventBridge for event routing and orchestration",
                "type": "component_present",
                "params": {"component_type": "eventbridge"},
                "points": 10,
            },
            {
                "label": "Lambda for event-driven processing",
                "type": "component_present",
                "params": {"component_type": "lambda"},
                "points": 10,
            },
            {
                "label": "CloudFront for global content delivery",
                "type": "component_present",
                "params": {"component_type": "cloudfront"},
                "points": 10,
            },
            {
                "label": "CloudWatch for full-stack observability",
                "type": "component_present",
                "params": {"component_type": "cloudwatch"},
                "points": 10,
            },
            {
                "label": "WAF for perimeter security hardening",
                "type": "component_present",
                "params": {"component_type": "aws waf"},
                "points": 15,
            },
            {
                "label": "Secrets Manager for secure credential management",
                "type": "component_present",
                "params": {"component_type": "secrets manager"},
                "points": 10,
            },
            {
                "label": "ALB routes traffic to ECS Fargate",
                "type": "edge_exists",
                "params": {"source_type": "alb", "target_type": "ecs / fargate"},
                "points": 20,
            },
            {
                "label": "EventBridge triggers Lambda for async workflows",
                "type": "edge_exists",
                "params": {"source_type": "eventbridge", "target_type": "lambda"},
                "points": 20,
            },
        ],
    },

    # ── 11 ── Encrypted Serverless REST API (Intermediate, 100 pts) ─────────
    {
        "title": "Assignment 11 — Encrypted Serverless REST API",
        "brief": (
            "Design a production-minded serverless API where every layer follows security "
            "basics. API Gateway receives HTTPS requests and invokes Lambda for business "
            "logic. DynamoDB stores application data with encryption at rest enabled. "
            "Lambda must use a dedicated IAM role — never embed long-lived credentials. "
            "\n\nDraw edges: API Gateway → Lambda → DynamoDB. "
            "\n\nKey concepts: execution roles, least-privilege IAM, DynamoDB SSE, "
            "API Gateway authorization patterns."
        ),
        "rubric": [
            {"label": "API Gateway entry point", "type": "component_present", "params": {"component_type": "api gateway"}, "points": 15},
            {"label": "Lambda compute layer", "type": "component_present", "params": {"component_type": "lambda"}, "points": 15},
            {"label": "DynamoDB persistence", "type": "component_present", "params": {"component_type": "dynamodb"}, "points": 10},
            {"label": "API Gateway invokes Lambda", "type": "edge_exists", "params": {"source_type": "api gateway", "target_type": "lambda"}, "points": 15},
            {"label": "Lambda reads/writes DynamoDB", "type": "edge_exists", "params": {"source_type": "lambda", "target_type": "dynamodb"}, "points": 10},
            {"label": "At least one IAM role defined", "type": "min_iam_roles", "params": {"count": 1}, "points": 10},
            {"label": "Lambda has IAM role attached", "type": "nodes_have_iam_roles", "params": {"component_types": ["lambda"]}, "points": 10},
            {"label": "DynamoDB encryption enabled", "type": "component_config", "params": {"component_type": "dynamodb", "config_key": "server_side_encryption", "expected": True}, "points": 15},
        ],
    },

    # ── 12 ── Hardened Web Server in a VPC (Intermediate, 105 pts) ─────────
    {
        "title": "Assignment 12 — Hardened Web Server in a VPC",
        "brief": (
            "Deploy a web server in a VPC with proper network controls. EC2 runs in a "
            "subnet reachable through an Internet Gateway. Define security groups in the "
            "Security tab, assign them to EC2, and ensure SSH (port 22) is not open to "
            "the entire internet. "
            "\n\nDraw an edge from Internet Gateway to EC2 showing the traffic path. "
            "\n\nKey concepts: stateful security groups, bastion vs. public admin access, "
            "VPC routing, defense in depth."
        ),
        "rubric": [
            {"label": "VPC network boundary", "type": "component_present", "params": {"component_type": "vpc"}, "points": 10},
            {"label": "Subnet for the instance", "type": "component_present", "params": {"component_type": "subnet"}, "points": 10},
            {"label": "Internet Gateway", "type": "component_present", "params": {"component_type": "internet gateway"}, "points": 10},
            {"label": "EC2 web server", "type": "component_present", "params": {"component_type": "ec2"}, "points": 10},
            {"label": "At least one security group defined", "type": "min_security_groups", "params": {"count": 1}, "points": 15},
            {"label": "EC2 has security groups assigned", "type": "nodes_have_security_groups", "params": {"component_types": ["ec2"]}, "points": 15},
            {"label": "SSH not open to 0.0.0.0/0", "type": "security_port_restricted", "params": {"port": 22}, "points": 15},
            {"label": "Internet Gateway connects to EC2", "type": "edge_exists", "params": {"source_type": "internet gateway", "target_type": "ec2"}, "points": 10},
            {"label": "EC2 uses an IAM role", "type": "nodes_have_iam_roles", "params": {"component_types": ["ec2"]}, "points": 10},
        ],
    },

    # ── 13 ── Private Application Tier with Encrypted RDS (Intermediate, 110 pts)
    {
        "title": "Assignment 13 — Private Application Tier with Encrypted RDS",
        "brief": (
            "Build a two-tier architecture where application servers connect to a private "
            "database. Use a VPC with at least two subnets, NAT Gateway for outbound "
            "updates from private instances, EC2 in private subnets, and RDS for relational "
            "data. RDS must use storage encryption and must not be publicly accessible. "
            "Assign distinct security groups to EC2 and RDS. "
            "\n\nDraw edge: EC2 → RDS. "
            "\n\nKey concepts: public/private subnet design, NAT vs. IGW, RDS encryption, "
            "security group referencing."
        ),
        "rubric": [
            {"label": "VPC foundation", "type": "component_present", "params": {"component_type": "vpc"}, "points": 10},
            {"label": "At least 2 subnets", "type": "min_count", "params": {"component_type": "subnet", "count": 2}, "points": 10},
            {"label": "NAT Gateway for private outbound", "type": "component_present", "params": {"component_type": "nat gateway"}, "points": 15},
            {"label": "EC2 application tier", "type": "component_present", "params": {"component_type": "ec2"}, "points": 10},
            {"label": "RDS data tier", "type": "component_present", "params": {"component_type": "rds"}, "points": 10},
            {"label": "At least 2 security groups", "type": "min_security_groups", "params": {"count": 2}, "points": 10},
            {"label": "EC2 and RDS use security groups", "type": "nodes_have_security_groups", "params": {"component_types": ["ec2", "rds"]}, "points": 15},
            {"label": "RDS storage encrypted", "type": "component_config", "params": {"component_type": "rds", "config_key": "storage_encrypted", "expected": True}, "points": 10},
            {"label": "RDS not publicly accessible", "type": "component_config", "params": {"component_type": "rds", "config_key": "publicly_accessible", "expected": False}, "points": 10},
            {"label": "Application connects to database", "type": "edge_exists", "params": {"source_type": "ec2", "target_type": "rds"}, "points": 10},
        ],
    },

    # ── 14 ── Secure Data Lake Landing Zone (Intermediate, 115 pts) ──────────
    {
        "title": "Assignment 14 — Secure Data Lake Landing Zone",
        "brief": (
            "Design the storage foundation for a data lake. S3 holds raw datasets with "
            "server-side encryption enabled (not 'none'). KMS provides customer-managed "
            "encryption keys. Lambda processes uploaded objects — attach an IAM role with "
            "only the permissions it needs. "
            "\n\nDraw edge: Lambda → S3. "
            "\n\nKey concepts: SSE-S3 vs. SSE-KMS, key policies, S3 bucket policies, "
            "Lambda execution roles."
        ),
        "rubric": [
            {"label": "S3 data lake bucket", "type": "component_present", "params": {"component_type": "s3"}, "points": 15},
            {"label": "KMS encryption key", "type": "component_present", "params": {"component_type": "kms"}, "points": 15},
            {"label": "Lambda processor", "type": "component_present", "params": {"component_type": "lambda"}, "points": 10},
            {"label": "S3 encryption configured", "type": "component_config", "params": {"component_type": "s3", "config_key": "server_side_encryption", "forbidden_values": ["none"]}, "points": 15},
            {"label": "At least one IAM role", "type": "min_iam_roles", "params": {"count": 1}, "points": 10},
            {"label": "Lambda has IAM role", "type": "nodes_have_iam_roles", "params": {"component_types": ["lambda"]}, "points": 15},
            {"label": "Lambda writes to S3", "type": "edge_exists", "params": {"source_type": "lambda", "target_type": "s3"}, "points": 15},
            {"label": "No hard-coded keys (IAM role present on canvas)", "type": "component_present", "params": {"component_type": "iam role"}, "points": 10},
        ],
    },

    # ── 15 ── Cached Three-Tier with Encryption (Advanced, 120 pts) ──────────
    {
        "title": "Assignment 15 — Cached Three-Tier with Encryption",
        "brief": (
            "Extend the classic three-tier pattern with a caching layer and encryption "
            "everywhere data rests. An ALB routes to EC2 in private subnets. EC2 reads "
            "from ElastiCache before hitting RDS. Enable storage encryption on RDS and "
            "at-rest encryption on ElastiCache. Use separate security groups per tier. "
            "\n\nDraw edges: ALB → EC2, EC2 → RDS, EC2 → ElastiCache. "
            "\n\nKey concepts: cache-aside pattern, encrypted caches, tier isolation, ALB health checks."
        ),
        "rubric": [
            {"label": "VPC", "type": "component_present", "params": {"component_type": "vpc"}, "points": 5},
            {"label": "ALB presentation tier", "type": "component_present", "params": {"component_type": "alb"}, "points": 10},
            {"label": "EC2 application tier", "type": "component_present", "params": {"component_type": "ec2"}, "points": 10},
            {"label": "RDS data tier", "type": "component_present", "params": {"component_type": "rds"}, "points": 10},
            {"label": "ElastiCache caching tier", "type": "component_present", "params": {"component_type": "elasticache"}, "points": 10},
            {"label": "At least 2 security groups", "type": "min_security_groups", "params": {"count": 2}, "points": 10},
            {"label": "Compute and data tiers use security groups", "type": "nodes_have_security_groups", "params": {"component_types": ["ec2", "rds", "elasticache"]}, "points": 10},
            {"label": "RDS encrypted at rest", "type": "component_config", "params": {"component_type": "rds", "config_key": "storage_encrypted", "expected": True}, "points": 10},
            {"label": "ElastiCache encrypted at rest", "type": "component_config", "params": {"component_type": "elasticache", "config_key": "at_rest_encryption_enabled", "expected": True}, "points": 10},
            {"label": "ALB → EC2 traffic path", "type": "edge_exists", "params": {"source_type": "alb", "target_type": "ec2"}, "points": 10},
            {"label": "EC2 → RDS data access", "type": "edge_exists", "params": {"source_type": "ec2", "target_type": "rds"}, "points": 10},
            {"label": "EC2 → ElastiCache cache access", "type": "edge_exists", "params": {"source_type": "ec2", "target_type": "elasticache"}, "points": 5},
        ],
    },

    # ── 16 ── IAM-Scoped Event Processing (Advanced, 125 pts) ────────────────
    {
        "title": "Assignment 16 — IAM-Scoped Event Processing",
        "brief": (
            "Build an event pipeline where each service assumes a narrowly scoped IAM role. "
            "S3 receives uploads, Lambda processes them, and SNS publishes completion "
            "notifications. Define at least two IAM roles (e.g., Lambda execution vs. "
            "publisher). Enable S3 server-side encryption. "
            "\n\nDraw edges: S3 → Lambda, Lambda → SNS. "
            "\n\nKey concepts: resource-based policies, role trust policies, "
            "separation of duties, encrypted object storage."
        ),
        "rubric": [
            {"label": "S3 ingestion bucket", "type": "component_present", "params": {"component_type": "s3"}, "points": 10},
            {"label": "Lambda processor", "type": "component_present", "params": {"component_type": "lambda"}, "points": 10},
            {"label": "SNS notification topic", "type": "component_present", "params": {"component_type": "sns"}, "points": 10},
            {"label": "S3 encrypted", "type": "component_config", "params": {"component_type": "s3", "config_key": "server_side_encryption", "forbidden_values": ["none"]}, "points": 15},
            {"label": "At least 2 IAM roles", "type": "min_iam_roles", "params": {"count": 2}, "points": 15},
            {"label": "Lambda has IAM role", "type": "nodes_have_iam_roles", "params": {"component_types": ["lambda"]}, "points": 15},
            {"label": "S3 triggers Lambda", "type": "edge_exists", "params": {"source_type": "s3", "target_type": "lambda"}, "points": 15},
            {"label": "Lambda publishes to SNS", "type": "edge_exists", "params": {"source_type": "lambda", "target_type": "sns"}, "points": 15},
            {"label": "Fully serverless (no EC2)", "type": "component_absent", "params": {"component_type": "ec2"}, "points": 10},
        ],
    },

    # ── 17 ── Zero-Trust Perimeter Web Application (Advanced, 130 pts) ───────
    {
        "title": "Assignment 17 — Zero-Trust Perimeter Web Application",
        "brief": (
            "Design a web application with layered perimeter controls. CloudFront and WAF "
            "sit in front of an ALB. EC2 instances run in private subnets behind NAT for "
            "outbound patches. Security groups must be assigned to EC2, and administrative "
            "ports (SSH 22, RDP 3389) must not be open to the world. "
            "\n\nDraw edges: CloudFront → ALB, ALB → EC2. "
            "\n\nKey concepts: CDN origin protection, WAF managed rules, private subnet "
            "compute, NAT egress, security group least privilege."
        ),
        "rubric": [
            {"label": "VPC", "type": "component_present", "params": {"component_type": "vpc"}, "points": 5},
            {"label": "At least 2 subnets", "type": "min_count", "params": {"component_type": "subnet", "count": 2}, "points": 5},
            {"label": "NAT Gateway", "type": "component_present", "params": {"component_type": "nat gateway"}, "points": 10},
            {"label": "CloudFront CDN", "type": "component_present", "params": {"component_type": "cloudfront"}, "points": 10},
            {"label": "WAF protection", "type": "component_present", "params": {"component_type": "aws waf"}, "points": 10},
            {"label": "ALB", "type": "component_present", "params": {"component_type": "alb"}, "points": 10},
            {"label": "EC2 application servers", "type": "component_present", "params": {"component_type": "ec2"}, "points": 5},
            {"label": "At least 2 security groups", "type": "min_security_groups", "params": {"count": 2}, "points": 10},
            {"label": "EC2 uses security groups", "type": "nodes_have_security_groups", "params": {"component_types": ["ec2"]}, "points": 10},
            {"label": "SSH not public", "type": "security_port_restricted", "params": {"port": 22}, "points": 10},
            {"label": "RDP not public", "type": "security_port_restricted", "params": {"port": 3389}, "points": 10},
            {"label": "CloudFront → ALB", "type": "edge_exists", "params": {"source_type": "cloudfront", "target_type": "alb"}, "points": 10},
            {"label": "ALB → EC2", "type": "edge_exists", "params": {"source_type": "alb", "target_type": "ec2"}, "points": 10},
            {"label": "EC2 IAM role attached", "type": "nodes_have_iam_roles", "params": {"component_types": ["ec2"]}, "points": 5},
        ],
    },

    # ── 18 ── ECS Fargate with Secrets and Encryption (Advanced, 135 pts) ───
    {
        "title": "Assignment 18 — ECS Fargate with Secrets and Encryption",
        "brief": (
            "Containerize a production API on ECS Fargate with secrets management and "
            "encrypted persistence. An ALB routes traffic to Fargate tasks in a VPC. "
            "RDS stores application data with encryption enabled. Secrets Manager holds "
            "database credentials — never hardcode them on the task definition. "
            "Define IAM roles for task execution and application permissions. "
            "\n\nDraw edges: ALB → ECS Fargate, ECS Fargate → RDS. "
            "\n\nKey concepts: task roles vs. execution roles, secrets injection, "
            "Fargate networking, encrypted RDS."
        ),
        "rubric": [
            {"label": "VPC", "type": "component_present", "params": {"component_type": "vpc"}, "points": 5},
            {"label": "ECS Fargate services", "type": "component_present", "params": {"component_type": "ecs / fargate"}, "points": 15},
            {"label": "ALB ingress", "type": "component_present", "params": {"component_type": "alb"}, "points": 10},
            {"label": "RDS backend", "type": "component_present", "params": {"component_type": "rds"}, "points": 10},
            {"label": "Secrets Manager", "type": "component_present", "params": {"component_type": "secrets manager"}, "points": 10},
            {"label": "At least 2 IAM roles", "type": "min_iam_roles", "params": {"count": 2}, "points": 10},
            {"label": "Fargate tasks use IAM roles", "type": "nodes_have_iam_roles", "params": {"component_types": ["ecs / fargate"]}, "points": 10},
            {"label": "At least 2 security groups", "type": "min_security_groups", "params": {"count": 2}, "points": 10},
            {"label": "Fargate and RDS use security groups", "type": "nodes_have_security_groups", "params": {"component_types": ["ecs / fargate", "rds"]}, "points": 10},
            {"label": "RDS encrypted", "type": "component_config", "params": {"component_type": "rds", "config_key": "storage_encrypted", "expected": True}, "points": 10},
            {"label": "ALB → Fargate", "type": "edge_exists", "params": {"source_type": "alb", "target_type": "ecs / fargate"}, "points": 15},
            {"label": "Fargate → RDS", "type": "edge_exists", "params": {"source_type": "ecs / fargate", "target_type": "rds"}, "points": 10},
        ],
    },

    # ── 19 ── Secure Event-Driven Microservices (Expert, 140 pts) ────────────
    {
        "title": "Assignment 19 — Secure Event-Driven Microservices",
        "brief": (
            "Orchestrate asynchronous workflows with defense in depth. EventBridge routes "
            "domain events to Lambda workers. SQS buffers work for reliability. DynamoDB "
            "stores processed state with encryption. KMS protects sensitive data keys. "
            "Use multiple IAM roles and at least two security groups where compute touches "
            "the VPC. Architecture must include at least 7 components. "
            "\n\nDraw edges: EventBridge → Lambda, SQS → Lambda, Lambda → DynamoDB. "
            "\n\nKey concepts: event buses, idempotent consumers, dead-letter queues, "
            "encrypted NoSQL, KMS envelope encryption."
        ),
        "rubric": [
            {"label": "At least 7 components", "type": "min_node_count", "params": {"count": 7}, "points": 10},
            {"label": "EventBridge event bus", "type": "component_present", "params": {"component_type": "eventbridge"}, "points": 10},
            {"label": "SQS work queue", "type": "component_present", "params": {"component_type": "sqs"}, "points": 10},
            {"label": "Lambda workers", "type": "component_present", "params": {"component_type": "lambda"}, "points": 10},
            {"label": "DynamoDB state store", "type": "component_present", "params": {"component_type": "dynamodb"}, "points": 10},
            {"label": "KMS key management", "type": "component_present", "params": {"component_type": "kms"}, "points": 10},
            {"label": "At least 2 IAM roles", "type": "min_iam_roles", "params": {"count": 2}, "points": 10},
            {"label": "Lambda roles attached", "type": "nodes_have_iam_roles", "params": {"component_types": ["lambda"]}, "points": 10},
            {"label": "At least 2 security groups", "type": "min_security_groups", "params": {"count": 2}, "points": 5},
            {"label": "DynamoDB encrypted", "type": "component_config", "params": {"component_type": "dynamodb", "config_key": "server_side_encryption", "expected": True}, "points": 10},
            {"label": "EventBridge → Lambda", "type": "edge_exists", "params": {"source_type": "eventbridge", "target_type": "lambda"}, "points": 10},
            {"label": "SQS → Lambda", "type": "edge_exists", "params": {"source_type": "sqs", "target_type": "lambda"}, "points": 10},
            {"label": "Lambda → DynamoDB", "type": "edge_exists", "params": {"source_type": "lambda", "target_type": "dynamodb"}, "points": 10},
            {"label": "No EC2 (serverless event pipeline)", "type": "component_absent", "params": {"component_type": "ec2"}, "points": 5},
        ],
    },

    # ── 20 ── Enterprise AI Platform with Defense in Depth (Expert, 150 pts) ─
    {
        "title": "Assignment 20 — Enterprise AI Platform with Defense in Depth",
        "brief": (
            "Design an enterprise-grade AI platform combining containers, generative AI, "
            "and strict security controls. ECS Fargate hosts API services behind an ALB. "
            "Amazon Bedrock provides model inference. CloudFront and WAF protect the edge. "
            "Secrets Manager stores API keys. CloudWatch monitors the stack. KMS encrypts "
            "data at rest. The architecture must include at least 10 components, three IAM "
            "roles, three security groups, and must not expose SSH to the internet. "
            "\n\nDraw edges: ALB → ECS Fargate, EventBridge → Lambda. "
            "\n\nKey concepts: AI service integration, zero-trust networking, observability, "
            "secrets rotation, multi-layer encryption."
        ),
        "rubric": [
            {"label": "At least 10 components", "type": "min_node_count", "params": {"count": 10}, "points": 10},
            {"label": "VPC foundation", "type": "component_present", "params": {"component_type": "vpc"}, "points": 5},
            {"label": "ECS Fargate microservices", "type": "component_present", "params": {"component_type": "ecs / fargate"}, "points": 10},
            {"label": "Amazon Bedrock inference", "type": "component_present", "params": {"component_type": "amazon bedrock"}, "points": 10},
            {"label": "EventBridge orchestration", "type": "component_present", "params": {"component_type": "eventbridge"}, "points": 5},
            {"label": "Lambda async processing", "type": "component_present", "params": {"component_type": "lambda"}, "points": 5},
            {"label": "CloudFront edge delivery", "type": "component_present", "params": {"component_type": "cloudfront"}, "points": 5},
            {"label": "WAF perimeter", "type": "component_present", "params": {"component_type": "aws waf"}, "points": 5},
            {"label": "Secrets Manager", "type": "component_present", "params": {"component_type": "secrets manager"}, "points": 5},
            {"label": "CloudWatch observability", "type": "component_present", "params": {"component_type": "cloudwatch"}, "points": 5},
            {"label": "KMS encryption", "type": "component_present", "params": {"component_type": "kms"}, "points": 5},
            {"label": "Managed database tier", "type": "any_of", "params": {"component_types": ["rds", "amazon aurora", "dynamodb"]}, "points": 5},
            {"label": "At least 3 IAM roles", "type": "min_iam_roles", "params": {"count": 3}, "points": 10},
            {"label": "Fargate and Lambda use IAM roles", "type": "nodes_have_iam_roles", "params": {"component_types": ["ecs / fargate", "lambda"]}, "points": 10},
            {"label": "At least 3 security groups", "type": "min_security_groups", "params": {"count": 3}, "points": 10},
            {"label": "SSH not public", "type": "security_port_restricted", "params": {"port": 22}, "points": 5},
            {"label": "ALB → ECS Fargate", "type": "edge_exists", "params": {"source_type": "alb", "target_type": "ecs / fargate"}, "points": 10},
            {"label": "EventBridge → Lambda", "type": "edge_exists", "params": {"source_type": "eventbridge", "target_type": "lambda"}, "points": 10},
        ],
    },
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def ensure_instructor(db):
    instructor = db.query(User).filter(User.email == "admin@archon.academy").first()
    if not instructor:
        instructor = User(
            display_name="Admin",
            email="admin@archon.academy",
            password_hash=hash_password("pass123"),
            role="user",
        )
        db.add(instructor)
        db.flush()
        db.add(AcademyProfile(user_id=instructor.id, role="instructor"))
        db.commit()
        db.refresh(instructor)
        print("  CREATED instructor: admin@archon.academy")
    return instructor


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        instructor = ensure_instructor(db)
        created = 0
        skipped = 0
        updated = 0

        for data in ASSIGNMENTS:
            existing = db.query(Assignment).filter(Assignment.title == data["title"]).first()
            if existing:
                if not existing.is_library:
                    existing.is_library = True
                    updated += 1
                skipped += 1
                continue

            assignment = Assignment(
                title=data["title"],
                brief=data["brief"],
                rubric=data["rubric"],
                created_by=instructor.id,
                is_library=True,
            )
            db.add(assignment)
            db.flush()
            total_pts = sum(c["points"] for c in data["rubric"])
            print(f"  CREATE [{assignment.id:>3}] {data['title']} ({total_pts} pts)")
            created += 1

        db.commit()
        print(f"\nDone — {created} created, {skipped} already existed, {updated} marked library.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
