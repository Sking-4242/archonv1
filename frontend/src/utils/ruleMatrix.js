// Auto-suggest security group rules based on component type pairs connected by edges.
// Each entry maps "sourceType->targetType" to an array of suggested inbound rules
// for the TARGET component's security group.

const RULE_MATRIX = {
  "internet_gateway->alb": [
    {
      protocol: "tcp",
      port: 443,
      source: "0.0.0.0/0",
      note: "HTTPS from internet",
    },
    {
      protocol: "tcp",
      port: 80,
      source: "0.0.0.0/0",
      note: "HTTP from internet",
    },
  ],
  "internet_gateway->nlb": [
    {
      protocol: "tcp",
      port: 443,
      source: "0.0.0.0/0",
      note: "HTTPS from internet",
    },
    {
      protocol: "tcp",
      port: 80,
      source: "0.0.0.0/0",
      note: "HTTP from internet",
    },
  ],
  "alb->ec2": [
    { protocol: "tcp", port: 80, source: "alb-sg", note: "HTTP from ALB" },
    { protocol: "tcp", port: 443, source: "alb-sg", note: "HTTPS from ALB" },
    {
      protocol: "tcp",
      port: 8080,
      source: "alb-sg",
      note: "Alt HTTP from ALB",
    },
  ],
  "nlb->ec2": [
    { protocol: "tcp", port: 80, source: "0.0.0.0/0", note: "HTTP via NLB" },
    { protocol: "tcp", port: 443, source: "0.0.0.0/0", note: "HTTPS via NLB" },
  ],
  "alb->auto_scaling_group": [
    { protocol: "tcp", port: 80, source: "alb-sg", note: "HTTP from ALB" },
    { protocol: "tcp", port: 443, source: "alb-sg", note: "HTTPS from ALB" },
  ],
  "ec2->rds": [
    {
      protocol: "tcp",
      port: 5432,
      source: "ec2-sg",
      note: "PostgreSQL from EC2",
    },
    { protocol: "tcp", port: 3306, source: "ec2-sg", note: "MySQL from EC2" },
  ],
  "lambda->rds": [
    {
      protocol: "tcp",
      port: 5432,
      source: "lambda-sg",
      note: "PostgreSQL from Lambda",
    },
    {
      protocol: "tcp",
      port: 3306,
      source: "lambda-sg",
      note: "MySQL from Lambda",
    },
  ],
  "auto_scaling_group->rds": [
    {
      protocol: "tcp",
      port: 5432,
      source: "asg-sg",
      note: "PostgreSQL from ASG",
    },
    { protocol: "tcp", port: 3306, source: "asg-sg", note: "MySQL from ASG" },
  ],
  "ec2->elasticache": [
    { protocol: "tcp", port: 6379, source: "ec2-sg", note: "Redis from EC2" },
    {
      protocol: "tcp",
      port: 11211,
      source: "ec2-sg",
      note: "Memcached from EC2",
    },
  ],
  "lambda->elasticache": [
    {
      protocol: "tcp",
      port: 6379,
      source: "lambda-sg",
      note: "Redis from Lambda",
    },
  ],
  "ec2->ec2": [
    {
      protocol: "tcp",
      port: 8080,
      source: "ec2-sg",
      note: "Internal app traffic",
    },
  ],
  "ec2->lambda": [],
  "ec2->sns": [],
  "ec2->sqs": [],
  "lambda->sqs": [],
  "lambda->sns": [],
  "nat_gateway->internet_gateway": [],
};

/**
 * Returns a list of rule suggestions based on the current canvas edges.
 * Each suggestion includes the edge, source/target node info, and recommended rules.
 */
export function getSuggestedRules(nodes, edges) {
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const suggestions = [];

  for (const edge of edges) {
    const sourceNode = nodeMap[edge.source];
    const targetNode = nodeMap[edge.target];
    if (!sourceNode || !targetNode) continue;

    const key = `${sourceNode.type}->${targetNode.type}`;
    const rules = RULE_MATRIX[key];
    if (!rules || rules.length === 0) continue;

    suggestions.push({
      edgeId: edge.id,
      sourceLabel: sourceNode.data.label,
      sourceType: sourceNode.type,
      targetLabel: targetNode.data.label,
      targetType: targetNode.type,
      targetNodeId: targetNode.id,
      rules,
    });
  }

  return suggestions;
}
