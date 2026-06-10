"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarCorreo } from "./actions";

export default function DeleteCorreoButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm("¿Eliminar este registro de correo?\n\nEsta accion no se puede deshacer."))
      return;

    startTransition(async () => {
      await eliminarCorreo(id);
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={handleDelete}
      type="button"
      aria-label="Eliminar correo"
      className="grid size-8 place-items-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={15} />
      ) : (
        <Trash2 size={15} />
      )}
    </button>
  );
}
