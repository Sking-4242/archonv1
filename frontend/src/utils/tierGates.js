export function featureLabel(feature) {
  const labels = {
    validation_engine: "Full validation engine",
    finops_live: "FinOps live analysis",
    terraform_import: "Terraform import",
    terraform_plan: "Terraform plan visualization",
    discovery: "AWS discovery",
    live_pricing: "Live pricing API",
    gitops: "GitOps integration",
  };
  return labels[feature] ?? feature;
}

export const UPGRADE_URL = import.meta.env.VITE_ARCHONPRO_URL ?? "https://archonpro.net";
