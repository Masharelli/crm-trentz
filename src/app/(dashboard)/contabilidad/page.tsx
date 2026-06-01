import {
  Calculator,
  Pencil,
  Plus,
  Receipt,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import ContabilidadFilter from "./ContabilidadFilter";
import {
  categoryClass,
  categoryLabel,
  expenseCategories,
  type ExpenseCategory,
} from "./constants";

type Props = {
  searchParams: Promise<{
    category?: string;
    currency?: string;
    month?: string;
    q?: string;
  }>;
};

type OfficeExpense = {
  amount: number | string;
  category: ExpenseCategory;
  currency: string;
  description: string;
  expense_date: string;
  id: string;
  payment_method: string | null;
  recurring: boolean;
  vendor: string | null;
};

type PaidPayment = {
  amount: number | string;
  clients?:
    | { display_name?: string | null }
    | { display_name?: string | null }[]
    | null;
  concept: string;
  currency: string | null;
  discount_pct?: number | string | null;
  id: string;
  paid_at: string | null;
};

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function normalizeMonth(value?: string) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : currentMonth();
}

function getMonthBounds(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const next = new Date(Date.UTC(year, monthNumber, 1));

  return {
    nextDate: next.toISOString().slice(0, 10),
    nextDateTime: next.toISOString(),
    startDate: start.toISOString().slice(0, 10),
    startDateTime: start.toISOString(),
  };
}

function formatMoney(amount: number | string, currency = "MXN") {
  return new Intl.NumberFormat("es-MX", {
    currency,
    maximumFractionDigits: 2,
    style: "currency",
  }).format(Number(amount));
}

function formatPercent(value: number | null) {
  if (value === null) return "--";

  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(value / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

function formatMonth(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00.000Z`));
}

function getPaymentAmount(payment: PaidPayment) {
  const discount = Number(payment.discount_pct ?? 0);
  return Number(payment.amount ?? 0) * (1 - discount / 100);
}

function getPaymentClient(payment: PaidPayment) {
  const clients = payment.clients;
  if (Array.isArray(clients)) return clients[0]?.display_name ?? "Sin cliente";
  return clients?.display_name ?? "Sin cliente";
}

export default async function ContabilidadPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const params = await searchParams;
  const month = normalizeMonth(params.month);
  const currency = (params.currency ?? "MXN").toUpperCase();
  const category = expenseCategories.some(
    (item) => item.value === params.category,
  )
    ? (params.category as ExpenseCategory)
    : undefined;
  const q = params.q?.trim();
  const bounds = getMonthBounds(month);

  let summaryExpensesQuery = supabase
    .from("office_expenses")
    .select("amount, category, currency")
    .eq("currency", currency)
    .gte("expense_date", bounds.startDate)
    .lt("expense_date", bounds.nextDate);

  let expensesQuery = supabase
    .from("office_expenses")
    .select(
      "id, description, category, amount, currency, expense_date, vendor, payment_method, recurring",
    )
    .eq("currency", currency)
    .gte("expense_date", bounds.startDate)
    .lt("expense_date", bounds.nextDate)
    .order("expense_date", { ascending: false })
    .limit(100);

  if (category) {
    summaryExpensesQuery = summaryExpensesQuery.eq("category", category);
    expensesQuery = expensesQuery.eq("category", category);
  }

  if (q) {
    const cleanQ = q.replaceAll(",", " ");
    expensesQuery = expensesQuery.or(
      `description.ilike.%${cleanQ}%,vendor.ilike.%${cleanQ}%`,
    );
  }

  const [summaryExpensesResult, expensesResult, paidPaymentsResult] =
    await Promise.all([
      summaryExpensesQuery,
      expensesQuery,
      supabase
        .from("payments")
        .select(
          "id, concept, amount, currency, discount_pct, paid_at, clients(display_name)",
        )
        .eq("status", "paid")
        .eq("currency", currency)
        .gte("paid_at", bounds.startDateTime)
        .lt("paid_at", bounds.nextDateTime)
        .order("paid_at", { ascending: false }),
    ]);

  const summaryExpenses =
    (summaryExpensesResult.data ?? []) as Pick<
      OfficeExpense,
      "amount" | "category" | "currency"
    >[];
  const expenses = (expensesResult.data ?? []) as OfficeExpense[];
  const paidPayments = (paidPaymentsResult.data ?? []) as PaidPayment[];

  const incomeTotal = paidPayments.reduce(
    (sum, payment) => sum + getPaymentAmount(payment),
    0,
  );
  const expenseTotal = summaryExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount ?? 0),
    0,
  );
  const balance = incomeTotal - expenseTotal;
  const recoveryPct =
    expenseTotal > 0 ? (incomeTotal / expenseTotal) * 100 : null;
  const progressWidth = `${Math.min(recoveryPct ?? 0, 100)}%`;

  const categoryTotals = summaryExpenses.reduce(
    (acc, expense) => {
      acc[expense.category] =
        (acc[expense.category] ?? 0) + Number(expense.amount);
      return acc;
    },
    {} as Partial<Record<ExpenseCategory, number>>,
  );
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5) as [ExpenseCategory, number][];

  const metrics = [
    {
      detail: `${paidPayments.length} pagos cobrados`,
      icon: WalletCards,
      label: "Ingresos cobrados",
      tone: "text-emerald-700",
      value: formatMoney(incomeTotal, currency),
    },
    {
      detail: `${summaryExpenses.length} gastos registrados`,
      icon: Receipt,
      label: "Gastos de oficina",
      tone: "text-rose-700",
      value: formatMoney(expenseTotal, currency),
    },
    {
      detail: balance >= 0 ? "Despues de gastos" : "Por recuperar",
      icon: Calculator,
      label: "Balance neto",
      tone: balance >= 0 ? "text-emerald-700" : "text-rose-700",
      value: formatMoney(balance, currency),
    },
    {
      detail: expenseTotal > 0 ? "Ingresos sobre gastos" : "Sin gastos del periodo",
      icon: TrendingUp,
      label: "Recuperado",
      tone: "text-cyan-700",
      value: formatPercent(recoveryPct),
    },
  ];

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Contabilidad
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              {formatMonth(month)} · {currency}
            </p>
          </div>
          <Link
            href="/contabilidad/nuevo"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            <Plus size={17} />
            Nuevo gasto
          </Link>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Suspense>
          <ContabilidadFilter />
        </Suspense>

        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <article
                className="rounded-lg border border-zinc-200 bg-white p-5"
                key={metric.label}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-500">
                      {metric.label}
                    </p>
                    <p className="mt-3 text-2xl font-semibold tracking-normal text-zinc-950">
                      {metric.value}
                    </p>
                  </div>
                  <div
                    className={`grid size-10 place-items-center rounded-md bg-zinc-100 ${metric.tone}`}
                  >
                    <Icon size={19} />
                  </div>
                </div>
                <p className={`mt-4 text-sm font-medium ${metric.tone}`}>
                  {metric.detail}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          <div className="rounded-lg border border-zinc-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-zinc-200 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Gastos registrados</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {expenses.length} movimientos encontrados.
                </p>
              </div>
              <div className="min-w-48">
                <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: progressWidth }}
                  />
                </div>
                <p className="mt-2 text-xs font-medium text-zinc-500">
                  Recuperacion: {formatPercent(recoveryPct)}
                </p>
              </div>
            </div>

            {expenses.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[820px] text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Fecha</th>
                      <th className="px-5 py-3 font-semibold">Gasto</th>
                      <th className="px-5 py-3 font-semibold">Categoria</th>
                      <th className="px-5 py-3 font-semibold">Proveedor</th>
                      <th className="px-5 py-3 font-semibold">Monto</th>
                      <th className="px-5 py-3 font-semibold">Tipo</th>
                      <th className="px-5 py-3 font-semibold" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {expenses.map((expense) => (
                      <tr className="hover:bg-zinc-50" key={expense.id}>
                        <td className="px-5 py-4 text-zinc-600">
                          {formatDate(expense.expense_date)}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-zinc-950">
                            {expense.description}
                          </p>
                          {expense.payment_method ? (
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {expense.payment_method}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${categoryClass[expense.category]}`}
                          >
                            {categoryLabel[expense.category]}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {expense.vendor ?? "--"}
                        </td>
                        <td className="px-5 py-4 font-semibold text-zinc-950">
                          {formatMoney(expense.amount, expense.currency)}
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          {expense.recurring ? "Recurrente" : "Unico"}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end">
                            <Link
                              href={`/contabilidad/${expense.id}/editar`}
                              className="grid size-8 place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                              aria-label={`Editar gasto ${expense.description}`}
                            >
                              <Pencil size={15} />
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
                  <Receipt size={22} />
                </div>
                <p className="text-sm font-medium text-zinc-700">
                  Sin gastos registrados
                </p>
                <p className="text-sm text-zinc-500">
                  Agrega gastos de renta, servicios, nomina o software.
                </p>
                <Link
                  href="/contabilidad/nuevo"
                  className="mt-2 inline-flex h-10 items-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800"
                >
                  <Plus size={16} />
                  Nuevo gasto
                </Link>
              </div>
            )}
          </div>

          <div className="grid gap-6">
            <section className="rounded-lg border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold">Gasto por categoria</h2>
              <div className="mt-5 grid gap-3">
                {topCategories.length > 0 ? (
                  topCategories.map(([categoryName, total]) => {
                    const pct = expenseTotal > 0 ? (total / expenseTotal) * 100 : 0;

                    return (
                      <div key={categoryName}>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-zinc-700">
                            {categoryLabel[categoryName]}
                          </span>
                          <span className="font-semibold text-zinc-950">
                            {formatMoney(total, currency)}
                          </span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className="h-full rounded-full bg-zinc-950"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
                    Todavia no hay gastos para este periodo.
                  </p>
                )}
              </div>
            </section>

            <section className="rounded-lg border border-zinc-200 bg-white p-5">
              <h2 className="text-lg font-semibold">Pagos cobrados</h2>
              <div className="mt-5 grid gap-3">
                {paidPayments.slice(0, 5).map((payment) => (
                  <div
                    className="rounded-md border border-zinc-200 p-4"
                    key={payment.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-950">
                          {getPaymentClient(payment)}
                        </p>
                        <p className="mt-1 truncate text-sm text-zinc-500">
                          {payment.concept}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-emerald-700">
                        {formatMoney(getPaymentAmount(payment), currency)}
                      </p>
                    </div>
                    <p className="mt-3 text-xs text-zinc-500">
                      Cobrado el {payment.paid_at ? formatDate(payment.paid_at) : "--"}
                    </p>
                  </div>
                ))}

                {paidPayments.length === 0 ? (
                  <p className="rounded-md border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">
                    Todavia no hay pagos cobrados en este mes.
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </section>
      </div>
    </>
  );
}
