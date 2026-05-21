import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  ConnectionMode,
  SelectionMode,
  getNodesBounds,
  getViewportForBounds,
} from "@xyflow/react";
import { toPng } from "html-to-image";
import "@xyflow/react/dist/style.css";

import useGraphStore from "../../store/graphStore";
import useSecurityStore from "../../store/securityStore";
import useIAMStore from "../../store/iamStore";
import useValidationStore from "../../store/validationStore";
import { nodeTypes } from "./nodes";
import { edgeTypes } from "./edges";
import ComponentSidebar from "./ComponentSidebar";
import EdgeTypeModal from "./EdgeTypeModal";
import ContextMenu from "./ContextMenu";

let nodeIdCounter = 1;

const CONTAINER_TYPES = ["vpc", "subnet"];
const GATEWAY_TYPES = ["internet_gateway", "nat_gateway"];
const GATEWAY_W = 130;
const GATEWAY_H = 75;
const SNAP_THRESHOLD = 80;

const ARROW_DEFS = (
  <svg style={{ position: "absolute", width: 0, height: 0 }}>
    <defs>
      <marker
        id="arrow-network"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
      </marker>
      <marker
        id="arrow-network-start"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto-start-reverse"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#3b82f6" />
      </marker>
      <marker
        id="arrow-dataflow"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
      </marker>
      <marker
        id="arrow-dataflow-start"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto-start-reverse"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#a855f7" />
      </marker>
      <marker
        id="arrow-dependency"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
      </marker>
      <marker
        id="arrow-dependency-start"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto-start-reverse"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
      </marker>
      <marker
        id="arrow-streaming"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
      </marker>
      <marker
        id="arrow-streaming-start"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto-start-reverse"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
      </marker>
      <marker
        id="arrow-batch"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
      </marker>
      <marker
        id="arrow-batch-start"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto-start-reverse"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#10b981" />
      </marker>
      <marker
        id="arrow-event"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" />
      </marker>
      <marker
        id="arrow-event-start"
        markerWidth="10"
        markerHeight="7"
        refX="10"
        refY="3.5"
        orient="auto-start-reverse"
      >
        <polygon points="0 0, 10 3.5, 0 7" fill="#f43f5e" />
      </marker>
      <marker
        id="circle-event"
        markerWidth="8"
        markerHeight="8"
        refX="4"
        refY="4"
        orient="auto"
      >
        <circle cx="4" cy="4" r="3" fill="#f43f5e" />
      </marker>
    </defs>
  </svg>
);

function getContainerBounds(container) {
  const w = container.style?.width ?? container.measured?.width ?? 300;
  const h = container.style?.height ?? container.measured?.height ?? 200;
  return {
    left: container.position.x,
    top: container.position.y,
    right: container.position.x + w,
    bottom: container.position.y + h,
    w,
    h,
  };
}

function findContainerForDrop(pos, nodes) {
  const containers = nodes.filter((n) => CONTAINER_TYPES.includes(n.type));
  const sorted = [...containers].sort((a, b) =>
    a.type === "subnet" && b.type === "vpc"
      ? -1
      : a.type === "vpc" && b.type === "subnet"
        ? 1
        : 0,
  );
  for (const c of sorted) {
    const b = getContainerBounds(c);
    if (
      pos.x >= b.left &&
      pos.x <= b.right &&
      pos.y >= b.top &&
      pos.y <= b.bottom
    )
      return c;
  }
  return null;
}

function snapGatewayToBorder(gatewayPos, containers) {
  let best = null;
  let bestDist = SNAP_THRESHOLD;

  for (const c of containers) {
    const b = getContainerBounds(c);
    const cx = gatewayPos.x + GATEWAY_W / 2;
    const cy = gatewayPos.y + GATEWAY_H / 2;

    const borders = [
      {
        side: "top",
        x: Math.max(b.left, Math.min(b.right, cx)) - GATEWAY_W / 2,
        y: b.top - GATEWAY_H / 2,
      },
      {
        side: "bottom",
        x: Math.max(b.left, Math.min(b.right, cx)) - GATEWAY_W / 2,
        y: b.bottom - GATEWAY_H / 2,
      },
      {
        side: "left",
        x: b.left - GATEWAY_W / 2,
        y: Math.max(b.top, Math.min(b.bottom, cy)) - GATEWAY_H / 2,
      },
      {
        side: "right",
        x: b.right - GATEWAY_W / 2,
        y: Math.max(b.top, Math.min(b.bottom, cy)) - GATEWAY_H / 2,
      },
    ];

    for (const border of borders) {
      const dist = Math.hypot(
        cx - (border.x + GATEWAY_W / 2),
        cy - (border.y + GATEWAY_H / 2),
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = { x: border.x, y: border.y };
      }
    }
  }
  return best;
}

function CanvasInner({ onNodeSelect }) {
  const reactFlowWrapper = useRef(null);
  const { screenToFlowPosition, setNodes } = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    addNode,
    addEdge,
    setSelectedNodeId,
    updateNodeData,
    snapshot,
    undo,
    redo,
    copyNodes,
    pasteNodes,
  } = useGraphStore();

  const handleExportPng = useCallback(() => {
    const viewportEl = reactFlowWrapper.current?.querySelector(
      ".react-flow__viewport",
    );
    if (!viewportEl) return;

    const bounds = getNodesBounds(nodes);
    const pad = 40;
    const imgW = Math.max(bounds.width + pad * 2, 400);
    const imgH = Math.max(bounds.height + pad * 2, 300);
    const viewport = getViewportForBounds(bounds, imgW, imgH, 0.5, 2, pad);

    toPng(viewportEl, {
      backgroundColor: "#f3f4f6",
      width: imgW,
      height: imgH,
      style: {
        width: imgW,
        height: imgH,
        transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        transformOrigin: "top left",
      },
    })
      .then((dataUrl) => {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = "architecture.png";
        a.click();
      })
      .catch(() => {});
  }, [nodes]);
  const [pendingConnection, setPendingConnection] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]);
  // "grab" = pan mode (default), "select" = rubber-band select mode
  const [canvasMode, setCanvasMode] = useState("grab");

  const updateValidation = useValidationStore((s) => s.update);
  const securityGroups = useSecurityStore((s) => s.securityGroups);
  const iamRoles = useIAMStore((s) => s.iamRoles);

  // Keep validation warnings in sync with graph state
  useEffect(() => {
    updateValidation(nodes, edges, securityGroups, iamRoles);
  }, [nodes, edges, securityGroups, iamRoles, updateValidation]);

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  // ── Keyboard shortcuts ───────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      const tag = document.activeElement?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      // Ctrl combos
      if (ctrl) {
        if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
        if (e.key === "c" && selectedNodes.length > 0) { e.preventDefault(); copyNodes(selectedNodes); }
        if (e.key === "v") { e.preventDefault(); pasteNodes(); }
        return;
      }

      // Mode shortcuts — only when not typing in an input
      if (!isInput) {
        if (e.key === "h" || e.key === "H") setCanvasMode("grab");
        if (e.key === "v" || e.key === "V") setCanvasMode("select");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, copyNodes, pasteNodes, selectedNodes]);

  const onSelectionChange = useCallback(({ nodes: sel }) => {
    setSelectedNodes(sel);
  }, []);

  const onDragStart = useCallback((event, comp, category) => {
    event.dataTransfer.setData(
      "application/archon",
      JSON.stringify({ ...comp, category }),
    );
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      if (!reactFlowWrapper.current) return;
      const raw = event.dataTransfer.getData("application/archon");
      if (!raw) return;

      const comp = JSON.parse(raw);
      const absPos = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      const id = `${comp.type}-${nodeIdCounter++}`;

      const isVPC = comp.type === "vpc";
      const isSubnet = comp.type === "subnet";
      const isContainer = CONTAINER_TYPES.includes(comp.type);
      const isGateway = GATEWAY_TYPES.includes(comp.type);

      let subnet_id = null;
      let vpc_id = null;

      if (!isVPC && !isGateway) {
        const container = findContainerForDrop(absPos, nodes);
        if (container) {
          if (container.type === "subnet") {
            subnet_id = container.id;
            vpc_id = container.data?.vpc_id ?? null;
          } else if (container.type === "vpc") {
            vpc_id = container.id;
          }
        }
      }

      const zIndex = isVPC ? 0 : isSubnet ? 1 : 2;

      const node = {
        id,
        type: comp.type,
        position: absPos,
        zIndex,
        ...(isContainer ? { style: { width: 300, height: 200 } } : {}),
        data: {
          label: comp.label,
          awsType: comp.awsType,
          icon: comp.icon,
          nodeType: comp.type,
          category: comp.category,
          config: {},
          security_group_ids: [],
          iam_role_id: null,
          subnet_id,
          vpc_id,
          instructions: "",
        },
      };
      addNode(node);
    },
    [addNode, screenToFlowPosition, nodes],
  );

  const onNodeDragStart = useCallback(() => {
    snapshot();
  }, [snapshot]);

  const onNodeDragStop = useCallback(
    (_, node) => {
      if (!GATEWAY_TYPES.includes(node.type)) return;
      const containers = nodes.filter((n) => CONTAINER_TYPES.includes(n.type));
      if (containers.length === 0) return;
      const snapped = snapGatewayToBorder(node.position, containers);
      if (snapped) {
        setNodes((nds) =>
          nds.map((n) => (n.id === node.id ? { ...n, position: snapped } : n)),
        );
      }
    },
    [nodes, setNodes],
  );

  // Snapshot before React Flow deletes nodes/edges via keyboard
  const onBeforeDelete = useCallback(() => {
    snapshot();
    return true;
  }, [snapshot]);

  const onConnect = useCallback((connection) => {
    setPendingConnection(connection);
  }, []);

  const onEdgeTypeSelect = useCallback(
    ({ type, bidirectional }) => {
      if (!pendingConnection) return;
      addEdge({
        id: `edge-${Date.now()}`,
        source: pendingConnection.source,
        target: pendingConnection.target,
        sourceHandle: pendingConnection.sourceHandle,
        targetHandle: pendingConnection.targetHandle,
        type,
        data: { bidirectional: !!bidirectional },
        suggested_rules: [],
      });
      setPendingConnection(null);
    },
    [addEdge, pendingConnection],
  );

  const onNodeClick = useCallback(
    (_, node) => {
      setSelectedNodeId(node.id);
      onNodeSelect(node.id);
    },
    [onNodeSelect, setSelectedNodeId],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    onNodeSelect(null);
    closeContextMenu();
  }, [onNodeSelect, setSelectedNodeId, closeContextMenu]);

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault();
      setSelectedNodeId(node.id);
      onNodeSelect(node.id);
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
          {
            label: "Edit Component",
            action: () => onNodeSelect(node.id),
          },
          {
            label: "Copy Node",
            action: () => copyNodes([node]),
          },
          { divider: true },
          {
            label: "Delete Node",
            danger: true,
            action: () => {
              snapshot();
              onEdgesChange(
                edges
                  .filter((e) => e.source === node.id || e.target === node.id)
                  .map((e) => ({ type: "remove", id: e.id })),
              );
              onNodesChange([{ type: "remove", id: node.id }]);
              setSelectedNodeId(null);
              onNodeSelect(null);
            },
          },
        ],
      });
    },
    [
      edges,
      onEdgesChange,
      onNodesChange,
      onNodeSelect,
      setSelectedNodeId,
      snapshot,
      copyNodes,
    ],
  );

  const onEdgeContextMenu = useCallback(
    (event, edge) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        items: [
          {
            label: "Flip Direction",
            action: () => {
              snapshot();
              onEdgesChange([{ type: "remove", id: edge.id }]);
              addEdge({
                id: `edge-${Date.now()}`,
                source: edge.target,
                target: edge.source,
                sourceHandle: edge.targetHandle,
                targetHandle: edge.sourceHandle,
                type: edge.type,
                data: edge.data ?? {},
                suggested_rules: edge.suggested_rules ?? [],
              });
            },
          },
          { divider: true },
          {
            label: "Delete Edge",
            danger: true,
            action: () => {
              snapshot();
              onEdgesChange([{ type: "remove", id: edge.id }]);
            },
          },
        ],
      });
    },
    [addEdge, onEdgesChange, snapshot],
  );

  return (
    <div className="flex flex-1 h-full overflow-hidden relative">
      {ARROW_DEFS}
      <ComponentSidebar onDragStart={onDragStart} />
      <div ref={reactFlowWrapper} className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onNodeDragStart={onNodeDragStart}
          onNodeDragStop={onNodeDragStop}
          onBeforeDelete={onBeforeDelete}
          onSelectionChange={onSelectionChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionMode={ConnectionMode.Loose}
          selectionMode={SelectionMode.Partial}
          multiSelectionKeyCode={["Control", "Meta"]}
          selectionOnDrag={canvasMode === "select"}
          panOnDrag={canvasMode === "grab"}
          deleteKeyCode={["Delete", "Backspace"]}
          minZoom={0.05}
          maxZoom={4}
          fitView
        >
          <Background gap={16} size={1} color="#e5e7eb" />
          <Controls />
          <MiniMap nodeStrokeWidth={3} zoomable pannable />
          <Panel position="top-right">
            <div className="flex items-center gap-2">
              <div className="flex rounded shadow-sm overflow-hidden border border-gray-300 bg-white text-xs">
                <button
                  onClick={() => setCanvasMode("grab")}
                  title="Grab / Pan mode (H)"
                  className={`px-2 py-1 transition-colors ${canvasMode === "grab" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  ✋ Grab
                </button>
                <button
                  onClick={() => setCanvasMode("select")}
                  title="Select / Rubber-band mode (V)"
                  className={`px-2 py-1 border-l border-gray-300 transition-colors ${canvasMode === "select" ? "bg-indigo-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  ⬚ Select
                </button>
              </div>
              <button
                onClick={handleExportPng}
                title="Export canvas as PNG"
                className="bg-white border border-gray-300 rounded shadow-sm px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors"
              >
                ⬇ PNG
              </button>
            </div>
          </Panel>
        </ReactFlow>
      </div>
      {pendingConnection && (
        <EdgeTypeModal
          onSelect={onEdgeTypeSelect}
          onCancel={() => setPendingConnection(null)}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
}

export default function Canvas({ onNodeSelect }) {
  return (
    <ReactFlowProvider>
      <CanvasInner onNodeSelect={onNodeSelect} />
    </ReactFlowProvider>
  );
}
