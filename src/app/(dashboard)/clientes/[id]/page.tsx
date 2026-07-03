import {
  Activity,
  ArrowLeft,
  ClipboardList,
  Eye,
  Pencil,
  Plus,
  UserRound,
  Workflow,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  answerableFields,
  assignmentStatusClass,
  assignmentStatusLabel,
  type FormFieldDef,
} from "@/lib/forms";
import { canWrite, getCurrentRole, isAdmin } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import SendLinkButton from "../../components/SendLinkButton";
import SubmitButton from "../../components/SubmitButton";
import {
  EliminarAsignacionButton,
  ReabrirAsignacionButton,
} from "../../formularios/AssignmentActions";
import CopyLinkButton from "../../formularios/CopyLinkButton";
import DeleteTareaButton from "../../tareas/DeleteTareaButton";
import QuitarFlujoButton from "../../tareas/QuitarFlujoButton";
import TaskToggle from "../../tareas/TaskToggle";
import { agregarNota, enviarLigaPortal } from "../actions";
import { enviarLigaFormulario } from "../../formularios/actions";
import { DeleteContactoButton, DeleteNotaButton } from "./ClienteRowButtons";
import {
  CopyPortalLinkButton,
  PortalToggleButton,
  RegenerarLigaButton,
} from "./PortalControls";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

const statusLabel: Record<string, string> = {
  active: "Activo",
  closed: "Cerrado",
  paused: "Pausado",
  prospect: "Prospecto",
};

const statusClass: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  closed: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  paused: "bg-amber-50 text-amber-800 ring-amber-200",
  prospect: "bg-cyan-50 text-cyan-800 ring-cyan-200",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <div className="text-sm text-zinc-900">{children}</div>
    </div>
  );
}

type Task = {
  id: string;
  name: string;
  due_date: string | null;
  completed_at: string | null;
  position: number;
};

function formatDueDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

function TaskItem({
  task,
  clientId,
  hoy,
  deletable = false,
  editable = true,
}: {
  task: Task;
  clientId: string;
  hoy: string;
  deletable?: boolean;
  editable?: boolean;
}) {
  const completada = task.completed_at !== null;
  const vencida = !completada && task.due_date !== null && task.due_date < hoy;

  return (
    <div className="flex items-center gap-3 px-6 py-2.5">
      {editable ? (
        <TaskToggle taskId={task.id} clientId={clientId} completed={completada} />
      ) : (
        <span
          className={`grid size-5 shrink-0 place-items-center rounded border text-xs ${
            completada
              ? "border-emerald-300 bg-emerald-50 text-emerald-600"
              : "border-zinc-300"
          }`}
        >
          {completada ? "✓" : ""}
        </span>
      )}
      <p
        className={`flex-1 truncate text-sm ${completada ? "text-zinc-400 line-through" : "text-zinc-900"}`}
      >
        {task.name}
      </p>
      {task.due_date ? (
        <span
          className={`shrink-0 text-xs font-medium ${vencida ? "text-rose-600" : "text-zinc-400"}`}
        >
          {formatDueDate(task.due_date)}
          {vencida ? " · vencida" : ""}
        </span>
      ) : null}
      {deletable && editable ? (
        <DeleteTareaButton taskId={task.id} clientId={clientId} nombre={task.name} />
      ) : null}
    </div>
  );
}

export default async function VerClientePage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  const escribir = canWrite(role);
  const admin = isAdmin(role);

  const { id } = await params;
  const { error } = await searchParams;

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, display_name, legal_name, tax_id, status, primary_email, primary_phone, website, address_line, notes, portal_token, portal_enabled",
    )
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const [
    { data: flowsData },
    { data: looseData },
    { data: assignmentsData },
    { data: contactsData },
    { data: notesData },
    { data: activityData },
  ] = await Promise.all([
    supabase
      .from("client_flows")
      .select("id, name, client_tasks(id, name, due_date, completed_at, position)")
      .eq("client_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("client_tasks")
      .select("id, name, due_date, completed_at, position")
      .eq("client_id", id)
      .is("client_flow_id", null)
      .order("created_at", { ascending: true }),
    supabase
      .from("form_assignments")
      .select(
        "id, form_name, status, token, fields_snapshot, completed_at, form_answers(count)",
      )
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_contacts")
      .select("id, full_name, position, email, phone, is_primary")
      .eq("client_id", id)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("notes")
      .select("id, body, created_at, profiles(full_name)")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(30),
    supabase
      .from("activity_logs")
      .select("id, description, created_at, profiles(full_name)")
      .eq("client_id", id)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  const clientFlows = (
    (flowsData ?? []) as unknown as { id: string; name: string; client_tasks: Task[] }[]
  ).map((flow) => ({
    ...flow,
    client_tasks: [...flow.client_tasks].sort((a, b) => a.position - b.position),
  }));
  const looseTasks = (looseData ?? []) as Task[];
  const formAssignments = (assignmentsData ?? []) as unknown as {
    id: string;
    form_name: string;
    status: string;
    token: string;
    fields_snapshot: FormFieldDef[];
    completed_at: string | null;
    form_answers: { count: number }[];
  }[];
  const contacts = (contactsData ?? []) as {
    id: string;
    full_name: string;
    position: string | null;
    email: string | null;
    phone: string | null;
    is_primary: boolean;
  }[];
  const clientNotes = (notesData ?? []) as unknown as {
    id: string;
    body: string;
    created_at: string;
    profiles: { full_name: string } | null;
  }[];
  const activity = (activityData ?? []) as unknown as {
    id: string;
    description: string | null;
    created_at: string;
    profiles: { full_name: string } | null;
  }[];
  const agregarNotaConCliente = agregarNota.bind(null, id);
  // Mismo orden que resolveClientEmail: contacto principal, luego ficha.
  const correoEnvio =
    contacts.find((c) => c.email)?.email ?? client.primary_email ?? null;
  const hoy = new Date().toISOString().slice(0, 10);

  const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat("es-MX", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/clientes"
              className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              aria-label="Volver a clientes"
            >
              <ArrowLeft size={17} />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
                Detalle del cliente
              </h1>
              <p className="truncate text-sm text-zinc-500">{client.display_name}</p>
            </div>
          </div>
          {escribir ? (
            <Link
              href={`/clientes/${id}/editar`}
              className="inline-flex h-9 whitespace-nowrap shrink-0 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
            >
              <Pencil size={14} />
              Editar
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-4">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : null}

          {/* Identificacion */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Identificacion
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <Field label="Nombre comercial">{client.display_name}</Field>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Razon social">{client.legal_name ?? "—"}</Field>
                <Field label="RFC">{client.tax_id ?? "—"}</Field>
              </div>
              <Field label="Estado">
                <span
                  className={`inline-flex whitespace-nowrap h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${statusClass[client.status] ?? statusClass.prospect}`}
                >
                  {statusLabel[client.status] ?? client.status}
                </span>
              </Field>
            </div>
          </div>

          {/* Contacto */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Contacto
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Correo principal">
                  {client.primary_email ? (
                    <a
                      href={`mailto:${client.primary_email}`}
                      className="text-zinc-700 underline-offset-2 hover:underline"
                    >
                      {client.primary_email}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Telefono principal">
                  {client.primary_phone ? (
                    <a
                      href={`tel:${client.primary_phone}`}
                      className="text-zinc-700 underline-offset-2 hover:underline"
                    >
                      {client.primary_phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <Field label="Sitio web">
                  {client.website ? (
                    <a
                      href={client.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-700 underline-offset-2 hover:underline"
                    >
                      {client.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </Field>
                <Field label="Direccion">{client.address_line ?? "—"}</Field>
              </div>
            </div>
          </div>

          {/* Contactos */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Contactos
              </p>
              {escribir ? (
                <Link
                  href={`/clientes/${id}/contactos/nuevo`}
                  className="inline-flex whitespace-nowrap h-8 items-center gap-1.5 rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={13} />
                  Agregar contacto
                </Link>
              ) : null}
            </div>
            {contacts.length === 0 ? (
              <div className="px-6 py-6">
                <p className="text-sm text-zinc-400">
                  Sin contactos registrados. Agrega a las personas con las que
                  tratas en esta empresa.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {contacts.map((contact) => (
                  <div
                    className="flex items-center gap-3 px-6 py-3"
                    key={contact.id}
                  >
                    <div className="grid size-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                      <UserRound size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-950">
                        {contact.full_name}
                        {contact.is_primary ? (
                          <span className="ml-2 inline-flex whitespace-nowrap h-5 items-center rounded-md bg-cyan-50 px-1.5 text-[11px] font-semibold text-cyan-800 ring-1 ring-cyan-200">
                            Principal
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {[contact.position, contact.email, contact.phone]
                          .filter(Boolean)
                          .join(" · ") || "Sin datos de contacto"}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {escribir ? (
                        <Link
                          aria-label={`Editar ${contact.full_name}`}
                          className="grid size-8 place-items-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-950"
                          href={`/clientes/${id}/contactos/${contact.id}/editar`}
                        >
                          <Pencil size={15} />
                        </Link>
                      ) : null}
                      {admin ? (
                        <DeleteContactoButton
                          clientId={id}
                          contactId={contact.id}
                          nombre={contact.full_name}
                        />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tareas */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Tareas
              </p>
              {escribir ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/clientes/${id}/asignar-flujo`}
                    className="inline-flex whitespace-nowrap h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                  >
                    <Workflow size={13} />
                    Asignar flujo
                  </Link>
                  <Link
                    href={`/tareas/nueva?client_id=${id}&from=cliente`}
                    className="inline-flex whitespace-nowrap h-8 items-center gap-1.5 rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
                  >
                    <Plus size={13} />
                    Nueva tarea
                  </Link>
                </div>
              ) : null}
            </div>

            {clientFlows.length === 0 && looseTasks.length === 0 ? (
              <div className="px-6 py-6">
                <p className="text-sm text-zinc-400">
                  Sin tareas. Asigna un flujo o crea una tarea suelta.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {clientFlows.map((flow) => {
                  const total = flow.client_tasks.length;
                  const completadas = flow.client_tasks.filter(
                    (t) => t.completed_at !== null,
                  ).length;
                  const pct = total > 0 ? Math.round((completadas / total) * 100) : 0;

                  return (
                    <div key={flow.id} className="py-3">
                      <div className="flex flex-wrap items-center gap-3 px-6 pb-2">
                        <span className="inline-flex whitespace-nowrap h-7 items-center rounded-md bg-violet-50 px-2.5 text-xs font-semibold text-violet-800 ring-1 ring-violet-200">
                          {flow.name}
                        </span>
                        <div className="flex flex-1 basis-40 items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="shrink-0 text-xs font-medium text-zinc-500">
                            {completadas} de {total}
                          </span>
                        </div>
                        {escribir ? (
                          <QuitarFlujoButton
                            clientFlowId={flow.id}
                            clientId={id}
                            nombre={flow.name}
                          />
                        ) : null}
                      </div>
                      {flow.client_tasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          clientId={id}
                          hoy={hoy}
                          editable={escribir}
                        />
                      ))}
                    </div>
                  );
                })}

                {looseTasks.length > 0 ? (
                  <div className="py-3">
                    <p className="px-6 pb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Tareas sueltas
                    </p>
                    {looseTasks.map((task) => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        clientId={id}
                        hoy={hoy}
                        deletable
                        editable={escribir}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Formularios */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Formularios
              </p>
              {escribir ? (
                <Link
                  href={`/clientes/${id}/asignar-formulario`}
                  className="inline-flex whitespace-nowrap h-8 items-center gap-1.5 rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
                >
                  <ClipboardList size={13} />
                  Asignar formulario
                </Link>
              ) : null}
            </div>

            {formAssignments.length === 0 ? (
              <div className="px-6 py-6">
                <p className="text-sm text-zinc-400">
                  Sin formularios asignados. Asigna uno para generar la liga que
                  responderá el cliente.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {formAssignments.map((assignment) => {
                  const total = answerableFields(
                    assignment.fields_snapshot ?? [],
                  ).length;
                  const answered = assignment.form_answers[0]?.count ?? 0;

                  return (
                    <div
                      className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:gap-3"
                      key={assignment.id}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-950">
                          {assignment.form_name}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {assignment.status === "completed"
                            ? "Respuestas completas"
                            : `${answered} de ${total} respondidas`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex whitespace-nowrap h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${assignmentStatusClass[assignment.status] ?? assignmentStatusClass.pending}`}
                        >
                          {assignmentStatusLabel[assignment.status] ??
                            assignment.status}
                        </span>
                        <CopyLinkButton compact token={assignment.token} />
                        {escribir && assignment.status !== "completed" ? (
                          <SendLinkButton
                            compact
                            label="Enviar liga por correo"
                            confirmMessage={
                              correoEnvio
                                ? `¿Enviar la liga del formulario "${assignment.form_name}" a ${correoEnvio}?`
                                : `El cliente no tiene correo registrado; el envío fallará. ¿Intentar de todos modos?`
                            }
                            onSend={enviarLigaFormulario.bind(
                              null,
                              assignment.id,
                              `/clientes/${id}`,
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
                            backPath={`/clientes/${id}`}
                          />
                        ) : null}
                        {escribir ? (
                          <EliminarAsignacionButton
                            assignmentId={assignment.id}
                            backPath={`/clientes/${id}`}
                            nombre={assignment.form_name}
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Portal del cliente */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Portal del cliente
              </p>
              <span
                className={`inline-flex whitespace-nowrap h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${
                  client.portal_enabled
                    ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                    : "bg-zinc-100 text-zinc-700 ring-zinc-200"
                }`}
              >
                {client.portal_enabled ? "Activo" : "Desactivado"}
              </span>
            </div>
            <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-zinc-500">
                Liga pública donde el cliente consulta sus pagos pendientes,
                documentos y formularios, sin necesidad de cuenta.
              </p>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {client.portal_enabled ? (
                  <CopyPortalLinkButton token={client.portal_token} />
                ) : null}
                {escribir && client.portal_enabled ? (
                  <SendLinkButton
                    confirmMessage={
                      correoEnvio
                        ? `¿Enviar la liga del portal a ${correoEnvio}?`
                        : `El cliente no tiene correo registrado; el envío fallará. ¿Intentar de todos modos?`
                    }
                    onSend={enviarLigaPortal.bind(null, id)}
                  />
                ) : null}
                {escribir && client.portal_enabled ? (
                  <RegenerarLigaButton clientId={id} nombre={client.display_name} />
                ) : null}
                {escribir ? (
                  <PortalToggleButton
                    clientId={id}
                    enabled={client.portal_enabled}
                    nombre={client.display_name}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Notas generales
              </p>
            </div>
            <div className="px-6 py-6">
              {client.notes ? (
                <p className="whitespace-pre-wrap text-sm text-zinc-700">{client.notes}</p>
              ) : (
                <p className="text-sm text-zinc-400">Sin notas.</p>
              )}
            </div>
          </div>

          {/* Bitacora */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Bitácora
              </p>
            </div>
            {escribir ? (
              <form
                action={agregarNotaConCliente}
                className="flex flex-col gap-3 border-b border-zinc-100 px-6 py-4 sm:flex-row sm:items-start"
              >
                <textarea
                  className="min-h-20 w-full flex-1 rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  name="body"
                  placeholder="Ej. Llamada con el cliente: pidió pausar la campaña hasta julio..."
                  required
                />
                <SubmitButton label="Agregar" pendingLabel="Guardando..." />
              </form>
            ) : null}
            {clientNotes.length === 0 ? (
              <div className="px-6 py-5">
                <p className="text-sm text-zinc-400">
                  Sin entradas. Registra llamadas, acuerdos y pendientes para
                  tener el historial completo del cliente.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {clientNotes.map((nota) => (
                  <div className="flex items-start gap-3 px-6 py-3.5" key={nota.id}>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-sm text-zinc-800">
                        {nota.body}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {nota.profiles?.full_name || "Equipo"} ·{" "}
                        {formatDateTime(nota.created_at)}
                      </p>
                    </div>
                    {admin ? (
                      <DeleteNotaButton clientId={id} noteId={nota.id} />
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actividad */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Actividad reciente
              </p>
              <Activity className="text-zinc-300" size={14} />
            </div>
            {activity.length === 0 ? (
              <div className="px-6 py-5">
                <p className="text-sm text-zinc-400">
                  Aquí verás lo que pasa con este cliente: pagos, documentos,
                  formularios y cambios de estado.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {activity.map((entry) => (
                  <div className="flex items-center gap-3 px-6 py-3" key={entry.id}>
                    <span className="size-1.5 shrink-0 rounded-full bg-zinc-300" />
                    <p className="min-w-0 flex-1 truncate text-sm text-zinc-700">
                      {entry.description ?? "Actividad registrada"}
                    </p>
                    <span className="shrink-0 text-xs text-zinc-400">
                      {entry.profiles?.full_name
                        ? `${entry.profiles.full_name} · `
                        : ""}
                      {formatDateTime(entry.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
