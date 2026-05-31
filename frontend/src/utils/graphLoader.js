export function graphJsonToCanvasState(data) {
  const restoredNodes = (data.components ?? data.nodes ?? []).map((c) => ({
    id: c.id,
    type: c.type,
    position: c.position ?? { x: 0, y: 0 },
    ...(c.parentId ? { parentId: c.parentId } : {}),
    ...(c.style ? { style: c.style } : {}),
    data: {
      label: c.label ?? c.data?.label ?? c.type,
      awsType: c.awsType ?? c.cloudType ?? c.data?.awsType ?? c.type,
      icon: c.icon ?? c.data?.icon ?? "",
      config: c.config ?? c.data?.config ?? {},
      category: c.category ?? c.data?.category ?? "",
      security_group_ids: c.security_group_ids ?? c.data?.security_group_ids ?? [],
      iam_role_id: c.iam_role_id ?? c.data?.iam_role_id ?? null,
    },
  }));

  return {
    nodes: restoredNodes,
    edges: data.edges ?? [],
    graphMeta: {
      id: data.id,
      name: data.name,
      provider: data.provider,
      region: data.region,
    },
    securityGroups: data.security_groups ?? [],
    iamRoles: data.iam_roles ?? [],
  };
}
