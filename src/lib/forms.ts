// Tipos y helpers compartidos del modulo de formularios (dashboard y pagina publica).

export type FieldType =
  | "section"
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "multiselect"
  | "yesno";

export type FormFieldDef = {
  id: string;
  label: string;
  help_text: string | null;
  field_type: FieldType;
  options: string[] | null;
  is_required: boolean;
  position: number;
};

export const fieldTypeLabel: Record<FieldType, string> = {
  section: "Sección (separador)",
  text: "Texto corto",
  textarea: "Texto largo",
  number: "Número",
  date: "Fecha",
  select: "Opción única",
  multiselect: "Opción múltiple",
  yesno: "Sí / No",
};

export const assignmentStatusLabel: Record<string, string> = {
  pending: "Pendiente",
  in_progress: "En progreso",
  completed: "Completado",
};

export const assignmentStatusClass: Record<string, string> = {
  pending: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  in_progress: "bg-amber-50 text-amber-800 ring-amber-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

// Campos que aceptan respuesta (excluye separadores de seccion).
export function answerableFields(fields: FormFieldDef[]): FormFieldDef[] {
  return fields.filter((f) => f.field_type !== "section");
}

export function sortFields(fields: FormFieldDef[]): FormFieldDef[] {
  return [...fields].sort((a, b) => a.position - b.position);
}

// Los valores de multiselect se guardan como JSON array en form_answers.value.
export function parseMultiValue(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function formatAnswer(field: FormFieldDef, value: string | undefined): string {
  if (!value || value.trim() === "") return "—";
  if (field.field_type === "multiselect") {
    const items = parseMultiValue(value);
    return items.length > 0 ? items.join(", ") : "—";
  }
  return value;
}
