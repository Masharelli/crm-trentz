"use client";

import { LoaderCircle, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { eliminarContacto, eliminarNota } from "../actions";

function DeleteIconButton({
  label,
  confirmMessage,
  onConfirm,
}: {
  label: string;
  confirmMessage: string;
  onConfirm: () => Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(onConfirm);
  }

  return (
    <button
      aria-label={label}
      className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
      disabled={isPending}
      onClick={handleClick}
      title={label}
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

export function DeleteContactoButton({
  clientId,
  contactId,
  nombre,
}: {
  clientId: string;
  contactId: string;
  nombre: string;
}) {
  return (
    <DeleteIconButton
      label="Eliminar contacto"
      confirmMessage={`¿Eliminar el contacto "${nombre}"?`}
      onConfirm={async () => {
        await eliminarContacto(clientId, contactId);
      }}
    />
  );
}

export function DeleteNotaButton({
  clientId,
  noteId,
}: {
  clientId: string;
  noteId: string;
}) {
  return (
    <DeleteIconButton
      label="Eliminar nota"
      confirmMessage="¿Eliminar esta nota de la bitácora?"
      onConfirm={async () => {
        await eliminarNota(clientId, noteId);
      }}
    />
  );
}
