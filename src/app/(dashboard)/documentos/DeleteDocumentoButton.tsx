"use client";

import { Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarDocumento } from "./actions";

type Props = {
  id: string;
  filePath: string;
  nombre: string;
};

export default function DeleteDocumentoButton({ id, filePath, nombre }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `¿Eliminar "${nombre}"?\n\nEsta accion no se puede deshacer.`,
      )
    )
      return;

    startTransition(async () => {
      await eliminarDocumento(id, filePath);
    });
  }

  return (
    <button
      disabled={isPending}
      onClick={handleDelete}
      type="button"
      aria-label={`Eliminar ${nombre}`}
      className="grid size-8 place-items-center rounded-md text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
    >
      <Trash2 size={15} />
    </button>
  );
}
