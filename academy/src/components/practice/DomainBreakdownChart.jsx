export default function DomainBreakdownChart({ breakdown, passThreshold = 70 }) {
  if (!breakdown?.length) {
    return (
      <div className="text-sm text-gray-500 text-center py-6">No domain data available.</div>
    );
  }

  return (
    <div className="space-y-4">
      {breakdown.map((row) => {
        const pct = row.percent ?? 0;
        const barColor =
          pct >= passThreshold ? "bg-green-500" : pct >= passThreshold - 10 ? "bg-amber-500" : "bg-red-500";
        return (
          <div key={row.domain}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium text-gray-800">{row.domain}</span>
              <span className="text-gray-600">
                {row.correct}/{row.total} ({pct}%)
              </span>
            </div>
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${barColor}`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-gray-500 pt-1">
        Passing threshold: {passThreshold}% per domain recommendation logic.
      </p>
    </div>
  );
}
