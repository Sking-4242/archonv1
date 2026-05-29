"""
seed_assignments.py — Seed the 10 Archon Academy architecture assignments.

Run inside the backend container:
    docker compose exec backend python seed_assignments.py

Idempotent: matches existing assignments by title and skips them.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(__file__))

from app.db import Base, SessionLocal, engine
from app.models.academy import Assignment, User
from app.services.academy.auth_service import hash_password

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
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def ensure_instructor(db):
    instructor = db.query(User).filter(User.email == "admin@archon.academy").first()
    if not instructor:
        instructor = User(
            name="Admin",
            email="admin@archon.academy",
            password_hash=hash_password("pass123"),
            role="instructor",
        )
        db.add(instructor)
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

        for data in ASSIGNMENTS:
            existing = db.query(Assignment).filter(Assignment.title == data["title"]).first()
            if existing:
                skipped += 1
                continue

            assignment = Assignment(
                title=data["title"],
                brief=data["brief"],
                rubric=data["rubric"],
                created_by=instructor.id,
            )
            db.add(assignment)
            db.flush()
            total_pts = sum(c["points"] for c in data["rubric"])
            print(f"  CREATE [{assignment.id:>3}] {data['title']} ({total_pts} pts)")
            created += 1

        db.commit()
        print(f"\nDone — {created} assignments created, {skipped} already existed.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
