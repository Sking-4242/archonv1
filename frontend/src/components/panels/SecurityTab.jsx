import { useState } from "react";
import useSecurityStore from "../../store/securityStore";
import useGraphStore from "../../store/graphStore";
import RuleBuilder from "../ui/RuleBuilder";
import { getSuggestedRules } from "../../utils/ruleMatrix";

function newRule() {
  return { protocol: "tcp", port: "", source: "" };
}

function newSG(id) {
  return {
    id,
    name: "new-sg",
    description: "",
    vpc_id: "",
    inbound: [],
    outbound: [],
  };
}

function SGForm({ sg, onSave, onCancel }) {
  const [draft, setDraft] = useState(sg);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const addInbound = () =>
    setDraft((d) => ({ ...d, inbound: [...d.inbound, newRule()] }));

  const updateInbound = (i, rule) =>
    setDraft((d) => ({
      ...d,
      inbound: d.inbound.map((r, idx) => (idx === i ? rule : r)),
    }));

  const removeInbound = (i) =>
    setDraft((d) => ({
      ...d,
      inbound: d.inbound.filter((_, idx) => idx !== i),
    }));

  const addOutbound = () =>
    setDraft((d) => ({ ...d, outbound: [...d.outbound, newRule()] }));

  const updateOutbound = (i, rule) =>
    setDraft((d) => ({
      ...d,
      outbound: d.outbound.map((r, idx) => (idx === i ? rule : r)),
    }));

  const removeOutbound = (i) =>
    setDraft((d) => ({
      ...d,
      outbound: d.outbound.filter((_, idx) => idx !== i),
    }));

  return (
    <div className="border border-indigo-200 rounded-lg bg-white shadow-sm">
      <div className="px-3 py-3 space-y-2 border-b border-gray-100">
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="Security group name"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={draft.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Description"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={draft.vpc_id}
          onChange={(e) => setField("vpc_id", e.target.value)}
          placeholder="VPC ID (e.g. vpc-1)"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-700">
            Inbound Rules
          </span>
          <button
            onClick={addInbound}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            + Add rule
          </button>
        </div>
        <div className="space-y-1.5">
          {draft.inbound.length === 0 && (
            <p className="text-xs text-gray-400 italic">No inbound rules</p>
          )}
          {draft.inbound.map((rule, i) => (
            <RuleBuilder
              key={i}
              rule={rule}
              onChange={(r) => updateInbound(i, r)}
              onRemove={() => removeInbound(i)}
            />
          ))}
        </div>
      </div>

      <div className="px-3 py-2">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-gray-700">
            Outbound Rules
          </span>
          <button
            onClick={addOutbound}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            + Add rule
          </button>
        </div>
        <div className="space-y-1.5">
          {draft.outbound.length === 0 && (
            <p className="text-xs text-gray-400 italic">
              No outbound rules — all traffic allowed by default
            </p>
          )}
          {draft.outbound.map((rule, i) => (
            <RuleBuilder
              key={i}
              rule={rule}
              onChange={(r) => updateOutbound(i, r)}
              onRemove={() => removeOutbound(i)}
            />
          ))}
        </div>
      </div>

      <div className="px-3 py-2 border-t border-gray-100 flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(draft)}
          className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function SGRow({ sg, onEdit, onDelete }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-800">{sg.name}</div>
          {sg.description && (
            <div className="text-xs text-gray-400">{sg.description}</div>
          )}
          {sg.vpc_id && (
            <div className="text-xs text-gray-400">VPC: {sg.vpc_id}</div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="mt-1.5 flex gap-3 text-xs text-gray-500">
        <span>{sg.inbound.length} inbound</span>
        <span>{sg.outbound.length} outbound</span>
      </div>
    </div>
  );
}

export default function SecurityTab() {
  const {
    securityGroups,
    addSecurityGroup,
    updateSecurityGroup,
    removeSecurityGroup,
  } = useSecurityStore();
  const { nodes, edges } = useGraphStore();
  const [editingId, setEditingId] = useState(null);
  const [creating, setCreating] = useState(false);

  const suggestions = getSuggestedRules(nodes, edges);

  const handleCreate = () => {
    setCreating(true);
    setEditingId(null);
  };

  const handleSaveNew = (draft) => {
    addSecurityGroup(draft);
    setCreating(false);
  };

  const handleSaveEdit = (draft) => {
    updateSecurityGroup(draft.id, draft);
    setEditingId(null);
  };

  const handleApplySuggestion = (suggestion, ruleIndex) => {
    if (securityGroups.length === 0) return;
    const rule = suggestion.rules[ruleIndex];
    const target = securityGroups[0];
    updateSecurityGroup(target.id, {
      inbound: [
        ...(target.inbound ?? []),
        { protocol: rule.protocol, port: rule.port, source: rule.source },
      ],
    });
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          Security Groups
        </span>
        <button
          onClick={handleCreate}
          className="text-xs px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          + New SG
        </button>
      </div>

      {creating && (
        <SGForm
          sg={newSG(`sg-${Date.now()}`)}
          onSave={handleSaveNew}
          onCancel={() => setCreating(false)}
        />
      )}

      {securityGroups.length === 0 && !creating && (
        <p className="text-xs text-gray-400 italic">No security groups yet.</p>
      )}

      {securityGroups.map((sg) =>
        editingId === sg.id ? (
          <SGForm
            key={sg.id}
            sg={sg}
            onSave={handleSaveEdit}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <SGRow
            key={sg.id}
            sg={sg}
            onEdit={() => {
              setEditingId(sg.id);
              setCreating(false);
            }}
            onDelete={() => removeSecurityGroup(sg.id)}
          />
        ),
      )}

      {suggestions.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
            Suggested Rules
          </div>
          <div className="space-y-2">
            {suggestions.map((s) => (
              <div
                key={s.edgeId}
                className="border border-amber-200 rounded-lg bg-amber-50 px-3 py-2"
              >
                <div className="text-xs font-medium text-amber-800 mb-1.5">
                  {s.sourceLabel} → {s.targetLabel}
                </div>
                <div className="space-y-1">
                  {s.rules.map((rule, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600 font-mono">
                        {rule.protocol.toUpperCase()} {rule.port} from{" "}
                        {rule.source}
                        {rule.note && (
                          <span className="text-gray-400 ml-1">
                            ({rule.note})
                          </span>
                        )}
                      </span>
                      {securityGroups.length > 0 && (
                        <button
                          onClick={() => handleApplySuggestion(s, i)}
                          className="text-xs text-indigo-600 hover:text-indigo-800 ml-2 flex-shrink-0"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
