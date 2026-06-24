export default function ComingSoon({ icon, title, description }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center text-center min-h-[320px]">
      <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center text-3xl mb-4">
        {icon ?? "🚧"}
      </div>
      <h2 className="text-base font-semibold text-gray-800">{title ?? "Coming soon"}</h2>
      <p className="text-sm text-gray-500 mt-1.5 max-w-sm">
        {description ?? "This section is under construction. Check back soon."}
      </p>
      <span className="mt-4 text-xs bg-gray-100 text-gray-500 rounded-full px-3 py-1 font-medium">
        Coming soon
      </span>
    </div>
  );
}
