"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarPago } from "../../actions";

export default function DeletePagoButton({
  id,
  concepto,
}: {
  id: string;
  concepto: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `¿Eliminar el pago "${concepto}"?\n\nEsta accion no se puede deshacer.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await eliminarPago(id);
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={handleDelete}
      type="button"
      className="inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={16} />
      ) : (
        <Trash2 size={16} />
      )}
      {isPending ? "Eliminando..." : "Eliminar pago"}
    </button>
  );
}
