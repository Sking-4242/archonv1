import { useEffect, useRef } from "react";

export default function ContextMenu({ x, y, items, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ position: "fixed", left: x, top: y, zIndex: 1000 }}
      className="bg-white border border-gray-200 rounded shadow-lg py-1 min-w-[150px]"
    >
      {items.map((item, i) =>
        item.divider ? (
          <div key={i} className="border-t border-gray-100 my-1" />
        ) : (
          <button
            key={item.label}
            onClick={() => {
              item.action();
              onClose();
            }}
            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors ${
              item.danger ? "text-red-500 hover:bg-red-50" : "text-gray-700"
            }`}
          >
            {item.label}
          </button>
        ),
      )}
    </div>
  );
}
