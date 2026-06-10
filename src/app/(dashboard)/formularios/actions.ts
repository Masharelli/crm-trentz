"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { getBaseUrl, resolveClientEmail, sendLinkEmail } from "@/lib/link-emails";
import { createClient } from "@/lib/supabase/server";

const FIELD_TYPES = [
  "section",
  "text",
  "textarea",
  "number",
  "date",
  "select",
  "multiselect",
  "yesno",
] as const;

const campoSchema = z
  .object({
    id: z.string().uuid().nullable(),
    label: z.string().min(1, "Todas las preguntas necesitan un texto."),
    help_text: z.string().optional(),
    field_type: z.enum(FIELD_TYPES),
    options: z.array(z.string().min(1)).nullable(),
    is_required: z.boolean(),
  })
  .refine(
    (f) =>
      !["select", "multiselect"].includes(f.field_type) ||
      (f.options !== null && f.options.length > 0),
    { message: "Las preguntas de opción necesitan al menos una opción." },
  );

const formularioSchema = z.object({
  name: z.string().min(2, "El nombre del formulario debe tener al menos 2 caracteres."),
  description: z.string().optional(),
  fields: z.array(campoSchema).min(1, "Agrega al menos una pregunta."),
});

function nullify(value: string | undefined | null): string | null {
  return value && value.trim() !== "" ? value.trim() : null;
}

function parseFields(formData: FormData): unknown {
  try {
    return JSON.parse(String(formData.get("fields") ?? "[]"));
  } catch {
    return [];
  }
}

// ── Plantillas de formulario ────────────────────────────────────

export async function crearFormulario(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = formularioSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    fields: parseFields(formData),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/formularios/nuevo?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { data: form, error } = await supabase
    .from("forms")
    .insert({
      name: d.name.trim(),
      description: nullify(d.description),
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !form) {
    redirect(
      `/formularios/nuevo?error=${encodeURIComponent(`No se pudo crear el formulario.${error?.message ? ` (${error.message})` : ""}`)}`,
    );
  }

  const { error: fieldsError } = await supabase.from("form_fields").insert(
    d.fields.map((f, index) => ({
      form_id: form.id,
      label: f.label.trim(),
      help_text: nullify(f.help_text),
      field_type: f.field_type,
      options: f.options,
      is_required: f.field_type === "section" ? false : f.is_required,
      position: index,
    })),
  );

  if (fieldsError) {
    await supabase.from("forms").delete().eq("id", form.id);
    redirect(
      `/formularios/nuevo?error=${encodeURIComponent(`No se pudieron crear las preguntas. (${fieldsError.message})`)}`,
    );
  }

  revalidatePath("/formularios");
  redirect(
    `/formularios?toast=${encodeURIComponent("Formulario creado correctamente")}`,
  );
}

export async function actualizarFormulario(id: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = formularioSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    fields: parseFields(formData),
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/formularios/${id}/editar?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { error: formError } = await supabase
    .from("forms")
    .update({ name: d.name.trim(), description: nullify(d.description) })
    .eq("id", id);

  if (formError) {
    redirect(
      `/formularios/${id}/editar?error=${encodeURIComponent(`No se pudo actualizar el formulario. (${formError.message})`)}`,
    );
  }

  // Borra las preguntas que ya no estan, actualiza las existentes e inserta
  // las nuevas. Las asignaciones usan fields_snapshot, no se ven afectadas.
  const keptIds = d.fields.filter((f) => f.id).map((f) => f.id as string);

  let deleteQuery = supabase.from("form_fields").delete().eq("form_id", id);
  if (keptIds.length > 0) {
    deleteQuery = deleteQuery.not("id", "in", `(${keptIds.join(",")})`);
  }
  await deleteQuery;

  for (const [index, field] of d.fields.entries()) {
    const values = {
      label: field.label.trim(),
      help_text: nullify(field.help_text),
      field_type: field.field_type,
      options: field.options,
      is_required: field.field_type === "section" ? false : field.is_required,
      position: index,
    };

    if (field.id) {
      await supabase
        .from("form_fields")
        .update(values)
        .eq("id", field.id)
        .eq("form_id", id);
    } else {
      await supabase.from("form_fields").insert({ form_id: id, ...values });
    }
  }

  revalidatePath("/formularios");
  revalidatePath(`/formularios/${id}`);
  redirect(
    `/formularios/${id}?toast=${encodeURIComponent("Formulario actualizado correctamente")}`,
  );
}

export async function eliminarFormulario(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("forms").delete().eq("id", id);
  revalidatePath("/formularios");
  redirect(
    `/formularios?toast=${encodeURIComponent("Formulario eliminado correctamente")}`,
  );
}

// ── Asignaciones a clientes ─────────────────────────────────────

export async function asignarFormulario(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const from = String(formData.get("from") ?? "");
  const clientId = String(formData.get("client_id") ?? "");
  const formId = String(formData.get("form_id") ?? "");

  const backPath =
    from === "cliente"
      ? `/clientes/${clientId}/asignar-formulario`
      : `/formularios/${formId}`;

  const parsed = z
    .object({
      client_id: z.string().uuid("Selecciona un cliente."),
      form_id: z.string().uuid("Selecciona un formulario."),
    })
    .safeParse({ client_id: clientId, form_id: formId });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`${backPath}?error=${encodeURIComponent(message)}`);
  }

  const { data: form } = await supabase
    .from("forms")
    .select("id, name, form_fields(id, label, help_text, field_type, options, is_required, position)")
    .eq("id", formId)
    .maybeSingle();

  if (!form) {
    redirect(
      `${backPath}?error=${encodeURIComponent("El formulario seleccionado no existe.")}`,
    );
  }

  const snapshot = [...form.form_fields].sort((a, b) => a.position - b.position);

  if (snapshot.filter((f) => f.field_type !== "section").length === 0) {
    redirect(
      `${backPath}?error=${encodeURIComponent("El formulario no tiene preguntas que responder.")}`,
    );
  }

  const { data: assignment, error } = await supabase
    .from("form_assignments")
    .insert({
      form_id: form.id,
      client_id: clientId,
      form_name: form.name,
      fields_snapshot: snapshot,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !assignment) {
    redirect(
      `${backPath}?error=${encodeURIComponent(`No se pudo asignar el formulario.${error?.message ? ` (${error.message})` : ""}`)}`,
    );
  }

  await logActivity(supabase, {
    actor_id: user.id,
    client_id: clientId,
    entity_type: "form_assignment",
    entity_id: assignment.id,
    action: "assigned",
    description: `Formulario asignado: ${form.name}`,
  });

  revalidatePath(`/clientes/${clientId}`);
  revalidatePath(`/formularios/${formId}`);

  const destino = from === "cliente" ? `/clientes/${clientId}` : `/formularios/${formId}`;
  redirect(
    `${destino}?toast=${encodeURIComponent("Formulario asignado. Copia la liga y compártela con el cliente.")}`,
  );
}

export async function enviarLigaFormulario(
  assignmentId: string,
  backPath: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("form_assignments")
    .select("id, form_name, token, status, client_id, clients(display_name)")
    .eq("id", assignmentId)
    .maybeSingle();

  if (!assignment) {
    redirect(`${backPath}?error=${encodeURIComponent("La asignación no existe.")}`);
  }

  if (assignment.status === "completed") {
    redirect(
      `${backPath}?error=${encodeURIComponent("Este formulario ya fue enviado; la liga está cerrada.")}`,
    );
  }

  const recipient = await resolveClientEmail(supabase, assignment.client_id);

  if (!recipient) {
    redirect(
      `${backPath}?error=${encodeURIComponent("El cliente no tiene correo registrado. Agrégalo en su ficha o en sus contactos.")}`,
    );
  }

  const clientName =
    (assignment.clients as unknown as { display_name: string } | null)
      ?.display_name ?? "";
  const url = `${await getBaseUrl()}/f/${assignment.token}`;

  const result = await sendLinkEmail({
    actorId: user.id,
    clientId: assignment.client_id,
    recipient,
    subject: `Formulario pendiente: ${assignment.form_name}`,
    heading: "Tienes un formulario por completar",
    intro: `Hola${clientName ? ` ${clientName}` : ""}, te compartimos la liga para responder el formulario "${assignment.form_name}". Tu avance se guarda automáticamente: puedes salir y retomarlo cuando quieras desde esta misma liga.`,
    buttonLabel: "Responder formulario",
    url,
    activityDescription: `Liga del formulario "${assignment.form_name}" enviada por correo a ${recipient}`,
  });

  if (!result.ok) {
    redirect(`${backPath}?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/correos");
  revalidatePath(`/clientes/${assignment.client_id}`);
  redirect(`${backPath}?toast=${encodeURIComponent(`Liga enviada a ${recipient}`)}`);
}

export async function reabrirAsignacion(assignmentId: string, backPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("form_assignments")
    .update({ status: "in_progress", completed_at: null })
    .eq("id", assignmentId)
    .select("client_id, form_id")
    .maybeSingle();

  if (assignment) {
    revalidatePath(`/clientes/${assignment.client_id}`);
    if (assignment.form_id) revalidatePath(`/formularios/${assignment.form_id}`);
  }
  revalidatePath(backPath);
  redirect(
    `${backPath}?toast=${encodeURIComponent("Liga reabierta. El cliente ya puede editar sus respuestas.")}`,
  );
}

export async function eliminarAsignacion(assignmentId: string, backPath: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assignment } = await supabase
    .from("form_assignments")
    .delete()
    .eq("id", assignmentId)
    .select("client_id, form_id")
    .maybeSingle();

  if (assignment) {
    revalidatePath(`/clientes/${assignment.client_id}`);
    if (assignment.form_id) revalidatePath(`/formularios/${assignment.form_id}`);
  }
  redirect(
    `${backPath}?toast=${encodeURIComponent("Asignación eliminada correctamente")}`,
  );
}
