import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import useAuthStore from "../store/authStore";
import AdminLicensePanel from "../components/AdminLicensePanel";
import AdminUsagePanel from "../components/AdminUsagePanel";

function SecuritySection({ user, onUserUpdate }) {
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSetup() {
    setBusy(true);
    setError("");
    try {
      const result = await api.post("/auth/mfa/setup", {});
      setSetup(result);
      setMessage("Scan the URI in your authenticator app, then enter a code to confirm.");
    } catch (err) {
      setError(err.message ?? "MFA setup failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnable(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/mfa/enable", { code: code.trim() });
      setSetup(null);
      setCode("");
      setMessage("MFA enabled.");
      onUserUpdate({ ...user, mfa_enabled: true });
    } catch (err) {
      setError(err.message ?? "Could not enable MFA");
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/mfa/disable", { code: code.trim() });
      setCode("");
      setMessage("MFA disabled.");
      onUserUpdate({ ...user, mfa_enabled: false });
    } catch (err) {
      setError(err.message ?? "Could not disable MFA");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Security</h2>
      <p className="text-sm text-gray-600">
        {user.mfa_enabled
          ? "Two-factor authentication is enabled on this account."
          : "Add an authenticator app for two-factor authentication."}
      </p>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!user.mfa_enabled && !setup && (
        <button
          type="button"
          disabled={busy}
          onClick={handleSetup}
          className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-60"
        >
          Set up MFA
        </button>
      )}

      {setup && (
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-gray-500">Manual entry key</span>
            <div className="font-mono text-xs bg-gray-100 rounded px-2 py-1 mt-1 break-all">{setup.secret}</div>
          </div>
          <div>
            <span className="text-gray-500">otpauth URI</span>
            <div className="font-mono text-xs bg-gray-100 rounded px-2 py-1 mt-1 break-all">{setup.otpauth_uri}</div>
          </div>
          <form onSubmit={handleEnable} className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy || !code.trim()}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg disabled:opacity-60"
            >
              Enable
            </button>
          </form>
        </div>
      )}

      {user.mfa_enabled && (
        <form onSubmit={handleDisable} className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter MFA code to disable"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !code.trim()}
            className="px-4 py-2 border border-red-300 text-red-700 text-sm rounded-lg disabled:opacity-60"
          >
            Disable MFA
          </button>
        </form>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, logout, login } = useAuthStore();
  const [dashboard, setDashboard] = useState(null);
  const [error, setError] = useState("");

  async function loadDashboard() {
    const fresh = await api.get("/portal/dashboard");
    setDashboard(fresh);
    if (fresh.user) login(fresh.user, useAuthStore.getState().token);
  }

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    loadDashboard().catch((err) => setError(err.message ?? "Could not load dashboard"));
  }, [user, navigate]);

  if (!dashboard) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
  }

  const { access, open_access: openAccess } = dashboard;
  const isAdmin = dashboard.user.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-4 flex items-center justify-between">
        <Link to="/" className="hover:text-white">
          <div className="font-bold text-indigo-400">ARCHON</div>
          <div className="text-xs text-gray-400">Account Portal</div>
        </Link>
        <button onClick={() => { logout(); navigate("/login"); }} className="text-sm text-gray-300 hover:text-white">
          Sign out
        </button>
      </header>

      <main className="max-w-3xl mx-auto p-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{dashboard.user.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Access</dt>
              <dd className="font-medium capitalize text-gray-900">
                {openAccess ? "Full access (open beta)" : access.tier}
              </dd>
            </div>
          </dl>
          {openAccess && (
            <p className="text-sm text-gray-600 mt-4 leading-relaxed">
              Archon is free while we grow the community. Sign in to Academy or your self-hosted install for full
              features. Self-hosted Professional works offline without an account.
            </p>
          )}
        </section>

        <SecuritySection
          user={dashboard.user}
          onUserUpdate={(updated) => setDashboard((d) => ({ ...d, user: updated }))}
        />

        {isAdmin && (
          <>
            <AdminUsagePanel />
            <AdminLicensePanel />
          </>
        )}
      </main>
    </div>
  );
}
