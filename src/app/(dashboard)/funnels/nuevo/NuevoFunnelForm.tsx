"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import SubmitButton from "../../components/SubmitButton";
import { crearFunnel } from "../actions";

const inputClass =
  "h-11 w-full rounded-md border bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:ring-2";

const inputOk =
  "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100";

const inputError =
  "border-rose-300 focus:border-rose-400 focus:ring-rose-100";

const labelClass = "block text-sm font-medium text-zinc-700";

export default function NuevoFunnelForm() {
  const [name, setName] = useState("");
  const [stages, setStages] = useState<string[]>([
    "Contacto",
    "Propuesta",
    "Negociacion",
    "Cierre",
  ]);
  const [errors, setErrors] = useState<{ name?: string; stages?: string }>({});

  const cleanStages = stages.map((s) => s.trim()).filter((s) => s !== "");

  function updateStage(index: number, value: string) {
    setStages((prev) => prev.map((s, i) => (i === index ? value : s)));
  }

  function addStage() {
    setStages((prev) => [...prev, ""]);
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index));
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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nextErrors: { name?: string; stages?: string } = {};

    if (name.trim().length < 2) {
      nextErrors.name = "El nombre del funnel es requerido (minimo 2 caracteres).";
    }
    if (cleanStages.length === 0) {
      nextErrors.stages = "Agrega al menos una etapa con nombre.";
    }

    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.stages) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={crearFunnel}
      noValidate
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
    >
      <input name="stages" type="hidden" value={JSON.stringify(cleanStages)} />

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
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder="Funnel de ventas"
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
        <p className="text-sm text-zinc-500">
          Los clientes se moveran entre estas etapas en el tablero. El orden de
          aqui es el orden de las columnas.
        </p>

        {stages.map((stage, index) => (
          <div className="flex items-center gap-2" key={index}>
            <span className="grid size-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-500">
              {index + 1}
            </span>
            <input
              className={`${inputClass} ${inputOk}`}
              onChange={(e) => {
                updateStage(index, e.target.value);
                if (errors.stages) {
                  setErrors((prev) => ({ ...prev, stages: undefined }));
                }
              }}
              placeholder={`Etapa ${index + 1}`}
              type="text"
              value={stage}
            />
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
                onClick={() => removeStage(index)}
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
          className="inline-flex h-10 items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
          onClick={addStage}
          type="button"
        >
          <Plus size={16} />
          Agregar etapa
        </button>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
        <p className="text-xs text-zinc-400">
          Los campos con <span className="text-rose-500">*</span> son requeridos
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/funnels"
            className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Cancelar
          </Link>
          <SubmitButton label="Crear funnel" pendingLabel="Creando..." />
        </div>
      </div>
    </form>
  );
}
