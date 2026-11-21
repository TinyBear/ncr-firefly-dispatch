import { useEffect } from "react";

export default function Toast({ message, onClose, duration = 3000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div
      role="status"
      style={{
        position: "absolute",
        top: 16,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1100,
        background: "#0F172A",
        color: "#FFFFFF",
        padding: "10px 16px",
        borderRadius: 8,
        fontFamily: "Inter, sans-serif",
        fontSize: 13,
        boxShadow: "0 4px 12px rgba(15, 23, 42, 0.18)",
      }}
    >
      {message}
    </div>
  );
}