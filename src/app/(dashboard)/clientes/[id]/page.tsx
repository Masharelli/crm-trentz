import { ArrowLeft, Pencil, Plus, Workflow } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteTareaButton from "../../tareas/DeleteTareaButton";
import QuitarFlujoButton from "../../tareas/QuitarFlujoButton";
import TaskToggle from "../../tareas/TaskToggle";

type Props = {
  params: Promise<{ id: string }>;
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
}: {
  task: Task;
  clientId: string;
  hoy: string;
  deletable?: boolean;
}) {
  const completada = task.completed_at !== null;
  const vencida = !completada && task.due_date !== null && task.due_date < hoy;

  return (
    <div className="flex items-center gap-3 px-6 py-2.5">
      <TaskToggle taskId={task.id} clientId={clientId} completed={completada} />
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
      {deletable ? (
        <DeleteTareaButton taskId={task.id} clientId={clientId} nombre={task.name} />
      ) : null}
    </div>
  );
}

export default async function VerClientePage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;

  const { data: client } = await supabase
    .from("clients")
    .select(
      "id, display_name, legal_name, tax_id, status, primary_email, primary_phone, website, address_line, notes",
    )
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const [{ data: flowsData }, { data: looseData }] = await Promise.all([
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
  ]);

  const clientFlows = (
    (flowsData ?? []) as unknown as { id: string; name: string; client_tasks: Task[] }[]
  ).map((flow) => ({
    ...flow,
    client_tasks: [...flow.client_tasks].sort((a, b) => a.position - b.position),
  }));
  const looseTasks = (looseData ?? []) as Task[];
  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/clientes"
              className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              aria-label="Volver a clientes"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
                Detalle del cliente
              </h1>
              <p className="text-sm text-zinc-500">{client.display_name}</p>
            </div>
          </div>
          <Link
            href={`/clientes/${id}/editar`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <Pencil size={14} />
            Editar
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Identificacion */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Identificacion
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <Field label="Nombre comercial">{client.display_name}</Field>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Razon social">{client.legal_name ?? "—"}</Field>
                <Field label="RFC">{client.tax_id ?? "—"}</Field>
              </div>
              <Field label="Estado">
                <span
                  className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${statusClass[client.status] ?? statusClass.prospect}`}
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
              <div className="grid grid-cols-2 gap-5">
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
              <div className="grid grid-cols-2 gap-5">
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

          {/* Tareas */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Tareas
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={`/clientes/${id}/asignar-flujo`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100"
                >
                  <Workflow size={13} />
                  Asignar flujo
                </Link>
                <Link
                  href={`/tareas/nueva?client_id=${id}&from=cliente`}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md bg-zinc-950 px-3 text-xs font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={13} />
                  Nueva tarea
                </Link>
              </div>
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
                      <div className="flex items-center gap-3 px-6 pb-2">
                        <span className="inline-flex h-7 items-center rounded-md bg-violet-50 px-2.5 text-xs font-semibold text-violet-800 ring-1 ring-violet-200">
                          {flow.name}
                        </span>
                        <div className="flex flex-1 items-center gap-3">
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
                        <QuitarFlujoButton
                          clientFlowId={flow.id}
                          clientId={id}
                          nombre={flow.name}
                        />
                      </div>
                      {flow.client_tasks.map((task) => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          clientId={id}
                          hoy={hoy}
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
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Notas
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
        </div>
      </div>
    </>
  );
}
