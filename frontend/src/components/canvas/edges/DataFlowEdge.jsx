import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";

export default function DataFlowEdge({
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
          stroke: selected ? "#7e22ce" : "#a855f7",
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: "6 3",
        }}
        markerEnd="url(#arrow-dataflow)"
        markerStart={bidirectional ? "url(#arrow-dataflow-start)" : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="absolute pointer-events-none"
        >
          <span className="text-[10px] text-purple-600 bg-white px-1 rounded border border-purple-200">
            {bidirectional ? "⇄ data flow" : "data flow"}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
