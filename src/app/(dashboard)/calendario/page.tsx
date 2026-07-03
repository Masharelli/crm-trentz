import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type CalEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  kind: "task" | "payment";
  title: string;
  href: string;
  tone: string; // clases del chip
  done?: boolean;
};

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const PAYMENT_TONE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  scheduled: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  overdue: "bg-red-50 text-red-800 ring-red-200",
  paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
};

function dateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number) {
  return new Date(d.getTime() + days * 86400000);
}

function parseMonth(value?: string): { year: number; month: number } {
  const now = new Date();
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [y, m] = value.split("-").map(Number);
    if (m >= 1 && m <= 12) return { year: y, month: m };
  }
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 };
}

function monthParam(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

type Props = {
  searchParams: Promise<{ mes?: string }>;
};

export default async function CalendarioPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { mes } = await searchParams;
  const { year, month } = parseMonth(mes);

  // Rejilla: empieza en lunes de la semana del dia 1 y cubre semanas completas.
  const firstOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const leadingOffset = (firstOfMonth.getUTCDay() + 6) % 7; // 0 = lunes
  const gridStart = addDays(firstOfMonth, -leadingOffset);
  const weeks = Math.ceil((leadingOffset + daysInMonth) / 7);
  const totalCells = weeks * 7;
  const gridEnd = addDays(gridStart, totalCells - 1);

  const startKey = dateKey(gridStart);
  const endKey = dateKey(gridEnd);
  const todayKey = dateKey(new Date());

  const [tasksRes, paymentsRes] = await Promise.all([
    supabase
      .from("client_tasks")
      .select("id, name, due_date, client_id, completed_at")
      .not("due_date", "is", null)
      .gte("due_date", startKey)
      .lte("due_date", endKey),
    supabase
      .from("payments")
      .select("id, concept, due_date, status")
      .neq("status", "canceled")
      .gte("due_date", startKey)
      .lte("due_date", endKey),
  ]);

  const byDate = new Map<string, CalEvent[]>();
  const push = (event: CalEvent) => {
    const list = byDate.get(event.date) ?? [];
    list.push(event);
    byDate.set(event.date, list);
  };

  for (const task of tasksRes.data ?? []) {
    const done = task.completed_at != null;
    push({
      id: `task-${task.id}`,
      date: String(task.due_date),
      kind: "task",
      title: task.name,
      href: `/clientes/${task.client_id}`,
      tone: done
        ? "bg-zinc-100 text-zinc-400 ring-zinc-200 line-through"
        : "bg-indigo-50 text-indigo-800 ring-indigo-200",
      done,
    });
  }

  for (const payment of paymentsRes.data ?? []) {
    const status = String(payment.status);
    push({
      id: `payment-${payment.id}`,
      date: String(payment.due_date),
      kind: "payment",
      title: payment.concept,
      href: `/pagos/${payment.id}`,
      tone: PAYMENT_TONE[status] ?? "bg-zinc-100 text-zinc-700 ring-zinc-200",
    });
  }

  const cells = Array.from({ length: totalCells }, (_, i) => {
    const date = addDays(gridStart, i);
    const key = dateKey(date);
    return {
      key,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month - 1,
      isToday: key === todayKey,
      events: byDate.get(key) ?? [],
    };
  });

  // Agenda (mobile): solo dias del mes con eventos, ordenados.
  const agenda = cells
    .filter((cell) => cell.inMonth && cell.events.length > 0)
    .sort((a, b) => a.key.localeCompare(b.key));

  const monthLabel = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(firstOfMonth);

  const prevMonth = month === 1 ? monthParam(year - 1, 12) : monthParam(year, month - 1);
  const nextMonth = month === 12 ? monthParam(year + 1, 1) : monthParam(year, month + 1);

  const totalEvents = (tasksRes.data?.length ?? 0) + (paymentsRes.data?.length ?? 0);

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Calendario
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {totalEvents} evento{totalEvents === 1 ? "" : "s"} este periodo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/calendario?mes=${prevMonth}`}
              className="grid size-10 place-items-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} />
            </Link>
            <span className="min-w-36 text-center text-sm font-semibold capitalize text-zinc-950">
              {monthLabel}
            </span>
            <Link
              href={`/calendario?mes=${nextMonth}`}
              className="grid size-10 place-items-center rounded-md border border-zinc-200 text-zinc-600 transition hover:bg-zinc-100"
              aria-label="Mes siguiente"
            >
              <ChevronRight size={18} />
            </Link>
            <Link
              href="/calendario"
              className="inline-flex h-10 whitespace-nowrap items-center rounded-md border border-zinc-200 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
            >
              Hoy
            </Link>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-zinc-500">
          <span className="inline-flex whitespace-nowrap items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-indigo-400" /> Tareas
          </span>
          <span className="inline-flex whitespace-nowrap items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-amber-400" /> Pagos
          </span>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Vista mensual (desktop) */}
        <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:block">
          <div className="grid grid-cols-7 border-b border-zinc-100 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2 py-2 text-center">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {cells.map((cell) => (
              <div
                key={cell.key}
                className={`min-h-28 border-b border-r border-zinc-100 p-1.5 ${
                  cell.inMonth ? "bg-white" : "bg-zinc-50/60"
                }`}
              >
                <div className="mb-1 flex justify-end">
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${
                      cell.isToday
                        ? "bg-zinc-950 text-white"
                        : cell.inMonth
                          ? "text-zinc-700"
                          : "text-zinc-400"
                    }`}
                  >
                    {cell.day}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  {cell.events.slice(0, 3).map((event) => (
                    <Link
                      key={event.id}
                      href={event.href}
                      title={event.title}
                      className={`truncate rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset transition hover:opacity-80 ${event.tone}`}
                    >
                      {event.title}
                    </Link>
                  ))}
                  {cell.events.length > 3 && (
                    <span className="px-1.5 text-xs text-zinc-400">
                      +{cell.events.length - 3} más
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Agenda (mobile) */}
        <div className="space-y-4 md:hidden">
          {agenda.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-zinc-200 bg-white px-5 py-16 text-center shadow-sm">
              <div className="grid size-12 place-items-center rounded-full bg-zinc-100 text-zinc-400">
                <CalendarDays size={22} />
              </div>
              <p className="text-sm font-medium text-zinc-700">Sin eventos</p>
              <p className="text-sm text-zinc-500">
                No hay tareas ni pagos programados en {monthLabel}.
              </p>
            </div>
          ) : (
            agenda.map((cell) => {
              const label = new Intl.DateTimeFormat("es-MX", {
                weekday: "long",
                day: "numeric",
                month: "long",
                timeZone: "UTC",
              }).format(new Date(`${cell.key}T00:00:00.000Z`));
              return (
                <div
                  key={cell.key}
                  className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-2.5">
                    <span className="text-sm font-semibold capitalize text-zinc-950">
                      {label}
                    </span>
                    {cell.isToday && (
                      <span className="rounded-full bg-zinc-950 px-2 py-0.5 text-xs font-semibold text-white">
                        Hoy
                      </span>
                    )}
                  </div>
                  <ul className="divide-y divide-zinc-100">
                    {cell.events.map((event) => (
                      <li key={event.id}>
                        <Link
                          href={event.href}
                          className="flex items-center gap-2 px-4 py-3 transition hover:bg-zinc-50"
                        >
                          <span
                            className={`inline-flex whitespace-nowrap shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${event.tone}`}
                          >
                            {event.kind === "task" ? "Tarea" : "Pago"}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
                            {event.title}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
