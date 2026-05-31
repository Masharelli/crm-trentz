import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { actualizarPago } from "../../actions";
import DeletePagoButton from "./DeletePagoButton";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

const inputClass =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

const labelClass = "block text-sm font-medium text-zinc-700";

export default async function EditarPagoPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { id } = await params;
  const { error } = await searchParams;

  const [{ data: payment }, { data: clients }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, concept, amount, currency, discount_pct, due_date, paid_at, status, reminder_days_before, notes, client_id, clients(display_name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("clients")
      .select("id, display_name, status")
      .in("status", ["prospect", "active", "paused"])
      .order("display_name", { ascending: true }),
  ]);

  if (!payment) notFound();

  const boundAction = actualizarPago.bind(null, id);
  const paidAt = payment.paid_at ? payment.paid_at.slice(0, 10) : "";

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
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
              Editar pago
            </h1>
            <p className="text-sm text-zinc-500">{payment.concept}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl space-y-4">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : null}

          {/* ── Formulario principal ─────────────────────────── */}
          <form
            action={boundAction}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
          >
            {/* Detalle */}
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Detalle del pago
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Cliente <span className="text-rose-500">*</span>
                </label>
                <select
                  className={inputClass}
                  defaultValue={payment.client_id}
                  name="client_id"
                  required
                >
                  <option value="" disabled>
                    Selecciona un cliente...
                  </option>
                  {(clients ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.display_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>
                  Concepto <span className="text-rose-500">*</span>
                </label>
                <input
                  className={inputClass}
                  defaultValue={payment.concept}
                  name="concept"
                  required
                  type="text"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    Monto <span className="text-rose-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      className="h-11 rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-950 outline-none focus:border-zinc-400"
                      defaultValue={payment.currency}
                      name="currency"
                    >
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                    </select>
                    <input
                      className={inputClass}
                      defaultValue={String(payment.amount)}
                      min="0.01"
                      name="amount"
                      required
                      step="0.01"
                      type="number"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Descuento %</label>
                  <div className="relative">
                    <input
                      className={inputClass}
                      defaultValue={String(payment.discount_pct ?? 0)}
                      max={100}
                      min={0}
                      name="discount_pct"
                      step="0.01"
                      type="number"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">0 = sin descuento.</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>Dias de aviso</label>
                <input
                  className="h-11 w-48 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  defaultValue={payment.reminder_days_before}
                  max={90}
                  min={0}
                  name="reminder_days_before"
                  type="number"
                />
                <p className="text-xs text-zinc-400">Dias antes del vencimiento.</p>
              </div>
            </div>

            {/* Fechas y estado */}
            <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Fechas y estado
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    Fecha de vencimiento{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    defaultValue={payment.due_date}
                    name="due_date"
                    required
                    type="date"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Estado</label>
                  <select
                    className={inputClass}
                    defaultValue={payment.status}
                    name="status"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="scheduled">Programado</option>
                    <option value="paid">Pagado</option>
                    <option value="overdue">Vencido</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className={labelClass}>
                  Fecha de pago{" "}
                  <span className="text-xs font-normal text-zinc-400">
                    — solo si ya fue pagado
                  </span>
                </label>
                <input
                  className="h-11 w-72 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                  defaultValue={paidAt}
                  name="paid_at"
                  type="date"
                />
              </div>
            </div>

            {/* Notas */}
            <div className="border-y border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Notas
              </p>
            </div>
            <div className="px-6 py-6">
              <textarea
                className="min-h-24 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                defaultValue={payment.notes ?? ""}
                name="notes"
                placeholder="Observaciones, numero de factura, referencia bancaria..."
              />
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <Link
                href="/pagos"
                className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancelar
              </Link>
              <button
                className="inline-flex h-10 items-center rounded-md bg-zinc-950 px-5 text-sm font-semibold text-white transition hover:bg-zinc-800"
                type="submit"
              >
                Guardar cambios
              </button>
            </div>
          </form>

          {/* ── Zona de peligro ──────────────────────────────── */}
          <div className="overflow-hidden rounded-xl border border-rose-200 bg-white shadow-sm">
            <div className="border-b border-rose-100 bg-rose-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">
                Zona de peligro
              </p>
            </div>
            <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Eliminar pago
                </p>
                <p className="mt-0.5 text-sm text-zinc-500">
                  Borra permanentemente este pago. Esta accion no se puede
                  deshacer.
                </p>
              </div>
              <DeletePagoButton id={payment.id} concepto={payment.concept} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
