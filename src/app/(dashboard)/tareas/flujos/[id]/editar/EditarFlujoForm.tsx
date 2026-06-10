"use client";

import { ArrowDown, ArrowUp, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import SubmitButton from "../../../../components/SubmitButton";
import { actualizarFlujo, eliminarFlujo } from "../../../actions";

const inputClass =
  "h-11 w-full rounded-md border bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:ring-2";

const inputOk = "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100";

const inputError = "border-rose-300 focus:border-rose-400 focus:ring-rose-100";

const labelClass = "block text-sm font-medium text-zinc-700";

type StepItem = {
  key: string;
  id: string | null;
  name: string;
};

type Props = {
  flowId: string;
  flowName: string;
  flowDescription: string | null;
  initialSteps: { id: string; name: string }[];
};

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="inline-flex h-10 items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      {pending ? (
        <LoaderCircle className="animate-spin" size={16} />
      ) : (
        <Trash2 size={16} />
      )}
      {pending ? "Eliminando..." : "Eliminar flujo"}
    </button>
  );
}

export default function EditarFlujoForm({
  flowId,
  flowName,
  flowDescription,
  initialSteps,
}: Props) {
  const [name, setName] = useState(flowName);
  const [steps, setSteps] = useState<StepItem[]>(
    initialSteps.map((step) => ({ key: step.id, id: step.id, name: step.name })),
  );
  const [errors, setErrors] = useState<{ name?: string; steps?: string }>({});
  const nextKey = useRef(0);

  const actualizarConId = actualizarFlujo.bind(null, flowId);
  const eliminarConId = eliminarFlujo.bind(null, flowId);

  const cleanSteps = steps
    .map((s) => ({ ...s, name: s.name.trim() }))
    .filter((s) => s.name !== "");

  const payload = {
    steps: cleanSteps.map((s) => ({ id: s.id, name: s.name })),
  };

  function updateStep(key: string, value: string) {
    setSteps((prev) =>
      prev.map((s) => (s.key === key ? { ...s, name: value } : s)),
    );
  }

  function addStep() {
    nextKey.current += 1;
    setSteps((prev) => [
      ...prev,
      { key: `new-${nextKey.current}`, id: null, name: "" },
    ]);
  }

  function removeStep(key: string) {
    setSteps((prev) => prev.filter((s) => s.key !== key));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nextErrors: { name?: string; steps?: string } = {};

    if (name.trim().length < 2) {
      nextErrors.name = "El nombre del flujo es requerido (minimo 2 caracteres).";
    }
    if (cleanSteps.length === 0) {
      nextErrors.steps = "El flujo debe tener al menos un paso con nombre.";
    }

    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.steps) {
      event.preventDefault();
    }
  }

  function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        `¿Eliminar el flujo "${flowName}"?\n\nLos flujos ya asignados a clientes y sus tareas NO se eliminan; solo desaparece la plantilla.`,
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
        <input name="payload" type="hidden" value={JSON.stringify(payload)} />

        {/* Informacion general */}
        <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Informacion general
          </p>
        </div>
        <div className="space-y-5 px-6 py-6">
          <div className="space-y-1.5">
            <label className={labelClass}>
              Nombre del flujo <span className="text-rose-500">*</span>
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
              defaultValue={flowDescription ?? ""}
              name="description"
              placeholder="Para que sirve este flujo..."
              type="text"
            />
          </div>
        </div>

        {/* Pasos */}
        <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Pasos <span className="text-rose-400">*</span>
          </p>
        </div>
        <div className="space-y-3 px-6 py-6">
          <p className="text-sm text-zinc-500">
            Los cambios solo afectan asignaciones futuras; las tareas ya
            asignadas a clientes no se modifican.
          </p>

          {steps.map((step, index) => (
            <div className="flex items-center gap-2" key={step.key}>
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-500">
                {index + 1}
              </span>
              <input
                className={`${inputClass} ${inputOk}`}
                onChange={(e) => {
                  updateStep(step.key, e.target.value);
                  if (errors.steps) {
                    setErrors((prev) => ({ ...prev, steps: undefined }));
                  }
                }}
                placeholder={`Paso ${index + 1}`}
                type="text"
                value={step.name}
              />
              <div className="flex shrink-0 items-center gap-1">
                <button
                  aria-label="Subir paso"
                  className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-30"
                  disabled={index === 0}
                  onClick={() => moveStep(index, -1)}
                  type="button"
                >
                  <ArrowUp size={15} />
                </button>
                <button
                  aria-label="Bajar paso"
                  className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-30"
                  disabled={index === steps.length - 1}
                  onClick={() => moveStep(index, 1)}
                  type="button"
                >
                  <ArrowDown size={15} />
                </button>
                <button
                  aria-label="Eliminar paso"
                  className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                  disabled={steps.length === 1}
                  onClick={() => removeStep(step.key)}
                  type="button"
                >
                  <X size={15} />
                </button>
              </div>
            </div>
          ))}

          {errors.steps ? (
            <p className="text-xs font-medium text-rose-600">{errors.steps}</p>
          ) : null}

          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
            onClick={addStep}
            type="button"
          >
            <Plus size={16} />
            Agregar paso
          </button>
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
          <p className="text-xs text-zinc-400">
            Los campos con <span className="text-rose-500">*</span> son requeridos
          </p>
          <div className="flex items-center gap-3">
            <Link
              href="/tareas/flujos"
              className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              Cancelar
            </Link>
            <SubmitButton label="Guardar cambios" pendingLabel="Guardando..." />
          </div>
        </div>
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
            <p className="text-sm font-semibold text-zinc-950">Eliminar flujo</p>
            <p className="mt-0.5 text-sm text-zinc-500">
              Borra la plantilla. Los flujos ya asignados a clientes y sus
              tareas se conservan.
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
