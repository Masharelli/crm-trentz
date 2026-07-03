import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { downloadMedia, fetchMediaUrl } from "@/lib/whatsapp/client";
import { formatWaId, last10Digits } from "@/lib/whatsapp/phone";

// Logica de ingesta del webhook de WhatsApp (Meta Cloud API, modo Coexistence).
// Separada del route handler para poder probarla de forma aislada.
// Todas las escrituras usan el admin client (service role): el webhook no
// tiene sesion de usuario y su autenticacion es la firma HMAC de Meta.

export type WhatsAppContact = {
  wa_id: string;
  profile?: { name?: string };
};

export type WhatsAppMessage = {
  id: string;
  from: string;
  to?: string;
  timestamp: string;
  type: string;
  text?: { body?: string };
  image?: { id?: string; caption?: string; mime_type?: string };
  audio?: { id?: string; mime_type?: string };
  video?: { id?: string; caption?: string; mime_type?: string };
  document?: { id?: string; caption?: string; filename?: string; mime_type?: string };
  sticker?: { id?: string; mime_type?: string };
  location?: { latitude?: number; longitude?: number; name?: string };
  reaction?: { emoji?: string };
  contacts?: Array<{ name?: { formatted_name?: string } }>;
  button?: { text?: string };
  interactive?: {
    button_reply?: { title?: string };
    list_reply?: { title?: string };
  };
};

export type WhatsAppStatus = {
  id: string;
  status: string;
  errors?: Array<{ message?: string; title?: string }>;
};

export type WhatsAppChangeValue = {
  messaging_product?: string;
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: WhatsAppStatus[];
  message_echoes?: WhatsAppMessage[];
  history?: Array<{
    metadata?: { phase?: number };
    threads?: Array<{ id: string; messages?: WhatsAppMessage[] }>;
  }>;
};

export type WhatsAppWebhookPayload = {
  object?: string;
  entry?: Array<{
    id: string;
    changes?: Array<{ field: string; value: WhatsAppChangeValue }>;
  }>;
};

export function verifySignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = crypto
    .createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  const received = signatureHeader.slice("sha256=".length);

  if (received.length !== expected.length) return false;

  return crypto.timingSafeEqual(
    Buffer.from(received, "hex"),
    Buffer.from(expected, "hex"),
  );
}

const MEDIA_TYPES = ["image", "audio", "video", "document", "sticker"] as const;

function mediaIdOf(msg: WhatsAppMessage): string | null {
  for (const t of MEDIA_TYPES) {
    if (msg.type === t) return msg[t]?.id ?? null;
  }
  return null;
}

// Texto a guardar/previsualizar segun el tipo de mensaje.
export function extractBody(msg: WhatsAppMessage): string | null {
  switch (msg.type) {
    case "text":
      return msg.text?.body ?? null;
    case "image":
      return msg.image?.caption ?? "[Imagen]";
    case "video":
      return msg.video?.caption ?? "[Video]";
    case "audio":
      return "[Audio]";
    case "document":
      return msg.document?.filename ?? msg.document?.caption ?? "[Documento]";
    case "sticker":
      return "[Sticker]";
    case "location": {
      const loc = msg.location;
      if (!loc) return "[Ubicacion]";
      return loc.name ?? `[Ubicacion] ${loc.latitude}, ${loc.longitude}`;
    }
    case "reaction":
      return msg.reaction?.emoji ?? "[Reaccion]";
    case "contacts":
      return msg.contacts?.[0]?.name?.formatted_name
        ? `[Contacto] ${msg.contacts[0].name.formatted_name}`
        : "[Contacto]";
    case "button":
      return msg.button?.text ?? "[Boton]";
    case "interactive":
      return (
        msg.interactive?.button_reply?.title ??
        msg.interactive?.list_reply?.title ??
        "[Interactivo]"
      );
    default:
      return "[Mensaje no soportado]";
  }
}

export async function getOrCreateConversation(
  admin: SupabaseClient,
  waId: string,
  profileName?: string | null,
): Promise<{ id: string } | null> {
  const { data: existing } = await admin
    .from("whatsapp_conversations")
    .select("id, profile_name")
    .eq("wa_id", waId)
    .maybeSingle();

  if (existing) {
    if (profileName && profileName !== existing.profile_name) {
      await admin
        .from("whatsapp_conversations")
        .update({ profile_name: profileName })
        .eq("id", existing.id);
    }
    return { id: existing.id };
  }

  // Conversacion nueva: intentar auto-vincular con un cliente por telefono.
  const { data: match } = await admin
    .rpc("match_whatsapp_phone", { p_last10: last10Digits(waId) })
    .maybeSingle<{ client_id: string | null; contact_id: string | null }>();

  const { data: created, error } = await admin
    .from("whatsapp_conversations")
    .insert({
      wa_id: waId,
      phone_display: formatWaId(waId),
      profile_name: profileName ?? null,
      client_id: match?.client_id ?? null,
      contact_id: match?.contact_id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    // Carrera entre eventos simultaneos del mismo numero: reintentar lectura.
    const { data: retry } = await admin
      .from("whatsapp_conversations")
      .select("id")
      .eq("wa_id", waId)
      .maybeSingle();
    return retry ? { id: retry.id } : null;
  }

  return created;
}

type IngestResult = {
  conversationId: string;
  messageRowId: string;
  mediaId: string | null;
} | null;

async function insertMessage(
  admin: SupabaseClient,
  row: Record<string, unknown>,
): Promise<string | null> {
  // Dedupe por wamid: el mismo mensaje puede llegar por el webhook normal,
  // como eco y en el historial. ignoreDuplicates regresa vacio si ya existia.
  const { data } = await admin
    .from("whatsapp_messages")
    .upsert(row, { onConflict: "wamid", ignoreDuplicates: true })
    .select("id");

  return data?.[0]?.id ?? null;
}

export async function processInboundMessage(
  admin: SupabaseClient,
  msg: WhatsAppMessage,
  contact?: WhatsAppContact,
): Promise<IngestResult> {
  const conversation = await getOrCreateConversation(
    admin,
    msg.from,
    contact?.profile?.name ?? null,
  );
  if (!conversation) return null;

  const body = extractBody(msg);
  const waTimestamp = new Date(Number(msg.timestamp) * 1000).toISOString();

  const messageRowId = await insertMessage(admin, {
    conversation_id: conversation.id,
    wamid: msg.id,
    direction: "inbound",
    source: "api",
    type: msg.type,
    body,
    wa_timestamp: waTimestamp,
  });
  if (!messageRowId) return null; // duplicado

  const { data: conv } = await admin
    .from("whatsapp_conversations")
    .select("unread_count")
    .eq("id", conversation.id)
    .single();

  await admin
    .from("whatsapp_conversations")
    .update({
      last_message_at: waTimestamp,
      last_inbound_at: waTimestamp,
      last_message_preview: body,
      unread_count: (conv?.unread_count ?? 0) + 1,
    })
    .eq("id", conversation.id);

  return { conversationId: conversation.id, messageRowId, mediaId: mediaIdOf(msg) };
}

// Mensajes enviados desde la app del celular (coexistencia). Llegan como
// smb_message_echoes: direccion outbound, sin incrementar no leidos.
export async function processEcho(
  admin: SupabaseClient,
  msg: WhatsAppMessage,
): Promise<IngestResult> {
  const customerWaId = msg.to;
  if (!customerWaId) return null;

  const conversation = await getOrCreateConversation(admin, customerWaId);
  if (!conversation) return null;

  const body = extractBody(msg);
  const waTimestamp = new Date(Number(msg.timestamp) * 1000).toISOString();

  const messageRowId = await insertMessage(admin, {
    conversation_id: conversation.id,
    wamid: msg.id,
    direction: "outbound",
    source: "phone",
    type: msg.type,
    body,
    status: "sent",
    wa_timestamp: waTimestamp,
  });
  if (!messageRowId) return null;

  await admin
    .from("whatsapp_conversations")
    .update({
      last_message_at: waTimestamp,
      last_message_preview: body,
    })
    .eq("id", conversation.id);

  return { conversationId: conversation.id, messageRowId, mediaId: mediaIdOf(msg) };
}

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
};

export async function processStatus(
  admin: SupabaseClient,
  status: WhatsAppStatus,
): Promise<void> {
  const { data: existing } = await admin
    .from("whatsapp_messages")
    .select("id, status")
    .eq("wamid", status.id)
    .maybeSingle();
  if (!existing) return;

  if (status.status === "failed") {
    await admin
      .from("whatsapp_messages")
      .update({
        status: "failed",
        error_message:
          status.errors?.[0]?.message ?? status.errors?.[0]?.title ?? null,
      })
      .eq("id", existing.id);
    return;
  }

  // Nunca degradar (read > delivered > sent): los eventos pueden llegar
  // fuera de orden.
  const currentRank = STATUS_RANK[existing.status ?? ""] ?? -1;
  const newRank = STATUS_RANK[status.status] ?? -1;
  if (newRank <= currentRank) return;

  await admin
    .from("whatsapp_messages")
    .update({ status: status.status })
    .eq("id", existing.id);
}

// Historial sincronizado al conectar Coexistence (hasta 6 meses). Formato
// poco documentado por Meta: ingesta best-effort, perder mensajes viejos es
// aceptable y el dedupe por wamid protege contra dobles.
export async function processHistory(
  admin: SupabaseClient,
  value: WhatsAppChangeValue,
): Promise<void> {
  const businessLast10 = value.metadata?.display_phone_number
    ? last10Digits(value.metadata.display_phone_number)
    : null;

  for (const chunk of value.history ?? []) {
    for (const thread of chunk.threads ?? []) {
      try {
        const conversation = await getOrCreateConversation(admin, thread.id);
        if (!conversation) continue;

        let lastMessageAt: string | null = null;
        let lastInboundAt: string | null = null;
        let lastPreview: string | null = null;

        for (const msg of thread.messages ?? []) {
          if (!msg.id || !msg.timestamp) continue;

          const fromBusiness =
            businessLast10 !== null && last10Digits(msg.from) === businessLast10;
          const body = extractBody(msg);
          const waTimestamp = new Date(Number(msg.timestamp) * 1000).toISOString();

          const inserted = await insertMessage(admin, {
            conversation_id: conversation.id,
            wamid: msg.id,
            direction: fromBusiness ? "outbound" : "inbound",
            source: "history",
            type: msg.type ?? "text",
            body,
            wa_timestamp: waTimestamp,
          });

          if (inserted && (!lastMessageAt || waTimestamp > lastMessageAt)) {
            lastMessageAt = waTimestamp;
            lastPreview = body;
          }
          if (
            inserted &&
            !fromBusiness &&
            (!lastInboundAt || waTimestamp > lastInboundAt)
          ) {
            lastInboundAt = waTimestamp;
          }
        }

        if (lastMessageAt) {
          // Solo avanzar los marcadores si el historial trae algo mas nuevo
          // que lo ya registrado (el historial no debe pisar mensajes en vivo).
          const { data: conv } = await admin
            .from("whatsapp_conversations")
            .select("last_message_at, last_inbound_at")
            .eq("id", conversation.id)
            .single();

          const update: Record<string, unknown> = {};
          if (!conv?.last_message_at || lastMessageAt > conv.last_message_at) {
            update.last_message_at = lastMessageAt;
            update.last_message_preview = lastPreview;
          }
          if (
            lastInboundAt &&
            (!conv?.last_inbound_at || lastInboundAt > conv.last_inbound_at)
          ) {
            update.last_inbound_at = lastInboundAt;
          }
          if (Object.keys(update).length > 0) {
            await admin
              .from("whatsapp_conversations")
              .update(update)
              .eq("id", conversation.id);
          }
        }
      } catch (e) {
        console.error("whatsapp history thread:", e);
      }
    }
  }
}

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

export async function downloadAndStoreMedia(
  admin: SupabaseClient,
  conversationId: string,
  messageRowId: string,
  mediaId: string,
): Promise<void> {
  try {
    const media = await fetchMediaUrl(mediaId);
    if (!media) return;

    const buffer = await downloadMedia(media.url);
    if (!buffer) return;

    const baseMime = media.mimeType.split(";")[0].trim();
    const ext = MIME_EXT[baseMime] ?? "bin";
    const path = `${conversationId}/${messageRowId}.${ext}`;

    const { error } = await admin.storage
      .from("whatsapp-media")
      .upload(path, buffer, { contentType: baseMime, upsert: true });
    if (error) {
      console.error("whatsapp media upload:", error.message);
      return;
    }

    await admin
      .from("whatsapp_messages")
      .update({ media_path: path, media_mime_type: baseMime })
      .eq("id", messageRowId);
  } catch (e) {
    console.error("whatsapp media download:", e);
  }
}
