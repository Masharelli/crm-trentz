"use client";

import { Check, Link2 } from "lucide-react";
import { useState } from "react";

type Props = {
  token: string;
  compact?: boolean;
};

export default function CopyLinkButton({ token, compact = false }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/f/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copia la liga manualmente:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (compact) {
    return (
      <button
        aria-label="Copiar liga del formulario"
        className={`grid size-8 place-items-center rounded-md transition ${
          copied
            ? "text-emerald-600"
            : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
        }`}
        onClick={handleCopy}
        title="Copiar liga"
        type="button"
      >
        {copied ? <Check size={15} /> : <Link2 size={15} />}
      </button>
    );
  }

  return (
    <button
      className={`inline-flex whitespace-nowrap h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition ${
        copied
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
      }`}
      onClick={handleCopy}
      type="button"
    >
      {copied ? <Check size={13} /> : <Link2 size={13} />}
      {copied ? "Liga copiada" : "Copiar liga"}
    </button>
  );
}
