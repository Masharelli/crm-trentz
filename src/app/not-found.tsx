import { FileQuestion } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="flex w-full max-w-md flex-col items-center gap-4 rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center shadow-sm">
        <div className="grid size-14 place-items-center rounded-full bg-zinc-100 text-zinc-400">
          <FileQuestion size={26} />
        </div>
        <div>
          <p className="text-lg font-semibold text-zinc-950">
            Página no encontrada
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            Lo que buscas no existe o fue eliminado.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
