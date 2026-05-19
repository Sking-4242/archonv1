const PROTOCOLS = [
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
  { value: "icmp", label: "ICMP" },
  { value: "-1", label: "All traffic" },
];

export default function RuleBuilder({ rule, onChange, onRemove }) {
  const portDisabled = rule.protocol === "icmp" || rule.protocol === "-1";

  return (
    <div className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2 py-1.5 border border-gray-200">
      <select
        value={rule.protocol}
        onChange={(e) =>
          onChange({ ...rule, protocol: e.target.value, port: null })
        }
        className="border border-gray-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white w-24"
      >
        {PROTOCOLS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        placeholder={portDisabled ? "N/A" : "Port / range"}
        disabled={portDisabled}
        value={portDisabled ? "" : (rule.port ?? "")}
        onChange={(e) => onChange({ ...rule, port: e.target.value })}
        className="border border-gray-200 rounded px-1.5 py-1 text-xs w-24 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
      />

      <input
        type="text"
        placeholder="Source (CIDR or sg-id)"
        value={rule.source ?? ""}
        onChange={(e) => onChange({ ...rule, source: e.target.value })}
        className="border border-gray-200 rounded px-1.5 py-1 text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />

      <button
        onClick={onRemove}
        className="text-gray-300 hover:text-red-400 text-base leading-none flex-shrink-0"
        title="Remove rule"
      >
        ✕
      </button>
    </div>
  );
}
