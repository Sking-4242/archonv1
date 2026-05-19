import { useState } from "react";
import useIAMStore from "../../store/iamStore";
import useGraphStore from "../../store/graphStore";
import PolicyBuilder from "../ui/PolicyBuilder";

const CATEGORY_USES_IAM = [
  "compute",
  "storage",
  "database",
  "integration",
  "ai_ml",
];

function newStatement() {
  return { effect: "Allow", actions: [], resources: [] };
}

function newRole(id) {
  return { id, name: "new-role", description: "", policies: [] };
}

function RoleForm({ role, onSave, onCancel }) {
  const [draft, setDraft] = useState(role);

  const setField = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  const addStatement = () =>
    setDraft((d) => ({ ...d, policies: [...d.policies, newStatement()] }));

  const updateStatement = (i, stmt) =>
    setDraft((d) => ({
      ...d,
      policies: d.policies.map((s, idx) => (idx === i ? stmt : s)),
    }));

  const removeStatement = (i) =>
    setDraft((d) => ({
      ...d,
      policies: d.policies.filter((_, idx) => idx !== i),
    }));

  return (
    <div className="border border-indigo-200 rounded-lg bg-white shadow-sm">
      <div className="px-3 py-3 space-y-2 border-b border-gray-100">
        <input
          type="text"
          value={draft.name}
          onChange={(e) => setField("name", e.target.value)}
          placeholder="Role name (e.g. ec2-s3-read-role)"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={draft.description}
          onChange={(e) => setField("description", e.target.value)}
          placeholder="Description"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="px-3 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700">
            Policy Statements
          </span>
          <button
            onClick={addStatement}
            className="text-xs text-indigo-600 hover:text-indigo-800"
          >
            + Add statement
          </button>
        </div>
        {draft.policies.length === 0 && (
          <p className="text-xs text-gray-400 italic">No policy statements</p>
        )}
        {draft.policies.map((stmt, i) => (
          <PolicyBuilder
            key={i}
            statement={stmt}
            onChange={(s) => updateStatement(i, s)}
            onRemove={() => removeStatement(i)}
          />
        ))}
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

function RoleRow({ role, onEdit, onDelete }) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white px-3 py-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold text-gray-800">{role.name}</div>
          {role.description && (
            <div className="text-xs text-gray-400">{role.description}</div>
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
      <div className="mt-1 text-xs text-gray-500">
        {role.policies.length} policy statement
        {role.policies.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}

export default function IAMTab() {
  const { iamRoles, addIAMRole, updateIAMRole, removeIAMRole } = useIAMStore();
  const nodes = useGraphStore((s) => s.nodes);
  const [editingId, setEditingId] = useState(null);
  const [creating, setCreating] = useState(false);

  const unassigned = nodes.filter(
    (n) => CATEGORY_USES_IAM.includes(n.data.category) && !n.data.iam_role_id,
  );

  const handleSaveNew = (draft) => {
    addIAMRole(draft);
    setCreating(false);
  };

  const handleSaveEdit = (draft) => {
    updateIAMRole(draft.id, draft);
    setEditingId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
          IAM Roles
        </span>
        <button
          onClick={() => {
            setCreating(true);
            setEditingId(null);
          }}
          className="text-xs px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          + New Role
        </button>
      </div>

      {creating && (
        <RoleForm
          role={newRole(`role-${Date.now()}`)}
          onSave={handleSaveNew}
          onCancel={() => setCreating(false)}
        />
      )}

      {iamRoles.length === 0 && !creating && (
        <p className="text-xs text-gray-400 italic">No IAM roles yet.</p>
      )}

      {iamRoles.map((role) =>
        editingId === role.id ? (
          <RoleForm
            key={role.id}
            role={role}
            onSave={handleSaveEdit}
            onCancel={() => setEditingId(null)}
          />
        ) : (
          <RoleRow
            key={role.id}
            role={role}
            onEdit={() => {
              setEditingId(role.id);
              setCreating(false);
            }}
            onDelete={() => removeIAMRole(role.id)}
          />
        ),
      )}

      {unassigned.length > 0 && (
        <div>
          <div className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
            Unassigned Components
          </div>
          <div className="space-y-1">
            {unassigned.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5"
              >
                <span>⚠</span>
                <span className="font-medium">{n.data.label}</span>
                <span className="text-amber-500">({n.data.awsType})</span>
                <span className="text-amber-400">— no IAM role assigned</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
