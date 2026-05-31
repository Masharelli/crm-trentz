"use client";

import { useSearchParams } from "next/navigation";

const statuses = [
  { label: "Todos", value: "" },
  { label: "Enviado", value: "sent" },
  { label: "Fallido", value: "failed" },
];

export default function CorreosFilter() {
  const searchParams = useSearchParams();
  const currentStatus = searchParams.get("status") ?? "";

  function buildHref(status: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (status) {
      next.set("status", status);
    } else {
      next.delete("status");
    }
    const qs = next.toString();
    return `/correos${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-100 p-1">
      {statuses.map((s) => (
        <a
          href={buildHref(s.value)}
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
  );
}
