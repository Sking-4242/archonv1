/**
 * DiscoverTab.jsx
 *
 * Sidebar panel for the Discovery tool. Displays resources loaded from an
 * `archon-cli discover --format archon` JSON report.
 *
 * Empty state  — instructions + Import button
 * Loaded state — searchable, filterable resource browser grouped by service.
 *               Each resource can be added individually to the canvas or in
 *               bulk per service group.
 */

import { useState } from "react";
import useDiscoveryStore from "../../store/discoveryStore";
import useGraphStore from "../../store/graphStore";
import useAccessStore from "../../store/accessStore";
import UpgradePrompt from "../ui/UpgradePrompt";
import { AWS_ICONS } from "../../assets/icons/awsIcons";

// ─── State badge ──────────────────────────────────────────────────────────────

const ACTIVE_STATES = new Set(["running", "active", "available", "in-use", "ACTIVE", "enabled"]);
const STOPPED_STATES = new Set(["stopped", "terminated", "deleted", "failed", "error"]);
const PENDING_STATES = new Set(["pending", "starting", "stopping", "rebooting", "modifying"]);

function StateBadge({ state }) {
  const s = (state ?? "").toLowerCase();
  let cls = "bg-gray-100 text-gray-500 border-gray-200";
  if (ACTIVE_STATES.has(state) || ACTIVE_STATES.has(s)) {
    cls = "bg-green-50 text-green-700 border-green-200";
  } else if (STOPPED_STATES.has(state) || STOPPED_STATES.has(s)) {
    cls = "bg-red-50 text-red-700 border-red-200";
  } else if (PENDING_STATES.has(state) || PENDING_STATES.has(s)) {
    cls = "bg-yellow-50 text-yellow-700 border-yellow-200";
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded border font-medium ${cls}`}>
      {state || "—"}
    </span>
  );
}

// ─── Resource row ─────────────────────────────────────────────────────────────

function ResourceRow({ node, onAdd, added }) {
  const { label, awsType, discoveredState } = node.data;
  const icon = AWS_ICONS[node.type];

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 group">
      {icon ? (
        <img src={icon} alt={node.type} className="w-5 h-5 flex-shrink-0" />
      ) : (
        <div className="w-5 h-5 flex-shrink-0 rounded bg-gray-200" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-800 truncate" title={label}>
          {label}
        </div>
        <div className="text-xs text-gray-400">{awsType}</div>
      </div>
      <StateBadge state={discoveredState} />
      <button
        onClick={() => onAdd(node)}
        disabled={added}
        className={[
          "ml-1 flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-sm font-bold transition-colors",
          added
            ? "bg-green-100 text-green-600 cursor-default"
            : "bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white",
        ].join(" ")}
        title={added ? "Added to canvas" : "Add to canvas"}
      >
        {added ? "✓" : "+"}
      </button>
    </div>
  );
}

// ─── Service group ────────────────────────────────────────────────────────────

function ServiceGroup({ service, nodes, addedIds, onAdd, onAddAll, defaultCollapsed = false }) {
  const PAGE_SIZE = 50;
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const addedCount = nodes.filter((n) => addedIds.has(n.id)).length;
  const visibleNodes = nodes.slice(0, visibleCount);
  const hasMore = nodes.length > visibleCount;

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 sticky top-0 z-10">
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="text-gray-400 hover:text-gray-600 text-xs w-4 flex-shrink-0"
        >
          {collapsed ? "▶" : "▼"}
        </button>
        <span className="text-xs font-semibold text-gray-700 flex-1">{service}</span>
        <span className="text-xs text-gray-400">{nodes.length}</span>
        {addedCount > 0 && (
          <span className="text-xs text-green-600 font-medium">{addedCount} added</span>
        )}
        <button
          onClick={() => onAddAll(nodes)}
          className="text-xs px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors font-medium"
        >
          + All
        </button>
      </div>

      {/* Resources */}
      {!collapsed && visibleNodes.map((node) => (
        <ResourceRow
          key={node.id}
          node={node}
          onAdd={onAdd}
          added={addedIds.has(node.id)}
        />
      ))}
      {!collapsed && hasMore && (
        <button
          type="button"
          onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          className="w-full text-xs py-2 text-indigo-600 hover:bg-indigo-50 border-t border-gray-100"
        >
          Show {Math.min(PAGE_SIZE, nodes.length - visibleCount)} more ({nodes.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onOpenImport }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center gap-4">
      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></div>
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-1">No discovery report loaded</p>
        <p className="text-xs text-gray-500 mb-4">
          Run the CLI tool to discover your live AWS resources, then import the report.
        </p>
      </div>

      <div className="bg-gray-900 rounded-lg p-3 text-left w-full text-xs font-mono text-gray-300 leading-relaxed">
        <div className="text-gray-500 mb-1"># Install (one time)</div>
        <div className="text-green-400 mb-2">pip install archon-cli</div>
        <div className="text-gray-500 mb-1"># Discover your infrastructure</div>
        <div>archon-cli discover \</div>
        <div className="pl-4">--region us-east-1 \</div>
        <div className="pl-4">--format archon \</div>
        <div className="pl-4 text-cyan-300">&gt; report.json</div>
      </div>

      <button
        onClick={onOpenImport}
        className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
      >
        Import Report…
      </button>

      <p className="text-xs text-gray-400">
        Credentials are resolved locally via boto3 and never leave your machine.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DiscoverTab({ onOpenImport }) {
  const canDiscover = useAccessStore((s) => s.canUse("discovery"));
  const report = useDiscoveryStore((s) => s.report);
  const clearReport = useDiscoveryStore((s) => s.clearReport);
  const addNode = useGraphStore((s) => s.addNode);
  const addEdge = useGraphStore((s) => s.addEdge);
  const nodes = useGraphStore((s) => s.nodes);

  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [addedIds, setAddedIds] = useState(new Set());
  const [addedEdgeIds, setAddedEdgeIds] = useState(new Set());

  if (!canDiscover) {
    return <UpgradePrompt feature="discovery" />;
  }

  if (!report) {
    return <EmptyState onOpenImport={onOpenImport} />;
  }

  const allNodes = report.nodes ?? [];
  const reportEdges = report.edges ?? [];
  const largeReport = allNodes.length > 100;

  // Collect unique services in order of first appearance
  const services = [];
  const servicesSeen = new Set();
  for (const n of allNodes) {
    const svc = n.data?.service ?? "Other";
    if (!servicesSeen.has(svc)) {
      services.push(svc);
      servicesSeen.add(svc);
    }
  }

  // Filter by search + service
  const lowerSearch = search.toLowerCase();
  const filtered = allNodes.filter((n) => {
    const matchService = serviceFilter === "all" || n.data?.service === serviceFilter;
    const matchSearch =
      !lowerSearch ||
      (n.data?.label ?? "").toLowerCase().includes(lowerSearch) ||
      (n.data?.awsType ?? "").toLowerCase().includes(lowerSearch) ||
      (n.data?.service ?? "").toLowerCase().includes(lowerSearch);
    return matchService && matchSearch;
  });

  // Group filtered nodes by service
  const groups = {};
  for (const n of filtered) {
    const svc = n.data?.service ?? "Other";
    if (!groups[svc]) groups[svc] = [];
    groups[svc].push(n);
  }

  // Calculate a position for a new node — place it below/right of existing canvas nodes
  function nextPosition(index = 0) {
    const baseX = nodes.length > 0
      ? Math.max(...nodes.map((n) => (n.position?.x ?? 0))) + 220
      : 100;
    return {
      x: baseX + (index % 4) * 220,
      y: 100 + Math.floor(index / 4) * 140,
    };
  }

  function addEdgesForNodes(nodeIdSet, edgeIdsAlreadyAdded) {
    const canvasIds = new Set([...nodes.map((n) => n.id), ...nodeIdSet]);
    reportEdges.forEach((edge) => {
      if (edgeIdsAlreadyAdded.has(edge.id)) return;
      if (!canvasIds.has(edge.source) || !canvasIds.has(edge.target)) return;
      addEdge({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type ?? "network",
        data: { bidirectional: false },
      });
      edgeIdsAlreadyAdded.add(edge.id);
    });
    return edgeIdsAlreadyAdded;
  }

  function handleAdd(node, positionIndex = 0) {
    if (addedIds.has(node.id)) return;
    addNode({
      ...node,
      position: nextPosition(positionIndex),
    });
    const nextIds = new Set([...addedIds, node.id]);
    const nextEdgeIds = addEdgesForNodes(nextIds, new Set(addedEdgeIds));
    setAddedIds(nextIds);
    setAddedEdgeIds(nextEdgeIds);
  }

  function handleAddAll(groupNodes) {
    const notYetAdded = groupNodes.filter((n) => !addedIds.has(n.id));
    let nextIds = new Set(addedIds);
    let nextEdgeIds = new Set(addedEdgeIds);
    notYetAdded.forEach((n, i) => {
      addNode({
        ...n,
        position: nextPosition(i),
      });
      nextIds.add(n.id);
    });
    nextEdgeIds = addEdgesForNodes(nextIds, nextEdgeIds);
    setAddedIds(nextIds);
    setAddedEdgeIds(nextEdgeIds);
  }

  function handleAddAllToCanvas() {
    handleAddAll(filtered);
  }

  function handleClear() {
    clearReport();
    setSearch("");
    setServiceFilter("all");
    setAddedIds(new Set());
    setAddedEdgeIds(new Set());
  }

  const addedCount = addedIds.size;
  const totalCount = allNodes.length;
  const edgeCount = reportEdges.length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-700">
              {totalCount} resources
            </span>
            {edgeCount > 0 && (
              <span className="text-xs text-gray-500">
                · {edgeCount} relationships
              </span>
            )}
            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">
              {report.region}
            </span>
            {addedCount > 0 && (
              <span className="text-xs text-green-600 font-medium">
                {addedCount} added
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleAddAllToCanvas}
              className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium"
              title="Add all filtered resources to canvas"
            >
              + All
            </button>
            <button
              onClick={handleClear}
              className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
              title="Clear discovery report"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search resources…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-md outline-none focus:border-indigo-400 mb-2"
        />

        {/* Service filter pills */}
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setServiceFilter("all")}
            className={[
              "text-xs px-2 py-0.5 rounded-full border font-medium transition-colors",
              serviceFilter === "all"
                ? "bg-indigo-600 border-indigo-600 text-white"
                : "bg-white border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600",
            ].join(" ")}
          >
            All
          </button>
          {services.map((svc) => (
            <button
              key={svc}
              onClick={() => setServiceFilter(svc)}
              className={[
                "text-xs px-2 py-0.5 rounded-full border font-medium transition-colors",
                serviceFilter === svc
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600",
              ].join(" ")}
            >
              {svc}
            </button>
          ))}
        </div>
      </div>

      {/* Resource list */}
      <div className="flex-1 overflow-y-auto">
        {Object.keys(groups).length === 0 ? (
          <div className="text-xs text-gray-400 text-center py-8">
            No resources match your filter.
          </div>
        ) : (
          Object.entries(groups).map(([svc, groupNodes]) => (
            <ServiceGroup
              key={svc}
              service={svc}
              nodes={groupNodes}
              addedIds={addedIds}
              onAdd={handleAdd}
              onAddAll={handleAddAll}
              defaultCollapsed={largeReport}
            />
          ))
        )}

        {/* Errors section */}
        {(report.errors ?? []).length > 0 && (
          <div className="px-3 py-2 mt-2">
            <p className="text-xs font-semibold text-yellow-700 mb-1">
              Discovery errors ({report.errors.length})
            </p>
            {report.errors.map((e, i) => (
              <div key={i} className="text-xs text-gray-500 truncate" title={e.error}>
                <span className="text-gray-700">{e.service}:</span> {e.error}
              </div>
            ))}
            <p className="text-xs text-gray-400 mt-1">
              These services had insufficient permissions or are not available in this region.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
