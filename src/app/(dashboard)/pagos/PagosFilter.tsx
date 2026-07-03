"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

const statuses = [
  { label: "Todos", value: "" },
  { label: "Pendiente", value: "pending" },
  { label: "Programado", value: "scheduled" },
  { label: "Pagado", value: "paid" },
  { label: "Vencido", value: "overdue" },
  { label: "Cancelado", value: "canceled" },
  { label: "Mes cero", value: "month_zero" },
];

export default function PagosFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentQ = searchParams.get("q") ?? "";
  const currentStatus = searchParams.get("status") ?? "";

  function buildHref(overrides: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(overrides)) {
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
    }
    const qs = next.toString();
    return `/pagos${qs ? `?${qs}` : ""}`;
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const q = (new FormData(e.currentTarget).get("q") as string) ?? "";
    router.push(buildHref({ q }));
  }

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1">
        {statuses.map((s) => (
          <a
            href={buildHref({ status: s.value })}
            key={s.value}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              currentStatus === s.value
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-600 hover:text-zinc-950"
            }`}
          >
            {s.label}
          </a>
        ))}
      </div>

      <form
        onSubmit={handleSearch}
        className="flex h-10 w-full items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-500 xl:w-64 xl:shrink-0"
      >
        <Search size={16} />
        <input
          className="w-full bg-transparent text-zinc-900 outline-none placeholder:text-zinc-400"
          defaultValue={currentQ}
          name="q"
          placeholder="Buscar por concepto o cliente..."
          type="search"
        />
      </form>
    </div>
  );
}
