import { after, NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  processEcho,
  processHistory,
  processInboundMessage,
  processStatus,
  downloadAndStoreMedia,
  verifySignature,
  type WhatsAppWebhookPayload,
} from "@/lib/whatsapp/webhook";

export const dynamic = "force-dynamic";

// Handshake de verificacion de Meta al registrar el webhook.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  if (
    mode === "subscribe" &&
    token &&
    token === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(challenge ?? "", { status: 200 });
  }

  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret) {
    console.error("whatsapp webhook: falta WHATSAPP_APP_SECRET");
    return new Response("Server misconfigured", { status: 500 });
  }

  // La firma es sobre el body crudo: leerlo antes de parsear.
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!verifySignature(rawBody, signature, appSecret)) {
    return new Response("Invalid signature", { status: 401 });
  }

  // A partir de aqui siempre respondemos 200: si Meta recibe errores
  // repetidos reintenta y puede terminar desactivando el webhook.
  try {
    const payload = JSON.parse(rawBody) as WhatsAppWebhookPayload;
    const admin = createAdminClient();

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const { field, value } = change;

        if (field === "messages") {
          for (const status of value.statuses ?? []) {
            await processStatus(admin, status);
          }
          for (const msg of value.messages ?? []) {
            const contact = value.contacts?.find((c) => c.wa_id === msg.from);
            const result = await processInboundMessage(admin, msg, contact);
            if (result?.mediaId) {
              const { conversationId, messageRowId, mediaId } = result;
              // Descarga de media despues de responder para no demorar el 200.
              after(() =>
                downloadAndStoreMedia(admin, conversationId, messageRowId, mediaId),
              );
            }
          }
        } else if (field === "smb_message_echoes") {
          for (const msg of value.message_echoes ?? []) {
            const result = await processEcho(admin, msg);
            if (result?.mediaId) {
              const { conversationId, messageRowId, mediaId } = result;
              after(() =>
                downloadAndStoreMedia(admin, conversationId, messageRowId, mediaId),
              );
            }
          }
        } else if (field === "history") {
          after(() => processHistory(admin, value));
        }
        // smb_app_state_sync (contactos sincronizados del telefono): ignorado en v1.
      }
    }
  } catch (e) {
    console.error("whatsapp webhook:", e);
  }

  return NextResponse.json({ ok: true });
}
