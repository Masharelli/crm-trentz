"use client";

import { useSearchParams } from "next/navigation";

const tipos = [
  { label: "Todos", value: "" },
  { label: "Contrato", value: "contract" },
  { label: "Identificacion", value: "identification" },
  { label: "Fiscal", value: "tax" },
  { label: "Recibo de pago", value: "payment_receipt" },
  { label: "Legal", value: "legal" },
  { label: "Otro", value: "other" },
];

export default function DocumentosFilter() {
  const searchParams = useSearchParams();
  const currentType = searchParams.get("type") ?? "";

  function buildHref(type: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (type) {
      next.set("type", type);
    } else {
      next.delete("type");
    }
    const qs = next.toString();
    return `/documentos${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1">
      {tipos.map((t) => (
        <a
          href={buildHref(t.value)}
          key={t.value}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
            currentType === t.value
              ? "bg-white text-zinc-950 shadow-sm"
              : "text-zinc-600 hover:text-zinc-950"
          }`}
        >
          {t.label}
        </a>
      ))}
    </div>
  );
}
