"use client";

import { ArrowDown, ArrowUp, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import SubmitButton from "../../../components/SubmitButton";
import { actualizarFunnel, eliminarFunnel } from "../../actions";

const inputClass =
  "h-11 w-full rounded-md border bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:ring-2";

const inputOk = "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100";

const inputError = "border-rose-300 focus:border-rose-400 focus:ring-rose-100";

const labelClass = "block text-sm font-medium text-zinc-700";

type StageItem = {
  key: string;
  id: string | null;
  name: string;
  clientCount: number;
};

type Removal = {
  id: string;
  name: string;
  clientCount: number;
  targetKey: string | null;
};

type Props = {
  funnelId: string;
  funnelName: string;
  funnelDescription: string | null;
  initialStages: { id: string; name: string; clientCount: number }[];
};

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 whitespace-nowrap items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="animate-spin" size={16} />
      ) : (
        <Trash2 size={16} />
      )}
      {pending ? "Eliminando..." : "Eliminar funnel"}
    </button>
  );
}

export default function EditarFunnelForm({
  funnelId,
  funnelName,
  funnelDescription,
  initialStages,
}: Props) {
  const [name, setName] = useState(funnelName);
  const [stages, setStages] = useState<StageItem[]>(
    initialStages.map((stage) => ({
      key: stage.id,
      id: stage.id,
      name: stage.name,
      clientCount: stage.clientCount,
    })),
  );
  const [removals, setRemovals] = useState<Removal[]>([]);
  const [errors, setErrors] = useState<{ name?: string; stages?: string }>({});
  const nextKey = useRef(0);

  const actualizarConId = actualizarFunnel.bind(null, funnelId);
  const eliminarConId = eliminarFunnel.bind(null, funnelId);

  const cleanStages = stages
    .map((s) => ({ ...s, name: s.name.trim() }))
    .filter((s) => s.name !== "");

  // Los clientes de una etapa eliminada siempre van a una etapa vigente.
  const validKeys = new Set(cleanStages.map((s) => s.key));
  const fallbackKey = cleanStages[0]?.key ?? null;

  const payload = {
    stages: cleanStages.map((s) => ({ key: s.key, id: s.id, name: s.name })),
    removals: removals.map((r) => ({
      id: r.id,
      targetKey:
        r.clientCount > 0
          ? r.targetKey && validKeys.has(r.targetKey)
            ? r.targetKey
            : fallbackKey
          : null,
    })),
  };

  function updateStage(key: string, value: string) {
    setStages((prev) =>
      prev.map((s) => (s.key === key ? { ...s, name: value } : s)),
    );
  }

  function addStage() {
    nextKey.current += 1;
    setStages((prev) => [
      ...prev,
      { key: `new-${nextKey.current}`, id: null, name: "", clientCount: 0 },
    ]);
  }

  function moveStage(index: number, direction: -1 | 1) {
    setStages((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeStage(stage: StageItem) {
    setStages((prev) => prev.filter((s) => s.key !== stage.key));

    if (stage.id) {
      setRemovals((prev) => [
        ...prev,
        {
          id: stage.id!,
          name: stage.name,
          clientCount: stage.clientCount,
          targetKey: null,
        },
      ]);
    }
  }

  function restoreStage(removal: Removal) {
    setRemovals((prev) => prev.filter((r) => r.id !== removal.id));
    setStages((prev) => [
      ...prev,
      {
        key: removal.id,
        id: removal.id,
        name: removal.name,
        clientCount: removal.clientCount,
      },
    ]);
  }

  function setRemovalTarget(id: string, targetKey: string) {
    setRemovals((prev) =>
      prev.map((r) => (r.id === id ? { ...r, targetKey } : r)),
    );
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nextErrors: { name?: string; stages?: string } = {};

    if (name.trim().length < 2) {
      nextErrors.name = "El nombre del funnel es requerido (minimo 2 caracteres).";
    }
    if (cleanStages.length === 0) {
      nextErrors.stages = "El funnel debe tener al menos una etapa con nombre.";
    }

    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.stages) {
      event.preventDefault();
    }
  }

  function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        `¿Eliminar el funnel "${funnelName}"?\n\nEsta accion no se puede deshacer. Los clientes no se eliminan, solo el funnel y sus etapas.`,
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <>
      <form
        action={actualizarConId}
        noValidate
        onSubmit={handleSubmit}
        className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
      >
        {/* Informacion general */}
        <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Informacion general
          </p>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div className="space-y-1.5">
            <label className={labelClass}>
              Nombre del funnel <span className="text-rose-500">*</span>
            </label>
            <input
              className={`${inputClass} ${errors.name ? inputError : inputOk}`}
              name="name"
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
              type="text"
              value={name}
            />
            {errors.name ? (
              <p className="text-xs font-medium text-rose-600">{errors.name}</p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label className={labelClass}>Descripcion</label>
            <input
              className={`${inputClass} ${inputOk}`}
              defaultValue={funnelDescription ?? ""}
              name="description"
              placeholder="Para que sirve este funnel..."
              type="text"
            />
          </div>
        </div>

        {/* Etapas */}
        <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Etapas <span className="text-rose-400">*</span>
          </p>
        </div>
        <div className="space-y-3 px-6 py-6">
          {stages.map((stage, index) => (
            <div className="flex items-center gap-2" key={stage.key}>
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-500">
                {index + 1}
              </span>
              <input
                className={`${inputClass} ${inputOk}`}
                onChange={(e) => {
                  updateStage(stage.key, e.target.value);
                  if (errors.stages) {
                    setErrors((prev) => ({ ...prev, stages: undefined }));
                  }
                }}
                placeholder={`Etapa ${index + 1}`}
                type="text"
                value={stage.name}
              />
              {stage.clientCount > 0 ? (
                <span className="shrink-0 text-xs font-medium text-zinc-400">
                  {stage.clientCount}{" "}
                  {stage.clientCount === 1 ? "cliente" : "clientes"}
                </span>
              ) : null}
              <div className="flex shrink-0 items-center gap-1">
                <button
                  aria-label="Subir etapa"
                  className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => moveStage(index, -1)}
                  type="button"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  aria-label="Bajar etapa"
                  className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-30"
                  disabled={index === stages.length - 1}
                  onClick={() => moveStage(index, 1)}
                  type="button"
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  aria-label="Eliminar etapa"
                  className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                  disabled={stages.length === 1}
                  onClick={() => removeStage(stage)}
                  type="button"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}

          {errors.stages ? (
            <p className="text-xs font-medium text-rose-600">{errors.stages}</p>
          ) : null}

          <button
            className="inline-flex h-10 whitespace-nowrap items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
            onClick={addStage}
            type="button"
          >
            <Plus size={16} />
            Agregar etapa
          </button>

          {removals.length > 0 ? (
            <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4">
              <p className="text-sm font-semibold text-amber-900">
                Etapas que se eliminaran al guardar
              </p>
              {removals.map((removal) => (
                <div
                  className="flex flex-wrap items-center gap-2 text-sm text-amber-900"
                  key={removal.id}
                >
                  <span className="font-medium">{removal.name}</span>
                  {removal.clientCount > 0 ? (
                    <>
                      <span>
                        — mover sus {removal.clientCount}{" "}
                        {removal.clientCount === 1 ? "cliente" : "clientes"} a:
                      </span>
                      <select
                        className="h-8 rounded-md border border-amber-300 bg-white px-2 text-sm text-zinc-950 outline-none"
                        onChange={(e) =>
                          setRemovalTarget(removal.id, e.target.value)
                        }
                        value={removal.targetKey ?? stages[0]?.key ?? ""}
                      >
                        {stages.map((stage) => (
                          <option key={stage.key} value={stage.key}>
                            {stage.name || "(sin nombre)"}
                          </option>
                        ))}
                      </select>
                    </>
                  ) : (
                    <span>— sin clientes</span>
                  )}
                  <button
                    className="ml-auto text-xs font-semibold text-amber-800 underline hover:text-amber-950"
                    onClick={() => restoreStage(removal)}
                    type="button"
                  >
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
          <p className="text-xs text-zinc-400">
            Los campos con <span className="text-rose-500">*</span> son requeridos
          </p>
          <div className="flex items-center gap-3">
            <Link
              href={`/funnels/${funnelId}`}
              className="inline-flex h-10 whitespace-nowrap items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Cancelar
            </Link>
            <SubmitButton label="Guardar cambios" pendingLabel="Guardando..." />
          </div>
        </div>

        <input
          name="payload"
          type="hidden"
          value={JSON.stringify(payload)}
        />
      </form>

      {/* ── Zona de peligro ──────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-sm">
        <div className="border-b border-rose-100 bg-rose-50 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">
            Zona de peligro
          </p>
        </div>
        <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-zinc-950">
              Eliminar funnel
            </p>
            <p className="mt-0.5 text-sm text-zinc-500">
              Borra el funnel con sus etapas. Los clientes no se eliminan, solo
              dejan de pertenecer a este funnel.
            </p>
          </div>
          <form action={eliminarConId} onSubmit={handleDelete}>
            <DeleteButton />
          </form>
        </div>
      </div>
    </>
  );
}
