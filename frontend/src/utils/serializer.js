// Converts React Flow canvas state + store state into the Graph JSON format
// expected by the backend generation endpoint.

export function serializeGraph(
  graphMeta,
  nodes,
  edges,
  securityGroups,
  iamRoles,
) {
  const components = nodes.map((node) => ({
    id: node.id,
    type: node.type,
    label: node.data.label,
    awsType: node.data.awsType ?? null,
    cloudType: node.data.cloudType ?? null,
    icon: node.data.icon ?? null,
    position: { x: node.position.x, y: node.position.y },
    config: node.data.config ?? {},
    security_group_ids: node.data.security_group_ids ?? [],
    iam_role_id: node.data.iam_role_id ?? null,
    subnet_id: node.data.subnet_id ?? null,
    vpc_id: node.data.vpc_id ?? null,
    category: node.data.category,
  }));

  const serializedEdges = edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type ?? "network",
    bidirectional: edge.data?.bidirectional ?? false,
    suggested_rules: edge.suggested_rules ?? [],
  }));

  const serializedSecurityGroups = securityGroups.map((sg) => ({
    id: sg.id,
    name: sg.name,
    description: sg.description ?? "",
    vpc_id: sg.vpc_id ?? "",
    inbound: sg.inbound ?? [],
    outbound: sg.outbound ?? [],
  }));

  const serializedIAMRoles = iamRoles.map((role) => ({
    id: role.id,
    name: role.name,
    description: role.description ?? "",
    policies: role.policies ?? [],
  }));

  return {
    id: graphMeta.id,
    name: graphMeta.name,
    provider: graphMeta.provider,
    region: graphMeta.region,
    components,
    security_groups: serializedSecurityGroups,
    iam_roles: serializedIAMRoles,
    edges: serializedEdges,
  };
}

export function validateGraphForGeneration(graph) {
  const errors = [];

  if (graph.components.length === 0) {
    errors.push(
      "Canvas is empty. Add at least one AWS component before generating.",
    );
  }

  return errors;
}
