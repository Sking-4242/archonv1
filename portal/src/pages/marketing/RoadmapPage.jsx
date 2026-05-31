import { Link } from "react-router-dom";
import { ROADMAP_COMING, ROADMAP_SHIPPED } from "../../content/siteContent";

export default function RoadmapPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Roadmap</h1>
      <p className="mt-4 text-gray-600 leading-relaxed">
        What ships today in Professional 1.0, and what is next. For the full engineering roadmap, see{" "}
        <a
          href="https://github.com/Sking-4242/archonv1/blob/master/ROADMAP.md"
          className="text-indigo-600 hover:underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          ROADMAP.md
        </a>{" "}
        on GitHub.
      </p>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          Available now
        </h2>
        <ul className="mt-4 space-y-2">
          {ROADMAP_SHIPPED.map((item) => (
            <li
              key={item.name}
              className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 text-sm"
            >
              <span className="text-gray-800">{item.name}</span>
              <span className="shrink-0 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                Shipped
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
          Coming next
        </h2>
        <ul className="mt-4 space-y-2">
          {ROADMAP_COMING.map((item) => (
            <li
              key={item.name}
              className="flex items-center justify-between gap-4 py-3 border-b border-gray-100 text-sm"
            >
              <span className="text-gray-800">{item.name}</span>
              <span className="shrink-0 text-xs font-medium text-amber-800 bg-amber-50 px-2 py-1 rounded">
                {item.eta}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-12 rounded-xl border border-indigo-100 bg-indigo-50 p-6">
        <p className="text-sm text-indigo-900">
          Want Professional or Academy today?{" "}
          <Link to="/pricing" className="font-semibold hover:underline">
            Compare plans
          </Link>{" "}
          or{" "}
          <Link to="/download" className="font-semibold hover:underline">
            download the free tier
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
