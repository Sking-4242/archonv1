/**
 * AwsCredentialsPanel.jsx
 *
 * AWS credential management panel for the Settings modal.
 *
 * A — Profile list: shows all profiles in ~/.aws/credentials with delete + verify
 * B — Add profile form: masked inputs for key ID / secret / session token / region
 * C — Verify button: calls STS GetCallerIdentity and shows account ID + ARN
 *
 * Credentials are sent over localhost only and written directly to
 * ~/.aws/credentials by the backend. They are never stored in frontend state
 * beyond the form lifetime, and never persisted to localStorage.
 */

import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail ?? `Request failed (${res.status})`);
  return data;
}

function Badge({ children, variant = "gray" }) {
  const cls = {
    gray: "bg-gray-100 text-gray-600 border-gray-200",
    green: "bg-green-50 text-green-700 border-green-200",
    red: "bg-red-50 text-red-600 border-red-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
  }[variant];
  return (
    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${cls}`}>
      {children}
    </span>
  );
}

// ─── Verify button + result inline ───────────────────────────────────────────

function VerifyButton({ profile }) {
  const [state, setState] = useState("idle"); // idle | loading | ok | fail
  const [result, setResult] = useState(null);

  async function verify() {
    setState("loading");
    setResult(null);
    try {
      const data = await apiFetch("/discover/credentials/verify", {
        method: "POST",
        body: JSON.stringify({ profile: profile ?? null }),
      });
      setState(data.valid ? "ok" : "fail");
      setResult(data);
    } catch (err) {
      setState("fail");
      setResult({ valid: false, error: err.message });
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={verify}
        disabled={state === "loading"}
        className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors whitespace-nowrap"
      >
        {state === "loading" ? "Verifying…" : "Test connection"}
      </button>
      {state === "ok" && result && (
        <div className="text-xs text-green-700 bg-green-50 border border-green-100 rounded px-2 py-1 leading-relaxed">
          <div className="font-semibold">✓ Valid</div>
          <div className="text-green-600 truncate" title={result.arn}>{result.arn}</div>
          <div className="text-green-500">Account: {result.account_id}</div>
        </div>
      )}
      {state === "fail" && result && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-2 py-1">
          ✗ {result.error ?? "Invalid credentials"}
        </div>
      )}
    </div>
  );
}

// ─── Profile row ──────────────────────────────────────────────────────────────

function ProfileRow({ profile, isDefault, onDeleted }) {
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await apiFetch(`/discover/credentials/${encodeURIComponent(profile)}`, {
        method: "DELETE",
      });
      onDeleted(profile);
    } catch (err) {
      alert(`Could not delete profile: ${err.message}`);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-800 flex-1">{profile}</span>
        {isDefault && <Badge variant="blue">default</Badge>}
      </div>
      <div className="flex items-start gap-2 flex-wrap">
        <VerifyButton profile={profile} />
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`text-xs px-2.5 py-1 rounded border transition-colors whitespace-nowrap ${
            confirmDelete
              ? "border-red-300 text-red-600 bg-red-50 hover:bg-red-100"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          {deleting ? "Deleting…" : confirmDelete ? "Confirm delete?" : "Delete"}
        </button>
        {confirmDelete && !deleting && (
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Add profile form ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  profile_name: "",
  aws_access_key_id: "",
  aws_secret_access_key: "",
  aws_session_token: "",
  region: "",
};

function AddProfileForm({ onAdded, existingProfiles }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [showSecret, setShowSecret] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [overwriteNeeded, setOverwriteNeeded] = useState(false);
  const firstRef = useRef(null);

  useEffect(() => { firstRef.current?.focus(); }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError(null);
    setOverwriteNeeded(false);
  }

  async function handleSave(overwrite = false) {
    if (!form.profile_name.trim()) { setError("Profile name is required"); return; }
    if (!form.aws_access_key_id.trim()) { setError("Access Key ID is required"); return; }
    if (!form.aws_secret_access_key.trim()) { setError("Secret Access Key is required"); return; }

    setSaving(true);
    setError(null);
    try {
      const body = {
        profile_name: form.profile_name.trim(),
        aws_access_key_id: form.aws_access_key_id.trim(),
        aws_secret_access_key: form.aws_secret_access_key.trim(),
        overwrite,
      };
      if (form.aws_session_token.trim()) body.aws_session_token = form.aws_session_token.trim();
      if (form.region.trim()) body.region = form.region.trim();

      await apiFetch("/discover/credentials/add", {
        method: "POST",
        body: JSON.stringify(body),
      });

      // Clear sensitive fields immediately
      setForm(EMPTY_FORM);
      setShowSecret(false);
      setShowToken(false);
      onAdded(form.profile_name.trim());
    } catch (err) {
      if (err.message.includes("already exists")) {
        setOverwriteNeeded(true);
        setError(`Profile '${form.profile_name}' already exists.`);
      } else {
        setError(err.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100";

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
      <h4 className="text-sm font-semibold text-gray-800">Add AWS Profile</h4>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Profile name</label>
        <input
          ref={firstRef}
          type="text"
          value={form.profile_name}
          onChange={(e) => set("profile_name", e.target.value)}
          placeholder="e.g. dev, prod, personal"
          className={inputCls}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">AWS Access Key ID</label>
        <input
          type="text"
          value={form.aws_access_key_id}
          onChange={(e) => set("aws_access_key_id", e.target.value)}
          placeholder="AKIAIOSFODNN7EXAMPLE"
          className={inputCls}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">AWS Secret Access Key</label>
        <div className="relative">
          <input
            type={showSecret ? "text" : "password"}
            value={form.aws_secret_access_key}
            onChange={(e) => set("aws_secret_access_key", e.target.value)}
            placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
            className={`${inputCls} pr-16`}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowSecret((s) => !s)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
          >
            {showSecret ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      <details className="group">
        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Optional: Session token &amp; region
        </summary>
        <div className="mt-2 space-y-3 pl-3 border-l-2 border-gray-200">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Session token <span className="text-gray-400 font-normal">(temporary credentials only)</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? "text" : "password"}
                value={form.aws_session_token}
                onChange={(e) => set("aws_session_token", e.target.value)}
                placeholder="Optional"
                className={`${inputCls} pr-16`}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowToken((s) => !s)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600"
              >
                {showToken ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Default region</label>
            <input
              type="text"
              value={form.region}
              onChange={(e) => set("region", e.target.value)}
              placeholder="e.g. us-east-1"
              className={inputCls}
              autoComplete="off"
            />
          </div>
        </div>
      </details>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
          {error}
          {overwriteNeeded && (
            <button
              onClick={() => handleSave(true)}
              className="ml-2 underline font-medium"
            >
              Overwrite
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {saving ? "Saving…" : "Save Profile"}
        </button>
        <button
          type="button"
          onClick={() => { setForm(EMPTY_FORM); setError(null); setOverwriteNeeded(false); }}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50"
        >
          Clear
        </button>
      </div>

      <p className="text-xs text-gray-400 leading-relaxed">
        Credentials are written to <code className="bg-gray-100 px-1 rounded">~/.aws/credentials</code> with
        600 permissions. They are sent over localhost only and never stored in the browser.
      </p>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function AwsCredentialsPanel() {
  const [profiles, setProfiles] = useState([]);
  const [hasDefaultEnv, setHasDefaultEnv] = useState(false);
  const [credentialsFile, setCredentialsFile] = useState("");
  const [loading, setLoading] = useState(true);
  const [backendError, setBackendError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  async function loadProfiles() {
    setLoading(true);
    setBackendError(null);
    try {
      const data = await apiFetch("/discover/credentials/list");
      setProfiles(data.profiles ?? []);
      setHasDefaultEnv(data.has_default_credentials ?? false);
      setCredentialsFile(data.credentials_file ?? "");
    } catch (err) {
      setBackendError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadProfiles(); }, []);

  function handleAdded(profileName) {
    setShowAddForm(false);
    loadProfiles();
  }

  function handleDeleted(profileName) {
    setProfiles((prev) => prev.filter((p) => p !== profileName));
  }

  if (backendError) {
    return (
      <div className="space-y-3">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold mb-1">Cannot reach backend</p>
          <p className="text-xs">{backendError}</p>
          <p className="text-xs mt-2">Make sure the Archon backend is running on <code>localhost:8000</code>.</p>
        </div>
        <button onClick={loadProfiles} className="text-sm text-indigo-600 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800">AWS Credentials</h3>
        {credentialsFile && (
          <p className="text-xs text-gray-400 mt-0.5 font-mono">{credentialsFile}</p>
        )}
      </div>

      {/* Default / env credentials */}
      {hasDefaultEnv && (
        <div className="p-3 border border-gray-100 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-gray-800">Default credential chain</span>
            <Badge variant="blue">active</Badge>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Environment variables or instance profile — no profile name needed.
          </p>
          <VerifyButton profile={null} />
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p className="text-xs text-gray-400 animate-pulse">Loading profiles…</p>
      )}

      {/* Profile list */}
      {!loading && profiles.length === 0 && !hasDefaultEnv && (
        <div className="rounded-lg border border-yellow-100 bg-yellow-50 p-3 text-xs text-yellow-800">
          <p className="font-semibold mb-1">No AWS credentials configured</p>
          <p>Add a profile below, or configure credentials with the AWS CLI:</p>
          <code className="block mt-1 bg-yellow-100 rounded px-2 py-1 font-mono">aws configure</code>
        </div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Named profiles ({profiles.length})
          </p>
          {profiles.map((p) => (
            <ProfileRow
              key={p}
              profile={p}
              isDefault={p === "default"}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      )}

      {/* Add profile */}
      {!showAddForm ? (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2 rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
        >
          + Add AWS Profile
        </button>
      ) : (
        <div>
          <AddProfileForm onAdded={handleAdded} existingProfiles={profiles} />
          <button
            onClick={() => setShowAddForm(false)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
