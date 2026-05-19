import { useState } from "react";
import useArchiveStore from "../store/archiveStore";
import useSettingsStore from "../store/settingsStore";
import useProviderStore from "../store/providerStore";

// ── Constants ────────────────────────────────────────────────────────────────

const PROVIDER_ICONS = { aws: "☁️", azure: "🔷", gcp: "🟡", onprem: "🖥️" };
const PROVIDER_LABELS = { aws: "AWS", azure: "Azure", gcp: "GCP", onprem: "On-Prem" };

const INFRA_PROVIDERS = [
  { id: "aws",    label: "AWS",     icon: "☁️" },
  { id: "azure",  label: "Azure",   icon: "🔷" },
  { id: "gcp",    label: "GCP",     icon: "🟡" },
  { id: "onprem", label: "On-Prem", icon: "🖥️" },
];

const AI_PROVIDERS = [
  { id: "anthropic", label: "Anthropic" },
  { id: "openai",    label: "OpenAI"    },
  { id: "gemini",    label: "Gemini"    },
  { id: "ollama",    label: "Ollama (local)" },
  { id: "xai",       label: "xAI"       },
];

const AI_MODELS = {
  anthropic: ["claude-sonnet-4-6", "claude-opus-4-6", "claude-haiku-4-5-20251001"],
  openai:    ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "o3", "o4-mini"],
  gemini:    ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
  ollama:    ["llama4", "llama3.3", "llama3.2", "mistral", "phi4", "codellama"],
  xai:       ["grok-3", "grok-3-fast", "grok-3-mini"],
};

const REGIONS_BY_PROVIDER = {
  aws:    ["us-east-1","us-east-2","us-west-1","us-west-2","ca-central-1","eu-west-1","eu-west-2","eu-central-1","ap-northeast-1","ap-southeast-1","ap-south-1","sa-east-1"],
  azure:  ["eastus","eastus2","westus","westus2","westus3","centralus","northeurope","westeurope","uksouth","eastasia","southeastasia","japaneast","australiaeast","brazilsouth"],
  gcp:    ["us-central1","us-east1","us-east4","us-west1","us-west2","northamerica-northeast1","europe-west1","europe-west2","europe-west4","asia-east1","asia-northeast1","asia-southeast1","australia-southeast1"],
  onprem: ["on-premises"],
};

const CATEGORY_COLORS = {
  networking:  "#6366f1",
  compute:     "#10b981",
  database:    "#f59e0b",
  storage:     "#3b82f6",
  security:    "#ef4444",
  integration: "#8b5cf6",
  messaging:   "#8b5cf6",
  analytics:   "#06b6d4",
  ai_ml:       "#ec4899",
};
const DEFAULT_COLOR = "#94a3b8";

const GITHUB_BASE = "https://github.com/sking-4242/archon";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ── SVG Thumbnail ─────────────────────────────────────────────────────────────

function ArchitectureThumbnail({ graph }) {
  const W = 200;
  const H = 120;
  const PAD = 8;

  const nodes = graph?.components ?? [];
  const edges = graph?.edges ?? [];

  if (nodes.length === 0) {
    return (
      <svg width={W} height={H} className="rounded-lg bg-gray-100 border border-gray-200 flex-shrink-0">
        <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="middle" fill="#d1d5db" fontSize={11}>
          Empty
        </text>
      </svg>
    );
  }

  // Bounding box — treat nodes as 120×60 boxes
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + 120);
    maxY = Math.max(maxY, n.position.y + 60);
  }
  const rangeX = maxX - minX || 200;
  const rangeY = maxY - minY || 120;
  const drawW = W - PAD * 2;
  const drawH = H - PAD * 2;
  const scale = Math.min(drawW / rangeX, drawH / rangeY);

  // Map node id → center position in SVG coords
  const nodeMap = {};
  for (const n of nodes) {
    nodeMap[n.id] = {
      x: PAD + (n.position.x + 60 - minX) * scale,
      y: PAD + (n.position.y + 30 - minY) * scale,
    };
  }

  const sz = Math.max(5, Math.min(11, 140 / Math.sqrt(nodes.length)));

  return (
    <svg width={W} height={H} className="rounded-lg border border-gray-200 flex-shrink-0" style={{ background: "#f8fafc" }}>
      {/* Edges */}
      {edges.map((e) => {
        const s = nodeMap[e.source];
        const t = nodeMap[e.target];
        if (!s || !t) return null;
        return (
          <line key={e.id} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
            stroke="#cbd5e1" strokeWidth={0.8} />
        );
      })}
      {/* Nodes */}
      {nodes.map((n) => {
        const p = nodeMap[n.id];
        if (!p) return null;
        const color = CATEGORY_COLORS[n.data?.category] ?? DEFAULT_COLOR;
        const icon = n.data?.icon ?? "";
        return (
          <g key={n.id}>
            <rect
              x={p.x - sz / 2} y={p.y - sz / 2}
              width={sz} height={sz}
              rx={2}
              fill={color} fillOpacity={0.75}
            />
            {sz >= 9 && (
              <text x={p.x} y={p.y + sz + 3} textAnchor="middle"
                fontSize={7} fill="#64748b">
                {icon}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Quadrant 1: New Architecture ──────────────────────────────────────────────

function NewArchitecturePanel({ onNewCanvas }) {
  const infraProvider  = useProviderStore((s) => s.infraProvider);
  const setInfraProvider = useProviderStore((s) => s.setInfraProvider);

  const aiProvider     = useSettingsStore((s) => s.provider);
  const setAiProvider  = useSettingsStore((s) => s.setProvider);
  const apiKeys        = useSettingsStore((s) => s.apiKeys);
  const setApiKey      = useSettingsStore((s) => s.setApiKey);
  const models         = useSettingsStore((s) => s.models);
  const setModel       = useSettingsStore((s) => s.setModel);
  const ollamaBaseUrl  = useSettingsStore((s) => s.ollamaBaseUrl);
  const setOllamaUrl   = useSettingsStore((s) => s.setOllamaBaseUrl);

  const regionList = REGIONS_BY_PROVIDER[infraProvider] ?? REGIONS_BY_PROVIDER.aws;
  const [archName, setArchName] = useState("My Architecture");
  const [region,   setRegion]   = useState(regionList[0]);

  const handleProviderChange = (id) => {
    setInfraProvider(id);
    setRegion(REGIONS_BY_PROVIDER[id]?.[0] ?? "us-east-1");
  };

  const needsKey  = aiProvider !== "ollama";
  const curKey    = apiKeys[aiProvider] ?? "";
  const curModel  = models[aiProvider]  ?? (AI_MODELS[aiProvider]?.[0] ?? "");
  const modelList = AI_MODELS[aiProvider] ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-3 border-b border-gray-100">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <span className="text-indigo-500">✦</span> New Architecture
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {/* Architecture Name */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
            Name
          </label>
          <input
            type="text"
            value={archName}
            onChange={(e) => setArchName(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            placeholder="My Architecture"
          />
        </div>

        {/* Cloud Provider */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
            Cloud Provider
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {INFRA_PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={[
                  "flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-semibold transition-all",
                  infraProvider === p.id
                    ? "border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50",
                ].join(" ")}
              >
                <span className="text-xl">{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Region */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
            Region
          </label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {regionList.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div className="border-t border-gray-100 pt-1" />

        {/* AI Provider */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
            AI Provider
          </label>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {AI_PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>

        {/* API Key / Ollama URL */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
            {needsKey ? "API Key" : "Ollama URL"}
          </label>
          <input
            type={needsKey ? "password" : "text"}
            value={needsKey ? curKey : ollamaBaseUrl}
            onChange={(e) =>
              needsKey
                ? setApiKey(aiProvider, e.target.value)
                : setOllamaUrl(e.target.value)
            }
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder={needsKey ? `${aiProvider} API key…` : "http://localhost:11434"}
          />
        </div>

        {/* Model */}
        <div>
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
            Model
          </label>
          <select
            value={curModel}
            onChange={(e) => setModel(aiProvider, e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {modelList.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="px-6 pb-5 pt-3 border-t border-gray-100 flex-shrink-0">
        <button
          onClick={() => onNewCanvas(infraProvider, { name: archName, region })}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-colors shadow-sm"
        >
          Create Architecture →
        </button>
      </div>
    </div>
  );
}

// ── Quadrant 2: Saved Architectures ───────────────────────────────────────────

function SavedArchitecturesPanel({ onLoadArchive }) {
  const entries          = useArchiveStore((s) => s.entries);
  const deleteArchitecture = useArchiveStore((s) => s.deleteArchitecture);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const handleDelete = (id) => {
    if (confirmDelete === id) {
      deleteArchitecture(id);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(id);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <span>📁</span> Saved Architectures
        </h2>
        {entries.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
            {entries.length}
          </span>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="text-5xl mb-4">📐</div>
          <p className="text-sm font-semibold text-gray-600">No saved architectures yet</p>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            Build an architecture on the canvas, then hit{" "}
            <span className="text-indigo-500 font-medium">Save to Library</span> in the nav bar.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
            >
              {/* Mini preview */}
              <ArchitectureThumbnail graph={entry.graph} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-gray-800 truncate">{entry.name}</div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                  <span className="text-base leading-none">{PROVIDER_ICONS[entry.provider] ?? "📐"}</span>
                  <span className="text-xs text-gray-500 font-medium">{PROVIDER_LABELS[entry.provider]}</span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-xs text-gray-400">{entry.componentCount} components</span>
                  <span className="text-gray-300 text-xs">·</span>
                  <span className="text-xs text-gray-400">{timeAgo(entry.savedAt)}</span>
                </div>
                <div className="flex items-center gap-2 mt-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onLoadArchive(entry)}
                    className="text-xs px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors font-medium"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className={`text-xs px-3 py-1 rounded-lg transition-colors font-medium ${
                      confirmDelete === entry.id
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-500"
                    }`}
                  >
                    {confirmDelete === entry.id ? "Confirm?" : "Delete"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Quadrant 3: Import Terraform ──────────────────────────────────────────────

function ImportTerraformPanel({ onImportTF }) {
  const features = [
    { label: "Canvas nodes & layout" },
    { label: "Edges & connections"   },
    { label: "Security groups"       },
    { label: "IAM roles"             },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <span className="text-violet-500">⬡</span> Import Terraform
        </h2>
      </div>

      <div className="flex-1 flex flex-col px-6 py-5 min-h-0">
        {/* Drop-zone CTA */}
        <button
          onClick={onImportTF}
          className="flex-1 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 hover:border-violet-300 hover:bg-violet-50 transition-all group cursor-pointer min-h-0"
        >
          <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center text-2xl mb-3 group-hover:scale-105 transition-transform shadow-sm">
            📂
          </div>
          <p className="text-sm font-semibold text-gray-700 group-hover:text-violet-700 transition-colors">
            Click to select .tf files
          </p>
          <p className="text-xs text-gray-400 mt-1.5 text-center max-w-[220px] leading-relaxed">
            Import one or more Terraform files and instantly visualise them as an architecture diagram
          </p>
          <div className="mt-4 px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-colors shadow-sm">
            Browse Files
          </div>
        </button>

        {/* What gets imported */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex-shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">
            What gets imported
          </p>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-3">
            {features.map((f) => (
              <div key={f.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="text-emerald-500 font-bold">✓</span>
                {f.label}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
            Unknown resource types render as generic nodes. Multi-file projects supported — select all .tf files at once.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Quadrant 4: Suggestions & Issues ─────────────────────────────────────────

function SuggestionsPanel() {
  const links = [
    {
      href: `${GITHUB_BASE}/issues`,
      title: "View All Issues",
      desc: "Browse open bugs and feature requests",
      hoverBorder: "hover:border-indigo-300",
      hoverBg: "hover:bg-indigo-50",
      hoverText: "group-hover:text-indigo-700",
      hoverArrow: "group-hover:text-indigo-500",
    },
    {
      href: `${GITHUB_BASE}/issues/new?labels=bug&title=%5BBug%5D%20`,
      title: "Report a Bug 🐛",
      desc: "Something broken? Tell us what happened",
      hoverBorder: "hover:border-red-300",
      hoverBg: "hover:bg-red-50",
      hoverText: "group-hover:text-red-700",
      hoverArrow: "group-hover:text-red-500",
    },
    {
      href: `${GITHUB_BASE}/issues/new?labels=enhancement&title=%5BFeature%5D%20`,
      title: "Request a Feature ✨",
      desc: "Have an idea? We'd love to hear it",
      hoverBorder: "hover:border-emerald-300",
      hoverBg: "hover:bg-emerald-50",
      hoverText: "group-hover:text-emerald-700",
      hoverArrow: "group-hover:text-emerald-500",
    },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
      <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-base font-bold text-gray-800 flex items-center gap-2">
          <span>💡</span> Suggestions &amp; Issues
        </h2>
      </div>

      <div className="flex-1 flex flex-col px-6 py-5">
        <p className="text-sm text-gray-500 mb-5 leading-relaxed">
          Found a bug or have a feature idea? We track everything on GitHub.
          Pick the option that fits best.
        </p>

        <div className="space-y-3">
          {links.map((lnk) => (
            <a
              key={lnk.href}
              href={lnk.href}
              target="_blank"
              rel="noreferrer"
              className={[
                "flex items-center justify-between w-full px-4 py-3 rounded-xl border border-gray-200 transition-all group",
                lnk.hoverBorder,
                lnk.hoverBg,
              ].join(" ")}
            >
              <div>
                <div className={`text-sm font-semibold text-gray-700 ${lnk.hoverText}`}>
                  {lnk.title}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{lnk.desc}</div>
              </div>
              <span className={`text-gray-300 text-lg ml-3 ${lnk.hoverArrow} transition-colors`}>↗</span>
            </a>
          ))}
        </div>

        <div className="mt-auto pt-5 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">
            <a
              href={GITHUB_BASE}
              target="_blank"
              rel="noreferrer"
              className="hover:text-indigo-500 transition-colors"
            >
              github.com/sking-4242/archon
            </a>
          </p>
        
        </div>
      </div>
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function LandingPage({ onNewCanvas, onLoadArchive, onOpenTemplates, onImportTF }) {
  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold text-indigo-600 tracking-widest">ARCHON</span>
          <span className="text-gray-400 text-xs">v0.3.0</span>
        </div>
        <button
          onClick={onOpenTemplates}
          className="text-sm px-4 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-colors"
        >
          Browse Templates
        </button>
      </header>

      {/* 2×2 grid — fills remaining height */}
      <main className="flex-1 p-5 grid grid-cols-2 grid-rows-2 gap-4 min-h-0">
        <NewArchitecturePanel    onNewCanvas={onNewCanvas} />
        <SavedArchitecturesPanel onLoadArchive={onLoadArchive} />
        <ImportTerraformPanel    onImportTF={onImportTF} />
        <SuggestionsPanel />
      </main>
    </div>
  );
}
