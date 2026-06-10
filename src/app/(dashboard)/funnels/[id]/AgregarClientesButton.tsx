"use client";

import { LoaderCircle, Search, UserPlus, X } from "lucide-react";
import { useState, useTransition } from "react";
import { agregarClientesAFunnel } from "../actions";
import { statusClass, statusLabel } from "../status";

type Stage = {
  id: string;
  name: string;
  position: number;
};

type AvailableClient = {
  id: string;
  display_name: string;
  status: string;
};

type Props = {
  funnelId: string;
  stages: Stage[];
  availableClients: AvailableClient[];
};

export default function AgregarClientesButton({
  funnelId,
  stages,
  availableClients,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();

  const filtered = availableClients.filter((client) =>
    client.display_name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function close() {
    setOpen(false);
    setQuery("");
    setSelected(new Set());
  }

  function handleAdd() {
    if (selected.size === 0 || !stageId) return;

    startTransition(async () => {
      await agregarClientesAFunnel(funnelId, stageId, [...selected]);
      close();
    });
  }

  return (
    <>
      <button
        className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
        disabled={stages.length === 0}
        onClick={() => setOpen(true)}
        type="button"
      >
        <UserPlus size={16} />
        Agregar clientes
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-zinc-950/40 p-4"
          onClick={close}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <p className="text-base font-semibold text-zinc-950">
                  Agregar clientes al funnel
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Clientes activos y prospectos que no estan en este funnel
                </p>
              </div>
              <button
                aria-label="Cerrar"
                className="grid size-8 shrink-0 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                onClick={close}
                type="button"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 border-b border-zinc-100 px-5 py-4">
              <div className="relative">
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar cliente..."
                  type="text"
                  value={query}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-zinc-700">
                  Agregar a la etapa:
                </label>
                <select
                  className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  onChange={(e) => setStageId(e.target.value)}
                  value={stageId}
                >
                  {stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.length > 0 ? (
                <ul className="divide-y divide-zinc-100">
                  {filtered.map((client) => (
                    <li key={client.id}>
                      <label className="flex cursor-pointer items-center gap-3 px-5 py-3 hover:bg-zinc-50">
                        <input
                          checked={selected.has(client.id)}
                          className="size-4 accent-zinc-950"
                          onChange={() => toggle(client.id)}
                          type="checkbox"
                        />
                        <span className="flex-1 truncate text-sm font-medium text-zinc-950">
                          {client.display_name}
                        </span>
                        <span
                          className={`inline-flex h-6 items-center rounded-md px-2 text-xs font-semibold ring-1 ${statusClass[client.status] ?? statusClass.prospect}`}
                        >
                          {statusLabel[client.status] ?? client.status}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-10 text-center text-sm text-zinc-500">
                  {query
                    ? "Sin resultados para esta busqueda."
                    : "Todos los clientes activos y prospectos ya estan en este funnel."}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-5 py-4">
              <p className="text-sm text-zinc-500">
                {selected.size}{" "}
                {selected.size === 1
                  ? "cliente seleccionado"
                  : "clientes seleccionados"}
              </p>
              <div className="flex items-center gap-2">
                <button
                  className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  onClick={close}
                  type="button"
                >
                  Cancelar
                </button>
                <button
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-50"
                  disabled={selected.size === 0 || isPending}
                  onClick={handleAdd}
                  type="button"
                >
                  {isPending ? (
                    <>
                      <LoaderCircle className="animate-spin" size={15} />
                      Agregando...
                    </>
                  ) : (
                    "Agregar"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
