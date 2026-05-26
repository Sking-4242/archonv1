import { create } from "zustand";
import { applyNodeChanges, applyEdgeChanges } from "@xyflow/react";

const STORAGE_KEY = "archon_graph";
const MAX_HISTORY = 50;

const _defaultMeta = () => ({
  id: crypto.randomUUID(),
  name: "My Architecture",
  provider: "aws",
  region: "us-east-1",
});

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saved = loadFromStorage();

const _clone = (v) => JSON.parse(JSON.stringify(v));

const useGraphStore = create((set, get) => ({
  nodes: saved?.nodes ?? [],
  edges: saved?.edges ?? [],
  graphMeta: saved?.graphMeta ?? _defaultMeta(),
  selectedNodeId: null,
  focusConfigKey: null,
  past: [], // undo stack — each entry is { nodes, edges }
  future: [], // redo stack
  clipboard: [], // copied nodes

  // ── History ───────────────────────────────────────────────────

  snapshot: () => {
    const { nodes, edges, past } = get();
    const entry = { nodes: _clone(nodes), edges: _clone(edges) };
    set({ past: [...past.slice(-(MAX_HISTORY - 1)), entry], future: [] });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    const current = { nodes: _clone(nodes), edges: _clone(edges) };
    set({
      past: past.slice(0, -1),
      future: [current, ...future.slice(0, MAX_HISTORY - 1)],
      nodes: prev.nodes,
      edges: prev.edges,
    });
    get()._persist({ nodes: prev.nodes, edges: prev.edges });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;
    const next = future[0];
    const current = { nodes: _clone(nodes), edges: _clone(edges) };
    set({
      past: [...past.slice(-(MAX_HISTORY - 1)), current],
      future: future.slice(1),
      nodes: next.nodes,
      edges: next.edges,
    });
    get()._persist({ nodes: next.nodes, edges: next.edges });
  },

  // ── Core mutations ───────────────────────────────────────────

  onNodesChange: (changes) => {
    set((state) => {
      const nodes = applyNodeChanges(changes, state.nodes);
      get()._persist({ nodes });
      return { nodes };
    });
  },

  onEdgesChange: (changes) => {
    set((state) => {
      const edges = applyEdgeChanges(changes, state.edges);
      get()._persist({ edges });
      return { edges };
    });
  },

  addNode: (node) => {
    get().snapshot();
    set((state) => {
      const nodes = [...state.nodes, node];
      get()._persist({ nodes });
      return { nodes };
    });
  },

  addEdge: (edge) => {
    get().snapshot();
    set((state) => {
      const edges = [...state.edges, edge];
      get()._persist({ edges });
      return { edges };
    });
  },

  updateNodeData: (id, data) => {
    set((state) => {
      const nodes = state.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n,
      );
      get()._persist({ nodes });
      return { nodes };
    });
  },

  updateGraphMeta: (meta) => {
    set((state) => {
      const graphMeta = { ...state.graphMeta, ...meta };
      get()._persist({ graphMeta });
      return { graphMeta };
    });
  },

  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  setFocusConfigKey: (key) => set({ focusConfigKey: key }),

  // ── Copy / Paste ─────────────────────────────────────────────

  copyNodes: (selectedNodes) => {
    if (selectedNodes.length === 0) return;
    set({ clipboard: _clone(selectedNodes) });
  },

  pasteNodes: () => {
    const { clipboard } = get();
    if (clipboard.length === 0) return;
    get().snapshot();
    const PASTE_OFFSET = 30;
    const newNodes = clipboard.map((n) => ({
      ...n,
      id: `${n.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      position: {
        x: n.position.x + PASTE_OFFSET,
        y: n.position.y + PASTE_OFFSET,
      },
      selected: false,
    }));
    set((state) => {
      const nodes = [...state.nodes, ...newNodes];
      get()._persist({ nodes });
      return { nodes };
    });
  },

  // ── AI Build (agentic canvas population) ─────────────────────

  applyBuild: (incomingNodes, incomingEdges) => {
    get().snapshot();
    // Give every incoming node/edge a unique ID prefix so multiple builds
    // never collide with each other or with manually placed nodes.
    const prefix = `b${Date.now()}`;
    const idMap = {};
    const mappedNodes = incomingNodes.map((n) => {
      const newId = `${prefix}-${n.id}`;
      idMap[n.id] = newId;
      return { ...n, id: newId, selected: false };
    });
    const mappedEdges = incomingEdges.map((e) => ({
      ...e,
      id: `${prefix}-${e.id}`,
      source: idMap[e.source] ?? e.source,
      target: idMap[e.target] ?? e.target,
      suggested_rules: [],
    }));
    set((state) => {
      const nodes = [...state.nodes, ...mappedNodes];
      const edges = [...state.edges, ...mappedEdges];
      get()._persist({ nodes, edges });
      return { nodes, edges };
    });
  },

  // ── Load / Reset ─────────────────────────────────────────────

  loadState: ({ nodes, edges, graphMeta }) => {
    const safeMeta = { ..._defaultMeta(), ...graphMeta };
    if (!safeMeta.id) safeMeta.id = crypto.randomUUID();
    const next = { nodes, edges, graphMeta: safeMeta };
    get()._persist(next);
    set({ ...next, selectedNodeId: null, past: [], future: [], clipboard: [] });
  },

  resetState: () => {
    const next = { nodes: [], edges: [], graphMeta: _defaultMeta() };
    get()._persist(next);
    set({ ...next, selectedNodeId: null, past: [], future: [], clipboard: [] });
  },

  _persist: (partial) => {
    const state = { ...useGraphStore.getState(), ...partial };
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        nodes: state.nodes,
        edges: state.edges,
        graphMeta: state.graphMeta,
      }),
    );
  },
}));

export default useGraphStore;
