import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ActiveToggle, RoleSelect } from "./TeamControls";

type Props = {
  searchParams: Promise<{ error?: string }>;
};

const roleLabel: Record<string, string> = {
  admin: "Administrador",
  staff: "Staff",
  billing: "Facturación",
  read_only: "Solo lectura",
};

const roleClass: Record<string, string> = {
  admin: "bg-violet-50 text-violet-800 ring-violet-200",
  staff: "bg-cyan-50 text-cyan-800 ring-cyan-200",
  billing: "bg-amber-50 text-amber-800 ring-amber-200",
  read_only: "bg-zinc-100 text-zinc-700 ring-zinc-200",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00.000Z`));
}

export default async function AjustesPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await searchParams;

  const [{ data: me }, { data: team }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, is_active, created_at")
      .order("created_at", { ascending: true }),
  ]);

  const isAdmin = me?.role === "admin";
  const members = team ?? [];

  return (
    <>
      <header className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
            Ajustes
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Tu perfil y el equipo con acceso al CRM
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-4">
          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
              {error}
            </div>
          ) : null}

          {/* Mi perfil */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Mi perfil
              </p>
            </div>
            <div className="space-y-5 px-6 py-6">
              <div className="grid grid-cols-2 gap-5">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Nombre
                  </p>
                  <p className="text-sm text-zinc-900">
                    {me?.full_name || "Sin nombre"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                    Correo
                  </p>
                  <p className="text-sm text-zinc-900">{me?.email ?? user.email}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                  Rol
                </p>
                <span
                  className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold ring-1 ${roleClass[me?.role ?? "staff"] ?? roleClass.staff}`}
                >
                  <ShieldCheck size={13} />
                  {roleLabel[me?.role ?? "staff"] ?? me?.role}
                </span>
              </div>
            </div>
          </div>

          {/* Equipo */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                Equipo ({members.length})
              </p>
            </div>
            {!isAdmin ? (
              <div className="border-b border-zinc-100 bg-amber-50/60 px-6 py-2.5">
                <p className="text-xs text-amber-800">
                  Solo un administrador puede cambiar roles o desactivar cuentas.
                </p>
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Miembro</th>
                    <th className="px-5 py-3 font-semibold">Rol</th>
                    <th className="px-5 py-3 font-semibold">Desde</th>
                    <th className="px-5 py-3 font-semibold">Estado</th>
                    {isAdmin ? <th className="px-5 py-3 font-semibold" /> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-4">
                        <p className="font-medium text-zinc-950">
                          {member.full_name || "Sin nombre"}
                          {member.id === user.id ? (
                            <span className="ml-2 text-xs font-normal text-zinc-400">
                              (tú)
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {member.email}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {isAdmin ? (
                          <RoleSelect
                            profileId={member.id}
                            currentRole={member.role}
                          />
                        ) : (
                          <span
                            className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${roleClass[member.role] ?? roleClass.staff}`}
                          >
                            {roleLabel[member.role] ?? member.role}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-zinc-600">
                        {formatDate(member.created_at)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ring-1 ${
                            member.is_active
                              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                              : "bg-zinc-100 text-zinc-700 ring-zinc-200"
                          }`}
                        >
                          {member.is_active ? "Activa" : "Desactivada"}
                        </span>
                      </td>
                      {isAdmin ? (
                        <td className="px-5 py-4">
                          <div className="flex justify-end">
                            {member.id !== user.id ? (
                              <ActiveToggle
                                profileId={member.id}
                                isActive={member.is_active}
                                nombre={member.full_name || member.email || "este miembro"}
                              />
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="border-t border-zinc-100 bg-zinc-50 px-6 py-3">
              <p className="text-xs text-zinc-400">
                Para dar de alta a alguien nuevo, invítalo desde Supabase
                (Authentication → Users); su perfil se crea automáticamente al
                primer inicio de sesión.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
