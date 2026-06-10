import type { SupabaseClient } from "@supabase/supabase-js";

// Rol del usuario actual para decidir que acciones mostrar en la UI.
// La seguridad real la pone RLS en la base; esto es solo UX.

export type AppRole = "admin" | "staff" | "billing" | "read_only";

export async function getCurrentRole(
  supabase: SupabaseClient,
  userId: string,
): Promise<AppRole> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  return (data?.role as AppRole) ?? "read_only";
}

// Puede crear/editar (admin, staff y billing). read_only solo consulta.
export function canWrite(role: AppRole): boolean {
  return role !== "read_only";
}

export function isAdmin(role: AppRole): boolean {
  return role === "admin";
}
