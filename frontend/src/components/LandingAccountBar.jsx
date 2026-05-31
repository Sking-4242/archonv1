import useAuthStore from "../store/authStore";
import useAccessStore from "../store/accessStore";

export default function LandingAccountBar({ onOpenAccount }) {
  const user = useAuthStore((s) => s.user);
  const { hasFullAccess, openAccess, loaded } = useAccessStore();

  if (!loaded) {
    return (
      <button
        type="button"
        onClick={onOpenAccount}
        className="text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600"
      >
        Account
      </button>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        {!openAccess && (
          <span className="hidden lg:inline text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg">
            Validation &amp; FinOps require a license
          </span>
        )}
        <button
          type="button"
          onClick={onOpenAccount}
          className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
        >
          {openAccess ? "Sign in" : "Sign in / License"}
        </button>
      </div>
    );
  }

  const label = hasFullAccess
    ? user.role === "admin"
      ? "Admin · full access"
      : openAccess
        ? "Full access"
        : "Licensed"
    : "Free tier";

  return (
    <div className="flex items-center gap-3">
      <span
        className={[
          "text-xs px-2 py-1 rounded-lg border",
          hasFullAccess
            ? "text-emerald-800 bg-emerald-50 border-emerald-200"
            : "text-amber-800 bg-amber-50 border-amber-200",
        ].join(" ")}
      >
        {user.display_name || user.email} · {label}
      </span>
      <button
        type="button"
        onClick={onOpenAccount}
        className="text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
      >
        {hasFullAccess ? "Account" : openAccess ? "Sign in" : "Add license key"}
      </button>
    </div>
  );
}
