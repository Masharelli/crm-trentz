import { ArrowLeft, FileDown } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  answerableFields,
  assignmentStatusClass,
  assignmentStatusLabel,
  formatAnswer,
  sortFields,
  type FormFieldDef,
} from "@/lib/forms";
import { canWrite, getCurrentRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { ReabrirAsignacionButton } from "../../AssignmentActions";
import CopyLinkButton from "../../CopyLinkButton";

type Props = {
  params: Promise<{ assignmentId: string }>;
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function RespuestasPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  const escribir = canWrite(role);

  const { assignmentId } = await params;

  const { data: assignment } = await supabase
    .from("form_assignments")
    .select(
      "id, client_id, form_name, status, token, fields_snapshot, completed_at, created_at, clients(display_name), form_answers(field_id, value)",
    )
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) notFound();

  const cliente = assignment.clients as unknown as { display_name: string } | null;
  const fields = sortFields((assignment.fields_snapshot ?? []) as FormFieldDef[]);
  const answers = new Map(
    (assignment.form_answers as { field_id: string; value: string }[]).map((a) => [
      a.field_id,
      a.value,
    ]),
  );
  const total = answerableFields(fields).length;
  const answered = answerableFields(fields).filter((f) => {
    const value = answers.get(f.id);
    return value !== undefined && value.trim() !== "";
  }).length;

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/clientes/${assignment.client_id}`}
              className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              aria-label="Volver al cliente"
            >
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-zinc-950 sm:text-2xl">
                {assignment.form_name}
              </h1>
              <p className="text-sm text-zinc-500">
                {cliente?.display_name ?? "Cliente eliminado"} · {answered} de{" "}
                {total} respondidas
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex whitespace-nowrap h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${assignmentStatusClass[assignment.status] ?? assignmentStatusClass.pending}`}
            >
              {assignmentStatusLabel[assignment.status] ?? assignment.status}
            </span>
            <a
              className="inline-flex whitespace-nowrap h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              href={`/formularios/respuestas/${assignment.id}/exportar?formato=csv`}
            >
              <FileDown size={13} />
              CSV
            </a>
            <a
              className="inline-flex whitespace-nowrap h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
              href={`/formularios/respuestas/${assignment.id}/exportar?formato=md`}
            >
              <FileDown size={13} />
              MD
            </a>
            <CopyLinkButton token={assignment.token} />
            {escribir && assignment.status === "completed" ? (
              <ReabrirAsignacionButton
                assignmentId={assignment.id}
                backPath={`/formularios/respuestas/${assignment.id}`}
              />
            ) : null}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {assignment.status === "completed" && assignment.completed_at ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
              Formulario completado el {formatDateTime(assignment.completed_at)}.
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
              El cliente aún no envía el formulario. Las respuestas que ves se
              guardan automáticamente conforme avanza.
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            {fields.map((field) =>
              field.field_type === "section" ? (
                <div
                  className="border-y border-zinc-100 bg-zinc-50 px-4 py-3 first:border-t-0 sm:px-6"
                  key={field.id}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                    {field.label}
                  </p>
                </div>
              ) : (
                <div
                  className="border-b border-zinc-100 px-4 py-4 last:border-b-0 sm:px-6"
                  key={field.id}
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    {field.label}
                    {field.is_required ? (
                      <span className="text-rose-400"> *</span>
                    ) : null}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">
                    {formatAnswer(field, answers.get(field.id))}
                  </p>
                </div>
              ),
            )}
          </div>
        </div>
      </div>
    </>
  );
}
