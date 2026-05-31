import { ChevronRight, Pencil, Plus, WalletCards } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import PagosFilter from "./PagosFilter";

const statusLabel: Record<string, string> = {
  canceled: "Cancelado",
  overdue: "Vencido",
  paid: "Pagado",
  pending: "Pendiente",
  scheduled: "Programado",
};

const statusClass: Record<string, string> = {
  canceled: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  overdue: "bg-rose-50 text-rose-800 ring-rose-200",
  paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  scheduled: "bg-cyan-50 text-cyan-800 ring-cyan-200",
};

function formatMoney(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(Number(amount));
}

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

export default async function PagosPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { q, status } = await searchParams;

  let query = supabase
    .from("payments")
    .select(
      "id, concept, amount, currency, due_date, paid_at, status, clients(display_name)",
    )
    .order("due_date", { ascending: true })
    .limit(100);

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    const { data: matchingClients } = await supabase
      .from("clients")
      .select("id")
      .ilike("display_name", `%${q}%`);

    const clientIds = (matchingClients ?? []).map((c) => c.id);

    if (clientIds.length > 0) {
      query = query.or(
        `concept.ilike.%${q}%,client_id.in.(${clientIds.join(",")})`,
      );
    } else {
      query = query.ilike("concept", `%${q}%`);
    }
  }

  const { data: payments } = await query;

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Pagos
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {payments?.length ?? 0} registros
            </p>
          </div>
          <Link
            href="/pagos/nuevo"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Plus size={17} />
            Nuevo pago
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Suspense>
          <PagosFilter />
        </Suspense>

        <div className="mt-5 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {payments && payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-zinc-100 bg-zinc-50 text-xs uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Cliente</th>
                    <th className="px-5 py-3 font-semibold">Concepto</th>
                    <th className="px-5 py-3 font-semibold">Monto</th>
                    <th className="px-5 py-3 font-semibold">Vence</th>
                    <th className="px-5 py-3 font-semibold">Pagado</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    <th className="px-5 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {payments.map((payment) => {
                    const client = Array.isArray(payment.clients)
                      ? (payment.clients[0] as { display_name: string } | undefined)
                      : (payment.clients as { display_name: string } | null);
                    return (
                      <tr key={payment.id} className="hover:bg-zinc-50">
                        <td className="px-5 py-4 font-medium text-zinc-950">
                          {client?.display_name ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-zinc-700">
                          {payment.concept}
                        </td>
                        <td className="px-5 py-4 font-semibold text-zinc-950">
                          {formatMoney(payment.amount, payment.currency)}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {formatDate(payment.due_date)}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {payment.paid_at
                            ? formatDate(payment.paid_at)
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${statusClass[payment.status] ?? statusClass.pending}`}
                          >
                            {statusLabel[payment.status] ?? payment.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <Link
                              href={`/pagos/${payment.id}/editar`}
                              className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                              aria-label={`Editar pago ${payment.concept}`}
                            >
                              <Pencil size={15} />
                            </Link>
                            <Link
                              href={`/pagos/${payment.id}`}
                              className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                              aria-label={`Ver pago ${payment.concept}`}
                            >
                              <ChevronRight size={17} />
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
                <WalletCards size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                {q || status
                  ? "Sin resultados para esta busqueda"
                  : "Sin pagos registrados"}
              </p>
              <p className="text-sm text-zinc-500">
                {q || status
                  ? "Intenta con otros filtros."
                  : "Agrega el primer pago para empezar."}
              </p>
              {!q && !status ? (
                <Link
                  href="/pagos/nuevo"
                  className="mt-2 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={16} />
                  Nuevo pago
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
