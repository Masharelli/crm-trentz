"use client";

import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { FieldType, FormFieldDef } from "@/lib/forms";
import { fieldTypeLabel } from "@/lib/forms";
import SubmitButton from "../components/SubmitButton";

const inputClass =
  "h-11 w-full rounded-md border bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:ring-2";

const inputOk = "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100";

const inputError = "border-rose-300 focus:border-rose-400 focus:ring-rose-100";

const labelClass = "block text-sm font-medium text-zinc-700";

const smallInputClass =
  "h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

type BuilderField = {
  key: number;
  id: string | null;
  label: string;
  help_text: string;
  field_type: FieldType;
  optionsText: string;
  is_required: boolean;
};

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  cancelHref: string;
  submitLabel: string;
  pendingLabel: string;
  initialName?: string;
  initialDescription?: string;
  initialFields?: FormFieldDef[];
};

let nextKey = 1;

function emptyField(): BuilderField {
  return {
    key: nextKey++,
    id: null,
    label: "",
    help_text: "",
    field_type: "text",
    optionsText: "",
    is_required: false,
  };
}

function fromDef(def: FormFieldDef): BuilderField {
  return {
    key: nextKey++,
    id: def.id,
    label: def.label,
    help_text: def.help_text ?? "",
    field_type: def.field_type,
    optionsText: (def.options ?? []).join("\n"),
    is_required: def.is_required,
  };
}

function parseOptions(text: string): string[] {
  return text
    .split("\n")
    .map((o) => o.trim())
    .filter((o) => o !== "");
}

export default function FormBuilder({
  action,
  cancelHref,
  submitLabel,
  pendingLabel,
  initialName = "",
  initialDescription = "",
  initialFields,
}: Props) {
  const [name, setName] = useState(initialName);
  const [fields, setFields] = useState<BuilderField[]>(() =>
    initialFields && initialFields.length > 0
      ? initialFields.map(fromDef)
      : [emptyField()],
  );
  const [errors, setErrors] = useState<{ name?: string; fields?: string }>({});

  const payload = fields
    .filter((f) => f.label.trim() !== "")
    .map((f) => ({
      id: f.id,
      label: f.label.trim(),
      help_text: f.help_text.trim(),
      field_type: f.field_type,
      options: ["select", "multiselect"].includes(f.field_type)
        ? parseOptions(f.optionsText)
        : null,
      is_required: f.field_type === "section" ? false : f.is_required,
    }));

  function updateField(key: number, patch: Partial<BuilderField>) {
    setFields((prev) => prev.map((f) => (f.key === key ? { ...f, ...patch } : f)));
    if (errors.fields) setErrors((prev) => ({ ...prev, fields: undefined }));
  }

  function addField(type: FieldType = "text") {
    setFields((prev) => [...prev, { ...emptyField(), field_type: type }]);
  }

  function removeField(key: number) {
    setFields((prev) => prev.filter((f) => f.key !== key));
  }

  function moveField(index: number, direction: -1 | 1) {
    setFields((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    const nextErrors: { name?: string; fields?: string } = {};

    if (name.trim().length < 2) {
      nextErrors.name =
        "El nombre del formulario es requerido (minimo 2 caracteres).";
    }
    if (payload.filter((f) => f.field_type !== "section").length === 0) {
      nextErrors.fields = "Agrega al menos una pregunta con texto.";
    }
    const sinOpciones = payload.find(
      (f) =>
        ["select", "multiselect"].includes(f.field_type) &&
        (f.options ?? []).length === 0,
    );
    if (!nextErrors.fields && sinOpciones) {
      nextErrors.fields = `La pregunta "${sinOpciones.label}" necesita al menos una opción (una por línea).`;
    }

    setErrors(nextErrors);

    if (nextErrors.name || nextErrors.fields) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={action}
      noValidate
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
    >
      <input name="fields" type="hidden" value={JSON.stringify(payload)} />

      {/* Informacion general */}
      <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Informacion general
        </p>
      </div>
      <div className="space-y-5 px-6 py-6">
        <div className="space-y-1.5">
          <label className={labelClass}>
            Nombre del formulario <span className="text-rose-500">*</span>
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
            defaultValue={initialDescription}
            name="description"
            placeholder="Para que sirve este formulario..."
            type="text"
          />
        </div>
      </div>

      {/* Preguntas */}
      <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Preguntas <span className="text-rose-400">*</span>
        </p>
      </div>
      <div className="space-y-3 px-6 py-6">
        <p className="text-sm text-zinc-500">
          Las secciones funcionan como separadores visuales para agrupar
          preguntas. El cliente responde desde una liga pública, sin necesidad
          de cuenta.
        </p>

        {fields.map((field, index) => {
          const isSection = field.field_type === "section";
          const hasOptions = ["select", "multiselect"].includes(field.field_type);

          return (
            <div
              className={`rounded-lg border px-4 py-3 ${
                isSection
                  ? "border-zinc-300 bg-zinc-50"
                  : "border-zinc-200 bg-white"
              }`}
              key={field.key}
            >
              <div className="flex items-start gap-2">
                <span className="mt-1.5 grid size-7 shrink-0 place-items-center rounded-md bg-zinc-100 text-xs font-semibold text-zinc-500">
                  {index + 1}
                </span>

                <div className="flex-1 space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      className={`${smallInputClass} flex-1`}
                      onChange={(e) => updateField(field.key, { label: e.target.value })}
                      placeholder={
                        isSection
                          ? "Título de la sección (p. ej. Datos de contacto)"
                          : `Pregunta ${index + 1}`
                      }
                      type="text"
                      value={field.label}
                    />
                    <select
                      className="h-9 w-full shrink-0 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 sm:w-44"
                      onChange={(e) =>
                        updateField(field.key, {
                          field_type: e.target.value as FieldType,
                        })
                      }
                      value={field.field_type}
                    >
                      {(Object.keys(fieldTypeLabel) as FieldType[]).map((type) => (
                        <option key={type} value={type}>
                          {fieldTypeLabel[type]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!isSection ? (
                    <input
                      className={smallInputClass}
                      onChange={(e) =>
                        updateField(field.key, { help_text: e.target.value })
                      }
                      placeholder="Texto de ayuda para el cliente (opcional)"
                      type="text"
                      value={field.help_text}
                    />
                  ) : null}

                  {hasOptions ? (
                    <textarea
                      className="min-h-20 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-2 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                      onChange={(e) =>
                        updateField(field.key, { optionsText: e.target.value })
                      }
                      placeholder={"Una opción por línea:\nOpción A\nOpción B"}
                      value={field.optionsText}
                    />
                  ) : null}

                  {!isSection ? (
                    <label className="inline-flex items-center gap-2 text-sm text-zinc-600">
                      <input
                        checked={field.is_required}
                        className="size-4 rounded border-zinc-300 accent-zinc-950"
                        onChange={(e) =>
                          updateField(field.key, { is_required: e.target.checked })
                        }
                        type="checkbox"
                      />
                      Requerida
                    </label>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1 pt-1">
                  <button
                    aria-label="Subir pregunta"
                    className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => moveField(index, -1)}
                    type="button"
                  >
                    <ArrowUp size={15} />
                  </button>
                  <button
                    aria-label="Bajar pregunta"
                    className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-30"
                    disabled={index === fields.length - 1}
                    onClick={() => moveField(index, 1)}
                    type="button"
                  >
                    <ArrowDown size={15} />
                  </button>
                  <button
                    aria-label="Eliminar pregunta"
                    className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                    disabled={fields.length === 1}
                    onClick={() => removeField(field.key)}
                    type="button"
                  >
                    <X size={15} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {errors.fields ? (
          <p className="text-xs font-medium text-rose-600">{errors.fields}</p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
            onClick={() => addField()}
            type="button"
          >
            <Plus size={16} />
            Agregar pregunta
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-md border border-dashed border-zinc-300 px-4 text-sm font-semibold text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-950"
            onClick={() => addField("section")}
            type="button"
          >
            <Plus size={16} />
            Agregar sección
          </button>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
        <p className="text-xs text-zinc-400">
          Los campos con <span className="text-rose-500">*</span> son requeridos
        </p>
        <div className="flex items-center gap-3">
          <Link
            href={cancelHref}
            className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
          >
            Cancelar
          </Link>
          <SubmitButton label={submitLabel} pendingLabel={pendingLabel} />
        </div>
      </div>
    </form>
  );
}
