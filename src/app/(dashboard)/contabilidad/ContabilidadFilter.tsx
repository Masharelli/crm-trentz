"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { currencies, expenseCategories } from "./constants";

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function formatMonthLabel(value: string) {
  const label = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value}-01T00:00:00.000Z`));

  return label.charAt(0).toUpperCase() + label.slice(1);
}

function getMonthOptions(selected: string) {
  const now = new Date();
  const options: string[] = [];

  for (let i = 0; i < 24; i++) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    options.push(date.toISOString().slice(0, 7));
  }

  if (/^\d{4}-\d{2}$/.test(selected) && !options.includes(selected)) {
    options.push(selected);
    options.sort().reverse();
  }

  return options;
}

export default function ContabilidadFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentCategory = searchParams.get("category") ?? "";
  const currentCurrency = searchParams.get("currency") ?? "MXN";
  const currentQ = searchParams.get("q") ?? "";
  const currentMonthValue = searchParams.get("month") ?? currentMonth();
  const monthOptions = getMonthOptions(currentMonthValue);

  function handleMonthChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", e.target.value);
    router.push(`/contabilidad?${params.toString()}`);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams(searchParams.toString());

    for (const key of ["category", "currency", "month", "q"]) {
      const value = String(formData.get(key) ?? "").trim();
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    }

    router.push(`/contabilidad?${params.toString()}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 md:grid-cols-2 md:items-end xl:grid-cols-[180px_120px_180px_minmax(220px,1fr)_auto]"
    >
      <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
        Mes
        <select
          className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
          name="month"
          onChange={handleMonthChange}
          value={currentMonthValue}
        >
          {monthOptions.map((month) => (
            <option key={month} value={month}>
              {formatMonthLabel(month)}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
        Moneda
        <select
          className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
          defaultValue={currentCurrency}
          name="currency"
        >
          {currencies.map((currency) => (
            <option key={currency} value={currency}>
              {currency}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
        Categoria
        <select
          className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
          defaultValue={currentCategory}
          name="category"
        >
          <option value="">Todas</option>
          {expenseCategories.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
        Buscar gasto
        <input
          className="h-10 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-950 outline-none placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100"
          defaultValue={currentQ}
          name="q"
          placeholder="Descripcion o proveedor..."
          type="search"
        />
      </label>

      <button
        className="inline-flex h-10 whitespace-nowrap w-full items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-800 md:w-auto md:justify-self-start xl:justify-self-auto"
        type="submit"
      >
        <Search size={16} />
        Filtrar
      </button>
    </form>
  );
}
