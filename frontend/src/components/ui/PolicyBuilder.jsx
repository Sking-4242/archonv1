export default function PolicyBuilder({ statement, onChange, onRemove }) {
  const handleActionsChange = (raw) => {
    const actions = raw
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);
    onChange({ ...statement, actions });
  };

  const handleResourcesChange = (raw) => {
    const resources = raw
      .split("\n")
      .map((r) => r.trim())
      .filter(Boolean);
    onChange({ ...statement, resources });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
      <div className="flex items-center justify-between">
        <select
          value={statement.effect}
          onChange={(e) => onChange({ ...statement, effect: e.target.value })}
          className="border border-gray-200 rounded px-2 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
        >
          <option value="Allow">Allow</option>
          <option value="Deny">Deny</option>
        </select>
        <button
          onClick={onRemove}
          className="text-gray-300 hover:text-red-400 text-sm"
          title="Remove statement"
        >
          ✕
        </button>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-0.5">
          Actions <span className="text-gray-400">(one per line)</span>
        </label>
        <textarea
          rows={3}
          value={(statement.actions ?? []).join("\n")}
          onChange={(e) => handleActionsChange(e.target.value)}
          placeholder={"s3:GetObject\ns3:PutObject"}
          className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-0.5">
          Resources <span className="text-gray-400">(one per line)</span>
        </label>
        <textarea
          rows={2}
          value={(statement.resources ?? []).join("\n")}
          onChange={(e) => handleResourcesChange(e.target.value)}
          placeholder={"arn:aws:s3:::my-bucket/*"}
          className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
        />
      </div>
    </div>
  );
}
