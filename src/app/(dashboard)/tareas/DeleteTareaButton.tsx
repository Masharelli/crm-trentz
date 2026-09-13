"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import ActionErrorToast from "../components/ActionErrorToast";
import { eliminarTarea } from "./actions";

type Props = {
  taskId: string;
  clientId: string;
  nombre: string;
};

export default function DeleteTareaButton({ taskId, clientId, nombre }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!window.confirm(`¿Eliminar la tarea "${nombre}"?`)) return;

    startTransition(async () => {
      setError(null);
      const result = await eliminarTarea(taskId, clientId);
      setError(result.error);
    });
  }

  return (
    <>
      <button
        aria-label={`Eliminar ${nombre}`}
        className="pressable grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
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
      <ActionErrorToast message={error} onDismiss={() => setError(null)} />
    </>
  );
}
