"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarGasto } from "../../actions";

export default function DeleteGastoButton({
  descripcion,
  id,
}: {
  descripcion: string;
  id: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `Eliminar el gasto "${descripcion}"?\n\nEsta accion no se puede deshacer.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await eliminarGasto(id);
    });
  }

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
      disabled={isPending}
      onClick={handleDelete}
      type="button"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={16} />
      ) : (
        <Trash2 size={16} />
      )}
      {isPending ? "Eliminando..." : "Eliminar gasto"}
    </button>
  );
}
