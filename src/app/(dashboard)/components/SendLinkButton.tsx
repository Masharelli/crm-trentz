"use client";

import { LoaderCircle, Mail } from "lucide-react";
import { useTransition } from "react";

// Boton generico para enviar una liga por correo via server action (bound).

type Props = {
  onSend: () => Promise<void>;
  confirmMessage: string;
  compact?: boolean;
  label?: string;
};

export default function SendLinkButton({
  onSend,
  confirmMessage,
  compact = false,
  label = "Enviar por correo",
}: Props) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!window.confirm(confirmMessage)) return;
    startTransition(async () => {
      await onSend();
    });
  }

  if (compact) {
    return (
      <button
        aria-label={label}
        className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-40"
        disabled={isPending}
        onClick={handleClick}
        title={label}
        type="button"
      >
        {isPending ? (
          <LoaderCircle className="animate-spin" size={15} />
        ) : (
          <Mail size={15} />
        )}
      </button>
    );
  }

  return (
    <button
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
      disabled={isPending}
      onClick={handleClick}
      type="button"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={13} />
      ) : (
        <Mail size={13} />
      )}
      {isPending ? "Enviando..." : label}
    </button>
  );
}
