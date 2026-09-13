"use client";

import { Clock, LoaderCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { WINDOW_MS } from "@/lib/whatsapp/phone";
import type { WhatsAppTemplate } from "@/lib/whatsapp/client";
import { enviarMensaje } from "./actions";
import TemplateComposer from "./TemplateComposer";

function SendButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="pressable inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-emerald-600 px-3.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      aria-label={pending ? "Enviando mensaje" : "Enviar mensaje"}
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle size={18} className="animate-spin" />
      ) : (
        <Send size={18} />
      )}
      <span className="hidden sm:inline">{pending ? "Enviando" : "Enviar"}</span>
    </button>
  );
}

export default function Composer({
  conversationId,
  lastInboundAt,
  templates,
}: {
  conversationId: string;
  lastInboundAt: string | null;
  templates: WhatsAppTemplate[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [windowOpen, setWindowOpen] = useState<boolean | null>(null);

  useEffect(() => {
    let expiryTimeout: number | null = null;
    const initialTimeout = window.setTimeout(() => {
      if (!lastInboundAt) {
        setWindowOpen(false);
        return;
      }

      const expiresAt = new Date(lastInboundAt).getTime() + WINDOW_MS;
      const remaining = expiresAt - Date.now();
      setWindowOpen(remaining > 0);

      if (remaining > 0) {
        expiryTimeout = window.setTimeout(() => setWindowOpen(false), remaining);
      }
    }, 0);

    return () => {
      window.clearTimeout(initialTimeout);
      if (expiryTimeout !== null) window.clearTimeout(expiryTimeout);
    };
  }, [lastInboundAt]);

  if (windowOpen === null) {
    return (
      <div className="flex items-center gap-2 border-t border-zinc-100 bg-zinc-50 px-4 py-4 text-sm text-zinc-500 sm:px-6">
        <LoaderCircle size={16} className="animate-spin" />
        Verificando disponibilidad para responder...
      </div>
    );
  }

  if (!windowOpen) {
    return (
      <div className="border-t border-zinc-100 bg-amber-50 px-4 py-3 sm:px-6">
        <p className="flex items-start gap-2 text-sm text-amber-800">
          <Clock size={15} className="shrink-0" />
          <span>
            {lastInboundAt
              ? "La ventana de 24 horas expiro. Puedes enviar una plantilla aprobada para retomar el contacto."
              : "El cliente aun no ha escrito. Puedes iniciar el contacto con una plantilla aprobada."}
          </span>
        </p>
        <TemplateComposer conversationId={conversationId} templates={templates} />
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
        maxLength={4096}
        placeholder="Escribe un mensaje"
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        className="max-h-32 min-h-11 flex-1 resize-y rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
      <SendButton />
    </form>
  );
}
