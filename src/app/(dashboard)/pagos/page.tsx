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
import { canWrite, getCurrentRole } from "@/lib/roles";
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

type PaymentTotalsRow = {
  status: string;
  amount: number;
  discount_pct: number;
  due_date: string;
  paid_at: string | null;
  is_month_zero: boolean;
  second_month_amount: number | null;
  second_month_due_date: string | null;
};

// Monto real a cobrar: mes cero cobra el segundo mes; el resto aplica descuento.
function netAmount(p: PaymentTotalsRow): number {
  if (p.is_month_zero || p.status === "month_zero") {
    return Number(p.second_month_amount ?? 0);
  }
  return Number(p.amount) * (1 - Number(p.discount_pct ?? 0) / 100);
}

function computeTotals(rows: PaymentTotalsRow[]) {
  const hoy = new Date().toISOString().slice(0, 10);
  const en7dias = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const mesActual = hoy.slice(0, 7);

  let porCobrar = 0;
  let vencido = 0;
  let vencidoCount = 0;
  let porVencer = 0;
  let cobradoMes = 0;

  for (const p of rows) {
    const monto = netAmount(p);
    const abierto = ["pending", "scheduled", "month_zero"].includes(p.status);
    const fechaCobro =
      p.is_month_zero || p.status === "month_zero"
        ? (p.second_month_due_date ?? p.due_date)
        : p.due_date;

    if (p.status === "paid" && p.paid_at?.slice(0, 7) === mesActual) {
      cobradoMes += monto;
    }

    if (p.status === "overdue" || (abierto && fechaCobro < hoy)) {
      vencido += monto;
      vencidoCount += 1;
      porCobrar += monto;
    } else if (abierto) {
      porCobrar += monto;
      if (fechaCobro >= hoy && fechaCobro <= en7dias) {
        porVencer += monto;
      }
    }
  }

  return { porCobrar, vencido, vencidoCount, porVencer, cobradoMes };
}

export default async function PagosPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const role = await getCurrentRole(supabase, user.id);
  const escribir = canWrite(role);

  const { q, status, page: pageParam } = await searchParams;
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

  const [{ data: payments, count }, { data: totalsData }] = await Promise.all([
    query,
    supabase
      .from("payments")
      .select(
        "status, amount, discount_pct, due_date, paid_at, is_month_zero, second_month_amount, second_month_due_date",
      )
      .neq("status", "canceled"),
  ]);

  const totals = computeTotals((totalsData ?? []) as PaymentTotalsRow[]);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
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
              className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              <Plus size={17} />
              Nuevo pago
            </Link>
          ) : null}
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Resumen de cobranza (sobre todos los pagos, sin filtros) */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
                                <span className="inline-flex h-5 items-center rounded px-1.5 text-[11px] font-semibold bg-violet-50 text-violet-700 ring-1 ring-violet-200">
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
                            className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${statusClass[payment.status] ?? statusClass.pending}`}
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
                  className="mt-2 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
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
