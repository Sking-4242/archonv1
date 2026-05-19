import { useState, useEffect } from "react";
import useGraphStore from "../../store/graphStore";
import useSecurityStore from "../../store/securityStore";
import useIAMStore from "../../store/iamStore";
import { COMPONENT_CONFIGS } from "../../utils/componentConfig";

function ConfigField({ field, value, onChange }) {
  if (field.type === "boolean") {
    return (
      <label className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{field.label}</span>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(field.key, e.target.checked)}
          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
        />
      </label>
    );
  }
  if (field.type === "select") {
    return (
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {field.label}
        </label>
        <select
          value={value ?? field.default}
          onChange={(e) => onChange(field.key, e.target.value)}
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.type === "number") {
    return (
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {field.label}
        </label>
        <input
          type="number"
          value={value ?? field.default}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>
    );
  }
  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">{field.label}</label>
      <input
        type="text"
        value={value ?? field.default}
        onChange={(e) => onChange(field.key, e.target.value)}
        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  );
}

export default function ComponentPanel({ nodeId }) {
  const node = useGraphStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNodeData = useGraphStore((s) => s.updateNodeData);
  const securityGroups = useSecurityStore((s) => s.securityGroups);
  const iamRoles = useIAMStore((s) => s.iamRoles);

  const [label, setLabel] = useState("");
  const [instructions, setInstructions] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (node) {
      setLabel(node.data.label);
      setInstructions(node.data.instructions ?? "");
      setShowAdvanced(false);
    }
  }, [node?.id]);

  if (!node) return null;

  const allFields = COMPONENT_CONFIGS[node.type] ?? [];
  const basicFields = allFields.filter((f) => f.basic === true);
  const advancedFields = allFields.filter((f) => f.basic !== true);
  const config = node.data.config ?? {};

  const handleConfigChange = (key, value) => {
    updateNodeData(node.id, { config: { ...config, [key]: value } });
  };

  const handleLabelBlur = () => updateNodeData(node.id, { label });
  const handleInstructionsBlur = () =>
    updateNodeData(node.id, { instructions });

  const handleSGToggle = (sgId) => {
    const current = node.data.security_group_ids ?? [];
    const next = current.includes(sgId)
      ? current.filter((id) => id !== sgId)
      : [...current, sgId];
    updateNodeData(node.id, { security_group_ids: next });
  };

  const handleIAMSelect = (roleId) => {
    updateNodeData(node.id, {
      iam_role_id: node.data.iam_role_id === roleId ? null : roleId,
    });
  };

  const CATEGORY_USES_IAM = [
    "compute",
    "storage",
    "database",
    "integration",
    "ai_ml",
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Fixed header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
        <span className="text-lg">{node.data.icon}</span>
        <div>
          <div className="text-xs font-semibold text-gray-800">
            {node.data.awsType}
          </div>
          <div className="text-xs text-gray-400">{node.id}</div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Config fields */}
        {allFields.length > 0 && (
          <div>
            <div className="text-xs font-medium text-gray-700 mb-2">
              Configuration
            </div>

            {/* Basic fields */}
            {basicFields.length > 0 && (
              <div className="space-y-3">
                {basicFields.map((field) => (
                  <ConfigField
                    key={field.key}
                    field={field}
                    value={config[field.key]}
                    onChange={handleConfigChange}
                  />
                ))}
              </div>
            )}

            {/* Advanced toggle */}
            {advancedFields.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                >
                  <span>{showAdvanced ? "▾" : "▸"}</span>
                  <span>
                    {showAdvanced ? "Hide" : "Advanced"} (
                    {advancedFields.length} options)
                  </span>
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 pl-2 border-l-2 border-indigo-100">
                    {advancedFields.map((field) => (
                      <ConfigField
                        key={field.key}
                        field={field}
                        value={config[field.key]}
                        onChange={handleConfigChange}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Components with no fields at all (e.g. internet_gateway) */}
            {basicFields.length === 0 && advancedFields.length === 0 && (
              <p className="text-xs text-gray-400">
                No configuration required.
              </p>
            )}
          </div>
        )}

        {/* Security Groups */}
        <div>
          <div className="text-xs font-medium text-gray-700 mb-2">
            Security Groups
            {securityGroups.length === 0 && (
              <span className="text-gray-400 font-normal ml-1">
                (none defined)
              </span>
            )}
          </div>
          {securityGroups.length > 0 && (
            <div className="space-y-1">
              {securityGroups
                .filter(
                  (sg) =>
                    !sg.vpc_id ||
                    sg.vpc_id === node.data.vpc_id ||
                    !node.data.vpc_id,
                )
                .map((sg) => {
                  const checked = (node.data.security_group_ids ?? []).includes(
                    sg.id,
                  );
                  return (
                    <label
                      key={sg.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleSGToggle(sg.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-700">{sg.name}</span>
                    </label>
                  );
                })}
            </div>
          )}
        </div>

        {/* IAM Role */}
        {CATEGORY_USES_IAM.includes(node.data.category) && (
          <div>
            <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
              IAM Role
              {iamRoles.length === 0 && (
                <span className="text-gray-400 font-normal">
                  (none defined)
                </span>
              )}
              {iamRoles.length > 0 && !node.data.iam_role_id && (
                <span className="text-amber-500 font-normal">
                  ⚠ unassigned
                </span>
              )}
            </div>
            {iamRoles.length > 0 && (
              <div className="space-y-1">
                {iamRoles.map((role) => {
                  const selected = node.data.iam_role_id === role.id;
                  return (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name={`iam-${node.id}`}
                        checked={selected}
                        onChange={() => handleIAMSelect(role.id)}
                        className="border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-xs text-gray-700">{role.name}</span>
                    </label>
                  );
                })}
                {node.data.iam_role_id && (
                  <button
                    onClick={() =>
                      updateNodeData(node.id, { iam_role_id: null })
                    }
                    className="text-xs text-gray-400 hover:text-red-500 mt-1"
                  >
                    Remove role
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Terraform Instructions */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Terraform Instructions
          </label>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            onBlur={handleInstructionsBlur}
            placeholder="Additional instructions for Terraform generation..."
            rows={4}
            className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
