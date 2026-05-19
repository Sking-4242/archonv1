import { useState } from "react";
import { getComponentInfo } from "../../utils/learningModeConfig";

export default function LearningModeTooltip({ componentType, children }) {
  const [open, setOpen] = useState(false);
  const info = getComponentInfo(componentType);
  if (!info) return children;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 bg-gray-900 border border-blue-800/60 rounded-lg shadow-xl p-3 pointer-events-none">
          <p className="text-xs font-semibold text-blue-400 mb-1">{info.label}</p>
          <p className="text-xs text-gray-300 mb-2">{info.description}</p>
          {info.whenToUse && (
            <>
              <p className="text-xs font-medium text-gray-400 mb-0.5">When to use</p>
              <p className="text-xs text-gray-400 mb-2">{info.whenToUse}</p>
            </>
          )}
          {info.commonMistakes?.length > 0 && (
            <>
              <p className="text-xs font-medium text-yellow-400 mb-1">Common mistakes</p>
              <ul className="space-y-0.5">
                {info.commonMistakes.map((m, i) => (
                  <li key={i} className="text-xs text-gray-400 flex gap-1.5">
                    <span className="text-yellow-500 shrink-0">•</span>
                    {m}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
