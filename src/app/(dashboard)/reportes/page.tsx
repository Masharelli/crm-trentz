import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PaidRow = {
  amount: number | string;
  discount_pct: number | string | null;
  paid_at: string | null;
};

type UnpaidRow = {
  amount: number | string;
  discount_pct: number | string | null;
  due_date: string;
};

type ClientRow = {
  status: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Activos",
  prospect: "Prospectos",
  paused: "Pausados",
  closed: "Cerrados",
};

const STATUS_BAR: Record<string, string> = {
  active: "bg-emerald-500",
  prospect: "bg-cyan-500",
  paused: "bg-amber-500",
  closed: "bg-zinc-400",
};

const MONTH_ABBR = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

function net(row: { amount: number | string; discount_pct: number | string | null }) {
  const discount = Number(row.discount_pct ?? 0);
  return Number(row.amount ?? 0) * (1 - discount / 100);
}

function money(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(value);
}

function moneyCompact(value: number) {
  return new Intl.NumberFormat("es-MX", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function KpiCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
    </div>
  );
}

function MonthlyBars({
  data,
  format,
  barClass,
}: {
  data: { label: string; value: number }[];
  format: (value: number) => string;
  barClass: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex h-44 items-end gap-1.5 sm:gap-2">
      {data.map((point) => {
        const pct = (point.value / max) * 100;
        return (
          <div
            key={point.label}
            className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
          >
            <span className="text-[10px] font-medium text-zinc-400 opacity-0 transition group-hover:opacity-100">
              {point.value > 0 ? format(point.value) : ""}
            </span>
            <div className="flex w-full flex-1 items-end">
              <div
                className={`w-full rounded-t ${barClass} ${point.value === 0 ? "opacity-30" : ""}`}
                style={{ height: `${Math.max(pct, point.value > 0 ? 4 : 1.5)}%` }}
                title={format(point.value)}
              />
            </div>
            <span className="text-[10px] text-zinc-400">{point.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export default async function ReportesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now = new Date();
  const todayKey = now.toISOString().slice(0, 10);
  const yearStart = `${now.getUTCFullYear()}-01-01`;

  // Ventana de 12 meses: primer dia del mes hace 11 meses.
  const windowStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
  );
  const windowStartKey = windowStart.toISOString().slice(0, 10);

  const [paidRes, unpaidRes, clientsRes] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, discount_pct, paid_at")
      .not("paid_at", "is", null)
      .gte("paid_at", windowStartKey),
    supabase
      .from("payments")
      .select("amount, discount_pct, due_date")
      .in("status", ["pending", "scheduled", "overdue"]),
    supabase.from("clients").select("status, created_at"),
  ]);

  const paid = (paidRes.data ?? []) as PaidRow[];
  const unpaid = (unpaidRes.data ?? []) as UnpaidRow[];
  const clients = (clientsRes.data ?? []) as ClientRow[];

  // Buckets de 12 meses en orden.
  const buckets: { key: string; label: string }[] = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    buckets.push({ key: monthKey(d), label: MONTH_ABBR[d.getUTCMonth()] });
  }

  const revenueByMonth = new Map<string, number>();
  for (const row of paid) {
    if (!row.paid_at) continue;
    const key = row.paid_at.slice(0, 7);
    revenueByMonth.set(key, (revenueByMonth.get(key) ?? 0) + net(row));
  }

  const clientsByMonth = new Map<string, number>();
  for (const row of clients) {
    const key = row.created_at.slice(0, 7);
    clientsByMonth.set(key, (clientsByMonth.get(key) ?? 0) + 1);
  }

  const revenueSeries = buckets.map((b) => ({
    label: b.label,
    value: revenueByMonth.get(b.key) ?? 0,
  }));
  const newClientsSeries = buckets.map((b) => ({
    label: b.label,
    value: clientsByMonth.get(b.key) ?? 0,
  }));

  // KPIs
  const cobradoAnio = paid
    .filter((row) => (row.paid_at ?? "") >= yearStart)
    .reduce((sum, row) => sum + net(row), 0);
  const porCobrar = unpaid.reduce((sum, row) => sum + net(row), 0);
  const vencido = unpaid
    .filter((row) => row.due_date < todayKey)
    .reduce((sum, row) => sum + net(row), 0);
  const porVencer = porCobrar - vencido;
  const activos = clients.filter((c) => c.status === "active").length;

  // Distribuciones
  const statusOrder = ["active", "prospect", "paused", "closed"];
  const statusCounts = statusOrder.map((status) => ({
    status,
    label: STATUS_LABEL[status],
    count: clients.filter((c) => c.status === status).length,
  }));
  const maxStatus = Math.max(1, ...statusCounts.map((s) => s.count));
  const totalClientes = clients.length;

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
          Reportes
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Tendencias de cobranza y crecimiento de clientes
        </p>
      </header>

      <div className="flex-1 space-y-5 px-4 py-6 sm:px-6 lg:px-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Cobrado este año"
            value={money(cobradoAnio)}
            hint={`Desde el 1 de enero`}
          />
          <KpiCard label="Por cobrar" value={money(porVencer)} hint="No vencido" />
          <KpiCard label="Vencido" value={money(vencido)} hint="Requiere seguimiento" />
          <KpiCard
            label="Clientes activos"
            value={String(activos)}
            hint={`${totalClientes} en total`}
          />
        </div>

        {/* Gráficas mensuales */}
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-zinc-950">
                Ingresos cobrados
              </h2>
              <span className="text-xs text-zinc-400">Últimos 12 meses</span>
            </div>
            <MonthlyBars
              data={revenueSeries}
              format={moneyCompact}
              barClass="bg-emerald-500"
            />
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-zinc-950">
                Clientes nuevos
              </h2>
              <span className="text-xs text-zinc-400">Últimos 12 meses</span>
            </div>
            <MonthlyBars
              data={newClientsSeries}
              format={(v) => String(v)}
              barClass="bg-indigo-500"
            />
          </div>
        </div>

        {/* Distribución de clientes por estado */}
        <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-zinc-950">
            Clientes por estado
          </h2>
          {totalClientes === 0 ? (
            <p className="text-sm text-zinc-500">Sin clientes registrados.</p>
          ) : (
            <div className="space-y-3">
              {statusCounts.map((row) => (
                <div key={row.status} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-sm text-zinc-600">
                    {row.label}
                  </span>
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={`h-full rounded-full ${STATUS_BAR[row.status]}`}
                      style={{ width: `${(row.count / maxStatus) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-semibold text-zinc-950">
                    {row.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
