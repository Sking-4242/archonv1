import { create } from "zustand";
import { addEdge, applyNodeChanges, applyEdgeChanges, MarkerType } from "@xyflow/react";

let _nodeCounter = 1;

function nextId() {
  return `n-${_nodeCounter++}-${Date.now()}`;
}

const useGraphStore = create((set, get) => ({
  nodes: [],
  edges: [],

  // Called by ReactFlow's onNodesChange — handles move, select, delete, resize
  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),

  // Called by ReactFlow's onEdgesChange — handles select, delete
  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),

  // Called by ReactFlow's onConnect — adds a new directed edge
  onConnect: (connection) =>
    set((s) => ({
      edges: addEdge(
        {
          ...connection,
          markerEnd: { type: MarkerType.ArrowClosed, color: "#6b7280" },
          style: { stroke: "#6b7280", strokeWidth: 1.5 },
        },
        s.edges
      ),
    })),

  // Drop a component from the palette onto the canvas
  addNode: (component, position) =>
    set((s) => ({
      nodes: [
        ...s.nodes,
        {
          id: nextId(),
          type: "assignmentNode",
          position,
          data: {
            type: component.type,
            awsType: component.awsType,
            label: component.label,
            category: component.category,
            icon: component.icon,
          },
        },
      ],
    })),

  // Wipe canvas when loading a new assignment
  clearGraph: () => set({ nodes: [], edges: [] }),

  // Serialize for submission — matches the shape grader.py expects
  getGraph: () => {
    const { nodes, edges } = get();
    return { nodes, edges, securityGroups: [] };
  },
}));

export default useGraphStore;
