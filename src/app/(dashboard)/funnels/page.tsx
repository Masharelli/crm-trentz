import { Eye, Funnel, Pencil, Plus } from "lucide-react";
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

export default async function FunnelsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  const escribir = canWrite(role);

  const { data: funnels } = await supabase
    .from("funnels")
    .select("id, name, description, updated_at, funnel_stages(count), funnel_clients(count)")
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Funnels
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {funnels?.length ?? 0} registros
            </p>
          </div>
          {escribir ? (
            <Link
              href="/funnels/nuevo"
              className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              <Plus size={17} />
              Nuevo funnel
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-zinc-200 bg-white">
          {funnels && funnels.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Nombre</th>
                    <th className="px-5 py-3 font-semibold">Etapas</th>
                    <th className="px-5 py-3 font-semibold">Clientes</th>
                    <th className="px-5 py-3 font-semibold">Actualizado</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {funnels.map((funnel) => {
                    const stageCount = funnel.funnel_stages?.[0]?.count ?? 0;
                    const clientCount = funnel.funnel_clients?.[0]?.count ?? 0;

                    return (
                      <tr key={funnel.id} className="hover:bg-zinc-50">
                        <td className="px-5 py-4">
                          <Link
                            href={`/funnels/${funnel.id}`}
                            className="font-medium text-zinc-950 hover:underline"
                          >
                            {funnel.name}
                          </Link>
                          {funnel.description ? (
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {funnel.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          <span className="inline-flex h-7 items-center rounded-md bg-violet-50 px-2.5 text-xs font-semibold text-violet-800 ring-1 ring-violet-200">
                            {stageCount} {stageCount === 1 ? "etapa" : "etapas"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          <span className="inline-flex h-7 items-center rounded-md bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
                            {clientCount} {clientCount === 1 ? "cliente" : "clientes"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {formatDate(funnel.updated_at)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {escribir ? (
                              <Link
                                href={`/funnels/${funnel.id}/editar`}
                                className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                                aria-label={`Editar ${funnel.name}`}
                              >
                                <Pencil size={15} />
                              </Link>
                            ) : null}
                            <Link
                              href={`/funnels/${funnel.id}`}
                              className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                              aria-label={`Ver ${funnel.name}`}
                            >
                              <Eye size={15} />
                            </Link>
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
                <Funnel size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                Sin funnels creados
              </p>
              <p className="text-sm text-zinc-500">
                Crea tu primer funnel con sus etapas para organizar a tus
                clientes.
              </p>
              {escribir ? (
                <Link
                  href="/funnels/nuevo"
                  className="mt-2 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={16} />
                  Nuevo funnel
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
