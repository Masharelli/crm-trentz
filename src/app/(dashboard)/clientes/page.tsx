import { Eye, Pencil, Plus, UsersRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ClientesFilter from "./ClientesFilter";

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function ClientesPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { q, status } = await searchParams;

  let query = supabase
    .from("clients")
    .select(
      "id, display_name, legal_name, tax_id, primary_email, primary_phone, status, updated_at",
    )
    .order("updated_at", { ascending: false })
    .limit(100);

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    query = query.or(
      `display_name.ilike.%${q}%,legal_name.ilike.%${q}%,tax_id.ilike.%${q}%`,
    );
  }

  const { data: clients } = await query;

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Clientes
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {clients?.length ?? 0} registros
            </p>
          </div>
          <Link
            href="/clientes/nuevo"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Plus size={17} />
            Nuevo cliente
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Suspense>
          <ClientesFilter />
        </Suspense>

        <div className="mt-5 rounded-lg border border-zinc-200 bg-white">
          {clients && clients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Nombre</th>
                    <th className="px-5 py-3 font-semibold">RFC</th>
                    <th className="px-5 py-3 font-semibold">Correo</th>
                    <th className="px-5 py-3 font-semibold">Telefono</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold">Actualizado</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-zinc-950">
                          {client.display_name}
                        </p>
                        {client.legal_name ? (
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {client.legal_name}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {client.tax_id ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {client.primary_email ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {client.primary_phone ?? "—"}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${statusClass[client.status] ?? statusClass.prospect}`}
                        >
                          {statusLabel[client.status] ?? client.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(client.updated_at)}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/clientes/${client.id}/editar`}
                            className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                            aria-label={`Editar ${client.display_name}`}
                          >
                            <Pencil size={15} />
                          </Link>
                          <Link
                            href={`/clientes/${client.id}`}
                            className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                            aria-label={`Ver ${client.display_name}`}
                          >
                            <Eye size={15} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-5 py-16 text-center">
              <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                <UsersRound size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                {q || status ? "Sin resultados para esta busqueda" : "Sin clientes registrados"}
              </p>
              <p className="text-sm text-zinc-500">
                {q || status
                  ? "Intenta con otros filtros."
                  : "Agrega el primer cliente para empezar."}
              </p>
              {!q && !status ? (
                <Link
                  href="/clientes/nuevo"
                  className="mt-2 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={16} />
                  Nuevo cliente
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
