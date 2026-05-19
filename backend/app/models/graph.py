from typing import Any, Literal

from pydantic import BaseModel, Field


class Position(BaseModel):
    x: float
    y: float


class InboundRule(BaseModel):
    protocol: str
    port: int | None
    source: str


class OutboundRule(BaseModel):
    protocol: str
    port: int | None
    source: str


class SecurityGroup(BaseModel):
    id: str
    name: str
    description: str
    vpc_id: str
    inbound: list[InboundRule] = Field(default_factory=list)
    outbound: list[OutboundRule] = Field(default_factory=list)


class PolicyStatement(BaseModel):
    effect: Literal["Allow", "Deny"]
    actions: list[str]
    resources: list[str]


class IAMRole(BaseModel):
    id: str
    name: str
    description: str
    policies: list[PolicyStatement] = Field(default_factory=list)


class Component(BaseModel):
    id: str
    type: str
    label: str
    position: Position
    config: dict[str, Any] = Field(default_factory=dict)
    security_group_ids: list[str] = Field(default_factory=list)
    iam_role_id: str | None = None
    subnet_id: str | None = None
    vpc_id: str | None = None
    category: str = ""


class Edge(BaseModel):
    id: str
    source: str
    target: str
    type: Literal["network", "data_flow", "dependency", "streaming", "batch", "event"]
    bidirectional: bool = False
    suggested_rules: list[dict[str, Any]] = Field(default_factory=list)


class Graph(BaseModel):
    id: str
    name: str
    provider: str = "aws"
    region: str = "us-east-1"
    components: list[Component] = Field(default_factory=list)
    security_groups: list[SecurityGroup] = Field(default_factory=list)
    iam_roles: list[IAMRole] = Field(default_factory=list)
    edges: list[Edge]
