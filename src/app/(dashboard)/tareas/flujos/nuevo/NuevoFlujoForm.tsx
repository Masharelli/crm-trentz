"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import SubmitButton from "../../../components/SubmitButton";
import { crearFlujo } from "../../actions";

const inputClass =
  "h-11 w-full rounded-md border bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:ring-2";

const inputOk = "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100";

const inputError = "border-rose-300 focus:border-rose-400 focus:ring-rose-100";

const labelClass = "block text-sm font-medium text-zinc-700";

export default function NuevoFlujoForm() {
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<string[]>(["", "", ""]);
  const [errors, setErrors] = useState<{ name?: string; steps?: string }>({});

  const cleanSteps = steps.map((s) => s.trim()).filter((s) => s !== "");

  function updateStep(index: number, value: string) {
    setSteps((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, ""]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
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
      nextErrors.steps = "Agrega al menos un paso con nombre.";
    }

    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.steps) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={crearFlujo}
      noValidate
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
    >
      <input name="steps" type="hidden" value={JSON.stringify(cleanSteps)} />

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
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Onboarding de cliente"
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
          Al asignar este flujo a un cliente, cada paso se convierte en una
          tarea con su propio checkbox.
        </p>

        {steps.map((step, index) => (
          <div className="flex items-center gap-2" key={index}>
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-500">
              {index + 1}
            </span>
            <input
              className={`${inputClass} ${inputOk}`}
              onChange={(e) => {
                updateStep(index, e.target.value);
                if (errors.steps) {
                  setErrors((prev) => ({ ...prev, steps: undefined }));
                }
              }}
              placeholder={`Paso ${index + 1} (p. ej. Firmar contrato)`}
              type="text"
              value={step}
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
                onClick={() => removeStep(index)}
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
          className="inline-flex h-10 whitespace-nowrap items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
          onClick={addStep}
          type="button"
        >
          <Plus size={16} />
          Agregar paso
        </button>
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-zinc-400">
          Los campos con <span className="text-rose-500">*</span> son requeridos
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/tareas/flujos"
            className="inline-flex h-10 whitespace-nowrap items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Cancelar
          </Link>
          <SubmitButton label="Crear flujo" pendingLabel="Creando..." />
        </div>
      </div>
    </form>
  );
}
