import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";

export default function StreamingEdge({
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
          stroke: selected ? "#0369a1" : "#0ea5e9",
          strokeWidth: selected ? 2.5 : 2,
          strokeDasharray: "10 3",
        }}
        markerEnd="url(#arrow-streaming)"
        markerStart={bidirectional ? "url(#arrow-streaming-start)" : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="absolute pointer-events-none"
        >
          <span className="text-[10px] text-sky-600 bg-white px-1 rounded border border-sky-200">
            {bidirectional ? "⇄ stream" : "stream"}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
