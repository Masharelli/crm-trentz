import { Mail, Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { canWrite, getCurrentRole } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import Pagination, { PAGE_SIZE, parsePage } from "../components/Pagination";
import CorreosFilter from "./CorreosFilter";
import DeleteCorreoButton from "./DeleteCorreoButton";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const statusLabel: Record<string, string> = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Fallido",
  skipped: "Omitido",
};

const statusClass: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  sent: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  failed: "bg-rose-50 text-rose-800 ring-rose-200",
  skipped: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

type Props = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

export default async function CorreosPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  const escribir = canWrite(role);

  const { status, page: pageParam } = await searchParams;
  const page = parsePage(pageParam);

  let query = supabase
    .from("email_notifications")
    .select(
      "id, recipient_email, subject, body, status, sent_at, created_at, clients(display_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status) {
    query = query.eq("status", status);
  }

  const { data: emails, count } = await query;
  const rows = emails ?? [];

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Correos
            </h1>
            <p className="mt-1 text-sm text-zinc-500">{count ?? 0} registros</p>
          </div>
          {escribir ? (
            <Link
              href="/correos/nuevo"
              className="inline-flex h-11 whitespace-nowrap w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-auto"
            >
              <Plus size={17} />
              Redactar correo
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Suspense>
          <CorreosFilter />
        </Suspense>

        <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {rows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Destinatario</th>
                    <th className="px-5 py-3 font-semibold">Asunto</th>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold">Fecha</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((email) => {
                    const clientData = Array.isArray(email.clients)
                      ? (email.clients[0] as { display_name: string } | undefined)
                      : (email.clients as { display_name: string } | null);
                    const clientName = clientData?.display_name ?? "—";
                    const date = email.sent_at ?? email.created_at;

                    return (
                      <tr key={email.id} className="hover:bg-zinc-50">
                        <td className="px-5 py-4 font-medium text-zinc-950">
                          {email.recipient_email}
                        </td>
                        <td className="px-5 py-4">
                          <p className="max-w-[240px] truncate text-zinc-700">
                            {email.subject}
                          </p>
                          {email.body ? (
                            <p className="mt-0.5 max-w-[240px] truncate text-xs text-zinc-400">
                              {email.body}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">{clientName}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${statusClass[email.status] ?? statusClass.pending}`}
                          >
                            {statusLabel[email.status] ?? email.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {formatDate(date)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end">
                            {escribir ? (
                              <DeleteCorreoButton id={email.id} />
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
                <Mail size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                {status ? "Sin resultados para este filtro" : "Sin correos enviados"}
              </p>
              <p className="text-sm text-zinc-500">
                {status
                  ? "Intenta con otro filtro."
                  : "Redacta el primer correo para empezar."}
              </p>
              {!status && escribir ? (
                <Link
                  href="/correos/nuevo"
                  className="mt-2 inline-flex whitespace-nowrap h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={16} />
                  Redactar correo
                </Link>
              ) : null}
            </div>
          )}
        </div>

        <Pagination
          page={page}
          total={count ?? 0}
          basePath="/correos"
          params={{ status }}
        />
      </div>
    </>
  );
}
