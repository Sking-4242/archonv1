import { Handle, Position } from "@xyflow/react";
import { useAssignmentStore } from "../../store/assignmentStore";
import LearningModeTooltip from "./LearningModeTooltip";

const CATEGORY_STYLES = {
  networking:    "bg-blue-50   border-blue-300   text-blue-800",
  compute:       "bg-orange-50 border-orange-300 text-orange-800",
  load_balancing:"bg-purple-50 border-purple-300 text-purple-800",
  storage:       "bg-green-50  border-green-300  text-green-800",
  database:      "bg-teal-50   border-teal-300   text-teal-800",
  security:      "bg-red-50    border-red-300    text-red-800",
  integration:   "bg-yellow-50 border-yellow-300 text-yellow-800",
  management:    "bg-gray-50   border-gray-300   text-gray-800",
  ai_ml:         "bg-pink-50   border-pink-300   text-pink-800",
  analytics:     "bg-indigo-50 border-indigo-300 text-indigo-800",
};

const HANDLE_STYLE = { width: 8, height: 8, background: "#9ca3af", border: "none" };

export default function AssignmentNode({ data, selected }) {
  const learningMode = useAssignmentStore((s) => s.learningMode);
  const styles = CATEGORY_STYLES[data.category] ?? "bg-gray-50 border-gray-300 text-gray-800";

  const nodeBody = (
    <div
      className={`
        relative border-2 rounded-xl px-3 py-2.5 min-w-[90px] max-w-[120px]
        text-center shadow-sm transition-shadow cursor-default select-none
        ${styles}
        ${selected ? "ring-2 ring-blue-500 ring-offset-1 shadow-md" : ""}
      `}
    >
      <Handle type="target" position={Position.Top} style={HANDLE_STYLE} />
      <div className="text-2xl mb-1 leading-none">{data.icon}</div>
      <div className="text-[10px] font-semibold leading-tight break-words">{data.label}</div>
      <Handle type="source" position={Position.Bottom} style={HANDLE_STYLE} />
    </div>
  );

  if (!learningMode) return nodeBody;
  return (
    <LearningModeTooltip componentType={data.type}>
      {nodeBody}
    </LearningModeTooltip>
  );
}
