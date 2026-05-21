import { Handle, Position } from "@xyflow/react";
import useValidationStore from "../../../store/validationStore";
import { AWS_ICONS } from "../../../assets/icons/awsIcons";
import { AZURE_ICONS } from "../../../assets/icons/azureIcons";
import { GCP_ICONS } from "../../../assets/icons/gcpIcons";

const ALL_ICONS = { ...AWS_ICONS, ...AZURE_ICONS, ...GCP_ICONS };

const CATEGORY_COLORS = {
  networking: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    icon: "text-blue-600",
  },
  compute: {
    bg: "bg-orange-50",
    border: "border-orange-300",
    icon: "text-orange-600",
  },
  load_balancing: {
    bg: "bg-purple-50",
    border: "border-purple-300",
    icon: "text-purple-600",
  },
  storage: {
    bg: "bg-green-50",
    border: "border-green-300",
    icon: "text-green-600",
  },
  database: {
    bg: "bg-teal-50",
    border: "border-teal-300",
    icon: "text-teal-600",
  },
  security: { bg: "bg-red-50", border: "border-red-300", icon: "text-red-600" },
  integration: {
    bg: "bg-yellow-50",
    border: "border-yellow-300",
    icon: "text-yellow-600",
  },
  ai_ml: { bg: "bg-pink-50", border: "border-pink-300", icon: "text-pink-600" },
};

const HANDLE_STYLE = { width: 8, height: 8 };
const EMPTY_FINDINGS = [];

// Change-action visual config
const CHANGE_ACTION_CONFIG = {
  create: {
    ring: "ring-2 ring-green-500 ring-offset-1",
    badge: "bg-green-500 text-white",
    symbol: "+",
    label: "Will be created",
    dimmed: false,
  },
  update: {
    ring: "ring-2 ring-amber-400 ring-offset-1",
    badge: "bg-amber-500 text-white",
    symbol: "~",
    label: "Will be updated",
    dimmed: false,
  },
  replace: {
    ring: "ring-2 ring-orange-500 ring-offset-1",
    badge: "bg-orange-500 text-white",
    symbol: "⟳",
    label: "Will be replaced",
    dimmed: false,
  },
  delete: {
    ring: "ring-2 ring-red-500 ring-offset-1",
    badge: "bg-red-500 text-white",
    symbol: "×",
    label: "Will be destroyed",
    dimmed: false,
  },
  "no-op": {
    ring: "",
    badge: "",
    symbol: "",
    label: "No change",
    dimmed: true,
  },
};

export default function AWSNode({ id, data, selected }) {
  const colors = CATEGORY_COLORS[data.category] ?? {
    bg: "bg-gray-50",
    border: "border-gray-300",
    icon: "text-gray-600",
  };

  const nodeFindings = useValidationStore((s) => s.nodeFindings?.[id] ?? EMPTY_FINDINGS);
  const worstLevel = nodeFindings.some((f) => f.level === "critical")
    ? "critical"
    : nodeFindings.some((f) => f.level === "warning")
      ? "warning"
      : nodeFindings.some((f) => f.level === "info")
        ? "info"
        : null;

  const svgUrl = data.nodeType ? ALL_ICONS[data.nodeType] : null;

  // Plan-mode change action
  const changeAction = data.change_action ?? null;
  const changeCfg = changeAction ? CHANGE_ACTION_CONFIG[changeAction] : null;
  const inPlanMode = changeAction !== null && changeAction !== undefined;

  return (
    <div className={`relative ${changeCfg?.dimmed ? "opacity-40" : ""}`}>
      <div
        className={`
          rounded-lg border-2 px-3 py-2 min-w-[120px] text-center shadow-sm cursor-pointer
          ${colors.bg} ${colors.border}
          ${selected ? "ring-2 ring-indigo-500 ring-offset-1" : ""}
          ${!selected && !inPlanMode && worstLevel === "critical" ? "ring-2 ring-red-500 ring-offset-1" : ""}
          ${!selected && !inPlanMode && worstLevel === "warning" ? "ring-2 ring-amber-400 ring-offset-1" : ""}
          ${!selected && !inPlanMode && worstLevel === "info" ? "ring-2 ring-blue-400 ring-offset-1" : ""}
          ${!selected && changeCfg && !changeCfg.dimmed ? changeCfg.ring : ""}
        `}
      >
        <Handle
          type="source"
          position={Position.Top}
          id="top"
          style={HANDLE_STYLE}
          className="!bg-gray-400"
        />
        <Handle
          type="source"
          position={Position.Bottom}
          id="bottom"
          style={HANDLE_STYLE}
          className="!bg-gray-400"
        />
        <Handle
          type="source"
          position={Position.Left}
          id="left"
          style={HANDLE_STYLE}
          className="!bg-gray-400"
        />
        <Handle
          type="source"
          position={Position.Right}
          id="right"
          style={HANDLE_STYLE}
          className="!bg-gray-400"
        />

        <div className="mb-1 flex items-center justify-center h-8">
          {svgUrl ? (
            <img src={svgUrl} alt={data.label} className="w-7 h-7 object-contain" />
          ) : (
            <span className={`text-2xl ${colors.icon}`}>{data.icon}</span>
          )}
        </div>
        <div className="text-xs font-semibold text-gray-700 leading-tight">
          {data.awsType}
        </div>
        <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[110px]">
          {data.label}
        </div>
      </div>

      {/* Plan mode change-action badge */}
      {changeCfg && changeCfg.symbol && (
        <div
          title={changeCfg.label}
          className={`
            absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center
            text-xs font-bold shadow
            ${changeCfg.badge}
          `}
        >
          {changeCfg.symbol}
        </div>
      )}

      {/* Validation badge (hidden in plan mode) */}
      {!inPlanMode && nodeFindings && nodeFindings.length > 0 && (
        <div
          title={nodeFindings.map((f) => f.message).join("\n")}
          className={`
            absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center
            text-white text-xs font-bold cursor-help shadow
            ${worstLevel === "critical" ? "bg-red-500" : worstLevel === "warning" ? "bg-amber-500" : "bg-blue-400"}
          `}
        >
          {worstLevel === "critical"
            ? "!"
            : worstLevel === "warning"
              ? "!"
              : "i"}
        </div>
      )}
    </div>
  );
}
