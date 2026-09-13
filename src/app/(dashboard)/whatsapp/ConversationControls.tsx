"use client";

import { CheckCircle2, RotateCcw, UserRound } from "lucide-react";
import { actualizarEstado, actualizarResponsable } from "./actions";
import PendingButton from "./PendingButton";

export default function ConversationControls({
  conversationId,
  assignedTo,
  status,
  team,
}: {
  conversationId: string;
  assignedTo: string | null;
  status: "open" | "resolved";
  team: Array<{ id: string; full_name: string }>;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-50/80 px-4 py-2 sm:px-6">
      <form action={actualizarResponsable} className="flex min-w-0 items-center gap-1.5">
        <input type="hidden" name="conversation_id" value={conversationId} />
        <UserRound size={14} className="text-zinc-400" />
        <select
          name="assigned_to"
          defaultValue={assignedTo ?? ""}
          aria-label="Responsable de la conversacion"
          className="h-8 min-w-0 max-w-48 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="">Sin responsable</option>
          {team.map((member) => (
            <option key={member.id} value={member.id}>
              {member.full_name || "Sin nombre"}
            </option>
          ))}
        </select>
        <PendingButton
          pendingLabel="Guardando"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          Asignar
        </PendingButton>
      </form>

      <form action={actualizarEstado}>
        <input type="hidden" name="conversation_id" value={conversationId} />
        <input
          type="hidden"
          name="status"
          value={status === "resolved" ? "open" : "resolved"}
        />
        <PendingButton
          pendingLabel="Actualizando"
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 disabled:opacity-60"
        >
          {status === "resolved" ? (
            <RotateCcw size={14} />
          ) : (
            <CheckCircle2 size={14} />
          )}
          {status === "resolved" ? "Reabrir" : "Resolver"}
        </PendingButton>
      </form>
    </div>
  );
}
