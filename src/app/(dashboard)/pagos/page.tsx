import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Eye,
  Pencil,
  Plus,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { addDaysToDateKey, businessDateKey } from "@/lib/business-date";
import { canWrite, getCurrentRole } from "@/lib/roles";
import { normalizeSearchTerm } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import Pagination, { PAGE_SIZE, parsePage } from "../components/Pagination";
import PagosFilter from "./PagosFilter";

const statusLabel: Record<string, string> = {
  canceled: "Cancelado",
  month_zero: "Mes cero",
  overdue: "Vencido",
  paid: "Pagado",
  pending: "Pendiente",
  scheduled: "Programado",
};

const statusClass: Record<string, string> = {
  canceled: "bg-zinc-100 text-zinc-700 ring-zinc-200",
  month_zero: "bg-violet-50 text-violet-800 ring-violet-200",
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
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
};

type PaymentTotals = {
  cobrado_mes: number | string;
  por_cobrar: number | string;
  por_vencer: number | string;
  vencido: number | string;
  vencido_count: number | string;
};

export default async function PagosPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  const escribir = canWrite(role);

  const { q, status, page: pageParam } = await searchParams;
  const safeQuery = normalizeSearchTerm(q);
  const page = parsePage(pageParam);

  let query = supabase
    .from("payments")
    .select(
      "id, concept, amount, currency, discount_pct, due_date, is_month_zero, paid_at, second_month_amount, second_month_due_date, status, clients(display_name)",
      { count: "exact" },
    )
    .order("due_date", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (status) {
    query = query.eq("status", status);
  }

  if (safeQuery) {
    const { data: matchingClients, error: clientsError } = await supabase
      .from("clients")
      .select("id")
      .ilike("display_name", `%${safeQuery}%`);

    if (clientsError) throw new Error("No se pudo realizar la busqueda de pagos.");

    const clientIds = (matchingClients ?? []).map((c) => c.id);

    if (clientIds.length > 0) {
      query = query.or(
        `concept.ilike.%${safeQuery}%,client_id.in.(${clientIds.join(",")})`,
      );
    } else {
      query = query.ilike("concept", `%${safeQuery}%`);
    }
  }

  const today = businessDateKey();
  const [{ data: payments, count, error: paymentsError }, totalsResult] =
    await Promise.all([
      query,
      supabase.rpc("get_payment_totals", {
        p_current_month: today.slice(0, 7),
        p_in_seven_days: addDaysToDateKey(today, 7),
        p_today: today,
      }),
    ]);

  if (paymentsError || totalsResult.error || !totalsResult.data) {
    throw new Error("No se pudieron cargar los pagos.");
  }

  const totalsData = totalsResult.data as unknown as PaymentTotals;
  const totals = {
    cobradoMes: Number(totalsData.cobrado_mes ?? 0),
    porCobrar: Number(totalsData.por_cobrar ?? 0),
    porVencer: Number(totalsData.por_vencer ?? 0),
    vencido: Number(totalsData.vencido ?? 0),
    vencidoCount: Number(totalsData.vencido_count ?? 0),
  };

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Pagos
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {count ?? 0} registros
            </p>
          </div>
          {escribir ? (
            <Link
              href="/pagos/nuevo"
              className="inline-flex h-11 whitespace-nowrap w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 sm:w-auto"
            >
              <Plus size={17} />
              Nuevo pago
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Resumen de cobranza (sobre todos los pagos, sin filtros) */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Por cobrar
              </p>
              <CircleDollarSign className="text-zinc-300" size={16} />
            </div>
            <p className="mt-2 text-xl font-semibold text-zinc-950">
              {formatMoney(totals.porCobrar)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              pendientes, programados y mes cero
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Vencido
              </p>
              <AlertTriangle className="text-rose-300" size={16} />
            </div>
            <p
              className={`mt-2 text-xl font-semibold ${totals.vencido > 0 ? "text-rose-600" : "text-zinc-950"}`}
            >
              {formatMoney(totals.vencido)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              {totals.vencidoCount === 1
                ? "1 pago requiere seguimiento"
                : `${totals.vencidoCount} pagos requieren seguimiento`}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Por vencer (7 días)
              </p>
              <CalendarClock className="text-amber-300" size={16} />
            </div>
            <p className="mt-2 text-xl font-semibold text-zinc-950">
              {formatMoney(totals.porVencer)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">vence esta semana</p>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Cobrado este mes
              </p>
              <WalletCards className="text-emerald-300" size={16} />
            </div>
            <p className="mt-2 text-xl font-semibold text-emerald-700">
              {formatMoney(totals.cobradoMes)}
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">pagos marcados como pagados</p>
          </div>
        </div>

        <div className="mt-5">
          <Suspense>
            <PagosFilter />
          </Suspense>
        </div>

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
                    const isMonthZero =
                      payment.is_month_zero || payment.status === "month_zero";
                    return (
                      <tr key={payment.id} className="hover:bg-zinc-50">
                        <td className="px-5 py-4 font-medium text-zinc-950">
                          {client?.display_name ?? "—"}
                        </td>
                        <td className="px-5 py-4 text-zinc-700">
                          {payment.concept}
                        </td>
                        <td className="px-5 py-4">
                          {isMonthZero ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-semibold text-zinc-950">
                                {formatMoney(0, payment.currency)}
                              </span>
                              <span className="text-xs text-zinc-500">
                                Segundo mes{" "}
                                {formatMoney(
                                  payment.second_month_amount ?? 0,
                                  payment.currency,
                                )}
                              </span>
                            </div>
                          ) : payment.discount_pct > 0 ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs text-zinc-400 line-through">
                                {formatMoney(payment.amount, payment.currency)}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-semibold text-zinc-950">
                                  {formatMoney(
                                    payment.amount * (1 - payment.discount_pct / 100),
                                    payment.currency,
                                  )}
                                </span>
                                <span className="inline-flex whitespace-nowrap h-5 items-center rounded px-1.5 text-[11px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200">
                                  -{payment.discount_pct}%
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="font-semibold text-zinc-950">
                              {formatMoney(payment.amount, payment.currency)}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          <div className="flex flex-col gap-0.5">
                            <span>{formatDate(payment.due_date)}</span>
                            {isMonthZero && payment.second_month_due_date ? (
                              <span className="text-xs text-zinc-400">
                                Cobra {formatDate(payment.second_month_due_date)}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {payment.paid_at
                            ? formatDate(payment.paid_at)
                            : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex whitespace-nowrap h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${statusClass[payment.status] ?? statusClass.pending}`}
                          >
                            {statusLabel[payment.status] ?? payment.status}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-1">
                            {escribir ? (
                              <Link
                                href={`/pagos/${payment.id}/editar`}
                                className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                                aria-label={`Editar pago ${payment.concept}`}
                              >
                                <Pencil size={15} />
                              </Link>
                            ) : null}
                            <Link
                              href={`/pagos/${payment.id}`}
                              className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                              aria-label={`Ver pago ${payment.concept}`}
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
              {!q && !status && escribir ? (
                <Link
                  href="/pagos/nuevo"
                  className="mt-2 inline-flex whitespace-nowrap h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={16} />
                  Nuevo pago
                </Link>
              ) : null}
            </div>
          )}
        </div>

        <Pagination
          page={page}
          total={count ?? 0}
          basePath="/pagos"
          params={{ q, status }}
        />
      </div>
    </>
  );
}
