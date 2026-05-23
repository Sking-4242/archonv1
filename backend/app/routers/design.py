"""
Design endpoint — multi-turn AI-assisted canvas builder.

Workflow:
  clarify  → AI proposes a plan and asks 1-2 clarifying questions
  confirm  → AI presents finalized plan and asks for confirmation
  build    → AI returns a complete graph ready to apply to the canvas
"""

import json
import logging
import re
import time
import traceback

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

from app.models.graph import Graph
from app.services.design_layout import build_canvas
from app.services.llm.factory import get_provider

router = APIRouter(prefix="/design", tags=["design"])

_MAX_RETRIES = 2
_RETRY_BASE_SECONDS = 1.0
_AUTH_KEYS = ("401", "unauthorized", "invalid api key", "authentication")

# ── Node type catalog (mirrors frontend nodes/index.js) ───────────────────────

_VALID_NODE_TYPES = """\
Containers (use as parent regions):
  vpc, subnet
  azure_vnet, azure_subnet
  gcp_vpc, gcp_subnet
  onprem_network_zone, onprem_vlan

AWS Networking: internet_gateway, nat_gateway, route_table, elastic_ip,
  cloudfront, route53, vpc_endpoint, vpn_gateway, direct_connect,
  global_accelerator, transit_gateway

AWS Compute: ec2, lambda, auto_scaling_group, ecs_fargate, eks, app_runner,
  elastic_beanstalk, lightsail, batch

AWS Load Balancing / API: alb, nlb, api_gateway, appsync

AWS Storage: s3, ebs, efs, fsx, s3_glacier, storage_gateway, backup

AWS Database: rds, aurora, dynamodb, elasticache, redshift, documentdb,
  neptune, timestream, opensearch

AWS Security: security_group, iam_role, kms_key, acm, cognito, secretsmanager,
  waf, shield, guardduty, inspector, macie, security_hub

AWS Integration: sns, sqs, eventbridge, step_functions, kinesis,
  kinesis_firehose, msk, mq

AWS Analytics: athena, glue, emr, quicksight, lakeformation

AWS AI / ML: sagemaker, bedrock, rekognition, comprehend, textract,
  polly, translate, lex

AWS Developer Tools: codecommit, codebuild, codedeploy, codepipeline,
  cloudformation

AWS Management / Observability: cloudwatch, cloudtrail, config,
  systems_manager, xray, ecr
"""

# ── System prompt ─────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are an expert cloud architect embedded in Archon, a visual infrastructure
design tool. Help users design architectures through a structured conversation.

You MUST respond with a single, valid JSON object — no markdown fences, no
prose outside the JSON.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE SCHEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{{
  "stage": "clarify" | "confirm" | "build",
  "message": "Human-readable text shown in the chat bubble",
  "plan": {{
    "summary": "One paragraph describing the architecture",
    "nodes": [
      {{
        "id":       "short_unique_id (lowercase, underscores ok)",
        "type":     "node_type from the catalog below",
        "label":    "Human-readable label",
        "parent":   "parent_node_id or null",
        "zone":     "external | public | private | data | management",
        "category": "networking | compute | storage | database | security | integration | analytics | ml | devtools | observability"
      }}
    ],
    "edges": [
      {{
        "id":     "edge_id",
        "source": "source_node_id",
        "target": "target_node_id",
        "type":   "network | data_flow | dependency | streaming | batch | event",
        "label":  "optional short description"
      }}
    ]
  }}
}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WORKFLOW STAGES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
clarify:
  First response to a new design request, OR any follow-up where you still
  need more information. Propose a high-level plan and ask as many clarifying
  questions as needed to produce an accurate, complete architecture. Cover
  things like scale, availability requirements, existing infrastructure,
  security constraints, cost sensitivity, and any ambiguous component choices.
  Include `plan` with your current interpretation so the user can see your
  direction and correct it. You may stay in `clarify` stage across multiple
  turns until you have everything you need.

confirm:
  Only when you have enough information to produce a complete, accurate design.
  Present the full finalized plan with all nodes and edges. Ask the user to
  confirm ("yes / looks good") or request changes. If the user requests
  changes, return to `clarify` stage with updated questions. Include the
  complete `plan`.

build:
  ONLY when the user explicitly confirms (says "yes", "looks good", "build it",
  "go ahead", "confirm", "do it", or similar). Return the complete plan.
  The backend will auto-layout the nodes onto the canvas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NODE PLACEMENT RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- zone "external"   → Outside VPC: internet_gateway, cloudfront, route53,
                       api_gateway, waf, users
- zone "public"     → Public subnet: alb, nlb, nat_gateway, bastion ec2
- zone "private"    → Private subnet: ec2, ecs_fargate, eks, lambda workers
- zone "data"       → Data layer: rds, aurora, dynamodb, elasticache
- zone "management" → Ops: cloudwatch, cloudtrail, s3 (logs), codecommit

Container nodes (vpc, subnet) rules:
  - A vpc has `parent: null`
  - A subnet has `parent: "<vpc_id>"`
  - Non-container nodes should set `parent` to their containing subnet id
    (or vpc id if no subnet), or null if truly external

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VALID NODE TYPES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{valid_types}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RULES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Use ONLY node types from the catalog. If a concept has no exact type, pick
   the closest match.
2. Every vpc must have at least one subnet child.
3. Node IDs must be unique, short, lowercase, alphanumeric + underscores
   (e.g. "vpc1", "pub_subnet", "web_ec2").
4. All edge source/target IDs must match node IDs exactly.
5. Do NOT output anything outside the JSON object.
6. Always include `plan` in every response — the user sees the component card
   at every stage.
"""


# ── Pydantic models ───────────────────────────────────────────────────────────

class DesignMessage(BaseModel):
    role: str
    content: str


class DesignRequest(BaseModel):
    graph: Graph
    messages: list[DesignMessage]
    provider: str | None = None
    api_key: str | None = None
    model: str | None = None
    base_url: str | None = None


class PlanNode(BaseModel):
    id: str
    type: str
    label: str
    parent: str | None = None
    zone: str = "private"
    category: str = ""


class PlanEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str = "network"
    label: str = ""


class Plan(BaseModel):
    summary: str
    nodes: list[PlanNode]
    edges: list[PlanEdge]


class DesignResponse(BaseModel):
    stage: str
    message: str
    plan: Plan | None = None
    graph: dict | None = None  # {nodes, edges} populated only when stage == "build"


# ── Helpers ───────────────────────────────────────────────────────────────────

def _extract_json(text: str) -> dict:
    """Strip markdown fences if present, then parse the JSON object."""
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text.rstrip())
        text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise ValueError("No JSON object found in response")
    return json.loads(text[start : end + 1])


def _call_with_retry(provider, system_prompt: str, user_prompt: str) -> str:
    last_exc: Exception | None = None
    for attempt in range(_MAX_RETRIES + 1):
        if attempt > 0:
            time.sleep(_RETRY_BASE_SECONDS * (2 ** (attempt - 1)))
        try:
            return provider.generate(system_prompt, user_prompt)
        except Exception as exc:
            last_exc = exc
            if any(k in str(exc).lower() for k in _AUTH_KEYS):
                raise
    raise last_exc


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("", response_model=DesignResponse)
def design(body: DesignRequest) -> DesignResponse:
    if not body.messages:
        raise HTTPException(status_code=400, detail="No messages provided.")

    try:
        provider = get_provider(
            provider_name=body.provider,
            api_key=body.api_key,
            model=body.model,
            base_url=body.base_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    system_prompt = _SYSTEM_PROMPT.format(valid_types=_VALID_NODE_TYPES)

    conversation = "\n\n".join(
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}"
        for m in body.messages
    ).strip()

    try:
        raw = _call_with_retry(provider, system_prompt, conversation)
    except RuntimeError as exc:
        msg = str(exc)
        logger.error("Design RuntimeError: %s\n%s", msg, traceback.format_exc())
        if "not reachable" in msg:
            raise HTTPException(status_code=503, detail=msg)
        raise HTTPException(status_code=500, detail=f"Design failed: {msg}")
    except Exception as exc:
        msg = str(exc)
        logger.error(
            "Design Exception [%s]: %s\n%s",
            type(exc).__name__, msg, traceback.format_exc(),
        )
        if any(k in msg.lower() for k in _AUTH_KEYS):
            raise HTTPException(status_code=401, detail="Invalid API key.")
        raise HTTPException(status_code=500, detail=f"Design failed: {msg}")

    try:
        data = _extract_json(raw)
    except (json.JSONDecodeError, ValueError) as exc:
        logger.error("Design JSON parse error: %s\nRaw: %.500s", exc, raw)
        raise HTTPException(
            status_code=422,
            detail=f"AI returned invalid JSON: {exc}",
        )

    stage = data.get("stage", "clarify")
    message = data.get("message", "")

    # Parse plan
    plan: Plan | None = None
    plan_data = data.get("plan")
    if plan_data:
        try:
            nodes = [PlanNode(**n) for n in plan_data.get("nodes", [])]
            edges = [PlanEdge(**e) for e in plan_data.get("edges", [])]
            plan = Plan(
                summary=plan_data.get("summary", ""),
                nodes=nodes,
                edges=edges,
            )
        except Exception as exc:
            logger.warning("Plan parse warning (non-fatal): %s", exc)

    # Build canvas graph when stage is "build"
    graph: dict | None = None
    if stage == "build" and plan:
        node_dicts = [n.model_dump() for n in plan.nodes]
        edge_dicts = [e.model_dump() for e in plan.edges]
        graph = build_canvas(node_dicts, edge_dicts)

    return DesignResponse(stage=stage, message=message, plan=plan, graph=graph)
