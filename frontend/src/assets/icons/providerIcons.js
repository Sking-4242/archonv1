import awsLogo from "./providers/aws.svg?url";
import azureLogo from "./providers/azure.svg?url";
import gcpLogo from "./providers/gcp.svg?url";

const PROVIDER_LOGOS = {
  aws: awsLogo,
  azure: azureLogo,
  gcp: gcpLogo,
};

export function getProviderLogoUrl(provider) {
  if (!provider) return null;
  return PROVIDER_LOGOS[provider] ?? null;
}
