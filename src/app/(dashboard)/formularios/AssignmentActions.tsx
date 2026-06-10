"use client";

import { LoaderCircle, RotateCcw, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarAsignacion, reabrirAsignacion } from "./actions";

export function ReabrirAsignacionButton({
  assignmentId,
  backPath,
}: {
  assignmentId: string;
  backPath: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleReopen() {
    if (
      !window.confirm(
        "¿Reabrir esta liga?\n\nEl cliente podra volver a entrar y editar sus respuestas hasta que la envie de nuevo.",
      )
    ) {
      return;
    }

    startTransition(async () => {
      await reabrirAsignacion(assignmentId, backPath);
    });
  }

  return (
    <button
      aria-label="Reabrir liga"
      className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-40"
      disabled={isPending}
      onClick={handleReopen}
      title="Reabrir liga"
      type="button"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={15} />
      ) : (
        <RotateCcw size={15} />
      )}
    </button>
  );
}

export function EliminarAsignacionButton({
  assignmentId,
  backPath,
  nombre,
}: {
  assignmentId: string;
  backPath: string;
  nombre: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (
      !window.confirm(
        `¿Eliminar la asignación de "${nombre}"?\n\nSe borraran tambien las respuestas del cliente. Esta accion no se puede deshacer.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await eliminarAsignacion(assignmentId, backPath);
    });
  }

  return (
    <button
      aria-label="Eliminar asignación"
      className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
      disabled={isPending}
      onClick={handleDelete}
      title="Eliminar asignación"
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
