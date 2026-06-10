"use client";

import { CheckCircle2, CloudUpload, LoaderCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  answerableFields,
  parseMultiValue,
  type FormFieldDef,
} from "@/lib/forms";
import { enviarFormulario, guardarRespuesta } from "../actions";

const inputClass =
  "h-11 w-full rounded-md border bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:ring-2";

const inputOk = "border-zinc-200 focus:border-zinc-400 focus:ring-zinc-100";

const inputError = "border-rose-300 focus:border-rose-400 focus:ring-rose-100";

type Props = {
  token: string;
  formName: string;
  clientName: string | null;
  fields: FormFieldDef[];
  initialAnswers: Record<string, string>;
};

type SaveState = "idle" | "saving" | "saved" | "error";

export default function PublicForm({
  token,
  formName,
  clientName,
  fields,
  initialAnswers,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendingSaves = useRef(0);

  const questions = answerableFields(fields);
  const answered = questions.filter((f) => {
    const value = answers[f.id] ?? "";
    return f.field_type === "multiselect"
      ? parseMultiValue(value).length > 0
      : value.trim() !== "";
  }).length;

  useEffect(() => {
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  async function persist(fieldId: string, value: string) {
    pendingSaves.current += 1;
    setSaveState("saving");
    const result = await guardarRespuesta(token, fieldId, value);
    pendingSaves.current -= 1;
    if (pendingSaves.current === 0) {
      setSaveState(result.ok ? "saved" : "error");
    }
  }

  function setAnswer(fieldId: string, value: string, immediate = false) {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => ({ ...prev, [fieldId]: "" }));
    }

    clearTimeout(timers.current[fieldId]);
    if (immediate) {
      void persist(fieldId, value);
    } else {
      timers.current[fieldId] = setTimeout(() => {
        void persist(fieldId, value);
      }, 1200);
    }
  }

  function flushField(fieldId: string) {
    if (timers.current[fieldId]) {
      clearTimeout(timers.current[fieldId]);
      delete timers.current[fieldId];
      void persist(fieldId, answers[fieldId] ?? "");
    }
  }

  function toggleMultiOption(field: FormFieldDef, option: string) {
    const current = parseMultiValue(answers[field.id] ?? "");
    const next = current.includes(option)
      ? current.filter((o) => o !== option)
      : [...current, option];
    setAnswer(field.id, next.length > 0 ? JSON.stringify(next) : "", true);
  }

  async function handleSubmit() {
    const nextErrors: Record<string, string> = {};
    for (const field of questions) {
      const value = answers[field.id] ?? "";
      const empty =
        field.field_type === "multiselect"
          ? parseMultiValue(value).length === 0
          : value.trim() === "";
      if (field.is_required && empty) {
        nextErrors[field.id] = "Esta pregunta es requerida.";
      }
    }

    setErrors(nextErrors);

    const firstError = questions.find((f) => nextErrors[f.id]);
    if (firstError) {
      document
        .getElementById(`field-${firstError.id}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    const result = await enviarFormulario(token, answers);
    setSubmitting(false);

    if (result.ok) {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setSubmitError(result.error);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-6 py-16 text-center shadow-sm">
        <div className="grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-600">
          <CheckCircle2 size={28} />
        </div>
        <p className="text-lg font-semibold text-zinc-950">
          ¡Gracias! Tus respuestas fueron enviadas.
        </p>
        <p className="max-w-md text-sm text-zinc-500">
          Hemos recibido tu información correctamente. Nuestro equipo la
          revisará y se pondrá en contacto contigo para los siguientes pasos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progreso */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-zinc-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-zinc-700">
            {answered} de {questions.length} respondidas
          </p>
          <p
            className={`flex items-center gap-1.5 text-xs font-medium ${
              saveState === "error" ? "text-rose-600" : "text-zinc-400"
            }`}
          >
            {saveState === "saving" ? (
              <>
                <LoaderCircle className="animate-spin" size={13} />
                Guardando...
              </>
            ) : saveState === "saved" ? (
              <>
                <CloudUpload size={13} />
                Guardado
              </>
            ) : saveState === "error" ? (
              "No se pudo guardar, revisa tu conexión"
            ) : (
              "Tu avance se guarda automáticamente"
            )}
          </p>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-100">
          <div
            className="h-full rounded-full bg-zinc-950 transition-all"
            style={{
              width: `${questions.length > 0 ? Math.round((answered / questions.length) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Preguntas */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-100 px-6 py-5">
          <h1 className="text-xl font-semibold text-zinc-950">{formName}</h1>
          {clientName ? (
            <p className="mt-1 text-sm text-zinc-500">Para {clientName}</p>
          ) : null}
          <p className="mt-2 text-sm text-zinc-500">
            Puedes salir y volver a esta misma liga cuando quieras: tu avance
            queda guardado. Las preguntas con{" "}
            <span className="font-semibold text-rose-500">*</span> son
            requeridas.
          </p>
        </div>

        {fields.map((field) => {
          if (field.field_type === "section") {
            return (
              <div
                className="border-y border-zinc-100 bg-zinc-50 px-6 py-3"
                key={field.id}
              >
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  {field.label}
                </p>
              </div>
            );
          }

          const value = answers[field.id] ?? "";
          const error = errors[field.id];
          const fieldInputClass = `${inputClass} ${error ? inputError : inputOk}`;

          return (
            <div
              className="space-y-1.5 border-b border-zinc-100 px-6 py-5 last:border-b-0"
              id={`field-${field.id}`}
              key={field.id}
            >
              <label className="block text-sm font-medium text-zinc-800">
                {field.label}
                {field.is_required ? (
                  <span className="text-rose-500"> *</span>
                ) : null}
              </label>
              {field.help_text ? (
                <p className="text-xs leading-relaxed text-zinc-500">
                  {field.help_text}
                </p>
              ) : null}

              {field.field_type === "textarea" ? (
                <textarea
                  className={`min-h-24 w-full rounded-md border bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:ring-2 ${error ? inputError : inputOk}`}
                  onBlur={() => flushField(field.id)}
                  onChange={(e) => setAnswer(field.id, e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  value={value}
                />
              ) : field.field_type === "select" ? (
                <select
                  className={fieldInputClass}
                  onChange={(e) => setAnswer(field.id, e.target.value, true)}
                  value={value}
                >
                  <option value="">Selecciona una opción...</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : field.field_type === "multiselect" ? (
                <div className="space-y-2 pt-1">
                  {(field.options ?? []).map((option) => {
                    const checked = parseMultiValue(value).includes(option);
                    return (
                      <label
                        className="flex items-start gap-2.5 text-sm text-zinc-700"
                        key={option}
                      >
                        <input
                          checked={checked}
                          className="mt-0.5 size-4 shrink-0 rounded border-zinc-300 accent-zinc-950"
                          onChange={() => toggleMultiOption(field, option)}
                          type="checkbox"
                        />
                        {option}
                      </label>
                    );
                  })}
                </div>
              ) : field.field_type === "yesno" ? (
                <div className="flex items-center gap-5 pt-1">
                  {["Sí", "No"].map((option) => (
                    <label
                      className="flex items-center gap-2 text-sm text-zinc-700"
                      key={option}
                    >
                      <input
                        checked={value === option}
                        className="size-4 accent-zinc-950"
                        name={`field-${field.id}-radio`}
                        onChange={() => setAnswer(field.id, option, true)}
                        type="radio"
                      />
                      {option}
                    </label>
                  ))}
                </div>
              ) : (
                <input
                  className={fieldInputClass}
                  onBlur={() => flushField(field.id)}
                  onChange={(e) => setAnswer(field.id, e.target.value)}
                  placeholder="Escribe tu respuesta..."
                  type={
                    field.field_type === "number"
                      ? "number"
                      : field.field_type === "date"
                        ? "date"
                        : "text"
                  }
                  value={value}
                />
              )}

              {error ? (
                <p className="text-xs font-medium text-rose-600">{error}</p>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Enviar */}
      <div className="space-y-3 pb-10">
        {submitError ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {submitError}
          </div>
        ) : null}
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:opacity-60"
          disabled={submitting}
          onClick={handleSubmit}
          type="button"
        >
          {submitting ? (
            <>
              <LoaderCircle className="animate-spin" size={16} />
              Enviando...
            </>
          ) : (
            "Enviar formulario"
          )}
        </button>
        <p className="text-center text-xs text-zinc-400">
          Al enviar, la liga se cierra y tus respuestas quedan registradas.
        </p>
      </div>
    </div>
  );
}
