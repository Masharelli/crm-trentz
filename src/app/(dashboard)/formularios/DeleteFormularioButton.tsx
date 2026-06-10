"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarFormulario } from "./actions";

export default function DeleteFormularioButton({
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
        `¿Eliminar el formulario "${nombre}"?\n\nLas ligas ya asignadas a clientes seguiran funcionando (usan su propia copia de las preguntas).`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await eliminarFormulario(id);
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={handleDelete}
      type="button"
      className="inline-flex h-9 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={15} />
      ) : (
        <Trash2 size={15} />
      )}
      {isPending ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
