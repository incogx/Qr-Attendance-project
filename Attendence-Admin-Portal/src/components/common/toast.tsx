// src/components/common/Toast.tsx
import React, { useEffect, useState } from "react";

let push: ((type: "success" | "error", text: string) => void) | null = null;

export function showToast(type: "success" | "error", text: string) {
  push?.(type, text);
}

export default function ToastHost() {
  const [toasts, setToasts] = useState<{ id: number; type: string; text: string }[]>([]);

  useEffect(() => {
    push = (type, text) => {
      const id = Date.now();
      setToasts((t) => [...t, { id, type, text }]);
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, 4000);
    };
    return () => {
      push = null;
    };
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div key={t.id} className={`px-4 py-2 rounded shadow text-white ${t.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {t.text}
        </div>
      ))}
    </div>
  );
}
