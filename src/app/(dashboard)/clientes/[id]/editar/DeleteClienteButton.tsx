"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarCliente } from "../../actions";

export default function DeleteClienteButton({
  id,
  nombre,
}: {
  id: string;
  nombre: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `¿Eliminar a "${nombre}"?\n\nEsta accion no se puede deshacer. Se eliminaran todos sus pagos y documentos asociados.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await eliminarCliente(id);
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={handleDelete}
      type="button"
      className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
    >
      <Trash2 size={16} />
      {isPending ? "Eliminando..." : "Eliminar cliente"}
    </button>
  );
}
