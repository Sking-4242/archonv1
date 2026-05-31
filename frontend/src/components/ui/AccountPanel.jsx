import { useEffect, useState } from "react";
import useAuthStore from "../../store/authStore";
import useAccessStore from "../../store/accessStore";
import { loginUser, registerUser, verifyMfa } from "../../api/auth";
import { activateLicense } from "../../api/access";
import AdminLicensePanel from "./AdminLicensePanel";

export default function AccountPanel() {
  const { user, token, login, logout } = useAuthStore();
  const { tier, license, hasFullAccess, openAccess, showRenewalWarning, renewalMessage, refresh } = useAccessStore();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [licenseKey, setLicenseKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");

  useEffect(() => {
    if (token) refresh();
  }, [token, refresh]);

  async function handleAuthSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login" && mfaToken) {
        const data = await verifyMfa(mfaToken, mfaCode);
        login(data.user, data.token);
        setMfaToken("");
        setMfaCode("");
        await refresh();
        setMessage("Signed in.");
        return;
      }

      const data =
        mode === "login"
          ? await loginUser(form.email, form.password)
          : await registerUser(form.email, form.password, form.displayName);

      if (data.mfa_required) {
        setMfaToken(data.mfa_token);
        setMessage("Enter the code from your authenticator app.");
        return;
      }

      login(data.user, data.token);
      await refresh();
      setMessage(mode === "login" ? "Signed in." : "Account created.");
    } catch (err) {
      setError(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleActivateLicense(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await activateLicense(licenseKey.trim());
      setMessage(result.message ?? "License activated.");
      setLicenseKey("");
      await refresh();
    } catch (err) {
      setError(err.message ?? "Could not activate license");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="space-y-5">
        {showRenewalWarning && renewalMessage && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {renewalMessage}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 px-4 py-3">
          <div className="text-sm font-medium text-gray-900">
            {user.display_name || user.name || user.email}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
          <div className="text-xs text-gray-500 mt-2">
            Plan:{" "}
            <span className="font-medium capitalize">
              {user.role === "admin" ? "admin (full access)" : openAccess ? "open (full access)" : tier}
            </span>
            {!openAccess && license?.status ? ` · License ${license.status}` : ""}
            {user.role === "admin" && !license && !openAccess ? " · no license key required" : ""}
          </div>
        </div>

        {user.role === "admin" && <AdminLicensePanel />}

        {!openAccess && !license && !hasFullAccess && (
          <form onSubmit={handleActivateLicense} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              License key
            </label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="Paste your license key"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={busy || !licenseKey.trim()}
              className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
            >
              Activate license
            </button>
          </form>
        )}

        {message && <p className="text-sm text-green-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={() => {
            logout();
            setMessage("");
          }}
          className="text-sm text-gray-600 hover:text-gray-900 underline"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Sign in for full access to validation, FinOps, and Academy features when using the hosted service.
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 text-sm py-2 rounded-lg border ${
            mode === "login"
              ? "border-indigo-500 text-indigo-700 bg-indigo-50"
              : "border-gray-200 text-gray-600"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 text-sm py-2 rounded-lg border ${
            mode === "register"
              ? "border-indigo-500 text-indigo-700 bg-indigo-50"
              : "border-gray-200 text-gray-600"
          }`}
        >
          Create account
        </button>
      </div>

      <form onSubmit={handleAuthSubmit} className="space-y-3">
        {!mfaToken && mode === "register" && (
          <input
            type="text"
            placeholder="Display name"
            value={form.displayName}
            onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
        <input
          type="text"
          required
          autoComplete="username"
          placeholder="Email or username"
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
          disabled={!!mfaToken}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
        />
        {!mfaToken && (
          <input
            type="password"
            required
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
        {mfaToken && (
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            placeholder="6-digit MFA code"
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        )}
        <button
          type="submit"
          disabled={busy || (mfaToken && !mfaCode.trim())}
          className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Working…" : mfaToken ? "Verify code" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
