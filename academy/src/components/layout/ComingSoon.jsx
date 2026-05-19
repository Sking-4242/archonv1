export default function ComingSoon({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
      <div className="text-5xl mb-4">{icon ?? "🚧"}</div>
      <h2 className="text-lg font-semibold text-gray-700">{title ?? "Coming Soon"}</h2>
      <p className="text-sm text-gray-400 mt-2 max-w-sm">
        {description ?? "This section is under construction. Check back soon."}
      </p>
    </div>
  );
}
