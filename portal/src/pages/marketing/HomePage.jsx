import { Link } from "react-router-dom";
import { ACADEMY_FEATURES, PROFESSIONAL_FEATURES } from "../../content/siteContent";

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50 via-white to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
          <p className="text-sm font-semibold text-indigo-600 mb-3">Professional 1.0</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight max-w-3xl leading-tight">
            Design cloud infrastructure visually. Validate before you ship.
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-2xl leading-relaxed">
            Archon is a self-hosted IDE for multi-cloud architecture — canvas design, 500+ validation rules,
            FinOps analysis, Terraform import/export, and AWS discovery. Academy adds structured cert prep on
            the same stack.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/download"
              className="inline-flex items-center px-5 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm"
            >
              Download Archon
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center px-5 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 text-gray-800 font-semibold text-sm"
            >
              Create account
            </Link>
          </div>
          <p className="mt-6 text-sm text-gray-500">
            Self-host from GitHub for offline use. Sign in to Academy for full cert prep, instructor tools, and AI
            tutoring — free while we grow the community.
          </p>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-gray-100">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Archon Professional</h2>
            <p className="text-gray-600 mb-8">
              The infrastructure studio for engineers who want compliance-aware designs, not just diagrams.
            </p>
            <ul className="space-y-5">
              {PROFESSIONAL_FEATURES.map((f) => (
                <li key={f.title}>
                  <h3 className="font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Archon Academy</h2>
            <p className="text-gray-600 mb-8">
              Guided cloud education with the same canvas students use in industry — from Cloud Practitioner through
              Solutions Architect Professional.
            </p>
            <ul className="space-y-5">
              {ACADEMY_FEATURES.map((f) => (
                <li key={f.title}>
                  <h3 className="font-semibold text-gray-900">{f.title}</h3>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h2 className="text-xl font-bold">One stack, two products</h2>
            <p className="text-gray-400 mt-2 text-sm max-w-xl">
              Run Professional on port 3000 and Academy on 3001 from a single{" "}
              <code className="text-indigo-300">docker compose up</code>. Same backend, same validation engine,
              same AI layer.
            </p>
          </div>
          <Link
            to="/guides/getting-started"
            className="shrink-0 px-5 py-2.5 rounded-lg bg-white text-gray-900 font-semibold text-sm hover:bg-gray-100"
          >
            Read the getting started guide
          </Link>
        </div>
      </section>
    </>
  );
}
