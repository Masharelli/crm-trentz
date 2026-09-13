"use client";

import { AlertCircle, X } from "lucide-react";

export default function ActionErrorToast({
  message,
  onDismiss,
}: {
  message: string | null;
  onDismiss: () => void;
}) {
  if (!message) return null;

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-center gap-3 rounded-xl bg-rose-700 px-4 py-3.5 text-sm text-white shadow-xl ring-1 ring-rose-500/30"
      role="alert"
    >
      <AlertCircle className="shrink-0 text-rose-100" size={18} />
      <p className="font-medium">{message}</p>
      <button
        aria-label="Cerrar aviso"
        className="pressable ml-1 rounded-md p-1 text-white/70 hover:text-white"
        onClick={onDismiss}
        type="button"
      >
        <X size={15} />
      </button>
    </div>
  );
}
