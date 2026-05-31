import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listModules } from "../../api/modules";
import useAccessStore from "../../store/accessStore";
import UpgradePrompt from "../ui/UpgradePrompt";
import { canAccessCourseProvider, canAccessModule } from "../../utils/tierGates";

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  beginner:     { label: "Beginner",     color: "text-green-700 bg-green-50 border-green-200" },
  intermediate: { label: "Intermediate", color: "text-blue-700 bg-blue-50 border-blue-200" },
  advanced:     { label: "Advanced",     color: "text-orange-700 bg-orange-50 border-orange-200" },
  expert:       { label: "Expert",       color: "text-red-700 bg-red-50 border-red-200" },
};

const CERT_LABELS = {
  // AWS
  aws_ccp:  "AWS CCP",
  aws_saa:  "AWS SAA",
  aws_sap:  "AWS SAP",
  aws_dva:  "AWS DVA",
  aws_soa:  "AWS SOA",
  aws_dop:  "AWS DOP",
  aws_scs:  "AWS SCS",
  aws_ans:  "AWS ANS",
  aws_dbs:  "AWS DBS",
  aws_dea:  "AWS DEA",
  aws_mla:  "AWS MLA",
  aws_mls:  "AWS MLS",
  // Azure
  az_900:   "AZ-900",
  az_104:   "AZ-104",
  az_204:   "AZ-204",
  az_305:   "AZ-305",
  az_400:   "AZ-400",
  az_500:   "AZ-500",
  az_700:   "AZ-700",
  dp_900:   "DP-900",
  dp_203:   "DP-203",
  dp_300:   "DP-300",
  // GCP
  gcp_cdl:  "GCP CDL",
  gcp_ace:  "GCP ACE",
  gcp_pca:  "GCP PCA",
  gcp_pde:  "GCP PDE",
  gcp_pdoe: "GCP PDOE",
  gcp_pne:  "GCP PNE",
  gcp_pse:  "GCP PSE",
  gcp_pmle: "GCP PMLE",
};

// ── Progress bar ──────────────────────────────────────────────────────────────

function ProgressBar({ completed, total }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">
          {completed} / {total} lessons
        </span>
        <span className="text-xs font-medium text-gray-700">{pct}%</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Module card ───────────────────────────────────────────────────────────────

function ModuleCard({ module, course, locked, onClick }) {
  const diff = DIFFICULTY_CONFIG[module.difficulty_level] ?? DIFFICULTY_CONFIG.beginner;
  const isComplete =
    module.lesson_count > 0 && module.completed_lesson_count === module.lesson_count;

  return (
    <button
      onClick={() => onClick(module, locked)}
      className={`bg-white border rounded-xl p-5 text-left transition-all group w-full flex flex-col gap-4 ${
        locked
          ? "border-gray-200 opacity-80 hover:border-amber-300"
          : "border-gray-200 hover:border-blue-300 hover:shadow-sm"
      }`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
              {module.title}
            </h3>
            {isComplete && (
              <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5 flex-shrink-0">
                ✓ Complete
              </span>
            )}
            {locked && (
              <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-full px-2 py-0.5 flex-shrink-0">
                🔒 License required
              </span>
            )}
          </div>
          {module.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
              {module.description}
            </p>
          )}
        </div>
        <svg
          className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-0.5"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${diff.color}`}>
          {diff.label}
        </span>
        {(module.certification_tags || []).map((tag) => (
          <span key={tag} className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
            {CERT_LABELS[tag] ?? tag}
          </span>
        ))}
        {module.assignment_count > 0 && (
          <span className="text-xs text-gray-400 ml-auto">
            {module.assignment_count} assignment{module.assignment_count !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Progress */}
      {module.lesson_count > 0 && (
        <ProgressBar
          completed={module.completed_lesson_count}
          total={module.lesson_count}
        />
      )}

      {module.lesson_count === 0 && (
        <div className="text-xs text-gray-400">No lessons yet</div>
      )}
    </button>
  );
}

// ── Provider config ───────────────────────────────────────────────────────────

const PROVIDERS = [
  { id: "aws",   label: "AWS",   icon: "☁️",  active: "bg-orange-500 text-white border-orange-500", inactive: "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600" },
  { id: "azure", label: "Azure", icon: "🔷", active: "bg-blue-600 text-white border-blue-600",   inactive: "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600" },
  { id: "gcp",   label: "GCP",   icon: "🔴",  active: "bg-red-500 text-white border-red-500",    inactive: "bg-white text-gray-600 border-gray-200 hover:border-red-400 hover:text-red-500" },
];

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StudentModules() {
  const navigate = useNavigate();
  const canUse = useAccessStore((s) => s.canUse);
  const [provider, setProvider] = useState("aws");
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [upgradeFeature, setUpgradeFeature] = useState(null);

  const providerLocked = !canAccessCourseProvider(provider, canUse);

  useEffect(() => {
    setLoading(true);
    setFilter("all");
    setUpgradeFeature(null);
    listModules(provider)
      .then(setModules)
      .catch(() => setModules([]))
      .finally(() => setLoading(false));
  }, [provider]);

  function handleModuleClick(module, locked) {
    if (locked) {
      setUpgradeFeature("academy_all_certs");
      return;
    }
    navigate(`/modules/${module.id}`);
  }

  function handleProviderChange(next) {
    if (!canAccessCourseProvider(next, canUse)) {
      setUpgradeFeature("academy_all_certs");
      return;
    }
    setProvider(next);
    setUpgradeFeature(null);
  }

  const allCerts = [...new Set(modules.flatMap((m) => m.certification_tags || []))];

  const filtered = modules.filter((m) => {
    if (filter === "all") return true;
    if (Object.keys(DIFFICULTY_CONFIG).includes(filter)) return m.difficulty_level === filter;
    return (m.certification_tags || []).includes(filter);
  });

  const completedCount = modules.filter(
    (m) => m.lesson_count > 0 && m.completed_lesson_count === m.lesson_count
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Modules</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {modules.length} module{modules.length !== 1 ? "s" : ""} · {completedCount} completed
          </p>
        </div>
        <div className="flex gap-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all ${
                provider === p.id ? p.active : p.inactive
              }`}
            >
              <span>{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {upgradeFeature && (
        <UpgradePrompt feature={upgradeFeature} compact />
      )}

      {providerLocked && !upgradeFeature && (
        <UpgradePrompt
          feature="academy_all_certs"
          message="Azure and GCP certification tracks require an Academy license."
        />
      )}

      {/* Filter pills */}
      {modules.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              filter === "all"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            All ({modules.length})
          </button>
          {Object.entries(DIFFICULTY_CONFIG).map(([key, cfg]) => {
            const count = modules.filter((m) => m.difficulty_level === key).length;
            if (count === 0) return null;
            return (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? "all" : key)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  filter === key
                    ? `${cfg.color}`
                    : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
          {allCerts.map((cert) => (
            <button
              key={cert}
              onClick={() => setFilter(filter === cert ? "all" : cert)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filter === cert
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {CERT_LABELS[cert] ?? cert}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          Loading modules…
        </div>
      ) : modules.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-2xl mb-2">📦</div>
          <div className="text-sm font-medium text-gray-600">No modules published yet</div>
          <div className="text-xs text-gray-400 mt-1">
            Check back soon — your instructor is preparing course content.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-sm text-gray-500">No modules match this filter</div>
          <button onClick={() => setFilter("all")} className="mt-2 text-sm text-blue-600">
            Clear filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((module) => {
            const moduleWithCourse = { ...module, course: module.course || provider };
            const locked = !canAccessModule(moduleWithCourse, canUse);
            return (
              <ModuleCard
                key={module.id}
                module={module}
                course={provider}
                locked={locked}
                onClick={handleModuleClick}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
