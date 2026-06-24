/**
 * DiscoveryWizard.jsx
 *
 * 5-step modal wizard for discovering live AWS infrastructure without the CLI.
 *
 * Step 1 — Profile:   pick AWS credential profile (or default chain)
 * Step 2 — Region:    choose target AWS region
 * Step 3 — Services:  categorized checklist of services to scan
 * Step 4 — Scanning:  SSE streaming progress table, one row per service
 * Step 5 — Review:    summary + "Load to panel" button
 */

import { useEffect, useRef, useState } from "react";
import useDiscoveryStore from "../../store/discoveryStore";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StepDot({ n, current, label }) {
  const done = n < current;
  const active = n === current;
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div
        className={[
          "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
          done
            ? "bg-indigo-600 border-indigo-600 text-white"
            : active
            ? "bg-white border-indigo-600 text-indigo-600"
            : "bg-white border-gray-300 text-gray-400",
        ].join(" ")}
      >
        {done ? "✓" : n}
      </div>
      <span className={`text-xs truncate ${active ? "text-indigo-600 font-semibold" : "text-gray-400"}`}>
        {label}
      </span>
    </div>
  );
}

function StepBar({ step }) {
  const steps = ["Profile", "Region", "Services", "Scan", "Review"];
  return (
    <div className="flex items-start justify-between px-2 mb-6">
      {steps.map((label, i) => (
        <div key={label} className="flex items-center flex-1">
          <StepDot n={i + 1} current={step} label={label} />
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mt-[-12px] ${i + 1 < step ? "bg-indigo-600" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Step 1: Profile ──────────────────────────────────────────────────────────

function StepProfile({ onNext, initial }) {
  const [profiles, setProfiles] = useState([]);
  const [hasDefault, setHasDefault] = useState(false);
  const [selected, setSelected] = useState(initial ?? "__default__");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/discover/profiles`)
      .then((r) => r.json())
      .then((d) => {
        setProfiles(d.profiles ?? []);
        setHasDefault(d.has_default_credentials ?? false);
        setLoading(false);
      })
      .catch(() => {
        setError("Cannot reach the backend. Make sure it is running, then check Settings → AWS to configure credentials.");
        setLoading(false);
      });
  }, []);

  const hasAny = hasDefault || profiles.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">AWS Credential Profile</h3>
        <p className="text-xs text-gray-500">
          Choose which AWS credentials to use. Profiles are read from{" "}
          <code className="bg-gray-100 px-1 rounded">~/.aws/credentials</code> and{" "}
          <code className="bg-gray-100 px-1 rounded">~/.aws/config</code> on the local machine.
        </p>
      </div>

      {loading && <p className="text-xs text-gray-400 animate-pulse">Loading profiles…</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}

      {!loading && !error && !hasAny && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-xs text-yellow-800">
          <p className="font-semibold mb-1">No AWS credentials found</p>
          <p>Configure credentials with the AWS CLI:</p>
          <code className="block mt-1 bg-yellow-100 rounded px-2 py-1 font-mono">aws configure</code>
          <p className="mt-2">Or set environment variables: <code>AWS_ACCESS_KEY_ID</code>, <code>AWS_SECRET_ACCESS_KEY</code>.</p>
        </div>
      )}

      {!loading && !error && hasAny && (
        <div className="flex flex-col gap-2">
          {hasDefault && (
            <label className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderColor: selected === "__default__" ? "#6366f1" : "#e5e7eb", background: selected === "__default__" ? "#eef2ff" : "" }}>
              <input type="radio" name="profile" value="__default__"
                checked={selected === "__default__"} onChange={() => setSelected("__default__")}
                className="accent-indigo-600" />
              <div>
                <div className="text-xs font-semibold text-gray-800">Default credential chain</div>
                <div className="text-xs text-gray-500">ENV vars → ~/.aws/credentials default → instance profile</div>
              </div>
            </label>
          )}
          {profiles.map((p) => (
            <label key={p} className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
              style={{ borderColor: selected === p ? "#6366f1" : "#e5e7eb", background: selected === p ? "#eef2ff" : "" }}>
              <input type="radio" name="profile" value={p}
                checked={selected === p} onChange={() => setSelected(p)}
                className="accent-indigo-600" />
              <span className="text-xs font-medium text-gray-800">{p}</span>
            </label>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={() => onNext(selected === "__default__" ? null : selected)}
          disabled={loading || !!error || !hasAny}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Region ───────────────────────────────────────────────────────────

const COMMON_REGIONS = ["us-east-1", "us-west-2", "eu-west-1", "ap-northeast-1", "ap-southeast-1"];

function StepRegion({ onNext, onBack, initial }) {
  const [regions, setRegions] = useState([]);
  const [selected, setSelected] = useState(initial ?? "us-east-1");

  useEffect(() => {
    fetch(`${API_URL}/discover/regions`)
      .then((r) => r.json())
      .then((d) => setRegions(d.regions ?? []))
      .catch(() => {});
  }, []);

  const displayRegions = regions.length > 0 ? regions : COMMON_REGIONS;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Target Region</h3>
        <p className="text-xs text-gray-500">Discovery scans a single region at a time.</p>
      </div>

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
      >
        {displayRegions.map((r) => (
          <option key={r} value={r}>{r}</option>
        ))}
      </select>

      <div className="flex justify-between pt-2">
        <button onClick={onBack} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          ← Back
        </button>
        <button onClick={() => onNext(selected)}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
          Next →
        </button>
      </div>
    </div>
  );
}

// ─── Step 3: Services ─────────────────────────────────────────────────────────

function StepServices({ onNext, onBack, initial }) {
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState(new Set(initial ?? []));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_URL}/discover/catalog`)
      .then((r) => r.json())
      .then((d) => {
        const groups = d.catalog ?? [];
        setCatalog(groups);
        if (!initial || initial.length === 0) {
          // Default: all selected
          const all = new Set(groups.flatMap((g) => g.services));
          setSelected(all);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function toggleAll(services, on) {
    setSelected((prev) => {
      const next = new Set(prev);
      services.forEach((s) => (on ? next.add(s) : next.delete(s)));
      return next;
    });
  }

  function toggleOne(service) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(service) ? next.delete(service) : next.add(service);
      return next;
    });
  }

  const totalServices = catalog.reduce((n, g) => n + g.services.length, 0);
  const estSeconds = Math.round((selected.size / Math.max(totalServices, 1)) * 45);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Services to Scan</h3>
        <p className="text-xs text-gray-500">
          {selected.size} of {totalServices} services selected
          {selected.size > 0 && ` · est. ~${estSeconds}s`}
        </p>
      </div>

      {loading && <p className="text-xs text-gray-400 animate-pulse">Loading service catalog…</p>}

      <div className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
        {catalog.map(({ category, services }) => {
          const catSelected = services.filter((s) => selected.has(s));
          const allOn = catSelected.length === services.length;
          return (
            <div key={category}>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 sticky top-0">
                <input type="checkbox" checked={allOn}
                  onChange={(e) => toggleAll(services, e.target.checked)}
                  className="accent-indigo-600 w-3.5 h-3.5" />
                <span className="text-xs font-semibold text-gray-700 flex-1">{category}</span>
                <span className="text-xs text-gray-400">{catSelected.length}/{services.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-0">
                {services.map((svc) => (
                  <label key={svc} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selected.has(svc)} onChange={() => toggleOne(svc)}
                      className="accent-indigo-600 w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs text-gray-700 truncate">{svc}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center pt-1">
        <div className="flex gap-2">
          <button onClick={() => toggleAll(catalog.flatMap((g) => g.services), true)}
            className="text-xs text-indigo-600 hover:underline">Select all</button>
          <span className="text-gray-300">|</span>
          <button onClick={() => setSelected(new Set())}
            className="text-xs text-gray-500 hover:underline">Clear all</button>
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            ← Back
          </button>
          <button onClick={() => onNext([...selected])} disabled={selected.size === 0}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
            Scan →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Scanning (SSE) ───────────────────────────────────────────────────

function StatusIcon({ status }) {
  if (status === "pending") return <span className="text-gray-300 text-xs">○</span>;
  if (status === "scanning") return <span className="text-indigo-500 text-xs animate-pulse">◉</span>;
  if (status === "ok") return <span className="text-green-500 text-xs">✓</span>;
  if (status === "error") return <span className="text-yellow-500 text-xs">⚠</span>;
  return null;
}

function StepScan({ profile, region, services, onDone, onBack }) {
  const [rows, setRows] = useState(() =>
    services.map((s) => ({ service: s, status: "pending", count: 0, error: null }))
  );
  const [currentService, setCurrentService] = useState(null);
  const [finished, setFinished] = useState(false);
  const [fatalError, setFatalError] = useState(null);
  const [report, setReport] = useState(null);
  const abortRef = useRef(null);
  const tableRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const res = await fetch(`${API_URL}/discover/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile, region, services }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setFatalError(err.detail ?? "Discovery failed");
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const parts = buf.split("\n\n");
          buf = parts.pop() ?? "";
          for (const part of parts) {
            const dataLine = part.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const evt = JSON.parse(dataLine.slice(6));
              if (evt.type === "service") {
                setCurrentService(evt.service);
                setRows((prev) =>
                  prev.map((r) =>
                    r.service === evt.service
                      ? { ...r, status: evt.status, count: evt.count, error: evt.error }
                      : r
                  )
                );
                // Auto-scroll to current row
                if (tableRef.current) {
                  const el = tableRef.current.querySelector(`[data-svc="${CSS.escape(evt.service)}"]`);
                  el?.scrollIntoView({ block: "nearest" });
                }
              } else if (evt.type === "done") {
                setReport(evt.report);
                setFinished(true);
                setCurrentService(null);
              } else if (evt.type === "error") {
                setFatalError(evt.message);
              }
            } catch {
              // skip malformed events
            }
          }
        }
      } catch (err) {
        if (err.name !== "AbortError") setFatalError(err.message);
      }
    })();

    return () => controller.abort();
  }, []);

  function handleCancel() {
    abortRef.current?.abort();
    onBack();
  }

  const okCount = rows.filter((r) => r.status === "ok").length;
  const errCount = rows.filter((r) => r.status === "error").length;
  const totalFound = rows.reduce((n, r) => n + r.count, 0);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">
          {finished ? "Scan Complete" : "Scanning…"}
        </h3>
        {finished && (
          <p className="text-xs text-gray-500">
            {totalFound} resources found across {okCount} services
            {errCount > 0 && ` · ${errCount} service${errCount > 1 ? "s" : ""} had errors`}
          </p>
        )}
        {!finished && currentService && (
          <p className="text-xs text-gray-500 animate-pulse">Scanning {currentService}…</p>
        )}
      </div>

      {fatalError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <p className="font-semibold">Discovery failed</p>
          <p>{fatalError}</p>
        </div>
      )}

      <div ref={tableRef} className="max-h-72 overflow-y-auto border border-gray-100 rounded-lg">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left px-3 py-2 text-gray-500 font-medium w-5"></th>
              <th className="text-left px-3 py-2 text-gray-500 font-medium">Service</th>
              <th className="text-right px-3 py-2 text-gray-500 font-medium">Found</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map((row) => {
              const isScanning = !finished && currentService === row.service;
              return (
                <tr key={row.service} data-svc={row.service}
                  className={isScanning ? "bg-indigo-50" : ""}>
                  <td className="px-3 py-1.5 text-center">
                    <StatusIcon status={isScanning ? "scanning" : row.status} />
                  </td>
                  <td className="px-3 py-1.5 text-gray-700">
                    {row.service}
                    {row.error && (
                      <span className="ml-2 text-yellow-600" title={row.error}>
                        (no access)
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-right text-gray-500">
                    {row.status !== "pending" ? row.count : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between pt-1">
        {!finished ? (
          <button onClick={handleCancel}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
        ) : (
          <button onClick={onBack}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
            ← Back
          </button>
        )}
        <button onClick={() => onDone(report)} disabled={!finished || !report}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
          Review →
        </button>
      </div>
    </div>
  );
}

// ─── Step 5: Review ───────────────────────────────────────────────────────────

function StepReview({ report, region, onLoad, onClose }) {
  const nodes = report?.nodes ?? [];
  const errors = report?.errors ?? [];

  // Group by service for summary cards
  const bySvc = {};
  for (const n of nodes) {
    const svc = n.data?.service ?? "Other";
    bySvc[svc] = (bySvc[svc] ?? 0) + 1;
  }
  const svcs = Object.entries(bySvc).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-800 mb-1">Discovery Complete</h3>
        <p className="text-xs text-gray-500">
          Found <strong>{nodes.length}</strong> resources in <strong>{region}</strong>.
          Review below, then load to the Discovery panel.
        </p>
      </div>

      {/* Resource counts */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-gray-100 p-3 text-center">
          <div className="text-2xl font-bold text-indigo-600">{nodes.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Resources</div>
        </div>
        <div className="rounded-lg border border-gray-100 p-3 text-center">
          <div className="text-2xl font-bold text-gray-700">{svcs.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Services</div>
        </div>
        <div className="rounded-lg border border-gray-100 p-3 text-center">
          <div className={`text-2xl font-bold ${errors.length > 0 ? "text-yellow-600" : "text-green-600"}`}>
            {errors.length}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Errors</div>
        </div>
      </div>

      {/* Top services */}
      {svcs.length > 0 && (
        <div className="max-h-36 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-50">
          {svcs.map(([svc, count]) => (
            <div key={svc} className="flex items-center justify-between px-3 py-1.5 text-xs">
              <span className="text-gray-700">{svc}</span>
              <span className="text-gray-500 font-medium">{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-3">
          <p className="text-xs font-semibold text-yellow-800 mb-1">
            {errors.length} service{errors.length > 1 ? "s" : ""} had errors
          </p>
          <div className="max-h-24 overflow-y-auto space-y-0.5">
            {errors.map((e, i) => (
              <p key={i} className="text-xs text-yellow-700">
                <span className="font-medium">{e.service}:</span> {e.error}
              </p>
            ))}
          </div>
          <p className="text-xs text-yellow-600 mt-1">
            Usually caused by missing IAM permissions for that service.
          </p>
        </div>
      )}

      <div className="flex justify-between pt-1">
        <button onClick={onClose}
          className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
          Close
        </button>
        <button onClick={() => onLoad(report)} disabled={nodes.length === 0}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40">
          Load to Panel →
        </button>
      </div>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export default function DiscoveryWizard({ onClose, onSwitchToDiscover, initialRegion }) {
  const setReport = useDiscoveryStore((s) => s.setReport);
  const lastProfile = useDiscoveryStore((s) => s.lastProfile);
  const lastRegion = useDiscoveryStore((s) => s.lastRegion);
  const setLastProfile = useDiscoveryStore((s) => s.setLastProfile);
  const setLastRegion = useDiscoveryStore((s) => s.setLastRegion);

  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(lastProfile ?? null);
  const [region, setRegion] = useState(lastRegion ?? initialRegion ?? "us-east-1");
  const [services, setServices] = useState([]);
  const [report, setLocalReport] = useState(null);

  function handleProfileNext(p) {
    setProfile(p);
    setLastProfile(p);
    setStep(2);
  }

  function handleRegionNext(r) {
    setRegion(r);
    setLastRegion(r);
    setStep(3);
  }

  function handleServicesNext(svcs) {
    setServices(svcs);
    setStep(4);
  }

  function handleScanDone(r) {
    setLocalReport(r);
    setStep(5);
  }

  function handleLoad(r) {
    setReport(r);
    onSwitchToDiscover?.();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">Discover AWS Infrastructure</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Scan your live account and import resources to the canvas
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <StepBar step={step} />

          {step === 1 && (
            <StepProfile onNext={handleProfileNext} initial={profile ? profile : "__default__"} />
          )}
          {step === 2 && (
            <StepRegion onNext={handleRegionNext} onBack={() => setStep(1)} initial={region} />
          )}
          {step === 3 && (
            <StepServices onNext={handleServicesNext} onBack={() => setStep(2)} initial={services} />
          )}
          {step === 4 && (
            <StepScan
              profile={profile}
              region={region}
              services={services}
              onDone={handleScanDone}
              onBack={() => setStep(3)}
            />
          )}
          {step === 5 && (
            <StepReview
              report={report}
              region={region}
              onLoad={handleLoad}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
