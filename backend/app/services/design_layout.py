"""
Auto-layout for AI-generated canvas designs.

Takes a logical plan (nodes + edges with zone/parent hints) and returns
ReactFlow-compatible node objects with computed absolute x/y positions.
All positions are absolute — Archon does not use ReactFlow's parentId system.
"""

import math

# ── Type sets ─────────────────────────────────────────────────────────────────

VPC_TYPES = {
    "vpc", "azure_vnet", "gcp_vpc", "onprem_network_zone",
}
SUBNET_TYPES = {
    "subnet", "azure_subnet", "gcp_subnet", "onprem_vlan",
}
CONTAINER_TYPES = VPC_TYPES | SUBNET_TYPES

# Nodes that always live outside any VPC
EXTERNAL_TYPES = {
    "internet_gateway", "cloudfront", "route53", "global_accelerator",
    "direct_connect", "vpn_gateway", "transit_gateway",
    "azure_frontdoor", "azure_dns", "azure_traffic_mgr", "azure_expressroute",
    "azure_vpn_gateway", "azure_ddos",
    "gcp_cdn", "gcp_dns", "gcp_vpn", "gcp_interconnect",
    "onprem_router", "onprem_switch", "onprem_vpn",
}

# ── Canvas spacing constants ──────────────────────────────────────────────────

CANVAS_LEFT = 60
EXTERNAL_Y = 60
VPC_START_Y = 220

NODE_W = 130
NODE_H = 75
NODE_GAP_X = 30
NODE_GAP_Y = 30

SUBNET_W = 340
SUBNET_PADDING_X = 20
SUBNET_PADDING_TOP = 40
SUBNET_GAP_X = 40
SUBNET_GAP_Y = 30

VPC_PADDING = 50
VPC_COLS = 2          # max subnets per row inside a VPC
VPC_GAP_X = 80        # horizontal gap between adjacent VPCs
ORPHAN_Y_OFFSET = 80  # below VPCs for unparented nodes


def build_canvas(plan_nodes: list[dict], plan_edges: list[dict]) -> dict:
    """Public entry point. Returns {nodes, edges} ready for the frontend."""
    rf_nodes = _layout_nodes(plan_nodes)
    rf_edges = _build_edges(plan_edges)
    return {"nodes": rf_nodes, "edges": rf_edges}


# ── Internal layout ───────────────────────────────────────────────────────────

def _layout_nodes(plan_nodes: list[dict]) -> list[dict]:
    by_id = {n["id"]: n for n in plan_nodes}

    vpcs    = [n for n in plan_nodes if n["type"] in VPC_TYPES]
    subnets = [n for n in plan_nodes if n["type"] in SUBNET_TYPES]

    # Resolve explicit zone or infer from type
    def zone_of(n):
        if n["type"] in EXTERNAL_TYPES:
            return "external"
        z = n.get("zone", "")
        if z in ("external", "public", "private", "data", "management"):
            return z
        return "private"

    # Partition non-container nodes
    external_nodes = [n for n in plan_nodes if n["type"] not in CONTAINER_TYPES and zone_of(n) == "external"]
    data_nodes     = [n for n in plan_nodes if n["type"] not in CONTAINER_TYPES and zone_of(n) == "data"]
    mgmt_nodes     = [n for n in plan_nodes if n["type"] not in CONTAINER_TYPES and zone_of(n) == "management"]

    # Leaf nodes that go inside subnets or VPCs
    leaf_nodes = [
        n for n in plan_nodes
        if n["type"] not in CONTAINER_TYPES
        and zone_of(n) not in ("external", "data", "management")
    ]

    # Map parent id → children list
    subnet_children: dict[str, list] = {}
    vpc_direct_children: dict[str, list] = {}
    orphan_leaves: list = []

    for n in leaf_nodes:
        parent = n.get("parent")
        if parent and parent in by_id:
            ptype = by_id[parent]["type"]
            if ptype in SUBNET_TYPES:
                subnet_children.setdefault(parent, []).append(n)
            elif ptype in VPC_TYPES:
                vpc_direct_children.setdefault(parent, []).append(n)
            else:
                orphan_leaves.append(n)
        else:
            orphan_leaves.append(n)

    # Subnets whose parent is a VPC
    vpc_subnets: dict[str, list] = {}
    orphan_subnets: list = []
    for s in subnets:
        parent = s.get("parent")
        if parent and parent in by_id and by_id[parent]["type"] in VPC_TYPES:
            vpc_subnets.setdefault(parent, []).append(s)
        else:
            orphan_subnets.append(s)

    rf_nodes: list[dict] = []

    # ── 1. External nodes (row above VPCs) ────────────────────────────────────
    if external_nodes:
        count = len(external_nodes)
        total_w = count * NODE_W + (count - 1) * NODE_GAP_X
        start_x = CANVAS_LEFT + max(0, (800 - total_w) // 2)
        for i, n in enumerate(external_nodes):
            rf_nodes.append(_leaf(n, start_x + i * (NODE_W + NODE_GAP_X), EXTERNAL_Y))

    # ── 2. VPCs and their contents ────────────────────────────────────────────
    vpc_x = CANVAS_LEFT
    for vpc in vpcs:
        v_subnets = vpc_subnets.get(vpc["id"], [])
        v_direct  = vpc_direct_children.get(vpc["id"], [])

        # Compute subnet heights based on their child counts
        def subnet_height(s):
            children = subnet_children.get(s["id"], [])
            if not children:
                return 200
            rows = math.ceil(len(children) / 2)
            return SUBNET_PADDING_TOP + rows * (NODE_H + NODE_GAP_Y) + 20

        cols = min(len(v_subnets), VPC_COLS) if v_subnets else 1
        rows = math.ceil(len(v_subnets) / cols) if v_subnets else 0

        max_subnet_h = max((subnet_height(s) for s in v_subnets), default=200)
        vpc_content_w = cols * SUBNET_W + (cols - 1) * SUBNET_GAP_X
        vpc_content_h = (
            rows * max_subnet_h + max(0, rows - 1) * SUBNET_GAP_Y
            + (NODE_H + NODE_GAP_Y if v_direct else 0)
        )

        vpc_w = VPC_PADDING * 2 + vpc_content_w
        vpc_h = VPC_PADDING * 2 + 30 + vpc_content_h  # 30 for label

        rf_nodes.append(_container(vpc, vpc_x, VPC_START_Y, vpc_w, vpc_h, z=0))

        # Place subnets
        for si, s in enumerate(v_subnets):
            col = si % cols
            row = si // cols
            sx = vpc_x + VPC_PADDING + col * (SUBNET_W + SUBNET_GAP_X)
            sy = VPC_START_Y + VPC_PADDING + 30 + row * (max_subnet_h + SUBNET_GAP_Y)
            sh = subnet_height(s)
            rf_nodes.append(_container(s, sx, sy, SUBNET_W, sh, z=1,
                                       vpc_id=vpc["id"]))

            # Place children inside subnet
            for ci, child in enumerate(subnet_children.get(s["id"], [])):
                cx = sx + SUBNET_PADDING_X + (ci % 2) * (NODE_W + NODE_GAP_X)
                cy = sy + SUBNET_PADDING_TOP + (ci // 2) * (NODE_H + NODE_GAP_Y)
                rf_nodes.append(_leaf(child, cx, cy,
                                      subnet_id=s["id"], vpc_id=vpc["id"]))

        # Direct VPC children (not in any subnet)
        direct_y = VPC_START_Y + vpc_h + 10
        for ci, child in enumerate(v_direct):
            cx = vpc_x + VPC_PADDING + ci * (NODE_W + NODE_GAP_X)
            rf_nodes.append(_leaf(child, cx, direct_y, vpc_id=vpc["id"]))

        vpc_x += vpc_w + VPC_GAP_X

    # ── 3. Orphan subnets (no VPC parent) ─────────────────────────────────────
    if orphan_subnets:
        sx = CANVAS_LEFT
        sy = VPC_START_Y
        for s in orphan_subnets:
            sh = max(200, SUBNET_PADDING_TOP + math.ceil(len(subnet_children.get(s["id"], [])) / 2) * (NODE_H + NODE_GAP_Y) + 20)
            rf_nodes.append(_container(s, sx, sy, SUBNET_W, sh, z=1))
            for ci, child in enumerate(subnet_children.get(s["id"], [])):
                cx = sx + SUBNET_PADDING_X + (ci % 2) * (NODE_W + NODE_GAP_X)
                cy = sy + SUBNET_PADDING_TOP + (ci // 2) * (NODE_H + NODE_GAP_Y)
                rf_nodes.append(_leaf(child, cx, cy, subnet_id=s["id"]))
            sx += SUBNET_W + SUBNET_GAP_X

    # ── 4. Orphan leaf nodes ──────────────────────────────────────────────────
    if orphan_leaves:
        oy = VPC_START_Y + 550
        ox = CANVAS_LEFT
        for i, n in enumerate(orphan_leaves):
            rf_nodes.append(_leaf(n, ox + i * (NODE_W + NODE_GAP_X), oy))

    # ── 5. Data layer (databases, cache) ─────────────────────────────────────
    if data_nodes:
        dy = VPC_START_Y + 620
        dx = CANVAS_LEFT
        for i, n in enumerate(data_nodes):
            rf_nodes.append(_leaf(n, dx + i * (NODE_W + NODE_GAP_X), dy))

    # ── 6. Management layer (observability, logging) ─────────────────────────
    if mgmt_nodes:
        mx = CANVAS_LEFT + 700
        my = EXTERNAL_Y
        for i, n in enumerate(mgmt_nodes):
            rf_nodes.append(_leaf(n, mx + i * (NODE_W + NODE_GAP_X), my + i * 120))

    return rf_nodes


def _build_edges(plan_edges: list[dict]) -> list[dict]:
    return [
        {
            "id": e["id"],
            "source": e["source"],
            "target": e["target"],
            "type": e.get("type", "network"),
            "data": {
                "label": e.get("label", ""),
                "bidirectional": False,
                "suggested_rules": [],
            },
        }
        for e in plan_edges
    ]


def _leaf(
    plan_node: dict,
    x: float,
    y: float,
    subnet_id: str | None = None,
    vpc_id: str | None = None,
) -> dict:
    return {
        "id": plan_node["id"],
        "type": plan_node["type"],
        "position": {"x": round(x), "y": round(y)},
        "zIndex": 2,
        "data": {
            "label": plan_node["label"],
            "nodeType": plan_node["type"],
            "category": plan_node.get("category", ""),
            "config": {},
            "security_group_ids": [],
            "iam_role_id": None,
            "subnet_id": subnet_id,
            "vpc_id": vpc_id,
            "instructions": "",
        },
    }


def _container(
    plan_node: dict,
    x: float,
    y: float,
    w: float,
    h: float,
    z: int = 0,
    vpc_id: str | None = None,
) -> dict:
    return {
        "id": plan_node["id"],
        "type": plan_node["type"],
        "position": {"x": round(x), "y": round(y)},
        "zIndex": z,
        "style": {"width": round(w), "height": round(h)},
        "data": {
            "label": plan_node["label"],
            "nodeType": plan_node["type"],
            "category": plan_node.get("category", "networking"),
            "config": {},
            "security_group_ids": [],
            "iam_role_id": None,
            "subnet_id": None,
            "vpc_id": vpc_id,
            "instructions": "",
        },
    }
