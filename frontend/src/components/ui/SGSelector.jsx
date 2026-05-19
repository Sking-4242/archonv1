import useSecurityStore from "../../store/securityStore";

export default function SGSelector({ selectedIds, onChange, vpcId }) {
  const securityGroups = useSecurityStore((s) => s.securityGroups);

  const filtered = vpcId
    ? securityGroups.filter((sg) => !sg.vpc_id || sg.vpc_id === vpcId)
    : securityGroups;

  if (filtered.length === 0) {
    return (
      <p className="text-xs text-gray-400 italic">
        No security groups defined yet. Create one in the Security tab.
      </p>
    );
  }

  const toggle = (id) => {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id];
    onChange(next);
  };

  return (
    <div className="space-y-1">
      {filtered.map((sg) => (
        <label
          key={sg.id}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <input
            type="checkbox"
            checked={selectedIds.includes(sg.id)}
            onChange={() => toggle(sg.id)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-xs text-gray-700 group-hover:text-gray-900">
            {sg.name}
          </span>
          {sg.description && (
            <span className="text-xs text-gray-400 truncate">
              {sg.description}
            </span>
          )}
        </label>
      ))}
    </div>
  );
}
