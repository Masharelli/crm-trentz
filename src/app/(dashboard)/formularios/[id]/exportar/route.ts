import { NextResponse, type NextRequest } from "next/server";
import { CSV_BOM, csvRow, slugify } from "@/lib/csv";
import {
  answerableFields,
  assignmentStatusLabel,
  formatAnswer,
  sortFields,
  type FormFieldDef,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

// CSV consolidado de un formulario: una fila por cliente asignado, una
// columna por pregunta. GET /formularios/[id]/exportar

type AssignmentRow = {
  status: string;
  completed_at: string | null;
  created_at: string;
  fields_snapshot: FormFieldDef[];
  clients: { display_name: string } | null;
  form_answers: { field_id: string; value: string }[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;

  const [{ data: form }, { data: assignmentsData }] = await Promise.all([
    supabase
      .from("forms")
      .select(
        "id, name, form_fields(id, label, help_text, field_type, options, is_required, position)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("form_assignments")
      .select(
        "status, completed_at, created_at, fields_snapshot, clients(display_name), form_answers(field_id, value)",
      )
      .eq("form_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!form) {
    return NextResponse.json({ error: "Formulario no encontrado" }, { status: 404 });
  }

  const assignments = (assignmentsData ?? []) as unknown as AssignmentRow[];

  // Columnas: preguntas actuales de la plantilla, mas cualquier pregunta que
  // solo exista en snapshots viejos (para no perder respuestas de ligas
  // generadas antes de editar la plantilla).
  const columns = answerableFields(sortFields(form.form_fields as FormFieldDef[]));
  const known = new Set(columns.map((f) => f.id));
  for (const assignment of assignments) {
    for (const field of answerableFields(
      sortFields(assignment.fields_snapshot ?? []),
    )) {
      if (!known.has(field.id)) {
        known.add(field.id);
        columns.push(field);
      }
    }
  }

  const rows: string[] = [
    csvRow([
      "Cliente",
      "Estado",
      "Asignado el",
      "Completado el",
      ...columns.map((f) => f.label),
    ]),
  ];

  for (const assignment of assignments) {
    const answers = new Map(
      assignment.form_answers.map((a) => [a.field_id, a.value]),
    );
    rows.push(
      csvRow([
        assignment.clients?.display_name ?? "Cliente eliminado",
        assignmentStatusLabel[assignment.status] ?? assignment.status,
        formatDate(assignment.created_at),
        assignment.completed_at ? formatDate(assignment.completed_at) : "",
        ...columns.map((f) => {
          const answer = formatAnswer(f, answers.get(f.id));
          return answer === "—" ? "" : answer;
        }),
      ]),
    );
  }

  return new NextResponse(`${CSV_BOM}${rows.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${slugify(form.name)}-respuestas.csv"`,
    },
  });
}
