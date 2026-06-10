import { ListChecks, Plus, Workflow } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DeleteTareaButton from "./DeleteTareaButton";
import TaskToggle from "./TaskToggle";

type TaskRow = {
  id: string;
  name: string;
  due_date: string | null;
  completed_at: string | null;
  client_id: string;
  clients: { display_name: string } | null;
  client_flows: { name: string } | null;
};

const estados = [
  { label: "Pendientes", value: "" },
  { label: "Vencidas", value: "vencidas" },
  { label: "Completadas", value: "completadas" },
  { label: "Todas", value: "todas" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

type Props = {
  searchParams: Promise<{ estado?: string }>;
};

export default async function TareasPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { estado } = await searchParams;
  const hoy = new Date().toISOString().slice(0, 10);

  let query = supabase
    .from("client_tasks")
    .select(
      "id, name, due_date, completed_at, client_id, clients(display_name), client_flows(name)",
    )
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(200);

  if (!estado) {
    query = query.is("completed_at", null);
  } else if (estado === "vencidas") {
    query = query.is("completed_at", null).lt("due_date", hoy);
  } else if (estado === "completadas") {
    query = query.not("completed_at", "is", null);
  }

  const { data } = await query;
  const tasks = (data ?? []) as unknown as TaskRow[];

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Tareas
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {tasks.length} registros
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/tareas/flujos"
              className="inline-flex h-11 items-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              <Workflow size={16} />
              Flujos
            </Link>
            <Link
              href="/tareas/nueva"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              <Plus size={17} />
              Nueva tarea
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
          {estados.map((item) => (
            <a
              href={item.value ? `/tareas?estado=${item.value}` : "/tareas"}
              key={item.label}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                (estado ?? "") === item.value
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-600 hover:text-zinc-950"
              }`}
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="mt-5 rounded-lg border border-zinc-200 bg-white">
          {tasks.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="w-12 px-5 py-3" />
                    <th className="px-5 py-3 font-semibold">Tarea</th>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Flujo</th>
                    <th className="px-5 py-3 font-semibold">Vence</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {tasks.map((task) => {
                    const completada = task.completed_at !== null;
                    const vencida =
                      !completada &&
                      task.due_date !== null &&
                      task.due_date < hoy;

                    return (
                      <tr key={task.id} className="hover:bg-zinc-50">
                        <td className="px-5 py-4">
                          <TaskToggle
                            taskId={task.id}
                            clientId={task.client_id}
                            completed={completada}
                          />
                        </td>
                        <td className="px-5 py-4">
                          <p
                            className={`font-medium ${completada ? "text-zinc-400 line-through" : "text-zinc-950"}`}
                          >
                            {task.name}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <Link
                            href={`/clientes/${task.client_id}`}
                            className="text-zinc-600 underline-offset-2 hover:text-zinc-950 hover:underline"
                          >
                            {task.clients?.display_name ?? "—"}
                          </Link>
                        </td>
                        <td className="px-5 py-4">
                          {task.client_flows ? (
                            <span className="inline-flex h-7 items-center rounded-md bg-violet-50 px-2.5 text-xs font-semibold text-violet-800 ring-1 ring-violet-200">
                              {task.client_flows.name}
                            </span>
                          ) : (
                            <span className="inline-flex h-7 items-center rounded-md bg-zinc-100 px-2.5 text-xs font-semibold text-zinc-600 ring-1 ring-zinc-200">
                              Suelta
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {task.due_date ? (
                            <span
                              className={
                                vencida
                                  ? "inline-flex h-7 items-center rounded-md bg-rose-50 px-2.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200"
                                  : "text-zinc-600"
                              }
                            >
                              {formatDate(task.due_date)}
                              {vencida ? " · vencida" : ""}
                            </span>
                          ) : (
                            <span className="text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end">
                            <DeleteTareaButton
                              taskId={task.id}
                              clientId={task.client_id}
                              nombre={task.name}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                <ListChecks size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                {estado === "completadas"
                  ? "Sin tareas completadas"
                  : estado === "vencidas"
                    ? "Sin tareas vencidas"
                    : "Sin tareas pendientes"}
              </p>
              <p className="text-sm text-zinc-500">
                Crea una tarea suelta o asigna un flujo a un cliente desde su
                ficha.
              </p>
              <Link
                href="/tareas/nueva"
                className="mt-2 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
              >
                <Plus size={16} />
                Nueva tarea
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
