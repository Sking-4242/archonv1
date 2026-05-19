import { useState, useMemo } from "react";
import { AWS_COMPONENTS, CATEGORIES as AWS_CATEGORIES } from "../../utils/awsComponentLibrary";
import { AZURE_COMPONENTS, CATEGORIES as AZURE_CATEGORIES } from "../../utils/azureComponentLibrary";
import { GCP_COMPONENTS, CATEGORIES as GCP_CATEGORIES } from "../../utils/gcpComponentLibrary";
import { ONPREM_COMPONENTS, CATEGORIES as ONPREM_CATEGORIES } from "../../utils/onpremComponentLibrary";
import { AWS_ICONS } from "../../assets/icons/awsIcons";
import { AZURE_ICONS } from "../../assets/icons/azureIcons";
import { GCP_ICONS } from "../../assets/icons/gcpIcons";

// Maps academy component IDs to provider icon keys where they differ
const ICON_ALIAS = {
  ec2_instance: "ec2",
  lambda_function: "lambda",
  s3_bucket: "s3",
  rds_instance: "rds",
  kms: "kms_key",
  secrets_manager: "secretsmanager",
  load_balancer: "alb",
  azure_load_balancer: "azure_lb",
  azure_application_gateway: "azure_agw",
  google_compute_engine: "gcp_gce",
  google_gke: "gcp_gke",
  google_cloud_run: "gcp_cloud_run",
  google_cloud_storage: "gcp_gcs",
  google_cloud_sql: "gcp_cloudsql",
  google_bigquery: "gcp_bigquery",
  google_cloud_spanner: "gcp_spanner",
  google_alloydb: "gcp_alloydb",
  google_vertex_ai: "gcp_vertex_ai",
  google_apigee: "gcp_apigee",
  google_looker: "gcp_looker",
  google_security_command_center: "gcp_scc",
};

const ALL_ICONS = { ...AWS_ICONS, ...AZURE_ICONS, ...GCP_ICONS };

function resolveIcon(componentId) {
  const key = ICON_ALIAS[componentId] ?? componentId;
  return ALL_ICONS[key] ?? null;
}

// ─── Provider configuration ───────────────────────────────────────────────────

const PROVIDERS = {
  aws: {
    id: "aws",
    name: "Amazon Web Services",
    shortName: "AWS",
    icon: "☁️",
    color: "#FF9900",
    bgClass: "bg-orange-50",
    borderClass: "border-orange-300",
    textClass: "text-orange-700",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    activePillClass: "bg-orange-500 text-white border-orange-500",
    docLabel: "AWS Documentation",
    components: AWS_COMPONENTS,
    categories: AWS_CATEGORIES,
  },
  azure: {
    id: "azure",
    name: "Microsoft Azure",
    shortName: "Azure",
    icon: "🔷",
    color: "#0078D4",
    bgClass: "bg-blue-50",
    borderClass: "border-blue-300",
    textClass: "text-blue-700",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    activePillClass: "bg-blue-600 text-white border-blue-600",
    docLabel: "Azure Documentation",
    components: AZURE_COMPONENTS,
    categories: AZURE_CATEGORIES,
  },
  gcp: {
    id: "gcp",
    name: "Google Cloud Platform",
    shortName: "GCP",
    icon: "🌈",
    color: "#4285F4",
    bgClass: "bg-indigo-50",
    borderClass: "border-indigo-300",
    textClass: "text-indigo-700",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    activePillClass: "bg-indigo-600 text-white border-indigo-600",
    docLabel: "GCP Documentation",
    components: GCP_COMPONENTS,
    categories: GCP_CATEGORIES,
  },
  onprem: {
    id: "onprem",
    name: "On-Premises",
    shortName: "On-Prem",
    icon: "🏢",
    color: "#64748b",
    bgClass: "bg-slate-50",
    borderClass: "border-slate-300",
    textClass: "text-slate-700",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    activePillClass: "bg-slate-600 text-white border-slate-600",
    docLabel: "Reference",
    components: ONPREM_COMPONENTS,
    categories: ONPREM_CATEGORIES,
  },
};

// Icons for every category key across all providers
const CATEGORY_ICONS = {
  // AWS / Azure / GCP shared
  networking:   "🌐",
  compute:      "💻",
  storage:      "🗄️",
  security:     "🔐",
  appServices:  "⚙️",
  monitoring:   "📊",
  // GCP-specific
  dataAnalytics: "📈",
  // On-Prem specific
  datacenter:   "🏢",
};

const ALL_CATEGORIES = "all";

// ─── Provider Picker ──────────────────────────────────────────────────────────

function ProviderPicker({ activeProvider, onSelect }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {Object.values(PROVIDERS).map((p) => {
        const isActive = activeProvider === p.id;
        return (
          <button
            key={p.id}
            onClick={() => onSelect(p.id)}
            className={`
              flex flex-col items-center gap-2 px-4 py-4 rounded-xl border-2 font-medium
              transition-all text-sm
              ${isActive
                ? `${p.bgClass} ${p.borderClass} ${p.textClass} shadow-sm`
                : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:shadow-sm"
              }
            `}
          >
            <span className="text-2xl">{p.icon}</span>
            <span className="text-xs font-semibold">{p.shortName}</span>
            <span className={`text-xs font-normal ${isActive ? p.textClass : "text-gray-400"}`}>
              {p.components.length} components
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

function Drawer({ component, categories, allComponents, docLabel, badgeClass, onClose }) {
  if (!component) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-white z-50 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {resolveIcon(component.id) ? (
              <img src={resolveIcon(component.id)} alt={component.name} className="w-9 h-9 object-contain flex-shrink-0" />
            ) : (
              <span className="text-3xl">{component.icon}</span>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{component.name}</h2>
              <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${badgeClass}`}>
                {categories[component.category]}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Description */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Overview
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">{component.description}</p>
          </section>

          {/* When to use */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              When to Use
            </h3>
            <ul className="space-y-2">
              {component.whenToUse.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-blue-500 mt-0.5 flex-shrink-0">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Common mistakes */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Common Mistakes
            </h3>
            <ul className="space-y-2">
              {component.commonMistakes.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Typical connections */}
          {component.typicalConnections?.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Typically Connects To
              </h3>
              <div className="flex flex-wrap gap-2">
                {component.typicalConnections.map((id) => {
                  const linked = allComponents.find((c) => c.id === id);
                  return (
                    <span
                      key={id}
                      className="text-xs bg-gray-100 text-gray-700 rounded-full px-3 py-1 flex items-center gap-1"
                    >
                      {linked ? (
                        <>
                          <span>{linked.icon}</span>
                          <span>{linked.name}</span>
                        </>
                      ) : (
                        id
                      )}
                    </span>
                  );
                })}
              </div>
            </section>
          )}

          {/* Pricing */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Pricing Model
            </h3>
            <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    component.freeTier && component.freeTier !== "N/A" && component.freeTier !== "None"
                      ? "bg-green-50 text-green-700 border-green-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  {component.freeTier && component.freeTier !== "N/A" && component.freeTier !== "None"
                    ? "✓ Free Tier"
                    : "No Free Tier"}
                </span>
              </div>
              <p className="text-sm text-gray-600">{component.pricingModel}</p>
              {component.freeTier && component.freeTier !== "N/A" && component.freeTier !== "None" && (
                <p className="text-xs text-green-700 mt-1">{component.freeTier}</p>
              )}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4">
          <a
            href={component.docUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:border-blue-300 hover:text-blue-600 text-gray-600 text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            {docLabel}
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function ComponentCard({ component, onClick }) {
  const hasFreeTier =
    component.freeTier &&
    component.freeTier !== "N/A" &&
    component.freeTier !== "None";

  return (
    <button
      onClick={() => onClick(component)}
      className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-blue-300 hover:shadow-sm transition-all group w-full"
    >
      <div className="flex items-start gap-3">
        {resolveIcon(component.id) ? (
          <img src={resolveIcon(component.id)} alt={component.name} className="w-7 h-7 object-contain flex-shrink-0 mt-0.5" />
        ) : (
          <span className="text-2xl flex-shrink-0">{component.icon}</span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
              {component.name}
            </span>
            {hasFreeTier && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-1.5 py-0.5">
                Free Tier
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
            {component.shortDescription}
          </p>
        </div>
        <svg
          className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </button>
  );
}

// ─── Main Library ─────────────────────────────────────────────────────────────

export default function StudentLibrary() {
  const [activeProvider, setActiveProvider] = useState("aws");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState(ALL_CATEGORIES);
  const [selectedComponent, setSelectedComponent] = useState(null);

  const provider = PROVIDERS[activeProvider];

  function handleProviderSelect(id) {
    setActiveProvider(id);
    setSearch("");
    setActiveCategory(ALL_CATEGORIES);
    setSelectedComponent(null);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return provider.components.filter((c) => {
      const matchesCategory =
        activeCategory === ALL_CATEGORIES || c.category === activeCategory;
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.shortDescription.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        provider.categories[c.category]?.toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });
  }, [search, activeCategory, provider]);

  const grouped = useMemo(() => {
    const order = Object.keys(provider.categories);
    const map = {};
    for (const c of filtered) {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    }
    return order
      .filter((k) => map[k]?.length > 0)
      .map((k) => ({
        key: k,
        label: provider.categories[k],
        icon: CATEGORY_ICONS[k] ?? "📦",
        items: map[k],
      }));
  }, [filtered, provider]);

  const totalCount = provider.components.length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Component Library</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Select a cloud provider to explore its components — what they do, when to use them, and common pitfalls.
        </p>
      </div>

      {/* Provider picker */}
      <ProviderPicker activeProvider={activeProvider} onSelect={handleProviderSelect} />

      {/* Divider with provider label */}
      <div className="flex items-center gap-3">
        <span className={`text-sm font-semibold ${provider.textClass}`}>
          {provider.icon} {provider.name}
        </span>
        <div className="flex-1 h-px bg-gray-100" />
        <span className="text-xs text-gray-400">{totalCount} components</span>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder={`Search ${provider.shortName} components…`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-colors"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory(ALL_CATEGORIES)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            activeCategory === ALL_CATEGORIES
              ? provider.activePillClass
              : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800"
          }`}
        >
          All ({totalCount})
        </button>
        {Object.entries(provider.categories).map(([key, label]) => {
          const count = provider.components.filter((c) => c.category === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveCategory(key === activeCategory ? ALL_CATEGORIES : key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                activeCategory === key
                  ? provider.activePillClass
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:text-gray-800"
              }`}
            >
              <span>{CATEGORY_ICONS[key] ?? "📦"}</span>
              <span>{label}</span>
              <span className={activeCategory === key ? "opacity-70" : "text-gray-400"}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-2xl mb-2">🔍</div>
          <div className="text-sm font-medium text-gray-600">
            No components match &ldquo;{search}&rdquo;
          </div>
          <button
            onClick={() => { setSearch(""); setActiveCategory(ALL_CATEGORIES); }}
            className="mt-3 text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{group.icon}</span>
                <h2 className="text-sm font-semibold text-gray-700">{group.label}</h2>
                <span className="text-xs text-gray-400">{group.items.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {group.items.map((c) => (
                  <ComponentCard key={c.id} component={c} onClick={setSelectedComponent} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Slide-out drawer */}
      <Drawer
        component={selectedComponent}
        categories={provider.categories}
        allComponents={provider.components}
        docLabel={provider.docLabel}
        badgeClass={provider.badgeClass}
        onClose={() => setSelectedComponent(null)}
      />
    </div>
  );
}
