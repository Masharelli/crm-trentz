"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[dashboard] error no controlado:", error);
  }, [error]);

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="grid size-14 place-items-center rounded-full bg-rose-50 text-rose-500">
          <TriangleAlert size={26} />
        </div>
        <div>
          <p className="text-lg font-semibold text-zinc-950">Algo salió mal</p>
          <p className="mt-1 text-sm text-zinc-500">
            No se pudo cargar esta vista. Puede ser un problema temporal de
            conexión con la base de datos.
          </p>
          {error.digest ? (
            <p className="mt-2 text-xs text-zinc-400">Código: {error.digest}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            onClick={reset}
            type="button"
          >
            <RotateCcw size={15} />
            Reintentar
          </button>
          <Link
            href="/"
            className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
