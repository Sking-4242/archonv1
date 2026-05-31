import { Link } from "react-router-dom";
import { DOCS_BASE, GITHUB_URL } from "../../content/siteContent";

function GuideShell({ title, children }) {
  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16 prose prose-gray prose-sm sm:prose-base">
      <Link to="/guides" className="text-sm text-indigo-600 hover:underline no-underline">
        ← All guides
      </Link>
      <h1 className="text-3xl font-bold text-gray-900 mt-4 mb-8">{title}</h1>
      <div className="text-gray-700 space-y-4 leading-relaxed">{children}</div>
    </article>
  );
}

export function InstallationGuidePage() {
  return (
    <GuideShell title="Installation">
      <p>
        Archon runs as Docker containers on your machine. The fastest path is the one-click installer; manual
        Compose works for developers who prefer the terminal.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Requirements</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>Docker Desktop with Compose plugin</li>
        <li>Python 3.11+ (for the installer GUI only)</li>
        <li>An LLM API key (Anthropic, OpenAI, Gemini, xAI) or local Ollama</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">One-click installer (recommended)</h2>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
        {`git clone ${GITHUB_URL}.git
cd archonv1
python install.py`}
      </pre>
      <p>
        The installer checks Docker, writes <code className="bg-gray-100 px-1 rounded">.env</code>, builds
        containers, and opens Professional in your browser.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Manual Docker Compose</h2>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
        {`cp .env.example .env
docker compose up --build -d
docker compose exec backend python seed.py`}
      </pre>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          Professional:{" "}
          <a href="http://localhost:3000" className="text-indigo-600 hover:underline">
            http://localhost:3000
          </a>
        </li>
        <li>
          Academy:{" "}
          <a href="http://localhost:3001" className="text-indigo-600 hover:underline">
            http://localhost:3001
          </a>
        </li>
        <li>
          Customer portal (local):{" "}
          <a href="http://localhost:3002" className="text-indigo-600 hover:underline">
            http://localhost:3002
          </a>
        </li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">archon-cli (optional)</h2>
      <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-sm overflow-x-auto">
        pip install -e ./archon-cli
      </pre>
      <p>
        Use the CLI for discovery, CI validation, and cost reports. See{" "}
        <a href={`${DOCS_BASE}/GITOPS_GUIDE.md`} className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
          GITOPS_GUIDE.md
        </a>{" "}
        for GitHub Actions templates.
      </p>
    </GuideShell>
  );
}

export function GettingStartedGuidePage() {
  return (
    <GuideShell title="Getting started">
      <p>
        Archon Professional follows a simple loop: design on the canvas, validate, estimate cost, generate
        Terraform, and optionally import existing infrastructure.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">1. Build on the canvas</h2>
      <p>
        Choose AWS, Azure, GCP, or On-Prem from the provider dropdown. Drag components from the sidebar, connect
        them with Network or Data Flow edges, and configure instance types, engines, and storage in the Component
        panel.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">2. Security and IAM</h2>
      <p>
        Define security groups (or NSGs) in the Security tab and IAM roles in the IAM tab. Assign them to
        components from the Component panel. Validation flags missing groups and overly permissive rules.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">3. Validate</h2>
      <p>
        Open the Validate tab. Findings appear by severity with specific Terraform fix suggestions. Filter by
        compliance standard (PCI, CIS, SOC2, HIPAA, NIST) to scope a review.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">4. Estimate and FinOps</h2>
      <p>
        Run a cost estimate in the Estimate panel. Import Cost Explorer CSV for actuals, then run FinOps analysis
        for ranked savings (Professional license).
      </p>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">5. Generate Terraform</h2>
      <p>
        Click Generate to produce multi-file HCL from your canvas. The AI layer uses provider-specific resource
        maps for complete, deterministic output.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Import existing work</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>.tf files</strong> — Import Terraform and render the architecture on the canvas
        </li>
        <li>
          <strong>Plan JSON</strong> — Load <code className="bg-gray-100 px-1 rounded">terraform show -json</code>{" "}
          for plan visualization
        </li>
        <li>
          <strong>Discovery</strong> — Run{" "}
          <code className="bg-gray-100 px-1 rounded">archon-cli discover</code> and import the report
        </li>
      </ul>

      <p className="mt-6">
        Full walkthrough:{" "}
        <a href={`${DOCS_BASE}/GETTING_STARTED.md`} className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">
          GETTING_STARTED.md
        </a>
      </p>
    </GuideShell>
  );
}

export function LtiGuidePage() {
  return (
    <GuideShell title="LTI setup for institutions">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 mb-6">
        <strong>Preview:</strong> LTI 1.3 integration ships with Academy 1.0 (instructor dashboard + Canvas
        deep linking). Use this guide to prepare your LMS environment now.
      </div>

      <h2 className="text-xl font-bold text-gray-900 mt-4 mb-3">What you will need</h2>
      <ul className="list-disc pl-5 space-y-1">
        <li>An Institutional license with available seats</li>
        <li>Canvas LMS admin access (or equivalent LTI 1.3 platform)</li>
        <li>Archon Academy reachable from student browsers (self-hosted URL or campus network)</li>
        <li>HTTPS on your Academy endpoint (required for LTI JWT)</li>
      </ul>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Institutional portal setup</h2>
      <ol className="list-decimal pl-5 space-y-2">
        <li>
          Purchase or activate an institutional pool key via{" "}
          <Link to="/login" className="text-indigo-600 hover:underline">
            archonpro.net
          </Link>
        </li>
        <li>Add student emails as seats in the customer portal dashboard</li>
        <li>Students sign in to Academy with the same email to receive licensed access</li>
      </ol>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Canvas LTI registration (when available)</h2>
      <p>When LTI 1.3 ships, IT admins will register Archon Academy as an external tool with:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Tool URL — your Academy base URL + LTI launch path</li>
        <li>OIDC login URL — provided in the instructor admin panel</li>
        <li>JWK set URL — for JWT signature verification</li>
        <li>Deployment ID — one per Canvas sub-account or course</li>
      </ul>
      <p>
        Grade passback and deep linking for modules/labs will use LTI Advantage services. Documentation will include
        copy-paste values for Canvas Developer Keys.
      </p>

      <h2 className="text-xl font-bold text-gray-900 mt-8 mb-3">Contact</h2>
      <p>
        Institutional pilots:{" "}
        <a href="mailto:support@archonpro.net?subject=LTI%20pilot" className="text-indigo-600 hover:underline">
          support@archonpro.net
        </a>
      </p>
    </GuideShell>
  );
}
