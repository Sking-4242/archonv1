import { Link } from "react-router-dom";
import { GUIDES } from "../../content/siteContent";

export default function GuidesIndexPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">How-to guides</h1>
      <p className="mt-4 text-gray-600">
        Install Archon, run your first validation workflow, and prepare institutional LMS integration.
      </p>

      <ul className="mt-10 space-y-4">
        {GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link
              to={`/guides/${guide.slug}`}
              className="block rounded-xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-sm transition-shadow"
            >
              <h2 className="font-semibold text-gray-900">{guide.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{guide.summary}</p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
