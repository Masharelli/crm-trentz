import { ArrowLeft, Eye, FileDown, Pencil, Send } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  answerableFields,
  assignmentStatusClass,
  assignmentStatusLabel,
  fieldTypeLabel,
  sortFields,
  type FormFieldDef,
} from "@/lib/forms";
import { canWrite, getCurrentRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import SendLinkButton from "../../components/SendLinkButton";
import SubmitButton from "../../components/SubmitButton";
import { asignarFormulario, enviarLigaFormulario } from "../actions";
import {
  EliminarAsignacionButton,
  ReabrirAsignacionButton,
} from "../AssignmentActions";
import CopyLinkButton from "../CopyLinkButton";
import DeleteFormularioButton from "../DeleteFormularioButton";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

type AssignmentRow = {
  id: string;
  client_id: string;
  status: string;
  token: string;
  fields_snapshot: FormFieldDef[];
  completed_at: string | null;
  created_at: string;
  clients: { display_name: string } | null;
  form_answers: { count: number }[];
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export default async function VerFormularioPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  const escribir = canWrite(role);

  const { id } = await params;
  const { error } = await searchParams;

  const [{ data: form }, { data: assignmentsData }, { data: clients }] =
    await Promise.all([
      supabase
        .from("forms")
        .select(
          "id, name, description, form_fields(id, label, help_text, field_type, options, is_required, position)",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("form_assignments")
        .select(
          "id, client_id, status, token, fields_snapshot, completed_at, created_at, clients(display_name), form_answers(count)",
        )
        .eq("form_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("clients")
        .select("id, display_name")
        .order("display_name", { ascending: true }),
    ]);

  if (!form) notFound();

  const fields = sortFields(form.form_fields as FormFieldDef[]);
  const assignments = (assignmentsData ?? []) as unknown as AssignmentRow[];

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/formularios"
              className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              aria-label="Volver a formularios"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
                {form.name}
              </h1>
              <p className="text-sm text-zinc-500">
                {form.description ?? "Detalle del formulario"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {assignments.length > 0 ? (
              <a
                href={`/formularios/${id}/exportar`}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
                title="Descargar CSV con las respuestas de todos los clientes"
              >
                <FileDown size={14} />
                Exportar CSV
              </a>
            ) : null}
            {escribir ? (
              <Link
                href={`/formularios/${id}/editar`}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                <Pencil size={14} />
                Editar
              </Link>
            ) : null}
            {escribir ? <DeleteFormularioButton id={id} nombre={form.name} /> : null}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : null}

          {/* Asignar a cliente */}
          {escribir ? (
            <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                  Asignar a cliente
                </p>
              </div>
              <form action={asignarFormulario} className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center">
                <input name="form_id" type="hidden" value={id} />
                <input name="from" type="hidden" value="formulario" />
                <select
                  className="h-11 w-full flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  defaultValue=""
                  name="client_id"
                  required
                >
                  <option value="" disabled>
                    Selecciona un cliente...
                  </option>
                  {(clients ?? []).map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.display_name}
                    </option>
                  ))}
                </select>
                <SubmitButton label="Generar liga" pendingLabel="Generando..." />
              </form>
            </div>
          ) : null}

          {/* Asignaciones */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Asignaciones ({assignments.length})
              </p>
            </div>
            {assignments.length === 0 ? (
              <div className="px-6 py-6">
                <p className="text-sm text-zinc-400">
                  Aún no asignas este formulario. Selecciona un cliente arriba
                  para generar su liga.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {assignments.map((assignment) => {
                  const total = answerableFields(
                    assignment.fields_snapshot ?? [],
                  ).length;
                  const answered = assignment.form_answers[0]?.count ?? 0;

                  return (
                    <div
                      className="flex flex-col gap-2 px-6 py-3.5 sm:flex-row sm:items-center sm:gap-3"
                      key={assignment.id}
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          className="truncate text-sm font-medium text-zinc-950 underline-offset-2 hover:underline"
                          href={`/clientes/${assignment.client_id}`}
                        >
                          {assignment.clients?.display_name ?? "Cliente eliminado"}
                        </Link>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {assignment.status === "completed" && assignment.completed_at
                            ? `Completado el ${formatDate(assignment.completed_at)}`
                            : `${answered} de ${total} respondidas · asignado el ${formatDate(assignment.created_at)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${assignmentStatusClass[assignment.status] ?? assignmentStatusClass.pending}`}
                        >
                          {assignmentStatusLabel[assignment.status] ?? assignment.status}
                        </span>
                        <CopyLinkButton compact token={assignment.token} />
                        {escribir && assignment.status !== "completed" ? (
                          <SendLinkButton
                            compact
                            label="Enviar liga por correo"
                            confirmMessage={`¿Enviar la liga del formulario por correo a ${assignment.clients?.display_name ?? "este cliente"}? Se usará su contacto principal o el correo de su ficha.`}
                            onSend={enviarLigaFormulario.bind(
                              null,
                              assignment.id,
                              `/formularios/${id}`,
                            )}
                          />
                        ) : null}
                        <Link
                          aria-label="Ver respuestas"
                          className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                          href={`/formularios/respuestas/${assignment.id}`}
                          title="Ver respuestas"
                        >
                          <Eye size={15} />
                        </Link>
                        {escribir && assignment.status === "completed" ? (
                          <ReabrirAsignacionButton
                            assignmentId={assignment.id}
                            backPath={`/formularios/${id}`}
                          />
                        ) : null}
                        {escribir ? (
                          <EliminarAsignacionButton
                            assignmentId={assignment.id}
                            backPath={`/formularios/${id}`}
                            nombre={assignment.clients?.display_name ?? "este cliente"}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preguntas */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Preguntas ({answerableFields(fields).length})
              </p>
              <Send className="text-zinc-300" size={14} />
            </div>
            <div className="divide-y divide-zinc-100">
              {fields.map((field) =>
                field.field_type === "section" ? (
                  <p
                    className="bg-zinc-50 px-6 py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500"
                    key={field.id}
                  >
                    {field.label}
                  </p>
                ) : (
                  <div className="flex items-start gap-3 px-6 py-2.5" key={field.id}>
                    <p className="flex-1 text-sm text-zinc-900">
                      {field.label}
                      {field.is_required ? (
                        <span className="text-rose-500"> *</span>
                      ) : null}
                    </p>
                    <span className="shrink-0 text-xs font-medium text-zinc-400">
                      {fieldTypeLabel[field.field_type] ?? field.field_type}
                    </span>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
