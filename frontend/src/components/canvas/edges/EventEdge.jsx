import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";

export default function EventEdge({
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
          stroke: selected ? "#15803d" : "#22c55e",
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: "4 4",
        }}
        markerEnd="url(#arrow-event)"
        markerStart={bidirectional ? "url(#arrow-event-start)" : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="absolute pointer-events-none"
        >
          <span className="text-[10px] text-green-600 bg-white px-1 rounded border border-green-200">
            {bidirectional ? "⇄ event" : "event"}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
