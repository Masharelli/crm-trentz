import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props = {
  params: Promise<{ id: string }>;
};

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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <div className="text-sm text-zinc-900">{children}</div>
    </div>
  );
}

export default async function VerPagoPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;

  const { data: payment } = await supabase
    .from("payments")
    .select(
      "id, concept, amount, currency, discount_pct, due_date, is_month_zero, paid_at, second_month_amount, second_month_due_date, status, reminder_days_before, notes, clients(display_name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (!payment) notFound();

  const client = Array.isArray(payment.clients)
    ? (payment.clients[0] as { display_name: string } | undefined)
    : (payment.clients as { display_name: string } | null);
  const isMonthZero = payment.is_month_zero || payment.status === "month_zero";

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/pagos"
              className="grid size-9 shrink-0 place-items-center rounded-md border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              aria-label="Volver a pagos"
            >
              <ArrowLeft size={17} />
            </Link>
            <div>
              <h1 className="text-xl font-semibold text-zinc-950 sm:text-2xl">
                Detalle del pago
              </h1>
              <p className="text-sm text-zinc-500">{payment.concept}</p>
            </div>
          </div>
          <Link
            href={`/pagos/${id}/editar`}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
          >
            <Pencil size={14} />
            Editar
          </Link>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-4">
          {/* Detalle */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Detalle del pago
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <Field label="Cliente">
                {client?.display_name ?? "—"}
              </Field>
              <Field label="Concepto">
                {payment.concept}
              </Field>
              <div className="grid grid-cols-2 gap-5">
                <Field label="Monto">
                  {isMonthZero ? (
                    <div className="flex flex-col gap-1">
                      <span className="font-semibold">
                        {formatMoney(0, payment.currency)}
                      </span>
                      <span className="text-sm text-zinc-500">
                        Segundo mes{" "}
                        {formatMoney(
                          payment.second_month_amount ?? 0,
                          payment.currency,
                        )}
                      </span>
                    </div>
                  ) : payment.discount_pct > 0 ? (
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-zinc-400 line-through">
                        {formatMoney(payment.amount, payment.currency)}
                      </span>
                      <div className="flex items-center gap-2">
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
                    <>
                      <span className="font-semibold">
                        {formatMoney(payment.amount, payment.currency)}
                      </span>{" "}
                      <span className="text-zinc-400">{payment.currency}</span>
                    </>
                  )}
                </Field>
                <Field label="Dias de aviso">
                  {payment.reminder_days_before != null
                    ? `${payment.reminder_days_before} dias`
                    : "—"}
                </Field>
              </div>
            </div>
          </div>

          {/* Fechas y estado */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Fechas y estado
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-2 gap-5">
                <Field label="Fecha de vencimiento">
                  {formatDate(payment.due_date)}
                </Field>
                <Field label="Estado">
                  <span
                    className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${statusClass[payment.status] ?? statusClass.pending}`}
                  >
                    {statusLabel[payment.status] ?? payment.status}
                  </span>
                </Field>
              </div>
              <Field label="Fecha de pago">
                {payment.paid_at ? formatDate(payment.paid_at) : "—"}
              </Field>
              {isMonthZero ? (
                <Field label="Inicio segundo mes">
                  {payment.second_month_due_date
                    ? formatDate(payment.second_month_due_date)
                    : "—"}
                </Field>
              ) : null}
            </div>
          </div>

          {/* Notas */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Notas
              </p>
            </div>
            <div className="px-6 py-6">
              {payment.notes ? (
                <p className="whitespace-pre-wrap text-sm text-zinc-700">{payment.notes}</p>
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
