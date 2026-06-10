"use client";

import { LoaderCircle, UserCheck, UserX } from "lucide-react";
import { useTransition } from "react";
import { cambiarRol, toggleActivo } from "./actions";

const roleOptions = [
  { value: "admin", label: "Administrador" },
  { value: "staff", label: "Staff" },
  { value: "billing", label: "Facturación" },
  { value: "read_only", label: "Solo lectura" },
];

export function RoleSelect({
  profileId,
  currentRole,
}: {
  profileId: string;
  currentRole: string;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm text-zinc-950 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:opacity-50"
      defaultValue={currentRole}
      disabled={isPending}
      onChange={(e) => {
        const role = e.target.value;
        startTransition(async () => {
          await cambiarRol(profileId, role);
        });
      }}
    >
      {roleOptions.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function ActiveToggle({
  profileId,
  isActive,
  nombre,
}: {
  profileId: string;
  isActive: boolean;
  nombre: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const mensaje = isActive
      ? `¿Desactivar la cuenta de "${nombre}"?\n\nNo podrá iniciar sesión ni ver información del CRM hasta que la reactives.`
      : `¿Reactivar la cuenta de "${nombre}"?`;

    if (!window.confirm(mensaje)) return;

    startTransition(async () => {
      await toggleActivo(profileId, !isActive);
    });
  }

  return (
    <button
      className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition disabled:opacity-50 ${
        isActive
          ? "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
          : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
      disabled={isPending}
      onClick={handleToggle}
      type="button"
    >
      {isPending ? (
        <LoaderCircle className="animate-spin" size={13} />
      ) : isActive ? (
        <UserX size={13} />
      ) : (
        <UserCheck size={13} />
      )}
      {isActive ? "Desactivar" : "Reactivar"}
    </button>
  );
}
