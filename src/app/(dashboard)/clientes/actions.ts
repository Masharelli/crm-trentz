"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const clienteSchema = z.object({
  display_name: z
    .string()
    .min(2, "El nombre comercial debe tener al menos 2 caracteres."),
  legal_name: z.string().optional(),
  tax_id: z.string().optional(),
  status: z.enum(["prospect", "active", "paused", "closed"]).default("prospect"),
  primary_email: z
    .string()
    .email("Escribe un correo valido.")
    .optional()
    .or(z.literal("")),
  primary_phone: z.string().optional(),
  website: z.string().optional(),
  address_line: z.string().optional(),
  notes: z.string().optional(),
});

function nullify(value: string | undefined): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

export async function crearCliente(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData);
  const parsed = clienteSchema.safeParse(raw);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/clientes/nuevo?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { error } = await supabase.from("clients").insert({
    display_name: d.display_name.trim(),
    legal_name: nullify(d.legal_name),
    tax_id: nullify(d.tax_id),
    status: d.status,
    primary_email: nullify(d.primary_email),
    primary_phone: nullify(d.primary_phone),
    website: nullify(d.website),
    address_line: nullify(d.address_line),
    notes: nullify(d.notes),
    created_by: user.id,
  });

  if (error) {
    redirect(
      `/clientes/nuevo?error=${encodeURIComponent("No se pudo guardar el cliente. Intenta de nuevo.")}`,
    );
  }

  revalidatePath("/clientes");
  redirect(`/clientes?toast=${encodeURIComponent("Cliente creado correctamente")}`);
}

export async function actualizarCliente(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData);
  const parsed = clienteSchema.safeParse(raw);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(
      `/clientes/${id}/editar?error=${encodeURIComponent(message)}`,
    );
  }

  const d = parsed.data;

  const { error } = await supabase
    .from("clients")
    .update({
      display_name: d.display_name.trim(),
      legal_name: nullify(d.legal_name),
      tax_id: nullify(d.tax_id),
      status: d.status,
      primary_email: nullify(d.primary_email),
      primary_phone: nullify(d.primary_phone),
      website: nullify(d.website),
      address_line: nullify(d.address_line),
      notes: nullify(d.notes),
    })
    .eq("id", id);

  if (error) {
    redirect(
      `/clientes/${id}/editar?error=${encodeURIComponent("No se pudo actualizar el cliente. Intenta de nuevo.")}`,
    );
  }

  revalidatePath("/clientes");
  redirect(`/clientes?toast=${encodeURIComponent("Cliente actualizado correctamente")}`);
}

export async function cambiarEstadoCliente(id: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("clients").update({ status }).eq("id", id);
  revalidatePath("/clientes");
}

export async function eliminarCliente(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("clients").delete().eq("id", id);
  revalidatePath("/clientes");
  redirect("/clientes");
}
