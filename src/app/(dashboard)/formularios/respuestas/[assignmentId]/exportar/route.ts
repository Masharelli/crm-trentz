import { NextResponse, type NextRequest } from "next/server";
import { CSV_BOM, csvCell, slugify } from "@/lib/csv";
import { formatAnswer, sortFields, type FormFieldDef } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

// Descarga las respuestas de una asignacion en CSV o Markdown.
// GET /formularios/respuestas/[assignmentId]/exportar?formato=csv|md

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { assignmentId } = await params;
  const formato = request.nextUrl.searchParams.get("formato") ?? "csv";

  const { data: assignment } = await supabase
    .from("form_assignments")
    .select(
      "id, form_name, status, fields_snapshot, completed_at, created_at, clients(display_name), form_answers(field_id, value)",
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    return NextResponse.json({ error: "Asignación no encontrada" }, { status: 404 });
  }

  const cliente =
    (assignment.clients as unknown as { display_name: string } | null)
      ?.display_name ?? "Cliente eliminado";
  const fields = sortFields((assignment.fields_snapshot ?? []) as FormFieldDef[]);
  const answers = new Map(
    (assignment.form_answers as { field_id: string; value: string }[]).map(
      (a) => [a.field_id, a.value],
    ),
  );
  const estado =
    assignment.status === "completed" && assignment.completed_at
      ? `Completado el ${formatDateTime(assignment.completed_at)}`
      : "Respuestas parciales (el cliente aún no envía)";

  const baseName = `${slugify(assignment.form_name)}-${slugify(cliente)}`;

  if (formato === "md") {
    const lines: string[] = [
      `# ${assignment.form_name}`,
      "",
      `- **Cliente:** ${cliente}`,
      `- **Estado:** ${estado}`,
      "",
    ];

    for (const field of fields) {
      if (field.field_type === "section") {
        lines.push(`## ${field.label}`, "");
      } else {
        const answer = formatAnswer(field, answers.get(field.id));
        lines.push(`**${field.label}**`, "");
        // Las respuestas largas pueden traer saltos de linea; se conservan.
        lines.push(answer, "");
      }
    }

    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseName}.md"`,
      },
    });
  }

  // CSV (con BOM para que Excel muestre bien los acentos)
  const rows: string[] = [
    ["Sección", "Pregunta", "Respuesta"].map(csvCell).join(","),
  ];

  let currentSection = "";
  for (const field of fields) {
    if (field.field_type === "section") {
      currentSection = field.label;
      continue;
    }
    const answer = formatAnswer(field, answers.get(field.id));
    rows.push(
      [currentSection, field.label, answer === "—" ? "" : answer]
        .map(csvCell)
        .join(","),
    );
  }
  rows.push("");
  rows.push(["Cliente", cliente].map(csvCell).join(","));
  rows.push(["Formulario", assignment.form_name].map(csvCell).join(","));
  rows.push(["Estado", estado].map(csvCell).join(","));

  return new NextResponse(`${CSV_BOM}${rows.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${baseName}.csv"`,
    },
  });
}
