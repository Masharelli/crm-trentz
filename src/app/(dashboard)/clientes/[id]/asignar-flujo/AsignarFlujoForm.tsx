"use client";

import Link from "next/link";
import { useState } from "react";
import SubmitButton from "../../../components/SubmitButton";
import { asignarFlujo } from "../../../tareas/actions";

const labelClass = "block text-sm font-medium text-zinc-700";

type Flow = {
  id: string;
  name: string;
  description: string | null;
  task_flow_steps: { id: string; name: string; position: number }[];
};

type Props = {
  clientId: string;
  flows: Flow[];
};

export default function AsignarFlujoForm({ clientId, flows }: Props) {
  const [flowId, setFlowId] = useState(flows[0]?.id ?? "");
  const [dueDates, setDueDates] = useState<Record<string, string>>({});

  const asignarConCliente = asignarFlujo.bind(null, clientId);

  const selectedFlow = flows.find((f) => f.id === flowId);

  const payload = {
    flow_id: flowId,
    steps: (selectedFlow?.task_flow_steps ?? []).map((step) => ({
      name: step.name,
      due_date: dueDates[step.id] || null,
    })),
  };

  function handleFlowChange(id: string) {
    setFlowId(id);
    setDueDates({});
  }

  return (
    <form
      action={asignarConCliente}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
    >
      <input name="payload" type="hidden" value={JSON.stringify(payload)} />

      <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Flujo
        </p>
      </div>
      <div className="space-y-5 px-6 py-6">
        <div className="space-y-1.5">
          <label className={labelClass}>
            Plantilla de flujo <span className="text-rose-500">*</span>
          </label>
          <select
            className="h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
            onChange={(e) => handleFlowChange(e.target.value)}
            value={flowId}
          >
            {flows.map((flow) => (
              <option key={flow.id} value={flow.id}>
                {flow.name}
              </option>
            ))}
          </select>
          {selectedFlow?.description ? (
            <p className="text-xs text-zinc-500">{selectedFlow.description}</p>
          ) : null}
        </div>
      </div>

      <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Pasos y fechas limite
        </p>
      </div>
      <div className="space-y-3 px-6 py-6">
        <p className="text-sm text-zinc-500">
          Cada paso se creara como una tarea para este cliente. Las fechas son
          opcionales; lo vencido se marcara en rojo.
        </p>

        {(selectedFlow?.task_flow_steps ?? []).map((step, index) => (
          <div className="flex items-center gap-3" key={step.id}>
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-500">
              {index + 1}
            </span>
            <p className="flex-1 truncate text-sm font-medium text-zinc-950">
              {step.name}
            </p>
            <input
              className="h-10 w-44 shrink-0 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
              onChange={(e) =>
                setDueDates((prev) => ({ ...prev, [step.id]: e.target.value }))
              }
              type="date"
              value={dueDates[step.id] ?? ""}
            />
          </div>
        ))}

        {selectedFlow && selectedFlow.task_flow_steps.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Este flujo no tiene pasos. Edita la plantilla para agregarlos.
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
        <Link
          href={`/clientes/${clientId}`}
          className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
        >
          Cancelar
        </Link>
        <SubmitButton label="Asignar flujo" pendingLabel="Asignando..." />
      </div>
    </form>
  );
}
