import { getProviderLogoUrl } from "../../assets/icons/providerIcons";

/** Cloud provider brand marks for selectors, headers, and landing page. */
export default function ProviderLogo({ provider, size = 28, className = "" }) {
  const src = getProviderLogoUrl(provider);

  if (src) {
    return (
      <img
        src={src}
        alt={PROVIDER_LABELS[provider] ?? provider}
        width={size}
        height={size}
        className={["object-contain flex-shrink-0", className].join(" ")}
        draggable={false}
      />
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-label="On-Prem"
      className={className}
    >
      <rect width="48" height="48" rx="9" fill="#475569" />
      <rect x="12" y="14" width="24" height="6" rx="2" fill="white" opacity="0.9" />
      <rect x="12" y="22" width="24" height="6" rx="2" fill="white" opacity="0.7" />
      <rect x="12" y="30" width="24" height="6" rx="2" fill="white" opacity="0.5" />
      <circle cx="32" cy="17" r="1.5" fill="#4ade80" />
      <circle cx="32" cy="25" r="1.5" fill="#4ade80" />
      <circle cx="32" cy="33" r="1.5" fill="#facc15" />
    </svg>
  );
}

export const PROVIDER_LABELS = {
  aws: "AWS",
  azure: "Azure",
  gcp: "GCP",
  onprem: "On-Prem",
};
