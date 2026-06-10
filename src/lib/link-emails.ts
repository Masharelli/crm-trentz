import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { logActivity } from "@/lib/activity";
import { FROM_EMAIL, resend } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";

// Envio de ligas (formularios y portal) por correo desde el CRM.

// URL base real de la app, derivada de los headers de la peticion.
export async function getBaseUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto =
    h.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Mejor correo disponible del cliente: contacto principal con correo,
// luego cualquier contacto con correo, luego el correo principal de la ficha.
export async function resolveClientEmail(
  supabase: SupabaseClient,
  clientId: string,
): Promise<string | null> {
  const [{ data: client }, { data: contact }] = await Promise.all([
    supabase
      .from("clients")
      .select("primary_email")
      .eq("id", clientId)
      .maybeSingle(),
    supabase
      .from("client_contacts")
      .select("email")
      .eq("client_id", clientId)
      .not("email", "is", null)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  return contact?.email ?? client?.primary_email ?? null;
}

function buildHtml({
  heading,
  intro,
  buttonLabel,
  url,
}: {
  heading: string;
  intro: string;
  buttonLabel: string;
  url: string;
}): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
    <div style="background:#09090b;padding:24px 32px;">
      <p style="margin:0;font-size:18px;font-weight:600;color:#fff;letter-spacing:-0.01em;">Trentz</p>
    </div>
    <div style="padding:32px;">
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600;color:#09090b;">${heading}</h2>
      <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#3f3f46;">${intro}</p>
      <a href="${url}" style="display:inline-block;background:#09090b;color:#fff;font-size:15px;font-weight:600;text-decoration:none;padding:13px 28px;border-radius:8px;">${buttonLabel}</a>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.7;color:#a1a1aa;">Si el botón no funciona, copia y pega esta liga en tu navegador:<br><a href="${url}" style="color:#52525b;word-break:break-all;">${url}</a></p>
    </div>
    <div style="padding:20px 32px;background:#f4f4f5;border-top:1px solid #e4e4e7;">
      <p style="margin:0;font-size:12px;color:#a1a1aa;">Enviado desde Trentz CRM &middot; ${FROM_EMAIL}</p>
    </div>
  </div>
</body>
</html>`;
}

type SendLinkArgs = {
  actorId: string;
  clientId: string;
  recipient: string;
  subject: string;
  heading: string;
  intro: string;
  buttonLabel: string;
  url: string;
  activityDescription: string;
};

// Envia el correo y registra el resultado. El log usa el cliente admin para
// que funcione sin importar el rol de quien envia (RLS de email_notifications
// solo permite insert a admin/billing).
export async function sendLinkEmail(
  args: SendLinkArgs,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient();
  const html = buildHtml(args);

  const { data: sent, error: sendError } = await resend.emails.send({
    from: `Trentz <${FROM_EMAIL}>`,
    to: [args.recipient],
    subject: args.subject,
    html,
  });

  await admin.from("email_notifications").insert({
    client_id: args.clientId,
    recipient_email: args.recipient,
    subject: args.subject,
    body: html,
    status: sendError || !sent ? "failed" : "sent",
    provider_message_id: sent?.id ?? null,
    sent_at: sendError || !sent ? null : new Date().toISOString(),
    failed_reason: sendError?.message ?? null,
    created_by: args.actorId,
  });

  if (sendError || !sent) {
    return { ok: false, error: "No se pudo enviar el correo. Intenta de nuevo." };
  }

  await logActivity(admin, {
    actor_id: args.actorId,
    client_id: args.clientId,
    entity_type: "email",
    action: "link_sent",
    description: args.activityDescription,
  });

  return { ok: true };
}
