"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getBaseUrl } from "@/lib/link-emails";
import { createClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email("Escribe un correo valido."),
  password: z.string().min(1, "Escribe tu contrasena."),
});

const resetRequestSchema = z.object({
  email: z.string().email("Escribe un correo valido."),
});

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, "La contrasena debe tener al menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Las contrasenas no coinciden.",
    path: ["confirm"],
  });

export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent("No pudimos iniciar sesion con esos datos.")}`,
    );
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

// Paso 1: el usuario pide el enlace de recuperacion a su correo.
export async function requestPasswordReset(formData: FormData) {
  const parsed = resetRequestSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/recuperar?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const baseUrl = await getBaseUrl();

  // El enlace lleva a /auth/callback (intercambia el code por sesion) y de ahi
  // a /restablecer. No revelamos si el correo existe: siempre confirmamos envio.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${baseUrl}/auth/callback?next=/restablecer`,
  });

  redirect("/recuperar?sent=1");
}

// Paso 2: con la sesion de recuperacion activa, fija la nueva contrasena.
export async function updatePassword(formData: FormData) {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/restablecer?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/recuperar?error=${encodeURIComponent(
        "El enlace expiro o no es valido. Solicita uno nuevo.",
      )}`,
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    redirect(
      `/restablecer?error=${encodeURIComponent(
        "No pudimos actualizar la contrasena. Intenta de nuevo.",
      )}`,
    );
  }

  revalidatePath("/", "layout");
  redirect(`/?toast=${encodeURIComponent("Contrasena actualizada")}`);
}
