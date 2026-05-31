import { Link } from "react-router-dom";
import { TIERS } from "../../content/siteContent";

export default function PricingPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Simple pricing</h1>
        <p className="mt-4 text-gray-600">
          Start free. Upgrade when you need validation, FinOps, discovery, or full Academy access. All plans use
          the same self-hosted install — your data stays on your machine.
        </p>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-6">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={[
              "rounded-2xl border p-6 flex flex-col",
              tier.highlight
                ? "border-indigo-500 ring-2 ring-indigo-500/20 shadow-lg"
                : "border-gray-200 bg-white",
            ].join(" ")}
          >
            {tier.highlight && (
              <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2">
                Most popular
              </span>
            )}
            <h2 className="text-lg font-bold text-gray-900">{tier.name}</h2>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-gray-900">{tier.price}</span>
              <span className="text-sm text-gray-500">{tier.period}</span>
            </div>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{tier.description}</p>
            <ul className="mt-6 space-y-2 flex-1">
              {tier.features.map((f) => (
                <li key={f} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-indigo-500 shrink-0">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            {tier.note && <p className="mt-3 text-xs text-gray-500">{tier.note}</p>}
            {tier.ctaHref.startsWith("mailto:") ? (
              <a
                href={tier.ctaHref}
                className="mt-6 block text-center py-2.5 rounded-lg text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white"
              >
                {tier.cta}
              </a>
            ) : (
              <Link
                to={tier.ctaHref}
                className="mt-6 block text-center py-2.5 rounded-lg text-sm font-semibold bg-gray-900 hover:bg-gray-800 text-white"
              >
                {tier.cta}
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm text-gray-600">
        <h3 className="font-semibold text-gray-900 mb-2">License keys</h3>
        <p>
          After purchase, your license key appears in the{" "}
          <Link to="/login" className="text-indigo-600 hover:underline">
            customer portal
          </Link>
          . Paste it in Archon Professional → Settings → Account. Institutional admins manage pool keys and seats
          from the same portal.
        </p>
      </div>
    </div>
  );
}
