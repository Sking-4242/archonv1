import { BaseEdge, EdgeLabelRenderer, getStraightPath } from "@xyflow/react";

export default function DependencyEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
  data,
}) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const bidirectional = data?.bidirectional;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? "#374151" : "#9ca3af",
          strokeWidth: selected ? 2.5 : 1.5,
          strokeDasharray: "2 4",
        }}
        markerEnd="url(#arrow-dependency)"
        markerStart={bidirectional ? "url(#arrow-dependency-start)" : undefined}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
          className="absolute pointer-events-none"
        >
          <span className="text-[10px] text-gray-500 bg-white px-1 rounded border border-gray-200">
            {bidirectional ? "⇄ depends on" : "depends on"}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
