/**
 * StandardSelector.jsx
 *
 * A row of pill buttons that sets the active compliance standard filter
 * in validationStore. Used inside the ValidateTab header.
 */

import useValidationStore from "../../store/validationStore";

const STANDARDS = [
  { id: "all",   label: "All" },
  { id: "CIS",   label: "CIS" },
  { id: "SOC2",  label: "SOC 2" },
  { id: "PCI",   label: "PCI DSS" },
  { id: "HIPAA", label: "HIPAA" },
  { id: "NIST",  label: "NIST CSF" },
];

export default function StandardSelector() {
  const activeStandard   = useValidationStore((s) => s.activeStandard);
  const setActiveStandard = useValidationStore((s) => s.setActiveStandard);
  const findings         = useValidationStore((s) => s.findings);

  // Count findings per standard for the badge number
  const counts = {};
  for (const std of STANDARDS) {
    if (std.id === "all") {
      counts.all = findings.length;
    } else {
      counts[std.id] = findings.filter((f) =>
        (f.standards ?? []).includes(std.id)
      ).length;
    }
  }

  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {STANDARDS.map((std) => {
        const isActive = activeStandard === std.id;
        const count = counts[std.id] ?? 0;
        return (
          <button
            key={std.id}
            onClick={() => setActiveStandard(std.id)}
            className={[
              "text-xs px-2 py-0.5 rounded-full border font-medium transition-colors",
              isActive
                ? "bg-purple-600 border-purple-600 text-white"
                : "bg-white border-gray-300 text-gray-500 hover:border-purple-400 hover:text-purple-600",
            ].join(" ")}
            title={std.id === "all" ? "Show all findings" : `Filter to ${std.label} findings`}
          >
            {std.label}
            {count > 0 && (
              <span
                className={`ml-1 ${isActive ? "text-purple-200" : "text-gray-400"}`}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
