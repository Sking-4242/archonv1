import { Link, NavLink, Outlet } from "react-router-dom";
import { GITHUB_URL } from "../../content/siteContent";

const navLinkClass = ({ isActive }) =>
  [
    "text-sm font-medium transition-colors",
    isActive ? "text-indigo-600" : "text-gray-600 hover:text-gray-900",
  ].join(" ");

export default function MarketingLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="text-lg font-bold tracking-tight text-gray-900">ARCHON</span>
            <span className="hidden sm:inline text-xs text-gray-400 font-normal">archonpro.net</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink to="/" end className={navLinkClass}>
              Product
            </NavLink>
            <NavLink to="/roadmap" className={navLinkClass}>
              Roadmap
            </NavLink>
            <NavLink to="/guides" className={navLinkClass}>
              Guides
            </NavLink>
            <NavLink to="/download" className={navLinkClass}>
              Download
            </NavLink>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline text-sm text-gray-500 hover:text-gray-800"
            >
              GitHub
            </a>
            <Link
              to="/login"
              className="text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-1.5"
            >
              Sign in
            </Link>
            <Link
              to="/download"
              className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
            >
              Get Archon
            </Link>
          </div>
        </div>

        <nav className="md:hidden flex gap-4 overflow-x-auto px-4 pb-3 text-sm border-t border-gray-50">
          <NavLink to="/" end className={navLinkClass}>
            Product
          </NavLink>
          <NavLink to="/roadmap" className={navLinkClass}>
            Roadmap
          </NavLink>
          <NavLink to="/guides" className={navLinkClass}>
            Guides
          </NavLink>
          <NavLink to="/download" className={navLinkClass}>
            Download
          </NavLink>
        </nav>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-8 text-sm">
          <div>
            <div className="font-bold text-gray-900 mb-2">Archon</div>
            <p className="text-gray-500 leading-relaxed">
              Visual infrastructure IDE and cloud learning platform. Design, validate, discover, and generate
              Terraform — self-hosted.
            </p>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-2">Product</div>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <Link to="/roadmap" className="hover:text-indigo-600">
                  Roadmap
                </Link>
              </li>
              <li>
                <Link to="/download" className="hover:text-indigo-600">
                  Download
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-2">Guides</div>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <Link to="/guides/installation" className="hover:text-indigo-600">
                  Installation
                </Link>
              </li>
              <li>
                <Link to="/guides/getting-started" className="hover:text-indigo-600">
                  Getting started
                </Link>
              </li>
              <li>
                <Link to="/guides/lti" className="hover:text-indigo-600">
                  LTI setup
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 mb-2">Account</div>
            <ul className="space-y-1.5 text-gray-600">
              <li>
                <Link to="/login" className="hover:text-indigo-600">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-indigo-600">
                  Account portal
                </Link>
              </li>
              <li>
                <a href={GITHUB_URL} className="hover:text-indigo-600" target="_blank" rel="noopener noreferrer">
                  Source on GitHub
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Archon · Apache 2.0 + Commons Clause
        </div>
      </footer>
    </div>
  );
}
