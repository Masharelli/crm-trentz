"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
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

  const { data: cliente, error } = await supabase
    .from("clients")
    .insert({
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
    })
    .select("id")
    .single();

  if (error) {
    redirect(
      `/clientes/nuevo?error=${encodeURIComponent("No se pudo guardar el cliente. Intenta de nuevo.")}`,
    );
  }

  if (cliente) {
    await logActivity(supabase, {
      actor_id: user.id,
      client_id: cliente.id,
      entity_type: "client",
      entity_id: cliente.id,
      action: "created",
      description: "Cliente dado de alta en el CRM",
    });
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

  const statusLabel: Record<string, string> = {
    active: "Activo",
    closed: "Cerrado",
    paused: "Pausado",
    prospect: "Prospecto",
  };
  await logActivity(supabase, {
    actor_id: user.id,
    client_id: id,
    entity_type: "client",
    entity_id: id,
    action: "status_changed",
    description: `Estado del cliente cambiado a ${statusLabel[status] ?? status}`,
  });

  revalidatePath("/clientes");
  revalidatePath(`/clientes/${id}`);
}

// ── Contactos del cliente ───────────────────────────────────────

const contactoSchema = z.object({
  full_name: z.string().min(2, "El nombre del contacto debe tener al menos 2 caracteres."),
  position: z.string().optional(),
  email: z
    .string()
    .email("Escribe un correo valido.")
    .optional()
    .or(z.literal("")),
  phone: z.string().optional(),
});

export async function crearContacto(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData);
  const parsed = contactoSchema.safeParse(raw);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(
      `/clientes/${clientId}/contactos/nuevo?error=${encodeURIComponent(message)}`,
    );
  }

  const d = parsed.data;
  const isPrimary = formData.get("is_primary") === "on";

  if (isPrimary) {
    await supabase
      .from("client_contacts")
      .update({ is_primary: false })
      .eq("client_id", clientId);
  }

  const { error } = await supabase.from("client_contacts").insert({
    client_id: clientId,
    full_name: d.full_name.trim(),
    position: nullify(d.position),
    email: nullify(d.email),
    phone: nullify(d.phone),
    is_primary: isPrimary,
  });

  if (error) {
    redirect(
      `/clientes/${clientId}/contactos/nuevo?error=${encodeURIComponent("No se pudo guardar el contacto. Intenta de nuevo.")}`,
    );
  }

  revalidatePath(`/clientes/${clientId}`);
  redirect(
    `/clientes/${clientId}?toast=${encodeURIComponent("Contacto agregado correctamente")}`,
  );
}

export async function actualizarContacto(
  clientId: string,
  contactId: string,
  formData: FormData,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const raw = Object.fromEntries(formData);
  const parsed = contactoSchema.safeParse(raw);

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(
      `/clientes/${clientId}/contactos/${contactId}/editar?error=${encodeURIComponent(message)}`,
    );
  }

  const d = parsed.data;
  const isPrimary = formData.get("is_primary") === "on";

  if (isPrimary) {
    await supabase
      .from("client_contacts")
      .update({ is_primary: false })
      .eq("client_id", clientId)
      .neq("id", contactId);
  }

  const { error } = await supabase
    .from("client_contacts")
    .update({
      full_name: d.full_name.trim(),
      position: nullify(d.position),
      email: nullify(d.email),
      phone: nullify(d.phone),
      is_primary: isPrimary,
    })
    .eq("id", contactId)
    .eq("client_id", clientId);

  if (error) {
    redirect(
      `/clientes/${clientId}/contactos/${contactId}/editar?error=${encodeURIComponent("No se pudo actualizar el contacto. Intenta de nuevo.")}`,
    );
  }

  revalidatePath(`/clientes/${clientId}`);
  redirect(
    `/clientes/${clientId}?toast=${encodeURIComponent("Contacto actualizado correctamente")}`,
  );
}

export async function eliminarContacto(clientId: string, contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("client_contacts")
    .delete()
    .eq("id", contactId)
    .eq("client_id", clientId);

  revalidatePath(`/clientes/${clientId}`);
}

// ── Portal del cliente ──────────────────────────────────────────

export async function setPortalEnabled(clientId: string, enabled: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("clients")
    .update({ portal_enabled: enabled })
    .eq("id", clientId);

  await logActivity(supabase, {
    actor_id: user.id,
    client_id: clientId,
    entity_type: "client",
    entity_id: clientId,
    action: enabled ? "portal_enabled" : "portal_disabled",
    description: enabled
      ? "Portal del cliente activado"
      : "Portal del cliente desactivado",
  });

  revalidatePath(`/clientes/${clientId}`);
}

// Regenera el token: la liga anterior deja de funcionar de inmediato.
export async function regenerarLigaPortal(clientId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase
    .from("clients")
    .update({ portal_token: crypto.randomUUID() })
    .eq("id", clientId);

  await logActivity(supabase, {
    actor_id: user.id,
    client_id: clientId,
    entity_type: "client",
    entity_id: clientId,
    action: "portal_token_regenerated",
    description: "Liga del portal regenerada (la anterior quedó invalidada)",
  });

  revalidatePath(`/clientes/${clientId}`);
}

// ── Bitacora de notas ───────────────────────────────────────────

export async function agregarNota(clientId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const body = String(formData.get("body") ?? "").trim();

  if (body.length < 2) {
    redirect(
      `/clientes/${clientId}?error=${encodeURIComponent("La nota debe tener al menos 2 caracteres.")}`,
    );
  }

  const { error } = await supabase.from("notes").insert({
    client_id: clientId,
    body,
    created_by: user.id,
  });

  if (error) {
    redirect(
      `/clientes/${clientId}?error=${encodeURIComponent("No se pudo guardar la nota. Intenta de nuevo.")}`,
    );
  }

  revalidatePath(`/clientes/${clientId}`);
  redirect(
    `/clientes/${clientId}?toast=${encodeURIComponent("Nota agregada a la bitácora")}`,
  );
}

export async function eliminarNota(clientId: string, noteId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("notes").delete().eq("id", noteId);
  revalidatePath(`/clientes/${clientId}`);
}

export async function eliminarCliente(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("clients").delete().eq("id", id);
  revalidatePath("/clientes");
  redirect(`/clientes?toast=${encodeURIComponent("Cliente eliminado correctamente")}`);
}
