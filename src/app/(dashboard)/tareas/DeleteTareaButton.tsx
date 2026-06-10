"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarTarea } from "./actions";

type Props = {
  taskId: string;
  clientId: string;
  nombre: string;
};

export default function DeleteTareaButton({ taskId, clientId, nombre }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!window.confirm(`¿Eliminar la tarea "${nombre}"?`)) return;

    startTransition(async () => {
      await eliminarTarea(taskId, clientId);
    });
  }

  return (
    <button
      aria-label={`Eliminar ${nombre}`}
      className="grid size-8 place-items-center rounded-md text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
      disabled={isPending}
      onClick={handleDelete}
      type="button"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={15} />
      ) : (
        <Trash2 size={15} />
      )}
    </button>
  );
}
