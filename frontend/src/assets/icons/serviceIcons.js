import { AWS_ICONS } from "./awsIcons";
import { AZURE_ICONS } from "./azureIcons";
import { GCP_ICONS } from "./gcpIcons";

/** Archon node type → icon filename when they differ. */
const ICON_ALIASES = {
  kms: "kms_key",
  secrets_manager: "secretsmanager",
  generic_tf: "cloudformation",
  terraform_module: "cloudformation",
  security_group: "shield",
  ses: "sns",
  network_firewall: "waf",
  memorydb: "elasticache",
};

export const ALL_SERVICE_ICONS = {
  ...AWS_ICONS,
  ...AZURE_ICONS,
  ...GCP_ICONS,
};

/**
 * Resolve the SVG URL for a canvas node type.
 * Falls back through aliases; returns null when no icon is available.
 */
export function getServiceIconUrl(nodeType) {
  if (!nodeType) return null;
  const key = ICON_ALIASES[nodeType] ?? nodeType;
  return ALL_SERVICE_ICONS[key] ?? null;
}
