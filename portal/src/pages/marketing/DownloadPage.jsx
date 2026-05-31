import { Link } from "react-router-dom";
import { DOCS_BASE, GITHUB_URL } from "../../content/siteContent";

export default function DownloadPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Download Archon</h1>
      <p className="mt-4 text-gray-600 leading-relaxed">
        Archon is self-hosted open core. Clone from GitHub and run locally — your architectures and credentials
        never leave your environment.
      </p>

      <div className="mt-10 grid sm:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900">GitHub (recommended)</h2>
          <p className="text-sm text-gray-600 mt-2">
            Full source, Docker Compose, and the one-click installer. Apache 2.0 + Commons Clause.
          </p>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            github.com/Sking-4242/archonv1 →
          </a>
          <pre className="mt-4 bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto">
            git clone {GITHUB_URL}.git{"\n"}cd archonv1{"\n"}python install.py
          </pre>
        </div>

        <div className="rounded-2xl border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900">One-click installer</h2>
          <p className="text-sm text-gray-600 mt-2">
            After cloning, run <code className="bg-gray-100 px-1 rounded">python install.py</code> for a guided GUI
            that configures LLM keys, builds Docker, and opens the app.
          </p>
          <Link
            to="/guides/installation"
            className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          >
            Installation guide →
          </Link>
        </div>
      </div>

      <section className="mt-12 rounded-xl border border-indigo-100 bg-indigo-50 p-6">
        <h2 className="font-bold text-gray-900">Academy &amp; instructor tools</h2>
        <p className="text-sm text-gray-700 mt-2">
          Create a free account for full Academy access — all cert tracks, practice tests, AI tutor, and instructor
          dashboard. Self-hosted Professional works offline without an account.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold"
          >
            Create account
          </Link>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Documentation</h2>
        <ul className="text-sm space-y-2 text-gray-600">
          <li>
            <a href={`${DOCS_BASE}/GETTING_STARTED.md`} className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Getting started
            </a>
          </li>
          <li>
            <a href={`${DOCS_BASE}/DISCOVERY_GUIDE.md`} className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
              Discovery guide
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
