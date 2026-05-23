import useProviderStore from "../../store/providerStore";
import useGraphStore from "../../store/graphStore";

const PROVIDERS = [
  { id: "aws",    label: "AWS"     },
  { id: "azure",  label: "Azure"   },
  { id: "gcp",    label: "GCP"     },
  { id: "onprem", label: "On-Prem" },
];

export default function ProviderSelector() {
  const infraProvider = useProviderStore((s) => s.infraProvider);
  const setInfraProvider = useProviderStore((s) => s.setInfraProvider);
  const nodes = useGraphStore((s) => s.nodes);
  const resetState = useGraphStore((s) => s.resetState);

  const handleSwitch = (newProvider) => {
    if (newProvider === infraProvider) return;
    if (nodes.length > 0) {
      const ok = window.confirm(
        `Switch to ${newProvider.toUpperCase()}? This will clear the current canvas.`,
      );
      if (!ok) return;
      resetState();
    }
    setInfraProvider(newProvider);
  };

  return (
    <div className="px-3 py-2 border-b border-gray-700">
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
        Provider
      </div>
      <div className="grid grid-cols-2 gap-1">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            onClick={() => handleSwitch(p.id)}
            className={[
              "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors",
              infraProvider === p.id
                ? "bg-indigo-600 text-white font-medium"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700",
            ].join(" ")}
          >
            <span>{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
