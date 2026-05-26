import { create } from "zustand";
import { getFieldDefault } from "../utils/usageSchema";

const STORAGE_KEY = "archon-usage-params";

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToStorage(usage) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usage));
  } catch {
    // ignore quota errors
  }
}

const useUsageStore = create((set, get) => ({
  // { nodeId: { fieldKey: value } }
  // Only user-overridden values are stored here.
  // Absence of a key means "use schema default".
  usage: loadFromStorage(),

  /**
   * Set a single usage param for a node.
   * Passing null / undefined removes the override (reverts to schema default).
   */
  setUsageParam: (nodeId, fieldKey, value) => {
    const prev = get().usage;
    const nodeParams = { ...(prev[nodeId] ?? {}) };

    if (value === null || value === undefined) {
      delete nodeParams[fieldKey];
    } else {
      nodeParams[fieldKey] = value;
    }

    const next = { ...prev, [nodeId]: nodeParams };
    // Drop the node entry entirely if it's now empty
    if (Object.keys(nodeParams).length === 0) {
      delete next[nodeId];
    }

    saveToStorage(next);
    set({ usage: next });
  },

  /**
   * Returns the effective value for a field — user override if present,
   * otherwise the schema default.
   */
  getParam: (nodeId, componentType, fieldKey) => {
    const stored = get().usage[nodeId]?.[fieldKey];
    if (stored !== undefined) return stored;
    return getFieldDefault(componentType, fieldKey);
  },

  /**
   * Returns true if the user has explicitly set this field (not using default).
   * Used to render the pre-fill indicator in the UI.
   */
  isUserOverridden: (nodeId, fieldKey) => {
    return get().usage[nodeId]?.[fieldKey] !== undefined;
  },

  /**
   * Returns all params for a node as a flat object, merging schema defaults
   * with any user overrides. Used when sending to the estimate API.
   */
  getNodeParams: (nodeId, componentType, schema) => {
    if (!schema) return {};
    const overrides = get().usage[nodeId] ?? {};
    const result = {};
    for (const field of schema.fields) {
      result[field.key] =
        overrides[field.key] !== undefined ? overrides[field.key] : field.default;
    }
    return result;
  },

  /**
   * Remove all overrides for a specific node (e.g. when it's deleted from canvas).
   */
  clearNodeUsage: (nodeId) => {
    const next = { ...get().usage };
    delete next[nodeId];
    saveToStorage(next);
    set({ usage: next });
  },

  /**
   * Clear all usage overrides for all nodes.
   */
  clearAllUsage: () => {
    saveToStorage({});
    set({ usage: {} });
  },
}));

export default useUsageStore;
