"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const ROLES = ["admin", "staff", "billing", "read_only"] as const;

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    redirect(
      `/ajustes?error=${encodeURIComponent("Solo un administrador puede gestionar el equipo.")}`,
    );
  }

  return { supabase, user };
}

export async function cambiarRol(profileId: string, role: string) {
  const { supabase, user } = await requireAdmin();

  const parsed = z.enum(ROLES).safeParse(role);
  if (!parsed.success) {
    redirect(`/ajustes?error=${encodeURIComponent("Rol invalido.")}`);
  }

  if (profileId === user.id && parsed.data !== "admin") {
    redirect(
      `/ajustes?error=${encodeURIComponent("No puedes quitarte tu propio rol de administrador.")}`,
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role: parsed.data })
    .eq("id", profileId);

  if (error) {
    redirect(
      `/ajustes?error=${encodeURIComponent("No se pudo actualizar el rol.")}`,
    );
  }

  revalidatePath("/ajustes");
  redirect(`/ajustes?toast=${encodeURIComponent("Rol actualizado correctamente")}`);
}

export async function toggleActivo(profileId: string, isActive: boolean) {
  const { supabase, user } = await requireAdmin();

  if (profileId === user.id) {
    redirect(
      `/ajustes?error=${encodeURIComponent("No puedes desactivar tu propia cuenta.")}`,
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", profileId);

  if (error) {
    redirect(
      `/ajustes?error=${encodeURIComponent("No se pudo actualizar el estado de la cuenta.")}`,
    );
  }

  revalidatePath("/ajustes");
  redirect(
    `/ajustes?toast=${encodeURIComponent(isActive ? "Cuenta reactivada" : "Cuenta desactivada")}`,
  );
}
