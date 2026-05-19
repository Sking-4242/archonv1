import { useState } from "react";
import { PALETTE } from "./palette";
import { AZURE_PALETTE } from "../../utils/azurePalette";
import { GCP_PALETTE } from "../../utils/gcpPalette";
import { ONPREM_PALETTE } from "../../utils/onpremPalette";
import useProviderStore from "../../store/providerStore";

const PALETTES = {
  aws: PALETTE,
  azure: AZURE_PALETTE,
  gcp: GCP_PALETTE,
  onprem: ONPREM_PALETTE,
};

const HEADER_LABELS = {
  aws: "AWS Components",
  azure: "Azure Components",
  gcp: "GCP Components",
  onprem: "On-Prem Components",
};

export default function ComponentSidebar({ onDragStart }) {
  const infraProvider = useProviderStore((s) => s.infraProvider);
  const palette = PALETTES[infraProvider] ?? PALETTE;

  const [expanded, setExpanded] = useState(
    Object.fromEntries(palette.map((g) => [g.category, true])),
  );
  const [search, setSearch] = useState("");

  const toggle = (category) =>
    setExpanded((prev) => ({ ...prev, [category]: !prev[category] }));

  const filtered =
    search.trim() === ""
      ? palette
      : palette
          .map((group) => ({
            ...group,
            components: group.components.filter((c) =>
              c.label.toLowerCase().includes(search.toLowerCase()),
            ),
          }))
          .filter((g) => g.components.length > 0);

  return (
    <aside className="w-56 flex-shrink-0 bg-gray-900 text-gray-100 border-r border-gray-700 flex flex-col overflow-hidden">
      <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-700 flex-shrink-0">
        {HEADER_LABELS[infraProvider] ?? "Components"}
      </div>
      <div className="px-2 py-2 border-b border-gray-700 flex-shrink-0">
        <input
          type="text"
          placeholder="Search components…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-800 text-gray-100 text-xs rounded px-2 py-1 border border-gray-700 focus:outline-none focus:border-indigo-500 placeholder-gray-500"
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map((group) => (
          <div key={group.category}>
            <button
              onClick={() => toggle(group.category)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-gray-800 transition-colors"
            >
              <span>{group.label}</span>
              <span className="text-gray-500">
                {expanded[group.category] ? "▾" : "▸"}
              </span>
            </button>
            {expanded[group.category] && (
              <div className="pb-1">
                {group.components.map((comp) => (
                  <div
                    key={comp.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, comp, group.category)}
                    className="flex items-center gap-2 mx-2 mb-1 px-2 py-1.5 rounded cursor-grab bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
                  >
                    <span className="text-base">{comp.icon}</span>
                    <span className="text-xs text-gray-200">{comp.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}
