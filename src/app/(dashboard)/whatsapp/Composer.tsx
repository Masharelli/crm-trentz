"use client";

import { Clock, Send } from "lucide-react";
import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { enviarMensaje } from "./actions";

function SendButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="grid size-11 shrink-0 place-items-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label="Enviar mensaje"
    >
      <Send size={18} />
    </button>
  );
}

export default function Composer({
  conversationId,
  windowOpen,
  lastInboundAt,
}: {
  conversationId: string;
  windowOpen: boolean;
  lastInboundAt: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  if (!windowOpen) {
    return (
      <div className="border-t border-zinc-100 bg-amber-50 px-4 py-3 sm:px-6">
        <p className="flex items-center gap-2 text-sm text-amber-800">
          <Clock size={15} className="shrink-0" />
          {lastInboundAt
            ? "La ventana de 24 horas expiro. El cliente debe escribir primero para poder responder."
            : "El cliente debe escribir primero para poder responder."}
        </p>
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      action={enviarMensaje}
      className="flex items-end gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-3 sm:px-6"
    >
      <input type="hidden" name="conversation_id" value={conversationId} />
      <textarea
        name="body"
        rows={1}
        required
        placeholder="Escribe un mensaje"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        className="max-h-32 min-h-11 flex-1 resize-y rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
      />
      <SendButton />
    </form>
  );
}
