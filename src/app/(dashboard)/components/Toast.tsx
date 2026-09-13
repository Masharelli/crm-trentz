"use client";

import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function Toast() {
  const searchParams = useSearchParams();
  const [notice, setNotice] = useState<{
    message: string;
    tone: "error" | "success";
  } | null>(null);

  const successMessage = searchParams.get("toast");
  const errorMessage = searchParams.get("error");

  useEffect(() => {
    const raw = errorMessage ?? successMessage;
    if (!raw) return;

    // Limpiar los parametros sin disparar otra navegacion.
    const url = new URL(window.location.href);
    url.searchParams.delete("toast");
    url.searchParams.delete("error");
    window.history.replaceState(null, "", url.toString());

    const show = setTimeout(
      () =>
        setNotice({
          message: raw,
          tone: errorMessage ? "error" : "success",
        }),
      0,
    );
    const hide = setTimeout(() => setNotice(null), errorMessage ? 7000 : 4500);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [errorMessage, successMessage]);

  if (!notice) return null;

  const isError = notice.tone === "error";

  return (
    <div
      aria-live="polite"
      role={isError ? "alert" : "status"}
      className={`fixed bottom-6 right-6 z-50 flex max-w-[calc(100vw-3rem)] items-center gap-3 rounded-xl px-4 py-3.5 text-sm text-white shadow-xl ring-1 animate-in fade-in slide-in-from-bottom-2 duration-200 ${
        isError
          ? "bg-rose-700 ring-rose-500/30"
          : "bg-zinc-950 ring-white/10"
      }`}
    >
      {isError ? (
        <AlertCircle className="shrink-0 text-rose-100" size={18} />
      ) : (
        <CheckCircle2 className="shrink-0 text-emerald-400" size={18} />
      )}
      <p className="font-medium">{notice.message}</p>
      <button
        aria-label="Cerrar"
        className="pressable ml-1 rounded-md p-1 text-white/70 hover:text-white"
        onClick={() => setNotice(null)}
        type="button"
      >
        <X size={15} />
      </button>
    </div>
  );
}
