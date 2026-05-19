import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";

export default function BatchEdge({
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
  const [edgePath, labelX, labelY] = getBezierPath({
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
          stroke: selected ? "#b45309" : "#f59e0b",
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: "14 4",
        }}
        markerEnd="url(#arrow-batch)"
        markerStart={bidirectional ? "url(#arrow-batch-start)" : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="absolute pointer-events-none"
        >
          <span className="text-[10px] text-amber-600 bg-white px-1 rounded border border-amber-200">
            {bidirectional ? "⇄ batch" : "batch"}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
