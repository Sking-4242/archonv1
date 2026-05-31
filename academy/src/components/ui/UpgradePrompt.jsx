import useAccessStore from "../../store/accessStore";
import { UPGRADE_URL, featureLabel } from "../../utils/tierGates";

export default function UpgradePrompt({ feature, compact = false, message }) {
  const openAccess = useAccessStore((s) => s.openAccess);
  if (openAccess) return null;

  const label = feature ? featureLabel(feature) : "This content";
  const text = message ?? `${label} requires an Academy account.`;

  if (compact) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        {text}{" "}
        <a href={UPGRADE_URL} target="_blank" rel="noreferrer" className="underline font-semibold">
          Sign in at archonpro.net
        </a>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-10 text-center max-w-md mx-auto">
      <div className="text-3xl mb-3">🔒</div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Sign in to unlock</h2>
      <p className="text-sm text-gray-600 mb-5">{text}</p>
      <a
        href={UPGRADE_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
      >
        Create account at archonpro.net
      </a>
    </div>
  );
}
