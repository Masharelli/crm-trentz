"use client";

import Link from "next/link";
import { useState } from "react";
import SubmitButton from "../../components/SubmitButton";
import { enviarCorreo } from "../actions";

type Client = {
  id: string;
  display_name: string;
  primary_email: string | null;
};

const inputClass =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

const labelClass = "block text-sm font-medium text-zinc-700";

export default function NuevoCorreoForm({
  clientes,
  error,
}: {
  clientes: Client[];
  error?: string;
}) {
  const [recipientEmail, setRecipientEmail] = useState("");

  function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const client = clientes.find((c) => c.id === e.target.value);
    if (client?.primary_email) setRecipientEmail(client.primary_email);
    else setRecipientEmail("");
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl space-y-4">
        {error ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {error}
          </div>
        ) : null}

        <form
          action={enviarCorreo}
          className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
        >
          {/* Destinatario */}
          <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Destinatario
            </p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <div className="space-y-1.5">
              <label className={labelClass}>
                Cliente <span className="text-rose-500">*</span>
              </label>
              <select
                className={inputClass}
                defaultValue=""
                name="client_id"
                onChange={handleClientChange}
                required
              >
                <option value="" disabled>
                  Selecciona un cliente...
                </option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>
                Correo del destinatario <span className="text-rose-500">*</span>
              </label>
              <input
                className={inputClass}
                name="recipient_email"
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="correo@empresa.com"
                required
                type="email"
                value={recipientEmail}
              />
              <p className="text-xs text-zinc-400">
                Se llena automaticamente al seleccionar el cliente. Puedes editarlo.
              </p>
            </div>
          </div>

          {/* Mensaje */}
          <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
              Mensaje
            </p>
          </div>
          <div className="space-y-5 px-6 py-6">
            <div className="space-y-1.5">
              <label className={labelClass}>
                Asunto <span className="text-rose-500">*</span>
              </label>
              <input
                className={inputClass}
                name="subject"
                placeholder="Recordatorio de pago — Junio 2026"
                required
                type="text"
              />
            </div>

            <div className="space-y-1.5">
              <label className={labelClass}>
                Mensaje <span className="text-rose-500">*</span>
              </label>
              <textarea
                className="min-h-40 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                name="body"
                placeholder="Hola, te recordamos que tienes un pago pendiente..."
                required
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
            <Link
              href="/correos"
              className="inline-flex h-10 whitespace-nowrap items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Cancelar
            </Link>
            <SubmitButton label="Enviar correo" pendingLabel="Enviando..." />
          </div>
        </form>
      </div>
    </div>
  );
}
