"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarDocumento } from "./actions";

type Props = {
  id: string;
  nombre: string;
};

export default function DeleteDocumentoButton({ id, nombre }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `¿Eliminar "${nombre}"?\n\nEsta accion no se puede deshacer.`,
      )
    )
      return;

    startTransition(async () => {
      await eliminarDocumento(id);
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={handleDelete}
      type="button"
      aria-label={`Eliminar ${nombre}`}
      className="pressable grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={15} />
      ) : (
        <Trash2 size={15} />
      )}
    </button>
  );
}
