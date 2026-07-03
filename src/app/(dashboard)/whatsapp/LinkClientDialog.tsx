"use client";

import { Link2, UserPlus, X } from "lucide-react";
import { useState } from "react";
import { crearClienteDesdeConversacion, vincularCliente } from "./actions";

export default function LinkClientDialog({
  conversationId,
  profileName,
  clientes,
}: {
  conversationId: string;
  profileName: string | null;
  clientes: Array<{ id: string; display_name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"vincular" | "crear">("vincular");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
      >
        <Link2 size={14} />
        Vincular cliente
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <h2 className="text-sm font-semibold text-zinc-950">
                Vincular conversacion a un cliente
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-md text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex gap-1 border-b border-zinc-100 bg-zinc-50 px-5 py-2">
              <button
                type="button"
                onClick={() => setMode("vincular")}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${
                  mode === "vincular"
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <Link2 size={13} />
                Cliente existente
              </button>
              <button
                type="button"
                onClick={() => setMode("crear")}
                className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition ${
                  mode === "crear"
                    ? "bg-zinc-950 text-white"
                    : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                <UserPlus size={13} />
                Crear nuevo
              </button>
            </div>

            {mode === "vincular" ? (
              <form action={vincularCliente} className="grid gap-4 px-5 py-4">
                <input
                  type="hidden"
                  name="conversation_id"
                  value={conversationId}
                />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-zinc-700">
                    Cliente <span className="text-rose-600">*</span>
                  </span>
                  <select
                    name="client_id"
                    required
                    defaultValue=""
                    className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-400"
                  >
                    <option value="" disabled>
                      Selecciona un cliente
                    </option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.display_name}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Vincular
                </button>
              </form>
            ) : (
              <form
                action={crearClienteDesdeConversacion}
                className="grid gap-4 px-5 py-4"
              >
                <input
                  type="hidden"
                  name="conversation_id"
                  value={conversationId}
                />
                <label className="grid gap-1.5 text-sm">
                  <span className="font-medium text-zinc-700">
                    Nombre del cliente <span className="text-rose-600">*</span>
                  </span>
                  <input
                    type="text"
                    name="display_name"
                    required
                    minLength={2}
                    defaultValue={profileName ?? ""}
                    placeholder="Nombre o empresa"
                    className="h-11 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
                  />
                  <span className="text-xs text-zinc-500">
                    Se creara como prospecto con el telefono de esta conversacion.
                  </span>
                </label>
                <button
                  type="submit"
                  className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  Crear y vincular
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
