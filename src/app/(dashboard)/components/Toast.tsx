"use client";

import { CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function Toast() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);

  const raw = searchParams.get("toast");

  useEffect(() => {
    if (!raw) return;

    // Limpiar el param de la URL sin disparar una navegacion
    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    window.history.replaceState(null, "", url.toString());

    const show = setTimeout(() => setMessage(decodeURIComponent(raw)), 0);
    const hide = setTimeout(() => setMessage(null), 4500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [raw]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-xl bg-zinc-950 px-4 py-3.5 text-sm text-white shadow-xl ring-1 ring-white/10 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <CheckCircle2 className="shrink-0 text-emerald-400" size={18} />
      <p className="font-medium">{message}</p>
      <button
        aria-label="Cerrar"
        className="ml-1 text-zinc-400 transition hover:text-white"
        onClick={() => setMessage(null)}
      >
        <X size={15} />
      </button>
    </div>
  );
}
