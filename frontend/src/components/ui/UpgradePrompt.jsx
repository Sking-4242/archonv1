import useAccessStore from "../../store/accessStore";
import { UPGRADE_URL, featureLabel } from "../../utils/tierGates";

export default function UpgradePrompt({ feature, compact = false }) {
  const openAccess = useAccessStore((s) => s.openAccess);
  if (openAccess) return null;

  const label = featureLabel(feature);

  if (compact) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <span className="font-medium">{label}</span> requires a license.{" "}
        <a href={UPGRADE_URL} target="_blank" rel="noreferrer" className="underline font-semibold">
          Upgrade at archonpro.net
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="max-w-sm">
        <h3 className="text-base font-semibold text-gray-900 mb-2">Sign in to unlock</h3>
        <p className="text-sm text-gray-600 mb-4">
          {label} is available when you sign in. Self-hosted use works offline without an account for basic features.
        </p>
        <a
          href={UPGRADE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          Create account at archonpro.net
        </a>
      </div>
    </div>
  );
}
