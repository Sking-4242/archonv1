import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react";

export default function NetworkEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const bidirectional = data?.bidirectional;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#1d4ed8" : "#3b82f6",
          strokeWidth: selected ? 2.5 : 1.5,
        }}
        markerEnd="url(#arrow-network)"
        markerStart={bidirectional ? "url(#arrow-network-start)" : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="absolute pointer-events-none"
        >
          <span className="text-[10px] text-blue-600 bg-white px-1 rounded border border-blue-200">
            {bidirectional ? "⇄ network" : "network"}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
