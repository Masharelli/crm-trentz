import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitButton from "../../components/SubmitButton";
import { crearPago } from "../actions";

type Props = {
  searchParams: Promise<{ error?: string; client_id?: string }>;
};

const inputClass =
  "h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100";

const labelClass = "block text-sm font-medium text-zinc-700";

const sectionHeader = (
  title: string,
  border: "top" | "both" = "both",
) => (
  <div
    className={`bg-zinc-50 px-6 py-3 ${
      border === "both"
        ? "border-y border-zinc-100"
        : "border-b border-zinc-100"
    }`}
  >
    <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
      {title}
    </p>
  </div>
);

export default async function NuevoPagoPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error, client_id } = await searchParams;

  const { data: clients } = await supabase
    .from("clients")
    .select("id, display_name, status")
    .in("status", ["prospect", "active", "paused"])
    .order("display_name", { ascending: true });

  const today = new Date().toISOString().slice(0, 10);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthDate = nextMonth.toISOString().slice(0, 10);

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
              Nuevo pago
            </h1>
            <p className="text-sm text-zinc-500">
              El cliente, concepto, monto y fecha de vencimiento son
              obligatorios.
            </p>
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

          <form
            action={crearPago}
            className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
          >
            {/* ── Detalle ────────────────────────────────────── */}
            {sectionHeader("Detalle del pago", "top")}
            <div className="space-y-5 px-6 py-6">
              <div className="space-y-1.5">
                <label className={labelClass}>
                  Cliente <span className="text-rose-500">*</span>
                </label>
                <select
                  className={inputClass}
                  defaultValue={client_id ?? ""}
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
                  name="concept"
                  placeholder="Ej. Factura mensual enero 2026"
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
                      defaultValue="MXN"
                      name="currency"
                    >
                      <option value="MXN">MXN</option>
                      <option value="USD">USD</option>
                    </select>
                    <input
                      className={inputClass}
                      min="0"
                      name="amount"
                      placeholder="0.00"
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
                      defaultValue={0}
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
                  defaultValue={3}
                  max={90}
                  min={0}
                  name="reminder_days_before"
                  type="number"
                />
                <p className="text-xs text-zinc-400">Dias antes del vencimiento.</p>
              </div>
            </div>

            {/* ── Fechas y estado ────────────────────────────── */}
            {sectionHeader("Fechas y estado")}
            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>
                    Fecha de vencimiento{" "}
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className={inputClass}
                    defaultValue={today}
                    name="due_date"
                    required
                    type="date"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Estado</label>
                  <select
                    className={inputClass}
                    defaultValue="pending"
                    name="status"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="scheduled">Programado</option>
                    <option value="paid">Pagado</option>
                    <option value="overdue">Vencido</option>
                    <option value="canceled">Cancelado</option>
                    <option value="month_zero">Mes cero</option>
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
                  name="paid_at"
                  type="date"
                />
              </div>
            </div>

            {/* ── Mes cero ─────────────────────────────────── */}
            {sectionHeader("Mes cero")}
            <div className="space-y-5 px-6 py-6">
              <label className="flex items-center gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm font-medium text-zinc-700">
                <input
                  className="size-4 rounded border-zinc-300"
                  name="is_month_zero"
                  type="checkbox"
                  value="true"
                />
                Primer mes sin cobro
              </label>

              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className={labelClass}>Monto segundo mes</label>
                  <input
                    className={inputClass}
                    min="0.01"
                    name="second_month_amount"
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className={labelClass}>Inicio segundo mes</label>
                  <input
                    className={inputClass}
                    defaultValue={nextMonthDate}
                    name="second_month_due_date"
                    type="date"
                  />
                </div>
              </div>
            </div>

            {/* ── Notas ──────────────────────────────────────── */}
            {sectionHeader("Notas")}
            <div className="px-6 py-6">
              <textarea
                className="min-h-24 w-full rounded-md border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
                name="notes"
                placeholder="Observaciones, numero de factura, referencia bancaria..."
              />
            </div>

            {/* ── Acciones ───────────────────────────────────── */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 bg-zinc-50 px-6 py-4">
              <Link
                href="/pagos"
                className="inline-flex h-10 items-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                Cancelar
              </Link>
              <SubmitButton label="Guardar pago" pendingLabel="Guardando..." />
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
