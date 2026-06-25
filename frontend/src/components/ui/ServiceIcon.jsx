import { getServiceIconUrl } from "../../assets/icons/serviceIcons";

/**
 * Renders the official service SVG when available, otherwise an emoji fallback.
 */
export default function ServiceIcon({
  nodeType,
  label,
  size = 20,
  fallbackEmoji = null,
  darkBg = false,
  className = "",
}) {
  const src = getServiceIconUrl(nodeType);
  if (!src) {
    if (!fallbackEmoji) return null;
    return (
      <span
        className={`inline-flex items-center justify-center flex-shrink-0 leading-none ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.85) }}
        aria-hidden={!!label}
      >
        {fallbackEmoji}
      </span>
    );
  }

  return (
    <span
      className={[
        "inline-flex items-center justify-center flex-shrink-0",
        darkBg ? "bg-white rounded-sm p-0.5" : "",
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={label ?? nodeType ?? "Service"}
        className="w-full h-full object-contain"
        draggable={false}
      />
    </span>
  );
}
