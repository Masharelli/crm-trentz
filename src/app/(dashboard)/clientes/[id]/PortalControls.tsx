"use client";

import { Check, Link2, LoaderCircle, Power, RefreshCcw } from "lucide-react";
import { useState, useTransition } from "react";
import { regenerarLigaPortal, setPortalEnabled } from "../actions";

export function CopyPortalLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/p/${token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("Copia la liga manualmente:", url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

export function PortalToggleButton({
  clientId,
  enabled,
  nombre,
}: {
  clientId: string;
  enabled: boolean;
  nombre: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (
      enabled &&
      !window.confirm(
        `¿Desactivar el portal de "${nombre}"?\n\nLa liga dejará de funcionar hasta que lo vuelvas a activar (no se pierde).`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await setPortalEnabled(clientId, !enabled);
    });
  }

  return (
    <button
      className={`inline-flex whitespace-nowrap h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold transition disabled:opacity-50 ${
        enabled
          ? "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
          : "bg-zinc-950 text-white hover:bg-zinc-800"
      }`}
      disabled={isPending}
      onClick={handleToggle}
      type="button"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={13} />
      ) : (
        <Power size={13} />
      )}
      {enabled ? "Desactivar" : "Activar portal"}
    </button>
  );
}

export function RegenerarLigaButton({
  clientId,
  nombre,
}: {
  clientId: string;
  nombre: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRegenerate() {
    if (
      !window.confirm(
        `¿Regenerar la liga del portal de "${nombre}"?\n\nLa liga actual quedará invalidada de inmediato; tendrás que compartir la nueva.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await regenerarLigaPortal(clientId);
    });
  }

  return (
    <button
      aria-label="Regenerar liga del portal"
      className="inline-flex whitespace-nowrap h-8 items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
      disabled={isPending}
      onClick={handleRegenerate}
      title="Invalida la liga actual y genera una nueva"
      type="button"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={13} />
      ) : (
        <RefreshCcw size={13} />
      )}
      Regenerar
    </button>
  );
}
