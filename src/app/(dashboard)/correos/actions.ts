"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { FROM_EMAIL, resend } from "@/lib/resend";

const correoSchema = z.object({
  client_id: z.string().uuid("Selecciona un cliente valido."),
  recipient_email: z.string().min(1, "El destinatario es obligatorio."),
  subject: z.string().min(2, "El asunto debe tener al menos 2 caracteres."),
  body: z.string().min(5, "El mensaje debe tener al menos 5 caracteres."),
});

function buildHtml(body: string, subject: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#09090b;padding:24px 32px;">
      <p style="margin:0;font-size:18px;font-weight:600;color:#fff;letter-spacing:-0.01em;">Trentz CRM</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#09090b;">${subject}</h2>
      <p style="margin:0;font-size:15px;line-height:1.8;color:#3f3f46;">${escaped}</p>
    </div>
    <div style="padding:20px 32px;background:#f4f4f5;border-top:1px solid #e4e4e7;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;">Enviado desde Trentz CRM &middot; ${FROM_EMAIL}</p>
    </div>
  </div>
</body>
</html>`;
}

export async function enviarCorreo(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const parsed = correoSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Datos invalidos.";
    redirect(`/correos/nuevo?error=${encodeURIComponent(message)}`);
  }

  const d = parsed.data;

  const { data: sent, error: sendError } = await resend.emails.send({
    from: `Trentz CRM <${FROM_EMAIL}>`,
    to: [d.recipient_email],
    subject: d.subject,
    html: buildHtml(d.body, d.subject),
  });

  if (sendError || !sent) {
    await supabase.from("email_notifications").insert({
      client_id: d.client_id,
      recipient_email: d.recipient_email,
      subject: d.subject,
      body: d.body,
      status: "failed",
      failed_reason: sendError?.message ?? "Error desconocido",
      created_by: user.id,
    });
    redirect(
      `/correos/nuevo?error=${encodeURIComponent("No se pudo enviar el correo. Intenta de nuevo.")}`,
    );
  }

  await supabase.from("email_notifications").insert({
    client_id: d.client_id,
    recipient_email: d.recipient_email,
    subject: d.subject,
    body: d.body,
    status: "sent",
    provider_message_id: sent.id,
    sent_at: new Date().toISOString(),
    created_by: user.id,
  });

  revalidatePath("/correos");
  redirect(`/correos?toast=${encodeURIComponent("Correo enviado correctamente")}`);
}

export async function eliminarCorreo(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await supabase.from("email_notifications").delete().eq("id", id);
  revalidatePath("/correos");
  redirect("/correos");
}
