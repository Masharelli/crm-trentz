"use client";

import { LoaderCircle, X } from "lucide-react";
import { useTransition } from "react";
import { quitarFlujoDeCliente } from "./actions";

type Props = {
  clientFlowId: string;
  clientId: string;
  nombre: string;
};

export default function QuitarFlujoButton({
  clientFlowId,
  clientId,
  nombre,
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    if (
      !window.confirm(
        `¿Quitar el flujo "${nombre}" de este cliente?\n\nSe eliminaran todas sus tareas, incluidas las completadas.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await quitarFlujoDeCliente(clientFlowId, clientId);
    });
  }

  return (
    <button
      aria-label={`Quitar flujo ${nombre}`}
      className="grid size-7 place-items-center rounded-md text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
      disabled={isPending}
      onClick={handleRemove}
      type="button"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={14} />
      ) : (
        <X size={14} />
      )}
    </button>
  );
}
