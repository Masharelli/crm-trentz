"use server";

import { revalidatePath } from "next/cache";
import {
  answerableFields,
  parseMultiValue,
  type FormFieldDef,
} from "@/lib/forms";
import { FROM_EMAIL, resend } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";

// Acciones publicas del formulario por token. No hay sesion de Supabase:
// el token (uuid impredecible) es la autenticacion del cliente.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ActionResult = { ok: true } | { ok: false; error: string };

type Assignment = {
  id: string;
  client_id: string;
  form_name: string;
  status: string;
  fields_snapshot: FormFieldDef[];
  form_id: string | null;
};

async function getAssignment(token: string): Promise<Assignment | null> {
  if (!UUID_RE.test(token)) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("form_assignments")
    .select("id, client_id, form_name, status, fields_snapshot, form_id")
    .eq("token", token)
    .maybeSingle();

  return (data as Assignment | null) ?? null;
}

function isAnswerEmpty(field: FormFieldDef, value: string): boolean {
  if (field.field_type === "multiselect") {
    return parseMultiValue(value).length === 0;
  }
  return value.trim() === "";
}

export async function guardarRespuesta(
  token: string,
  fieldId: string,
  value: string,
): Promise<ActionResult> {
  const assignment = await getAssignment(token);

  if (!assignment) {
    return { ok: false, error: "Esta liga no es válida." };
  }
  if (assignment.status === "completed") {
    return { ok: false, error: "Este formulario ya fue enviado." };
  }

  const field = answerableFields(assignment.fields_snapshot).find(
    (f) => f.id === fieldId,
  );
  if (!field) {
    return { ok: false, error: "La pregunta no existe en este formulario." };
  }

  const admin = createAdminClient();

  if (isAnswerEmpty(field, value)) {
    await admin
      .from("form_answers")
      .delete()
      .eq("assignment_id", assignment.id)
      .eq("field_id", fieldId);
  } else {
    const { error } = await admin.from("form_answers").upsert(
      {
        assignment_id: assignment.id,
        field_id: fieldId,
        value,
      },
      { onConflict: "assignment_id,field_id" },
    );
    if (error) {
      return { ok: false, error: "No se pudo guardar la respuesta." };
    }
  }

  if (assignment.status === "pending") {
    await admin
      .from("form_assignments")
      .update({ status: "in_progress" })
      .eq("id", assignment.id);
  }

  return { ok: true };
}

export async function enviarFormulario(
  token: string,
  answers: Record<string, string>,
): Promise<ActionResult> {
  const assignment = await getAssignment(token);

  if (!assignment) {
    return { ok: false, error: "Esta liga no es válida." };
  }
  if (assignment.status === "completed") {
    return { ok: false, error: "Este formulario ya fue enviado." };
  }

  const fields = answerableFields(assignment.fields_snapshot);

  const faltante = fields.find(
    (f) => f.is_required && isAnswerEmpty(f, answers[f.id] ?? ""),
  );
  if (faltante) {
    return {
      ok: false,
      error: `Falta responder una pregunta requerida: "${faltante.label}".`,
    };
  }

  const admin = createAdminClient();

  const rows = fields
    .filter((f) => !isAnswerEmpty(f, answers[f.id] ?? ""))
    .map((f) => ({
      assignment_id: assignment.id,
      field_id: f.id,
      value: answers[f.id],
    }));

  if (rows.length > 0) {
    const { error } = await admin
      .from("form_answers")
      .upsert(rows, { onConflict: "assignment_id,field_id" });
    if (error) {
      return { ok: false, error: "No se pudieron guardar las respuestas. Intenta de nuevo." };
    }
  }

  const { error: statusError } = await admin
    .from("form_assignments")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", assignment.id);

  if (statusError) {
    return { ok: false, error: "No se pudo enviar el formulario. Intenta de nuevo." };
  }

  await admin.from("activity_logs").insert({
    client_id: assignment.client_id,
    entity_type: "form_assignment",
    entity_id: assignment.id,
    action: "completed",
    description: `El cliente completó el formulario "${assignment.form_name}".`,
  });

  await notificarRespuestaCompletada(admin, assignment);

  revalidatePath(`/clientes/${assignment.client_id}`);
  revalidatePath(`/formularios/respuestas/${assignment.id}`);
  if (assignment.form_id) revalidatePath(`/formularios/${assignment.form_id}`);

  return { ok: true };
}

async function notificarRespuestaCompletada(
  admin: ReturnType<typeof createAdminClient>,
  assignment: Assignment,
) {
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to || !process.env.RESEND_API_KEY) return;

  const { data: client } = await admin
    .from("clients")
    .select("display_name")
    .eq("id", assignment.client_id)
    .maybeSingle();

  const clientName = client?.display_name ?? "Un cliente";
  const subject = `${clientName} completó el formulario "${assignment.form_name}"`;
  const body = `<!DOCTYPE html>
<html>
<body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,sans-serif;padding:32px 16px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
    <div style="padding:24px 32px;border-bottom:1px solid #e4e4e7;">
      <p style="margin:0;font-size:16px;font-weight:600;color:#09090b;">Formulario completado</p>
    </div>
    <div style="padding:24px 32px;">
      <p style="margin:0 0 12px;font-size:14px;color:#3f3f46;"><strong>${clientName}</strong> terminó de responder el formulario <strong>${assignment.form_name}</strong>.</p>
      <p style="margin:0;font-size:14px;color:#3f3f46;">Revisa sus respuestas en el CRM, en la sección de formularios del cliente.</p>
    </div>
    <div style="padding:20px 32px;background:#f4f4f5;border-top:1px solid #e4e4e7;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;">Enviado desde Trentz CRM &middot; ${FROM_EMAIL}</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html: body,
    });

    await admin.from("email_notifications").insert({
      client_id: assignment.client_id,
      recipient_email: to,
      subject,
      body,
      status: error ? "failed" : "sent",
      provider_message_id: data?.id ?? null,
      sent_at: error ? null : new Date().toISOString(),
      failed_reason: error?.message ?? null,
    });
  } catch (err) {
    console.error("[formularios] error al notificar respuesta completada:", err);
  }
}
