import { ArrowLeft, Pencil, Plus, Workflow } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { canWrite, getCurrentRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export default async function FlujosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  const escribir = canWrite(role);

  const { data: flows } = await supabase
    .from("task_flows")
    .select("id, name, description, updated_at, task_flow_steps(count), client_flows(count)")
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/tareas"
              className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              aria-label="Volver a tareas"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
                Flujos
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                {flows?.length ?? 0} plantillas
              </p>
            </div>
          </div>
          {escribir ? (
            <Link
              href="/tareas/flujos/nuevo"
              className="inline-flex h-11 whitespace-nowrap items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              <Plus size={17} />
              Nuevo flujo
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-zinc-200 bg-white">
          {flows && flows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Nombre</th>
                    <th className="px-5 py-3 font-semibold">Pasos</th>
                    <th className="px-5 py-3 font-semibold">Asignado a</th>
                    <th className="px-5 py-3 font-semibold">Actualizado</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {flows.map((flow) => {
                    const stepCount = flow.task_flow_steps?.[0]?.count ?? 0;
                    const assignedCount = flow.client_flows?.[0]?.count ?? 0;

                    return (
                      <tr key={flow.id} className="hover:bg-zinc-50">
                        <td className="px-5 py-4">
                          <p className="font-medium text-zinc-950">{flow.name}</p>
                          {flow.description ? (
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {flow.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex whitespace-nowrap h-7 items-center rounded-md bg-violet-50 px-2.5 text-xs font-semibold text-violet-800 ring-1 ring-violet-200">
                            {stepCount} {stepCount === 1 ? "paso" : "pasos"}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex whitespace-nowrap h-7 items-center rounded-md bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                            {assignedCount} {assignedCount === 1 ? "cliente" : "clientes"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {formatDate(flow.updated_at)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end">
                            {escribir ? (
                              <Link
                                href={`/tareas/flujos/${flow.id}/editar`}
                                className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                                aria-label={`Editar ${flow.name}`}
                              >
                                <Pencil size={15} />
                              </Link>
                            ) : null}
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
                <Workflow size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                Sin flujos creados
              </p>
              <p className="text-sm text-zinc-500">
                Un flujo es una plantilla de pasos (p. ej. Onboarding) que
                puedes asignar a tus clientes.
              </p>
              {escribir ? (
                <Link
                  href="/tareas/flujos/nuevo"
                  className="mt-2 inline-flex whitespace-nowrap h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={16} />
                  Nuevo flujo
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
