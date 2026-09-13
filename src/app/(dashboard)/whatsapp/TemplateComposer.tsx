"use client";

import { MessageSquareText } from "lucide-react";
import { useState } from "react";
import type { WhatsAppTemplate } from "@/lib/whatsapp/client";
import { enviarPlantilla } from "./actions";
import PendingButton from "./PendingButton";

export default function TemplateComposer({
  conversationId,
  templates,
}: {
  conversationId: string;
  templates: WhatsAppTemplate[];
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [variables, setVariables] = useState<string[]>([]);
  const selected = templates[selectedIndex];

  if (!selected) {
    return (
      <p className="mt-2 text-xs leading-5 text-amber-700">
        No hay plantillas aprobadas disponibles. Un administrador debe configurar
        el WABA ID o aprobar una plantilla en Meta.
      </p>
    );
  }

  const preview = selected.body.replace(/\{\{(\d+)\}\}/g, (_, rawIndex: string) => {
    const index = Number(rawIndex) - 1;
    return variables[index]?.trim() || `[dato ${index + 1}]`;
  });

  return (
    <form action={enviarPlantilla} className="mt-3 grid gap-3">
      <input type="hidden" name="conversation_id" value={conversationId} />
      <input type="hidden" name="template_name" value={selected.name} />
      <input type="hidden" name="template_language" value={selected.language} />

      <label className="grid gap-1.5 text-xs font-semibold text-amber-900">
        Plantilla aprobada
        <select
          value={selectedIndex}
          onChange={(event) => {
            setSelectedIndex(Number(event.target.value));
            setVariables([]);
          }}
          className="h-10 rounded-md border border-amber-200 bg-white px-3 text-sm font-medium text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        >
          {templates.map((template, index) => (
            <option key={`${template.name}-${template.language}`} value={index}>
              {template.name} · {template.language}
            </option>
          ))}
        </select>
      </label>

      {selected.variableCount > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: selected.variableCount }, (_, index) => (
            <label
              key={index}
              className="grid gap-1 text-xs font-semibold text-amber-900"
            >
              Dato {index + 1}
              <input
                name={`variable_${index + 1}`}
                required
                value={variables[index] ?? ""}
                onChange={(event) => {
                  const next = [...variables];
                  next[index] = event.target.value;
                  setVariables(next);
                }}
                className="h-10 rounded-md border border-amber-200 bg-white px-3 text-sm font-normal text-zinc-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder={`Valor para {{${index + 1}}}`}
              />
            </label>
          ))}
        </div>
      ) : null}

      <div className="rounded-lg border border-amber-200 bg-white/80 p-3 text-sm text-zinc-700">
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          Vista previa
        </p>
        <p className="whitespace-pre-wrap">{preview}</p>
      </div>

      <PendingButton
        pendingLabel="Enviando plantilla..."
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
      >
        <MessageSquareText size={16} />
        Enviar plantilla
      </PendingButton>
    </form>
  );
}
