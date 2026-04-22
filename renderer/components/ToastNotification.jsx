import React, { useEffect } from "react";

export default function ToastNotification({
  message = "",
  type = "success",
  duration = 3000,
  onClose = () => {}
}) {
  useEffect(() => {
    if (!message) return undefined;
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast ${type === "error" ? "error" : "success"}`}>
      <div className="flex justify-between items-start gap-3">
        <p className="text-sm">{message}</p>
        <button className="text-xs" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

