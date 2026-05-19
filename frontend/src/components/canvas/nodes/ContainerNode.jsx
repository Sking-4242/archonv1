import { Handle, Position, NodeResizer } from "@xyflow/react";

const STYLES = {
  vpc: {
    bg: "rgba(219,234,254,0.25)",
    border: "#93c5fd",
    headerColor: "#1d4ed8",
  },
  subnet: {
    bg: "rgba(220,252,231,0.25)",
    border: "#6ee7b7",
    headerColor: "#047857",
  },
};

export default function ContainerNode({ data, selected, type }) {
  const s = STYLES[type] ?? STYLES.vpc;

  return (
    <>
      <NodeResizer
        minWidth={180}
        minHeight={120}
        isVisible={selected}
        lineStyle={{ borderColor: s.border, borderWidth: 1 }}
        handleStyle={{
          backgroundColor: s.border,
          width: 8,
          height: 8,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: s.bg,
          border: `2px dashed ${s.border}`,
          borderRadius: 8,
          boxSizing: "border-box",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 10,
            color: s.headerColor,
            fontSize: 11,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 5,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <span>{data.icon}</span>
          <span>{data.awsType}</span>
          <span style={{ fontWeight: 400, color: s.headerColor, opacity: 0.7 }}>
            {data.label}
          </span>
        </div>

        <Handle
          type="source"
          position={Position.Top}
          id="top"
          style={{ left: "50%" }}
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={{ left: "50%" }}
        />
        <Handle
          type="source"
          position={Position.Left}
          id="left"
          style={{ top: "50%" }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={{ top: "50%" }}
        />
      </div>
    </>
  );
}
